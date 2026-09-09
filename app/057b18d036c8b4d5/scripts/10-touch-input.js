    function readBrowserRenderProfile() {
      try {
        var stored = localStorage.getItem(browserRenderProfileStorageKey);
        if (stored && browserRenderProfiles[stored]) return stored;
      } catch (error) {
      }
      return browserDefaultRenderProfile;
    }

    function storeBrowserRenderProfile(profile) {
      try {
        localStorage.setItem(browserRenderProfileStorageKey, profile);
      } catch (error) {
      }
    }

    function getBrowserRenderProfileLabel() {
      return browserRenderProfiles[browserRenderProfile].label;
    }

    function getBrowserRenderDevicePixelRatio() {
      var ratio = Number(window.devicePixelRatio) || 1;
      return Math.max(1, Math.min(3, ratio));
    }

    function updateRenderProfileButtons() {
      renderProfileButtons.forEach(function(button) {
        var active = button.getAttribute("data-render-profile") === browserRenderProfile;
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function setBrowserRenderProfile(profile, options) {
      if (!browserRenderProfiles[profile]) return;
      options = options || {};
      browserRenderProfile = profile;
      browserBaseRenderWidth = browserRenderProfiles[profile].width;
      browserBaseRenderHeight = browserRenderProfiles[profile].height;
      browserTargetRenderPixels = browserBaseRenderWidth * browserBaseRenderHeight;
      updateRenderProfileButtons();
      if (options.persist) storeBrowserRenderProfile(profile);
      if (runtimeStarted || runtimeStartPromise) {
        if (commandRenderSizeElement && canvasElement && canvasElement.__openmwRenderSize) {
          commandRenderSizeElement.textContent = canvasElement.__openmwRenderSize.width + " x " +
            canvasElement.__openmwRenderSize.height + " now / " + getBrowserRenderProfileLabel() + " next";
        } else {
          updateCommandRenderSize();
        }
        try {
          if (runtimeStarted && typeof FS !== "undefined") writeBrowserVideoSettings();
        } catch (error) {
        }
        if (options.toast) showSaveToast("Render applies after reload");
        updateCommandPanelState();
        return;
      }
      scheduleCanvasRenderCap("render-profile-" + profile);
      if (options.toast) showSaveToast("Render " + getBrowserRenderProfileLabel());
      updateCommandPanelState();
    }

    function isCoarsePointerDevice() {
      try {
        if (!window.matchMedia) return !!(navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        return window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
          window.matchMedia("(max-width: 900px) and (any-pointer: coarse)").matches;
      } catch (error) {
        return false;
      }
    }

    function normalizeTouchControlsMode(mode) {
      mode = String(mode || "").toLowerCase();
      return mode === "on" || mode === "off" || mode === "auto" ? mode : "auto";
    }

    function readTouchControlsMode() {
      try {
        return normalizeTouchControlsMode(localStorage.getItem(touchControlsModeStorageKey));
      } catch (error) {
        return "auto";
      }
    }

    function storeTouchControlsMode(mode) {
      try {
        localStorage.setItem(touchControlsModeStorageKey, normalizeTouchControlsMode(mode));
      } catch (error) {
      }
    }

    function readTouchLookSensitivity() {
      try {
        var stored = Number(localStorage.getItem(touchControlsLookStorageKey));
        if (isFinite(stored)) return Math.max(1, Math.min(5, Math.round(stored)));
      } catch (error) {
      }
      return 3;
    }

    function storeTouchLookSensitivity(value) {
      try {
        localStorage.setItem(touchControlsLookStorageKey, String(value));
      } catch (error) {
      }
    }

    function shouldUseTouchControls() {
      if (touchControlsMode === "off") return false;
      if (touchControlsMode === "on") return true;
      return isCoarsePointerDevice();
    }

    function shouldShowTouchControls() {
      return !!(
        touchControlsElement &&
        shellControlsEnabled &&
        runtimeStarted &&
        modeScreenElement.hidden &&
        !returningToMainMenu &&
        !loadingOverlayActive &&
        shouldUseTouchControls()
      );
    }

    function getTouchControlStateLabel() {
      if (touchControlsMode === "on") return "On";
      if (touchControlsMode === "off") return "Off";
      return shouldUseTouchControls() ? "Auto on" : "Auto off";
    }

    function getTouchLookLabel() {
      if (touchLookSensitivity <= 1) return "Low";
      if (touchLookSensitivity === 2) return "2";
      if (touchLookSensitivity === 3) return "3";
      if (touchLookSensitivity === 4) return "4";
      return "High";
    }

    function updateTouchControlsUi() {
      commandTouchModeButtons.forEach(function(button) {
        var active = button.getAttribute("data-touch-mode") === touchControlsMode;
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (commandTouchStateElement) commandTouchStateElement.textContent = getTouchControlStateLabel();
      if (commandTouchLookElement) commandTouchLookElement.value = String(touchLookSensitivity);
      if (commandTouchLookValueElement) commandTouchLookValueElement.textContent = getTouchLookLabel();
    }

    function resetTouchMoveThumb() {
      touchMovementState.x = 0;
      touchMovementState.y = 0;
      touchMovementState.active = false;
      if (touchStickThumbElement) touchStickThumbElement.style.transform = "translate(0, 0)";
    }

    function updateTouchControlsVisibility() {
      if (!touchControlsElement) return;
      var visible = shouldShowTouchControls();
      if (!visible) releaseAllTouchInputs();
      touchControlsElement.hidden = !visible;
      touchControlsElement.setAttribute("aria-hidden", visible ? "false" : "true");
      touchControlsElement.setAttribute("data-active", visible ? "true" : "false");
      if (shellElement) shellElement.setAttribute("data-touch-controls", visible ? "true" : "false");
    }

    function setTouchControlsMode(mode, options) {
      options = options || {};
      touchControlsMode = normalizeTouchControlsMode(mode);
      if (options.persist) storeTouchControlsMode(touchControlsMode);
      updateTouchControlsUi();
      updateTouchControlsVisibility();
      if (options.toast) showSaveToast("Touch " + getTouchControlStateLabel());
    }

    function setTouchLookSensitivity(value, options) {
      options = options || {};
      value = Math.max(1, Math.min(5, Math.round(Number(value) || 3)));
      touchLookSensitivity = value;
      if (options.persist) storeTouchLookSensitivity(value);
      updateTouchControlsUi();
    }

    var touchKeyDescriptors = {
      KeyW: { key: "w", code: "KeyW", keyCode: 87 },
      KeyA: { key: "a", code: "KeyA", keyCode: 65 },
      KeyS: { key: "s", code: "KeyS", keyCode: 83 },
      KeyD: { key: "d", code: "KeyD", keyCode: 68 },
      KeyE: { key: "e", code: "KeyE", keyCode: 69 },
      KeyH: { key: "h", code: "KeyH", keyCode: 72 },
      Enter: { key: "Enter", code: "Enter", keyCode: 13 },
      Space: { key: " ", code: "Space", keyCode: 32 },
      Escape: { key: "Escape", code: "Escape", keyCode: 27 }
    };

    function defineSyntheticEventValue(event, name, value) {
      try {
        Object.defineProperty(event, name, {
          configurable: true,
          get: function() { return value; }
        });
      } catch (error) {
        try {
          event[name] = value;
        } catch (ignore) {
        }
      }
    }

    function dispatchCanvasKeyboardEvent(type, code) {
      var descriptor = touchKeyDescriptors[code];
      if (!descriptor || !canvasElement) return;
      try {
        canvasElement.focus({ preventScroll: true });
      } catch (error) {
        canvasElement.focus();
      }
      var event = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key: descriptor.key,
        code: descriptor.code,
        location: 0
      });
      defineSyntheticEventValue(event, "keyCode", descriptor.keyCode);
      defineSyntheticEventValue(event, "which", descriptor.keyCode);
      defineSyntheticEventValue(event, "charCode", type === "keypress" ? descriptor.keyCode : 0);
      canvasElement.dispatchEvent(event);
    }

    function setTouchKeyPressed(code, pressed) {
      pressed = !!pressed;
      if (!pressed && !touchPressedKeys[code]) return;
      if (touchPressedKeys[code] === pressed) return;
      touchPressedKeys[code] = pressed;
      dispatchCanvasKeyboardEvent(pressed ? "keydown" : "keyup", code);
      if (pressed) armPotentialMorrowindLoading("touch " + code);
    }

    function setTouchMovementKeys(normalizedX, normalizedY) {
      var threshold = 0.26;
      setTouchKeyPressed("KeyW", normalizedY < -threshold);
      setTouchKeyPressed("KeyS", normalizedY > threshold);
      setTouchKeyPressed("KeyA", normalizedX < -threshold);
      setTouchKeyPressed("KeyD", normalizedX > threshold);
    }

    function releaseTouchMovementKeys() {
      ["KeyW", "KeyA", "KeyS", "KeyD"].forEach(function(code) {
        setTouchKeyPressed(code, false);
      });
    }

    function canvasCenterPoint() {
      var rect = canvasElement.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    function dispatchCanvasMouseEvent(type, button, buttons, movementX, movementY) {
      if (!canvasElement) return;
      var point = canvasCenterPoint();
      var event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        button: button || 0,
        buttons: buttons || 0,
        clientX: point.x,
        clientY: point.y,
        screenX: window.screenX + point.x,
        screenY: window.screenY + point.y
      });
      defineSyntheticEventValue(event, "movementX", Math.round(movementX || 0));
      defineSyntheticEventValue(event, "movementY", Math.round(movementY || 0));
      canvasElement.dispatchEvent(event);
    }

    function setTouchMouseButtonPressed(button, pressed) {
      pressed = !!pressed;
      if (!pressed && !touchPressedMouseButtons[button]) return;
      if (touchPressedMouseButtons[button] === pressed) return;
      touchPressedMouseButtons[button] = pressed;
      var buttons = pressed ? (button === 2 ? 2 : 1) : 0;
      dispatchCanvasMouseEvent(pressed ? "mousedown" : "mouseup", button, buttons, 0, 0);
      if (pressed) armPotentialMorrowindLoading("touch mouse");
    }

    function touchLookScale() {
      return [0, 0.55, 0.75, 1, 1.35, 1.75][touchLookSensitivity] || 1;
    }

    function requestTouchFrame(callback) {
      return typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(callback)
        : setTimeout(callback, 16);
    }

    function cancelTouchFrame(handle) {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(handle);
      } else {
        clearTimeout(handle);
      }
    }

    function flushTouchLookDelta() {
      touchLookFrame = 0;
      var dx = touchPendingLookDeltaX;
      var dy = touchPendingLookDeltaY;
      touchPendingLookDeltaX = 0;
      touchPendingLookDeltaY = 0;
      if (!dx && !dy) return;
      dispatchCanvasMouseEvent("mousemove", 0, 0, dx, dy);
    }

    function queueTouchLookDelta(dx, dy) {
      var scale = touchLookScale();
      touchPendingLookDeltaX += dx * scale;
      touchPendingLookDeltaY += dy * scale;
      if (!touchLookFrame) {
        touchLookFrame = requestTouchFrame(flushTouchLookDelta);
      }
    }

    function releaseAllTouchInputs() {
      Object.keys(touchPressedKeys).forEach(function(code) {
        setTouchKeyPressed(code, false);
      });
      Object.keys(touchPressedMouseButtons).forEach(function(button) {
        setTouchMouseButtonPressed(Number(button), false);
      });
      touchMovePointerId = null;
      touchLookPointerId = null;
      touchLookLastPoint = null;
      if (touchLookFrame) {
        cancelTouchFrame(touchLookFrame);
        touchLookFrame = 0;
      }
      touchPendingLookDeltaX = 0;
      touchPendingLookDeltaY = 0;
      touchEscapeSentToGame = false;
      resetTouchMoveThumb();
      Object.keys(touchActionButtons).forEach(function(key) {
        var button = touchActionButtons[key];
        if (button) {
          button.__touchPointerId = null;
          button.setAttribute("data-active", "false");
        }
      });
    }

    function prepareTouchControlEvent(event, options) {
      if (!touchControlsElement || touchControlsElement.hidden) return false;
      if (event.pointerType && event.pointerType === "mouse") return false;
      options = options || {};
      event.preventDefault();
      event.stopPropagation();
      if (options.focusCanvas !== false) {
        try {
          canvasElement.focus({ preventScroll: true });
        } catch (error) {
          canvasElement.focus();
        }
      }
      return true;
    }

    function updateTouchMoveFromPointer(event) {
      if (!touchMoveZoneElement) return;
      var rect = touchMoveZoneElement.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var radius = Math.max(34, Math.min(rect.width, rect.height) / 2 - 24);
      var dx = Number(event.clientX) - centerX;
      var dy = Number(event.clientY) - centerY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var scale = distance > radius ? radius / distance : 1;
      var clampedX = dx * scale;
      var clampedY = dy * scale;
      var normalizedX = clampedX / radius;
      var normalizedY = clampedY / radius;
      touchMovementState.x = normalizedX;
      touchMovementState.y = normalizedY;
      touchMovementState.active = true;
      if (touchStickThumbElement) {
        touchStickThumbElement.style.transform = "translate(" + Math.round(clampedX) + "px, " + Math.round(clampedY) + "px)";
      }
      setTouchMovementKeys(normalizedX, normalizedY);
    }

    function endTouchMovePointer(event) {
      if (event && touchMovePointerId !== event.pointerId) return;
      touchMovePointerId = null;
      releaseTouchMovementKeys();
      resetTouchMoveThumb();
    }

    function endTouchLookPointer(event) {
      if (event && touchLookPointerId !== event.pointerId) return;
      touchLookPointerId = null;
      touchLookLastPoint = null;
    }

    function handleTouchMovePointerEvent(event) {
      if (touchMovePointerId !== event.pointerId || !prepareTouchControlEvent(event)) return;
      updateTouchMoveFromPointer(event);
    }

    function handleTouchLookPointerEvent(event) {
      if (touchLookPointerId !== event.pointerId || !prepareTouchControlEvent(event)) return;
      var x = Number(event.clientX);
      var y = Number(event.clientY);
      if (touchLookLastPoint) queueTouchLookDelta(x - touchLookLastPoint.x, y - touchLookLastPoint.y);
      touchLookLastPoint = { x: x, y: y };
    }

    function handleTouchPointerEndEvent(event) {
      if (touchMovePointerId === event.pointerId) {
        if (!prepareTouchControlEvent(event)) return;
        endTouchMovePointer(event);
      } else if (touchLookPointerId === event.pointerId) {
        if (!prepareTouchControlEvent(event)) return;
        endTouchLookPointer(event);
      }
    }

    function installTouchControlHandlers() {
      if (!touchControlsElement || !window.PointerEvent) {
        updateTouchControlsUi();
        updateTouchControlsVisibility();
        return;
      }

      touchMoveZoneElement.addEventListener("pointerdown", function(event) {
        if (!prepareTouchControlEvent(event) || touchMovePointerId !== null) return;
        touchMovePointerId = event.pointerId;
        try { touchMoveZoneElement.setPointerCapture(event.pointerId); } catch (error) {}
        updateTouchMoveFromPointer(event);
      });

      touchMoveZoneElement.addEventListener("pointermove", function(event) {
        handleTouchMovePointerEvent(event);
      });

      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function(type) {
        touchMoveZoneElement.addEventListener(type, function(event) {
          if (!prepareTouchControlEvent(event)) return;
          endTouchMovePointer(event);
        });
      });

      touchLookZoneElement.addEventListener("pointerdown", function(event) {
        if (!prepareTouchControlEvent(event) || touchLookPointerId !== null) return;
        touchLookPointerId = event.pointerId;
        touchLookLastPoint = { x: Number(event.clientX), y: Number(event.clientY) };
        try { touchLookZoneElement.setPointerCapture(event.pointerId); } catch (error) {}
      });

      touchLookZoneElement.addEventListener("pointermove", function(event) {
        handleTouchLookPointerEvent(event);
      });

      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function(type) {
        touchLookZoneElement.addEventListener(type, function(event) {
          if (!prepareTouchControlEvent(event)) return;
          endTouchLookPointer(event);
        });
      });

      document.addEventListener("pointermove", function(event) {
        if (touchMovePointerId === event.pointerId) handleTouchMovePointerEvent(event);
        else if (touchLookPointerId === event.pointerId) handleTouchLookPointerEvent(event);
      }, true);

      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function(type) {
        document.addEventListener(type, handleTouchPointerEndEvent, true);
      });

      function bindTouchAction(button, handlers) {
        if (!button) return;
        button.addEventListener("click", function(event) {
          event.preventDefault();
          event.stopPropagation();
        });
        button.addEventListener("pointerdown", function(event) {
          if (!prepareTouchControlEvent(event) || button.__touchPointerId != null) return;
          button.__touchPointerId = event.pointerId;
          button.setAttribute("data-active", "true");
          try { button.setPointerCapture(event.pointerId); } catch (error) {}
          handlers.down();
        });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach(function(type) {
          button.addEventListener(type, function(event) {
            if (button.__touchPointerId !== event.pointerId ||
                !prepareTouchControlEvent(event, { focusCanvas: handlers.focusCanvasOnEnd !== false })) return;
            button.__touchPointerId = null;
            button.setAttribute("data-active", "false");
            handlers.up();
          });
        });
      }

      bindTouchAction(touchActionButtons.attack, {
        down: function() { setTouchMouseButtonPressed(0, true); },
        up: function() { setTouchMouseButtonPressed(0, false); }
      });
      bindTouchAction(touchActionButtons.menu, {
        down: function() { setTouchMouseButtonPressed(2, true); },
        up: function() { setTouchMouseButtonPressed(2, false); }
      });
      bindTouchAction(touchActionButtons.use, {
        down: function() { setTouchKeyPressed("KeyE", true); },
        up: function() { setTouchKeyPressed("KeyE", false); }
      });
      bindTouchAction(touchActionButtons.confirm, {
        down: function() { setTouchKeyPressed("Enter", true); },
        up: function() { setTouchKeyPressed("Enter", false); }
      });
      bindTouchAction(touchActionButtons.jump, {
        down: function() { setTouchKeyPressed("Space", true); },
        up: function() { setTouchKeyPressed("Space", false); }
      });
      bindTouchAction(touchActionButtons.chat, {
        down: function() {
          setChatPanelOpen(true);
          setTimeout(function() {
            try {
              chatInputElement.focus({ preventScroll: true });
            } catch (error) {
              chatInputElement.focus();
            }
          }, 0);
        },
        up: function() {},
        focusCanvasOnEnd: false
      });
      bindTouchAction(touchActionButtons.escape, {
        down: function() {
          if (closeTopOverlayPanel()) {
            touchEscapeSentToGame = false;
            return;
          }
          touchEscapeSentToGame = true;
          setTouchKeyPressed("Escape", true);
        },
        up: function() {
          if (touchEscapeSentToGame) setTouchKeyPressed("Escape", false);
          touchEscapeSentToGame = false;
        }
      });

      window.addEventListener("blur", releaseAllTouchInputs);
      document.addEventListener("visibilitychange", function() {
        if (document.visibilityState === "hidden") releaseAllTouchInputs();
      });
      updateTouchControlsUi();
      updateTouchControlsVisibility();
    }
