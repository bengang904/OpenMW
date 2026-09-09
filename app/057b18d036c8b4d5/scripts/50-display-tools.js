    function normalizeRenderDimension(value, fallback) {
      value = Number(value);
      return isFinite(value) && value > 0 ? value : fallback;
    }

    function capBrowserRenderSize(width, height) {
      width = normalizeRenderDimension(width, 800);
      height = normalizeRenderDimension(height, 600);
      var viewportPixels = Math.max(1, width * height);
      var scale = Math.min(1, Math.sqrt(browserTargetRenderPixels / viewportPixels));
      return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale))
      };
    }

    window.__openmwClampCanvasSize = capBrowserRenderSize;

    function getCanvasDesiredRenderSize(cssSize) {
      cssSize = cssSize || getCanvasCssViewportSize();
      var ratio = getBrowserRenderDevicePixelRatio();
      return capBrowserRenderSize(cssSize.width * ratio, cssSize.height * ratio);
    }

    function getBrowserReportedSurfaceSize(cssWidth, cssHeight) {
      return getCanvasDesiredRenderSize({
        width: normalizeRenderDimension(cssWidth, window.innerWidth || 800),
        height: normalizeRenderDimension(cssHeight, window.innerHeight || 600)
      });
    }

    window.__openmwGetReportedSurfaceSize = getBrowserReportedSurfaceSize;

    function formatBrowserGuiScale(value) {
      value = Number(value);
      if (!isFinite(value) || value <= 0) value = 1;
      return String(Math.round(value * 1000) / 1000);
    }

    function getBrowserGuiScaleForRenderSize(size) {
      size = size || getCappedCanvasViewportSize();
      var width = normalizeRenderDimension(size.width, browserGuiReferenceWidth);
      var height = normalizeRenderDimension(size.height, browserGuiReferenceHeight);
      return Math.max(0.5, Math.min(8, Math.min(
        width / browserGuiReferenceWidth,
        height / browserGuiReferenceHeight
      )));
    }

    window.__openmwGetBrowserGuiScale = getBrowserGuiScaleForRenderSize;

    function getCanvasAvailableCssViewportSize() {
      var rect = canvasWrapElement && canvasWrapElement.getBoundingClientRect
        ? canvasWrapElement.getBoundingClientRect()
        : null;
      var viewport = window.visualViewport || null;
      var viewportWidth = normalizeRenderDimension(
        viewport && viewport.width ? viewport.width : window.innerWidth,
        document.documentElement && document.documentElement.clientWidth ? document.documentElement.clientWidth : 800
      );
      var viewportHeight = normalizeRenderDimension(
        viewport && viewport.height ? viewport.height : window.innerHeight,
        document.documentElement && document.documentElement.clientHeight ? document.documentElement.clientHeight : 600
      );
      var rectWidth = rect && rect.width ? rect.width : viewportWidth;
      var rectHeight = rect && rect.height ? rect.height : viewportHeight;
      return {
        width: Math.min(normalizeRenderDimension(rectWidth, viewportWidth), viewportWidth),
        height: Math.min(normalizeRenderDimension(rectHeight, viewportHeight), viewportHeight)
      };
    }

    function getCanvasCssViewportSize() {
      return getCanvasAvailableCssViewportSize();
    }

    function getCappedCanvasViewportSize() {
      return getCanvasDesiredRenderSize(getCanvasCssViewportSize());
    }

    function isCanvasControlTransferredOffscreen(canvas) {
      return !!(canvas && (
        canvas.controlTransferredOffscreen ||
        canvas.__openmwOffscreenCanvasTransferred
      ));
    }

    function installCanvasOffscreenTransferMarker(canvas) {
      if (!canvas ||
          canvas.__openmwOffscreenTransferMarkerInstalled ||
          typeof canvas.transferControlToOffscreen !== "function") {
        return;
      }
      var nativeTransferControlToOffscreen = canvas.transferControlToOffscreen;
      Object.defineProperty(canvas, "__openmwOffscreenTransferMarkerInstalled", { value: true });
      canvas.transferControlToOffscreen = function() {
        var offscreenCanvas = nativeTransferControlToOffscreen.apply(this, arguments);
        this.__openmwOffscreenCanvasTransferred = true;
        return offscreenCanvas;
      };
    }

    function installCanvasRenderSizeCap(canvas) {
      if (!canvas || canvas.__openmwRenderSizeCapInstalled) return;
      installCanvasOffscreenTransferMarker(canvas);
      var widthDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "width");
      var heightDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "height");
      if (!widthDescriptor || !heightDescriptor || !widthDescriptor.set || !heightDescriptor.set) return;

      var requestedWidth = normalizeRenderDimension(widthDescriptor.get.call(canvas), 800);
      var requestedHeight = normalizeRenderDimension(heightDescriptor.get.call(canvas), 600);
      var applyingNativeSize = false;

      function applyRequestedRenderSize() {
        var size = capBrowserRenderSize(requestedWidth, requestedHeight);
        if (isCanvasControlTransferredOffscreen(canvas)) {
          canvas.__openmwRenderSize = size;
          canvas.__openmwRenderSizeDeferred = {
            reason: "offscreen",
            width: size.width,
            height: size.height,
            time: Date.now()
          };
          return size;
        }
        applyingNativeSize = true;
        try {
          widthDescriptor.set.call(canvas, size.width);
          heightDescriptor.set.call(canvas, size.height);
        } catch (error) {
          canvas.__openmwRenderSizeDeferred = {
            reason: "native-set-failed",
            name: error && error.name ? error.name : "",
            message: error && error.message ? error.message : String(error),
            width: size.width,
            height: size.height,
            time: Date.now()
          };
        } finally {
          applyingNativeSize = false;
        }
        canvas.__openmwRenderSize = size;
        return size;
      }

      function setRequestedRenderSize(width, height) {
        requestedWidth = normalizeRenderDimension(width, requestedWidth);
        requestedHeight = normalizeRenderDimension(height, requestedHeight);
        return applyRequestedRenderSize();
      }

      Object.defineProperty(canvas, "__openmwRenderSizeCapInstalled", { value: true });
      Object.defineProperty(canvas, "__openmwSetRequestedRenderSize", { value: setRequestedRenderSize });

      Object.defineProperty(canvas, "width", {
        configurable: true,
        get: function() {
          return widthDescriptor.get.call(this);
        },
        set: function(value) {
          if (applyingNativeSize) {
            widthDescriptor.set.call(this, value);
            return;
          }
          requestedWidth = normalizeRenderDimension(value, requestedWidth);
          applyRequestedRenderSize();
        }
      });

      Object.defineProperty(canvas, "height", {
        configurable: true,
        get: function() {
          return heightDescriptor.get.call(this);
        },
        set: function(value) {
          if (applyingNativeSize) {
            heightDescriptor.set.call(this, value);
            return;
          }
          requestedHeight = normalizeRenderDimension(value, requestedHeight);
          applyRequestedRenderSize();
        }
      });

      Object.defineProperty(canvas, "widthNative", {
        configurable: true,
        get: function() {
          return widthDescriptor.get.call(this);
        },
        set: function(value) {
          requestedWidth = normalizeRenderDimension(value, requestedWidth);
          applyRequestedRenderSize();
        }
      });

      Object.defineProperty(canvas, "heightNative", {
        configurable: true,
        get: function() {
          return heightDescriptor.get.call(this);
        },
        set: function(value) {
          requestedHeight = normalizeRenderDimension(value, requestedHeight);
          applyRequestedRenderSize();
        }
      });

      var nativeSetAttribute = canvas.setAttribute;
      canvas.setAttribute = function(name, value) {
        var lowerName = String(name).toLowerCase();
        if (lowerName === "width") {
          this.width = value;
          return;
        }
        if (lowerName === "height") {
          this.height = value;
          return;
        }
        return nativeSetAttribute.call(this, name, value);
      };

      applyRequestedRenderSize();
    }

    function enforceCanvasRenderCap(reason) {
      if (!canvasElement.__openmwSetRequestedRenderSize) return;
      var availableCssViewportSize = getCanvasAvailableCssViewportSize();
      var cssViewportSize = getCanvasCssViewportSize();
      var devicePixelRatio = getBrowserRenderDevicePixelRatio();
      var desiredSize = getCanvasDesiredRenderSize(cssViewportSize);
      var size = canvasElement.__openmwSetRequestedRenderSize(desiredSize.width, desiredSize.height);
      enforceShellUiLayerStacking();
      canvasElement.style.setProperty("position", "relative", "important");
      canvasElement.style.removeProperty("left");
      canvasElement.style.removeProperty("top");
      canvasElement.style.setProperty("width", "100%", "important");
      canvasElement.style.setProperty("height", "100%", "important");
      canvasElement.style.setProperty("max-width", "100vw", "important");
      canvasElement.style.setProperty("max-height", "100vh", "important");
      canvasElement.style.removeProperty("transform");
      window.__openmwRenderCap = {
        reason: reason || "manual",
        width: size.width,
        height: size.height,
        cssWidth: canvasElement.getBoundingClientRect().width || 0,
        cssHeight: canvasElement.getBoundingClientRect().height || 0,
        availableCssWidth: availableCssViewportSize.width,
        availableCssHeight: availableCssViewportSize.height,
        requestedCssWidth: cssViewportSize.width,
        requestedCssHeight: cssViewportSize.height,
        requestedDeviceWidth: desiredSize.width,
        requestedDeviceHeight: desiredSize.height,
        devicePixelRatio: devicePixelRatio,
        baseWidth: browserBaseRenderWidth,
        baseHeight: browserBaseRenderHeight,
        profile: browserRenderProfile,
        uiScale: getBrowserGuiScaleForRenderSize(size),
        targetPixels: browserTargetRenderPixels,
        deferred: canvasElement.__openmwRenderSizeDeferred || null,
        time: Date.now()
      };
      if (isCanvasControlTransferredOffscreen(canvasElement) &&
          typeof Module !== "undefined" &&
          typeof Module.__openmwSetRuntimeCanvasSize === "function") {
        try {
          window.__openmwAllowOffscreenCanvasResizeUntil = Date.now() + 750;
          var resizeResult = Module.__openmwSetRuntimeCanvasSize(size.width, size.height);
          canvasElement.__openmwRenderSizeDeferred = {
            reason: "runtime-offscreen-resize",
            result: resizeResult,
            width: size.width,
            height: size.height,
            time: Date.now()
          };
          window.__openmwRenderCap.deferred = canvasElement.__openmwRenderSizeDeferred;
        } catch (error) {
          canvasElement.__openmwRenderSizeDeferred = {
            reason: "runtime-offscreen-resize-failed",
            name: error && error.name ? error.name : "",
            message: error && error.message ? error.message : String(error),
            width: size.width,
            height: size.height,
            time: Date.now()
          };
          window.__openmwRenderCap.deferred = canvasElement.__openmwRenderSizeDeferred;
        }
      }
      try {
        var gl = canvasElement.GLctxObject && canvasElement.GLctxObject.GLctx
          ? canvasElement.GLctxObject.GLctx
          : window.__openmwLastGL;
        if (gl && gl.canvas === canvasElement && typeof gl.viewport === "function") {
          gl.viewport(0, 0, size.width, size.height);
        }
      } catch (error) {
      }
      updateCommandRenderSize(size);
    }

    function scheduleCanvasRenderCap(reason) {
      enforceCanvasRenderCap(reason);
      canvasRenderCapTimers.forEach(clearTimeout);
      canvasRenderCapTimers = [
        setTimeout(function() { enforceCanvasRenderCap(reason); }, 50),
        setTimeout(function() { enforceCanvasRenderCap(reason); }, 250),
        setTimeout(function() { enforceCanvasRenderCap(reason); }, 1000)
      ];
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(function() { enforceCanvasRenderCap(reason); });
      }
    }

    function updateCommandRenderSize(size) {
      if (!commandRenderSizeElement) return;
      size = size || getCappedCanvasViewportSize();
      commandRenderSizeElement.textContent = size.width + " x " + size.height + " " + getBrowserRenderProfileLabel();
    }

    function isCommandPanelOpen() {
      return commandPanelElement && commandPanelElement.getAttribute("data-open") === "true";
    }

    function setCommandPanelOpen(open, options) {
      open = !!open;
      options = options || {};
      if (open) closeOverlayPanels("command");
      commandPanelElement.setAttribute("data-open", open ? "true" : "false");
      commandPanelElement.setAttribute("aria-hidden", open ? "false" : "true");
      commandToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
      updateCommandPanelState();
      if (!open && !options.skipFocus) {
        setTimeout(function() {
          canvasElement.focus();
        }, 0);
      }
    }

    function toggleCommandPanel() {
      setCommandPanelOpen(!isCommandPanelOpen());
    }

    function getBrowserModRowStatus(mod) {
      var loadState = browserModLoadState[mod.id];
      if (loadState && loadState.loaded === false) return "Unavailable";
      if (mod.locked) return "Always on";
      return isBrowserModEnabled(mod.id) ? "On" : "Off";
    }

    function updateCommandToggleState() {
      if (!commandToggleStateElement) return;
      commandToggleStateElement.textContent = browserModReloadRequired ? "Reload" : getBrowserRenderProfileLabel();
      commandToggleButton.classList.toggle("pending", browserModReloadRequired);
    }

    function updateCommandModList() {
      if (!commandModListElement) return;
      commandModListElement.textContent = "";
      var liveTes3mp = isTes3mpRuntimeActive();

      browserModCatalog.forEach(function(mod) {
        var row = document.createElement("label");
        row.className = "mod-toggle-row";

        var title = document.createElement("div");
        title.className = "mod-title";
        title.textContent = mod.title;

        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = isBrowserModEnabled(mod.id);
        checkbox.disabled = !!mod.locked || !shellControlsEnabled || liveTes3mp;
        checkbox.setAttribute("aria-label", mod.title);
        checkbox.addEventListener("change", function() {
          setBrowserModEnabled(mod.id, checkbox.checked, { toast: true });
        });

        var description = document.createElement("div");
        description.className = "mod-description";
        description.textContent = mod.description;

        var status = document.createElement("div");
        status.className = "mod-status";
        status.textContent = (mod.statusLabel || "Add-on") + " / " + getBrowserModRowStatus(mod);

        row.appendChild(title);
        row.appendChild(checkbox);
        row.appendChild(description);
        row.appendChild(status);
        commandModListElement.appendChild(row);
      });

      var unavailable = browserModCatalog.some(function(mod) {
        var state = browserModLoadState[mod.id];
        return isBrowserModEnabled(mod.id) && state && state.loaded === false;
      });
      commandModStatusElement.textContent = browserModReloadRequired
        ? "Reload required"
        : unavailable
          ? "Package skipped"
          : "Ready";
      commandModApplyButton.disabled = !shellControlsEnabled || !browserModReloadRequired || liveTes3mp;
      updateCommandToggleState();
    }

    function updateCommandPanelState() {
      enforceShellUiLayerStacking();
      updateCommandRenderSize();
      if (commandFullscreenStateElement) {
        commandFullscreenStateElement.textContent = getFullscreenElement() ? "On" : "Off";
      }
      updateTouchControlsUi();
      updateTouchControlsVisibility();
      updateCommandModList();
      updateCommandToggleState();
    }

    lobbyDisplayNameElement.value = getStoredLobbyDisplayName() || "Nerevarine";
    accountUsernameElement.value = lobbyDisplayNameElement.value;
    accountRecoveryUsernameElement.value = lobbyDisplayNameElement.value;
    saveToolsElement.hidden = false;
    lobbyToolsElement.hidden = false;
    accountToolsElement.hidden = false;
    chatToolsElement.hidden = false;
    helpToolsElement.hidden = false;
    renderAccountPanel();
    renderChatMessages();
    renderLobbyInstances();
    setLobbyStatus("offline", "Offline");
    loadLobbyConfig();
    loadAccountMe();
    loadChatRooms().then(startChatPolling);
    startLobbyPolling();
    startLobbyHeartbeats();
    updateRenderProfileButtons();
    installTouchControlHandlers();
    updateCommandPanelState();
    installCanvasRenderSizeCap(canvasElement);
    scheduleCanvasRenderCap("startup");

    canvasElement.addEventListener("webglcontextlost", function(event) {
      statusElement.textContent = "WebGL context lost. Reload the page.";
      event.preventDefault();
    }, false);

    canvasElement.addEventListener("keydown", function(event) {
      if (event.key === "Tab") event.preventDefault();
      if (!event.repeat && (event.code === "Space" || event.code === "Enter" || event.code === "KeyE")) {
        armPotentialMorrowindLoading("keyboard activation");
      }
    });

    canvasElement.addEventListener("pointerdown", function(event) {
      canvasElement.focus();
      if (event.button == null || event.button === 0) {
        armPotentialMorrowindLoading("pointer activation");
      }
    });

    document.addEventListener("keydown", function(event) {
      if (event.shiftKey && event.key === "F1") {
        event.preventDefault();
        event.stopPropagation();
        toggleHelpPanel();
      } else if (event.key === "Escape" && isHelpPanelOpen()) {
        event.preventDefault();
        event.stopPropagation();
        setHelpPanelOpen(false);
      } else if (event.shiftKey && event.key === "F3") {
        event.preventDefault();
        event.stopPropagation();
        toggleLobbyPanel();
      } else if (event.key === "Escape" && isLobbyPanelOpen()) {
        event.preventDefault();
        event.stopPropagation();
        setLobbyPanelOpen(false);
      } else if (event.shiftKey && event.key === "F4") {
        event.preventDefault();
        event.stopPropagation();
        toggleAccountPanel();
      } else if (event.key === "Escape" && isAccountPanelOpen()) {
        event.preventDefault();
        event.stopPropagation();
        setAccountPanelOpen(false);
      } else if (event.shiftKey && event.key === "F5") {
        event.preventDefault();
        event.stopPropagation();
        toggleChatPanel();
      } else if (event.key === "Escape" && isChatPanelOpen()) {
        event.preventDefault();
        event.stopPropagation();
        setChatPanelOpen(false);
      } else if (event.shiftKey && event.key === "F2") {
        event.preventDefault();
        event.stopPropagation();
        toggleCommandPanel();
      } else if (event.key === "Escape" && isCommandPanelOpen()) {
        event.preventDefault();
        event.stopPropagation();
        setCommandPanelOpen(false);
      } else if (event.key === "F11" || (event.altKey && event.key === "Enter")) {
        event.preventDefault();
        event.stopPropagation();
        toggleGameFullscreen();
      } else if (event.key === "Escape" && getFullscreenElement()) {
        event.preventDefault();
      }
    }, true);

    document.addEventListener("keyup", function(event) {
      if (event.key === "Escape" && getFullscreenElement()) {
        event.preventDefault();
      }
    }, true);
