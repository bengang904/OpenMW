    function readLobbyTabStorage(key) {
      try {
        if (window.sessionStorage) return window.sessionStorage.getItem(key);
      } catch (error) {
      }
      return Object.prototype.hasOwnProperty.call(lobbyTabStorageFallback, key)
        ? lobbyTabStorageFallback[key]
        : null;
    }

    function writeLobbyTabStorage(key, value) {
      try {
        if (window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
          return;
        }
      } catch (error) {
      }
      lobbyTabStorageFallback[key] = String(value);
    }

    function removeLobbyTabStorage(key) {
      try {
        if (window.sessionStorage) {
          window.sessionStorage.removeItem(key);
          delete lobbyTabStorageFallback[key];
          return;
        }
      } catch (error) {
      }
      delete lobbyTabStorageFallback[key];
    }

    function clearLegacyLobbyProfileStorage(key) {
      try {
        if (window.localStorage) localStorage.removeItem(key);
      } catch (error) {
      }
    }

    function readLobbySessionState() {
      clearLegacyLobbyProfileStorage(lobbySessionStorageKey);
      try {
        var raw = readLobbyTabStorage(lobbySessionStorageKey);
        if (!raw) return {};
        var parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch (error) {
        return {};
      }
    }

    function storeLobbySessionState() {
      clearLegacyLobbyProfileStorage(lobbySessionStorageKey);
      try {
        writeLobbyTabStorage(lobbySessionStorageKey, JSON.stringify(lobbyState || {}));
      } catch (error) {
      }
    }

    function readLobbyOwnedInstances() {
      clearLegacyLobbyProfileStorage(lobbyOwnedInstancesStorageKey);
      try {
        var raw = readLobbyTabStorage(lobbyOwnedInstancesStorageKey);
        if (!raw) return {};
        var parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch (error) {
        return {};
      }
    }

    function storeLobbyOwnedInstances() {
      clearLegacyLobbyProfileStorage(lobbyOwnedInstancesStorageKey);
      try {
        writeLobbyTabStorage(lobbyOwnedInstancesStorageKey, JSON.stringify(lobbyOwnedInstances || {}));
      } catch (error) {
      }
    }

    function forgetLobbyOwnedInstance(id) {
      if (!id || !lobbyOwnedInstances || !lobbyOwnedInstances[id]) return false;
      delete lobbyOwnedInstances[id];
      storeLobbyOwnedInstances();
      return true;
    }

    function getStoredLobbyDisplayName() {
      try {
        return localStorage.getItem(lobbyDisplayNameStorageKey) || "";
      } catch (error) {
        return "";
      }
    }

    function storeLobbyDisplayName(name) {
      try {
        localStorage.setItem(lobbyDisplayNameStorageKey, name);
      } catch (error) {
      }
    }

    function sanitizeLobbyText(value, fallback, maxLength) {
      value = String(value || "").replace(/\s+/g, " ").trim();
      if (!value) value = fallback || "";
      return value.slice(0, maxLength || 80);
    }

    function lobbySelectValue(element, fallback) {
      return element && element.value ? element.value : fallback;
    }

    function labelFromOptions(element, value, fallback) {
      if (!element) return fallback || value || "";
      for (var i = 0; i < element.options.length; i++) {
        if (element.options[i].value === value) return element.options[i].textContent;
      }
      return fallback || value || "";
    }

    function formatLobbyRuleset(value) {
      var labels = {
        vanilla: "Vanilla co-op",
        roleplay: "Roleplay",
        exploration: "Exploration",
        pvp: "PvP skirmish"
      };
      return labels[value] || value || "Vanilla co-op";
    }

    function formatLobbyStartCell(value) {
      var labels = {
        "-3, -2": "Balmora",
        "-2, -9": "Seyda Neen",
        "3, -10": "Vivec",
        "-2, 6": "Ald'ruhn"
      };
      return labels[value] || value || "Balmora";
    }

    function formatLobbySetting(value) {
      value = String(value || "").replace(/-/g, " ");
      return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
    }

    function setLobbyStatus(status, message) {
      lobbyStatusElement.textContent = message || status;
      lobbyToggleStateElement.textContent = status === "online" ? "On" : status === "busy" ? "..." : "Off";
      lobbyToggleButton.classList.toggle("online", status === "online");
      lobbyToggleButton.classList.toggle("offline", status !== "online");
    }

    function setLobbyCreateError(message) {
      if (!lobbyCreateErrorElement) return;
      lobbyCreateErrorElement.textContent = message || "";
      lobbyCreateErrorElement.hidden = !message;
    }

    function setLobbyDirectError(message) {
      if (!lobbyDirectErrorElement) return;
      lobbyDirectErrorElement.textContent = message || "";
      lobbyDirectErrorElement.hidden = !message;
    }

    function setLobbyActiveTab(tab) {
      tab = tab || "public";
      lobbyTabButtons.forEach(function(button) {
        var selected = button.getAttribute("data-lobby-tab") === tab;
        button.setAttribute("aria-selected", selected ? "true" : "false");
        button.tabIndex = selected ? 0 : -1;
      });
      lobbyTabPanels.forEach(function(panel) {
        panel.hidden = panel.getAttribute("data-lobby-panel") !== tab;
      });
      if (tab === "public") loadLobbyInstances();
    }

    function parseLobbyDirectJoinTarget(value) {
      value = String(value || "").trim();
      if (!value) return "";
      var directMatch = /\b(inst_[A-Za-z0-9_-]+)\b/.exec(value);
      if (directMatch) return directMatch[1];
      try {
        var url = new URL(value, window.location.href);
        var params = ["instance", "server", "join", "id"];
        for (var i = 0; i < params.length; i++) {
          var candidate = url.searchParams.get(params[i]);
          if (candidate && /^inst_[A-Za-z0-9_-]+$/.test(candidate)) return candidate;
        }
        directMatch = /\b(inst_[A-Za-z0-9_-]+)\b/.exec(url.pathname);
        if (directMatch) return directMatch[1];
      } catch (error) {
      }
      return "";
    }

    function parseExternalTes3mpTarget(value) {
      var match = /^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/.exec(String(value || "").trim());
      if (!match) return null;
      var octets = match[1].split(".").map(Number);
      if (octets.some(function(octet) { return octet < 0 || octet > 255; })) return null;
      var port = Number(match[2]);
      if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
      return { host: octets.join("."), port: port };
    }

    function hydrateDirectJoinFromLocation() {
      if (!lobbyDirectTargetElement || lobbyDirectTargetElement.value) return false;
      var instanceId = parseLobbyDirectJoinTarget(window.location.href);
      if (!instanceId) return false;
      lobbyDirectTargetElement.value = instanceId;
      setLobbyActiveTab("direct");
      return true;
    }

    function updateLobbyCreateControls() {
      updateLobbyIdentityControls();
      var clientHostingAvailable = !lobbyConfig.tes3mp || lobbyConfig.tes3mp.browserHosted !== false;
      if (lobbyCreateButton) {
        lobbyCreateButton.disabled = lobbyBusy || !clientHostingAvailable;
        lobbyCreateButton.textContent = lobbyBusy
          ? "Preparing host..."
          : clientHostingAvailable
            ? "Host and play"
            : "Hosting unavailable";
      }
      if (lobbyDirectJoinButton) lobbyDirectJoinButton.disabled = lobbyBusy;
      var lobbyShutdownHostButton = document.getElementById("lobby-shutdown-host");
      if (lobbyShutdownHostButton) lobbyShutdownHostButton.disabled = lobbyBusy;
    }

    function getLobbyErrorCode(error) {
      return error &&
        error.body &&
        error.body.error &&
        error.body.error.code
          ? error.body.error.code
          : "";
    }

    function formatLobbyError(error, fallback) {
      var code = getLobbyErrorCode(error);
      if (code === "invite_required") return "This host type is not available.";
      if (code === "browser_host_required") return "Only client-hosted rooms can be created here.";
      if (code === "auth_required") return "Lobby session expired. Try again.";
      if (code === "rate_limited") return "Lobby is rate limited. Try again shortly.";
      if (code === "store_unavailable") return "Lobby store unavailable.";
      if (code === "instance_full") return "Instance is full.";
      if (code === "instance_unavailable") return "Instance unavailable.";
      if (code === "password_required") return "Server password required.";
      if (code === "password_invalid") return "Server password incorrect.";
      if (code === "external_relay_unavailable") return "External TES3MP connections are unavailable.";
      if (code === "external_host_invalid") return "Enter a public IPv4 server address.";
      if (code === "external_port_invalid") return error && error.message ? error.message : "That TES3MP server port is not allowed.";
      if (code === "recipient_unavailable") return "Client host peer is unavailable.";
      if (code === "owner_required") return "Only the host can shut down this lobby.";
      if (code === "client_host_shutdown_only") return "Only client-hosted rooms can be shut down here.";
      return error && error.message ? error.message : fallback;
    }

    function isFatalBrowserHostSignalError(error) {
      var status = error && error.status ? Number(error.status) : 0;
      var code = getLobbyErrorCode(error);
      return status === 401 ||
        status === 403 ||
        status === 404 ||
        status === 409 ||
        code === "auth_required" ||
        code === "instance_unavailable" ||
        code === "recipient_unavailable";
    }

    function formatBrowserHostStartupError(error, fallback) {
      var code = getLobbyErrorCode(error);
      if (code === "instance_unavailable") return "Client-hosted lobby is no longer available.";
      if (code === "recipient_unavailable") return "Client host is no longer available.";
      if (code === "auth_required") return "Lobby session expired. Rejoin the lobby.";
      return formatLobbyError(error, fallback || "Client host connection failed.");
    }

    function loadLobbyConfig() {
      if (lobbyConfigPromise) return lobbyConfigPromise;
      lobbyConfigPromise = lobbyFetch("/config")
        .then(function(config) {
          lobbyConfig = {
            createMode: config.createMode || "unknown",
            createRequiresInvite: !!config.createRequiresInvite,
            inviteConfigured: !!config.inviteConfigured,
            tes3mp: config.tes3mp || {}
          };
          updateLobbyCreateControls();
          return lobbyConfig;
        })
        .catch(function(error) {
          lobbyConfigPromise = null;
          lobbyConfig = {
            createMode: "unknown",
            createRequiresInvite: false,
            inviteConfigured: false,
            tes3mp: {}
          };
          updateLobbyCreateControls();
          console.warn("Lobby config unavailable", error);
          return lobbyConfig;
        });
      return lobbyConfigPromise;
    }

    function clearLobbyJoinDetails() {
      lobbyJoinDetailsElement.textContent = "";
      lobbyJoinDetailsElement.hidden = true;
    }

    function copyLobbyConnectionText(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        return navigator.clipboard.writeText(text);
      }
      return Promise.reject(new Error("Clipboard unavailable"));
    }

    function parseRelayTarget(relayUrl) {
      if (!relayUrl) return null;
      try {
        var url = new URL(relayUrl, window.location.href);
        var targetHost = url.searchParams.get("targetHost") || "";
        var targetPort = Number(url.searchParams.get("targetPort") || 0);
        if (!targetHost || !targetPort) return null;
        return { host: targetHost, port: targetPort };
      } catch (error) {
        return null;
      }
    }
