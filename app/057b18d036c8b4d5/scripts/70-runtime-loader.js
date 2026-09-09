    function loadScript(src, async) {
      return new Promise(function(resolve, reject) {
        var script = document.createElement("script");
        script.src = src;
        script.async = !!async;
        script.onload = resolve;
        script.onerror = function() {
          reject(new Error("Failed to load " + src));
        };
        document.body.appendChild(script);
      });
    }

    function loadOptionalRuntimeScript(path) {
      var src = versionedRuntimeFile(path);
      return fetch(src, { credentials: "same-origin" })
        .then(function(response) {
          if (response.status === 404) {
            console.info(path + " not installed; continuing without optional runtime package.");
            return false;
          }
          if (!response.ok) {
            console.warn("Skipping optional runtime package " + path + ": HTTP " + response.status);
            return false;
          }
          return response.text().then(function(source) {
            var script = document.createElement("script");
            script.async = false;
            script.text = source + "\n//# sourceURL=" + src;
            document.body.appendChild(script);
            return true;
          });
        })
        .catch(function(error) {
          console.warn("Skipping optional runtime package " + path, error);
          return false;
        });
    }

    function loadEnabledOptionalRuntimePackages() {
      return getEnabledBrowserRuntimeMods().reduce(function(sequence, mod) {
        return sequence.then(function() {
          return loadOptionalRuntimeScript(mod.runtimeScript).then(function(loaded) {
            browserModLoadState[mod.id] = { loaded: !!loaded };
            updateCommandModList();
            return loaded;
          });
        });
      }, Promise.resolve());
    }

    function patchOpenMwRuntimeCanvasSizing(source) {
      var canvasSetterTarget = "var _emscripten_set_canvas_element_size=(target,width,height)=>{var canvas=findCanvasEventTarget(target);if(!canvas)return-4;canvas.width=width;canvas.height=height;return 0};";
      var canvasSetterPatch = "var _emscripten_set_canvas_element_size=(target,width,height)=>{var canvas=findCanvasEventTarget(target);if(!canvas)return-4;var clamp=typeof window!==\"undefined\"&&window.__openmwClampCanvasSize;if(clamp){var size=clamp(width,height);width=size.width;height=size.height}canvas.width=width;canvas.height=height;return 0};";
      var functionCanvasSetterTarget = "function _emscripten_set_canvas_element_size(target,width,height){target>>>=0;var canvas=findCanvasEventTarget(target);if(canvas){return setCanvasElementSizeCallingThread(target,width,height)}return setCanvasElementSizeMainThread(target,width,height)}";
      var functionCanvasSetterPatch = "function _emscripten_set_canvas_element_size(target,width,height){target>>>=0;var canvas=findCanvasEventTarget(target);var clamp=typeof window!==\"undefined\"&&window.__openmwClampCanvasSize;if(clamp){var size=clamp(width,height);width=size.width;height=size.height}if(canvas){return setCanvasElementSizeCallingThread(target,width,height)}return setCanvasElementSizeMainThread(target,width,height)}";
      var directSetterTarget = "var setCanvasElementSize=(target,width,height)=>{if(!target.controlTransferredOffscreen){target.width=width;target.height=height}else{var sp=stackSave();var targetInt=stringToUTF8OnStack(target.id);_emscripten_set_canvas_element_size(targetInt,width,height);stackRestore(sp)}};";
      var directSetterPatch = "var setCanvasElementSize=(target,width,height)=>{var clamp=typeof window!==\"undefined\"&&window.__openmwClampCanvasSize;if(clamp){var size=clamp(width,height);width=size.width;height=size.height}if(!target.controlTransferredOffscreen){target.width=width;target.height=height}else{var sp=stackSave();var targetInt=stringToUTF8OnStack(target.id);_emscripten_set_canvas_element_size(targetInt,width,height);stackRestore(sp)}};if(typeof Module!==\"undefined\"){Module[\"__openmwSetRuntimeCanvasSize\"]=(width,height)=>{var target=Module[\"canvas\"]||(typeof document!==\"undefined\"?document.getElementById(\"canvas\"):null);if(!target)return-4;if(typeof globalThis!==\"undefined\")globalThis.__openmwAllowOffscreenCanvasResizeUntil=Date.now()+750;setCanvasElementSize(target,width,height);return 0}}";
      var fullscreenResizeTarget = "var dpiScale=strategy.canvasResolutionScaleMode==2?devicePixelRatio:1;if(strategy.canvasResolutionScaleMode!=0){var newWidth=cssWidth*dpiScale|0;var newHeight=cssHeight*dpiScale|0;setCanvasElementSize(target,newWidth,newHeight);if(target.GLctxObject)target.GLctxObject.GLctx.viewport(0,0,newWidth,newHeight)}return restoreOldStyle};";
      var fullscreenResizePatch = "var dpiScale=strategy.canvasResolutionScaleMode==2?devicePixelRatio:1;if(strategy.canvasResolutionScaleMode!=0){var newWidth=cssWidth*dpiScale|0;var newHeight=cssHeight*dpiScale|0;var clamp=typeof window!==\"undefined\"&&window.__openmwClampCanvasSize;if(clamp){var size=clamp(newWidth,newHeight);newWidth=size.width;newHeight=size.height}setCanvasElementSize(target,newWidth,newHeight);if(target.GLctxObject)target.GLctxObject.GLctx.viewport(0,0,newWidth,newHeight)}return restoreOldStyle};";
      var screenSizeTarget = "var _emscripten_get_screen_size=(width,height)=>{HEAP32[width>>2]=screen.width;HEAP32[height>>2]=screen.height};";
      var screenSizePatch = "var _emscripten_get_screen_size=(width,height)=>{var screenWidth=screen.width;var screenHeight=screen.height;var clamp=typeof window!==\"undefined\"&&window.__openmwClampCanvasSize;if(clamp){var size=clamp(screenWidth,screenHeight);screenWidth=size.width;screenHeight=size.height}HEAP32[width>>2]=screenWidth;HEAP32[height>>2]=screenHeight};";
      var cssSizeTarget = "var _emscripten_get_element_css_size=(target,width,height)=>{target=findEventTarget(target);if(!target)return-4;var rect=getBoundingClientRect(target);HEAPF64[width>>3]=rect.width;HEAPF64[height>>3]=rect.height;return 0};";
      var cssSizePatch = "var _emscripten_get_element_css_size=(target,width,height)=>{target=findEventTarget(target);if(!target)return-4;var rect=getBoundingClientRect(target);var cssWidth=rect.width;var cssHeight=rect.height;var reporter=typeof window!==\"undefined\"&&window.__openmwGetReportedSurfaceSize;if(reporter&&target&&target.tagName===\"CANVAS\"){var size=reporter(cssWidth,cssHeight);cssWidth=size.width;cssHeight=size.height}HEAPF64[width>>3]=cssWidth;HEAPF64[height>>3]=cssHeight;return 0};";
      var threadedCssSizeTarget = "(growMemViews(),HEAPF64)[width>>>3>>>0]=rect.width;(growMemViews(),HEAPF64)[height>>>3>>>0]=rect.height;";
      var threadedCssSizePatch = "var cssWidth=rect.width;var cssHeight=rect.height;var reporter=typeof window!==\"undefined\"&&window.__openmwGetReportedSurfaceSize;if(reporter&&target&&target.tagName===\"CANVAS\"){var size=reporter(cssWidth,cssHeight);cssWidth=size.width;cssHeight=size.height}(growMemViews(),HEAPF64)[width>>>3>>>0]=cssWidth;(growMemViews(),HEAPF64)[height>>>3>>>0]=cssHeight;";
      var resizeEventTarget = "var registerUiEventCallback=(target,userData,useCapture,callbackfunc,eventTypeId,eventTypeString,targetThread)=>{var eventSize=36;JSEvents.uiEvent||=_malloc(eventSize);target=findEventTarget(target);var uiEventHandlerFunc=e=>{if(e.target!=target){return}var b=document.body;if(!b){return}var uiEvent=JSEvents.uiEvent;HEAP32[uiEvent>>2]=0;HEAP32[uiEvent+4>>2]=b.clientWidth;HEAP32[uiEvent+8>>2]=b.clientHeight;HEAP32[uiEvent+12>>2]=innerWidth;HEAP32[uiEvent+16>>2]=innerHeight;HEAP32[uiEvent+20>>2]=outerWidth;HEAP32[uiEvent+24>>2]=outerHeight;HEAP32[uiEvent+28>>2]=pageXOffset|0;HEAP32[uiEvent+32>>2]=pageYOffset|0;if(getWasmTableEntry(callbackfunc)(eventTypeId,uiEvent,userData))e.preventDefault()};var eventHandler={target,eventTypeString,eventTypeId,userData,callbackfunc,handlerFunc:uiEventHandlerFunc,useCapture};return JSEvents.registerOrRemoveHandler(eventHandler)};";
      var resizeEventPatch = "var registerUiEventCallback=(target,userData,useCapture,callbackfunc,eventTypeId,eventTypeString,targetThread)=>{var eventSize=36;JSEvents.uiEvent||=_malloc(eventSize);target=findEventTarget(target);var uiEventHandlerFunc=e=>{if(e.target!=target){return}var b=document.body;if(!b){return}var uiEvent=JSEvents.uiEvent;var bodyWidth=b.clientWidth;var bodyHeight=b.clientHeight;var uiWidth=innerWidth;var uiHeight=innerHeight;var uiOuterWidth=outerWidth;var uiOuterHeight=outerHeight;var reporter=typeof window!==\"undefined\"&&window.__openmwGetReportedSurfaceSize;if(eventTypeString===\"resize\"&&reporter){var size=reporter(uiWidth,uiHeight);bodyWidth=size.width;bodyHeight=size.height;uiWidth=size.width;uiHeight=size.height;uiOuterWidth=size.width;uiOuterHeight=size.height}HEAP32[uiEvent>>2]=0;HEAP32[uiEvent+4>>2]=bodyWidth;HEAP32[uiEvent+8>>2]=bodyHeight;HEAP32[uiEvent+12>>2]=uiWidth;HEAP32[uiEvent+16>>2]=uiHeight;HEAP32[uiEvent+20>>2]=uiOuterWidth;HEAP32[uiEvent+24>>2]=uiOuterHeight;HEAP32[uiEvent+28>>2]=pageXOffset|0;HEAP32[uiEvent+32>>2]=pageYOffset|0;if(getWasmTableEntry(callbackfunc)(eventTypeId,uiEvent,userData))e.preventDefault()};var eventHandler={target,eventTypeString,eventTypeId,userData,callbackfunc,handlerFunc:uiEventHandlerFunc,useCapture};return JSEvents.registerOrRemoveHandler(eventHandler)};";
      var threadedResizeEventTarget = "var uiEvent=JSEvents.uiEvent;(growMemViews(),HEAP32)[uiEvent>>>2>>>0]=0;(growMemViews(),HEAP32)[uiEvent+4>>>2>>>0]=b.clientWidth;(growMemViews(),HEAP32)[uiEvent+8>>>2>>>0]=b.clientHeight;(growMemViews(),HEAP32)[uiEvent+12>>>2>>>0]=innerWidth;(growMemViews(),HEAP32)[uiEvent+16>>>2>>>0]=innerHeight;(growMemViews(),HEAP32)[uiEvent+20>>>2>>>0]=outerWidth;(growMemViews(),HEAP32)[uiEvent+24>>>2>>>0]=outerHeight;(growMemViews(),HEAP32)[uiEvent+28>>>2>>>0]=pageXOffset|0;(growMemViews(),HEAP32)[uiEvent+32>>>2>>>0]=pageYOffset|0;";
      var threadedResizeEventPatch = "var uiEvent=JSEvents.uiEvent;var bodyWidth=b.clientWidth;var bodyHeight=b.clientHeight;var uiWidth=innerWidth;var uiHeight=innerHeight;var uiOuterWidth=outerWidth;var uiOuterHeight=outerHeight;var reporter=typeof window!==\"undefined\"&&window.__openmwGetReportedSurfaceSize;if(eventTypeString===\"resize\"&&reporter){var size=reporter(uiWidth,uiHeight);bodyWidth=size.width;bodyHeight=size.height;uiWidth=size.width;uiHeight=size.height;uiOuterWidth=size.width;uiOuterHeight=size.height}(growMemViews(),HEAP32)[uiEvent>>>2>>>0]=0;(growMemViews(),HEAP32)[uiEvent+4>>>2>>>0]=bodyWidth;(growMemViews(),HEAP32)[uiEvent+8>>>2>>>0]=bodyHeight;(growMemViews(),HEAP32)[uiEvent+12>>>2>>>0]=uiWidth;(growMemViews(),HEAP32)[uiEvent+16>>>2>>>0]=uiHeight;(growMemViews(),HEAP32)[uiEvent+20>>>2>>>0]=uiOuterWidth;(growMemViews(),HEAP32)[uiEvent+24>>>2>>>0]=uiOuterHeight;(growMemViews(),HEAP32)[uiEvent+28>>>2>>>0]=pageXOffset|0;(growMemViews(),HEAP32)[uiEvent+32>>>2>>>0]=pageYOffset|0;";
      var fullscreenEventTarget = "var fillFullscreenChangeEventData=eventStruct=>{var fullscreenElement=getFullscreenElement();var isFullscreen=!!fullscreenElement;HEAP8[eventStruct]=isFullscreen;HEAP8[eventStruct+1]=JSEvents.fullscreenEnabled();var reportedElement=isFullscreen?fullscreenElement:JSEvents.previousFullscreenElement;var nodeName=JSEvents.getNodeNameForTarget(reportedElement);var id=reportedElement?.id??\"\";stringToUTF8(nodeName,eventStruct+2,128);stringToUTF8(id,eventStruct+130,128);HEAP32[eventStruct+260>>2]=reportedElement?.clientWidth??0;HEAP32[eventStruct+264>>2]=reportedElement?.clientHeight??0;HEAP32[eventStruct+268>>2]=screen.width;HEAP32[eventStruct+272>>2]=screen.height;if(isFullscreen){JSEvents.previousFullscreenElement=fullscreenElement}};";
      var fullscreenEventPatch = "var fillFullscreenChangeEventData=eventStruct=>{var fullscreenElement=getFullscreenElement();var isFullscreen=!!fullscreenElement;HEAP8[eventStruct]=isFullscreen;HEAP8[eventStruct+1]=JSEvents.fullscreenEnabled();var reportedElement=isFullscreen?fullscreenElement:JSEvents.previousFullscreenElement;var nodeName=JSEvents.getNodeNameForTarget(reportedElement);var id=reportedElement?.id??\"\";var elementWidth=reportedElement?.clientWidth??0;var elementHeight=reportedElement?.clientHeight??0;var screenWidth=screen.width;var screenHeight=screen.height;var reporter=typeof window!==\"undefined\"&&window.__openmwGetReportedSurfaceSize;if(reporter){var size=reporter(elementWidth||screenWidth,elementHeight||screenHeight);elementWidth=size.width;elementHeight=size.height;screenWidth=size.width;screenHeight=size.height}stringToUTF8(nodeName,eventStruct+2,128);stringToUTF8(id,eventStruct+130,128);HEAP32[eventStruct+260>>2]=elementWidth;HEAP32[eventStruct+264>>2]=elementHeight;HEAP32[eventStruct+268>>2]=screenWidth;HEAP32[eventStruct+272>>2]=screenHeight;if(isFullscreen){JSEvents.previousFullscreenElement=fullscreenElement}};";
      var threadedFullscreenEventTarget = "(growMemViews(),HEAP32)[eventStruct+260>>>2>>>0]=reportedElement?.clientWidth??0;(growMemViews(),HEAP32)[eventStruct+264>>>2>>>0]=reportedElement?.clientHeight??0;(growMemViews(),HEAP32)[eventStruct+268>>>2>>>0]=screen.width;(growMemViews(),HEAP32)[eventStruct+272>>>2>>>0]=screen.height;";
      var threadedFullscreenEventPatch = "var elementWidth=reportedElement?.clientWidth??0;var elementHeight=reportedElement?.clientHeight??0;var screenWidth=screen.width;var screenHeight=screen.height;var reporter=typeof window!==\"undefined\"&&window.__openmwGetReportedSurfaceSize;if(reporter){var size=reporter(elementWidth||screenWidth,elementHeight||screenHeight);elementWidth=size.width;elementHeight=size.height;screenWidth=size.width;screenHeight=size.height}(growMemViews(),HEAP32)[eventStruct+260>>>2>>>0]=elementWidth;(growMemViews(),HEAP32)[eventStruct+264>>>2>>>0]=elementHeight;(growMemViews(),HEAP32)[eventStruct+268>>>2>>>0]=screenWidth;(growMemViews(),HEAP32)[eventStruct+272>>>2>>>0]=screenHeight;";
      var mouseEventTarget = "var fillMouseEventData=(eventStruct,e,target)=>{assert(eventStruct%4==0);HEAPF64[eventStruct>>3]=e.timeStamp;var idx=eventStruct>>2;HEAP32[idx+2]=e.screenX;HEAP32[idx+3]=e.screenY;HEAP32[idx+4]=e.clientX;HEAP32[idx+5]=e.clientY;HEAP8[eventStruct+24]=e.ctrlKey;HEAP8[eventStruct+25]=e.shiftKey;HEAP8[eventStruct+26]=e.altKey;HEAP8[eventStruct+27]=e.metaKey;HEAP16[idx*2+14]=e.button;HEAP16[idx*2+15]=e.buttons;HEAP32[idx+8]=e[\"movementX\"];HEAP32[idx+9]=e[\"movementY\"];var rect=getBoundingClientRect(target);HEAP32[idx+10]=e.clientX-(rect.left|0);HEAP32[idx+11]=e.clientY-(rect.top|0)};";
      var mouseEventPatch = "var fillMouseEventData=(eventStruct,e,target)=>{assert(eventStruct%4==0);HEAPF64[eventStruct>>3]=e.timeStamp;var idx=eventStruct>>2;HEAP32[idx+2]=e.screenX;HEAP32[idx+3]=e.screenY;HEAP32[idx+4]=e.clientX;HEAP32[idx+5]=e.clientY;HEAP8[eventStruct+24]=e.ctrlKey;HEAP8[eventStruct+25]=e.shiftKey;HEAP8[eventStruct+26]=e.altKey;HEAP8[eventStruct+27]=e.metaKey;HEAP16[idx*2+14]=e.button;HEAP16[idx*2+15]=e.buttons;var movementX=e[\"movementX\"];var movementY=e[\"movementY\"];var rect=getBoundingClientRect(target);var targetX=Math.round(e.clientX-rect.left);var targetY=Math.round(e.clientY-rect.top);if(target&&target.tagName===\"CANVAS\"&&rect.width&&rect.height){var renderSize=target.__openmwRenderSize||null;var renderWidth=renderSize&&renderSize.width?renderSize.width:target.width;var renderHeight=renderSize&&renderSize.height?renderSize.height:target.height;var scaleX=renderWidth&&rect.width?renderWidth/rect.width:1;var scaleY=renderHeight&&rect.height?renderHeight/rect.height:1;targetX=Math.round((e.clientX-rect.left)*scaleX);targetY=Math.round((e.clientY-rect.top)*scaleY);movementX=Math.round(movementX*scaleX);movementY=Math.round(movementY*scaleY);if(typeof globalThis!==\"undefined\"){globalThis.__openmwLastMouseScale={scaleX:scaleX,scaleY:scaleY,renderWidth:renderWidth,renderHeight:renderHeight,cssWidth:rect.width,cssHeight:rect.height,time:Date.now()}}}HEAP32[idx+8]=movementX;HEAP32[idx+9]=movementY;HEAP32[idx+10]=targetX;HEAP32[idx+11]=targetY};";
      var threadedMouseEventTarget = "var fillMouseEventData=(eventStruct,e,target)=>{(growMemViews(),HEAPF64)[eventStruct>>>3>>>0]=e.timeStamp;var idx=eventStruct>>>2;(growMemViews(),HEAP32)[idx+2>>>0]=e.screenX;(growMemViews(),HEAP32)[idx+3>>>0]=e.screenY;(growMemViews(),HEAP32)[idx+4>>>0]=e.clientX;(growMemViews(),HEAP32)[idx+5>>>0]=e.clientY;(growMemViews(),HEAP8)[eventStruct+24>>>0]=e.ctrlKey;(growMemViews(),HEAP8)[eventStruct+25>>>0]=e.shiftKey;(growMemViews(),HEAP8)[eventStruct+26>>>0]=e.altKey;(growMemViews(),HEAP8)[eventStruct+27>>>0]=e.metaKey;(growMemViews(),HEAP16)[idx*2+14>>>0]=e.button;(growMemViews(),HEAP16)[idx*2+15>>>0]=e.buttons;(growMemViews(),HEAP32)[idx+8>>>0]=e[\"movementX\"];(growMemViews(),HEAP32)[idx+9>>>0]=e[\"movementY\"];var rect=getBoundingClientRect(target);(growMemViews(),HEAP32)[idx+10>>>0]=e.clientX-(rect.left|0);(growMemViews(),HEAP32)[idx+11>>>0]=e.clientY-(rect.top|0)};";
      var threadedMouseEventPatch = "var fillMouseEventData=(eventStruct,e,target)=>{(growMemViews(),HEAPF64)[eventStruct>>>3>>>0]=e.timeStamp;var idx=eventStruct>>>2;(growMemViews(),HEAP32)[idx+2>>>0]=e.screenX;(growMemViews(),HEAP32)[idx+3>>>0]=e.screenY;(growMemViews(),HEAP32)[idx+4>>>0]=e.clientX;(growMemViews(),HEAP32)[idx+5>>>0]=e.clientY;(growMemViews(),HEAP8)[eventStruct+24>>>0]=e.ctrlKey;(growMemViews(),HEAP8)[eventStruct+25>>>0]=e.shiftKey;(growMemViews(),HEAP8)[eventStruct+26>>>0]=e.altKey;(growMemViews(),HEAP8)[eventStruct+27>>>0]=e.metaKey;(growMemViews(),HEAP16)[idx*2+14>>>0]=e.button;(growMemViews(),HEAP16)[idx*2+15>>>0]=e.buttons;var movementX=e[\"movementX\"];var movementY=e[\"movementY\"];var rect=getBoundingClientRect(target);var targetX=Math.round(e.clientX-rect.left);var targetY=Math.round(e.clientY-rect.top);if(target&&target.tagName===\"CANVAS\"&&rect.width&&rect.height){var renderSize=target.__openmwRenderSize||null;var renderWidth=renderSize&&renderSize.width?renderSize.width:target.width;var renderHeight=renderSize&&renderSize.height?renderSize.height:target.height;var scaleX=renderWidth&&rect.width?renderWidth/rect.width:1;var scaleY=renderHeight&&rect.height?renderHeight/rect.height:1;targetX=Math.round((e.clientX-rect.left)*scaleX);targetY=Math.round((e.clientY-rect.top)*scaleY);movementX=Math.round(movementX*scaleX);movementY=Math.round(movementY*scaleY);if(typeof globalThis!==\"undefined\"){globalThis.__openmwLastMouseScale={scaleX:scaleX,scaleY:scaleY,renderWidth:renderWidth,renderHeight:renderHeight,cssWidth:rect.width,cssHeight:rect.height,time:Date.now()}}}(growMemViews(),HEAP32)[idx+8>>>0]=movementX;(growMemViews(),HEAP32)[idx+9>>>0]=movementY;(growMemViews(),HEAP32)[idx+10>>>0]=targetX;(growMemViews(),HEAP32)[idx+11>>>0]=targetY};";

      if (source.indexOf(canvasSetterTarget) !== -1) {
        source = source.replace(canvasSetterTarget, canvasSetterPatch);
      } else if (source.indexOf(functionCanvasSetterTarget) !== -1) {
        source = source.replace(functionCanvasSetterTarget, functionCanvasSetterPatch);
      } else {
        console.warn("OpenMW runtime canvas setter patch target missing");
      }

      if (source.indexOf(directSetterTarget) === -1) {
        console.warn("OpenMW runtime direct canvas setter patch target missing");
      } else {
        source = source.replace(directSetterTarget, directSetterPatch);
      }

      if (source.indexOf(fullscreenResizeTarget) === -1) {
        console.warn("OpenMW runtime fullscreen resize patch target missing");
      } else {
        source = source.replace(fullscreenResizeTarget, fullscreenResizePatch);
      }

      if (source.indexOf(cssSizeTarget) === -1) {
        if (source.indexOf(threadedCssSizeTarget) === -1) {
          console.warn("OpenMW runtime CSS size patch target missing");
        } else {
          source = source.replace(threadedCssSizeTarget, threadedCssSizePatch);
        }
      } else {
        source = source.replace(cssSizeTarget, cssSizePatch);
      }

      if (source.indexOf(resizeEventTarget) === -1) {
        if (source.indexOf(threadedResizeEventTarget) === -1) {
          console.warn("OpenMW runtime resize event patch target missing");
        } else {
          source = source.replace(threadedResizeEventTarget, threadedResizeEventPatch);
        }
      } else {
        source = source.replace(resizeEventTarget, resizeEventPatch);
      }

      if (source.indexOf(fullscreenEventTarget) === -1) {
        if (source.indexOf(threadedFullscreenEventTarget) === -1) {
          console.warn("OpenMW runtime fullscreen event patch target missing");
        } else {
          source = source.replace(threadedFullscreenEventTarget, threadedFullscreenEventPatch);
        }
      } else {
        source = source.replace(fullscreenEventTarget, fullscreenEventPatch);
      }

      if (source.indexOf(mouseEventTarget) !== -1) {
        source = source.replace(mouseEventTarget, mouseEventPatch);
      } else if (source.indexOf(threadedMouseEventTarget) !== -1) {
        source = source.replace(threadedMouseEventTarget, threadedMouseEventPatch);
      } else {
        console.warn("OpenMW runtime mouse event patch target missing");
      }

	      return source;
	    }

    function patchOpenMwRuntimeMouseMovementCarry(source) {
      var roundedMovementTarget = "movementX=Math.round(movementX*scaleX);movementY=Math.round(movementY*scaleY);";
      var roundedMovementPatch = "var scaledMovementX=movementX*scaleX+(Number(target.__openmwMouseMovementCarryX)||0);var scaledMovementY=movementY*scaleY+(Number(target.__openmwMouseMovementCarryY)||0);movementX=scaledMovementX<0?Math.ceil(scaledMovementX-0.5):Math.floor(scaledMovementX+0.5);movementY=scaledMovementY<0?Math.ceil(scaledMovementY-0.5):Math.floor(scaledMovementY+0.5);target.__openmwMouseMovementCarryX=scaledMovementX-movementX;target.__openmwMouseMovementCarryY=scaledMovementY-movementY;";
      if (source.indexOf(roundedMovementTarget) === -1) {
        console.warn("OpenMW runtime mouse movement carry patch target missing");
        return source;
      }
      return source.split(roundedMovementTarget).join(roundedMovementPatch);
    }

    function patchEmscriptenRuntimeScriptUrl(source, src) {
      var scriptUrl = JSON.stringify(src);
      var pthreadScriptTarget = "var _scriptName=globalThis.document?.currentScript?.src;if(ENVIRONMENT_IS_WORKER){_scriptName=self.location.href}";
      var pthreadScriptPatch = "var _scriptName=globalThis.document?.currentScript?.src||" + scriptUrl + ";if(ENVIRONMENT_IS_WORKER){_scriptName=self.location.href}";
      var nodeAwareScriptTarget = "var _scriptName=globalThis.document?.currentScript?.src;if(typeof __filename!=\"undefined\"){_scriptName=__filename}else if(ENVIRONMENT_IS_WORKER){_scriptName=self.location.href}";
      var nodeAwareScriptPatch = "var _scriptName=globalThis.document?.currentScript?.src||" + scriptUrl + ";if(typeof __filename!=\"undefined\"){_scriptName=__filename}else if(ENVIRONMENT_IS_WORKER){_scriptName=self.location.href}";

      if (source.indexOf(pthreadScriptTarget) !== -1) {
        return source.replace(pthreadScriptTarget, pthreadScriptPatch);
      }
      if (source.indexOf(nodeAwareScriptTarget) !== -1) {
        return source.replace(nodeAwareScriptTarget, nodeAwareScriptPatch);
      }

      console.warn("Emscripten runtime script URL patch target missing");
      return source;
    }

	    function patchTes3mpRelayWorkerBootstrap(source) {
	      if (source.indexOf("tes3mp_webrelay_send") === -1) return source;

      var workerInitPreamble = "if(msgData.tes3mpRelayUrl){Module[\"__tes3mpRelayUrl\"]=msgData.tes3mpRelayUrl;Module[\"websocket\"]=Module[\"websocket\"]||{};Module[\"websocket\"][\"url\"]=msgData.tes3mpRelayUrl}if(msgData.tes3mpRelayShared){Module[\"__tes3mpRelayShared\"]=msgData.tes3mpRelayShared;if(typeof self!==\"undefined\")self.__tes3mpRelayShared=msgData.tes3mpRelayShared;if(typeof globalThis!==\"undefined\")globalThis.__tes3mpRelayShared=msgData.tes3mpRelayShared;if(typeof globalThis!==\"undefined\"&&globalThis.__tes3mpWebRelay&&globalThis.__tes3mpWebRelay.adoptShared)globalThis.__tes3mpWebRelay.adoptShared(msgData.tes3mpRelayShared)}";
      var workerInitTarget = "if(cmd==1){let messageQueue=[];";
      var workerInitPatch = "if(cmd==1){" + workerInitPreamble + "let messageQueue=[];";
      var workerInitAssertTarget = "if(cmd==1){workerID=msgData.workerID;let messageQueue=[];";
      var workerInitAssertPatch = "if(cmd==1){workerID=msgData.workerID;" + workerInitPreamble + "let messageQueue=[];";
      var workerThreadStartTarget = "}else if(cmd==2){establishStackSpace(msgData.pthread_ptr);";
      var workerThreadStartPatch = "}else if(cmd==2){" + workerInitPreamble + "establishStackSpace(msgData.pthread_ptr);";
      var workerThreadStartAssertTarget = "}else if(cmd==2){assert(msgData.pthread_ptr);assert(wasmMemory,\"CMD_RUN received before CMD_LOAD\");establishStackSpace(msgData.pthread_ptr);";
      var workerThreadStartAssertPatch = "}else if(cmd==2){" + workerInitPreamble + "assert(msgData.pthread_ptr);assert(wasmMemory,\"CMD_RUN received before CMD_LOAD\");establishStackSpace(msgData.pthread_ptr);";
      var workerSharedPayload = "((typeof Module!==\"undefined\"&&Module[\"__tes3mpRelayShared\"])||(typeof globalThis!==\"undefined\"&&globalThis.__tes3mpRelayShared)||((typeof globalThis!==\"undefined\"&&globalThis.__tes3mpWebRelay&&globalThis.__tes3mpWebRelay.sharedForWorker)?globalThis.__tes3mpWebRelay.sharedForWorker():null))";
      var workerPostPayload = "tes3mpRelayUrl:(typeof Module!==\"undefined\"&&(Module[\"__tes3mpRelayUrl\"]||(Module[\"websocket\"]&&Module[\"websocket\"][\"url\"])))||\"\",tes3mpRelayShared:" + workerSharedPayload;
      var workerPostTarget = "worker.postMessage({cmd:1,handlers,wasmMemory,wasmModule})";
      var workerPostPatch = "worker.postMessage({cmd:1,handlers,wasmMemory,wasmModule," + workerPostPayload + "})";
      var workerPostAssertTarget = "worker.postMessage({cmd:1,handlers,wasmMemory,wasmModule,workerID:worker.workerID})";
      var workerPostAssertPatch = "worker.postMessage({cmd:1,handlers,wasmMemory,wasmModule,workerID:worker.workerID," + workerPostPayload + "})";
      var threadStartPostTarget = "var msg={cmd:2,start_routine:threadParams.startRoutine,arg:threadParams.arg,pthread_ptr:threadParams.pthread_ptr};";
      var threadStartPostPatch = "var msg={cmd:2,start_routine:threadParams.startRoutine,arg:threadParams.arg,pthread_ptr:threadParams.pthread_ptr,tes3mpRelayUrl:(typeof Module!==\"undefined\"&&(Module[\"__tes3mpRelayUrl\"]||(Module[\"websocket\"]&&Module[\"websocket\"][\"url\"])))||\"\",tes3mpRelayShared:" + workerSharedPayload + "};";
      var relayUnavailableTarget = "if(!url||typeof WebSocket===\"undefined\")return false;";
	      var relayUnavailablePatch = "if(!url||typeof WebSocket===\"undefined\"){var hasShared=!!((typeof Module!==\"undefined\"&&Module[\"__tes3mpRelayShared\"])||(typeof globalThis!==\"undefined\"&&globalThis.__tes3mpRelayShared)||(typeof self!==\"undefined\"&&self.__tes3mpRelayShared));if(!hasShared&&this&&this.ensureShared){try{hasShared=!!(this.ensureShared()&&this.sharedConfig)}catch(error){}}if(!hasShared&&!this.reportedUnavailable){this.reportedUnavailable=true;if(typeof Module!==\"undefined\"&&Module[\"printErr\"])Module[\"printErr\"](\"TES3MP web relay unavailable in worker\")}return false;}";
	      var relaySendTarget = "function _tes3mp_webrelay_send(ptr,length){if(length<=0)return length;var start=ptr>>>0;var bytes=(growMemViews(),HEAPU8).slice(start,start+length);return tes3mpWebRelay.send(bytes)}";
	      var relaySendPatch = "function _tes3mp_webrelay_send(ptr,length){if(!tes3mpWebRelay.reportedSend){tes3mpWebRelay.reportedSend=true;if(typeof Module!==\"undefined\"&&Module[\"print\"])Module[\"print\"](\"TES3MP web relay send path active\")}if(length<=0)return length;var start=ptr>>>0;var bytes=(growMemViews(),HEAPU8).slice(start,start+length);return tes3mpWebRelay.send(bytes)}";
	      var relayAutoOpenTarget = "if(typeof globalThis!==\"undefined\"){globalThis.__tes3mpWebRelay=tes3mpWebRelay;if(typeof ENVIRONMENT_IS_PTHREAD===\"undefined\"||!ENVIRONMENT_IS_PTHREAD){setTimeout(function(){try{tes3mpWebRelay.ensureMainReceiver()}catch(error){}},0)}}";
	      var relayAutoOpenPatch = "if(typeof globalThis!==\"undefined\"){globalThis.__tes3mpWebRelay=tes3mpWebRelay}";
	      var relayPreRunTarget = "Module[\"preRun\"]=Module[\"preRun\"]||[];Module[\"preRun\"].push(function(){if(typeof globalThis!==\"undefined\"&&globalThis.__tes3mpWebRelay&&globalThis.__tes3mpWebRelay.ensureMainReceiver){globalThis.__tes3mpWebRelay.ensureMainReceiver()}if(Module[\"print\"])Module[\"print\"](\"TES3MP web preRun initialized.\")});";
	      var relayPreRunEagerPatch = "Module[\"preRun\"]=Module[\"preRun\"]||[];Module[\"preRun\"].push(function(){var relay=typeof globalThis!==\"undefined\"?globalThis.__tes3mpWebRelay:null;if(!relay||!relay.ensureMainReceiver){if(Module[\"print\"])Module[\"print\"](\"TES3MP web preRun initialized.\");return}var relayUrl=\"\";if(relay.relayUrl)relayUrl=relay.relayUrl();relay.ensureMainReceiver();if(relayUrl&&Module[\"addRunDependency\"]&&Module[\"removeRunDependency\"]){var dependency=\"tes3mp-web-relay-ready\";var finished=false;var started=Date.now();Module[\"addRunDependency\"](dependency);function finish(reason){if(finished)return;finished=true;if(Module[\"print\"])Module[\"print\"](\"TES3MP web relay ready: \"+reason);Module[\"removeRunDependency\"](dependency)}function waitForRelay(){var socketState=relay.socket?relay.socket.readyState:-1;var socketOpen=typeof WebSocket!==\"undefined\"&&socketState===WebSocket.OPEN;if(relay.opened||socketOpen){finish(\"open\");return}if(Date.now()-started>8000){if(Module[\"printErr\"])Module[\"printErr\"](\"TES3MP web relay readiness timed out; continuing.\");finish(\"timeout\");return}setTimeout(waitForRelay,25)}waitForRelay()}if(Module[\"print\"])Module[\"print\"](\"TES3MP web preRun initialized.\")});";
	      var relayPreRunPatch = "Module[\"preRun\"]=Module[\"preRun\"]||[];Module[\"preRun\"].push(function(){var relay=typeof globalThis!==\"undefined\"?globalThis.__tes3mpWebRelay:null;if(relay){if(relay.ensureShared)relay.ensureShared();if(relay.startPump)relay.startPump()}if(Module[\"print\"])Module[\"print\"](\"TES3MP web relay armed for lazy connection.\")});";
	      var relayPreRunPrefix = "Module[\"preRun\"]=Module[\"preRun\"]||[];Module[\"preRun\"].push(function(){";
	      var relayPreRunEndMarker = "});var programArgs=";

	      if (source.indexOf(relayAutoOpenPatch) === -1) {
	        if (source.indexOf(relayAutoOpenTarget) === -1) {
	          console.warn("TES3MP relay auto-open patch target missing");
	        } else {
	          source = source.replace(relayAutoOpenTarget, relayAutoOpenPatch);
	        }
	      }

		      if (source.indexOf(relayPreRunPatch) === -1) {
	        if (source.indexOf(relayPreRunEagerPatch) !== -1) {
	          source = source.replace(relayPreRunEagerPatch, relayPreRunPatch);
	        } else if (source.indexOf(relayPreRunTarget) !== -1) {
	          source = source.replace(relayPreRunTarget, relayPreRunPatch);
	        } else {
	          var relayPreRunStart = source.indexOf(relayPreRunPrefix);
	          var relayPreRunEnd = relayPreRunStart >= 0
	            ? source.indexOf(relayPreRunEndMarker, relayPreRunStart)
	            : -1;
	          var relayPreRunSource = relayPreRunStart >= 0 && relayPreRunEnd > relayPreRunStart
	            ? source.slice(relayPreRunStart, relayPreRunEnd + 3)
	            : "";
	          if (relayPreRunSource.indexOf("TES3MP web preRun initialized.") !== -1) {
	            source = source.slice(0, relayPreRunStart) + relayPreRunPatch + source.slice(relayPreRunEnd + 3);
	          } else {
	            console.warn("TES3MP relay preRun readiness patch target missing");
	          }
	        }
	      }

	      if (source.indexOf(workerInitTarget) !== -1) {
	        source = source.replace(workerInitTarget, workerInitPatch);
	      } else if (source.indexOf(workerInitAssertTarget) !== -1) {
        source = source.replace(workerInitAssertTarget, workerInitAssertPatch);
      } else {
        console.warn("TES3MP relay worker init patch target missing");
      }

      if (source.indexOf(workerPostTarget) !== -1) {
        source = source.replace(workerPostTarget, workerPostPatch);
      } else if (source.indexOf(workerPostAssertTarget) !== -1) {
        source = source.replace(workerPostAssertTarget, workerPostAssertPatch);
      } else {
        console.warn("TES3MP relay worker post patch target missing");
      }

      if (source.indexOf(workerThreadStartTarget) !== -1) {
        source = source.replace(workerThreadStartTarget, workerThreadStartPatch);
      } else if (source.indexOf(workerThreadStartAssertTarget) !== -1) {
        source = source.replace(workerThreadStartAssertTarget, workerThreadStartAssertPatch);
      } else {
        console.warn("TES3MP relay worker thread start patch target missing");
      }

      if (source.indexOf(threadStartPostTarget) === -1) {
        console.warn("TES3MP relay thread start post patch target missing");
      } else {
        source = source.replace(threadStartPostTarget, threadStartPostPatch);
      }

      if (source.indexOf(relayUnavailableTarget) !== -1) {
        source = source.replace(relayUnavailableTarget, relayUnavailablePatch);
      }

      if (source.indexOf(relaySendTarget) !== -1) {
        source = source.replace(relaySendTarget, relaySendPatch);
      }

	      return source;
	    }

    function patchTes3mpOffscreenCanvasResizeProxy(source) {
      if (source.indexOf("tes3mp_webrelay_send") === -1 ||
          source.indexOf("__emscripten_set_offscreencanvas_size_on_thread") === -1) {
        return source;
      }

      var offscreenResizePattern = /var\s+setOffscreenCanvasSizeOnTargetThread\s*=\s*\(\s*targetThread\s*,\s*targetCanvas\s*,\s*width\s*,\s*height\s*\)\s*=>\s*\{\s*targetCanvas\s*=\s*targetCanvas\s*\?\s*UTF8ToString\s*\(\s*targetCanvas\s*\)\s*:\s*""\s*;\s*var\s+targetCanvasPtr\s*=\s*0\s*;\s*if\s*\(\s*targetCanvas\s*\)\s*\{\s*targetCanvasPtr\s*=\s*stringToNewUTF8\s*\(\s*targetCanvas\s*\)\s*\}\s*__emscripten_set_offscreencanvas_size_on_thread\s*\(\s*targetThread\s*,\s*targetCanvasPtr\s*,\s*width\s*,\s*height\s*\)\s*;?\s*\}\s*;?/;
      var offscreenResizePatch = "var setOffscreenCanvasSizeOnTargetThread=(targetThread,targetCanvas,width,height)=>{var clamp=typeof globalThis!==\"undefined\"&&globalThis.__openmwClampCanvasSize;if(clamp){var size=clamp(width,height);width=size.width;height=size.height}var allow=typeof globalThis!==\"undefined\"&&globalThis.__openmwAllowOffscreenCanvasResizeUntil&&Date.now()<globalThis.__openmwAllowOffscreenCanvasResizeUntil;if(!allow){if(typeof Module!==\"undefined\"&&Module[\"printErr\"]&&!setOffscreenCanvasSizeOnTargetThread.__reportedSkip){setOffscreenCanvasSizeOnTargetThread.__reportedSkip=true;Module[\"printErr\"](\"TES3MP skipped background offscreen canvas resize after transfer\")}return 0}targetCanvas=targetCanvas?UTF8ToString(targetCanvas):\"\";var targetCanvasPtr=0;if(targetCanvas){targetCanvasPtr=stringToNewUTF8(targetCanvas)}try{if(typeof __emscripten_set_offscreencanvas_size_on_thread===\"function\")__emscripten_set_offscreencanvas_size_on_thread(targetThread,targetCanvasPtr,width,height)}catch(error){if(typeof Module!==\"undefined\"&&Module[\"printErr\"])Module[\"printErr\"](\"TES3MP offscreen canvas resize failed: \"+error)}return 0};";
      if (!offscreenResizePattern.test(source)) {
        console.warn("TES3MP offscreen canvas resize proxy patch target missing");
        return source;
      }
      return source.replace(offscreenResizePattern, offscreenResizePatch);
	    }

    function patchTes3mpCppExceptionDiagnostics(source) {
      if (source.indexOf("tes3mp_webrelay_send") === -1 ||
          source.indexOf("function ___cxa_throw") === -1 ||
          source.indexOf("TES3MP C++ exception before abort") !== -1) {
        return source;
      }

      var cxaThrowTarget = "function ___cxa_throw(ptr,type,destructor){ptr>>>=0;type>>>=0;destructor>>>=0;var info=new ExceptionInfo(ptr);info.init(type,destructor);uncaughtExceptionCount++;abort()}";
      var cxaThrowPatch = "function ___cxa_throw(ptr,type,destructor){ptr>>>=0;type>>>=0;destructor>>>=0;if(typeof Module!==\"undefined\"&&Module[\"printErr\"]){Module[\"printErr\"](\"TES3MP C++ exception before abort ptr=\"+ptr+\" type=\"+type+\" destructor=\"+destructor)}var info=new ExceptionInfo(ptr);info.init(type,destructor);uncaughtExceptionCount++;abort()}";
      if (source.indexOf(cxaThrowTarget) === -1) {
        console.warn("TES3MP C++ exception diagnostic patch target missing");
        return source;
      }
      return source.replace(cxaThrowTarget, cxaThrowPatch);
    }
