    function showSaveToast(message) {
      saveToastElement.textContent = message;
      saveToastElement.hidden = false;
      clearTimeout(saveToastTimer);
      saveToastTimer = setTimeout(function() {
        saveToastElement.hidden = true;
      }, 3500);
    }

    function setSaveToolsEnabled(enabled) {
      shellControlsEnabled = !!enabled;
      if (shellElement) shellElement.setAttribute("data-shell-controls", shellControlsEnabled ? "true" : "false");
      var liveTes3mp = isTes3mpRuntimeActive();
      enforceShellUiLayerStacking();
      saveToolsElement.hidden = false;
      lobbyToolsElement.hidden = false;
      accountToolsElement.hidden = false;
      chatToolsElement.hidden = false;
      helpToolsElement.hidden = false;
      commandToggleButton.disabled = false;
      lobbyToggleButton.disabled = false;
      accountToggleButton.disabled = false;
      chatToggleButton.disabled = false;
      helpToggleButton.disabled = false;
      renderProfileButtons.concat([
        fullscreenToggleButton,
        syncSaveButton,
        exportSaveButton,
        importSaveButton,
        newDefaultButton,
        newBlankButton,
        lobbyCloseButton,
        lobbySessionSaveButton,
        lobbyRefreshButton,
        lobbyInstanceNameElement,
        lobbyInstanceDescriptionElement,
        lobbyInstanceMaxElement,
        lobbyInstancePasswordElement,
        lobbyRulesetElement,
        lobbyStartCellElement,
        lobbyPaceElement,
        lobbyTimeOfDayElement,
        lobbyWeatherElement,
        lobbyCombatElement,
        lobbyCreateButton,
        lobbyDirectTargetElement,
        lobbyDirectPasswordElement,
        lobbyDirectJoinButton,
        accountCloseButton,
        accountLoginButton,
        accountRegisterButton,
        accountLogoutButton,
        accountSaveProfileButton,
        accountChangePasswordButton,
        accountDownloadRecoveryButton,
        accountRecoverButton,
        accountUsernameElement,
        accountPasswordElement,
        accountRecoveryUsernameElement,
        accountRecoveryCodeElement,
        accountRecoveryPasswordElement,
        accountProfileNameElement,
        accountCurrentPasswordElement,
        accountNewPasswordElement,
        cloudSaveLabelElement,
        cloudSaveUploadButton,
        chatCloseButton,
        chatRoomElement,
        chatInputElement,
        chatSendButton,
        helpCloseButton,
        helpToggleButton,
        commandCloseButton,
        commandModApplyButton
      ]).forEach(function(button) {
        if (button) button.disabled = !enabled;
      });
      [
        syncSaveButton,
        exportSaveButton,
        importSaveButton,
        cloudSaveUploadButton,
      commandModApplyButton
      ].forEach(function(button) {
        if (button && liveTes3mp) button.disabled = true;
      });
      updateTouchControlsVisibility();
      updateCommandModList();
      renderAccountPanel();
    }

    function setMainMenuActionsVisible(visible) {
      mainMenuActionsElement.hidden = !visible;
    }

    function updateMainMenuActions() {
      setMainMenuActionsVisible(runtimeStarted && mainMenuActionsAllowed && !returningToMainMenu);
    }

    function canReloadAfterRuntimeExit() {
      try {
        var lastReload = Number(sessionStorage.getItem("openmw-last-exit-reload") || 0);
        if (lastReload && Date.now() - lastReload < 15000) return false;
        sessionStorage.setItem("openmw-last-exit-reload", String(Date.now()));
      } catch (error) {
      }
      return true;
    }

    function getFullscreenElement() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }

    function updateFullscreenButton() {
      var active = !!getFullscreenElement();
      if (!active) unlockFullscreenKeyboard();
      fullscreenToggleButton.textContent = active ? "Exit Full" : "Fullscreen";
      fullscreenToggleButton.title = active ? "Exit fullscreen" : "Enter fullscreen";
      updateCommandPanelState();
      scheduleCanvasRenderCap(active ? "fullscreen-enter" : "fullscreen-exit");
      setTimeout(function() {
        canvasElement.focus();
      }, 50);
    }

    function lockFullscreenKeyboard() {
      if (!navigator.keyboard || typeof navigator.keyboard.lock !== "function") {
        return Promise.resolve(false);
      }

      return navigator.keyboard.lock(["Escape"]).then(function() {
        fullscreenKeyboardLocked = true;
        return true;
      }).catch(function(error) {
        console.warn("Fullscreen keyboard lock failed", error);
        fullscreenKeyboardLocked = false;
        return false;
      });
    }

    function unlockFullscreenKeyboard() {
      if (!fullscreenKeyboardLocked) return;
      fullscreenKeyboardLocked = false;
      if (navigator.keyboard && typeof navigator.keyboard.unlock === "function") {
        navigator.keyboard.unlock();
      }
    }

    function requestGameFullscreen() {
      var request = shellElement.requestFullscreen || shellElement.webkitRequestFullscreen;
      if (!request) {
        showSaveToast("Fullscreen unavailable");
        return Promise.resolve(false);
      }
      try {
        var result = request.call(shellElement, { navigationUI: "hide" });
        return Promise.resolve(result).then(function() {
          return lockFullscreenKeyboard();
        }).then(function() {
          updateFullscreenButton();
          return true;
        }).catch(function(error) {
          console.warn("Fullscreen request failed", error);
          showSaveToast("Fullscreen blocked");
          return false;
        });
      } catch (error) {
        console.warn("Fullscreen request failed", error);
        showSaveToast("Fullscreen blocked");
        return Promise.resolve(false);
      }
    }

    function exitGameFullscreen() {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (!exit) return Promise.resolve(false);
      try {
        unlockFullscreenKeyboard();
        return Promise.resolve(exit.call(document)).then(function() {
          updateFullscreenButton();
          return true;
        }).catch(function(error) {
          console.warn("Fullscreen exit failed", error);
          return false;
        });
      } catch (error) {
        console.warn("Fullscreen exit failed", error);
        return Promise.resolve(false);
      }
    }

    function toggleGameFullscreen() {
      return getFullscreenElement() ? exitGameFullscreen() : requestGameFullscreen();
    }

    function pathExists(path) {
      try {
        return FS.analyzePath(path).exists;
      } catch (error) {
        return false;
      }
    }

    function ensureDirectory(path) {
      var current = "";
      path.split("/").filter(Boolean).forEach(function(part) {
        current += "/" + part;
        if (!pathExists(current)) {
          try {
            FS.mkdir(current);
          } catch (error) {
            if (!pathExists(current)) throw error;
          }
        }
      });
    }

    function modHasOpenMwArguments(mod) {
      return !!(
        mod &&
        ((mod.dataDirs && mod.dataDirs.length) ||
          (mod.contents && mod.contents.length) ||
          (mod.fallbackArchives && mod.fallbackArchives.length) ||
          (mod.groundcover && mod.groundcover.length))
      );
    }

    function getEnabledOpenMwArgumentMods() {
      return browserModCatalog.filter(function(mod) {
        return isBrowserModEnabled(mod.id) && modHasOpenMwArguments(mod);
      });
    }

    function getModuleModInstaller(mod) {
      var installers = Module.__openmwModPackageInstallers || {};
      return installers[mod.id] || null;
    }

    function getModuleModPromise(mod) {
      var promises = Module.__openmwModPackagePromises || {};
      return promises[mod.id] || null;
    }

    function waitForEnabledOpenMwModPackages() {
      var mods = getEnabledOpenMwArgumentMods();
      if (!mods.length) return Promise.resolve();

      return Promise.all(mods.map(function(mod) {
        if (mod.runtimeScript && browserModLoadState[mod.id] && browserModLoadState[mod.id].loaded === false) {
          return false;
        }

        var installer = getModuleModInstaller(mod);
        if (typeof installer === "function") {
          try {
            return Promise.resolve(installer()).then(function() {
              return true;
            }, function(error) {
              console.warn("OpenMW mod package install failed for " + mod.id, error);
              browserModLoadState[mod.id] = { loaded: false };
              return false;
            });
          } catch (error) {
            console.warn("OpenMW mod package installer failed for " + mod.id, error);
            browserModLoadState[mod.id] = { loaded: false };
            return false;
          }
        }

        var promise = getModuleModPromise(mod);
        if (promise) {
          return Promise.resolve(promise).then(function() {
            return true;
          }, function(error) {
            console.warn("OpenMW mod package promise failed for " + mod.id, error);
            browserModLoadState[mod.id] = { loaded: false };
            return false;
          });
        }

        return true;
      })).then(function() {});
    }

    function fileExistsInModDataDirs(mod, filename) {
      var dirs = mod.dataDirs || [];
      for (var i = 0; i < dirs.length; i++) {
        if (pathExists(dirs[i].replace(/\/+$/, "") + "/" + filename)) return true;
      }
      return false;
    }

    function validateOpenMwArgumentMod(mod) {
      if (mod.runtimeScript && browserModLoadState[mod.id] && browserModLoadState[mod.id].loaded === false) {
        Module.printErr("Skipping add-on " + mod.title + ": package script unavailable.");
        return false;
      }

      var installed = Module.__openmwModPackagesInstalled || {};
      if (mod.runtimeScript && modHasOpenMwArguments(mod) && !installed[mod.id]) {
        Module.printErr("Skipping add-on " + mod.title + ": package did not install.");
        return false;
      }

      var dataDirs = mod.dataDirs || [];
      for (var dataIndex = 0; dataIndex < dataDirs.length; dataIndex++) {
        if (!pathExists(dataDirs[dataIndex])) {
          Module.printErr("Skipping add-on " + mod.title + ": missing data directory " + dataDirs[dataIndex] + ".");
          return false;
        }
      }

      var requiredFiles = (mod.requiredFiles || [])
        .concat(mod.contents || [])
        .concat(mod.fallbackArchives || [])
        .concat(mod.groundcover || []);

      for (var i = 0; i < requiredFiles.length; i++) {
        if (!fileExistsInModDataDirs(mod, requiredFiles[i])) {
          Module.printErr("Skipping add-on " + mod.title + ": missing " + requiredFiles[i] + ".");
          return false;
        }
      }

      return true;
    }

    function pushOpenMwArgumentOnce(option, value, seen) {
      var key = option + "\n" + String(value).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      Module.arguments.push("--" + option + "=" + value);
    }

    function applyEnabledOpenMwModArguments() {
      var mods = getEnabledOpenMwArgumentMods();
      if (!mods.length) {
        Module.__openmwEnabledMods = [];
        return;
      }

      var seen = {};
      var enabled = [];
      mods.forEach(function(mod) {
        if (!validateOpenMwArgumentMod(mod)) {
          browserModLoadState[mod.id] = { loaded: false };
          return;
        }

        (mod.dataDirs || []).forEach(function(path) {
          if (pathExists(path)) pushOpenMwArgumentOnce("data", path, seen);
        });
        (mod.fallbackArchives || []).forEach(function(archive) {
          pushOpenMwArgumentOnce("fallback-archive", archive, seen);
        });
        (mod.contents || []).forEach(function(content) {
          pushOpenMwArgumentOnce("content", content, seen);
        });
        (mod.groundcover || []).forEach(function(content) {
          pushOpenMwArgumentOnce("groundcover", content, seen);
        });
        enabled.push(mod.id);
      });

      Module.__openmwEnabledMods = enabled;
      if (enabled.length) Module.print("OpenMW add-ons enabled: " + enabled.join(", "));
      updateCommandModList();
    }

    function ensureOpenMwUserDirs() {
      [
        "/home",
        "/home/web_user",
        "/home/web_user/data",
        "/home/web_user/.config",
        "/home/web_user/.config/openmw",
        "/home/web_user/.local",
        "/home/web_user/.local/share",
        "/home/web_user/.local/share/openmw",
        "/home/web_user/.local/share/openmw/data",
        "/home/web_user/.local/share/openmw/data/l10n",
        "/home/web_user/.local/share/openmw/data/l10n/Mechanics",
        "/home/web_user/.local/share/openmw/saves",
        "/home/web_user/.cache",
        "/home/web_user/.cache/openmw"
      ].forEach(ensureDirectory);
    }

    var browserMechanicsL10nVersion = "skillbook-gmst-bypass-v1";
    var browserMechanicsL10nEnYaml = [
      "# " + browserMechanicsL10nVersion,
      "SkillIncreasedTo: \"Your {skill} skill increased to {level}.\"",
      "SkillDecreasedTo: \"Your {skill} skill decreased to {level}.\"",
      "ReleasedFromPrison: \"Released from prison after {days} day(s).\"",
      ""
    ].join("\n");

    function writeBrowserMechanicsL10nOverride() {
      var path = "/home/web_user/.local/share/openmw/data/l10n/Mechanics/en.yaml";
      var existing = "";
      try {
        existing = FS.readFile(path, { encoding: "utf8" });
      } catch (error) {
      }
      if (existing.indexOf(browserMechanicsL10nVersion) !== -1) return;

      try {
        FS.writeFile(path, browserMechanicsL10nEnYaml);
        persistenceDirty = true;
        Module.print("Browser l10n override: Mechanics skill-book messages use local English strings.");
      } catch (error) {
        Module.printErr("Browser l10n override seed failed: " + error);
      }
    }

    var tes3mpDefaultClientConfig = [
      "[General]",
      "destinationAddress = localhost",
      "port = 25565",
      "password =",
      "logLevel = 0",
      "",
      "[Master]",
      "address = master.tes3mp.com",
      "port = 25561",
      "",
      "[Chat]",
      "keySay = Y",
      "keyChatMode = H",
      "x = 0",
      "y = 0",
      "w = 390",
      "h = 250",
      "delay = 5.0",
      ""
    ].join("\n");

    function seedTes3mpClientConfig() {
      if (Module.__runtimeKind !== "tes3mp") return;
      try {
        FS.writeFile("tes3mp-client-default.cfg", tes3mpDefaultClientConfig);
      } catch (error) {
        Module.printErr("TES3MP client config seed failed: " + error);
      }
    }

    var browserInputBindingsVersion = "mobile-movement-v2";

    function getMinimalBrowserInputBindingsXml() {
      return [
        "<?xml version='1.0' encoding='utf-8'?>",
        "<Controller>",
        "  <Control name=\"5\" autoChangeDirectionOnLimitsAfterStop=\"false\" autoReverseToInitialValue=\"true\" initialValue=\"0\" stepSize=\"MAX\" stepsPerSeconds=\"MAX\">",
        "    <KeyBinder key=\"4\" direction=\"INCREASE\" />",
        "    <Channel number=\"5\" direction=\"DIRECT\" percentage=\"1\" />",
        "  </Control>",
        "  <Control name=\"6\" autoChangeDirectionOnLimitsAfterStop=\"false\" autoReverseToInitialValue=\"true\" initialValue=\"0\" stepSize=\"MAX\" stepsPerSeconds=\"MAX\">",
        "    <KeyBinder key=\"7\" direction=\"INCREASE\" />",
        "    <Channel number=\"6\" direction=\"DIRECT\" percentage=\"1\" />",
        "  </Control>",
        "  <Control name=\"7\" autoChangeDirectionOnLimitsAfterStop=\"false\" autoReverseToInitialValue=\"true\" initialValue=\"0\" stepSize=\"MAX\" stepsPerSeconds=\"MAX\">",
        "    <KeyBinder key=\"26\" direction=\"INCREASE\" />",
        "    <Channel number=\"7\" direction=\"DIRECT\" percentage=\"1\" />",
        "  </Control>",
        "  <Control name=\"8\" autoChangeDirectionOnLimitsAfterStop=\"false\" autoReverseToInitialValue=\"true\" initialValue=\"0\" stepSize=\"MAX\" stepsPerSeconds=\"MAX\">",
        "    <KeyBinder key=\"22\" direction=\"INCREASE\" />",
        "    <Channel number=\"8\" direction=\"DIRECT\" percentage=\"1\" />",
        "  </Control>",
        "  <Control name=\"9\" autoChangeDirectionOnLimitsAfterStop=\"false\" autoReverseToInitialValue=\"true\" initialValue=\"0\" stepSize=\"MAX\" stepsPerSeconds=\"MAX\">",
        "    <KeyBinder key=\"8\" direction=\"INCREASE\" />",
        "    <Channel number=\"9\" direction=\"DIRECT\" percentage=\"1\" />",
        "  </Control>",
        "  <Control name=\"11\" autoChangeDirectionOnLimitsAfterStop=\"false\" autoReverseToInitialValue=\"true\" initialValue=\"0\" stepSize=\"MAX\" stepsPerSeconds=\"MAX\">",
        "    <KeyBinder key=\"44\" direction=\"INCREASE\" />",
        "    <Channel number=\"11\" direction=\"DIRECT\" percentage=\"1\" />",
        "  </Control>",
        "  <!-- " + browserInputBindingsVersion + " -->",
        "</Controller>",
        ""
      ].join("\n");
    }

    function browserInputBindingControl(doc, root, actionId) {
      var controls = root.getElementsByTagName("Control");
      for (var i = 0; i < controls.length; i++) {
        if (controls[i].getAttribute("name") === String(actionId)) return controls[i];
      }
      var control = doc.createElement("Control");
      control.setAttribute("name", String(actionId));
      root.appendChild(control);
      return control;
    }

    function setBrowserInputBinding(doc, root, actionId, keyCode) {
      var control = browserInputBindingControl(doc, root, actionId);
      control.setAttribute("autoChangeDirectionOnLimitsAfterStop", control.getAttribute("autoChangeDirectionOnLimitsAfterStop") || "false");
      control.setAttribute("autoReverseToInitialValue", control.getAttribute("autoReverseToInitialValue") || "true");
      control.setAttribute("initialValue", control.getAttribute("initialValue") || "0");
      control.setAttribute("stepSize", control.getAttribute("stepSize") || "MAX");
      control.setAttribute("stepsPerSeconds", control.getAttribute("stepsPerSeconds") || "MAX");

      Array.prototype.slice.call(control.getElementsByTagName("KeyBinder")).forEach(function(node) {
        if ((node.getAttribute("direction") || "INCREASE") === "INCREASE") control.removeChild(node);
      });

      var key = doc.createElement("KeyBinder");
      key.setAttribute("key", String(keyCode));
      key.setAttribute("direction", "INCREASE");
      control.insertBefore(key, control.firstChild);

      var channels = Array.prototype.slice.call(control.getElementsByTagName("Channel"));
      var channel = null;
      channels.forEach(function(node) {
        if (node.getAttribute("number") === String(actionId)) channel = node;
      });
      if (!channel) {
        channel = doc.createElement("Channel");
        control.appendChild(channel);
      }
      channel.setAttribute("number", String(actionId));
      channel.setAttribute("direction", "DIRECT");
      channel.setAttribute("percentage", "1");
    }

    function updateBrowserInputBindingsXml(text) {
      if (!window.DOMParser || !window.XMLSerializer) return getMinimalBrowserInputBindingsXml();
      var doc = new DOMParser().parseFromString(text || getMinimalBrowserInputBindingsXml(), "application/xml");
      if (doc.getElementsByTagName("parsererror").length || !doc.documentElement || doc.documentElement.nodeName !== "Controller") {
        doc = new DOMParser().parseFromString(getMinimalBrowserInputBindingsXml(), "application/xml");
      }
      var root = doc.documentElement;
      setBrowserInputBinding(doc, root, 5, 4);
      setBrowserInputBinding(doc, root, 6, 7);
      setBrowserInputBinding(doc, root, 7, 26);
      setBrowserInputBinding(doc, root, 8, 22);
      setBrowserInputBinding(doc, root, 9, 8);
      setBrowserInputBinding(doc, root, 11, 44);
      var xml = new XMLSerializer().serializeToString(doc);
      if (xml.indexOf(browserInputBindingsVersion) === -1) {
        xml += "\n<!-- " + browserInputBindingsVersion + " -->";
      }
      return "<?xml version='1.0' encoding='utf-8'?>\n" + xml.replace(/^<\?xml[^>]*>\s*/i, "") + "\n";
    }

    function writeBrowserInputBindings() {
      var path = "/home/web_user/.config/openmw/input_v3.xml";
      var text = "";
      try {
        text = FS.readFile(path, { encoding: "utf8" });
      } catch (error) {
      }
      try {
        FS.writeFile(path, updateBrowserInputBindingsXml(text));
        persistenceDirty = true;
        Module.print("Browser controls: touch movement uses WASD; Space jumps, E activates.");
      } catch (error) {
        Module.printErr("Browser control binding seed failed: " + error);
      }
    }

    function logTes3mpRuntimeDiagnostics() {
      if (Module.__runtimeKind !== "tes3mp") return;
      var safeArguments = (Module.arguments || []).map(function(argument) {
        return String(argument).replace(/^--password=.*/i, "--password=<redacted>");
      });
      Module.print("TES3MP launch arguments: " + JSON.stringify(safeArguments));
    }

    var tes3mpRequiredBrowserAssets = [
      "/openmw.cfg",
      "/resources/mygui/openmw.png",
      "/resources/mygui/openmw_chargen_race.layout",
      "/resources/vfs/textures/omw_menu_icon_active.dds",
      "/resources/vfs/textures/omw/water_nm.png",
      "/morrowind/Data Files/Morrowind.esm",
      "/morrowind/Data Files/Morrowind.bsa"
    ];

    function missingTes3mpBrowserAssets() {
      var missing = [];

      for (var i = 0; i < tes3mpRequiredBrowserAssets.length; i++) {
        var path = tes3mpRequiredBrowserAssets[i];
        try {
          if (!FS.analyzePath(path).exists || FS.stat(path).size <= 0) missing.push(path);
        } catch (error) {
          missing.push(path);
        }
      }

      return missing;
    }

    function waitForTes3mpBrowserAssets(options) {
      if (Module.__runtimeKind !== "tes3mp") return Promise.resolve(true);
      if (Module.__tes3mpBrowserAssetsVerified) return Promise.resolve(true);
      options = options || {};

      var startedAt = Date.now();
      var timeoutMs = options.timeoutMs == null ? 300000 : options.timeoutMs;

      return new Promise(function(resolve) {
        function poll() {
          var missing = missingTes3mpBrowserAssets();
          if (!missing.length) {
            Module.__tes3mpBrowserAssetsVerified = true;
            Module.print("TES3MP browser assets verified.");
            resolve(true);
            return;
          }

          if (Date.now() - startedAt >= timeoutMs) {
            Module.printErr("TES3MP missing browser assets: " + missing.join(", "));
            resolve(false);
            return;
          }

          setTimeout(poll, 250);
        }

        poll();
      });
    }

    function installTes3mpAssetVerifierPreRun() {
      if (Module.__runtimeKind !== "tes3mp" || Module.__tes3mpAssetVerifierInstalled) return;
      Module.__tes3mpAssetVerifierInstalled = true;
      Module.preRun.push(function() {
        var dependency = "tes3mp-browser-assets";
        Module.addRunDependency(dependency);
        waitForTes3mpBrowserAssets({ timeoutMs: 300000 }).then(function(ok) {
          if (!ok) {
            Module.printErr("TES3MP browser asset verification timed out after data-package preRun; continuing may fail.");
          }
        }, function(error) {
          Module.printErr("TES3MP browser asset verification failed: " + error);
        }).then(function() {
          Module.removeRunDependency(dependency);
        });
      });
    }

    function removeDeprecatedBundledOpenMwSaves() {
      deprecatedBundledOpenMwSaves.forEach(function(save) {
        try {
          if (!pathExists(save.path)) return;
          FS.unlink(save.path);
          persistenceDirty = true;
          Module.print("Removed deprecated bundled save: " + save.label + ".");
        } catch (error) {
          Module.printErr("Deprecated bundled save removal failed for " + save.label + ": " + error);
        }
      });
    }

    function seedBundledOpenMwSave() {
      removeDeprecatedBundledOpenMwSaves();

      if (pathExists(bundledOpenMwSave.savePath)) {
        return Promise.resolve(false);
      }

      ensureDirectory(bundledOpenMwSave.saveDir);
      return fetch(bundledOpenMwSave.assetPath, { cache: "force-cache" })
        .then(function(response) {
          if (!response.ok) {
            throw new Error("HTTP " + response.status + " loading " + bundledOpenMwSave.assetPath);
          }
          return response.arrayBuffer();
        })
        .then(function(buffer) {
          FS.writeFile(bundledOpenMwSave.savePath, new Uint8Array(buffer));
          persistenceDirty = true;
          Module.print("Bundled save installed: Ascadian Veteran.");
          return true;
        })
        .catch(function(error) {
          Module.printErr("Bundled save install failed: " + error);
          return false;
        });
    }

    function hasOpenMwSaveFiles(path) {
      try {
        return FS.readdir(path).some(function(name) {
          if (name === "." || name === "..") return false;
          var childPath = path + "/" + name;
          var stat = FS.stat(childPath);
          if (FS.isDir(stat.mode)) return hasOpenMwSaveFiles(childPath);
          return FS.isFile(stat.mode) && /\.omwsave$/i.test(name);
        });
      } catch (error) {
        return false;
      }
    }

    function upsertOpenMwConfig(text, key, value) {
      var lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
      var keyPattern = new RegExp("^\\s*" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*=", "i");

      for (var i = 0; i < lines.length; i++) {
        if (keyPattern.test(lines[i])) {
          lines[i] = key + "=" + value;
          return lines.join("\n");
        }
      }

      if (lines.length && lines[lines.length - 1].trim() !== "") lines.push("");
      lines.push(key + "=" + value);
      return lines.join("\n");
    }

    function removeOpenMwConfig(text, key) {
      var keyPattern = new RegExp("^\\s*" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*=", "i");
      return String(text || "").replace(/\r\n/g, "\n").split("\n").filter(function(line) {
        return !keyPattern.test(line);
      }).join("\n");
    }

    function shouldForceMenuStartup() {
      try {
        var forceMenu = sessionStorage.getItem("openmw-return-to-menu") === "1";
        if (forceMenu) sessionStorage.removeItem("openmw-return-to-menu");
        return forceMenu;
      } catch (error) {
        return false;
      }
    }

    function consumeRequestedStartupMode() {
      try {
        var mode = sessionStorage.getItem("openmw-start-mode") || "";
        if (mode) sessionStorage.removeItem("openmw-start-mode");
        return mode;
      } catch (error) {
        return "";
      }
    }

    function requestStartupMode(mode) {
      try {
        sessionStorage.setItem("openmw-start-mode", mode);
      } catch (error) {
      }
    }

    function clearStartupModeRequest() {
      try {
        sessionStorage.removeItem("openmw-start-mode");
      } catch (error) {
      }
    }

    function hasRequestedStartupMode() {
      try {
        return !!sessionStorage.getItem("openmw-start-mode");
      } catch (error) {
        return false;
      }
    }

    function writeBrowserGameConfig(skipMenu, runNewGameSequence, startCell, loadSavegame) {
      var configPath = "/home/web_user/.config/openmw/openmw.cfg";
      var text = "";
      try {
        text = FS.readFile(configPath, { encoding: "utf8" });
      } catch (error) {
      }

      text = upsertOpenMwConfig(text, "skip-menu", skipMenu ? 1 : 0);
      text = upsertOpenMwConfig(text, "new-game", runNewGameSequence ? 1 : 0);
      text = upsertOpenMwConfig(text, "start", startCell || "");
      text = loadSavegame
        ? upsertOpenMwConfig(text, "load-savegame", loadSavegame)
        : removeOpenMwConfig(text, "load-savegame");
      FS.writeFile(configPath, text);
      persistenceDirty = true;
    }

    function configureStartupMode() {
      var forceMenu = shouldForceMenuStartup();
      var requestedMode = forceMenu ? "" : consumeRequestedStartupMode();
      mainMenuActionsAllowed = false;
      Module.arguments.length = 0;

      if (forceMenu) {
        startupModeForRun = "menu";
        mainMenuActionsAllowed = true;
        writeBrowserGameConfig(false, false, "");
        Module.print("Returning to main menu.");
      } else if (requestedMode === "default") {
        startupModeForRun = "default";
        Module.arguments.push("--skip-menu=1", "--new-game=1");
        writeBrowserGameConfig(true, true, "");
        Module.print("Starting default character creation.");
      } else if (requestedMode === "blank") {
        startupModeForRun = "blank";
        Module.arguments.push("--skip-menu=1");
        writeBrowserGameConfig(true, false, "Seyda Neen");
        Module.print("Starting blank generated character in Seyda Neen.");
      } else if (requestedMode === "saved") {
        startupModeForRun = "saved";
        Module.arguments.push("--skip-menu=1", "--load-savegame=" + bundledOpenMwSave.savePath);
        writeBrowserGameConfig(true, false, "", bundledOpenMwSave.savePath);
        Module.print("Loading bundled starter save: Ascadian Veteran.");
      } else {
        startupModeForRun = "menu";
        mainMenuActionsAllowed = true;
        writeBrowserGameConfig(false, false, "");
        if (hasOpenMwSaveFiles("/home/web_user/.local/share/openmw/saves")) {
          Module.print("Browser saves found; keeping the main menu for Load.");
        } else {
          Module.print("No browser saves found; keeping the main menu for New.");
        }
      }
    }

    function syncPersistentUserFiles(reason) {
      if (!persistenceMounted || typeof FS === "undefined" || typeof FS.syncfs !== "function") {
        return Promise.resolve(false);
      }

      if (isTes3mpRuntimeActive()) {
        if (reason === "manual" || reason === "export" || reason === "import") {
          showSaveToast("Sync deferred during multiplayer");
        }
        persistenceDirty = true;
        return Promise.resolve(false);
      }

      if (!persistenceDirty && reason !== "manual" && reason !== "export" && reason !== "import") {
        return Promise.resolve(true);
      }

      if (persistenceSyncInProgress) {
        persistenceSyncQueued = true;
        return Promise.resolve(false);
      }

      persistenceSyncInProgress = true;
      return new Promise(function(resolve) {
        FS.syncfs(false, function(error) {
          persistenceSyncInProgress = false;
          if (error) {
            Module.printErr("Browser save sync failed: " + error);
            showSaveToast("Save sync failed");
            resolve(false);
          } else {
            persistenceDirty = false;
            if (reason === "manual" || reason === "export" || reason === "import") {
              showSaveToast("Saves synced");
            }
            resolve(true);
          }

          if (persistenceSyncQueued) {
            persistenceSyncQueued = false;
            setTimeout(function() {
              syncPersistentUserFiles("queued");
            }, 250);
          }
        });
      });
    }

    function schedulePersistentSync(reason, delay) {
      if (!persistenceMounted) return;
      if (isTes3mpRuntimeActive()) {
        persistenceDirty = true;
        return;
      }
      persistenceDirty = true;
      clearTimeout(persistenceSyncTimer);
      persistenceSyncTimer = setTimeout(function() {
        syncPersistentUserFiles(reason || "scheduled");
      }, delay == null ? 1500 : delay);
    }

    function reloadToMainMenu() {
      if (returningToMainMenu) return;
      if (!canReloadAfterRuntimeExit()) {
        Module.setStatus("Runtime exited. Reload the page to return to the main menu.");
        return;
      }
      returningToMainMenu = true;
      mainMenuActionsAllowed = false;
      updateMainMenuActions();
      try {
        sessionStorage.setItem("openmw-return-to-menu", "1");
      } catch (error) {
      }
      Module.setStatus("Returning to main menu...");
      setTimeout(function() {
        window.location.reload();
      }, 250);
    }

    function startNewGameMode(mode) {
      mainMenuActionsAllowed = false;
      updateMainMenuActions();
      requestStartupMode(mode);
      Module.setStatus(mode === "blank" ? "Starting blank generated character..." : "Starting default character creation...");
      setTimeout(function() {
        window.location.reload();
      }, 150);
    }

    function watchEngineStateLog(text) {
      if (/Starting a new game|Loading saved game|Reading save file|LoadingInProgress|Loaded cell|Loading cell|Unloading cell|Changing to interior|LoadingExterior|LoadingInterior|Player tile has been changed/i.test(text)) {
        mainMenuActionsAllowed = false;
        updateMainMenuActions();
      }
    }

    function normalizeLoadingCellName(name) {
      name = String(name || "").replace(/\s+\(-?\d+\s*,\s*-?\d+\)\s*$/, "").trim();
      return name.length > 48 ? name.slice(0, 45) + "..." : name;
    }

    function watchMorrowindLoadingLog(text) {
      text = String(text || "");
      if (Module.__runtimeKind === "tes3mp") {
        if (/Connection failed/i.test(text)) {
          var failedLaunchConfig = readTes3mpLaunchConfig();
          reportBrowserRuntimeFailure({
            kind: "connection",
            message: text,
            source: "tes3mp-runtime"
          }, failedLaunchConfig);
          clearTes3mpLaunchConfig();
          showMorrowindLoadingScreen("Multiplayer connection failed. Returning to lobby...", 10000, {
            category: "multiplayerStartup",
            signal: text,
            sticky: true
          });
          showSaveToast("Multiplayer connection failed");
          setTimeout(reloadToMainMenu, 1200);
        } else if (/TES3MP browser launch|TES3MP client|tes3mp started|TES3MP web preRun initialized/i.test(text)) {
          showMorrowindLoadingScreen("Starting multiplayer...", 300000, {
            category: "multiplayerStartup",
            signal: text,
            sticky: true
          });
        } else if (/TES3MP web relay ready/i.test(text)) {
          showMorrowindLoadingScreen("Connecting to multiplayer...", 300000, {
            category: "multiplayerStartup",
            signal: text,
            sticky: true
          });
        } else if (/Sending ID_LOADED to server/i.test(text)) {
          if (!tes3mpLoadedSentAt) tes3mpLoadedSentAt = Date.now();
          recordMorrowindLoadingEvent("client-loaded", text, {
            category: "multiplayerStartup",
            signal: text
          });
          showMorrowindLoadingScreen("Waiting for multiplayer world...", 120000, {
            category: "multiplayerStartup",
            signal: text,
            sticky: true
          });
          scheduleTes3mpFirstFrameRecovery(text, 90000);
        } else if (/Sending ID_PLAYER_BASEINFO to server|TES3MP browser CharGen (?:name accepted|defaulted)/i.test(text)) {
          showMorrowindLoadingScreen("Entering multiplayer...", 60000, {
            category: "multiplayerStartup",
            signal: text,
            sticky: true
          });
          scheduleTes3mpFirstFrameRecovery(text, 90000);
        } else if (/Sent ID_SYSTEM_HANDSHAKE to server/i.test(text)) {
          showMorrowindLoadingScreen("Joining multiplayer...", 120000, {
            category: "multiplayerStartup",
            signal: text,
            sticky: true
          });
        } else if (/Sending ID_PLAYER_MAP|Received ID_WORLD_REGION_AUTHORITY|Received ID_ACTOR_AUTHORITY|Received ID_PLAYER_(?:CELL_STATE|CELL_CHANGE|BASEINFO|SHAPESHIFT)|Server says .* moved to|Successfully initialized (?:LocalActors|DedicatedActor)|Initializing DedicatedActor/i.test(text)) {
          if (tes3mpLoadedSentAt || tes3mpGameplayReadyAt) {
            markTes3mpGameplayReady(text, 900);
          }
        } else if (/LoadingExterior|LoadingInterior|Loading cell|LoadingInProgress|Player tile has been changed/i.test(text)) {
          if (tes3mpGameplayReadyAt && /LoadingExterior|LoadingInterior|Loading cell|LoadingInProgress|Player tile has been changed/i.test(text)) {
            resetTes3mpFirstFrameReadiness(text);
            recordMorrowindLoadingEvent("streaming", text, {
              category: "streamingActivity",
              signal: text
            });
            showMorrowindLoadingScreen("Loading multiplayer area...", 60000, {
              category: "streamingActivity",
              signal: text,
              sticky: true
            });
            scheduleTes3mpFirstFrameRecovery(text, 90000);
          } else {
            showMorrowindLoadingScreen("Loading multiplayer area...", tes3mpGameplayReadyAt ? 15000 : 300000, {
              category: "multiplayerStartup",
              signal: text,
              sticky: !tes3mpGameplayReadyAt
            });
          }
        } else if (/Loaded cell/i.test(text)) {
          recordMorrowindLoadingEvent("loaded", text, {
            category: "blockingLoadEnd",
            signal: text
          });
          scheduleCanvasRenderCap("tes3mp-loaded-cell");
          startTes3mpFirstFrameProbe();
          scheduleTes3mpFirstFrameRecovery(text, tes3mpGameplayReadyAt ? 45000 : 90000);
          if (tes3mpLoadedSentAt || tes3mpGameplayReadyAt) markTes3mpGameplayReady(text, 900);
        }
        return;
      }

      if (/Loading saved game|Reading save file/i.test(text)) {
        showMorrowindLoadingScreen("Loading saved game...", 45000, {
          category: "blockingLoadStart",
          signal: "save"
        });
      } else if (/Starting a new game/i.test(text)) {
        showMorrowindLoadingScreen("Starting new game...", 30000, {
          category: "blockingLoadStart",
          signal: "new-game"
        });
      } else if (/Changing to interior|Changing to exterior/i.test(text)) {
        showMorrowindLoadingScreen("Loading area...", 15000, {
          category: "blockingLoadStart",
          signal: text
        });
      } else if (/Loaded cell/i.test(text)) {
        recordMorrowindLoadingEvent("loaded", text, {
          category: "blockingLoadEnd",
          signal: text
        });
        scheduleCanvasRenderCap("loaded-cell");
        scheduleMorrowindLoadingHide(800);
      } else if (/LoadingExterior|LoadingInterior|Loading cell|Unloading cell|LoadingInProgress|Player tile has been changed/i.test(text)) {
        recordMorrowindLoadingEvent("streaming", text, {
          category: "streamingActivity",
          signal: text
        });
      }
    }

    function requestPersistentBrowserStorage() {
      if (!navigator.storage || typeof navigator.storage.persist !== "function") {
        return;
      }

      var persisted = typeof navigator.storage.persisted === "function"
        ? navigator.storage.persisted()
        : Promise.resolve(false);

      persisted.then(function(alreadyPersistent) {
        if (alreadyPersistent) {
          Module.print("Browser save storage is persistent.");
          return true;
        }
        return navigator.storage.persist();
      }).then(function(granted) {
        if (granted) {
          Module.print("Browser save storage persistence granted.");
        } else {
          Module.print("Browser save storage is using best-effort persistence.");
        }
      }).catch(function(error) {
        console.warn("Persistent browser storage request failed", error);
      });
    }

    function watchPersistenceLog(text) {
      if (/Writing saved game| is saved in |Saved input bindings|Saved settings|Saving settings/i.test(text)) {
        schedulePersistentSync("game", 500);
      }
    }

    function flushOutputLog() {
      outputLogFlushTimer = 0;
      if (!pendingOutputLogText) return;
      outputLogText += pendingOutputLogText;
      pendingOutputLogText = "";
      if (outputLogText.length > maxOutputLogLength) {
        outputLogText = outputLogText.slice(-maxOutputLogLength);
      }
      outputElement.value = outputLogText;
      if (outputElement.offsetParent !== null) {
        outputElement.scrollTop = outputElement.scrollHeight;
      }
    }

    function appendOutputLog(text) {
      if (suppressedOutputLogLines) {
        pendingOutputLogText += "[suppressed " + suppressedOutputLogLines + " navigator debug log lines]\n";
        suppressedOutputLogLines = 0;
      }
      pendingOutputLogText += text + "\n";
      if (pendingOutputLogText.length > maxOutputLogLength) {
        pendingOutputLogText = pendingOutputLogText.slice(-maxOutputLogLength);
      }
      if (!outputLogFlushTimer) {
        outputLogFlushTimer = setTimeout(flushOutputLog, 100);
      }
    }

    function isNoisyOpenMwLog(text) {
      return /^(?:AiTravel:|Post job|Posted \d+ navigator jobs|Pop job|Locking tile|Processing job|Processing initial job|Processed job|Unlocked tile|Removing job|Null recast mesh for job|Cache update posted|Ignore (?:add|remove|update) tile by job)\b/.test(text);
    }

    function writeRuntimeLog(text, isError) {
      watchPersistenceLog(text);
      watchEngineStateLog(text);
      watchMorrowindLoadingLog(text);

      if (isNoisyOpenMwLog(text)) {
        suppressedOutputLogLines++;
        return;
      }

      if (isError) {
        console.error(text);
      } else {
        console.log(text);
      }
      appendOutputLog(text);
    }
