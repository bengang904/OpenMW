    function versionedStaticAsset(path) {
      return versionedStaticFile(path);
    }

    function queueMorrowindSplashPreloadStep(index) {
      var run = function() {
        if (!isHomepageAudioActive()) return;
        if (index >= loadingSplashImages.length) return;
        var image = new Image();
        image.decoding = "async";
        image.src = versionedStaticAsset(loadingSplashImages[index]);
        loadingSplashPreloadImages.push(image);
        if (index + 1 < loadingSplashImages.length) {
          setTimeout(function() {
            queueMorrowindSplashPreloadStep(index + 1);
          }, 500);
        }
      };
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, { timeout: 2000 });
      } else {
        setTimeout(run, 250);
      }
    }

    function preloadMorrowindSplashImages() {
      if (loadingSplashPreloadStarted) return;
      if (!isHomepageAudioActive()) return;
      if (!isBrowserModEnabled("official-splash")) return;
      loadingSplashPreloadStarted = true;
      queueMorrowindSplashPreloadStep(0);
    }

    function scheduleMorrowindSplashPreload(delayMs) {
      if (loadingSplashPreloadStarted || loadingSplashPreloadTimer) return;
      if (!isHomepageAudioActive()) return;
      loadingSplashPreloadTimer = setTimeout(function() {
        loadingSplashPreloadTimer = 0;
        preloadMorrowindSplashImages();
      }, Math.max(0, delayMs || 0));
    }

    function pickMorrowindSplashImage() {
      if (!isBrowserModEnabled("official-splash")) return "";
      if (!loadingSplashImages.length) return "";
      var nextIndex = Math.floor(Math.random() * loadingSplashImages.length);
      if (loadingSplashImages.length > 1 && nextIndex === loadingSplashIndex) {
        nextIndex = (nextIndex + 1) % loadingSplashImages.length;
      }
      loadingSplashIndex = nextIndex;
      return versionedStaticAsset(loadingSplashImages[nextIndex]);
    }

    function hideMorrowindLoadingScreen() {
      clearTimeout(loadingOverlayHideTimer);
      clearTimeout(loadingOverlayHardTimer);
      clearTimeout(tes3mpGameplayFallbackHideTimer);
      loadingOverlayHideTimer = 0;
      loadingOverlayHardTimer = 0;
      tes3mpGameplayFallbackHideTimer = 0;
      loadingOverlayActive = false;
      loadingOverlaySticky = false;
      loadingOverlayElement.hidden = true;
      updateTouchControlsVisibility();
      recordMorrowindLoadingEvent("hide", loadingTextElement.textContent || "");
      loadingSplashElement.removeAttribute("src");
    }

    function browserHostGuestLaunchConfig() {
      var config = readTes3mpLaunchConfig();
      return isBrowserHostLaunchConfig(config) && config.role === "guest" ? config : null;
    }

    function tes3mpFirstFrameRecoveryStorageKey(config) {
      return "openmw-tes3mp-first-frame-recovery:" + String(config && config.instanceId || "unknown");
    }

    function clearTes3mpFirstFrameRecovery(config) {
      config = config || browserHostGuestLaunchConfig();
      if (!config) return;
      removeLobbyTabStorage(tes3mpFirstFrameRecoveryStorageKey(config));
    }

    function scheduleTes3mpFirstFrameRecovery(reason, delay) {
      var config = browserHostGuestLaunchConfig();
      clearTimeout(tes3mpFirstFrameRecoveryTimer);
      tes3mpFirstFrameRecoveryTimer = 0;
      if (!config || tes3mpFirstFrameReady || returningToMainMenu) return;

      var recoveryKey = tes3mpFirstFrameRecoveryStorageKey(config);
      if (readLobbyTabStorage(recoveryKey) === "1") return;

      tes3mpFirstFrameRecoveryTimer = setTimeout(function() {
        if (returningToMainMenu || Module.__runtimeKind !== "tes3mp") return;
        if (tes3mpFirstFrameReady || canvasHasVisibleFrame()) {
          clearTes3mpFirstFrameRecovery(config);
          return;
        }

        var debug = window.__tes3mpBrowserHostDebug || {};
        var counts = debug.counts || {};
        var hasBrowserHostTraffic =
          (Number(counts["client-to-host-peer"]) || 0) > 0 ||
          (Number(counts["server-to-guest"]) || 0) > 0 ||
          (Number(counts["server-to-client-enqueue"]) || 0) > 0;
        if (!tes3mpGameplayReadyAt && !hasBrowserHostTraffic) {
          scheduleTes3mpFirstFrameRecovery(reason || "startup-wait", 60000);
          return;
        }

        writeLobbyTabStorage(recoveryKey, "1");
        recordMorrowindLoadingEvent("recover-reload", "Restarting multiplayer renderer", {
          category: "multiplayerStartup",
          signal: reason || "first-frame-timeout"
        });
        showMorrowindLoadingScreen("Restarting multiplayer renderer...", 300000, {
          category: "multiplayerStartup",
          signal: reason || "first-frame-timeout",
          sticky: true
        });
        var nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("mode", "multi");
        nextUrl.searchParams.set("recover", "browser-host-first-frame");
        nextUrl.searchParams.set("_fresh", buildVersion);
        setTimeout(function() {
          window.location.replace(nextUrl.toString());
        }, 500);
      }, Math.max(10000, delay || 60000));
    }

    function scheduleMorrowindLoadingHide(delay) {
      var minVisibleMs = 1500;
      var elapsed = Date.now() - loadingOverlayStartedAt;
      loadingOverlaySticky = false;
      clearTimeout(loadingOverlayHideTimer);
      loadingOverlayHideTimer = setTimeout(hideMorrowindLoadingScreen, Math.max(delay, minVisibleMs - elapsed));
    }

    function handleMorrowindLoadingHardTimeout() {
      loadingOverlayHardTimer = 0;
      if (loadingOverlaySticky &&
          Module.__runtimeKind === "tes3mp" &&
          !tes3mpFirstFrameReady &&
          !returningToMainMenu) {
        recordMorrowindLoadingEvent("hard-timeout-held", loadingTextElement.textContent || "Loading multiplayer...", {
          category: "multiplayerStartup",
          signal: "waiting-first-frame"
        });
        loadingOverlayHardTimer = setTimeout(handleMorrowindLoadingHardTimeout, 60000);
        return;
      }
      hideMorrowindLoadingScreen();
    }

    function recordMorrowindLoadingEvent(type, message, detail) {
      try {
        var events = window.__morrowindLoadingOverlayEvents || [];
        events.push({
          type: type,
          message: message,
          category: detail && detail.category ? detail.category : "",
          signal: detail && detail.signal ? detail.signal : "",
          image: loadingSplashElement.currentSrc || loadingSplashElement.src || "",
          hidden: loadingOverlayElement.hidden,
          time: Date.now()
        });
        if (events.length > 80) events.splice(0, events.length - 80);
        window.__morrowindLoadingOverlayEvents = events;
      } catch (error) {
      }
    }

    function showMorrowindLoadingScreen(message, maximumVisibleMs, detail) {
      potentialLoadingUntil = 0;
      clearTimeout(potentialLoadingTimer);
      potentialLoadingTimer = 0;
      detail = detail || {};

      if (!loadingOverlayActive) {
        var splash = pickMorrowindSplashImage();
        if (splash) loadingSplashElement.src = splash;
        loadingOverlayActive = true;
        loadingOverlayStartedAt = Date.now();
        loadingOverlayElement.hidden = false;
        updateTouchControlsVisibility();
      }

      if (detail.sticky) loadingOverlaySticky = true;
      loadingTextElement.textContent = message || "Loading...";
      recordMorrowindLoadingEvent("show", loadingTextElement.textContent, detail.category ? detail : { category: "blockingLoadStart" });
      clearTimeout(loadingOverlayHardTimer);
      loadingOverlayHardTimer = setTimeout(handleMorrowindLoadingHardTimeout, maximumVisibleMs || 15000);
      if (!loadingOverlaySticky) scheduleMorrowindLoadingHide(3000);
    }

    function tes3mpCanvasFrameStats() {
      try {
        if (!canvasElement || !canvasElement.width || !canvasElement.height) return { ok: false, reason: "missing-canvas" };
        var sample = document.createElement("canvas");
        sample.width = Math.max(1, Math.min(128, canvasElement.width));
        sample.height = Math.max(1, Math.min(72, canvasElement.height));
        var context = sample.getContext("2d", { willReadFrequently: true });
        if (!context) return { ok: false, reason: "no-2d-context" };
        context.drawImage(canvasElement, 0, 0, sample.width, sample.height);
        var data = context.getImageData(0, 0, sample.width, sample.height).data;
        var colors = {};
        var dominant = {};
        var nonBlack = 0;
        var black = 0;
        var dark = 0;
        var pink = 0;
        var redSum = 0;
        var greenSum = 0;
        var blueSum = 0;
        var lumaSum = 0;
        var lumaSquares = 0;
        var skyCount = 0;
        var skyBlack = 0;
        var skyWhite = 0;
        var skyBlueDominant = 0;
        var skyRed = 0;
        var skyGreen = 0;
        var skyBlue = 0;
        var hudCount = 0;
        var hudColor = 0;
        var hudBright = 0;
        var minimapCount = 0;
        var minimapSignal = 0;
        var width = sample.width;
        var height = sample.height;
        for (var i = 0; i < data.length; i += 4) {
          var pixelIndex = i / 4;
          var y = Math.floor(pixelIndex / width);
          var x = pixelIndex - y * width;
          var red = data[i];
          var green = data[i + 1];
          var blue = data[i + 2];
          var alpha = data[i + 3];
          var rgb = red + green + blue;
          var luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          var range = Math.max(red, green, blue) - Math.min(red, green, blue);
          if (alpha > 0 && rgb > 24) nonBlack++;
          if (alpha > 0 && rgb < 24) black++;
          if (alpha > 0 && rgb < 90) dark++;
          if (alpha > 0 && red > 180 && blue > 150 && green < 90) pink++;
          if (x >= width * 0.34 && x < width * 0.88 && y >= height * 0.02 && y < height * 0.20) {
            skyCount++;
            skyRed += red;
            skyGreen += green;
            skyBlue += blue;
            if (alpha > 0 && rgb < 24) skyBlack++;
            if (alpha > 0 && blue > red * 1.35 && blue > green * 1.12 && blue > 56) skyBlueDominant++;
            if (alpha > 0 && luma > 220 && range < 34) skyWhite++;
          }
          if (x < width * 0.14 && y >= height * 0.88) {
            hudCount++;
            if (alpha > 0 && (
              (red > 120 && green < 90 && blue < 90) ||
              (green > 100 && red < 90 && blue < 110) ||
              (blue > 100 && red < 100 && green < 130)
            )) {
              hudColor++;
            }
            if (alpha > 0 && rgb > 180) hudBright++;
          }
          if (x >= width * 0.88 && y >= height * 0.84) {
            minimapCount++;
            if (alpha > 0 && rgb > 130 && range > 20) minimapSignal++;
          }
          redSum += red;
          greenSum += green;
          blueSum += blue;
          lumaSum += luma;
          lumaSquares += luma * luma;
          var bucket = (red >> 4) + ":" + (green >> 4) + ":" + (blue >> 4) + ":" + (alpha >> 6);
          colors[bucket] = true;
          dominant[bucket] = (dominant[bucket] || 0) + 1;
        }
        var pixels = data.length / 4;
        var colorCount = Object.keys(colors).length;
        var dominantCount = 0;
        Object.keys(dominant).forEach(function(bucket) {
          dominantCount = Math.max(dominantCount, dominant[bucket]);
        });
        var mean = lumaSum / pixels;
        var variance = lumaSquares / pixels - mean * mean;
        var stats = {
          ok: false,
          nonBlackRatio: nonBlack / pixels,
          blackRatio: black / pixels,
          darkRatio: dark / pixels,
          redMean: redSum / pixels,
          greenMean: greenSum / pixels,
          blueMean: blueSum / pixels,
          skyBandBlackRatio: skyCount ? skyBlack / skyCount : 1,
          skyBandWhiteRatio: skyCount ? skyWhite / skyCount : 1,
          skyBandBlueDominantRatio: skyCount ? skyBlueDominant / skyCount : 1,
          skyBandRedMean: skyCount ? skyRed / skyCount : 0,
          skyBandGreenMean: skyCount ? skyGreen / skyCount : 0,
          skyBandBlueMean: skyCount ? skyBlue / skyCount : 0,
          hudColorRatio: hudCount ? hudColor / hudCount : 0,
          hudBrightRatio: hudCount ? hudBright / hudCount : 0,
          minimapSignalRatio: minimapCount ? minimapSignal / minimapCount : 0,
          dominantRatio: dominantCount / pixels,
          pinkRatio: pink / pixels,
          colors: colorCount,
          mean: mean,
          variance: variance
        };
        var variedScene = stats.nonBlackRatio > 0.25 &&
          stats.colors > 96 &&
          stats.variance > 80 &&
          stats.pinkRatio < 0.01 &&
          !(stats.mean > 205 && stats.colors < 96);
        var noBlueWash = !(stats.blueMean > stats.redMean * 1.25 &&
          stats.blueMean > stats.greenMean * 1.12 &&
          stats.blueMean > 56);
        var skyNotSolidBlue = !(stats.skyBandBlueDominantRatio > 0.78 &&
          stats.skyBandBlueMean > stats.skyBandRedMean * 1.35 &&
          stats.skyBandBlueMean > stats.skyBandGreenMean * 1.12);
        var inGameHud = stats.hudColorRatio > 0.02 &&
          stats.hudBrightRatio > 0.04 &&
          stats.minimapSignalRatio > 0.16;
        stats.ok = variedScene &&
          noBlueWash &&
          skyNotSolidBlue &&
          inGameHud &&
          stats.skyBandBlackRatio < 0.35 &&
          stats.skyBandWhiteRatio < 0.70 &&
          stats.darkRatio < 0.96 &&
          stats.dominantRatio < 0.88;
        stats.looseOk = stats.nonBlackRatio > 0.08 &&
          stats.colors > 24 &&
          stats.variance > 20 &&
          stats.pinkRatio < 0.02 &&
          stats.darkRatio < 0.98 &&
          stats.dominantRatio < 0.96 &&
          (stats.mean < 245 || stats.colors > 64);
        window.__tes3mpCanvasFrameStats = stats;
        return stats;
      } catch (error) {
        return { ok: false, reason: String(error) };
      }
    }

    function canvasHasVisibleFrame() {
      if (Module.__runtimeKind === "tes3mp" && !tes3mpWorldReadyAt) return false;
      var stats = tes3mpCanvasFrameStats();
      if (stats.ok) return true;
      return !!(Module.__runtimeKind === "tes3mp" &&
        tes3mpGameplayReadyAt &&
        Date.now() - tes3mpGameplayReadyAt > 3000 &&
        stats.looseOk);
    }

    function resetTes3mpFirstFrameReadiness(reason) {
      if (!tes3mpFirstFrameReady && !tes3mpWorldReadyAt) return;
      clearTimeout(tes3mpGameplayFallbackHideTimer);
      tes3mpGameplayFallbackHideTimer = 0;
      tes3mpFirstFrameReady = false;
      tes3mpWorldReadyAt = 0;
      clearTimeout(tes3mpFirstFrameProbeTimer);
      tes3mpFirstFrameProbeTimer = 0;
      recordMorrowindLoadingEvent("first-frame-reset", "Loading multiplayer area", {
        category: "streamingActivity",
        signal: reason || "streaming"
      });
    }

    function startTes3mpFirstFrameProbe() {
      if (tes3mpFirstFrameReady) return;
      if (Module.__runtimeKind === "tes3mp" && !tes3mpWorldReadyAt) return;
      clearTimeout(tes3mpFirstFrameProbeTimer);
      tes3mpFirstFrameProbeStartedAt = Date.now();
      function probe() {
        if (Module.__runtimeKind !== "tes3mp" || returningToMainMenu) return;
        if (canvasHasVisibleFrame()) {
          tes3mpFirstFrameReady = true;
          clearTimeout(tes3mpFirstFrameRecoveryTimer);
          tes3mpFirstFrameRecoveryTimer = 0;
          clearTes3mpFirstFrameRecovery();
          recordMorrowindLoadingEvent("first-frame", "Multiplayer ready", {
            category: "multiplayerStartup",
            signal: "canvas-visible"
          });
          scheduleMorrowindLoadingHide(600);
          return;
        }
        if (Date.now() - tes3mpFirstFrameProbeStartedAt > 300000) {
          recordMorrowindLoadingEvent("first-frame-timeout", "Multiplayer startup timed out", {
            category: "multiplayerStartup",
            signal: "canvas-timeout"
          });
          showMorrowindLoadingScreen("Multiplayer loaded; waiting for video...", 300000, {
            category: "multiplayerStartup",
            signal: "canvas-timeout",
            sticky: true
          });
          return;
        }
        tes3mpFirstFrameProbeTimer = setTimeout(probe, 1000);
      }
      tes3mpFirstFrameProbeTimer = setTimeout(probe, 1000);
    }

    function scheduleTes3mpGameplayFallbackHide(message) {
      clearTimeout(tes3mpGameplayFallbackHideTimer);
      tes3mpGameplayFallbackHideTimer = 0;
      if (Module.__runtimeKind !== "tes3mp" || !tes3mpGameplayReadyAt || returningToMainMenu) return;
      tes3mpGameplayFallbackHideTimer = setTimeout(function() {
        tes3mpGameplayFallbackHideTimer = 0;
        if (Module.__runtimeKind !== "tes3mp" || returningToMainMenu || !tes3mpGameplayReadyAt) return;
        if (tes3mpFirstFrameReady || canvasHasVisibleFrame()) {
          scheduleMorrowindLoadingHide(600);
          return;
        }
        if (!/Rendering multiplayer|Multiplayer loaded; waiting for video/i.test(loadingTextElement.textContent || "")) return;
        recordMorrowindLoadingEvent("gameplay-fallback-hide", "Multiplayer ready", {
          category: "multiplayerStartup",
          signal: message || "fallback-hide"
        });
        hideMorrowindLoadingScreen();
      }, 12000);
    }

    function markTes3mpGameplayReady(message, delay) {
      if (!tes3mpWorldReadyAt) tes3mpWorldReadyAt = Date.now();
      if (!tes3mpGameplayReadyAt) tes3mpGameplayReadyAt = Date.now();
      scheduleTes3mpAudioResumeBurst("gameplay-ready", 60000);
      var hasVisibleFrame = canvasHasVisibleFrame();
      recordMorrowindLoadingEvent("gameplay-ready", message || "Multiplayer ready", {
        category: "multiplayerStartup",
        signal: message || "tes3mp-ready"
      });
      if (!hasVisibleFrame && !tes3mpFirstFrameReady) {
        showMorrowindLoadingScreen("Rendering multiplayer...", 300000, {
          category: "multiplayerStartup",
          signal: message || "waiting-first-frame",
          sticky: true
        });
      }
      startTes3mpFirstFrameProbe();
      if (!tes3mpFirstFrameReady && !hasVisibleFrame) {
        scheduleTes3mpFirstFrameRecovery(message || "gameplay-ready", 45000);
        scheduleTes3mpGameplayFallbackHide(message || "gameplay-ready");
      }
      if (hasVisibleFrame || tes3mpFirstFrameReady) {
        clearTimeout(tes3mpGameplayFallbackHideTimer);
        tes3mpGameplayFallbackHideTimer = 0;
        scheduleMorrowindLoadingHide(delay == null ? 1800 : delay);
      }
    }

    function getMonotonicTime() {
      return typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    }

    function armPotentialMorrowindLoading(reason) {
      if (!runtimeStarted || returningToMainMenu) return;
      recordMorrowindLoadingEvent("input", reason || "interaction", {
        category: "ignoredInputStall",
        signal: reason || "interaction"
      });
    }

    function monitorMorrowindLoadingStalls(frameTime) {
      loadingFrameCounter++;
      var now = typeof frameTime === "number" ? frameTime : getMonotonicTime();
      if (
        runtimeStarted &&
        !returningToMainMenu &&
        document.visibilityState !== "hidden" &&
        potentialLoadingUntil > now &&
        loadingLastFrameAt &&
        now - loadingLastFrameAt >= 450 &&
        now - potentialLoadingArmedAt <= 9000 &&
        !loadingOverlayActive
      ) {
        recordMorrowindLoadingEvent("stall", potentialLoadingReason, {
          category: "ignoredInputStall",
          signal: potentialLoadingReason
        });
      }
      loadingLastFrameAt = now;
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(monitorMorrowindLoadingStalls);
      }
    }

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(monitorMorrowindLoadingStalls);
    }

    loadingSplashElement.addEventListener("error", function() {
      loadingSplashElement.removeAttribute("src");
    });
