    function isTes3mpRuntimeActive() {
      return runtimeStarted && typeof Module !== "undefined" && Module.__runtimeKind === "tes3mp";
    }

    function enforceShellUiLayerStacking() {
      try {
        if (canvasWrapElement) {
          canvasWrapElement.style.setProperty("z-index", "0", "important");
        }
        if (canvasElement) {
          canvasElement.style.setProperty("position", "relative", "important");
          canvasElement.style.setProperty("z-index", "0", "important");
        }
        if (topbarElement) topbarElement.style.setProperty("z-index", "120", "important");
        if (touchControlsElement) touchControlsElement.style.setProperty("z-index", "35", "important");
        [saveToolsElement, lobbyToolsElement, accountToolsElement, chatToolsElement, helpToolsElement].forEach(function(element) {
          if (element) element.style.setProperty("z-index", "110", "important");
        });
        if (saveToastElement) saveToastElement.style.setProperty("z-index", "130", "important");
        [commandPanelElement, lobbyPanelElement, accountPanelElement, chatPanelElement, helpPanelElement].forEach(function(element) {
          if (element) element.style.setProperty("z-index", "140", "important");
        });
        [saveToolsElement, lobbyToolsElement, accountToolsElement, chatToolsElement, helpToolsElement].forEach(function(element) {
          if (element) element.style.setProperty("pointer-events", "auto", "important");
        });
      } catch (error) {
      }
    }

    function shellUiControlAtPoint(x, y) {
      if (!isFinite(x) || !isFinite(y)) return null;
      var controls = Array.prototype.slice.call(document.querySelectorAll(
        "#save-tools button,#lobby-tools button,#account-tools button,#chat-tools button,#help-tools button,#command-panel button,#lobby-panel button,#account-panel button,#chat-panel button,#help-panel button,#help-panel a,[data-render-profile]"
      ));
      for (var i = controls.length - 1; i >= 0; i--) {
        var control = controls[i];
        if (!control || control.disabled || control.closest("[hidden]")) continue;
        var style = getComputedStyle(control);
        if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") continue;
        var rect = control.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return control;
      }
      return null;
    }

    var shellUiPointerRouteUntil = 0;
    var shellUiPointerRouteControl = null;

    function routeShellUiPointerEvent(event) {
      if (!event || event.defaultPrevented || event.__openmwShellUiRouted) return;
      if (event.button != null && event.button !== 0) return;
      var x = Number(event.clientX);
      var y = Number(event.clientY);
      var control = shellUiControlAtPoint(x, y);
      if (!control) return;
      var nativeHit = document.elementFromPoint(x, y);
      if (event.type === "click") {
        if (shellUiPointerRouteControl === control && Date.now() < shellUiPointerRouteUntil) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      window.__openmwShellUiRouteDebug = {
        type: event.type,
        x: x,
        y: y,
        controlId: control.id || "",
        controlText: (control.textContent || "").slice(0, 80),
        nativeHitTag: nativeHit ? nativeHit.tagName : "",
        nativeHitId: nativeHit ? nativeHit.id || "" : "",
        time: Date.now()
      };
      event.__openmwShellUiRouted = true;
      shellUiPointerRouteUntil = Date.now() + 700;
      shellUiPointerRouteControl = control;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        control.focus({ preventScroll: true });
      } catch (error) {
        control.focus();
      }
      control.click();
    }

    ["pointerdown", "touchstart", "click"].forEach(function(type) {
      document.addEventListener(type, routeShellUiPointerEvent, true);
    });

    function findBrowserMod(id) {
      for (var i = 0; i < browserModCatalog.length; i++) {
        if (browserModCatalog[i].id === id) return browserModCatalog[i];
      }
      return null;
    }

    function getDefaultBrowserModSelection() {
      var selection = {};
      browserModCatalog.forEach(function(mod) {
        selection[mod.id] = mod.defaultEnabled !== false || !!mod.locked;
      });
      return selection;
    }

    function normalizeBrowserModSelection(selection) {
      var normalized = getDefaultBrowserModSelection();
      if (selection && typeof selection === "object") {
        browserModCatalog.forEach(function(mod) {
          if (Object.prototype.hasOwnProperty.call(selection, mod.id)) {
            normalized[mod.id] = !!selection[mod.id];
          }
          if (mod.locked) normalized[mod.id] = true;
        });
      }
      return normalized;
    }

    function readBrowserModSelection() {
      try {
        var raw = localStorage.getItem(browserModStorageKey);
        if (!raw) return getDefaultBrowserModSelection();
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          var arraySelection = {};
          parsed.forEach(function(id) {
            arraySelection[id] = true;
          });
          return normalizeBrowserModSelection(arraySelection);
        }
        return normalizeBrowserModSelection(parsed);
      } catch (error) {
        return getDefaultBrowserModSelection();
      }
    }

    function storeBrowserModSelection() {
      try {
        localStorage.setItem(browserModStorageKey, JSON.stringify(browserModSelection));
      } catch (error) {
      }
    }

    function isBrowserModEnabled(id) {
      var mod = findBrowserMod(id);
      if (mod && mod.locked) return true;
      return !!browserModSelection[id];
    }

    function setBrowserModEnabled(id, enabled, options) {
      var mod = findBrowserMod(id);
      if (!mod || mod.locked) return;
      options = options || {};
      browserModSelection[id] = !!enabled;
      browserModSelection = normalizeBrowserModSelection(browserModSelection);
      storeBrowserModSelection();
      browserModReloadRequired = true;
      updateCommandModList();
      if (options.toast) showSaveToast("Reload to apply add-ons");
    }

    function getEnabledBrowserRuntimeMods() {
      return browserModCatalog.filter(function(mod) {
        return isBrowserModEnabled(mod.id) && !!mod.runtimeScript;
      });
    }
