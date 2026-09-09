    function loadPatchedOpenMwScript(src) {
      return fetch(src, { credentials: "same-origin" })
        .then(function(response) {
          if (!response.ok) throw new Error("Failed to load " + src);
          return response.text();
        })
        .then(function(source) {
          return new Promise(function(resolve, reject) {
            var script = document.createElement("script");
            script.async = true;
            var patchedSource = patchOpenMwRuntimeScript(source, src) + "\n//# sourceURL=" + src;
            var blobUrl = URL.createObjectURL(new Blob([patchedSource], { type: "application/javascript" }));
            window.__openmwRuntimeBlobUrls = window.__openmwRuntimeBlobUrls || [];
            window.__openmwRuntimeBlobUrls.push(blobUrl);
            script.onload = resolve;
            script.onerror = function() {
              reject(new Error("Failed to load patched runtime " + src));
            };
            script.src = blobUrl;
            document.body.appendChild(script);
          });
        });
    }

    function deleteDatabase(name) {
      return new Promise(function(resolve) {
        if (!("indexedDB" in window)) {
          resolve();
          return;
        }
        var request = indexedDB.deleteDatabase(name);
        request.onsuccess = resolve;
        request.onerror = resolve;
        request.onblocked = resolve;
      });
    }

    function resetBrowserStorage() {
      var tasks = [];
      if ("serviceWorker" in navigator) {
        tasks.push(navigator.serviceWorker.getRegistrations().then(function(registrations) {
          return Promise.all(registrations.map(function(registration) {
            return registration.unregister();
          }));
        }));
      }
      if ("caches" in window) {
        tasks.push(caches.keys().then(function(keys) {
          return Promise.all(keys.map(function(key) {
            return caches.delete(key);
          }));
        }));
      }
      tasks.push(deleteDatabase("OPENMW_MORROWIND_PRELOAD_CACHE"));
      return Promise.all(tasks);
    }

    function clearLegacyPreloadCacheOnce() {
      var storageKey = "openmw-morrowind-legacy-preload-cache-cleared";
      try {
        if (window.localStorage && localStorage.getItem(storageKey) === "1") {
          return Promise.resolve();
        }
      } catch (error) {
      }

      return deleteDatabase("OPENMW_MORROWIND_PRELOAD_CACHE").then(function() {
        try {
          if (window.localStorage) localStorage.setItem(storageKey, "1");
        } catch (error) {
        }
      });
    }

    function waitForWorkerActivated(worker) {
      if (!worker || worker.state === "activated") {
        return Promise.resolve();
      }

      return new Promise(function(resolve) {
        var timer = setTimeout(resolve, 2500);
        worker.addEventListener("statechange", function onStateChange() {
          if (worker.state === "activated") {
            clearTimeout(timer);
            worker.removeEventListener("statechange", onStateChange);
            resolve();
          }
        });
      });
    }

    function waitForServiceWorkerControl(shouldWait) {
      if (!shouldWait && navigator.serviceWorker.controller) {
        return Promise.resolve(true);
      }

      return new Promise(function(resolve) {
        if (navigator.serviceWorker.controller && !shouldWait) {
          resolve(true);
          return;
        }

        var timer = setTimeout(function() {
          navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
          resolve(!!navigator.serviceWorker.controller);
        }, 2500);

        function onControllerChange() {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
          resolve(true);
        }

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      });
    }

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return Promise.resolve(false);

      return navigator.serviceWorker.register("sw.js?v=" + encodeURIComponent(buildVersion))
        .then(function(registration) {
          if (!registration) return false;
          var pendingWorker = registration.installing || registration.waiting;
          return waitForWorkerActivated(pendingWorker || registration.active)
            .then(function() {
              return waitForServiceWorkerControl(!!pendingWorker || !navigator.serviceWorker.controller);
            });
        })
        .catch(function(error) {
          console.warn("Service worker registration failed", error);
          return false;
        });
    }

    function startRuntime() {
      if (runtimeStartPromise) return runtimeStartPromise;
      if (!Module.__runtimeKind) Module.__runtimeKind = "openmw";
      Module.__startupFailed = false;
      homepageRuntimeLaunchPending = true;
      cancelHomepageDeferredAssetLoads();
      stopHomepageAudio();
      Module.setStatus("Checking cached assets...");
      modeScreenElement.hidden = true;
      runtimeStartPromise = clearLegacyPreloadCacheOnce()
        .then(function() {
          Module.setStatus("Downloading...");
          return loadScript(versionedRuntimeFile("openmw.data.js"), false);
        })
        .then(function() {
          return loadEnabledOptionalRuntimePackages();
        })
        .then(function() {
          return loadPatchedOpenMwScript(versionedRuntimeFile("openmw.js"));
        });
      return runtimeStartPromise;
    }

    function setModeButtonsEnabled(enabled) {
      modeSinglePlayerButton.disabled = !enabled;
      modeMultiplayerButton.disabled = !enabled;
    }

    function runtimeAssetExists(path) {
      return fetch(versionedRuntimeFile(path), {
        method: "HEAD",
        cache: "no-store",
        credentials: "same-origin"
      }).then(function(response) {
        return response.ok;
      }, function() {
        return false;
      });
    }

    function checkEmbeddedTes3mpRuntime() {
      return Promise.all([
        runtimeAssetExists("tes3mp.js"),
        runtimeAssetExists("tes3mp.wasm"),
        runtimeAssetExists("tes3mp.data.js"),
        runtimeAssetExists("tes3mp.data")
      ]).then(function(results) {
        return results.every(Boolean);
      });
    }

    function loadTes3mpDataPackage() {
      return loadScript(versionedRuntimeFile("tes3mp.data.js"), false).then(function() {
        return true;
      });
    }

    function configureTes3mpLaunchArguments() {
      var config = readTes3mpLaunchConfig();
      Module.arguments.length = 0;
      Module.__runtimeKind = "tes3mp";
      scheduleTes3mpAudioResumeBurst("launch-config", 60000);
      Module.websocket = Module.websocket || {};
      if (isBrowserHostLaunchConfig(config)) {
        delete Module.websocket.url;
        Module.__tes3mpRelayUrl = "";
        window.__tes3mpRelayUrl = "";
      } else if (config && config.relayUrl) {
        installTes3mpRelayUrl(config);
      }
      if (config && config.host && config.port) {
        Module.arguments.push("--skip-menu=1");
        if (config.startCell) Module.arguments.push("--start=" + sanitizeLobbyText(config.startCell, "", 80));
        Module.arguments.push("--connect=" + config.host + ":" + config.port);
        if (config.playerName) Module.arguments.push("--name=" + sanitizeLobbyText(config.playerName, "Nerevarine", 35));
        if (config.password) Module.arguments.push("--password=" + config.password);
        Module.print("TES3MP browser launch: " + config.host + ":" + config.port + (isBrowserHostLaunchConfig(config) ? " through client host." : config.relayUrl ? " through web relay." : "."));
      } else {
        Module.print("TES3MP browser launch: no lobby connection selected.");
      }
    }

    function clearReturnToMenuRequest() {
      try {
        sessionStorage.removeItem("openmw-return-to-menu");
      } catch (error) {
      }
    }

    function startSinglePlayerMode(options) {
      options = options || {};
      homepageRuntimeLaunchPending = true;
      cancelHomepageDeferredAssetLoads();
      revealHomepageDecor();
      showMorrowindLoadingScreen("Preparing single player...", 300000, {
        category: "singlePlayerStartup",
        signal: "startup",
        sticky: true
      });
      setModeButtonsEnabled(false);
      modeStatusElement.textContent = "Opening main menu...";
      clearReturnToMenuRequest();
      if (!options.preserveStartupMode) clearStartupModeRequest();
      return registerServiceWorker().then(startRuntime).catch(function(error) {
        runtimeStartPromise = null;
        Module.__startupFailed = true;
        homepageRuntimeLaunchPending = false;
        hideMorrowindLoadingScreen();
        setModeButtonsEnabled(true);
        modeScreenElement.hidden = false;
        modeStatusElement.textContent = "Single player failed to start.";
        Module.setStatus("Runtime load failed; see console.");
        console.error(error);
      });
    }

    function startEmbeddedMultiplayerMode() {
      if (runtimeStartPromise) return runtimeStartPromise;
      var launchConfig = readTes3mpLaunchConfig();
      if (!hasBrowserTes3mpLaunchConfig(launchConfig)) {
        return promptForMultiplayerLobby("Create or join a lobby to start multiplayer.");
      }
      homepageRuntimeLaunchPending = true;
      cancelHomepageDeferredAssetLoads();
      setModeButtonsEnabled(false);
      modeStatusElement.textContent = "Checking multiplayer client...";
      showMorrowindLoadingScreen("Checking multiplayer client...", 300000, {
        category: "multiplayerStartup",
        signal: "client-check",
        sticky: true
      });
      return registerServiceWorker()
        .then(checkEmbeddedTes3mpRuntime)
        .then(function(available) {
          if (!available) {
            throw new Error("Embedded multiplayer client is not installed.");
          }
          configureTes3mpLaunchArguments();
          stopHomepageAudio();
          modeScreenElement.hidden = true;
          Module.setStatus("Checking cached multiplayer assets...");
          runtimeStartPromise = prepareBrowserHostedMultiplayer(launchConfig)
            .then(clearLegacyPreloadCacheOnce)
	            .then(function() {
	              Module.setStatus("Loading multiplayer data...");
	              return loadScript(versionedRuntimeFile("openmw.data.js"), false);
	            })
	            .then(loadTes3mpDataPackage)
		            .then(function() {
		              installTes3mpAssetVerifierPreRun();
		              Module.setStatus("Loading multiplayer...");
		              return loadPatchedOpenMwScript(versionedRuntimeFile("tes3mp.js"));
		            });
          return runtimeStartPromise;
        })
			        .catch(function(error) {
			          runtimeStartPromise = null;
              homepageRuntimeLaunchPending = false;
			          if (isBrowserHostLaunchConfig(launchConfig)) {
		            if (launchConfig.role === "guest") releaseBrowserHostGuestReservation(launchConfig, "startup-failed");
		            clearTes3mpFirstFrameRecovery(launchConfig);
		            clearTes3mpLaunchConfig();
		          }
		          hideMorrowindLoadingScreen();
		          setModeButtonsEnabled(true);
		          modeScreenElement.hidden = false;
		          modeStatusElement.textContent = isBrowserHostLaunchConfig(launchConfig)
	            ? formatBrowserHostStartupError(error, "Client-hosted multiplayer failed to start.")
	            : error && error.message
	              ? error.message
	              : "Multiplayer failed to start.";
	          Module.setStatus("");
	          console.error(error);
	        });
    }

    function startSelectedModeFromQuery() {
      var requestedMode = (pageParams.get("mode") || "").toLowerCase();
      if (requestedMode === "single" || requestedMode === "singleplayer") {
        startSinglePlayerMode();
        return true;
      }
      if (requestedMode === "multi" || requestedMode === "multiplayer") {
        startEmbeddedMultiplayerMode();
        return true;
      }
      return false;
    }

    function reloadAfterBrowserReset() {
      var resetUrl = new URL(window.location.href);
      resetUrl.searchParams.delete("reset");
      resetUrl.searchParams.delete("resetsettings");
      resetUrl.searchParams.set("reset-settings", "1");
      resetUrl.searchParams.set("_fresh", buildVersion);
      window.location.replace(resetUrl.toString());
      return new Promise(function() {});
    }

    modeSinglePlayerButton.addEventListener("click", function() {
      startSinglePlayerMode();
    });

    modeMultiplayerButton.addEventListener("click", function() {
      promptForMultiplayerLobby("Create or join a lobby to start multiplayer.");
    });

    installWaterDebugOverlay();
    installHomepageAudio();
    installHomepageDeferredAssets();
    if (resetBrowserCacheRequested) {
      stopHomepageAudio();
      modeScreenElement.hidden = true;
      Module.setStatus("Clearing browser cache...");
      resetBrowserStorage()
        .catch(function(error) {
          console.warn("Cache reset failed", error);
        })
        .then(function() {
          return registerServiceWorker();
        })
        .then(reloadAfterBrowserReset)
        .catch(function(error) {
          Module.setStatus("Runtime load failed; see console.");
          console.error(error);
        });
    } else {
      Module.setStatus("");
      modeStatusElement.textContent = "";
      if (!startSelectedModeFromQuery()) {
        if (hasRequestedStartupMode()) {
          startSinglePlayerMode({ preserveStartupMode: true });
        } else {
          registerServiceWorker().catch(function(error) {
            console.warn("Service worker registration failed", error);
          });
        }
      }
    }
