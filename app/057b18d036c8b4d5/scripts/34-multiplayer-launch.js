    function buildTes3mpLaunchConfig(result) {
      var connection = result && result.connection;
      if (!connection || !connection.host || !connection.port) return null;
      var instance = result.instance || {};
      var relayUrl = connection.webRelay && connection.webRelay.url ? String(connection.webRelay.url) : "";
      var relayTarget = parseRelayTarget(relayUrl);
      var browserHost = connection.browserHost || null;
      var playerName = sanitizeLobbyText(
        getAccountPlayerName() ||
          result.playerName ||
          (lobbyState && lobbyState.displayName) ||
          getLobbyPlayerName(),
        "Nerevarine",
        32
      );
      return {
        transport: browserHost ? "browser-host" : "web-relay",
        connectionType: connection.type ? String(connection.type) : "",
        host: browserHost || relayTarget ? "127.0.0.1" : String(connection.host),
        port: browserHost ? Number(browserHost.serverPort || connection.port) : relayTarget ? relayTarget.port : Number(connection.port),
        publicHost: String(connection.host),
        publicPort: Number(connection.port),
        password: connection.password || "",
        playerName: playerName,
        startCell: connection.startCell ? sanitizeLobbyText(connection.startCell, "", 80) : sanitizeLobbyText(instance.startCell, "", 80),
        allowCharacterCreation: !!instance.allowCharacterCreation,
        ruleset: sanitizeLobbyText(instance.ruleset, "vanilla", 32),
        hostSettings: instance.hostSettings || {},
	        relayUrl: relayUrl,
        relayClientId: connection.webRelay && connection.webRelay.clientId ? String(connection.webRelay.clientId) : "",
	        browserHost: browserHost,
        role: result.role || "",
        joinToken: result.joinToken || "",
        instanceId: result.instance && result.instance.id ? result.instance.id : result.id || "",
        expiresAt: result.expiresAt || "",
        relayIssuedAt: Date.now(),
        createdAt: new Date().toISOString()
      };
    }

    function storeTes3mpLaunchConfig(config) {
      if (!config || !config.host || !config.port) return false;
      window.__tes3mpLaunchConfig = config;
      window.__tes3mpRelayUrl = isBrowserHostLaunchConfig(config) ? "" : config.relayUrl || "";
      clearLegacyLobbyProfileStorage(tes3mpLaunchStorageKey);
      try {
        writeLobbyTabStorage(tes3mpLaunchStorageKey, JSON.stringify(config));
      } catch (error) {
      }
      return true;
    }

    function clearTes3mpLaunchConfig() {
      window.__tes3mpLaunchConfig = null;
      window.__tes3mpRelayUrl = "";
      removeLobbyTabStorage(tes3mpLaunchStorageKey);
      try {
        localStorage.removeItem(tes3mpLaunchStorageKey);
      } catch (error) {
      }
    }

    function readTes3mpLaunchConfig() {
      if (window.__tes3mpLaunchConfig) return window.__tes3mpLaunchConfig;
      clearLegacyLobbyProfileStorage(tes3mpLaunchStorageKey);
      try {
        var raw = readLobbyTabStorage(tes3mpLaunchStorageKey);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || !parsed.host || !parsed.port) return null;
        if (parsed.expiresAt && Date.parse(parsed.expiresAt) < Date.now()) return null;
        window.__tes3mpLaunchConfig = parsed;
        window.__tes3mpRelayUrl = isBrowserHostLaunchConfig(parsed) ? "" : parsed.relayUrl || "";
        return parsed;
      } catch (error) {
        return null;
      }
    }

    function hasBrowserTes3mpLaunchConfig(config) {
      return !!(config && config.host && config.port && (config.relayUrl || isBrowserHostLaunchConfig(config)));
    }

    function isExternalTes3mpLaunchConfig(config) {
      return !!(config &&
        config.transport === "web-relay" &&
        (config.connectionType === "tes3mp-external" ||
          (!config.connectionType && !config.instanceId && config.publicHost && config.publicPort)));
    }

    function installTes3mpRelayUrl(config) {
      if (!config || !config.relayUrl) return false;
      Module.websocket = Module.websocket || {};
      Module.websocket.url = config.relayUrl;
      Module.websocket.subprotocol = "binary";
      Module.__tes3mpRelayUrl = config.relayUrl;
      window.__tes3mpRelayUrl = config.relayUrl;
      return true;
    }

    var externalTes3mpRelayRefreshPromise = null;

    function ensureFreshExternalTes3mpRelayTicket(config) {
      if (!isExternalTes3mpLaunchConfig(config)) return null;
      var now = Date.now();
      var expiresAt = Date.parse(config.expiresAt || "");
      var issuedAt = Number(config.relayIssuedAt || 0);
      if (!isFinite(issuedAt) || issuedAt <= 0) issuedAt = Date.parse(config.createdAt || "");
      var nearExpiry = isFinite(expiresAt) && expiresAt - now <= 60000;
      var oldTicket = isFinite(issuedAt) && now - issuedAt >= 540000;
      if (!nearExpiry && !oldTicket) return null;
      if (externalTes3mpRelayRefreshPromise) return externalTes3mpRelayRefreshPromise;
      var targetHost = String(config.publicHost || config.host || "");
      var targetPort = Number(config.publicPort || config.port || 0);
      var launchCreatedAt = String(config.createdAt || "");
      var refreshPromise = ensureLobbySession()
        .then(function() {
          return lobbyFetch("/direct-connect", {
            method: "POST",
            body: {
              host: targetHost,
              port: targetPort
            }
          });
        })
        .then(function(result) {
          var connection = result && result.connection || {};
          var webRelay = connection.webRelay || {};
          var relayUrl = webRelay.url ? String(webRelay.url) : "";
          var relayTarget = parseRelayTarget(relayUrl);
          if (connection.type !== "tes3mp-external" ||
              String(connection.host || "") !== targetHost ||
              Number(connection.port || 0) !== targetPort ||
              !relayUrl ||
              !webRelay.clientId ||
              !relayTarget ||
              relayTarget.host !== targetHost ||
              Number(relayTarget.port) !== targetPort) {
            throw new Error("External relay refresh returned an invalid connection.");
          }
          var activeConfig = readTes3mpLaunchConfig();
          if (!isExternalTes3mpLaunchConfig(activeConfig) ||
              String(activeConfig.createdAt || "") !== launchCreatedAt ||
              String(activeConfig.publicHost || activeConfig.host || "") !== targetHost ||
              Number(activeConfig.publicPort || activeConfig.port || 0) !== targetPort) {
            throw new Error("External launch changed while relay authorization was refreshing.");
          }
          config.relayUrl = relayUrl;
          config.relayClientId = String(webRelay.clientId);
          config.expiresAt = result.expiresAt || config.expiresAt;
          config.relayIssuedAt = Date.now();
          storeTes3mpLaunchConfig(config);
          installTes3mpRelayUrl(config);
          console.info("External TES3MP relay authorization refreshed", {
            endpoint: targetHost + ":" + targetPort,
            expiresAt: config.expiresAt
          });
          return config;
        })
        .catch(function(error) {
          var activeConfig = readTes3mpLaunchConfig();
          var launchUnchanged = isExternalTes3mpLaunchConfig(activeConfig) &&
            String(activeConfig.createdAt || "") === launchCreatedAt &&
            String(activeConfig.publicHost || activeConfig.host || "") === targetHost &&
            Number(activeConfig.publicPort || activeConfig.port || 0) === targetPort;
          if (launchUnchanged && isFinite(expiresAt) && expiresAt - Date.now() > 30000) {
            console.warn("External TES3MP relay refresh deferred; current authorization is still valid", error);
            return config;
          }
          var refreshError = new Error("External server authorization expired before the multiplayer client finished loading. Try Direct Join again.");
          refreshError.cause = error;
          throw refreshError;
        });
      externalTes3mpRelayRefreshPromise = refreshPromise.then(function(result) {
        externalTes3mpRelayRefreshPromise = null;
        return result;
      }, function(error) {
        externalTes3mpRelayRefreshPromise = null;
        throw error;
      });
      return externalTes3mpRelayRefreshPromise;
    }

    window.__tes3mpEnsureFreshRelayTicket = function() {
      return ensureFreshExternalTes3mpRelayTicket(readTes3mpLaunchConfig());
    };

    function promptForMultiplayerLobby(message) {
      clearTes3mpLaunchConfig();
      setModeButtonsEnabled(true);
      modeScreenElement.hidden = false;
      modeStatusElement.textContent = message || "Create or join a lobby to start multiplayer.";
      Module.setStatus("");
      setLobbyPanelOpen(true);
      return Promise.resolve(false);
    }

    function launchTes3mpInBrowser(config) {
      if (!storeTes3mpLaunchConfig(config)) {
        showSaveToast("TES3MP launch unavailable");
        return;
      }
      showMorrowindLoadingScreen("Preparing multiplayer...", 300000, {
        category: "multiplayerStartup",
        signal: "launch",
        sticky: true
      });
      setLobbyPanelOpen(false);
      startEmbeddedMultiplayerMode();
    }

    function showLobbyJoinDetails(result, options) {
      options = options || {};
      var connection = result && result.connection;
      var instance = result && result.instance || {};
      var launchConfig = buildTes3mpLaunchConfig(result);
      lobbyJoinDetailsElement.textContent = "";
      if (!connection || !connection.host || !connection.port) {
        clearLobbyJoinDetails();
        return false;
      }

      var browserHosted = launchConfig && isBrowserHostLaunchConfig(launchConfig);
      var externalServer = connection.type === "tes3mp-external";
      var instanceId = externalServer ? "" : launchConfig && launchConfig.instanceId || instance.id || result.id || "";
      var summary = [
        (externalServer ? "External TES3MP " : browserHosted ? "Client-hosted TES3MP " : "TES3MP ") + connection.host + ":" + connection.port,
        instanceId ? "Room " + instanceId : "",
        externalServer
          ? connection.password ? "Server password supplied" : "No server password"
          : connection.password ? "Connection password " + connection.password : "No connection password",
        externalServer ? "" : instance.passwordRequired ? "Room password required" : "Open room"
      ].filter(Boolean).join("\n");

      var title = document.createElement("div");
      title.className = "lobby-join-title";
      title.textContent = externalServer ? "External TES3MP ready" : browserHosted ? "Client host ready" : "TES3MP ready";

      var address = document.createElement("div");
      address.className = "lobby-join-row";
      var addressLabel = document.createElement("span");
      addressLabel.textContent = "Server";
      var addressValue = document.createElement("code");
      addressValue.textContent = connection.host + ":" + connection.port;
      address.appendChild(addressLabel);
      address.appendChild(addressValue);

      var room = document.createElement("div");
      room.className = "lobby-join-row";
      var roomLabel = document.createElement("span");
      roomLabel.textContent = "Room";
      var roomValue = document.createElement("code");
      roomValue.textContent = instanceId || "n/a";
      room.appendChild(roomLabel);
      room.appendChild(roomValue);

      var password = document.createElement("div");
      password.className = "lobby-join-row";
      var passwordLabel = document.createElement("span");
      passwordLabel.textContent = externalServer ? "Server password" : connection.password ? "Connection password" : "Room";
      var passwordValue = document.createElement("code");
      passwordValue.textContent = externalServer
        ? connection.password ? "supplied" : "none"
        : connection.password || (instance.passwordRequired ? "password required" : "open");
      password.appendChild(passwordLabel);
      password.appendChild(passwordValue);

      var copy = document.createElement("button");
      copy.id = "lobby-copy-connection";
      copy.type = "button";
      copy.textContent = "Copy connection";
      copy.addEventListener("click", function() {
        copyLobbyConnectionText(summary).then(function() {
          showSaveToast("Connection copied");
        }, function() {
          showSaveToast(summary.replace(/\n/g, " / "));
        });
      });

      var launchButton = null;
      if (options.showLaunchAction && hasBrowserTes3mpLaunchConfig(launchConfig)) {
        launchButton = document.createElement("button");
        launchButton.id = "lobby-play-browser";
        launchButton.type = "button";
        launchButton.textContent = browserHosted && launchConfig.role === "host" ? "Start hosting" : "Launch multiplayer";
        launchButton.addEventListener("click", function() {
          launchTes3mpInBrowser(launchConfig);
        });
      }

      var shutdownHost = null;
      if (browserHosted && launchConfig && launchConfig.role === "host" && instanceId) {
        shutdownHost = document.createElement("button");
        shutdownHost.id = "lobby-shutdown-host";
        shutdownHost.type = "button";
        shutdownHost.textContent = "Shut down lobby";
        shutdownHost.disabled = lobbyBusy;
        shutdownHost.addEventListener("click", function() {
          shutdownLobbyInstance(instanceId, { confirm: false });
        });
      }

      lobbyJoinDetailsElement.appendChild(title);
      lobbyJoinDetailsElement.appendChild(address);
      if (!externalServer) lobbyJoinDetailsElement.appendChild(room);
      lobbyJoinDetailsElement.appendChild(password);
      lobbyJoinDetailsElement.appendChild(copy);
      if (launchButton) lobbyJoinDetailsElement.appendChild(launchButton);
      if (shutdownHost) lobbyJoinDetailsElement.appendChild(shutdownHost);
      lobbyJoinDetailsElement.hidden = false;
      return true;
    }

    function maybeLaunchLobbyResult(result) {
      var launchConfig = buildTes3mpLaunchConfig(result);
      if (!hasBrowserTes3mpLaunchConfig(launchConfig)) return false;
      if (runtimeStarted || runtimeStartPromise) return false;
      modeStatusElement.textContent = "Starting multiplayer...";
      showSaveToast("Starting multiplayer");
      setTimeout(function() {
        launchTes3mpInBrowser(launchConfig);
      }, 120);
      return true;
    }
