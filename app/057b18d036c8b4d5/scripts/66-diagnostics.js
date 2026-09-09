    function handleUnhandledBrowserRuntimeFailure(kind, message, source, lineno, colno, error) {
      var detail = {
        kind: kind || "error",
        message: message && message.message ? message.message : String(message || ""),
        source: source || "",
        lineno: Number(lineno) || 0,
        colno: Number(colno) || 0,
        stack: error && error.stack ? String(error.stack) : ""
      };
      var config = null;
      try {
        config = readTes3mpLaunchConfig();
      } catch (readError) {
      }
      reportBrowserRuntimeFailure(detail, config);
      try {
        var debug = browserHostDebugState(browserHostRuntime);
        debug.lastUnhandledError = detail;
      } catch (debugError) {
      }
      console.error("Unhandled browser runtime failure", detail);
      if (Module.__runtimeKind === "tes3mp" && isBrowserHostLaunchConfig(config)) {
        if (config.role === "guest") {
          releaseBrowserHostGuestReservation(config, "runtime-" + (kind || "error"));
          clearTes3mpFirstFrameRecovery(config);
          clearTes3mpLaunchConfig();
          if (modeStatusElement) modeStatusElement.textContent = "Multiplayer runtime stopped. Rejoin the lobby.";
          showMorrowindLoadingScreen("Multiplayer runtime stopped. Rejoin the lobby.", 300000, {
            category: "multiplayerStartup",
            signal: detail.message || "runtime-error",
            sticky: true
          });
        }
      }
    }

    function getRuntimeLogTail() {
      var text = String(outputLogText || "") + String(pendingOutputLogText || "");
      return text.slice(-4000);
    }

    function getActiveServiceWorkerUrl() {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          return navigator.serviceWorker.controller.scriptURL || "";
        }
      } catch (error) {
      }
      return "";
    }

    function reportBrowserRuntimeFailure(detail, config) {
      var launch = config || {};
      var payload = {
        detail: {
          kind: sanitizeLobbyText(detail && detail.kind, "error", 32),
          message: String(detail && detail.message || "").slice(0, 500),
          source: String(detail && detail.source || "").slice(0, 240),
          lineno: Number(detail && detail.lineno) || 0,
          colno: Number(detail && detail.colno) || 0,
          stack: String(detail && detail.stack || "").slice(0, 8000),
          abortReason: String(detail && detail.abortReason || "").slice(0, 500),
          runtimeLogTail: getRuntimeLogTail(),
          serviceWorker: getActiveServiceWorkerUrl()
        },
        runtimeKind: String(Module && Module.__runtimeKind || "").slice(0, 40),
        buildVersion: buildVersion,
        launch: {
          transport: sanitizeLobbyText(launch.transport, "", 40),
          role: sanitizeLobbyText(launch.role, "", 40),
          instanceId: sanitizeLobbyText(launch.instanceId, "", 96),
          host: sanitizeLobbyText(launch.publicHost || launch.host, "", 120),
          port: Number(launch.publicPort || launch.port) || 0,
          allowCharacterCreation: !!launch.allowCharacterCreation,
          relayClientId: sanitizeLobbyText(launch.relayClientId, "", 96),
          hasRelayUrl: !!launch.relayUrl
        },
        userAgent: String(navigator.userAgent || "").slice(0, 240),
        href: String(location.href || "").split("#")[0].slice(0, 240)
      };
      var text = JSON.stringify(payload);
      try {
        if (navigator.sendBeacon) {
          var blob = new Blob([text], { type: "application/json" });
          if (navigator.sendBeacon(lobbyApiBase + "/client-errors", blob)) return;
        }
      } catch (error) {
      }
      try {
        fetch(lobbyApiBase + "/client-errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: text,
          cache: "no-store",
          credentials: "same-origin",
          keepalive: true
        }).catch(function() {});
      } catch (error) {
      }
    }

    window.onerror = function(message, source, lineno, colno, error) {
      var detail = message && message.message ? message.message : String(message || "");
      Module.setStatus(detail ? "Exception: " + detail.slice(0, 96) : "Exception thrown; see console.");
      handleUnhandledBrowserRuntimeFailure("error", message, source, lineno, colno, error);
    };

    window.addEventListener("unhandledrejection", function(event) {
      var classification = MorrowindRuntimeErrorPolicy.classifyUnhandledRejection(event.reason);
      if (!classification.fatal) {
        if (event.preventDefault) event.preventDefault();
        console.warn("Recoverable browser capability rejection", {
          code: classification.code,
          message: classification.message
        });
        return;
      }
      var reason = event.reason && event.reason.message ? event.reason.message : String(event.reason || "");
      Module.setStatus(reason ? "Runtime failed: " + reason.slice(0, 96) : "Runtime load failed; see console.");
      handleUnhandledBrowserRuntimeFailure("unhandledrejection", event.reason || event, "", 0, 0, event.reason || event);
    });

    Module.onAbort = function(reason) {
      var message = reason ? "Aborted: " + String(reason) : "Aborted";
      var config = null;
      try {
        config = readTes3mpLaunchConfig();
      } catch (error) {
      }
      Module.setStatus(message.slice(0, 120));
      reportBrowserRuntimeFailure({
        kind: "abort",
        message: message,
        abortReason: String(reason || ""),
        source: "Module.onAbort",
        stack: ""
      }, config);
      console.error("Browser runtime abort", reason);
    };
