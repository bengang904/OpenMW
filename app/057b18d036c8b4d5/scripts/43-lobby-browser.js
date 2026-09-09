    function ensureLobbySession() {
      var displayName = getLobbyPlayerName();
      lobbyDisplayNameElement.value = displayName;
      storeLobbyDisplayName(displayName);

      if (lobbyState && lobbyState.sessionToken) {
        if (sanitizeLobbyText(lobbyState.displayName, "", 32) !== displayName) {
          lobbyState = {};
          storeLobbySessionState();
          return ensureLobbySession();
        }
        return lobbyFetch("/session/me").then(function(session) {
          if (sanitizeLobbyText(session.displayName, "", 32) !== displayName) {
            lobbyState = {};
            storeLobbySessionState();
            return ensureLobbySession();
          }
          lobbyState.userId = session.userId || lobbyState.userId;
          lobbyState.displayName = session.displayName || displayName;
          storeLobbySessionState();
          return lobbyState;
        }, function() {
          lobbyState = {};
          storeLobbySessionState();
          return ensureLobbySession();
        });
      }

      return lobbyFetch("/session", {
        method: "POST",
        body: { displayName: displayName }
      }).then(function(session) {
        lobbyState = {
          userId: session.userId,
          sessionToken: session.sessionToken,
          displayName: session.displayName || displayName,
          expiresAt: session.expiresAt
        };
        storeLobbySessionState();
        return lobbyState;
      });
    }

    function formatLobbyTime(value) {
      if (!value) return "";
      var time = Date.parse(value);
      if (!isFinite(time)) return "";
      var seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
      if (seconds < 60) return seconds + "s ago";
      var minutes = Math.round(seconds / 60);
      if (minutes < 60) return minutes + "m ago";
      return Math.round(minutes / 60) + "h ago";
    }

    function getLobbyInstanceSearchText(instance) {
      var settings = instance && instance.hostSettings ? instance.hostSettings : {};
      return [
        instance && instance.name,
        instance && instance.description,
        instance && instance.status,
        instance && instance.serverDedicated ? "dedicated" : "client host",
        instance && instance.passwordRequired ? "password locked" : "open",
        formatLobbyRuleset(instance && instance.ruleset || "vanilla"),
        formatLobbyStartCell(instance && (instance.startCell || settings.startCell)),
        formatLobbySetting(settings.pace),
        formatLobbySetting(settings.timeOfDay),
        formatLobbySetting(settings.weather),
        formatLobbySetting(settings.combat)
      ].join(" ").toLowerCase();
    }

    function getLobbyFilterState() {
      return {
        query: ((lobbyFilterTextElement && lobbyFilterTextElement.value) || "").trim().toLowerCase(),
        kind: (lobbyFilterKindElement && lobbyFilterKindElement.value) || "all"
      };
    }

    function lobbyInstanceMatchesFilter(instance, filter) {
      if (!instance) return false;
      filter = filter || getLobbyFilterState();
      var ownedClientHost = canShutdownLobbyInstance(instance);
      if (filter.kind === "open" && (instance.status !== "open" || instance.passwordRequired)) return false;
      if (filter.kind === "dedicated" && !instance.serverDedicated) return false;
      if (filter.kind === "client" && instance.serverDedicated) return false;
      if (filter.kind === "locked" && !instance.passwordRequired) return false;
      if (filter.kind === "owned" && !ownedClientHost) return false;
      if (filter.query && getLobbyInstanceSearchText(instance).indexOf(filter.query) === -1) return false;
      return true;
    }

    function getFilteredLobbyInstances() {
      var filter = getLobbyFilterState();
      return lobbyInstances.filter(function(instance) {
        return lobbyInstanceMatchesFilter(instance, filter);
      });
    }

    function formatLobbyBrowserCount(visibleCount, totalCount) {
      var suffix = visibleCount === 1 ? " server" : " servers";
      if (visibleCount === totalCount) return visibleCount + suffix;
      return visibleCount + " of " + totalCount + suffix;
    }

    function renderLobbyInstances() {
      updateLobbyCreateControls();
      lobbyInstanceListElement.textContent = "";
      var visibleInstances = getFilteredLobbyInstances();
      if (lobbyBrowserCountElement) {
        lobbyBrowserCountElement.textContent = formatLobbyBrowserCount(visibleInstances.length, lobbyInstances.length);
      }
      if (!lobbyInstances.length) {
        var empty = document.createElement("div");
        empty.className = "lobby-instance-meta";
        empty.textContent = "No servers listed";
        lobbyInstanceListElement.appendChild(empty);
        return;
      }
      if (!visibleInstances.length) {
        var none = document.createElement("div");
        none.className = "lobby-instance-meta";
        none.textContent = "No servers match";
        lobbyInstanceListElement.appendChild(none);
        return;
      }

      visibleInstances.forEach(function(instance) {
        var settings = instance.hostSettings || {};
        var ownedClientHost = canShutdownLobbyInstance(instance);
        var activeOwnedHost = ownedClientHost && isActiveBrowserHostForInstance(instance.id);
        var row = document.createElement("div");
        row.className = "lobby-instance";

        var head = document.createElement("div");
        head.className = "lobby-instance-head";

        var name = document.createElement("div");
        name.className = "lobby-instance-name";
        name.textContent = instance.name || "Unnamed";

        var status = document.createElement("div");
        status.className = "lobby-instance-status";
        status.textContent = instance.serverDedicated
          ? "dedicated"
          : ownedClientHost
            ? "owned"
            : instance.passwordRequired
              ? "locked"
              : instance.status || "open";

        var joinControls = document.createElement("div");
        joinControls.className = "lobby-join-controls" + (instance.passwordRequired ? " password-required" : "");

        var password = document.createElement("input");
        password.type = "password";
        password.maxLength = 80;
        password.autocomplete = "off";
        password.placeholder = instance.passwordRequired ? "Password" : "Open";
        password.disabled = ownedClientHost || !instance.passwordRequired || lobbyBusy || instance.status !== "open";
        if (ownedClientHost || !instance.passwordRequired) password.hidden = true;

        var button = document.createElement("button");
        button.type = "button";
        if (ownedClientHost) button.className = "lobby-shutdown-button";
        button.textContent = ownedClientHost
          ? activeOwnedHost
            ? "Stop hosting"
            : "Shut down"
          : instance.status === "open"
            ? "Join"
            : "Unavailable";
        button.disabled = lobbyBusy || (!ownedClientHost && instance.status !== "open");
        button.addEventListener("click", function() {
          if (ownedClientHost) shutdownLobbyInstance(instance.id, { confirm: activeOwnedHost });
          else joinLobbyInstance(instance.id, password.value || "");
        });
        password.addEventListener("keydown", function(event) {
          if (event.key === "Enter" && !button.disabled && !ownedClientHost) joinLobbyInstance(instance.id, password.value || "");
        });

        joinControls.appendChild(password);
        joinControls.appendChild(button);

        var description = document.createElement("div");
        description.className = "lobby-instance-description";
        description.textContent = instance.description || "Morrowind App";

        var grid = document.createElement("div");
        grid.className = "lobby-instance-grid";
        [
          ["Players", (instance.players || 0) + "/" + (instance.maxPlayers || 0)],
          ["Type", instance.serverDedicated ? "Dedicated" : "Client host"],
          ["Rules", formatLobbyRuleset(instance.ruleset || "vanilla")],
          ["Start", instance.allowCharacterCreation ? "Character creation" : formatLobbyStartCell(instance.startCell || settings.startCell)],
          ["Pace", formatLobbySetting(settings.pace || "standard")],
          ["Time", formatLobbySetting(settings.timeOfDay || "day")],
          ["Weather", formatLobbySetting(settings.weather || "clear")],
          ["Seen", instance.lastHeartbeatAt ? formatLobbyTime(instance.lastHeartbeatAt) : "waiting"]
        ].forEach(function(item) {
          var stat = document.createElement("div");
          stat.className = "lobby-stat";
          var label = document.createElement("span");
          label.textContent = item[0];
          var value = document.createElement("strong");
          value.textContent = item[1] || "";
          stat.appendChild(label);
          stat.appendChild(value);
          grid.appendChild(stat);
        });

        head.appendChild(name);
        head.appendChild(status);
        row.appendChild(head);
        row.appendChild(joinControls);
        row.appendChild(description);
        row.appendChild(grid);
        lobbyInstanceListElement.appendChild(row);
      });
    }

    function loadLobbyInstances() {
      return loadLobbyConfig()
        .then(ensureLobbySession)
        .then(function() {
          return lobbyFetch("/instances?status=open&limit=50");
        })
        .then(function(result) {
          lobbyInstances = result.items || [];
          renderLobbyInstances();
          setLobbyStatus("online", "Online");
          return lobbyInstances;
        })
        .catch(function(error) {
          lobbyInstances = [];
          renderLobbyInstances();
          setLobbyStatus("offline", error && error.status === 403 ? "Locked" : "Offline");
          return [];
        });
    }

    function findLobbyInstance(id) {
      for (var i = 0; i < lobbyInstances.length; i++) {
        if (lobbyInstances[i] && lobbyInstances[i].id === id) return lobbyInstances[i];
      }
      return null;
    }

    function hasStoredLobbyOwnership(id) {
      return !!(id &&
        lobbyOwnedInstances &&
        lobbyOwnedInstances[id] &&
        lobbyOwnedInstances[id].heartbeatToken);
    }

    function lobbyUserOwnsInstance(instance) {
      if (!instance || instance.serverDedicated) return false;
      if (lobbyState && lobbyState.userId && instance.ownerUserId === lobbyState.userId) return true;
      return hasStoredLobbyOwnership(instance.id);
    }

    function canShutdownLobbyInstance(instance) {
      return !!(instance &&
        instance.runtimeKind === "tes3mp-browser-host" &&
        !instance.serverDedicated &&
        instance.status !== "dead" &&
        lobbyUserOwnsInstance(instance));
    }

    function isActiveBrowserHostForInstance(id) {
      return !!(browserHostRuntime &&
        browserHostRuntime.mode === "host" &&
        browserHostRuntime.serverReady &&
        browserHostRuntime.serverWorker &&
        browserHostRuntime.config &&
        browserHostRuntime.config.instanceId === id);
    }

    function stopBrowserHostRuntimeForInstance(id, reason) {
      var runtime = browserHostRuntime;
      if (!runtime ||
          runtime.mode !== "host" ||
          !runtime.config ||
          runtime.config.instanceId !== id) {
        return false;
      }
      Object.keys(runtime.peers || {}).forEach(function(userId) {
        disposeBrowserHostPeer(runtime, runtime.peers[userId], reason || "host-shutdown");
      });
      clearInterval(runtime.relaySharedPumpTimer);
      clearInterval(runtime.clientInboxPumpTimer);
      runtime.relaySharedPumpTimer = 0;
      runtime.clientInboxPumpTimer = 0;
      stopBrowserHostSignalPolling();
      try {
        if (runtime.serverWorker) runtime.serverWorker.terminate();
      } catch (error) {
      }
      runtime.serverWorker = null;
      runtime.serverReady = false;
      runtime.serverFailed = true;
      if (Module.__tes3mpDatagramTransport) Module.__tes3mpDatagramTransport = null;
      if (window.__tes3mpDatagramTransport) window.__tes3mpDatagramTransport = null;
      if (browserHostRuntime === runtime) browserHostRuntime = null;
      try {
        var launchConfig = readTes3mpLaunchConfig();
        if (launchConfig && launchConfig.instanceId === id) clearTes3mpLaunchConfig();
      } catch (error) {
      }
      return true;
    }

    function prepareLobbySessionForJoin(id) {
      var instance = findLobbyInstance(id);
      if (!instance || instance.runtimeKind !== "tes3mp-browser-host") return;
      if (!lobbyState || !lobbyState.userId || instance.ownerUserId !== lobbyState.userId) return;
      if (isActiveBrowserHostForInstance(id)) return;
      lobbyState = {};
      storeLobbySessionState();
      forgetLobbyOwnedInstance(id);
      stopLobbyEventStream();
      console.info("Created a fresh lobby session before joining owned browser-host lobby", { instance: id });
    }

    function requestLobbyShutdown(id, reason) {
      var owned = lobbyOwnedInstances && lobbyOwnedInstances[id] || {};
      return lobbyFetch("/instances/" + encodeURIComponent(id) + "/shutdown", {
        method: "POST",
        body: {
          heartbeatToken: owned.heartbeatToken || "",
          reason: reason || "owner-shutdown"
        }
      });
    }

    function shutdownLobbyInstance(id, options) {
      if (!id || lobbyBusy) return;
      options = options || {};
      var activeHost = isActiveBrowserHostForInstance(id);
      if (options.confirm && activeHost && typeof window.confirm === "function") {
        if (!window.confirm("Shut down this hosted lobby? Connected players will be disconnected.")) return;
      }
      lobbyBusy = true;
      setLobbyStatus("busy", activeHost ? "Stopping..." : "Shutting down...");
      clearLobbyJoinDetails();
      renderLobbyInstances();
      requestLobbyShutdown(id, activeHost ? "owner-stop-hosting" : "owner-shutdown")
        .then(function() {
          stopBrowserHostRuntimeForInstance(id, "owner-shutdown");
          forgetLobbyOwnedInstance(id);
          showSaveToast(activeHost ? "Hosted lobby stopped" : "Lobby shut down");
          return loadLobbyInstances();
        })
        .catch(function(error) {
          var message = formatLobbyError(error, "Lobby shutdown failed");
          setLobbyStatus("online", message);
          showSaveToast(message);
        })
        .then(function() {
          lobbyBusy = false;
          updateLobbyCreateControls();
          renderLobbyInstances();
        });
    }

    function notifyOwnedBrowserHostShutdownOnUnload(reason) {
      Object.keys(lobbyOwnedInstances || {}).forEach(function(id) {
        if (!isActiveBrowserHostForInstance(id)) return;
        var owned = lobbyOwnedInstances[id] || {};
        if (!owned.heartbeatToken) return;
        try {
          fetch(lobbyApiBase + "/instances/" + encodeURIComponent(id) + "/shutdown", {
            method: "POST",
            headers: Object.assign({
              Accept: "application/json",
              "Content-Type": "application/json"
            }, lobbyAuthHeaders()),
            body: JSON.stringify({
              heartbeatToken: owned.heartbeatToken,
              reason: reason || "page-unload"
            }),
            cache: "no-store",
            credentials: "same-origin",
            keepalive: true
          });
        } catch (error) {
        }
      });
    }

    function createLobbyInstance() {
      if (lobbyBusy) return;
      var clientHostingAvailable = !lobbyConfig.tes3mp || lobbyConfig.tes3mp.browserHosted !== false;
      if (!clientHostingAvailable) {
        setLobbyCreateError("Client hosting is unavailable.");
        setLobbyStatus("online", "Hosting unavailable");
        showSaveToast("Hosting unavailable");
        return;
      }
      setLobbyCreateError("");
      lobbyBusy = true;
      setLobbyStatus("busy", "Creating...");
      updateLobbyCreateControls();
      clearLobbyJoinDetails();
      renderLobbyInstances();
      loadLobbyConfig()
        .then(function() {
          var currentClientHostingAvailable = !lobbyConfig.tes3mp || lobbyConfig.tes3mp.browserHosted !== false;
          if (!currentClientHostingAvailable) {
            var error = new Error("Client hosting is unavailable.");
            error.validation = true;
            throw error;
          }
          return ensureLobbySession();
        })
        .then(function() {
          return lobbyFetch("/instances", {
            method: "POST",
            body: {
              name: sanitizeLobbyText(lobbyInstanceNameElement.value, "Balmora Co-op", 48),
              description: sanitizeLobbyText(lobbyInstanceDescriptionElement.value, "", 160),
              openmwVersion: "morrowind-app",
              contentHash: runtimeAssetVersions["openmw.data"] || "unknown",
              ruleset: lobbySelectValue(lobbyRulesetElement, "vanilla"),
              password: sanitizeLobbyText(lobbyInstancePasswordElement.value, "", 80),
              startCell: lobbySelectValue(lobbyStartCellElement, "-3, -2"),
              gameSettings: {
                startCell: lobbySelectValue(lobbyStartCellElement, "-3, -2"),
                pace: lobbySelectValue(lobbyPaceElement, "standard"),
                timeOfDay: lobbySelectValue(lobbyTimeOfDayElement, "day"),
                weather: lobbySelectValue(lobbyWeatherElement, "clear"),
                combat: lobbySelectValue(lobbyCombatElement, "co-op")
              },
              maxPlayers: Math.max(2, Math.min(16, Number(lobbyInstanceMaxElement.value) || 4)),
              visibility: "public",
              runtimeKind: "tes3mp-browser-host"
            }
          });
        })
        .then(function(result) {
          if (result && result.id && result.heartbeatToken) {
            lobbyOwnedInstances[result.id] = {
              heartbeatToken: result.heartbeatToken,
              maxPlayers: Math.max(2, Math.min(16, Number(lobbyInstanceMaxElement.value) || 4)),
              runtimeKind: result.connection && result.connection.type ? result.connection.type : "",
              createdAtMs: Date.now(),
              expiresAt: result.expiresAt
            };
            storeLobbyOwnedInstances();
          }
          startLobbyHeartbeats();
          if (showLobbyJoinDetails(result)) {
            if (!maybeLaunchLobbyResult(result)) {
              if (hasBrowserTes3mpLaunchConfig(buildTes3mpLaunchConfig(result))) {
                showLobbyJoinDetails(result, { showLaunchAction: true });
                showSaveToast("Multiplayer launch ready");
              } else {
                showSaveToast("TES3MP server ready");
              }
            }
          } else {
            showSaveToast("Lobby created");
          }
          lobbyInstancePasswordElement.value = "";
          setLobbyCreateError("");
          return loadLobbyInstances();
        })
        .catch(function(error) {
          var message = error && error.validation
            ? error.message
            : formatLobbyError(error, "Lobby create failed");
          setLobbyCreateError(message);
          setLobbyStatus("online", message);
          showSaveToast(message);
        })
        .then(function() {
          lobbyBusy = false;
          updateLobbyCreateControls();
          renderLobbyInstances();
        });
    }

    function joinLobbyInstance(id, password) {
      if (!id || lobbyBusy) return;
      lobbyBusy = true;
      setLobbyStatus("busy", "Reserving...");
      setLobbyDirectError("");
      clearLobbyJoinDetails();
      renderLobbyInstances();
      prepareLobbySessionForJoin(id);
      ensureLobbySession()
        .then(function() {
          return lobbyFetch("/instances/" + encodeURIComponent(id) + "/join", {
            method: "POST",
            body: { password: sanitizeLobbyText(password, "", 80) }
          });
        })
        .then(function(result) {
          var endpoint = result.joinEndpoint || "pending";
          if (showLobbyJoinDetails(result)) {
            if (!maybeLaunchLobbyResult(result)) {
              if (hasBrowserTes3mpLaunchConfig(buildTes3mpLaunchConfig(result))) {
                showLobbyJoinDetails(result, { showLaunchAction: true });
                showSaveToast("Multiplayer launch ready");
              } else {
                showSaveToast("TES3MP connection ready");
              }
            }
          } else {
            showSaveToast("Join reserved; TES3MP client pending");
          }
          console.info("Lobby join reserved", {
            instance: id,
            endpoint: endpoint,
            expiresAt: result.expiresAt
          });
          return loadLobbyInstances();
        })
        .catch(function(error) {
          var message = formatLobbyError(error, "Lobby join failed");
          setLobbyStatus("online", message);
          setLobbyDirectError(message);
          showSaveToast(message);
        })
        .then(function() {
          lobbyBusy = false;
          updateLobbyCreateControls();
          renderLobbyInstances();
        });
    }

    function directJoinLobbyInstance() {
      if (lobbyBusy) return;
      var value = lobbyDirectTargetElement.value;
      var instanceId = parseLobbyDirectJoinTarget(value);
      if (instanceId) {
        setLobbyDirectError("");
        joinLobbyInstance(instanceId, lobbyDirectPasswordElement.value || "");
        return;
      }
      var externalTarget = parseExternalTes3mpTarget(value);
      if (!externalTarget) {
        setLobbyActiveTab("direct");
        setLobbyDirectError("Enter a server ID or public IPv4 address with port, such as 169.155.120.92:26965.");
        lobbyDirectTargetElement.focus();
        return;
      }
      joinExternalTes3mpServer(externalTarget, lobbyDirectPasswordElement.value || "");
    }

    function joinExternalTes3mpServer(target, password) {
      if (!target || lobbyBusy) return;
      lobbyBusy = true;
      setLobbyStatus("busy", "Preparing external server...");
      setLobbyDirectError("");
      clearLobbyJoinDetails();
      updateLobbyCreateControls();
      renderLobbyInstances();
      ensureLobbySession()
        .then(function() {
          return lobbyFetch("/direct-connect", {
            method: "POST",
            body: {
              host: target.host,
              port: target.port
            }
          });
        })
        .then(function(result) {
          var directPassword = String(password == null ? "" : password).slice(0, 80);
          if (result.connection) {
            result.connection.password = directPassword;
            result.connection.passwordRequired = !!directPassword;
          }
          if (result.instance) result.instance.passwordRequired = !!directPassword;
          if (showLobbyJoinDetails(result)) {
            if (!maybeLaunchLobbyResult(result)) {
              showLobbyJoinDetails(result, { showLaunchAction: true });
              showSaveToast("External TES3MP launch ready");
            }
          }
          setLobbyStatus("online", "External server ready");
          console.info("External TES3MP connection ready", {
            endpoint: target.host + ":" + target.port,
            expiresAt: result.expiresAt
          });
        })
        .catch(function(error) {
          var message = formatLobbyError(error, "External TES3MP connection failed");
          setLobbyStatus("online", message);
          setLobbyDirectError(message);
          showSaveToast(message);
        })
        .then(function() {
          lobbyBusy = false;
          updateLobbyCreateControls();
          renderLobbyInstances();
        });
    }
