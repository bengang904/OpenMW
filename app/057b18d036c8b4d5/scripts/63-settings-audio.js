    function getCanvasViewportSize() {
      return getCappedCanvasViewportSize();
    }

    function upsertOpenMwSetting(text, section, key, value) {
      var lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
      var sectionPattern = new RegExp("^\\s*\\[" + section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\]\\s*$", "i");
      var keyPattern = new RegExp("^\\s*" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*=", "i");
      var sectionStart = -1;
      var sectionEnd = lines.length;

      for (var i = 0; i < lines.length; i++) {
        if (sectionPattern.test(lines[i])) {
          sectionStart = i;
          for (var j = i + 1; j < lines.length; j++) {
            if (/^\s*\[[^\]]+\]\s*$/.test(lines[j])) {
              sectionEnd = j;
              break;
            }
          }
          break;
        }
      }

      if (sectionStart === -1) {
        if (lines.length && lines[lines.length - 1].trim() !== "") lines.push("");
        lines.push("[" + section + "]");
        lines.push(key + " = " + value);
        return lines.join("\n");
      }

      for (var lineIndex = sectionStart + 1; lineIndex < sectionEnd; lineIndex++) {
        if (keyPattern.test(lines[lineIndex])) {
          lines[lineIndex] = key + " = " + value;
          return lines.join("\n");
        }
      }

      lines.splice(sectionEnd, 0, key + " = " + value);
      return lines.join("\n");
    }

    function getDefaultBrowserSettings() {
      return [
        "[General]",
        "anisotropy = " + browserTerrainProfile.anisotropy,
        "preferred locales = en",
        "gmst overrides l10n = false",
        "texture mag filter = linear",
        "texture min filter = linear",
        "texture mipmap = " + browserTerrainProfile.textureMipmap,
        "",
        "[Camera]",
        "near clip = 1.0",
        "small feature culling = false",
        "small feature culling pixel size = 2.0",
        "viewing distance = " + browserTerrainProfile.viewingDistance,
        "reverse z = false",
        "",
        "[Terrain]",
        "distant terrain = " + browserTerrainProfile.distantTerrain,
        "lod factor = " + browserTerrainProfile.lodFactor,
        "vertex lod mod = " + browserTerrainProfile.vertexLodMod,
        "composite map level = " + browserTerrainProfile.compositeMapLevel,
        "composite map resolution = " + browserTerrainProfile.compositeMapResolution,
        "max composite geometry size = 4.0",
        "object paging = false",
        "object paging active grid = false",
        "object paging min size = 0.02",
        "water culling = false",
        "",
        "[Fog]",
        "use distant fog = true",
        "distant land fog start = " + browserTerrainProfile.fogStart,
        "distant land fog end = " + browserTerrainProfile.fogEnd,
        "radial fog = false",
        "exponential fog = false",
        "sky blending = true",
        "sky blending start = 0.75",
        "",
        "[Models]",
        "skyclouds = meshes/sky_clouds_01.nif",
        "",
        "[Shaders]",
        "force shaders = false",
        "force per pixel lighting = false",
        "clamp lighting = true",
        "auto use object normal maps = false",
        "auto use object specular maps = false",
        "auto use terrain normal maps = false",
        "auto use terrain specular maps = false",
        "apply lighting to environment maps = false",
        "lighting method = shaders compatibility",
        "classic falloff = false",
        "match sunlight to sun = false",
        "maximum light distance = 4096",
        "max lights = 2",
        "minimum interior brightness = 0.18",
        "antialias alpha test = false",
        "adjust coverage for alpha test = false",
        "soft particles = false",
        "weather particle occlusion = false",
        "",
        "[Video]",
        "framerate limit = 30",
        "antialiasing = 0",
        "contrast = 1.0",
        "gamma = 1.0",
        "",
        "[Post Processing]",
        "enabled = false",
        "transparent postpass = false",
        "",
        "[Saves]",
        "autosave = true",
        "max quicksaves = 1",
        "",
        "[Water]",
        "shader = false",
        "rtt size = 256",
        "refraction = false",
        "reflection detail = 0",
        "rain ripple detail = 0",
        "sunlight scattering = false",
        "wobbly shores = false",
        "",
        "[Shadows]",
        "enable shadows = false",
        "",
        "[Cells]",
        "preload enabled = true",
        "",
        "[Physics]",
        "async num threads = 0",
        "",
        "[Navigator]",
        "enable = true",
        "enable nav mesh disk cache = false",
        "write to navmeshdb = false",
        "min update interval ms = 250",
        "wait until min distance to player = 1",
        "",
        "[Lua]",
        "lua num threads = 0",
        ""
      ].join("\n");
    }

    function applyBrowserRendererSettings(text, size) {
      var forceShaderPipeline = false;
      var guiScale = formatBrowserGuiScale(getBrowserGuiScaleForRenderSize(size));
      text = upsertOpenMwSetting(text, "General", "anisotropy", browserTerrainProfile.anisotropy);
      text = upsertOpenMwSetting(text, "General", "preferred locales", "en");
      text = upsertOpenMwSetting(text, "General", "gmst overrides l10n", false);
      text = upsertOpenMwSetting(text, "General", "texture mag filter", "linear");
      text = upsertOpenMwSetting(text, "General", "texture min filter", "linear");
      text = upsertOpenMwSetting(text, "General", "texture mipmap", browserTerrainProfile.textureMipmap);
      text = upsertOpenMwSetting(text, "Camera", "near clip", 1.0);
      text = upsertOpenMwSetting(text, "Camera", "small feature culling", false);
      text = upsertOpenMwSetting(text, "Camera", "small feature culling pixel size", 2.0);
      text = upsertOpenMwSetting(text, "Camera", "viewing distance", browserTerrainProfile.viewingDistance);
      text = upsertOpenMwSetting(text, "Camera", "reverse z", false);
      text = upsertOpenMwSetting(text, "Terrain", "distant terrain", browserTerrainProfile.distantTerrain);
      text = upsertOpenMwSetting(text, "Terrain", "lod factor", browserTerrainProfile.lodFactor);
      text = upsertOpenMwSetting(text, "Terrain", "vertex lod mod", browserTerrainProfile.vertexLodMod);
      text = upsertOpenMwSetting(text, "Terrain", "composite map level", browserTerrainProfile.compositeMapLevel);
      text = upsertOpenMwSetting(text, "Terrain", "composite map resolution", browserTerrainProfile.compositeMapResolution);
      text = upsertOpenMwSetting(text, "Terrain", "max composite geometry size", 4.0);
      text = upsertOpenMwSetting(text, "Terrain", "object paging", false);
      text = upsertOpenMwSetting(text, "Terrain", "object paging active grid", false);
      text = upsertOpenMwSetting(text, "Terrain", "object paging min size", 0.02);
      text = upsertOpenMwSetting(text, "Terrain", "water culling", false);
      text = upsertOpenMwSetting(text, "Fog", "use distant fog", true);
      text = upsertOpenMwSetting(text, "Fog", "distant land fog start", browserTerrainProfile.fogStart);
      text = upsertOpenMwSetting(text, "Fog", "distant land fog end", browserTerrainProfile.fogEnd);
      text = upsertOpenMwSetting(text, "Fog", "radial fog", false);
      text = upsertOpenMwSetting(text, "Fog", "exponential fog", false);
      text = upsertOpenMwSetting(text, "Fog", "sky blending", true);
      text = upsertOpenMwSetting(text, "Fog", "sky blending start", 0.75);
      text = upsertOpenMwSetting(text, "Models", "skyclouds", "meshes/sky_clouds_01.nif");
      text = upsertOpenMwSetting(text, "Shaders", "force shaders", forceShaderPipeline);
      text = upsertOpenMwSetting(text, "Shaders", "force per pixel lighting", false);
      text = upsertOpenMwSetting(text, "Shaders", "clamp lighting", true);
      text = upsertOpenMwSetting(text, "Shaders", "auto use object normal maps", false);
      text = upsertOpenMwSetting(text, "Shaders", "auto use object specular maps", false);
      text = upsertOpenMwSetting(text, "Shaders", "auto use terrain normal maps", false);
      text = upsertOpenMwSetting(text, "Shaders", "auto use terrain specular maps", false);
      text = upsertOpenMwSetting(text, "Shaders", "apply lighting to environment maps", false);
      text = upsertOpenMwSetting(text, "Shaders", "lighting method", "shaders compatibility");
      text = upsertOpenMwSetting(text, "Shaders", "classic falloff", false);
      text = upsertOpenMwSetting(text, "Shaders", "match sunlight to sun", false);
      text = upsertOpenMwSetting(text, "Shaders", "maximum light distance", 4096);
      text = upsertOpenMwSetting(text, "Shaders", "max lights", 2);
      text = upsertOpenMwSetting(text, "Shaders", "minimum interior brightness", 0.18);
      text = upsertOpenMwSetting(text, "Shaders", "antialias alpha test", false);
      text = upsertOpenMwSetting(text, "Shaders", "adjust coverage for alpha test", false);
      text = upsertOpenMwSetting(text, "Shaders", "soft particles", false);
      text = upsertOpenMwSetting(text, "Shaders", "weather particle occlusion", false);
      text = upsertOpenMwSetting(text, "Video", "resolution x", size.width);
      text = upsertOpenMwSetting(text, "Video", "resolution y", size.height);
      text = upsertOpenMwSetting(text, "Video", "window mode", 2);
      text = upsertOpenMwSetting(text, "Video", "framerate limit", 30);
      text = upsertOpenMwSetting(text, "Video", "antialiasing", 0);
      text = upsertOpenMwSetting(text, "Video", "vsync mode", 0);
      text = upsertOpenMwSetting(text, "Video", "contrast", 1.0);
      text = upsertOpenMwSetting(text, "Video", "gamma", 1.0);
      text = upsertOpenMwSetting(text, "GUI", "scaling factor", guiScale);
      text = upsertOpenMwSetting(text, "Post Processing", "enabled", false);
      text = upsertOpenMwSetting(text, "Post Processing", "transparent postpass", false);
      text = upsertOpenMwSetting(text, "Saves", "autosave", true);
      text = upsertOpenMwSetting(text, "Saves", "max quicksaves", 1);
      text = upsertOpenMwSetting(text, "Water", "shader", false);
      text = upsertOpenMwSetting(text, "Water", "rtt size", 256);
      text = upsertOpenMwSetting(text, "Water", "refraction", false);
      text = upsertOpenMwSetting(text, "Water", "reflection detail", 0);
      text = upsertOpenMwSetting(text, "Water", "rain ripple detail", 0);
      text = upsertOpenMwSetting(text, "Water", "sunlight scattering", false);
      text = upsertOpenMwSetting(text, "Water", "wobbly shores", false);
      text = upsertOpenMwSetting(text, "Shadows", "enable shadows", false);
      text = upsertOpenMwSetting(text, "Cells", "preload enabled", isBrowserModEnabled("cell-preload"));
      text = upsertOpenMwSetting(text, "Physics", "async num threads", 0);
      text = upsertOpenMwSetting(text, "Navigator", "enable", true);
      text = upsertOpenMwSetting(text, "Navigator", "enable nav mesh disk cache", false);
      text = upsertOpenMwSetting(text, "Navigator", "write to navmeshdb", false);
      text = upsertOpenMwSetting(text, "Navigator", "min update interval ms", 250);
      text = upsertOpenMwSetting(text, "Navigator", "wait until min distance to player", 1);
      text = upsertOpenMwSetting(text, "Lua", "lua num threads", 0);
      return text;
    }

    function readOpenMwSettingValue(text, section, key) {
      var lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
      var sectionPattern = new RegExp("^\\s*\\[" + section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\]\\s*$", "i");
      var keyPattern = new RegExp("^\\s*" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*=\\s*(.*?)\\s*$", "i");
      var inSection = false;

      for (var i = 0; i < lines.length; i++) {
        if (/^\s*\[[^\]]+\]\s*$/.test(lines[i])) {
          inSection = sectionPattern.test(lines[i]);
          continue;
        }
        if (!inSection) continue;
        var match = lines[i].match(keyPattern);
        if (match) return match[1];
      }

      return null;
    }

    function ensureOpenMwSettingMinimum(text, section, key, minimum, fallback) {
      var value = readOpenMwSettingValue(text, section, key);
      var number = value == null ? NaN : Number(value);
      if (!Number.isFinite(number) || number < minimum) {
        return upsertOpenMwSetting(text, section, key, fallback);
      }
      return text;
    }

    function applyTes3mpBrowserAudioSettings(text) {
      text = ensureOpenMwSettingMinimum(text, "Sound", "master volume", 0.5, 1.0);
      text = ensureOpenMwSettingMinimum(text, "Sound", "sfx volume", 0.5, 1.0);
      text = ensureOpenMwSettingMinimum(text, "Sound", "music volume", 0.25, 0.55);
      text = ensureOpenMwSettingMinimum(text, "Sound", "voice volume", 0.5, 1.0);
      text = ensureOpenMwSettingMinimum(text, "Sound", "footsteps volume", 0.35, 0.8);
      return text;
    }

    function writeBrowserVideoSettings() {
      var settingsPath = "/home/web_user/.config/openmw/settings.cfg";
      var size = getCanvasViewportSize();
      var text = getDefaultBrowserSettings();

      try {
        text = FS.readFile(settingsPath, { encoding: "utf8" });
      } catch (error) {
      }

      text = applyBrowserRendererSettings(text, size);
      if (Module.__runtimeKind === "tes3mp") {
        text = applyTes3mpBrowserAudioSettings(text);
        Module.__tes3mpAudioSettings = {
          master: readOpenMwSettingValue(text, "Sound", "master volume"),
          sfx: readOpenMwSettingValue(text, "Sound", "sfx volume"),
          music: readOpenMwSettingValue(text, "Sound", "music volume"),
          voice: readOpenMwSettingValue(text, "Sound", "voice volume"),
          footsteps: readOpenMwSettingValue(text, "Sound", "footsteps volume")
        };
      }

      FS.writeFile(settingsPath, text);
      persistenceDirty = true;
      Module.print("Browser render resolution: " + size.width + "x" + size.height + " (" + getBrowserRenderProfileLabel() + ")");
      Module.print("Browser UI scale: " + formatBrowserGuiScale(getBrowserGuiScaleForRenderSize(size)) + "x (720p baseline)");
      Module.print("Browser graphics profile: " + browserGraphicsProfile);
      Module.print("Browser terrain profile: " + browserTerrainProfile.label + " (composite " + browserTerrainProfile.compositeMapResolution + ", anisotropy " + browserTerrainProfile.anisotropy + ")");
      if (Module.__runtimeKind === "tes3mp" && Module.__tes3mpAudioSettings) {
        Module.print(
          "TES3MP audio settings: master " + Module.__tes3mpAudioSettings.master +
          ", sfx " + Module.__tes3mpAudioSettings.sfx +
          ", music " + Module.__tes3mpAudioSettings.music +
          ", voice " + Module.__tes3mpAudioSettings.voice +
          ", footsteps " + Module.__tes3mpAudioSettings.footsteps
        );
      }
    }

    function deleteOpenMwFileIfPresent(path) {
      try {
        if (FS.analyzePath(path).exists) FS.unlink(path);
      } catch (error) {
        Module.printErr("Could not delete " + path + ": " + error);
      }
    }

    function deleteMenuButtonTextureOverrides() {
      deleteOpenMwFileIfPresent("/home/web_user/data/textures/menu_credits.dds");
      deleteOpenMwFileIfPresent("/home/web_user/data/textures/menu_credits_over.dds");
      deleteOpenMwFileIfPresent("/home/web_user/data/textures/menu_credits_pressed.dds");
    }

    function resetPersistentRendererSettings() {
      deleteOpenMwFileIfPresent("/home/web_user/.config/openmw/openmw.cfg");
      deleteOpenMwFileIfPresent("/home/web_user/.config/openmw/settings.cfg");
      deleteOpenMwFileIfPresent("/home/web_user/.config/openmw/shaders.yaml");
      persistenceDirty = true;
      Module.print("Browser renderer settings reset.");
    }

    function finishPersistentUserHomeSetup(done, options) {
      options = options || {};
      if (options.resetSettings && resetSettingsRequested) resetPersistentRendererSettings();
      writeBrowserVideoSettings();
      deleteMenuButtonTextureOverrides();
      seedTes3mpClientConfig();
      writeBrowserMechanicsL10nOverride();
      writeBrowserInputBindings();
      logTes3mpRuntimeDiagnostics();
      (Module.__runtimeKind === "tes3mp" ? Promise.resolve(false) : seedBundledOpenMwSave()).then(function() {
        if (Module.__runtimeKind === "tes3mp") return false;
        configureStartupMode();
        return waitForEnabledOpenMwModPackages();
      }).then(function() {
        if (Module.__runtimeKind !== "tes3mp") applyEnabledOpenMwModArguments();
        if (options.readyMessage) Module.print(options.readyMessage);
        if (options.requestStorage) requestPersistentBrowserStorage();
        if (Module.__runtimeKind === "tes3mp") return false;
        return syncPersistentUserFiles("startup");
      }).then(function() {
        done();
      }, function() {
        done();
      });
    }

    function setupPersistentUserHome(done) {
      ensureDirectory("/home");
      ensureDirectory("/home/web_user");

      if (!("indexedDB" in window) || typeof IDBFS === "undefined" || typeof FS.syncfs !== "function") {
        if (Module.__runtimeKind === "tes3mp") {
          Module.print("Persistent browser saves unavailable; continuing multiplayer without browser save sync.");
        } else {
          Module.printErr("Persistent browser saves unavailable; IndexedDB/IDBFS is missing.");
        }
        ensureOpenMwUserDirs();
        finishPersistentUserHomeSetup(done);
        return;
      }

      try {
        FS.mount(IDBFS, { autoPersist: true }, persistentHomePath);
        persistenceMounted = true;
      } catch (error) {
        Module.printErr("Persistent browser save mount failed: " + error);
        ensureOpenMwUserDirs();
        finishPersistentUserHomeSetup(done);
        return;
      }

      Module.print("Loading browser save storage...");
      FS.syncfs(true, function(error) {
        if (error) {
          Module.printErr("Browser save storage load failed: " + error);
        }
        ensureOpenMwUserDirs();
        finishPersistentUserHomeSetup(done, {
          resetSettings: true,
          readyMessage: "Browser save storage ready.",
          requestStorage: true
        });
      });
    }

    var Module = {
      arguments: [],
      canvas: canvasElement,
      noExitRuntime: true,
      locateFile: function(path) {
        return versionedRuntimeFile(path);
      },
      print: function() {
        var text = Array.prototype.slice.call(arguments).join(" ");
        writeRuntimeLog(text, false);
      },
      printErr: function() {
        var text = Array.prototype.slice.call(arguments).join(" ");
        if (/^WARNING: unhandled clientstate: (33879|33886)$/.test(text)) return;
        writeRuntimeLog(text, true);
      },
      onExit: function() {
        if (!runtimeStarted) return;
        if (startupModeForRun === "menu" && runtimeInitializedAt && Date.now() - runtimeInitializedAt < 15000) {
          Module.printErr("Ignored early runtime exit while menu was initializing.");
          return;
        }
        Module.setStatus("Runtime exited. Reload the page to return to the main menu.");
      },
      preRun: [function() {
        if (Module.__runtimeKind === "tes3mp") {
          try {
            if (typeof ENV !== "undefined") {
              ENV.SDL_AUDIODRIVER = "emscripten";
              ENV.ALSOFT_DRIVERS = "emscripten";
            }
          } catch (error) {
          }
        }
        var dependency = "openmw-persistent-user-home";
        Module.addRunDependency(dependency);
        setupPersistentUserHome(function() {
          Module.removeRunDependency(dependency);
        });
      }],
      setStatus: function(text) {
        text = text || "";
        if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: null };
        if (topbarElement) topbarElement.hidden = !text;
        if (shellElement) shellElement.setAttribute("data-status-active", text ? "true" : "false");
        if (text === Module.setStatus.last.text) return;
        var match = text.match(/([^(]+)\((\d+(?:\.\d+)?)\/(\d+)\)/);
        var now = Date.now();
        if (match && now - Module.setStatus.last.time < 30) return;
        Module.setStatus.last.time = now;
        Module.setStatus.last.text = text;
        if (match) {
          var loaded = Number(match[2]);
          var total = Number(match[3]);
          var percent = total > 0 ? Math.floor((loaded / total) * 100) : 0;
          statusElement.textContent = match[1].trim() + " " + percent + "% (" +
            formatDataBytes(loaded) + " / " + formatDataBytes(total) + ")";
          progressElement.hidden = false;
          progressElement.value = loaded;
          progressElement.max = total;
        } else {
          statusElement.textContent = text;
          progressElement.hidden = !text;
        }
        if (Module.__runtimeKind === "tes3mp" && text) {
          showMorrowindLoadingScreen(text, 300000, {
            category: "multiplayerStartup",
            signal: text,
            sticky: true
          });
        } else if (loadingOverlayActive && text) {
          loadingTextElement.textContent = text;
        }
      },
      totalDependencies: 0,
      onRuntimeInitialized: function() {
        runtimeStarted = true;
        runtimeInitializedAt = Date.now();
        Module.setStatus("");
        topbarElement.hidden = true;
        setSaveToolsEnabled(true);
        scheduleCanvasRenderCap("runtime-ready");
        schedulePersistentSync("runtime-ready", 500);
        updateMainMenuActions();
        if (Module.__runtimeKind === "tes3mp") {
          showMorrowindLoadingScreen("Connecting to multiplayer...", 300000, {
            category: "multiplayerStartup",
            signal: "runtime-initialized",
            sticky: true
          });
          scheduleTes3mpAudioResumeBurst("runtime-initialized", 60000);
          scheduleTes3mpFirstFrameRecovery("runtime-initialized", 180000);
        } else {
          scheduleMorrowindLoadingHide(0);
        }
        canvasElement.focus();
      },
      monitorRunDependencies: function(left) {
        this.totalDependencies = Math.max(this.totalDependencies, left);
        Module.setStatus(left ? "Preparing... (" + (this.totalDependencies - left) + "/" + this.totalDependencies + ")" : "Starting...");
      }
    };

    function formatDataBytes(value) {
      var units = ["B", "KiB", "MiB", "GiB"];
      var amount = Number(value) || 0;
      var unit = 0;
      while (amount >= 1024 && unit < units.length - 1) {
        amount /= 1024;
        unit++;
      }
      return amount.toFixed(unit === 0 ? 0 : 2) + " " + units[unit];
    }

    function resumeBrowserAudio() {
      var contexts = [];
      var seen = [];
      var al = typeof AL !== "undefined" ? AL : window.AL;

      function addContext(context) {
        if (!context || seen.indexOf(context) !== -1) return;
        seen.push(context);
        contexts.push(context);
      }

      if (Module.SDL2 && Module.SDL2.audioContext) addContext(Module.SDL2.audioContext);
      if (runtimeAudioPrimeContext) addContext(runtimeAudioPrimeContext);
      if (al) {
        if (al.currentCtx && al.currentCtx.audioCtx) addContext(al.currentCtx.audioCtx);
        Object.keys(al.contexts || {}).forEach(function(id) {
          if (al.contexts[id] && al.contexts[id].audioCtx) addContext(al.contexts[id].audioCtx);
        });
        if (al.sharedCaptureAudioCtx) addContext(al.sharedCaptureAudioCtx);
      }
      contexts.forEach(function(context) {
        if (context && /^(?:suspended|interrupted)$/.test(context.state || "") && typeof context.resume === "function") {
          context.resume().catch(function() {});
        }
      });
      if (Module.__runtimeKind === "tes3mp") {
        Module.__tes3mpAudioContexts = contexts.map(function(context) {
          return context && context.state ? context.state : "unknown";
        });
      }
    }

    function primeTes3mpBrowserAudio(reason) {
      if (Module.__runtimeKind !== "tes3mp") return;
      var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      try {
        if (!runtimeAudioPrimeContext) runtimeAudioPrimeContext = new AudioContextCtor();
        Module.__tes3mpAudioPrimeReason = reason || "prime";
        if (runtimeAudioPrimeContext.state !== "closed" && typeof runtimeAudioPrimeContext.resume === "function") {
          runtimeAudioPrimeContext.resume().catch(function() {});
        }
      } catch (error) {
        runtimeAudioPrimeContext = null;
      }
    }

    function scheduleTes3mpAudioResumeBurst(reason, durationMs) {
      if (Module.__runtimeKind !== "tes3mp") return;
      primeTes3mpBrowserAudio(reason);
      runtimeAudioResumeBurstUntil = Math.max(
        runtimeAudioResumeBurstUntil,
        Date.now() + (durationMs == null ? 10000 : durationMs)
      );
      Module.__tes3mpAudioResumeReason = reason || "resume";
      if (runtimeAudioResumeBurstTimer) return;

      function tick() {
        runtimeAudioResumeBurstTimer = 0;
        if (Module.__runtimeKind !== "tes3mp") return;
        resumeBrowserAudio();
        if (Date.now() < runtimeAudioResumeBurstUntil) {
          runtimeAudioResumeBurstTimer = setTimeout(tick, 250);
        }
      }

      tick();
    }

    ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "keydown", "touchstart", "touchend"].forEach(function(eventName) {
      document.addEventListener(eventName, function() {
        resumeBrowserAudio();
        scheduleTes3mpAudioResumeBurst("user-input", 15000);
      }, true);
    });

    var browserVideoSources = {
      "mw_intro.bik": "video/mw_intro.webm"
    };

    Module.openmwPlayBrowserVideo = function(name, allowSkipping) {
      var key = String(name || "").replace(/\\/g, "/").split("/").pop().toLowerCase();
      var source = browserVideoSources[key];
      if (!source) return;
      source = versionedStaticFile(source);
      var type = /\.webm(?:$|[?#])/.test(source) ? 'video/webm; codecs="vp8, vorbis"' : "";
      if (type && typeof browserVideoElement.canPlayType === "function" &&
          browserVideoElement.canPlayType(type) === "") {
        console.warn("Browser cannot decode " + source);
        return;
      }

      var closed = false;
      var videoWatchdog = 0;

      var closeVideo = function() {
        if (closed) return;
        closed = true;
        if (videoWatchdog) clearTimeout(videoWatchdog);
        browserVideoElement.pause();
        browserVideoElement.onloadeddata = null;
        browserVideoElement.oncanplay = null;
        browserVideoElement.onended = null;
        browserVideoElement.onerror = null;
        browserVideoElement.removeAttribute("src");
        browserVideoElement.load();
        videoOverlayElement.hidden = true;
        videoOverlayElement.onclick = null;
        document.removeEventListener("keydown", skipVideo, true);
        canvasElement.focus();
      };

      var skipVideo = function(event) {
        if (!allowSkipping) return;
        event.preventDefault();
        closeVideo();
      };

      var showVideo = function() {
        if (closed) return;
        videoOverlayElement.hidden = false;
      };

      browserVideoElement.onloadeddata = showVideo;
      browserVideoElement.oncanplay = showVideo;
      browserVideoElement.onended = closeVideo;
      browserVideoElement.onerror = closeVideo;
      browserVideoElement.src = source;
      if (allowSkipping) {
        videoOverlayElement.onclick = closeVideo;
        document.addEventListener("keydown", skipVideo, true);
      }

      videoWatchdog = setTimeout(function() {
        console.warn("Browser video decode stalled before first frame: " + source);
        closeVideo();
      }, 3500);

      browserVideoElement.play().catch(function(error) {
        console.warn("Browser video playback failed", error);
        closeVideo();
      });
    };
