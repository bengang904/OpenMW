    var releaseConfig = window.__MORROWIND_RELEASE__ || {};
    var buildVersion = releaseConfig.shellBuild || "20260712095004";
    var appPageTitle = "Morrowind App";
    function enforceAppPageTitle() {
      if (document.title !== appPageTitle) document.title = appPageTitle;
    }
    enforceAppPageTitle();
    setInterval(enforceAppPageTitle, 1000);
    var runtimeAssetVersions = releaseConfig.runtimeAssets || {"openmw.js":"60294d6fb1d2a159","openmw.wasm":"e6cfaa7b5762bfa2","openmw.data.js":"22e4c0a1868ba821","openmw.data":"dfdde0b7b359665f","openmw.cfg":"64066031fd8d0b01","openmw-splash.data":"136eaff167c5d394","openmw-splash.data.js":"1945b24042f7638a","tes3mp.js":"a607d1f76dbd4c61","tes3mp.wasm":"4c1b5e608693f3d6","tes3mp.data":"e131f39bc9746574","tes3mp.data.js":"7418b3cc358cf9cc","tes3mp-browser-host-worker.js":"3601f0010660db54","tes3mp-server.data":"6d5888e58ad9657f","tes3mp-server.js":"8680d7dd285a10fa","tes3mp-server.wasm":"a8badf083eeb191e"};
    var pageParams = new URLSearchParams(window.location.search);
    var resetBrowserCacheRequested = pageParams.has("reset");
    var resetSettingsRequested = resetBrowserCacheRequested ||
      pageParams.has("reset-settings") || pageParams.has("resetsettings");
    var waterDebugRequested = pageParams.has("waterdebug") || pageParams.has("debugwater");
    var browserGraphicsProfile = "browser-safe-terrain";
    var browserTerrainProfile = {
      label: "terrain-original-morrowind-classic",
      anisotropy: 4,
      textureMipmap: "linear",
      distantTerrain: false,
      lodFactor: 1.0,
      vertexLodMod: 1,
      compositeMapLevel: 0,
      compositeMapResolution: 1024,
      viewingDistance: 7168,
      fogStart: 3072,
      fogEnd: 7168
    };
    if ((resetBrowserCacheRequested || resetSettingsRequested) &&
        window.history && typeof window.history.replaceState === "function") {
      var cleanResetUrl = new URL(window.location.href);
      cleanResetUrl.searchParams.delete("reset");
      cleanResetUrl.searchParams.delete("reset-settings");
      cleanResetUrl.searchParams.delete("resetsettings");
      window.history.replaceState(null, "", cleanResetUrl.toString());
    }

    function versionedRuntimeFile(path) {
      if (releaseConfig.runtimeBase) {
        return new URL(releaseConfig.runtimeBase.replace(/\/?$/, "/") + path, window.location.origin).href;
      }
      var versionKey = /^(?:openmw|tes3mp)\.data(?:\.\d+)?$/.test(path)
        ? path.replace(/\.\d+$/, "")
        : path;
      var version = runtimeAssetVersions[versionKey] || buildVersion;
      if (/^(?:tes3mp|tes3mp-server)\.(?:js|worker\.js|wasm|data(?:\.\d+)?|data\.js)$/.test(path) ||
          path === "tes3mp-browser-host-worker.js") {
        version += "-" + buildVersion;
      }
      var versionedPath = /^((?:openmw|tes3mp|tes3mp-server)\.(?:js|worker\.js|wasm|data(?:\.\d+)?|data\.js)|tes3mp-browser-host-worker\.js|openmw-splash\.data(?:\.js)?|openmw-mod-[a-z0-9-]+\.data(?:\.js)?|openmw\.cfg)$/.test(path)
        ? path + "?v=" + encodeURIComponent(version)
        : path;
      return new URL(versionedPath, window.location.origin + window.location.pathname.replace(/[^/]*$/, "")).href;
    }

    function versionedStaticFile(path) {
      if (releaseConfig.staticBase) {
        return new URL(releaseConfig.staticBase.replace(/\/?$/, "/") + path, window.location.origin).href;
      }
      return new URL(path + "?v=" + encodeURIComponent(buildVersion), window.location.href).href;
    }

    function isHomepageAudioActive() {
      return modeScreenElement && !modeScreenElement.hidden && !homepageRuntimeLaunchPending && !runtimeStarted && !runtimeStartPromise;
    }

    function isHomepageRuntimeLaunchTarget(target) {
      return !!(target && target.closest && target.closest("#mode-single-player"));
    }

    function revealHomepageDecor() {
      if (homepageDecorReady) return;
      homepageDecorReady = true;
      if (document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.add("homepage-decor-ready");
      }
    }

    function requestHomepageDeferredAssets(event) {
      if (homepageDeferredAssetsRequested) return;
      if (!isHomepageAudioActive()) return;
      if (event && isHomepageRuntimeLaunchTarget(event.target)) return;
      homepageDeferredAssetsRequested = true;
      revealHomepageDecor();
      scheduleMorrowindSplashPreload(1800);
      ["pointermove", "pointerdown", "touchstart", "keydown", "focusin"].forEach(function(type) {
        document.removeEventListener(type, requestHomepageDeferredAssets, true);
      });
    }

    function installHomepageDeferredAssets() {
      ["pointermove", "pointerdown", "touchstart", "keydown", "focusin"].forEach(function(type) {
        document.addEventListener(type, requestHomepageDeferredAssets, true);
      });
    }

    function cancelHomepageDeferredAssetLoads() {
      clearTimeout(loadingSplashPreloadTimer);
      loadingSplashPreloadTimer = 0;
    }

    function getHomepageAudioContext() {
      if (homepageAudioContext) return homepageAudioContext;
      var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      try {
        homepageAudioContext = new AudioContextCtor();
      } catch (error) {
        homepageAudioContext = null;
      }
      return homepageAudioContext;
    }

    function ensureHomepageMusicElement() {
      if (homepageMusicElement) return homepageMusicElement;
      homepageMusicElement = document.createElement("audio");
      homepageMusicElement.preload = "none";
      homepageMusicElement.src = versionedStaticFile(homepageMusicPath);
      homepageMusicElement.loop = true;
      homepageMusicElement.volume = 0;
      homepageMusicElement.setAttribute("aria-hidden", "true");
      return homepageMusicElement;
    }

    function fadeHomepageMusicTo(targetVolume, durationMs) {
      var audio = homepageMusicElement;
      if (!audio) return;
      window.clearInterval(homepageMusicFadeTimer);
      var startVolume = Number(audio.volume) || 0;
      var startAt = Date.now();
      var duration = Math.max(1, Number(durationMs) || 1);
      homepageMusicFadeTimer = window.setInterval(function() {
        var t = Math.min(1, (Date.now() - startAt) / duration);
        audio.volume = Math.max(0, Math.min(1, startVolume + (targetVolume - startVolume) * t));
        if (t >= 1) {
          window.clearInterval(homepageMusicFadeTimer);
          if (targetVolume <= 0.001) {
            audio.pause();
            try {
              audio.currentTime = 0;
            } catch (error) {
            }
          }
        }
      }, 40);
    }

    function startHomepageMusic() {
      if (!homepageAudioUnlocked || !isHomepageAudioActive()) return;
      var audio = ensureHomepageMusicElement();
      audio.play().then(function() {
        fadeHomepageMusicTo(homepageMusicVolume, 900);
      }).catch(function() {
      });
    }

    function stopHomepageAudio() {
      fadeHomepageMusicTo(0, 350);
    }

    function unlockHomepageAudio(event) {
      if (!isHomepageAudioActive()) return;
      if (event && isHomepageRuntimeLaunchTarget(event.target)) return;
      homepageAudioUnlocked = true;
      var context = getHomepageAudioContext();
      if (context && context.state === "suspended" && context.resume) {
        context.resume().catch(function() {});
      }
      startHomepageMusic();
    }

    function playHomepageUiSfx(kind) {
      if (!homepageAudioUnlocked || !isHomepageAudioActive()) return;
      var nowMs = Date.now();
      var throttleMs = kind === "hover" ? 90 : 45;
      if (homepageLastSfxAt[kind] && nowMs - homepageLastSfxAt[kind] < throttleMs) return;
      homepageLastSfxAt[kind] = nowMs;

      var context = getHomepageAudioContext();
      if (!context) return;
      if (context.state === "suspended") {
        if (context.resume) context.resume().catch(function() {});
        return;
      }

      var now = context.currentTime;
      var gain = context.createGain();
      var osc = context.createOscillator();
      var body = context.createOscillator();
      var noiseSource = null;
      var noiseGain = null;
      var duration = kind === "hover" ? 0.075 : kind === "change" ? 0.11 : 0.14;
      var peak = kind === "hover" ? 0.018 : kind === "change" ? 0.028 : 0.038;
      var base = kind === "hover" ? 640 : kind === "change" ? 460 : 330;

      osc.type = "triangle";
      body.type = "sine";
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * (kind === "click" ? 1.48 : 1.18), now + duration);
      body.frequency.setValueAtTime(kind === "hover" ? 190 : 135, now);
      body.frequency.exponentialRampToValueAtTime(kind === "hover" ? 160 : 105, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      body.connect(gain);

      if (kind !== "hover") {
        var buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * 0.055)), context.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
        }
        noiseSource = context.createBufferSource();
        noiseGain = context.createGain();
        noiseSource.buffer = buffer;
        noiseGain.gain.setValueAtTime(0.012, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
        noiseSource.connect(noiseGain);
        noiseGain.connect(gain);
        noiseSource.start(now);
        noiseSource.stop(now + 0.06);
      }

      gain.connect(context.destination);
      osc.start(now);
      body.start(now);
      osc.stop(now + duration + 0.03);
      body.stop(now + duration + 0.03);
    }

    function isHomepageUiSoundTarget(target) {
      var element = target && target.closest
        ? target.closest("button, a, input, select, textarea, [role='tab'], .lobby-instance")
        : null;
      if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return null;
      if (!shellElement.contains(element)) return null;
      if (!isHomepageAudioActive()) return null;
      return element;
    }

    function installHomepageAudio() {
      ["pointerdown", "touchstart", "keydown"].forEach(function(type) {
        document.addEventListener(type, unlockHomepageAudio, { capture: true });
      });
      document.addEventListener("mouseover", function(event) {
        if (!isHomepageUiSoundTarget(event.target)) return;
        playHomepageUiSfx("hover");
      }, true);
      document.addEventListener("focusin", function(event) {
        if (!isHomepageUiSoundTarget(event.target)) return;
        playHomepageUiSfx("hover");
      }, true);
      document.addEventListener("click", function(event) {
        if (!isHomepageUiSoundTarget(event.target)) return;
        playHomepageUiSfx("click");
      }, true);
      document.addEventListener("change", function(event) {
        if (!isHomepageUiSoundTarget(event.target)) return;
        playHomepageUiSfx("change");
      }, true);
    }

    function installWaterDebugOverlay() {
      if (!waterDebugRequested || document.getElementById("water-debug-overlay")) return;
      var overlay = document.createElement("div");
      var header = document.createElement("button");
      var toolbar = document.createElement("div");
      var copyButton = document.createElement("button");
      var content = document.createElement("textarea");
      var expanded = false;
      var dragging = false;
      var dragOffsetX = 0;
      var dragOffsetY = 0;
      var latestDebugText = "water debug: waiting for WebGL...";
      overlay.id = "water-debug-overlay";
      overlay.style.cssText = [
        "position:fixed",
        "left:6px",
        "top:6px",
        "z-index:2147483647",
        "margin:0",
        "border:1px solid rgba(255,255,255,0.32)",
        "background:rgba(0,0,0,0.78)",
        "color:#d7f7ff",
        "font:11px/1.25 monospace",
        "pointer-events:auto",
        "user-select:text",
        "max-width:calc(100vw - 12px)"
      ].join(";");
      header.type = "button";
      header.style.cssText = [
        "display:block",
        "width:100%",
        "box-sizing:border-box",
        "border:0",
        "padding:5px 8px",
        "margin:0",
        "background:rgba(11,22,32,0.94)",
        "color:#d7f7ff",
        "font:11px/1.25 monospace",
        "text-align:left",
        "cursor:move"
      ].join(";");
      content.style.cssText = [
        "display:none",
        "width:min(720px,calc(100vw - 16px))",
        "max-height:min(420px,70vh)",
        "height:min(420px,70vh)",
        "overflow:auto",
        "margin:0",
        "padding:8px 10px",
        "border:0",
        "box-sizing:border-box",
        "background:rgba(0,0,0,0.34)",
        "color:#d7f7ff",
        "white-space:pre-wrap",
        "font:11px/1.25 monospace",
        "resize:both",
        "user-select:text"
      ].join(";");
      toolbar.style.cssText = [
        "display:none",
        "padding:6px 8px",
        "border-top:1px solid rgba(255,255,255,0.16)",
        "background:rgba(0,0,0,0.48)"
      ].join(";");
      copyButton.type = "button";
      copyButton.textContent = "Copy";
      copyButton.style.cssText = [
        "border:1px solid rgba(255,255,255,0.28)",
        "background:rgba(255,255,255,0.08)",
        "color:#d7f7ff",
        "font:11px/1.25 monospace",
        "padding:4px 8px",
        "cursor:pointer"
      ].join(";");
      header.textContent = "water debug: waiting";
      content.readOnly = true;
      content.spellcheck = false;
      content.value = latestDebugText;
      toolbar.appendChild(copyButton);
      overlay.appendChild(header);
      overlay.appendChild(toolbar);
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      function setExpanded(value) {
        expanded = !!value;
        if (expanded) {
          latestDebugText = formatDebugText(readDiagnostics());
          content.value = latestDebugText;
        }
        toolbar.style.display = expanded ? "block" : "none";
        content.style.display = expanded ? "block" : "none";
      }

      function readDiagnostics() {
        return typeof window.openmwGraphicsDiagnostics === "function"
          ? window.openmwGraphicsDiagnostics()
          : null;
      }

      function formatDebugText(diagnostics) {
        var water = diagnostics && diagnostics.shaderWater;
        var waterState = diagnostics && diagnostics.waterState;
        var classicWaterShaders = diagnostics && diagnostics.classicWaterShaders;
        var warnings = diagnostics && diagnostics.warnings ? diagnostics.warnings.slice(-3) : [];
        return [
          "water debug build " + buildVersion,
          "shaderWater: " + (water ? JSON.stringify(water, null, 2) : "not initialized"),
          "waterState: " + (waterState ? JSON.stringify(waterState, null, 2) : "not initialized"),
          "classicWaterShaders: " + (classicWaterShaders ? JSON.stringify(classicWaterShaders, null, 2) : "not initialized"),
          "renderer: " + (diagnostics && diagnostics.renderer ? diagnostics.renderer : "unknown"),
          "warnings: " + (warnings.length ? warnings.map(function(warning) {
            var detail = warning.detail ? String(warning.detail).slice(0, 260).replace(/\s+/g, " ") : "";
            return warning.kind + ": " + warning.message + (detail ? " [" + detail + "]" : "");
          }).join(" | ") : "none")
        ].join("\n");
      }

      function copyDebugText() {
        latestDebugText = formatDebugText(readDiagnostics());
        content.value = latestDebugText;
        content.focus();
        content.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(latestDebugText).then(function() {
            copyButton.textContent = "Copied";
            setTimeout(function() { copyButton.textContent = "Copy"; }, 900);
          }).catch(function() {
            document.execCommand("copy");
          });
        } else {
          document.execCommand("copy");
        }
      }

      copyButton.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
        copyDebugText();
      });

      header.addEventListener("click", function(event) {
        if (dragging) return;
        event.preventDefault();
        setExpanded(!expanded);
      });

      header.addEventListener("pointerdown", function(event) {
        dragging = false;
        dragOffsetX = event.clientX - overlay.offsetLeft;
        dragOffsetY = event.clientY - overlay.offsetTop;
        header.setPointerCapture(event.pointerId);
      });

      header.addEventListener("pointermove", function(event) {
        if (!(event.buttons & 1)) return;
        dragging = true;
        var maxLeft = Math.max(0, window.innerWidth - overlay.offsetWidth - 4);
        var maxTop = Math.max(0, window.innerHeight - overlay.offsetHeight - 4);
        overlay.style.left = Math.min(Math.max(0, event.clientX - dragOffsetX), maxLeft) + "px";
        overlay.style.top = Math.min(Math.max(0, event.clientY - dragOffsetY), maxTop) + "px";
      });

      header.addEventListener("pointerup", function(event) {
        header.releasePointerCapture(event.pointerId);
        setTimeout(function() {
          dragging = false;
        }, 0);
      });

      function update() {
        var diagnostics = readDiagnostics();
        var water = diagnostics && diagnostics.shaderWater;
        header.textContent = "water debug " + buildVersion + " | " +
          (water ? "uv " + water.waterUvPrograms + "/" + water.waterUvForcedStateDraws : "waiting") +
          " | click";
        if (expanded && document.activeElement !== content) {
          latestDebugText = formatDebugText(diagnostics);
          content.value = latestDebugText;
        }
      }

      update();
      window.setInterval(update, 1000);
    }

    var persistentHomePath = "/home/web_user";
    var bundledOpenMwSave = {
      assetPath: versionedStaticFile("assets/saves/Ascadian_Veteran_Start.omwsave"),
      saveDir: "/home/web_user/.local/share/openmw/saves/Veloth",
      savePath: "/home/web_user/.local/share/openmw/saves/Veloth/Ascadian_Veteran_Start.omwsave"
    };
    var deprecatedBundledOpenMwSaves = [
      {
        path: "/home/web_user/.local/share/openmw/saves/player/Korze_Safe_Start.omwsave",
        label: "old bundled starter save"
      },
      {
        path: "/home/web_user/.local/share/openmw/saves/Veloth/Ascadian_Veteran.omwsave",
        label: "old bundled starter save"
      },
      {
        path: "/home/web_user/.local/share/openmw/saves/Veloth/Veloth_Ascadian_Veteran.omwsave",
        label: "old bundled starter save"
      }
    ];
    var persistenceMounted = false;
    var persistenceSyncInProgress = false;
    var persistenceSyncQueued = false;
    var persistenceSyncTimer = 0;
    var persistenceDirty = false;
    var saveToastTimer = 0;
    var fullscreenKeyboardLocked = false;
    var runtimeStarted = false;
    var runtimeInitializedAt = 0;
    var runtimeStartPromise = null;
    var homepageMusicPath = "assets/audio/morrowind-menu-theme.mp3";
    var homepageMusicVolume = 0.16;
    var homepageMusicElement = null;
    var homepageMusicFadeTimer = 0;
    var homepageAudioContext = null;
    var homepageAudioUnlocked = false;
    var homepageLastSfxAt = {};
    var runtimeAudioResumeBurstTimer = 0;
    var runtimeAudioResumeBurstUntil = 0;
    var runtimeAudioPrimeContext = null;
    var homepageDecorReady = false;
    var homepageDeferredAssetsRequested = false;
    var shellControlsEnabled = false;
    var returningToMainMenu = false;
    var homepageRuntimeLaunchPending = false;
    var startupModeForRun = "menu";
    var mainMenuActionsAllowed = false;
    var maxOutputLogLength = 65536;
    var outputLogText = "";
    var pendingOutputLogText = "";
    var outputLogFlushTimer = 0;
    var suppressedOutputLogLines = 0;
    var loadingOverlayActive = false;
    var loadingOverlayHideTimer = 0;
    var loadingOverlayHardTimer = 0;
    var loadingOverlayStartedAt = 0;
    var loadingOverlaySticky = false;
    var loadingSplashIndex = -1;
    var loadingSplashPreloadStarted = false;
    var loadingSplashPreloadTimer = 0;
    var loadingSplashPreloadImages = [];
    var loadingFrameCounter = 0;
    var loadingLastFrameAt = 0;
    var tes3mpFirstFrameProbeTimer = 0;
    var tes3mpFirstFrameRecoveryTimer = 0;
    var tes3mpFirstFrameProbeStartedAt = 0;
    var tes3mpFirstFrameReady = false;
    var tes3mpLoadedSentAt = 0;
    var tes3mpWorldReadyAt = 0;
    var tes3mpGameplayReadyAt = 0;
    var tes3mpGameplayFallbackHideTimer = 0;
    var potentialLoadingUntil = 0;
    var potentialLoadingArmedAt = 0;
    var potentialLoadingArmedFrame = 0;
    var potentialLoadingReason = "";
    var potentialLoadingTimer = 0;
    var loadingSplashImages = [
      "assets/splash/Splash_Bonelord.jpg",
      "assets/splash/Splash_ClannDaddy.jpg",
      "assets/splash/Splash_Clannfear.jpg",
      "assets/splash/Splash_Daedroth.jpg",
      "assets/splash/Splash_Hunger.jpg",
      "assets/splash/Splash_KwamaWarrior.jpg",
      "assets/splash/Splash_Netch.jpg",
      "assets/splash/Splash_NixHound.jpg",
      "assets/splash/Splash_Siltstriker.jpg",
      "assets/splash/Splash_Skeleton.jpg",
      "assets/splash/Splash_SphereCenturion.jpg"
    ];
