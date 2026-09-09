    function patchTes3mpBrowserHostDatagramTransport(source) {
      if (source.indexOf("tes3mp_webrelay_send") === -1 ||
          source.indexOf("var tes3mpWebRelay=") === -1) {
        return source;
      }
      if (source.indexOf("__browserHostDatagramPatch") !== -1) return source;

      var datagramPatch = String.raw`
;(function(){
if(typeof tes3mpWebRelay==="undefined"||tes3mpWebRelay.__browserHostDatagramPatch)return;
tes3mpWebRelay.__browserHostDatagramPatch=true;
tes3mpWebRelay.rxPorts=tes3mpWebRelay.rxPorts||null;
tes3mpWebRelay.txPorts=tes3mpWebRelay.txPorts||null;
tes3mpWebRelay.datagramTransport=function(){var transport=null;if(typeof Module!=="undefined"&&Module["__tes3mpDatagramTransport"])transport=Module["__tes3mpDatagramTransport"];if(!transport&&typeof globalThis!=="undefined"&&globalThis.__tes3mpDatagramTransport)transport=globalThis.__tes3mpDatagramTransport;if(!transport&&typeof self!=="undefined"&&self.__tes3mpDatagramTransport)transport=self.__tes3mpDatagramTransport;return transport||null};
tes3mpWebRelay.normalizePort=function(port){port=Number(port||0);if(!Number.isFinite(port)||port<=0)port=this.targetPort||1;return port&65535};
tes3mpWebRelay.noteTargetPort=function(port){port=this.normalizePort(port);this.targetPort=port;if(this.control)Atomics.store(this.control,4,port|0);return port};
tes3mpWebRelay.adoptShared=function(shared){if(!shared||!shared.buffer)return false;var slotCount=shared.slotCount||this.slotCount;var slotSize=shared.slotSize||this.slotSize;var controlInts=shared.controlInts||this.controlInts;if(this.sharedConfig&&this.sharedConfig.buffer===shared.buffer&&this.slotCount===slotCount&&this.slotSize===slotSize&&this.controlInts===controlInts&&this.control&&this.rxLengths&&this.txLengths)return true;this.sharedConfig=shared;this.slotCount=slotCount;this.slotSize=slotSize;this.controlInts=controlInts;this.control=new Int32Array(shared.buffer,0,controlInts);var lengthsOffset=controlInts*4;var rxPortsOffset=lengthsOffset+slotCount*4;var rxDataOffset=rxPortsOffset+slotCount*4;var txLengthsOffset=rxDataOffset+slotCount*slotSize;var txPortsOffset=txLengthsOffset+slotCount*4;var txDataOffset=txPortsOffset+slotCount*4;this.rxLengths=new Int32Array(shared.buffer,lengthsOffset,slotCount);this.rxPorts=new Int32Array(shared.buffer,rxPortsOffset,slotCount);this.rxSlots=new Uint8Array(shared.buffer,rxDataOffset,slotCount*slotSize);this.txLengths=new Int32Array(shared.buffer,txLengthsOffset,slotCount);this.txPorts=new Int32Array(shared.buffer,txPortsOffset,slotCount);this.txSlots=new Uint8Array(shared.buffer,txDataOffset,slotCount*slotSize);var port=Atomics.load(this.control,4);if(port>0)this.targetPort=port;if(this.isPthread&&this.isPthread())Atomics.add(this.control,5,1);return true};
tes3mpWebRelay.createShared=function(){if(typeof SharedArrayBuffer!=="function")return false;var byteLength=this.controlInts*4+(this.slotCount*8+this.slotCount*this.slotSize)*2;var shared={buffer:new SharedArrayBuffer(byteLength),slotCount:this.slotCount,slotSize:this.slotSize,controlInts:this.controlInts};if(typeof globalThis!=="undefined")globalThis.__tes3mpRelayShared=shared;if(typeof Module!=="undefined")Module["__tes3mpRelayShared"]=shared;if(typeof self!=="undefined")self.__tes3mpRelayShared=shared;this.adoptShared(shared);this.relayUrl();Atomics.store(this.control,3,1);return true};
tes3mpWebRelay.ensureShared=function(){var shared=null;if(typeof Module!=="undefined"&&Module["__tes3mpRelayShared"])shared=Module["__tes3mpRelayShared"];if(!shared&&typeof globalThis!=="undefined"&&globalThis.__tes3mpRelayShared)shared=globalThis.__tes3mpRelayShared;if(!shared&&typeof self!=="undefined"&&self.__tes3mpRelayShared)shared=self.__tes3mpRelayShared;if(shared&&this.adoptShared(shared)){this.relayUrl();return true}return this.createShared()};
tes3mpWebRelay.sharedForWorker=function(){this.ensureShared();return this.sharedConfig||null};
tes3mpWebRelay.reconnectAttempts=Number(tes3mpWebRelay.reconnectAttempts)||0;
tes3mpWebRelay.maxReconnectAttempts=2;
tes3mpWebRelay.nextReconnectAt=Number(tes3mpWebRelay.nextReconnectAt)||0;
tes3mpWebRelay.ticketRefreshPromise=null;
tes3mpWebRelay.ticketRefreshChecked=false;
tes3mpWebRelay.ticketRefreshFailed=false;
tes3mpWebRelay.openSocket=function(receiveOnThisThread){var url=this.relayUrl();if(!url||typeof WebSocket==="undefined")return false;this.opening=true;var socket;try{socket=new WebSocket(url)}catch(error){this.opening=false;this.socket=null;if(typeof Module!=="undefined"&&Module["printErr"])Module["printErr"]("TES3MP web relay socket creation failed: "+error);return false}this.socket=socket;socket.binaryType="arraybuffer";socket.onopen=function(){if(tes3mpWebRelay.socket!==socket)return;tes3mpWebRelay.opened=true;tes3mpWebRelay.opening=false;tes3mpWebRelay.ticketRefreshChecked=false;tes3mpWebRelay.pumpTx()};socket.onmessage=function(event){if(tes3mpWebRelay.socket!==socket)return;if(receiveOnThisThread)tes3mpWebRelay.enqueueShared(new Uint8Array(event.data),tes3mpWebRelay.targetPort)};socket.onerror=function(error){if(tes3mpWebRelay.socket!==socket)return;if(typeof Module!=="undefined"&&Module["printErr"]&&!tes3mpWebRelay.reportedSocketError){tes3mpWebRelay.reportedSocketError=true;Module["printErr"]("TES3MP web relay socket error.")}};socket.onclose=function(){if(tes3mpWebRelay.socket!==socket)return;tes3mpWebRelay.opened=false;tes3mpWebRelay.opening=false;tes3mpWebRelay.socket=null};return true};
tes3mpWebRelay.baseEnsureSendSocket=tes3mpWebRelay.ensureSendSocket;
tes3mpWebRelay.ensureSendSocket=function(){if(this.opened||this.opening)return!!this.socket;if(this.ticketRefreshPromise||this.ticketRefreshFailed)return false;var refreshHook=typeof globalThis!=="undefined"?globalThis.__tes3mpEnsureFreshRelayTicket:null;if(!this.ticketRefreshChecked&&typeof refreshHook==="function"){var refreshResult;try{refreshResult=refreshHook()}catch(error){this.ticketRefreshFailed=true;if(typeof Module!=="undefined"&&Module["printErr"])Module["printErr"]("TES3MP web relay authorization refresh failed: "+error);return false}if(refreshResult&&typeof refreshResult.then==="function"){var relay=this;this.ticketRefreshPromise=Promise.resolve(refreshResult).then(function(){relay.ticketRefreshPromise=null;relay.ticketRefreshChecked=true;relay.reconnectAttempts=0;relay.nextReconnectAt=0;relay.ensureSendSocket()},function(error){relay.ticketRefreshPromise=null;relay.ticketRefreshFailed=true;if(typeof Module!=="undefined"&&Module["printErr"])Module["printErr"]("TES3MP web relay authorization refresh failed: "+error)});return false}}var now=Date.now();if(now<this.nextReconnectAt||this.reconnectAttempts>=this.maxReconnectAttempts)return false;this.reconnectAttempts++;this.nextReconnectAt=now+Math.min(4000,250*Math.pow(2,this.reconnectAttempts-1));if(typeof Module!=="undefined"&&Module["print"])Module["print"]("TES3MP web relay opening on queued packet (attempt "+this.reconnectAttempts+").");return this.baseEnsureSendSocket.call(this)};
tes3mpWebRelay.enqueueRing=function(bytes,port,writeIndex,readIndex,dropIndex,lengths,ports,slots){if(!this.control||!lengths||!ports||!slots)return false;bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||0);var write=Atomics.load(this.control,writeIndex);var read=Atomics.load(this.control,readIndex);var next=(write+1)%this.slotCount;if(next===read){Atomics.store(this.control,readIndex,(read+1)%this.slotCount);Atomics.add(this.control,dropIndex,1)}var length=Math.min(bytes.length,this.slotSize);slots.set(bytes.subarray(0,length),write*this.slotSize);Atomics.store(lengths,write,length);Atomics.store(ports,write,this.normalizePort(port));Atomics.store(this.control,writeIndex,next);Atomics.notify(this.control,writeIndex,1);return true};
tes3mpWebRelay.dequeueRingPacket=function(writeIndex,readIndex,lengths,ports,slots){if(!this.ensureShared())return null;var read=Atomics.load(this.control,readIndex);var write=Atomics.load(this.control,writeIndex);if(read===write)return null;var storedLength=Atomics.load(lengths,read);var length=Math.min(storedLength,this.slotSize);var port=Atomics.load(ports,read);var start=read*this.slotSize;var bytes=slots.slice(start,start+length);Atomics.store(this.control,readIndex,(read+1)%this.slotCount);return{bytes:bytes,port:this.normalizePort(port)}};
tes3mpWebRelay.enqueueShared=function(bytes,sourcePort){sourcePort=this.normalizePort(sourcePort);if(!this.ensureShared()){if(this.recvQueue.length>=this.maxQueue)this.recvQueue.shift();this.recvQueue.push({bytes:bytes,port:sourcePort});return false}return this.enqueueRing(bytes,sourcePort,0,1,2,this.rxLengths,this.rxPorts,this.rxSlots)};
tes3mpWebRelay.enqueueTx=function(bytes,targetPort){targetPort=this.normalizePort(targetPort);if(!this.ensureShared())return false;if(this.enqueueRing(bytes,targetPort,8,9,10,this.txLengths,this.txPorts,this.txSlots)){Atomics.add(this.control,11,1);return true}return false};
tes3mpWebRelay.dequeueShared=function(ptr,capacity){if(!this.ensureShared())return-1;Atomics.add(this.control,6,1);var read=Atomics.load(this.control,1);var write=Atomics.load(this.control,0);if(read===write){if(this.isPthread&&this.isPthread()&&typeof Atomics.wait==="function"){Atomics.wait(this.control,0,write,8);read=Atomics.load(this.control,1);write=Atomics.load(this.control,0)}if(read===write)return-1}var storedLength=Atomics.load(this.rxLengths,read);var length=Math.min(storedLength,capacity,this.slotSize);var port=Atomics.load(this.rxPorts,read);var start=read*this.slotSize;(growMemViews(),HEAPU8).set(this.rxSlots.subarray(start,start+length),ptr>>>0);this.noteTargetPort(port);Atomics.store(this.control,1,(read+1)%this.slotCount);Atomics.add(this.control,7,1);return length};
tes3mpWebRelay.sendPacket=function(bytes,targetPort){var transport=this.datagramTransport();if(transport&&typeof transport.send==="function"){try{var result=transport.send(bytes,this.normalizePort(targetPort));return result===false||result===null||result===undefined||result<=0?-1:result}catch(error){return-1}}var socket=this.socket;if(!socket||socket.readyState!==WebSocket.OPEN)return-1;try{socket.send(bytes);return bytes.length}catch(error){if(this.socket===socket){this.socket=null;this.opened=false;this.opening=false;try{socket.close()}catch(closeError){}}return-1}};
tes3mpWebRelay.hasPendingTx=function(){if(this.sendQueue.length)return true;if(!this.ensureShared()||!this.control)return false;return Atomics.load(this.control,8)!==Atomics.load(this.control,9)};
tes3mpWebRelay.pumpTx=function(){var packet;var transport=this.datagramTransport();var canSend=!!(transport&&typeof transport.send==="function")||!!(this.socket&&this.socket.readyState===WebSocket.OPEN);if(!canSend){if(this.hasPendingTx())this.ensureSendSocket();return}while(this.sendQueue.length){packet=this.sendQueue[0];if(packet instanceof Uint8Array)packet={bytes:packet,port:this.targetPort};if(this.sendPacket(packet.bytes,packet.port)<0){if(!transport)this.ensureSendSocket();return}this.sendQueue.shift();if(this.control)Atomics.add(this.control,12,1)}while(packet=this.dequeueRingPacket(8,9,this.txLengths,this.txPorts,this.txSlots)){if(this.sendPacket(packet.bytes,packet.port)<0){if(this.sendQueue.length>=this.maxQueue)this.sendQueue.shift();this.sendQueue.push(packet);if(!transport)this.ensureSendSocket();return}if(this.control)Atomics.add(this.control,12,1)}};
tes3mpWebRelay.send=function(bytes,targetPort){targetPort=this.normalizePort(targetPort);if(this.isPthread&&this.isPthread()&&this.ensureShared()){this.enqueueTx(bytes,targetPort);return bytes.length}var transport=this.datagramTransport();if(transport&&typeof transport.send==="function")return this.sendPacket(bytes,targetPort);var relayUrl=this.relayUrl?this.relayUrl():"";if(!relayUrl&&this.ensureShared&&this.ensureShared()){this.enqueueTx(bytes,targetPort);return bytes.length}if(this.socket&&this.socket.readyState===WebSocket.OPEN){while(this.sendQueue.length){var packet=this.sendQueue[0];if(packet instanceof Uint8Array)packet={bytes:packet,port:targetPort};if(this.sendPacket(packet.bytes,packet.port)<0)break;this.sendQueue.shift()}if(!this.sendQueue.length&&this.sendPacket(bytes,targetPort)>=0)return bytes.length}if(this.sendQueue.length>=this.maxQueue)this.sendQueue.shift();this.sendQueue.push({bytes:bytes,port:targetPort});this.ensureSendSocket();return bytes.length};
tes3mpWebRelay.recv=function(ptr,capacity){var transport=this.datagramTransport();if(transport&&typeof transport.recv==="function"){var packet=transport.recv(capacity);if(packet){var bytes=packet instanceof Uint8Array?packet:new Uint8Array(packet.bytes||packet.data||packet);var length=Math.min(bytes.length,capacity);this.noteTargetPort(packet.sourcePort||packet.port||this.targetPort);(growMemViews(),HEAPU8).set(bytes.subarray(0,length),ptr>>>0);return length}}var length=this.dequeueShared(ptr,capacity);if(length>0)return length;if(!this.recvQueue.length)return-1;var queued=this.recvQueue.shift();var queuedBytes=queued instanceof Uint8Array?queued:queued.bytes;this.noteTargetPort(queued.port||this.targetPort);length=Math.min(queuedBytes.length,capacity);(growMemViews(),HEAPU8).set(queuedBytes.subarray(0,length),ptr>>>0);return length};
if(tes3mpWebRelay.startPump)tes3mpWebRelay.startPump();
})();`;
      var recvTarget = "function _tes3mp_webrelay_recv(ptr,capacity){return tes3mpWebRelay.recv(ptr,capacity)}";
      if (source.indexOf(recvTarget) === -1) {
        console.warn("TES3MP browser-host datagram patch target missing");
      } else {
        source = source.replace(recvTarget, datagramPatch + recvTarget);
      }

      source = source.replace(
        "function _tes3mp_webrelay_send(ptr,length){if(length<=0)return length;var start=ptr>>>0;var bytes=(growMemViews(),HEAPU8).slice(start,start+length);return tes3mpWebRelay.send(bytes)}",
        "function _tes3mp_webrelay_send(ptr,length,targetPort){if(length<=0)return length;var start=ptr>>>0;var bytes=(growMemViews(),HEAPU8).slice(start,start+length);return tes3mpWebRelay.send(bytes,targetPort)}"
      );
      source = source.replace(
        "function _tes3mp_webrelay_send(ptr,length){if(!tes3mpWebRelay.reportedSend){tes3mpWebRelay.reportedSend=true;if(typeof Module!==\"undefined\"&&Module[\"print\"])Module[\"print\"](\"TES3MP web relay send path active\")}if(length<=0)return length;var start=ptr>>>0;var bytes=(growMemViews(),HEAPU8).slice(start,start+length);return tes3mpWebRelay.send(bytes)}",
        "function _tes3mp_webrelay_send(ptr,length,targetPort){if(!tes3mpWebRelay.reportedSend){tes3mpWebRelay.reportedSend=true;if(typeof Module!==\"undefined\"&&Module[\"print\"])Module[\"print\"](\"TES3MP web relay send path active\")}if(length<=0)return length;var start=ptr>>>0;var bytes=(growMemViews(),HEAPU8).slice(start,start+length);return tes3mpWebRelay.send(bytes,targetPort)}"
      );

      return source;
    }

	    function patchTes3mpOffscreenEgl(source) {
	      if (source.indexOf("tes3mp_webrelay_send") === -1 ||
	          source.indexOf("transferControlToOffscreen") === -1 ||
	          source.indexOf("function _eglCreateContext") === -1) {
	        return source;
	      }

	      var patched = 0;
	      source = source.replace(
	        /function (_egl[A-Za-z0-9_]+)\(([^)]*)\)\{if\(ENVIRONMENT_IS_PTHREAD\)return proxyToMainThread\(\d+,0,1(?:,[^;]*)?\);/g,
	        function(match, name, args) {
	          patched++;
	          return "function " + name + "(" + args + "){";
	        }
	      );
	      if (patched < 10) {
	        console.warn("TES3MP offscreen EGL patch matched " + patched + " functions");
	      }
	      return source;
	    }

	    function patchTes3mpFixedWasmMemoryViews(source) {
	      if (source.indexOf("tes3mp_webrelay_send") === -1 ||
	          source.indexOf("wasmMemory.toResizableBuffer") === -1) {
	        return source;
	      }

	      var memoryTarget = "if(!firefoxMatch||Number(firefoxMatch[1])>=154){try{var b=wasmMemory.toResizableBuffer();growMemViews=()=>{};return b}catch{}}return wasmMemory.buffer";
	      var memoryPatch = "return wasmMemory.buffer";
	      if (source.indexOf(memoryTarget) === -1) {
	        console.warn("TES3MP fixed wasm memory patch target missing");
	        return source;
	      }
	      return source.replace(memoryTarget, memoryPatch);
	    }

	    function patchTes3mpKeyboardTextInput(source) {
	      if (source.indexOf("tes3mp_webrelay_send") === -1 ||
	          source.indexOf("registerKeyEventCallback") === -1) {
	        return source;
	      }

	      var charTarget = 'stringToUTF8(e.char??"",keyEventData+96,32);';
	      var charPatch = 'stringToUTF8(e.char??(e.type=="keypress"?(e.charCode?String.fromCharCode(e.charCode):(typeof e.key=="string"&&e.key.length==1?e.key:"")):""),keyEventData+96,32);';
	      if (source.indexOf(charTarget) === -1) {
	        console.warn("TES3MP keyboard text patch target missing");
	        return source;
	      }
	      return source.replace(charTarget, charPatch);
	    }

	    function patchTes3mpStaleEventCallbackGuard(source) {
	      if (source.indexOf("tes3mp_webrelay_send") === -1 ||
	          source.indexOf("__emscripten_run_callback_on_thread") === -1 ||
	          source.indexOf("var JSEvents={") === -1) {
	        return source;
	      }

	      var helperTarget = "var JSEvents={";
	      var helperPatch = "function tes3mpCanProxyEventToThread(targetThread){return !targetThread||typeof PThread===\"undefined\"||!PThread.pthreads||!!PThread.pthreads[targetThread]}var JSEvents={";
	      if (source.indexOf(helperPatch) === -1) {
	        source = source.replace(helperTarget, helperPatch);
	      }

	      var bareTarget = "if(targetThread)__emscripten_run_callback_on_thread(";
	      var barePatch = "if(targetThread&&tes3mpCanProxyEventToThread(targetThread))__emscripten_run_callback_on_thread(";
	      var bareCount = source.split(bareTarget).length - 1;
	      source = source.split(bareTarget).join(barePatch);

	      var blockTarget = "if(targetThread){__emscripten_run_callback_on_thread(";
	      var blockPatch = "if(targetThread){if(!tes3mpCanProxyEventToThread(targetThread))return;__emscripten_run_callback_on_thread(";
	      var blockCount = source.split(blockTarget).length - 1;
	      source = source.split(blockTarget).join(blockPatch);

	      if (bareCount < 5 || blockCount < 1) {
	        console.warn("TES3MP stale event callback guard patched bare=" + bareCount + " block=" + blockCount);
	      }
	      return source;
	    }

	    function patchTes3mpWorkerWebGLCompat(source) {
	      if (source.indexOf("var GL={") === -1 ||
	          source.indexOf("GLctx.shaderSource") === -1) {
	        return source;
	      }

		      var compatHelper = String.raw`var tes3mpShaderTypes={};var tes3mpShaderSources={};var tes3mpShaderDiagActive=false;function tes3mpShaderDiagEnabled(){return tes3mpShaderDiagActive}function tes3mpShaderSummary(src){return String(src||"").replace(/\s+/g," ").slice(0,1400)}function tes3mpLogLinkedProgram(programId,program){if(!tes3mpShaderDiagEnabled()||typeof Module=="undefined"||!Module["printErr"])return;var shaders=GL&&GL.programShaders?GL.programShaders[programId]:null;var joined="";if(shaders){for(var i=0;i<shaders.length;i++)joined+=" shader"+shaders[i]+":"+tes3mpShaderSummary(tes3mpShaderSources[shaders[i]])}var interesting=programId<=8||/sky|passColor|browserSky|gl_FrontMaterial|v_color|u_materialEmission|diffuseMap|a_color|osg_Color/i.test(joined);var root=typeof globalThis!="undefined"?globalThis:{};root.__tes3mpProgramDiagCount=root.__tes3mpProgramDiagCount||0;if(interesting&&root.__tes3mpProgramDiagCount++<40)Module["printErr"]("TES3MP_PROGRAM_DIAG id="+programId+" shaders="+(shaders?shaders.join(","):"")+" linked="+(GLctx.getProgramParameter?GLctx.getProgramParameter(program,GLctx.LINK_STATUS):"")+" src="+joined)}function tes3mpRecoverGLctx(){try{if(typeof GLctx!="undefined"&&GLctx)return GLctx;if(typeof EGL=="undefined"||EGL.currentContext!==62004||!EGL.context)return null;if(typeof GL!="undefined"&&GL.contexts&&GL.contexts[EGL.context]&&GL.contexts[EGL.context].GLctx){GL.currentContext=GL.contexts[EGL.context];Module["ctx"]=GLctx=GL.currentContext.GLctx;return GLctx}}catch(error){}return null}function tes3mpFixShaderSource(source,shaderType){var src=String(source||"");src=src.replace(/texture2D\s*\(\s*Texture\s*,\s*TexCoord\s*\)\s*\.zyxw/g,"texture2D(Texture, TexCoord)");if(/^\s*#version\s+300\s+es\b/.test(src))return src;var extensions=[];src=src.replace(/^\s*#version[^\n\r]*(?:\r?\n)?/gm,"");src=src.replace(/^\s*#extension[^\n\r]*(?:\r?\n)?/gm,function(line){var trimmed=line.trim();if(/GL_ARB_uniform_buffer_object|GL_EXT_gpu_shader4|GL_EXT_geometry_shader|GL_EXT_texture_array|GL_OES_standard_derivatives/.test(trimmed))return "";extensions.push(trimmed);return ""});src=src.replace(/\bcentroid\s+(?=varying\b)/g,"");src=src.replace(/\bgl_FragData\s*\[\s*0\s*\]/g,"gl_FragColor");src=src.replace(/^\s*gl_FragData\s*\[\s*[1-9]\d*\s*\]\s*(?:\.[xyzwrgba]{1,4})?\s*=\s*[^;]+;\s*$/gm,"");src=src.replace(/(uniform\s+(?:bool|int|float|vec[234]|mat[234]|sampler2D|samplerCube|sampler2DShadow)\s+\w+)\s*=\s*[^;]+;/g,"$1;");var needsEs300=/\buniform\s+\w+\s*\{/.test(src)||/\blayout\s*\([^)]*\)\s*uniform\s+\w+\s*\{/.test(src);if(needsEs300){var fragmentOutput="";src=src.replace(/\btexture2D\s*\(/g,"texture(").replace(/\btextureCube\s*\(/g,"texture(");if(shaderType===35633){src=src.replace(/\battribute\b/g,"in").replace(/\bvarying\b/g,"out")}else if(shaderType===35632){src=src.replace(/\bvarying\b/g,"in");if(/\bgl_FragColor\b/.test(src)){fragmentOutput="out vec4 browserFragColor;\n";src=src.replace(/\bgl_FragColor\b/g,"browserFragColor")}}return ["#version 300 es",extensions.join("\n"),"precision highp int;","precision highp float;",fragmentOutput+src].filter(Boolean).join("\n")}var prefix=extensions.length?extensions.join("\n")+"\n":"";if(!/\bprecision\s+(?:lowp|mediump|highp)\s+int\s*;/.test(src))prefix+="precision highp int;\n";if(!/\bprecision\s+(?:lowp|mediump|highp)\s+float\s*;/.test(src)){if(shaderType===35632){prefix+="#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n"}else{prefix+="precision highp float;\n"}}return prefix+src}`;
		      compatHelper = compatHelper.replace(
		        'if(/^\\s*#version\\s+300\\s+es\\b/.test(src))return src;',
		        'if(/^\\s*#version\\s+300\\s+es\\b/.test(src)){if(shaderType===35632&&!/\\bprecision\\s+(?:lowp|mediump|highp)\\s+float\\s*;/.test(src)){src=src.replace(/(#version\\s+300\\s+es\\s*(?:\\r?\\n(?:\\s*#extension[^\\n\\r]*\\r?\\n)*)?)/,"$1precision highp int;\\nprecision highp float;\\n")}return src;}'
		      );
		      if (/(?:^|[?&])(?:tes3mpshaderdiag|tes3mpdrawtrace)=1(?:&|$)/.test(window.location.search)) {
		        compatHelper = compatHelper.replace("var tes3mpShaderDiagActive=false;", "var tes3mpShaderDiagActive=true;");
		      }
		      compatHelper += String.raw`function tes3mpReplaceLegacyAttribute(src,legacyName,webName){return src.indexOf(legacyName)!==-1&&src.indexOf(webName)!==-1?src.replace(new RegExp("\\b"+legacyName+"\\b","g"),webName):src}function tes3mpEnsureUniform(src,type,name){if(new RegExp("\\buniform\\s+"+type+"\\s+"+name+"\\s*;").test(src)||!new RegExp("\\b"+name+"\\b").test(src))return src;var decl="uniform "+type+" "+name+";\n";var precision=/((?:precision\s+(?:lowp|mediump|highp)\s+(?:float|int)\s*;\s*)+)/;return precision.test(src)?src.replace(precision,"$1"+decl):decl+src}function tes3mpReplaceLegacyMaterialBuiltins(src){src=src.replace(/\bgl_FrontMaterial\.emission\b/g,"browserMaterialEmission");src=src.replace(/\bgl_FrontMaterial\.ambient\b/g,"browserMaterialAmbient");src=src.replace(/\bgl_FrontMaterial\.diffuse\b/g,"browserMaterialDiffuse");src=src.replace(/\bgl_FrontMaterial\.specular\b/g,"browserMaterialSpecular");src=src.replace(/\bgl_FrontMaterial\.shininess\b/g,"browserMaterialShininess");src=src.replace(/\bgl_FrontLightModelProduct\.sceneColor\b/g,"browserLightModelSceneColor");src=src.replace(/\bgl_LightModel\.ambient\b/g,"browserLightModelAmbient");src=tes3mpEnsureUniform(src,"vec4","browserMaterialEmission");src=tes3mpEnsureUniform(src,"vec4","browserMaterialAmbient");src=tes3mpEnsureUniform(src,"vec4","browserMaterialDiffuse");src=tes3mpEnsureUniform(src,"vec4","browserMaterialSpecular");src=tes3mpEnsureUniform(src,"float","browserMaterialShininess");src=tes3mpEnsureUniform(src,"vec4","browserLightModelAmbient");src=tes3mpEnsureUniform(src,"vec4","browserLightModelSceneColor");return src}var tes3mpDefaultMaterialAmbient=new Float32Array([0.2,0.2,0.2,1]);var tes3mpDefaultMaterialDiffuse=new Float32Array([1,1,1,1]);var tes3mpDefaultMaterialSpecular=new Float32Array([0,0,0,1]);var tes3mpDefaultMaterialEmission=new Float32Array([0,0,0,1]);var tes3mpDefaultLightModelAmbient=new Float32Array([0.2,0.2,0.2,1]);var tes3mpMaterialSceneColor=new Float32Array([0.2,0.2,0.2,1]);var tes3mpLegacyMaterialUniformCache=typeof WeakMap!="undefined"?new WeakMap():null;function tes3mpLegacyVec4(value,fallback){return value&&value.length>=4?value:fallback}function tes3mpGetLegacyMaterialUniforms(program){if(!program||!GLctx||!GLctx.getUniformLocation)return null;if(tes3mpLegacyMaterialUniformCache){var cached=tes3mpLegacyMaterialUniformCache.get(program);if(cached)return cached}var uniforms={emission:GLctx.getUniformLocation(program,"browserMaterialEmission"),ambient:GLctx.getUniformLocation(program,"browserMaterialAmbient"),diffuse:GLctx.getUniformLocation(program,"browserMaterialDiffuse"),specular:GLctx.getUniformLocation(program,"browserMaterialSpecular"),shininess:GLctx.getUniformLocation(program,"browserMaterialShininess"),lightAmbient:GLctx.getUniformLocation(program,"browserLightModelAmbient"),sceneColor:GLctx.getUniformLocation(program,"browserLightModelSceneColor")};if(tes3mpLegacyMaterialUniformCache)tes3mpLegacyMaterialUniformCache.set(program,uniforms);return uniforms}function tes3mpApplyLegacyMaterialUniforms(){if(typeof GLctx=="undefined"||!GLctx||typeof GLEmulation=="undefined")return;var program=GLctx.currentProgram||(typeof GL!="undefined"&&GL.currProgram&&GL.programs?GL.programs[GL.currProgram]:null);if(!program)return;var uniforms=tes3mpGetLegacyMaterialUniforms(program);if(!uniforms)return;var ambient=tes3mpLegacyVec4(GLEmulation.materialAmbient,tes3mpDefaultMaterialAmbient);var diffuse=tes3mpLegacyVec4(GLEmulation.materialDiffuse,tes3mpDefaultMaterialDiffuse);var specular=tes3mpLegacyVec4(GLEmulation.materialSpecular,tes3mpDefaultMaterialSpecular);var hasLighting=!!GLEmulation.lightingEnabled;var emission=hasLighting?tes3mpLegacyVec4(GLEmulation.materialEmission,tes3mpDefaultMaterialEmission):tes3mpDefaultMaterialEmission;var lightAmbient=tes3mpLegacyVec4(GLEmulation.lightModelAmbient,tes3mpDefaultLightModelAmbient);if(uniforms.emission)GLctx.uniform4fv(uniforms.emission,emission);if(uniforms.ambient)GLctx.uniform4fv(uniforms.ambient,ambient);if(uniforms.diffuse)GLctx.uniform4fv(uniforms.diffuse,diffuse);if(uniforms.specular)GLctx.uniform4fv(uniforms.specular,specular);if(uniforms.shininess)GLctx.uniform1f(uniforms.shininess,GLEmulation.materialShininess?GLEmulation.materialShininess[0]||0:0);if(uniforms.lightAmbient)GLctx.uniform4fv(uniforms.lightAmbient,lightAmbient);if(uniforms.sceneColor){tes3mpMaterialSceneColor[0]=lightAmbient[0]*ambient[0]+emission[0];tes3mpMaterialSceneColor[1]=lightAmbient[1]*ambient[1]+emission[1];tes3mpMaterialSceneColor[2]=lightAmbient[2]*ambient[2]+emission[2];tes3mpMaterialSceneColor[3]=1;GLctx.uniform4fv(uniforms.sceneColor,tes3mpMaterialSceneColor)}}var tes3mpBaseFixShaderSource=tes3mpFixShaderSource;tes3mpFixShaderSource=function(source,shaderType){var src=tes3mpBaseFixShaderSource(source,shaderType);src=tes3mpReplaceLegacyAttribute(src,"gl_Vertex","osg_Vertex");src=tes3mpReplaceLegacyAttribute(src,"gl_Color","osg_Color");src=tes3mpReplaceLegacyAttribute(src,"gl_Normal","osg_Normal");src=tes3mpReplaceLegacyAttribute(src,"gl_MultiTexCoord0","osg_MultiTexCoord0");src=tes3mpReplaceLegacyAttribute(src,"gl_MultiTexCoord1","osg_MultiTexCoord1");src=src.replace(/\bgl_ModelViewProjectionMatrix\b/g,"osg_ModelViewProjectionMatrix");src=src.replace(/\bgl_ModelViewMatrixInverse\b/g,"osg_ModelViewMatrixInverse");src=src.replace(/\bgl_ModelViewMatrix\b/g,"osg_ModelViewMatrix");src=src.replace(/\bgl_ProjectionMatrix\b/g,"osg_ProjectionMatrix");src=tes3mpEnsureUniform(src,"mat4","osg_ModelViewProjectionMatrix");src=tes3mpEnsureUniform(src,"mat4","osg_ModelViewMatrixInverse");src=tes3mpEnsureUniform(src,"mat4","osg_ModelViewMatrix");src=tes3mpEnsureUniform(src,"mat4","osg_ProjectionMatrix");src=src.replace(/\bgl_ClipVertex\s*=\s*[^;]+;/g,"");src=src.replace(/\bgl_NormalMatrix\b/g,"osg_NormalMatrix");src=src.replace(/\ba_normalMatrix\b/g,"osg_NormalMatrix");src=tes3mpEnsureUniform(src,"mat3","osg_NormalMatrix");src=src.replace(/\bgl_TextureMatrix\s*\[\s*\d+\s*\]/g,"mat4(1.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*constantAttenuation\b/g,"1.0");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*linearAttenuation\b/g,"0.0");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*quadraticAttenuation\b/g,"0.0");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*position\s*\.\s*xyz\b/g,"vec3(0.0, 0.0, 1.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*position\b/g,"vec4(0.0, 0.0, 1.0, 0.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*diffuse\s*\.\s*xyz\b/g,"vec3(1.0, 1.0, 1.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*diffuse\b/g,"vec4(1.0, 1.0, 1.0, 1.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*ambient\s*\.\s*xyz\b/g,"vec3(0.2, 0.2, 0.2)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*ambient\b/g,"vec4(0.2, 0.2, 0.2, 1.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*specular\b/g,"vec4(0.0, 0.0, 0.0, 1.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*spotDirection\b/g,"vec3(0.0, 0.0, -1.0)");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*spotCosCutoff\b/g,"-1.0");src=src.replace(/\bgl_LightSource\s*\[\s*[^\]]+\s*\]\s*\.\s*spotExponent\b/g,"0.0");src=src.replace(/\bgl_FrontLightProduct\s*\[\s*[^\]]+\s*\]\s*\.\s*ambient\b/g,"vec4(0.2, 0.2, 0.2, 1.0)");src=src.replace(/\bgl_FrontLightProduct\s*\[\s*[^\]]+\s*\]\s*\.\s*diffuse\b/g,"vec4(1.0, 1.0, 1.0, 1.0)");src=src.replace(/\bgl_FrontLightProduct\s*\[\s*[^\]]+\s*\]\s*\.\s*specular\b/g,"vec4(0.0, 0.0, 0.0, 1.0)");src=tes3mpReplaceLegacyMaterialBuiltins(src);src=src.replace(/\bgl_Fog\.start\b/g,"3072.0");src=src.replace(/\bgl_Fog\.end\b/g,"7168.0");src=src.replace(/\bgl_Fog\.scale\b/g,"0.000244140625");src=src.replace(/\bgl_Fog\.density\b/g,"0.0");src=src.replace(/\bgl_Fog\.color\b/g,"vec4(0.807843, 0.890196, 1.0, 1.0)");return src};`;
		      compatHelper = compatHelper.replace(
		        'var tes3mpDefaultMaterialAmbient=new Float32Array([0.2,0.2,0.2,1]);var tes3mpDefaultMaterialDiffuse=new Float32Array([1,1,1,1]);var tes3mpDefaultMaterialSpecular=new Float32Array([0,0,0,1]);var tes3mpDefaultMaterialEmission=new Float32Array([0,0,0,1]);var tes3mpDefaultLightModelAmbient=new Float32Array([0.2,0.2,0.2,1]);var tes3mpMaterialSceneColor=new Float32Array([0.2,0.2,0.2,1]);var tes3mpLegacyMaterialUniformCache=typeof WeakMap!="undefined"?new WeakMap():null;function tes3mpLegacyVec4(value,fallback){return value&&value.length>=4?value:fallback}',
		        'var tes3mpDefaultMaterialAmbient=new Float32Array([0.32,0.30,0.26,1]);var tes3mpDefaultMaterialDiffuse=new Float32Array([1,1,1,1]);var tes3mpDefaultMaterialSpecular=new Float32Array([0,0,0,1]);var tes3mpDefaultMaterialEmission=new Float32Array([0.035,0.032,0.028,1]);var tes3mpDefaultLightModelAmbient=new Float32Array([0.42,0.38,0.32,1]);var tes3mpMaterialSceneColor=new Float32Array([0.18,0.16,0.13,1]);var tes3mpLegacyMaterialUniformCache=typeof WeakMap!="undefined"?new WeakMap():null;function tes3mpLegacyColorTooDark(value){return !value||value.length<3||Number(value[0]||0)+Number(value[1]||0)+Number(value[2]||0)<0.015}function tes3mpLegacyVec4(value,fallback){return value&&value.length>=4&&!tes3mpLegacyColorTooDark(value)?value:fallback}'
		      );
		      compatHelper = compatHelper.replace(
		        'var specular=tes3mpLegacyVec4(GLEmulation.materialSpecular,tes3mpDefaultMaterialSpecular);',
		        'var specular=GLEmulation.materialSpecular&&GLEmulation.materialSpecular.length>=4?GLEmulation.materialSpecular:tes3mpDefaultMaterialSpecular;'
		      );
		      compatHelper += String.raw`
var tes3mpDefaultFogColor=new Float32Array([0.807843,0.890196,1.0,1.0]);
var tes3mpFogMaterialBaseReplace=tes3mpReplaceLegacyMaterialBuiltins;
tes3mpReplaceLegacyMaterialBuiltins=function(src){
  src=tes3mpFogMaterialBaseReplace(src);
  src=src.replace(/\bgl_Fog\.color\b/g,"browserFogColor");
  src=tes3mpEnsureUniform(src,"highp vec4","browserFogColor");
  return src;
};
var tes3mpFogMaterialBaseUniforms=tes3mpGetLegacyMaterialUniforms;
tes3mpGetLegacyMaterialUniforms=function(program){
  var uniforms=tes3mpFogMaterialBaseUniforms(program);
  if(uniforms&&uniforms.fogColor===undefined){
    uniforms.fogColor=GLctx.getUniformLocation(program,"browserFogColor");
  }
  return uniforms;
};
var tes3mpFogMaterialBaseApply=tes3mpApplyLegacyMaterialUniforms;
tes3mpApplyLegacyMaterialUniforms=function(){
  tes3mpFogMaterialBaseApply();
  try{
    if(typeof GLctx=="undefined"||!GLctx||typeof GLEmulation=="undefined")return;
    var program=GLctx.currentProgram||(typeof GL!="undefined"&&GL.currProgram&&GL.programs?GL.programs[GL.currProgram]:null);
    if(!program)return;
    var uniforms=tes3mpGetLegacyMaterialUniforms(program);
    if(!uniforms||!uniforms.fogColor)return;
    GLctx.uniform4fv(uniforms.fogColor,tes3mpLegacyVec4(GLEmulation.fogColor,tes3mpDefaultFogColor));
  }catch(error){}
};
`;
		      compatHelper += String.raw`
function tes3mpIsSkyShader(src){
  src=String(src||"");
  if(/\bPASS_CLOUDS\b|\bPASS_ATMOSPHERE\b/.test(src))return true;
  if(/\bbrowserScreenSky\b|\bbrowserSky(?:Emission|Alpha|Color)\b/.test(src))return true;
  if(/\bpaint(?:Atmosphere|AtmosphereNight|Clouds)\s*\(/.test(src))return true;
  return /\bpassColor\b/.test(src)&&/\b(diffuseMapUV|cloudsUV|TexCoord|sampleSkyColor)\b/.test(src)&&/\b(diffuseMap|Texture|sky)\b/.test(src);
}
function tes3mpHasSkyTextureInputs(src){
  return /\bdiffuseMap\b/.test(src)&&/\bdiffuseMapUV\b/.test(src)&&/\bpassColor\b/.test(src);
}
function tes3mpFixSimpleSkyTextureShader(src){
  if(!tes3mpIsSkyShader(src)||!/\bgl_FragColor\s*=\s*texture2D\s*\(\s*diffuseMap\s*,\s*diffuseMapUV\s*\)\s*\*\s*passColor\s*;/.test(src)||/\bbrowserSimpleSkyPassColor\b/.test(src))return src;
  return src.replace(/\bgl_FragColor\s*=\s*texture2D\s*\(\s*diffuseMap\s*,\s*diffuseMapUV\s*\)\s*\*\s*passColor\s*;/,[
    "vec4 browserSimpleSkyPassColor = passColor;",
    "float browserSimpleSkyLuma = dot(max(browserSimpleSkyPassColor.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
    "if (browserSimpleSkyLuma < 0.015) {",
    "    browserSimpleSkyPassColor.rgb = gl_Fog.color.rgb;",
    "    browserSimpleSkyPassColor.a = max(browserSimpleSkyPassColor.a, 1.0);",
    "}",
    "vec4 browserSimpleSkyTexel = texture2D(diffuseMap, diffuseMapUV);",
    "gl_FragColor = browserSimpleSkyTexel * browserSimpleSkyPassColor;",
    "float browserSimpleSkyOutLuma = dot(max(gl_FragColor.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
    "float browserSimpleSkyFogLuma = dot(max(gl_Fog.color.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
    "if (browserSimpleSkyLuma < 0.015 && browserSimpleSkyOutLuma < 0.015 && browserSimpleSkyFogLuma >= 0.015) {",
    "    gl_FragColor.rgb = gl_Fog.color.rgb * max(browserSimpleSkyTexel.a, 0.65);",
    "    gl_FragColor.a = 1.0;",
    "}"
  ].join("\n    "));
}
		function tes3mpSkyPatchEnabled(){
	  try{return typeof location=="undefined"||(!/(?:^|[?&])no-tes3mpvisualparity=1(?:&|$)/.test(location.search)&&!/(?:^|[?&])no-skypatch=1(?:&|$)/.test(location.search))}catch(error){return true}
	}
function tes3mpFixPackagedBrowserSkyShader(src){
  if(!tes3mpIsSkyShader(src)||!/\bPASS_ATMOSPHERE_NIGHT\b/.test(src)||!/\bbrowserScreenSky\b/.test(src))return src;
  src=src.replace(/if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*gl_Position\s*=\s*vec4\s*\(\s*((?:gl|osg)_Vertex)\.xy\s*,\s*0\.0\s*,\s*1\.0\s*\)\s*;\s*\n\s*else\s*\n\s*gl_Position\s*=\s*modelToClip\s*\(\s*((?:gl|osg)_Vertex)\s*\)\s*;/,
    function(match,screenVertexName,modelVertexName){var vertexName=screenVertexName||modelVertexName||"osg_Vertex";return [
      "vec2 browserSkyClipPosition = "+vertexName+".xy;",
      "if (pass == PASS_ATMOSPHERE_NIGHT &&",
      "    browserSkyClipPosition.x >= -0.001 && browserSkyClipPosition.x <= 1.001 &&",
      "    browserSkyClipPosition.y >= -0.001 && browserSkyClipPosition.y <= 1.001)",
      "    browserSkyClipPosition = browserSkyClipPosition * 2.0 - 1.0;",
      "if (browserScreenSky != 0 || pass == PASS_ATMOSPHERE_NIGHT)",
      "    gl_Position = vec4(browserSkyClipPosition, 0.0, 1.0);",
      "else",
      "    gl_Position = modelToClip("+vertexName+");"
    ].join("\n")});
  src=src.replace(/if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE_NIGHT\s*\)\s*\n\s*paintAtmosphereNight\s*\(\s*color\s*\)\s*;/,[
    "if (pass == PASS_ATMOSPHERE_NIGHT)",
    "    paintAtmosphereNight(color);",
    "else if (pass == PASS_CLOUDS)",
    "    paintClouds(color);",
    "else if (browserScreenSky != 0)",
    "    paintAtmosphere(color);",
    "else if (pass == PASS_ATMOSPHERE)",
    "    paintAtmosphere(color);"
  ].join("\n"));
  if(tes3mpHasSkyTextureInputs(src)&&/\bpaintAtmosphere\b/.test(src)&&!/\bbrowserClassicSkyEmission\b/.test(src)){
    src=src.replace(/void\s+paintAtmosphere\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,[
      "void paintAtmosphere(inout vec4 color)",
      "{",
      "    vec4 browserClassicSkyEmission = browserMaterialEmission;",
      "    float browserSkyEmissionLuma = dot(max(browserClassicSkyEmission.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
      "    vec3 browserUniformSkyEmission = max(browserSkyEmission.rgb, vec3(0.0));",
      "    float browserUniformSkyLuma = dot(browserUniformSkyEmission, vec3(0.2126, 0.7152, 0.0722));",
      "    if (browserSkyEmissionLuma < 0.12)",
      "        browserClassicSkyEmission.rgb = browserUniformSkyLuma >= 0.015 ? browserUniformSkyEmission : gl_Fog.color.rgb;",
      "    color = browserClassicSkyEmission;",
      "    color.a = browserSkyEmissionLuma < 0.12 ? max(color.a * passColor.a, browserClassicSkyEmission.a) : color.a * passColor.a;",
      "}"
    ].join("\n"));
  }
  if(tes3mpHasSkyTextureInputs(src)&&/\bpaintClouds\b/.test(src)&&!/\bbrowserClassicCloudSample\b/.test(src)){
    src=src.replace(/void\s+paintClouds\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,[
      "void paintClouds(inout vec4 color)",
      "{",
      "    vec4 browserClassicCloudSample = texture2D(diffuseMap, diffuseMapUV);",
      "    color = browserClassicCloudSample;",
      "    color.a *= passColor.a * opacity;",
      "    vec3 browserClassicCloudEmission = max(browserMaterialEmission.xyz, vec3(0.0));",
      "    float browserCloudEmissionLuma = dot(browserClassicCloudEmission, vec3(0.2126, 0.7152, 0.0722));",
      "    vec3 browserUniformCloudEmission = max(browserSkyEmission.rgb, vec3(0.0));",
      "    float browserUniformCloudLuma = dot(browserUniformCloudEmission, vec3(0.2126, 0.7152, 0.0722));",
      "    vec3 browserVertexCloudEmission = max(passColor.rgb, vec3(0.0));",
      "    float browserVertexCloudLuma = dot(browserVertexCloudEmission, vec3(0.2126, 0.7152, 0.0722));",
      "    if (browserCloudEmissionLuma < 0.12)",
      "        browserClassicCloudEmission = browserUniformCloudLuma >= 0.015 ? browserUniformCloudEmission : (browserVertexCloudLuma >= 0.015 ? browserVertexCloudEmission : gl_Fog.color.rgb);",
      "    color.xyz = clamp(color.xyz * browserClassicCloudEmission, 0.0, 1.0);",
      "    color = mix(vec4(gl_Fog.color.xyz, color.a), color, passColor.a);",
      "}"
    ].join("\n"));
  }
  if(tes3mpHasSkyTextureInputs(src)&&/\bpaintAtmosphereNight\b/.test(src)&&!/\bbrowserClassicNightSample\b/.test(src)){
    src=src.replace(/void\s+paintAtmosphereNight\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,[
      "void paintAtmosphereNight(inout vec4 color)",
      "{",
      "    vec4 browserClassicNightSample = texture2D(diffuseMap, diffuseMapUV);",
      "    float browserClassicNightRgbMask = dot(max(browserClassicNightSample.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
      "    float browserClassicNightAlphaMask = clamp(browserClassicNightSample.a, 0.0, 1.0);",
      "    float browserClassicNightMask = smoothstep(0.018, 0.72, min(browserClassicNightRgbMask, browserClassicNightAlphaMask));",
      "    vec3 browserClassicNightMaterialTint = max(browserMaterialEmission.rgb, vec3(0.0));",
      "    float browserClassicNightMaterialLuma = dot(browserClassicNightMaterialTint, vec3(0.2126, 0.7152, 0.0722));",
      "    vec3 browserClassicNightSkyTint = max(browserSkyEmission.rgb, vec3(0.0));",
      "    float browserClassicNightSkyLuma = dot(browserClassicNightSkyTint, vec3(0.2126, 0.7152, 0.0722));",
      "    vec3 browserClassicNightTint = browserClassicNightMaterialLuma >= 0.015 ? browserClassicNightMaterialTint : (browserClassicNightSkyLuma >= 0.015 ? browserClassicNightSkyTint : vec3(0.42, 0.50, 0.72));",
      "    vec3 browserClassicNightSampleTint = browserClassicNightRgbMask > 0.02 && browserClassicNightRgbMask < 0.92 ? browserClassicNightSample.rgb : browserClassicNightTint;",
      "    color.rgb = clamp(browserClassicNightSampleTint * browserClassicNightMask, 0.0, 1.0);",
      "    color.a = clamp(browserClassicNightMask * passColor.a * opacity, 0.0, 1.0);",
      "}"
    ].join("\n"));
  }
  if(tes3mpHasSkyTextureInputs(src))src=tes3mpEnsureUniform(src,"vec4","browserSkyEmission");
  return src
}
function tes3mpPatchSkyShader(src){
  if(!tes3mpSkyPatchEnabled())return src;
  if(/texture2D\s*\(\s*Texture\s*,\s*TexCoord\s*\)\s*\.zyxw/.test(src))return src;
  var isSkyShader=tes3mpIsSkyShader(src);
  if(isSkyShader&&/\bPASS_CLOUDS\b/.test(src)&&/\bbrowserScreenSky\b/.test(src)){
    src=src.replace(/if\s*\(\s*browserScreenSky\s*!=\s*0(?:\s*&&\s*pass\s*==\s*PASS_ATMOSPHERE)?\s*\)\s*\n\s*gl_Position\s*=\s*vec4\s*\(\s*(?:gl_Vertex|osg_Vertex)\.xy\s*,\s*0\.0\s*,\s*1\.0\s*\)\s*;\s*\n\s*else\s*\n\s*gl_Position\s*=\s*modelToClip\s*\(\s*(?:gl_Vertex|osg_Vertex)\s*\)\s*;/,
      [
        "if (browserScreenSky != 0 && pass == PASS_ATMOSPHERE)",
        "    gl_Position = vec4(osg_Vertex.xy, 0.0, 1.0);",
        "else",
        "    gl_Position = modelToClip(osg_Vertex);"
      ].join("\n"))
      .replace(/\s*else if\s*\(\s*pass\s*==\s*PASS_CLOUDS\s*\)\s*\n\s*paintClouds\s*\(\s*color\s*\)\s*;/,
        "")
      .replace(/if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE\s*\)/,[
        "if (pass == PASS_CLOUDS)",
        "    paintClouds(color);",
        "else if (browserScreenSky != 0)",
        "    paintAtmosphere(color);",
        "else if (pass == PASS_ATMOSPHERE)"
      ].join("\n"))
      .replace(/if\s*\(\s*pass\s*==\s*PASS_CLOUDS\s*\)\s*\n\s*paintClouds\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*browserScreenSky\s*!=\s*0\s*\)\s*\n\s*paintAtmosphere\s*\(\s*color\s*\)\s*;\s*\n\s*else if\s*\(\s*pass\s*==\s*PASS_ATMOSPHERE\s*\)/,[
        "if (pass == PASS_CLOUDS)",
        "    paintClouds(color);",
        "else if (browserScreenSky != 0)",
        "    paintAtmosphere(color);",
        "else if (pass == PASS_ATMOSPHERE)"
      ].join("\n"));
  }
  if(isSkyShader&&/\bpaintAtmosphereNight\b/.test(src)&&tes3mpHasSkyTextureInputs(src)){
    src=src.replace(/void\s+paintAtmosphereNight\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,[
      "void paintAtmosphereNight(inout vec4 color)",
      "{",
      "    vec4 browserClassicNightSample = texture2D(diffuseMap, diffuseMapUV);",
      "    float browserClassicNightRgbMask = dot(max(browserClassicNightSample.rgb, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));",
      "    float browserClassicNightAlphaMask = clamp(browserClassicNightSample.a, 0.0, 1.0);",
      "    float browserClassicNightMask = smoothstep(0.018, 0.72, min(browserClassicNightRgbMask, browserClassicNightAlphaMask));",
      "    vec3 browserClassicNightMaterialTint = max(browserMaterialEmission.rgb, vec3(0.0));",
      "    float browserClassicNightMaterialLuma = dot(browserClassicNightMaterialTint, vec3(0.2126, 0.7152, 0.0722));",
      "    vec3 browserClassicNightSkyTint = max(browserSkyEmission.rgb, vec3(0.0));",
      "    float browserClassicNightSkyLuma = dot(browserClassicNightSkyTint, vec3(0.2126, 0.7152, 0.0722));",
      "    vec3 browserClassicNightTint = browserClassicNightMaterialLuma >= 0.015 ? browserClassicNightMaterialTint : (browserClassicNightSkyLuma >= 0.015 ? browserClassicNightSkyTint : vec3(0.42, 0.50, 0.72));",
      "    vec3 browserClassicNightSampleTint = browserClassicNightRgbMask > 0.02 && browserClassicNightRgbMask < 0.92 ? browserClassicNightSample.rgb : browserClassicNightTint;",
      "    color.rgb = clamp(browserClassicNightSampleTint * browserClassicNightMask, 0.0, 1.0);",
      "    color.a = clamp(browserClassicNightMask * passColor.a * opacity, 0.0, 1.0);",
      "}"
    ].join("\n"));
    src=tes3mpEnsureUniform(src,"vec4","browserSkyEmission");
  }
  if(isSkyShader&&/\bpaintClouds\b/.test(src)&&tes3mpHasSkyTextureInputs(src)&&!/\bbrowserClassicCloudSample\b/.test(src)){
    src=src.replace(/void\s+paintClouds\s*\(\s*inout\s+vec4\s+color\s*\)\s*\{[\s\S]*?\n\}/,[
      "void paintClouds(inout vec4 color)",
      "{",
      "    vec4 cloudSample = texture2D(diffuseMap, diffuseMapUV);",
      "    float cloudFade = clamp(passColor.a, 0.0, 1.0);",
      "    float cloudOpacity = clamp(opacity, 0.0, 1.0);",
      "    float cloudRgbMask = max(cloudSample.r, max(cloudSample.g, cloudSample.b));",
      "    float cloudAlphaMask = cloudSample.a < 0.99 ? cloudSample.a : cloudRgbMask;",
      "    float cloudShapeMask = max(cloudRgbMask, cloudAlphaMask);",
      "    float textureCloudMask = browserCloudFallback != 0 ? 0.0 : smoothstep(0.08, 0.58, cloudShapeMask);",
      "    vec2 nativeCloudUv = diffuseMapUV * vec2(2.4, 1.35);",
      "    vec2 nci0 = floor(nativeCloudUv);",
      "    vec2 ncf0 = fract(nativeCloudUv);",
      "    ncf0 = ncf0 * ncf0 * (3.0 - 2.0 * ncf0);",
      "    float nca0 = fract(sin(dot(nci0, vec2(127.1, 311.7))) * 43758.5453);",
      "    float ncb0 = fract(sin(dot(nci0 + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);",
      "    float ncc0 = fract(sin(dot(nci0 + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);",
      "    float ncd0 = fract(sin(dot(nci0 + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);",
      "    float nativeCloudNoise0 = mix(mix(nca0, ncb0, ncf0.x), mix(ncc0, ncd0, ncf0.x), ncf0.y);",
      "    vec2 nativeCloudUv2 = nativeCloudUv * 2.35 + vec2(11.7, 4.3);",
      "    vec2 nci1 = floor(nativeCloudUv2);",
      "    vec2 ncf1 = fract(nativeCloudUv2);",
      "    ncf1 = ncf1 * ncf1 * (3.0 - 2.0 * ncf1);",
      "    float nca1 = fract(sin(dot(nci1, vec2(269.5, 183.3))) * 43758.5453);",
      "    float ncb1 = fract(sin(dot(nci1 + vec2(1.0, 0.0), vec2(269.5, 183.3))) * 43758.5453);",
      "    float ncc1 = fract(sin(dot(nci1 + vec2(0.0, 1.0), vec2(269.5, 183.3))) * 43758.5453);",
      "    float ncd1 = fract(sin(dot(nci1 + vec2(1.0, 1.0), vec2(269.5, 183.3))) * 43758.5453);",
      "    float nativeCloudNoise1 = mix(mix(nca1, ncb1, ncf1.x), mix(ncc1, ncd1, ncf1.x), ncf1.y);",
      "    float fallbackCloudMask = smoothstep(0.56, 0.78, nativeCloudNoise0 * 0.72 + nativeCloudNoise1 * 0.28);",
      "    float fallbackStrength = browserCloudFallback != 0 ? fallbackCloudMask : 0.0;",
      "    float cloudMask = max(textureCloudMask, fallbackStrength);",
      "    float cloudCutoff = browserCloudFallback != 0 ? 0.16 : 0.02;",
      "    if (cloudMask <= cloudCutoff)",
      "        discard;",
      "    float visibleCloudMask = clamp((cloudMask - cloudCutoff) / max(1.0 - cloudCutoff, 0.001), 0.0, 1.0);",
      "    float cloudLayerOpacity = browserCloudFallback != 0 ? max(cloudOpacity, 0.85) : cloudOpacity;",
      "    float cloudAlphaLimit = browserCloudFallback != 0 ? 0.38 : 0.82;",
      "    float cloudAlpha = clamp(visibleCloudMask * cloudFade * cloudLayerOpacity, 0.0, cloudAlphaLimit);",
      "    if (cloudAlpha <= 0.01)",
      "        discard;",
      "    vec3 fallbackShape = vec3(browserCloudFallback != 0 ? visibleCloudMask : cloudMask);",
      "    vec3 cloudShape = browserCloudFallback != 0 ? fallbackShape : max(cloudSample.rgb, max(vec3(cloudMask), fallbackShape));",
      "    vec3 skyEmission = max(browserSkyEmission.rgb, vec3(0.0));",
      "    float skyLuma = dot(skyEmission, vec3(0.2126, 0.7152, 0.0722));",
      "    float nightAmount = 1.0 - smoothstep(0.075, 0.20, skyLuma);",
      "    vec3 dayCloudTint = browserCloudFallback != 0 ? vec3(0.82, 0.82, 0.78) : clamp(skyEmission + vec3(0.14), vec3(0.58, 0.58, 0.54), vec3(0.88, 0.88, 0.82));",
      "    vec3 nightCloudTint = vec3(0.055, 0.064, 0.095);",
      "    vec3 cloudTint = mix(dayCloudTint, nightCloudTint, nightAmount);",
      "    float finalCloudAlpha = min(cloudAlpha, mix(cloudAlphaLimit, 0.22, nightAmount));",
      "    vec3 cloudRgb = clamp(cloudShape * cloudTint, 0.0, 1.0);",
      "    color = vec4(cloudRgb, finalCloudAlpha);",
      "}"
    ].join("\n"));
    src=tes3mpEnsureUniform(src,"int","browserCloudFallback");
    src=tes3mpEnsureUniform(src,"vec4","browserSkyEmission");
  }
  if(isSkyShader)src=tes3mpEnsureUniform(src,"highp vec4","browserFogColor");
  if(/\bbrowserMaterialEmission\b/.test(src))src=tes3mpEnsureUniform(src,"vec4","browserMaterialEmission");
  return src
}
var tes3mpSkyBaseFixShaderSource=tes3mpFixShaderSource;
tes3mpFixShaderSource=function(source,shaderType){var src=tes3mpPatchSkyShader(tes3mpFixPackagedBrowserSkyShader(tes3mpFixSimpleSkyTextureShader(tes3mpSkyBaseFixShaderSource(source,shaderType))));return tes3mpReplaceLegacyMaterialBuiltins(src)};
		`;
		      compatHelper = compatHelper.replace(
		        String.raw`function tes3mpEnsureUniform(src,type,name){if(new RegExp("\\buniform\\s+"+type+"\\s+"+name+"\\s*;").test(src)||!new RegExp("\\b"+name+"\\b").test(src))return src;var decl="uniform "+type+" "+name+";\n";var precision=/((?:precision\s+(?:lowp|mediump|highp)\s+(?:float|int)\s*;\s*)+)/;return precision.test(src)?src.replace(precision,"$1"+decl):decl+src}`,
		        String.raw`function tes3mpUniformInsertIndex(src){var index=0;for(;;){var rest=src.slice(index);var match=rest.match(/^\s*(?:(?:#version|#extension)[^\n\r]*(?:\r?\n)?|precision\s+(?:lowp|mediump|highp)\s+(?:float|int)\s*;\s*|#ifdef\s+GL_FRAGMENT_PRECISION_HIGH\s*\r?\n\s*precision\s+highp\s+float\s*;\s*\r?\n\s*#else\s*\r?\n\s*precision\s+mediump\s+float\s*;\s*\r?\n\s*#endif\s*)/);if(!match||!match[0])break;index+=match[0].length}return index}function tes3mpEnsureUniform(src,type,name){var existing=new RegExp("\\buniform\\s+(?:(?:lowp|mediump|highp)\\s+)?[A-Za-z_]\\w*\\s+"+name+"\\s*;");if(existing.test(src)||!new RegExp("\\b"+name+"\\b").test(src))return src;var decl="uniform "+type+" "+name+";\n";var index=tes3mpUniformInsertIndex(src);return src.slice(0,index)+decl+src.slice(index)}`
		      );
		      source = source.replace("var GL={", compatHelper + "var GL={");

		      var createShaderTarget = "var _emscripten_glCreateShader=shaderType=>{var id=GL.getNewId(GL.shaders);GL.shaders[id]=GLctx.createShader(shaderType);return id};";
	      if (source.indexOf(createShaderTarget) === -1) {
	        console.warn("TES3MP shader type patch target missing");
	      } else {
	        source = source.replace(createShaderTarget, "var _emscripten_glCreateShader=shaderType=>{var id=GL.getNewId(GL.shaders);GL.shaders[id]=GLctx.createShader(shaderType);tes3mpShaderTypes[id]=shaderType;return id};");
	      }

	      var shaderSourceTargets = [
	        "function _emscripten_glShaderSource(shader,count,string,length){string>>>=0;length>>>=0;var source=GL.getSource(shader,count,string,length);GLctx.shaderSource(GL.shaders[shader],source)}",
	        "function _emscripten_glShaderSource(shader,count,string,length){string>>>=0;length>>>=0;GL.validateGLObjectID(GL.shaders,shader,\"glShaderSource\",\"shader\");var source=GL.getSource(shader,count,string,length);GLctx.shaderSource(GL.shaders[shader],source)}"
	      ];
	      var shaderSourcePatched = false;
	      for (var shaderIndex = 0; shaderIndex < shaderSourceTargets.length; shaderIndex++) {
	        if (source.indexOf(shaderSourceTargets[shaderIndex]) !== -1) {
		          source = source.replace(shaderSourceTargets[shaderIndex], shaderSourceTargets[shaderIndex].replace("GLctx.shaderSource(GL.shaders[shader],source)", "source=tes3mpFixShaderSource(source,tes3mpShaderTypes[shader]);tes3mpShaderSources[shader]=source;GLctx.shaderSource(GL.shaders[shader],source)"));
	          shaderSourcePatched = true;
	          break;
	        }
	      }
	      var fixedFunctionShaderTarget = "source=ensurePrecision(source)}GLctx.shaderSource(GL.shaders[shader],source)};_glCompileShader=";
	      if (source.indexOf(fixedFunctionShaderTarget) !== -1) {
		        source = source.replace(fixedFunctionShaderTarget, "source=ensurePrecision(source)}source=tes3mpFixShaderSource(source,(GL.shaderInfos&&GL.shaderInfos[shader]&&GL.shaderInfos[shader].type)||tes3mpShaderTypes[shader]);tes3mpShaderSources[shader]=source;GLctx.shaderSource(GL.shaders[shader],source)};_glCompileShader=");
	        shaderSourcePatched = true;
	      }
	      var arrowShaderSourceTarget = "GLctx.shaderSource(GL.shaders[shader],source)};var _glShaderSource=_emscripten_glShaderSource;";
	      if (source.indexOf(arrowShaderSourceTarget) !== -1 &&
	          source.indexOf("tes3mpShaderSources[shader]=source;GLctx.shaderSource(GL.shaders[shader],source)};var _glShaderSource=_emscripten_glShaderSource;") === -1) {
		        source = source.replace(arrowShaderSourceTarget, "source=tes3mpFixShaderSource(source,(GL.shaderInfos&&GL.shaderInfos[shader]&&GL.shaderInfos[shader].type)||tes3mpShaderTypes[shader]);tes3mpShaderSources[shader]=source;GLctx.shaderSource(GL.shaders[shader],source)};var _glShaderSource=_emscripten_glShaderSource;");
	        shaderSourcePatched = true;
	      }
		      if (!shaderSourcePatched) console.warn("TES3MP shader source patch target missing");

		      var linkProgramTarget = "var _emscripten_glLinkProgram=program=>{program=GL.programs[program];GLctx.linkProgram(program);program.uniformLocsById=0;program.uniformSizeAndIdsByName={}};";
		      var linkProgramPatch = "var _emscripten_glLinkProgram=program=>{var programId=program;program=GL.programs[program];GLctx.linkProgram(program);program.uniformLocsById=0;program.uniformSizeAndIdsByName={};tes3mpLogLinkedProgram(programId,program)};";
		      if (source.indexOf(linkProgramPatch) === -1) {
		        if (source.indexOf(linkProgramTarget) === -1) {
		          console.warn("TES3MP shader link diagnostic target missing");
		        } else {
		          source = source.replace(linkProgramTarget, linkProgramPatch);
		        }
		      }

		      var getStringTarget = "function _emscripten_glGetString(name_){var ret=GL.stringCache[name_];";
	      if (source.indexOf(getStringTarget) === -1) {
	        console.warn("TES3MP glGetString guard target missing");
	      } else {
	        source = source.replace(getStringTarget, "function _emscripten_glGetString(name_){if(!tes3mpRecoverGLctx()){GL.recordError(1282);return 0}var ret=GL.stringCache[name_];");
	      }

	      var getStringiTarget = "function _emscripten_glGetStringi(name,index){if(GL.currentContext.version<2){";
	      if (source.indexOf(getStringiTarget) === -1) {
	        console.warn("TES3MP glGetStringi guard target missing");
	      } else {
	        source = source.replace(getStringiTarget, "function _emscripten_glGetStringi(name,index){if(!tes3mpRecoverGLctx()||!GL.currentContext){GL.recordError(1282);return 0}if(GL.currentContext.version<2){");
	      }

	      var webGlGetTarget = "var emscriptenWebGLGet=(name_,p,type)=>{if(!p){GL.recordError(1281);return}";
	      if (source.indexOf(webGlGetTarget) === -1) {
	        console.warn("TES3MP WebGL get guard target missing");
	      } else {
	        source = source.replace(webGlGetTarget, "var emscriptenWebGLGet=(name_,p,type)=>{if(!p){GL.recordError(1281);return}if(!tes3mpRecoverGLctx()){GL.recordError(1282);return}");
	      }

	      return source;
	    }

	    function patchTes3mpFixedFunctionRenderCompat(source) {
	      if (source.indexOf("var GLImmediate={") === -1 ||
	          source.indexOf("var GLEmulation={") === -1) {
	        return source;
	      }

	      var fogHelperTarget = "var GLEmulation={";
	      var fogHelperPatch = String.raw`var tes3mpBrowserFogColor=new Float32Array([0.807843,0.890196,1,1]);
var tes3mpBrowserMaterialAmbientFallback=new Float32Array([0.32,0.30,0.26,1]);
var tes3mpBrowserMaterialDiffuseFallback=new Float32Array([1,1,1,1]);
var tes3mpBrowserMaterialSpecularFallback=new Float32Array([0,0,0,1]);
var tes3mpBrowserMaterialEmissionFallback=new Float32Array([0.035,0.032,0.028,1]);
var tes3mpBrowserLightModelAmbientFallback=new Float32Array([0.42,0.38,0.32,1]);
var tes3mpBrowserLightAmbientFallback=new Float32Array([0.10,0.09,0.075,1]);
var tes3mpBrowserLightDiffuseFallback=new Float32Array([1,0.96,0.86,1]);
function tes3mpBrowserColorTooDark(value){return !value||value.length<3||Number(value[0]||0)+Number(value[1]||0)+Number(value[2]||0)<0.015}
function tes3mpBrowserVec4(value,fallback){return value&&value.length>=4&&!tes3mpBrowserColorTooDark(value)?value:fallback}
function tes3mpBrowserFogFallback(){var start=+GLEmulation.fogStart;var end=+GLEmulation.fogEnd;var color=GLEmulation.fogColor;var colorSum=color?color[0]+color[1]+color[2]:0;return !isFinite(start)||!isFinite(end)||end-start<256||!color||colorSum<0.03}
function tes3mpBrowserFogForced(){var start=+GLEmulation.fogStart;var end=+GLEmulation.fogEnd;var color=GLEmulation.fogColor;if(tes3mpBrowserFogFallback())return true;return Math.abs(start-3072)<1&&Math.abs(end-7168)<1&&color&&Math.abs(color[0]-0.807843)<0.01&&Math.abs(color[1]-0.890196)<0.01&&Math.abs(color[2]-1)<0.01}
function tes3mpBrowserFogEnabled(){return tes3mpBrowserFogForced()?true:!!GLEmulation.fogEnabled}
function tes3mpBrowserFogStart(){return tes3mpBrowserFogForced()?3072:GLEmulation.fogStart}
function tes3mpBrowserFogEnd(){return tes3mpBrowserFogForced()?7168:GLEmulation.fogEnd}
function tes3mpBrowserFogScale(){var start=tes3mpBrowserFogStart();var end=tes3mpBrowserFogEnd();return 1/Math.max(1,end-start)}
function tes3mpBrowserFogDensity(){return tes3mpBrowserFogForced()?0:GLEmulation.fogDensity}
function tes3mpBrowserFogColorValue(){return tes3mpBrowserFogForced()?tes3mpBrowserFogColor:GLEmulation.fogColor}
function tes3mpBrowserMaterialAmbientValue(){return tes3mpBrowserVec4(GLEmulation.materialAmbient,tes3mpBrowserMaterialAmbientFallback)}
function tes3mpBrowserMaterialDiffuseValue(){return tes3mpBrowserVec4(GLEmulation.materialDiffuse,tes3mpBrowserMaterialDiffuseFallback)}
function tes3mpBrowserMaterialSpecularValue(){return GLEmulation.materialSpecular&&GLEmulation.materialSpecular.length>=4?GLEmulation.materialSpecular:tes3mpBrowserMaterialSpecularFallback}
function tes3mpBrowserMaterialEmissionValue(){return GLEmulation.materialEmission&&GLEmulation.materialEmission.length>=4?GLEmulation.materialEmission:tes3mpBrowserMaterialEmissionFallback}
function tes3mpBrowserLightModelAmbientValue(){return tes3mpBrowserVec4(GLEmulation.lightModelAmbient,tes3mpBrowserLightModelAmbientFallback)}
function tes3mpBrowserLightAmbientValue(lightId){var value=GLEmulation.lightAmbient&&GLEmulation.lightAmbient[lightId];return lightId===0&&tes3mpBrowserColorTooDark(value)?tes3mpBrowserLightAmbientFallback:value}
function tes3mpBrowserLightDiffuseValue(lightId){var value=GLEmulation.lightDiffuse&&GLEmulation.lightDiffuse[lightId];return lightId===0&&tes3mpBrowserColorTooDark(value)?tes3mpBrowserLightDiffuseFallback:value}
function tes3mpBrowserLightSpecularValue(lightId){return GLEmulation.lightSpecular&&GLEmulation.lightSpecular[lightId]?GLEmulation.lightSpecular[lightId]:tes3mpBrowserMaterialSpecularFallback}
var GLEmulation={`;
	      if (source.indexOf("function tes3mpBrowserFogFallback(") === -1) {
	        if (source.indexOf(fogHelperTarget) === -1) {
	          console.warn("TES3MP fixed-function fog helper target missing");
	        } else {
	          source = source.replace(fogHelperTarget, fogHelperPatch);
	        }
	      }

	      var fogObjectDefaultTarget = "var GLEmulation={fogStart:0,fogEnd:1,fogDensity:1,fogColor:null,fogMode:2048,fogEnabled:false,";
	      var fogObjectDefaultPatch = "var GLEmulation={fogStart:3072,fogEnd:7168,fogDensity:0,fogColor:new Float32Array([0.807843,0.890196,1,1]),fogMode:9729,fogEnabled:true,";
	      if (source.indexOf(fogObjectDefaultTarget) !== -1) {
	        source = source.replace(fogObjectDefaultTarget, fogObjectDefaultPatch);
	      }

	      var fogDefaultTarget = "GLEmulation.fogColor=new Float32Array(4);";
	      var fogDefaultPatch = "GLEmulation.fogColor=new Float32Array([0.807843,0.890196,1,1]);GLEmulation.fogStart=3072;GLEmulation.fogEnd=7168;GLEmulation.fogDensity=0;GLEmulation.fogMode=9729;GLEmulation.fogEnabled=true;";
	      if (source.indexOf(fogDefaultTarget) === -1) {
	        if (source.indexOf(fogObjectDefaultPatch) === -1) {
	          console.warn("TES3MP fixed-function fog default target missing");
	        }
	      } else {
	        source = source.replace(fogDefaultTarget, fogDefaultPatch);
	      }

	      var fogUniformTarget = "if(this.hasFog){if(this.fogColorLocation)GLctx.uniform4fv(this.fogColorLocation,GLEmulation.fogColor);if(this.fogEndLocation)GLctx.uniform1f(this.fogEndLocation,GLEmulation.fogEnd);if(this.fogScaleLocation)GLctx.uniform1f(this.fogScaleLocation,1/(GLEmulation.fogEnd-GLEmulation.fogStart));if(this.fogDensityLocation)GLctx.uniform1f(this.fogDensityLocation,GLEmulation.fogDensity)}";
	      var fogUniformPatch = "if(this.hasFog){if(this.fogColorLocation)GLctx.uniform4fv(this.fogColorLocation,tes3mpBrowserFogColorValue());if(this.fogEndLocation)GLctx.uniform1f(this.fogEndLocation,tes3mpBrowserFogEnd());if(this.fogScaleLocation)GLctx.uniform1f(this.fogScaleLocation,tes3mpBrowserFogScale());if(this.fogDensityLocation)GLctx.uniform1f(this.fogDensityLocation,tes3mpBrowserFogDensity())}";
	      if (source.indexOf(fogUniformTarget) === -1) {
	        console.warn("TES3MP fixed-function fog uniform target missing");
	      } else {
	        source = source.replace(fogUniformTarget, fogUniformPatch);
	      }

	      var fogDisableTarget = "if(cap==2912){if(GLEmulation.fogEnabled!=false){GLImmediate.currentRenderer=null;GLEmulation.fogEnabled=false}return}else if(cap>=12288";
	      var fogDisablePatch = "if(cap==2912){if(tes3mpBrowserFogForced()){if(GLEmulation.fogEnabled!=true){GLImmediate.currentRenderer=null;GLEmulation.fogEnabled=true}return}if(GLEmulation.fogEnabled!=false){GLImmediate.currentRenderer=null;GLEmulation.fogEnabled=false}return}else if(cap>=12288";
	      if (source.indexOf(fogDisableTarget) === -1) {
	        console.warn("TES3MP fixed-function fog disable target missing");
	      } else {
	        source = source.replace(fogDisableTarget, fogDisablePatch);
	      }

	      var fogModeTarget = "case 2917:switch(param){case 2049:case 9729:if(GLEmulation.fogMode!=param){GLImmediate.currentRenderer=null;GLEmulation.fogMode=param}break;default:if(GLEmulation.fogMode!=2048){GLImmediate.currentRenderer=null;GLEmulation.fogMode=2048}break}break";
	      var fogModePatch = "case 2917:if(tes3mpBrowserFogForced())param=9729;switch(param){case 2049:case 9729:if(GLEmulation.fogMode!=param){GLImmediate.currentRenderer=null;GLEmulation.fogMode=param}break;default:if(GLEmulation.fogMode!=2048){GLImmediate.currentRenderer=null;GLEmulation.fogMode=2048}break}break";
	      if (source.indexOf(fogModeTarget) === -1) {
	        console.warn("TES3MP fixed-function fog mode target missing");
	      } else {
	        source = source.replace(fogModeTarget, fogModePatch);
	      }

	      var lightingUniformTarget = "if(this.hasLighting){if(this.lightModelAmbientLocation)GLctx.uniform4fv(this.lightModelAmbientLocation,GLEmulation.lightModelAmbient);if(this.materialAmbientLocation)GLctx.uniform4fv(this.materialAmbientLocation,GLEmulation.materialAmbient);if(this.materialDiffuseLocation)GLctx.uniform4fv(this.materialDiffuseLocation,GLEmulation.materialDiffuse);if(this.materialSpecularLocation)GLctx.uniform4fv(this.materialSpecularLocation,GLEmulation.materialSpecular);if(this.materialShininessLocation)GLctx.uniform1f(this.materialShininessLocation,GLEmulation.materialShininess[0]);if(this.materialEmissionLocation)GLctx.uniform4fv(this.materialEmissionLocation,GLEmulation.materialEmission);for(var lightId=0;lightId<GLEmulation.MAX_LIGHTS;lightId++){if(this.lightAmbientLocation[lightId])GLctx.uniform4fv(this.lightAmbientLocation[lightId],GLEmulation.lightAmbient[lightId]);if(this.lightDiffuseLocation[lightId])GLctx.uniform4fv(this.lightDiffuseLocation[lightId],GLEmulation.lightDiffuse[lightId]);if(this.lightSpecularLocation[lightId])GLctx.uniform4fv(this.lightSpecularLocation[lightId],GLEmulation.lightSpecular[lightId]);if(this.lightPositionLocation[lightId])GLctx.uniform4fv(this.lightPositionLocation[lightId],GLEmulation.lightPosition[lightId])}}";
	      var lightingUniformPatch = "if(this.hasLighting){if(this.lightModelAmbientLocation)GLctx.uniform4fv(this.lightModelAmbientLocation,tes3mpBrowserLightModelAmbientValue());if(this.materialAmbientLocation)GLctx.uniform4fv(this.materialAmbientLocation,tes3mpBrowserMaterialAmbientValue());if(this.materialDiffuseLocation)GLctx.uniform4fv(this.materialDiffuseLocation,tes3mpBrowserMaterialDiffuseValue());if(this.materialSpecularLocation)GLctx.uniform4fv(this.materialSpecularLocation,tes3mpBrowserMaterialSpecularValue());if(this.materialShininessLocation)GLctx.uniform1f(this.materialShininessLocation,GLEmulation.materialShininess[0]);if(this.materialEmissionLocation)GLctx.uniform4fv(this.materialEmissionLocation,tes3mpBrowserMaterialEmissionValue());for(var lightId=0;lightId<GLEmulation.MAX_LIGHTS;lightId++){if(this.lightAmbientLocation[lightId])GLctx.uniform4fv(this.lightAmbientLocation[lightId],tes3mpBrowserLightAmbientValue(lightId));if(this.lightDiffuseLocation[lightId])GLctx.uniform4fv(this.lightDiffuseLocation[lightId],tes3mpBrowserLightDiffuseValue(lightId));if(this.lightSpecularLocation[lightId])GLctx.uniform4fv(this.lightSpecularLocation[lightId],tes3mpBrowserLightSpecularValue(lightId));if(this.lightPositionLocation[lightId])GLctx.uniform4fv(this.lightPositionLocation[lightId],GLEmulation.lightPosition[lightId])}}";
	      if (source.indexOf(lightingUniformTarget) === -1) {
	        console.warn("TES3MP fixed-function lighting uniform target missing");
	      } else {
	        source = source.replace(lightingUniformTarget, lightingUniformPatch);
	      }

	      var vertexShaderTarget = "GLctx.shaderSource(this.vertexShader,vsSource);GLctx.compileShader(this.vertexShader);";
	      var vertexShaderPatch = "vsSource=tes3mpFixShaderSource(vsSource,35633);GLctx.shaderSource(this.vertexShader,vsSource);GLctx.compileShader(this.vertexShader);";
	      if (source.indexOf(vertexShaderTarget) === -1) {
	        console.warn("TES3MP fixed-function vertex shader compat target missing");
	      } else {
	        source = source.replace(vertexShaderTarget, vertexShaderPatch);
	      }

		      var fragmentShaderTarget = "GLctx.shaderSource(this.fragmentShader,fsSource);GLctx.compileShader(this.fragmentShader);";
		      var fragmentShaderPatch = "fsSource=tes3mpFixShaderSource(fsSource,35632);GLctx.shaderSource(this.fragmentShader,fsSource);GLctx.compileShader(this.fragmentShader);";
		      if (source.indexOf(fragmentShaderTarget) === -1) {
		        console.warn("TES3MP fixed-function fragment shader compat target missing");
	      } else {
		        source = source.replace(fragmentShaderTarget, fragmentShaderPatch);
		      }

		      var unlitEmissionUniformTarget = "\"varying vec4 v_color;\",texUnitAttribList";
		      var unlitEmissionUniformPatch = "\"varying vec4 v_color;\",GLEmulation.lightingEnabled?null:\"uniform vec4 u_materialEmission;\",texUnitAttribList";
		      if (source.indexOf(unlitEmissionUniformPatch) === -1) {
		        if (source.indexOf(unlitEmissionUniformTarget) === -1) {
		          console.warn("TES3MP fixed-function unlit emission uniform target missing");
		        } else {
		          source = source.replace(unlitEmissionUniformTarget, unlitEmissionUniformPatch);
		        }
		      }

		      var unlitEmissionColorTarget = "\"  v_color = a_color;\",vsTexCoordInits";
		      var unlitEmissionColorPatch = "\"  v_color = a_color;\",GLEmulation.lightingEnabled?null:\"  v_color.rgb = max(v_color.rgb, u_materialEmission.rgb);\",vsTexCoordInits";
		      if (source.indexOf(unlitEmissionColorPatch) === -1) {
		        if (source.indexOf(unlitEmissionColorTarget) === -1) {
		          console.warn("TES3MP fixed-function unlit emission color target missing");
		        } else {
		          source = source.replace(unlitEmissionColorTarget, unlitEmissionColorPatch);
		        }
		      }

		      var unlitEmissionUploadTarget = "if(this.hasLighting){if(this.lightModelAmbientLocation)";
		      var unlitEmissionUploadPatch = "if(!this.hasLighting&&this.materialEmissionLocation)GLctx.uniform4fv(this.materialEmissionLocation,tes3mpBrowserMaterialEmissionValue());if(this.hasLighting){if(this.lightModelAmbientLocation)";
		      if (source.indexOf(unlitEmissionUploadPatch) === -1) {
		        if (source.indexOf(unlitEmissionUploadTarget) === -1) {
		          console.warn("TES3MP fixed-function unlit emission upload target missing");
		        } else {
		          source = source.replace(unlitEmissionUploadTarget, unlitEmissionUploadPatch);
		        }
		      }

		      var attribHelperTarget = "var GLImmediate={";
	      var attribHelperPatch = String.raw`function tes3mpGetAttribLocationAny(program,names){for(var i=0;i<names.length;i++){var location=GLctx.getAttribLocation(program,names[i]);if(location>=0)return location}return-1}function tes3mpGetUniformLocationAny(program,names){for(var i=0;i<names.length;i++){var location=GLctx.getUniformLocation(program,names[i]);if(location)return location}return null}function tes3mpTexCoordAttribNames(i){return["a_texCoord"+i,"osg_MultiTexCoord"+i,"osg_TexCoord"+i]}function tes3mpClientAttribArrayBuffer(attrib){return attrib&&attrib.arrayBuffer?attrib.arrayBuffer:0}function tes3mpHasClientAttribArrayBuffers(){if(typeof GLImmediate=="undefined"||!GLImmediate.clientAttributes)return false;for(var i=0;i<GLImmediate.clientAttributes.length;i++){if(GLImmediate.enabledClientAttributes&&GLImmediate.enabledClientAttributes[i]&&tes3mpClientAttribArrayBuffer(GLImmediate.clientAttributes[i]))return true}return false}function tes3mpClientAttribStride(attrib){return tes3mpClientAttribArrayBuffer(attrib)?attrib.stride||0:GLImmediate.stride}function tes3mpBindClientAttribArrayBuffer(attrib){var buffer=tes3mpClientAttribArrayBuffer(attrib);if(!buffer)return;var object=GL.buffers&&GL.buffers[buffer];if(!object)return;if((GLctx.currentArrayBufferBinding||0)!==buffer){GLctx.bindBuffer(GLctx.ARRAY_BUFFER,object);GLctx.currentArrayBufferBinding=buffer;GLImmediate.lastArrayBuffer=buffer}}function tes3mpRestoreClientArrayBuffer(buffer){buffer=buffer||0;var object=buffer&&GL.buffers?GL.buffers[buffer]:null;var restored=object?buffer:0;if((GLctx.currentArrayBufferBinding||0)===restored)return;GLctx.bindBuffer(GLctx.ARRAY_BUFFER,object||null);GLctx.currentArrayBufferBinding=restored;GLImmediate.lastArrayBuffer=restored||null}` + "var GLImmediate={";
	      if (source.indexOf("function tes3mpGetAttribLocationAny(") === -1) {
	        if (source.indexOf(attribHelperTarget) === -1) {
	          console.warn("TES3MP fixed-function attrib helper target missing");
	        } else {
	          source = source.replace(attribHelperTarget, attribHelperPatch);
	        }
	      }

	      var positionLocationTarget = "this.positionLocation=GLctx.getAttribLocation(this.program,\"a_position\");";
	      var positionLocationPatch = "this.positionLocation=tes3mpGetAttribLocationAny(this.program,useCurrProgram?[\"a_position\",\"osg_Vertex\"]:[\"a_position\"]);";
	      if (source.indexOf(positionLocationTarget) === -1) {
	        console.warn("TES3MP fixed-function position attrib target missing");
	      } else {
	        source = source.replace(positionLocationTarget, positionLocationPatch);
	      }

	      var texCoordLocationTarget = "if(useCurrProgram){this.texCoordLocations[i]=GLctx.getAttribLocation(this.program,`a_texCoord${i}`)}else{this.texCoordLocations[i]=GLctx.getAttribLocation(this.program,aTexCoordPrefix+i)}";
	      var texCoordLocationPatch = "if(useCurrProgram){this.texCoordLocations[i]=tes3mpGetAttribLocationAny(this.program,tes3mpTexCoordAttribNames(i))}else{this.texCoordLocations[i]=GLctx.getAttribLocation(this.program,aTexCoordPrefix+i)}";
	      if (source.indexOf(texCoordLocationTarget) === -1) {
	        console.warn("TES3MP fixed-function texcoord attrib target missing");
	      } else {
	        source = source.replace(texCoordLocationTarget, texCoordLocationPatch);
	      }

	      var colorLocationTarget = "this.colorLocation=GLctx.getAttribLocation(this.program,\"a_color\");";
	      var colorLocationPatch = "this.colorLocation=tes3mpGetAttribLocationAny(this.program,useCurrProgram?[\"a_color\",\"osg_Color\"]:[\"a_color\"]);";
	      if (source.indexOf(colorLocationTarget) === -1) {
	        console.warn("TES3MP fixed-function color attrib target missing");
	      } else {
	        source = source.replace(colorLocationTarget, colorLocationPatch);
	      }

	      var normalLocationTarget = "this.normalLocation=GLctx.getAttribLocation(this.program,\"a_normal\");";
	      var normalLocationPatch = "this.normalLocation=tes3mpGetAttribLocationAny(this.program,useCurrProgram?[\"a_normal\",\"osg_Normal\"]:[\"a_normal\"]);";
	      if (source.indexOf(normalLocationTarget) === -1) {
	        console.warn("TES3MP fixed-function normal attrib target missing");
	      } else {
	        source = source.replace(normalLocationTarget, normalLocationPatch);
	      }

	      var matrixLocationTarget = "this.modelViewLocation=GLctx.getUniformLocation(this.program,\"u_modelView\");this.projectionLocation=GLctx.getUniformLocation(this.program,\"u_projection\");this.normalMatrixLocation=GLctx.getUniformLocation(this.program,\"u_normalMatrix\");";
	      var matrixLocationPatch = "this.modelViewLocation=tes3mpGetUniformLocationAny(this.program,useCurrProgram?[\"u_modelView\",\"osg_ModelViewMatrix\"]:[\"u_modelView\"]);this.projectionLocation=tes3mpGetUniformLocationAny(this.program,useCurrProgram?[\"u_projection\",\"osg_ProjectionMatrix\"]:[\"u_projection\"]);this.modelViewProjectionLocation=tes3mpGetUniformLocationAny(this.program,useCurrProgram?[\"osg_ModelViewProjectionMatrix\",\"u_modelViewProjection\"]:[\"u_modelViewProjection\"]);this.modelViewMatrixInverseLocation=tes3mpGetUniformLocationAny(this.program,useCurrProgram?[\"osg_ModelViewMatrixInverse\"]:[]);this.normalMatrixLocation=tes3mpGetUniformLocationAny(this.program,useCurrProgram?[\"u_normalMatrix\",\"osg_NormalMatrix\"]:[\"u_normalMatrix\"]);";
	      if (source.indexOf(matrixLocationTarget) === -1) {
	        console.warn("TES3MP fixed-function matrix uniform target missing");
	      } else {
	        source = source.replace(matrixLocationTarget, matrixLocationPatch);
	      }

	      var modelViewUploadTarget = "GLctx.uniformMatrix4fv(this.modelViewLocation,false,GLImmediate.matrix[0]);if(GLEmulation.lightEnabled){var tmpMVinv=GLImmediate.matrixLib.mat4.create(GLImmediate.matrix[0]);GLImmediate.matrixLib.mat4.inverse(tmpMVinv);GLImmediate.matrixLib.mat4.transpose(tmpMVinv);GLctx.uniformMatrix3fv(this.normalMatrixLocation,false,GLImmediate.matrixLib.mat4.toMat3(tmpMVinv))}";
	      var modelViewUploadPatch = "GLctx.uniformMatrix4fv(this.modelViewLocation,false,GLImmediate.matrix[0]);var tmpMVinv=null;if(this.modelViewMatrixInverseLocation||GLEmulation.lightEnabled&&this.normalMatrixLocation){tmpMVinv=GLImmediate.matrixLib.mat4.create(GLImmediate.matrix[0]);GLImmediate.matrixLib.mat4.inverse(tmpMVinv)}if(this.modelViewMatrixInverseLocation)GLctx.uniformMatrix4fv(this.modelViewMatrixInverseLocation,false,tmpMVinv);if(GLEmulation.lightEnabled&&this.normalMatrixLocation){GLImmediate.matrixLib.mat4.transpose(tmpMVinv);GLctx.uniformMatrix3fv(this.normalMatrixLocation,false,GLImmediate.matrixLib.mat4.toMat3(tmpMVinv))}";
	      if (source.indexOf(modelViewUploadTarget) === -1) {
	        console.warn("TES3MP fixed-function model-view upload target missing");
	      } else {
	        source = source.replace(modelViewUploadTarget, modelViewUploadPatch);
	      }

	      var projectionUploadTarget = "if(this.projectionLocation&&this.projectionMatrixVersion!=GLImmediate.matrixVersion[1]){this.projectionMatrixVersion=GLImmediate.matrixVersion[1];GLctx.uniformMatrix4fv(this.projectionLocation,false,GLImmediate.matrix[1])}";
	      var projectionUploadPatch = "if(this.projectionLocation&&this.projectionMatrixVersion!=GLImmediate.matrixVersion[1]){this.projectionMatrixVersion=GLImmediate.matrixVersion[1];GLctx.uniformMatrix4fv(this.projectionLocation,false,GLImmediate.matrix[1])}if(this.modelViewProjectionLocation&&(this.modelViewProjectionMatrixVersion0!=GLImmediate.matrixVersion[0]||this.modelViewProjectionMatrixVersion1!=GLImmediate.matrixVersion[1])){this.modelViewProjectionMatrixVersion0=GLImmediate.matrixVersion[0];this.modelViewProjectionMatrixVersion1=GLImmediate.matrixVersion[1];var tmpMVP=GLImmediate.matrixLib.mat4.create();GLImmediate.matrixLib.mat4.multiply(GLImmediate.matrix[1],GLImmediate.matrix[0],tmpMVP);GLctx.uniformMatrix4fv(this.modelViewProjectionLocation,false,tmpMVP)}";
	      if (source.indexOf(projectionUploadTarget) === -1) {
	        console.warn("TES3MP fixed-function projection upload target missing");
	      } else {
	        source = source.replace(projectionUploadTarget, projectionUploadPatch);
	      }

	      var setClientAttributeTarget = "setClientAttribute(name,size,type,stride,pointer){var attrib=GLImmediate.clientAttributes[name];if(!attrib){for(var i=0;i<=name;i++){GLImmediate.clientAttributes[i]||={name,size,type,stride,pointer,offset:0}}}else{attrib.name=name;attrib.size=size;attrib.type=type;attrib.stride=stride;attrib.pointer=pointer;attrib.offset=0}GLImmediate.modifiedClientAttributes=true}";
	      var setClientAttributePatch = "setClientAttribute(name,size,type,stride,pointer){var arrayBuffer=GLctx.currentArrayBufferBinding||0;var attrib=GLImmediate.clientAttributes[name];if(!attrib){for(var i=0;i<=name;i++){GLImmediate.clientAttributes[i]||={name,size,type,stride,pointer,offset:0,arrayBuffer}}}else{attrib.name=name;attrib.size=size;attrib.type=type;attrib.stride=stride;attrib.pointer=pointer;attrib.offset=0;attrib.arrayBuffer=arrayBuffer}GLImmediate.modifiedClientAttributes=true}";
	      if (source.indexOf(setClientAttributeTarget) === -1) {
	        console.warn("TES3MP fixed-function client attrib buffer target missing");
	      } else {
	        source = source.replace(setClientAttributeTarget, setClientAttributePatch);
	      }

	      var restrideTarget = "if((minStride!=maxStride||maxStride<bytes)&&!beginEnd){";
	      var restridePatch = "if(!tes3mpHasClientAttribArrayBuffers()&&(minStride!=maxStride||maxStride<bytes)&&!beginEnd){";
	      if (source.indexOf(restrideTarget) === -1) {
	        console.warn("TES3MP fixed-function VBO restride target missing");
	      } else {
	        source = source.replace(restrideTarget, restridePatch);
	      }

	      var vertexPointerBaseTarget = "if(GLctx.currentArrayBufferBinding){GLImmediate.vertexPointer=0}else{GLImmediate.vertexPointer=clientStartPointer}";
	      var vertexPointerBasePatch = "if(GLctx.currentArrayBufferBinding||tes3mpHasClientAttribArrayBuffers()){GLImmediate.vertexPointer=0}else{GLImmediate.vertexPointer=clientStartPointer}";
	      if (source.indexOf(vertexPointerBaseTarget) === -1) {
	        console.warn("TES3MP fixed-function VBO vertex pointer base target missing");
	      } else {
	        source = source.replace(vertexPointerBaseTarget, vertexPointerBasePatch);
	      }

	      var prepareStartTarget = "this.prepare=function(){var arrayBuffer;if(!GLctx.currentArrayBufferBinding){";
	      var prepareStartPatch = "this.prepare=function(){var tes3mpSavedArrayBuffer=GLctx.currentArrayBufferBinding||0;var tes3mpHasAttribBuffers=tes3mpHasClientAttribArrayBuffers();var arrayBuffer;if(!GLctx.currentArrayBufferBinding&&!tes3mpHasAttribBuffers){";
	      if (source.indexOf(prepareStartTarget) === -1) {
	        console.warn("TES3MP fixed-function prepare VBO start target missing");
	      } else {
	        source = source.replace(prepareStartTarget, prepareStartPatch);
	      }

	      var prepareCanSkipTarget = "var canSkip=this==lastRenderer&&arrayBuffer==GLImmediate.lastArrayBuffer&&(GL.currProgram||this.program)==GLImmediate.lastProgram&&GLImmediate.stride==GLImmediate.lastStride&&!GLImmediate.matricesModified;";
	      var prepareCanSkipPatch = "var canSkip=!tes3mpHasAttribBuffers&&this==lastRenderer&&arrayBuffer==GLImmediate.lastArrayBuffer&&(GL.currProgram||this.program)==GLImmediate.lastProgram&&GLImmediate.stride==GLImmediate.lastStride&&!GLImmediate.matricesModified;";
	      if (source.indexOf(prepareCanSkipTarget) === -1) {
	        console.warn("TES3MP fixed-function prepare cache target missing");
	      } else {
	        source = source.replace(prepareCanSkipTarget, prepareCanSkipPatch);
	      }

	      var prepareUploadTarget = "if(!GLctx.currentArrayBufferBinding){if(arrayBuffer!=GLImmediate.lastArrayBuffer){";
	      var prepareUploadPatch = "if(!GLctx.currentArrayBufferBinding&&!tes3mpHasAttribBuffers){if(arrayBuffer!=GLImmediate.lastArrayBuffer){";
	      if (source.indexOf(prepareUploadTarget) === -1) {
	        console.warn("TES3MP fixed-function prepare upload target missing");
	      } else {
	        source = source.replace(prepareUploadTarget, prepareUploadPatch);
	      }

	      var positionPointerTarget = "GLctx.vertexAttribPointer(this.positionLocation,posAttr.size,posAttr.type,false,GLImmediate.stride,posAttr.offset);";
	      var positionPointerPatch = "tes3mpBindClientAttribArrayBuffer(posAttr);GLctx.vertexAttribPointer(this.positionLocation,posAttr.size,posAttr.type,false,tes3mpClientAttribStride(posAttr),posAttr.offset);";
	      if (source.indexOf(positionPointerTarget) === -1) {
	        console.warn("TES3MP fixed-function position VBO attrib target missing");
	      } else {
	        source = source.replace(positionPointerTarget, positionPointerPatch);
	      }

	      var normalPointerTarget = "GLctx.vertexAttribPointer(this.normalLocation,normalAttr.size,normalAttr.type,true,GLImmediate.stride,normalAttr.offset);";
	      var normalPointerPatch = "tes3mpBindClientAttribArrayBuffer(normalAttr);GLctx.vertexAttribPointer(this.normalLocation,normalAttr.size,normalAttr.type,true,tes3mpClientAttribStride(normalAttr),normalAttr.offset);";
	      if (source.indexOf(normalPointerTarget) === -1) {
	        console.warn("TES3MP fixed-function normal VBO attrib target missing");
	      } else {
	        source = source.replace(normalPointerTarget, normalPointerPatch);
	      }

	      var texPointerTarget = "GLctx.vertexAttribPointer(attribLoc,texAttr.size,texAttr.type,false,GLImmediate.stride,texAttr.offset);";
	      var texPointerPatch = "tes3mpBindClientAttribArrayBuffer(texAttr);GLctx.vertexAttribPointer(attribLoc,texAttr.size,texAttr.type,false,tes3mpClientAttribStride(texAttr),texAttr.offset);";
	      if (source.indexOf(texPointerTarget) === -1) {
	        console.warn("TES3MP fixed-function texcoord VBO attrib target missing");
	      } else {
	        source = source.replace(texPointerTarget, texPointerPatch);
	      }

	      var colorPointerTarget = "GLctx.vertexAttribPointer(this.colorLocation,colorAttr.size,colorAttr.type,true,GLImmediate.stride,colorAttr.offset);";
	      var colorPointerPatch = "tes3mpBindClientAttribArrayBuffer(colorAttr);GLctx.vertexAttribPointer(this.colorLocation,colorAttr.size,colorAttr.type,true,tes3mpClientAttribStride(colorAttr),colorAttr.offset);";
	      if (source.indexOf(colorPointerTarget) === -1) {
	        console.warn("TES3MP fixed-function color VBO attrib target missing");
	      } else {
	        source = source.replace(colorPointerTarget, colorPointerPatch);
	      }

	      var prepareRestoreTarget = "if(GLImmediate.mode==GLctx.POINTS){if(this.pointSizeLocation){GLctx.uniform1f(this.pointSizeLocation,GLEmulation.pointSize)}}};this.cleanup=function(){";
	      var prepareRestorePatch = "if(GLImmediate.mode==GLctx.POINTS){if(this.pointSizeLocation){GLctx.uniform1f(this.pointSizeLocation,GLEmulation.pointSize)}}tes3mpRestoreClientArrayBuffer(tes3mpSavedArrayBuffer)};this.cleanup=function(){";
	      if (source.indexOf(prepareRestoreTarget) === -1) {
	        console.warn("TES3MP fixed-function prepare restore target missing");
	      } else {
	        source = source.replace(prepareRestoreTarget, prepareRestorePatch);
	      }

	      return source;
	    }

	    function patchTes3mpImmediateIndexTypes(source) {
	      if (source.indexOf("var GLImmediate={") === -1 ||
	          source.indexOf("GLImmediate.flush(count,0,indices);GLImmediate.mode=-1") === -1) {
	        return source;
	      }

		      var helperTarget = "var GLImmediate={";
		      var helperPatch = String.raw`function tes3mpGetIndexRange(indexBytes,byteOffset,count,indexType){if(!indexBytes||count<=0||byteOffset<0)return null;var bytesPerIndex=indexType==GLctx.UNSIGNED_BYTE?1:indexType==GLctx.UNSIGNED_SHORT?2:indexType==GLctx.UNSIGNED_INT?4:0;if(!bytesPerIndex||byteOffset+count*bytesPerIndex>indexBytes.length)return null;var first=4294967295;var last=0;for(var i=0;i<count;i++){var offset=byteOffset+i*bytesPerIndex;var currIndex;if(bytesPerIndex==1){currIndex=indexBytes[offset]}else if(bytesPerIndex==2){currIndex=indexBytes[offset]|indexBytes[offset+1]<<8}else{currIndex=(indexBytes[offset]|indexBytes[offset+1]<<8|indexBytes[offset+2]<<16)+indexBytes[offset+3]*16777216}first=Math.min(first,currIndex);last=Math.max(last,currIndex+1)}return[first,last]}function tes3mpIndexByteSize(indexType){return indexType==GLctx.UNSIGNED_BYTE?1:indexType==GLctx.UNSIGNED_SHORT?2:indexType==GLctx.UNSIGNED_INT?4:0}function tes3mpBoundBufferIdForTarget(target){if(target==34962)return GLctx.currentArrayBufferBinding||0;if(target==34963)return GLctx.currentElementArrayBufferBinding||0;if(target==36662)return GLctx.currentCopyReadBufferBinding||0;if(target==36663)return GLctx.currentCopyWriteBufferBinding||0;if(target==35051)return GLctx.currentPixelPackBufferBinding||0;if(target==35052)return GLctx.currentPixelUnpackBufferBinding||0;return 0}function tes3mpBufferForTarget(target){var id=tes3mpBoundBufferIdForTarget(target);return id&&GL.buffers?GL.buffers[id]:null}function tes3mpShadowBufferData(target,size,data){size>>>=0;data>>>=0;var buffer=tes3mpBufferForTarget(target);if(!buffer)return null;var next=new Uint8Array(size);if(data&&size)next.set((growMemViews(),HEAPU8).subarray(data>>>0,(data+size)>>>0));buffer.emscriptenBufferData=next;if(target==34963)buffer.emscriptenElementArrayBufferData=next;return next}function tes3mpShadowBufferSubData(target,offset,size,data){offset>>>=0;size>>>=0;data>>>=0;var buffer=tes3mpBufferForTarget(target);if(!buffer||!size)return null;var shadow=buffer.emscriptenBufferData;if(!shadow||shadow.length<offset+size){var resized=new Uint8Array(offset+size);if(shadow)resized.set(shadow);shadow=resized;buffer.emscriptenBufferData=shadow}shadow.set((growMemViews(),HEAPU8).subarray(data>>>0,(data+size)>>>0),offset);if(target==34963)buffer.emscriptenElementArrayBufferData=shadow;return shadow}function tes3mpDrawCompatState(){var root=typeof globalThis!="undefined"?globalThis:{};root.__tes3mpDrawCompat=root.__tes3mpDrawCompat||{skipped:0,stateDraws:0,waterSkipped:0,lastReason:""};return root.__tes3mpDrawCompat}function tes3mpRecordUnsafeImmediateDraw(reason,mode,count,type,ptr){var state=tes3mpDrawCompatState();state.skipped++;state.lastReason=reason;state.lastDraw={mode:mode,count:count,type:type||0,ptr:ptr||0};if(state.skipped<=5&&typeof Module!="undefined"&&Module["printErr"])Module["printErr"]("TES3MP skipped unsafe GLImmediate draw: "+reason+" count="+count)}function tes3mpSafeDrawCount(count){count=Number(count);return isFinite(count)&&count>0&&count<1048576}function tes3mpElementRangeLooksValid(mode,count,type,ptr){var bytesPerIndex=tes3mpIndexByteSize(type);if(!bytesPerIndex)return false;if(GLctx.currentElementArrayBufferBinding){var elementBuffer=GL.buffers[GLctx.currentElementArrayBufferBinding];var elementIndexBytes=elementBuffer&&(elementBuffer.emscriptenElementArrayBufferData||elementBuffer.emscriptenBufferData);if(elementIndexBytes&&(ptr>>>0)+count*bytesPerIndex>elementIndexBytes.length){tes3mpRecordUnsafeImmediateDraw("element draw outside tracked buffer",mode,count,type,ptr);return false}}return true}function tes3mpWaterLikeDraw(kind,mode,count){return typeof GLctx!="undefined"&&GLctx&&mode==GLctx.TRIANGLES&&(count==9600||(kind.indexOf("arrays")==0&&count==6400))}function tes3mpWithBrowserDrawState(kind,mode,count,drawCall){if(!tes3mpWaterLikeDraw(kind,mode,count))return drawCall();var state=tes3mpDrawCompatState();state.waterSkipped++;state.lastReason="skipped water-like draw";state.lastWaterDraw={kind:kind,mode:mode,count:count};return}function tes3mpDrawArraysCompat(mode,first,count){if(!tes3mpSafeDrawCount(count)){tes3mpRecordUnsafeImmediateDraw("invalid array count",mode,count,0,first);return}return tes3mpWithBrowserDrawState("arrays",mode,count,function(){return GLctx.drawArrays(mode,first,count)})}function tes3mpDrawElementsCompat(mode,count,type,ptr){if(!tes3mpSafeDrawCount(count)){tes3mpRecordUnsafeImmediateDraw("invalid element count",mode,count,type,ptr);return}if(type!==GLctx.UNSIGNED_BYTE&&type!==GLctx.UNSIGNED_SHORT&&type!==GLctx.UNSIGNED_INT){tes3mpRecordUnsafeImmediateDraw("invalid element type",mode,count,type,ptr);return}if(!tes3mpElementRangeLooksValid(mode,count,type,ptr))return;return tes3mpWithBrowserDrawState("elements",mode,count,function(){return GLctx.drawElements(mode,count,type,ptr)})}function tes3mpDrawArraysInstancedCompat(mode,first,count,primcount){if(!tes3mpSafeDrawCount(count)||!tes3mpSafeDrawCount(primcount)){tes3mpRecordUnsafeImmediateDraw("invalid instanced array count",mode,count,0,first);return}return tes3mpWithBrowserDrawState("arrays-instanced",mode,count,function(){return GLctx.drawArraysInstanced(mode,first,count,primcount)})}function tes3mpDrawElementsInstancedCompat(mode,count,type,ptr,primcount){if(!tes3mpSafeDrawCount(count)||!tes3mpSafeDrawCount(primcount)){tes3mpRecordUnsafeImmediateDraw("invalid instanced element count",mode,count,type,ptr);return}if(type!==GLctx.UNSIGNED_BYTE&&type!==GLctx.UNSIGNED_SHORT&&type!==GLctx.UNSIGNED_INT){tes3mpRecordUnsafeImmediateDraw("invalid instanced element type",mode,count,type,ptr);return}if(!tes3mpElementRangeLooksValid(mode,count,type,ptr))return;return tes3mpWithBrowserDrawState("elements-instanced",mode,count,function(){return GLctx.drawElementsInstanced(mode,count,type,ptr,primcount)})}` + "var GLImmediate={";
		      helperPatch = helperPatch.replace(
		        "function tes3mpWithBrowserDrawState(kind,mode,count,drawCall){if(!tes3mpWaterLikeDraw(kind,mode,count))return drawCall();",
		        "function tes3mpWithBrowserDrawState(kind,mode,count,drawCall){if(typeof tes3mpApplyLegacyMaterialUniforms==\"function\")tes3mpApplyLegacyMaterialUniforms();if(!tes3mpWaterLikeDraw(kind,mode,count))return drawCall();"
		      );
		      if (typeof MorrowindTes3mpRenderPolicy === "undefined") {
		        console.warn("TES3MP render policy module missing; water draws remain disabled");
		      } else {
		        var waterDrawPolicy =
		          MorrowindTes3mpRenderPolicy.restoreValidatedWaterDraws(helperPatch);
		        helperPatch = waterDrawPolicy.source;
		        if (!waterDrawPolicy.patched) {
		          console.warn("TES3MP validated water draw target missing");
		        }
		      }
		      if (/(?:^|[?&])tes3mpdrawtrace=1(?:&|$)/.test(window.location.search)) {
		        helperPatch = helperPatch.replace(
		          "function tes3mpRecordUnsafeImmediateDraw",
		          String.raw`function tes3mpDiagUniform(program,name){try{var loc=GLctx.getUniformLocation(program,name);if(!loc)return null;var value=GLctx.getUniform(program,loc);return value&&typeof value.length=="number"?Array.prototype.slice.call(value):value}catch(error){return "error:"+error.message}}function tes3mpDiagProgram(program){var diag={programId:GL.currProgram||0,attrs:[],uniforms:[],values:{},locations:{},lighting:typeof GLEmulation!="undefined"?!!GLEmulation.lightingEnabled:null,fog:typeof GLEmulation!="undefined"?!!GLEmulation.fogEnabled:null,fogColor:typeof GLEmulation!="undefined"&&GLEmulation.fogColor?Array.prototype.slice.call(GLEmulation.fogColor):null,materialEmission:typeof GLEmulation!="undefined"&&GLEmulation.materialEmission?Array.prototype.slice.call(GLEmulation.materialEmission):null};try{var attrCount=GLctx.getProgramParameter(program,GLctx.ACTIVE_ATTRIBUTES)||0;for(var ai=0;ai<attrCount&&ai<16;ai++){var attr=GLctx.getActiveAttrib(program,ai);if(attr)diag.attrs.push(attr.name+":"+GLctx.getAttribLocation(program,attr.name))}var uniformCount=GLctx.getProgramParameter(program,GLctx.ACTIVE_UNIFORMS)||0;for(var ui=0;ui<uniformCount&&ui<32;ui++){var uniform=GLctx.getActiveUniform(program,ui);if(uniform)diag.uniforms.push(uniform.name)}["pass","browserScreenSky","browserSkyEmission","browserSkyAlpha","browserCloudOffset","opacity","diffuseMap","maskMap","u_materialEmission","u_fogColor","a_position","osg_Vertex","osg_Color","osg_MultiTexCoord0"].forEach(function(name){if(/^a_|^osg_/.test(name))diag.locations[name]=GLctx.getAttribLocation(program,name);else diag.values[name]=tes3mpDiagUniform(program,name)})}catch(error){diag.error=error.message}return diag}function tes3mpTraceDraw(kind,mode,count,type,ptr,primcount){if(count<1000)return;var state=tes3mpDrawCompatState();state.traceCount=state.traceCount||0;state.traceSeen=state.traceSeen||{};var key=kind+":"+mode+":"+count+":"+(type||0)+":"+(GL.currProgram||0)+":"+(GLctx.currentArrayBufferBinding||0)+":"+(GLctx.currentElementArrayBufferBinding||0);if(state.traceSeen[key])return;state.traceSeen[key]=1;if(state.traceCount++<160&&typeof Module!="undefined"&&Module["printErr"]){Module["printErr"]("TES3MP draw trace kind="+kind+" mode="+mode+" count="+count+" type="+(type||0)+" ptr="+(ptr||0)+" prim="+(primcount||0)+" currProgram="+(GL.currProgram||0)+" array="+(GLctx.currentArrayBufferBinding||0)+" element="+(GLctx.currentElementArrayBufferBinding||0)+" immAttrs="+(GLImmediate.totalEnabledClientAttributes||0)+" immMode="+(GLImmediate.mode||0));var program=(GL.currProgram&&GL.programs)?GL.programs[GL.currProgram]:GLctx.currentProgram;if(program&&(count==1320||count==1440||count==6400||count==9600||/\bpass\b/.test((tes3mpShaderSources&&tes3mpShaderSources[GL.currProgram])||""))){state.skyDiagCount=state.skyDiagCount||0;if(state.skyDiagCount++<40)Module["printErr"]("TES3MP_SKY_DRAW_DIAG "+JSON.stringify(tes3mpDiagProgram(program)))}}}function tes3mpRecordUnsafeImmediateDraw`
		        );
		        helperPatch = helperPatch.replace(
		          "function tes3mpDrawArraysCompat(mode,first,count){if(!tes3mpSafeDrawCount(count))",
		          "function tes3mpDrawArraysCompat(mode,first,count){tes3mpTraceDraw(\"arrays\",mode,count,0,first,0);if(!tes3mpSafeDrawCount(count))"
		        );
		        helperPatch = helperPatch.replace(
		          "function tes3mpDrawElementsCompat(mode,count,type,ptr){if(!tes3mpSafeDrawCount(count))",
		          "function tes3mpDrawElementsCompat(mode,count,type,ptr){tes3mpTraceDraw(\"elements\",mode,count,type,ptr,0);if(!tes3mpSafeDrawCount(count))"
		        );
		        helperPatch = helperPatch.replace(
		          "function tes3mpDrawArraysInstancedCompat(mode,first,count,primcount){if(!tes3mpSafeDrawCount(count)",
		          "function tes3mpDrawArraysInstancedCompat(mode,first,count,primcount){tes3mpTraceDraw(\"arrays-instanced\",mode,count,0,first,primcount);if(!tes3mpSafeDrawCount(count)"
		        );
			        helperPatch = helperPatch.replace(
			          "function tes3mpDrawElementsInstancedCompat(mode,count,type,ptr,primcount){if(!tes3mpSafeDrawCount(count)",
			          "function tes3mpDrawElementsInstancedCompat(mode,count,type,ptr,primcount){tes3mpTraceDraw(\"elements-instanced\",mode,count,type,ptr,primcount);if(!tes3mpSafeDrawCount(count)"
			        );
			        helperPatch = helperPatch.replace(
			          "function tes3mpTraceDraw(kind,mode,count,type,ptr,primcount){if(count<1000)return;",
			          "function tes3mpTraceDraw(kind,mode,count,type,ptr,primcount){var program=(GL.currProgram&&GL.programs)?GL.programs[GL.currProgram]:GLctx.currentProgram;var shaderSrc=\"\";try{var shaderIds=GL&&GL.programShaders?GL.programShaders[GL.currProgram]:null;if(shaderIds){for(var si=0;si<shaderIds.length;si++)shaderSrc+=tes3mpShaderSources[shaderIds[si]]||\"\"}}catch(error){}var isSkyProgram=/\\bPASS_CLOUDS\\b|\\bPASS_ATMOSPHERE\\b|\\bbrowserScreenSky\\b|\\bbrowserSky(?:Emission|Alpha|Color)\\b|\\bpaint(?:Atmosphere|AtmosphereNight|Clouds)\\s*\\(/.test(shaderSrc);if(count<1000&&!isSkyProgram)return;"
			        );
			        helperPatch = helperPatch.replace(
			          "var program=(GL.currProgram&&GL.programs)?GL.programs[GL.currProgram]:GLctx.currentProgram;if(program&&(count==1320||count==1440||count==6400||count==9600||/\\bpass\\b/.test((tes3mpShaderSources&&tes3mpShaderSources[GL.currProgram])||\"\"))){",
			          "if(program&&(isSkyProgram||count==1320||count==1440||count==6400||count==9600||/\\bpass\\b/.test((tes3mpShaderSources&&tes3mpShaderSources[GL.currProgram])||\"\"))){"
			        );
			      }
	      if (source.indexOf("function tes3mpGetIndexRange(") === -1) {
	        source = source.replace(helperTarget, helperPatch);
	      }
	      var bufferDataTarget = "function _emscripten_glBufferData(target,size,data,usage){size>>>=0;data>>>=0;switch(usage){case 35041:case 35042:usage=35040;break;case 35045:case 35046:usage=35044;break;case 35049:case 35050:usage=35048;break}GLctx.bufferData(target,data?(growMemViews(),HEAPU8).subarray(data>>>0,data+size>>>0):size,usage)}";
	      var bufferDataPatch = "function _emscripten_glBufferData(target,size,data,usage){size>>>=0;data>>>=0;switch(usage){case 35041:case 35042:usage=35040;break;case 35045:case 35046:usage=35044;break;case 35049:case 35050:usage=35048;break}tes3mpShadowBufferData(target,size,data);GLctx.bufferData(target,data?(growMemViews(),HEAPU8).subarray(data>>>0,data+size>>>0):size,usage)}";
	      if (source.indexOf(bufferDataTarget) === -1) {
	        console.warn("TES3MP element buffer data patch target missing");
	      } else {
	        source = source.replace(bufferDataTarget, bufferDataPatch);
	      }

	      var bufferSubDataTarget = "function _emscripten_glBufferSubData(target,offset,size,data){offset>>>=0;size>>>=0;data>>>=0;return webglBufferSubData(target,offset,size,data)}";
	      var bufferSubDataPatch = "function _emscripten_glBufferSubData(target,offset,size,data){offset>>>=0;size>>>=0;data>>>=0;tes3mpShadowBufferSubData(target,offset,size,data);return webglBufferSubData(target,offset,size,data)}";
	      if (source.indexOf(bufferSubDataTarget) === -1) {
	        console.warn("TES3MP element buffer subdata patch target missing");
	      } else {
	        source = source.replace(bufferSubDataTarget, bufferSubDataPatch);
	      }

	      var drawElementsTarget = "function _emscripten_glDrawElements(mode,count,type,indices,start,end){indices>>>=0;if(GLImmediate.totalEnabledClientAttributes==0&&mode<=6&&GLctx.currentElementArrayBufferBinding){GLctx.drawElements(mode,count,type,indices);return}GLImmediate.prepareClientAttributes(count,false);GLImmediate.mode=mode;if(!GLctx.currentArrayBufferBinding){GLImmediate.firstVertex=end?start:(growMemViews(),HEAP8).length;GLImmediate.lastVertex=end?end+1:0;start=GLImmediate.vertexPointer;if(end){end=GLImmediate.vertexPointer+(end+1)*GLImmediate.stride;GLImmediate.vertexData=(growMemViews(),HEAPF32).subarray(start>>>2>>>0,end>>>2>>>0)}else{GLImmediate.vertexData=(growMemViews(),HEAPF32).subarray(start>>>2>>>0)}}GLImmediate.flush(count,0,indices);GLImmediate.mode=-1}";
			      var drawElementsPatch = "function _emscripten_glDrawElements(mode,count,type,indices,start,end){indices>>>=0;if(GLImmediate.totalEnabledClientAttributes==0&&mode<=6&&GLctx.currentElementArrayBufferBinding){if(typeof tes3mpUploadClientAttribs==\"function\"&&!tes3mpUploadClientAttribs(0,count,type,indices))return;tes3mpDrawElementsCompat(mode,count,type,indices);return}var hasKnownIndexRange=false;var elementBuffer=GLctx.currentElementArrayBufferBinding?GL.buffers[GLctx.currentElementArrayBufferBinding]:null;var elementIndexBytes=elementBuffer&&(elementBuffer.emscriptenElementArrayBufferData||elementBuffer.emscriptenBufferData);var bytesPerIndex=type==GLctx.UNSIGNED_BYTE?1:type==GLctx.UNSIGNED_SHORT?2:4;var indicesAreClientSide=!GLctx.currentElementArrayBufferBinding||!GLctx.currentArrayBufferBinding&&indices>65536&&(!elementIndexBytes||indices+count*bytesPerIndex>elementIndexBytes.length);if(!GLctx.currentArrayBufferBinding&&!end&&count>0){var indexRange=tes3mpGetIndexRange(indicesAreClientSide?(growMemViews(),HEAPU8):elementIndexBytes,indices,count,type);if(indexRange){hasKnownIndexRange=true;start=indexRange[0];end=indexRange[1]-1}else if(!indicesAreClientSide&&GLctx.currentElementArrayBufferBinding){tes3mpRecordUnsafeImmediateDraw(\"missing tracked element index range\",mode,count,type,indices);return}}if(typeof tes3mpUploadClientAttribs==\"function\"&&!tes3mpUploadClientAttribs(0,count,type,indices))return;GLImmediate.prepareClientAttributes(hasKnownIndexRange||end?end+1:count,false);GLImmediate.mode=mode;if(!GLctx.currentArrayBufferBinding){GLImmediate.firstVertex=hasKnownIndexRange||end?start:(growMemViews(),HEAP8).length;GLImmediate.lastVertex=hasKnownIndexRange||end?end+1:0;start=GLImmediate.vertexPointer;if(hasKnownIndexRange||end){end=GLImmediate.vertexPointer+(end+1)*GLImmediate.stride;GLImmediate.vertexData=(growMemViews(),HEAPF32).subarray(start>>>2>>>0,end>>>2>>>0)}else{GLImmediate.vertexData=(growMemViews(),HEAPF32).subarray(start>>>2>>>0)}}GLImmediate.flush(count,0,indices,type);GLImmediate.mode=-1}";
	      if (source.indexOf(drawElementsTarget) === -1) {
	        console.warn("TES3MP drawElements range patch target missing");
	      } else {
	        source = source.replace(drawElementsTarget, drawElementsPatch);
	      }

	      var flushTarget = "flush(numProvidedIndexes,startIndex=0,ptr=0){var renderer=GLImmediate.getRenderer();var numVertices=4*GLImmediate.vertexCounter/GLImmediate.stride;if(!numVertices)return;var emulatedElementArrayBuffer=false;var numIndexes=0;if(numProvidedIndexes){numIndexes=numProvidedIndexes;if(!GLctx.currentArrayBufferBinding&&GLImmediate.firstVertex>GLImmediate.lastVertex){for(var i=0;i<numProvidedIndexes;i++){var currIndex=(growMemViews(),HEAPU16)[ptr+i*2>>>1>>>0];GLImmediate.firstVertex=Math.min(GLImmediate.firstVertex,currIndex);GLImmediate.lastVertex=Math.max(GLImmediate.lastVertex,currIndex+1)}}if(!GLctx.currentElementArrayBufferBinding){var byteSize=numProvidedIndexes<<1;var indexBuffer=GL.getTempIndexBuffer(byteSize);GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER,indexBuffer);webglBufferSubData(GLctx.ELEMENT_ARRAY_BUFFER,0,byteSize,ptr);ptr=0;emulatedElementArrayBuffer=true}}else if(GLImmediate.mode>6){if(GLImmediate.mode!=7)abort(\"unsupported immediate mode \"+GLImmediate.mode);ptr=GLImmediate.firstVertex*3;var numQuads=numVertices/4;numIndexes=numQuads*6;GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER,GL.currentContext.tempQuadIndexBuffer);emulatedElementArrayBuffer=true;GLImmediate.mode=GLctx.TRIANGLES}renderer.prepare();if(numIndexes){GLctx.drawElements(GLImmediate.mode,numIndexes,GLctx.UNSIGNED_SHORT,ptr)}else{GLctx.drawArrays(GLImmediate.mode,startIndex,numVertices)}if(emulatedElementArrayBuffer){GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER,GL.buffers[GLctx.currentElementArrayBufferBinding]||null)}}";
		      var flushPatch = "flush(numProvidedIndexes,startIndex=0,ptr=0,indexType=GLctx.UNSIGNED_SHORT){var renderer=GLImmediate.getRenderer();var numVertices=4*GLImmediate.vertexCounter/GLImmediate.stride;if(!numVertices)return;var emulatedElementArrayBuffer=false;var numIndexes=0;if(numProvidedIndexes){numIndexes=numProvidedIndexes;var indexByteSize=indexType==GLctx.UNSIGNED_INT?4:indexType==GLctx.UNSIGNED_BYTE?1:2;var elementBuffer=GLctx.currentElementArrayBufferBinding?GL.buffers[GLctx.currentElementArrayBufferBinding]:null;var elementIndexBytes=elementBuffer&&(elementBuffer.emscriptenElementArrayBufferData||elementBuffer.emscriptenBufferData);var useClientElementArray=!GLctx.currentArrayBufferBinding&&(!GLctx.currentElementArrayBufferBinding||ptr>65536&&(!elementIndexBytes||ptr+numProvidedIndexes*indexByteSize>elementIndexBytes.length));if(!GLctx.currentArrayBufferBinding&&GLImmediate.firstVertex>GLImmediate.lastVertex){if(!useClientElementArray&&GLctx.currentElementArrayBufferBinding){var indexRange=tes3mpGetIndexRange(elementIndexBytes,ptr,numProvidedIndexes,indexType);if(indexRange){GLImmediate.firstVertex=indexRange[0];GLImmediate.lastVertex=indexRange[1]}else{tes3mpRecordUnsafeImmediateDraw(\"missing tracked element range in flush\",GLImmediate.mode,numProvidedIndexes,indexType,ptr);return}}else{var indexRange=tes3mpGetIndexRange((growMemViews(),HEAPU8),ptr,numProvidedIndexes,indexType);if(indexRange){GLImmediate.firstVertex=indexRange[0];GLImmediate.lastVertex=indexRange[1]}else{for(var i=0;i<numProvidedIndexes;i++){var currIndex;if(indexType==GLctx.UNSIGNED_BYTE){currIndex=(growMemViews(),HEAPU8)[ptr+i>>>0]}else if(indexType==GLctx.UNSIGNED_SHORT){currIndex=(growMemViews(),HEAPU16)[(ptr>>>1)+i>>>0]}else{currIndex=(growMemViews(),HEAPU32)[(ptr>>>2)+i>>>0]}GLImmediate.firstVertex=Math.min(GLImmediate.firstVertex,currIndex);GLImmediate.lastVertex=Math.max(GLImmediate.lastVertex,currIndex+1)}}}}if(!GLctx.currentElementArrayBufferBinding||useClientElementArray){var byteSize=numProvidedIndexes*indexByteSize;var indexBuffer=GL.getTempIndexBuffer(byteSize);GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER,indexBuffer);webglBufferSubData(GLctx.ELEMENT_ARRAY_BUFFER,0,byteSize,ptr);ptr=0;emulatedElementArrayBuffer=true}}else if(GLImmediate.mode>6){if(GLImmediate.mode!=7)abort(\"unsupported immediate mode \"+GLImmediate.mode);ptr=GLImmediate.firstVertex*3;var numQuads=numVertices/4;numIndexes=numQuads*6;GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER,GL.currentContext.tempQuadIndexBuffer);emulatedElementArrayBuffer=true;GLImmediate.mode=GLctx.TRIANGLES}renderer.prepare();if(numIndexes){tes3mpDrawElementsCompat(GLImmediate.mode,numIndexes,indexType,ptr)}else{tes3mpDrawArraysCompat(GLImmediate.mode,startIndex,numVertices)}if(emulatedElementArrayBuffer){GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER,GL.buffers[GLctx.currentElementArrayBufferBinding]||null)}if(renderer.cleanup)renderer.cleanup()}";
	      if (source.indexOf(flushTarget) === -1) {
	        console.warn("TES3MP GLImmediate flush parity patch target missing");
	      } else {
	        source = source.replace(flushTarget, flushPatch);
	      }

	      return source;
	    }

	    function patchTes3mpClientVertexAttribArrays(source) {
	      if (source.indexOf("_emscripten_glVertexAttribPointer") === -1 ||
	          source.indexOf("GLctx.drawArrays(mode,first,count);return") === -1) {
	        return source;
	      }

	      var helperTargets = [
	        "function _emscripten_glVertexAttribPointer(index,size,type,normalized,stride,ptr){ptr>>>=0;",
	        "var _emscripten_glVertexAttribPointer=(index,size,type,normalized,stride,ptr)=>{"
	      ];
	      var helperPatch = String.raw`var tes3mpClientAttribs=[];function tes3mpClientAttribByteSize(type){var size=GL.byteSizeByType&&GL.byteSizeByType[type-GL.byteSizeByTypeRoot];if(size)return size;if(type==5120||type==5121)return 1;if(type==5122||type==5123||type==5131)return 2;if(type==5124||type==5125||type==5126)return 4;return 0}function tes3mpHasClientAttribs(){for(var i=0;i<tes3mpClientAttribs.length;i++){var attrib=tes3mpClientAttribs[i];if(attrib&&attrib.enabled&&attrib.clientPointer)return true}return false}function tes3mpUploadClientAttribs(first,count,indexType,indexPtr){if(count<=0)return true;if(!tes3mpHasClientAttribs())return true;var highestVertex=Math.max(0,(first||0)+count);if(indexType&&typeof tes3mpGetIndexRange=="function"){var indexBytes=null;var hasBoundElement=!!GLctx.currentElementArrayBufferBinding;if(hasBoundElement){var elementBuffer=GL.buffers[GLctx.currentElementArrayBufferBinding];indexBytes=elementBuffer&&(elementBuffer.emscriptenElementArrayBufferData||elementBuffer.emscriptenBufferData)}var indexRange=null;if(hasBoundElement){if(!indexBytes){if(typeof tes3mpRecordUnsafeImmediateDraw=="function")tes3mpRecordUnsafeImmediateDraw("missing element shadow for client attrib upload",0,count,indexType,indexPtr);return false}indexRange=tes3mpGetIndexRange(indexBytes,indexPtr>>>0,count,indexType)}else{indexRange=tes3mpGetIndexRange((growMemViews(),HEAPU8),indexPtr>>>0,count,indexType)}if(indexRange)highestVertex=indexRange[1];else if(hasBoundElement){if(typeof tes3mpRecordUnsafeImmediateDraw=="function")tes3mpRecordUnsafeImmediateDraw("missing element range for client attrib upload",0,count,indexType,indexPtr);return false}}var previousArrayBuffer=GLctx.currentArrayBufferBinding||0;var uploadedAny=false;for(var attribIndex=0;attribIndex<tes3mpClientAttribs.length;attribIndex++){var attrib=tes3mpClientAttribs[attribIndex];if(!attrib||!attrib.enabled||!attrib.clientPointer)continue;var typeSize=tes3mpClientAttribByteSize(attrib.type);if(!typeSize||!attrib.size)continue;var vertexSize=attrib.size*typeSize;var attribStride=attrib.stride||vertexSize;var byteLength=highestVertex>0?(highestVertex-1)*attribStride+vertexSize:0;var byteOffset=attrib.ptr>>>0;if(byteLength<=0)continue;var heap=(growMemViews(),HEAPU8);if(byteOffset>=heap.length){if(typeof tes3mpRecordUnsafeImmediateDraw=="function")tes3mpRecordUnsafeImmediateDraw("client attrib outside heap",0,count,indexType||0,byteOffset);return false}byteLength=Math.min(byteLength,heap.length-byteOffset,8388608);if(!attrib.clientBuffer)attrib.clientBuffer=GLctx.createBuffer();GLctx.bindBuffer(GLctx.ARRAY_BUFFER,attrib.clientBuffer);GLctx.bufferData(GLctx.ARRAY_BUFFER,heap.subarray(byteOffset,byteOffset+byteLength),GLctx.STREAM_DRAW);GLctx.vertexAttribPointer(attribIndex,attrib.size,attrib.type,attrib.normalized,attrib.stride,0);uploadedAny=true}if(uploadedAny)GLctx.bindBuffer(GLctx.ARRAY_BUFFER,GL.buffers[previousArrayBuffer]||null);return true}` + "__TES3MP_CLIENT_ATTRIB_HELPER_TARGET__";
	      if (source.indexOf("function tes3mpUploadClientAttribs(") === -1) {
	        var helperTarget = helperTargets.find(function(target) { return source.indexOf(target) !== -1; });
	        if (!helperTarget) {
	          console.warn("TES3MP client attrib helper patch target missing");
	        } else {
	          source = source.replace(helperTarget, helperPatch.replace("__TES3MP_CLIENT_ATTRIB_HELPER_TARGET__", helperTarget));
	        }
	      }

	      var vertexAttribTargets = [
	        [
	          "function _emscripten_glVertexAttribPointer(index,size,type,normalized,stride,ptr){ptr>>>=0;GLctx.vertexAttribPointer(index,size,type,!!normalized,stride,ptr)}",
	          "function _emscripten_glVertexAttribPointer(index,size,type,normalized,stride,ptr){ptr>>>=0;var attrib=tes3mpClientAttribs[index]||{};attrib.size=size;attrib.type=type;attrib.normalized=!!normalized;attrib.stride=stride;attrib.ptr=ptr;attrib.clientPointer=!GLctx.currentArrayBufferBinding;attrib.bound=GLctx.currentArrayBufferBinding||0;tes3mpClientAttribs[index]=attrib;if(attrib.clientPointer)return;GLctx.vertexAttribPointer(index,size,type,!!normalized,stride,ptr)}"
	        ],
	        [
	          "var _emscripten_glVertexAttribPointer=(index,size,type,normalized,stride,ptr)=>{GLctx.vertexAttribPointer(index,size,type,!!normalized,stride,ptr)};",
	          "var _emscripten_glVertexAttribPointer=(index,size,type,normalized,stride,ptr)=>{ptr>>>=0;var attrib=tes3mpClientAttribs[index]||{};attrib.size=size;attrib.type=type;attrib.normalized=!!normalized;attrib.stride=stride;attrib.ptr=ptr;attrib.clientPointer=!GLctx.currentArrayBufferBinding;attrib.bound=GLctx.currentArrayBufferBinding||0;tes3mpClientAttribs[index]=attrib;if(attrib.clientPointer)return;GLctx.vertexAttribPointer(index,size,type,!!normalized,stride,ptr)};"
	        ]
	      ];
	      var vertexAttribPatched = false;
	      for (var vertexAttribTargetIndex = 0; vertexAttribTargetIndex < vertexAttribTargets.length; vertexAttribTargetIndex++) {
	        if (source.indexOf(vertexAttribTargets[vertexAttribTargetIndex][0]) !== -1) {
	          source = source.replace(vertexAttribTargets[vertexAttribTargetIndex][0], vertexAttribTargets[vertexAttribTargetIndex][1]);
	          vertexAttribPatched = true;
	          break;
	        }
	      }
	      if (!vertexAttribPatched) {
	        console.warn("TES3MP client attrib pointer patch target missing");
	      }

	      var enableTarget = "var _emscripten_glEnableVertexAttribArray=index=>{GLctx.enableVertexAttribArray(index)};";
	      var enablePatch = "var _emscripten_glEnableVertexAttribArray=index=>{tes3mpClientAttribs[index]=tes3mpClientAttribs[index]||{};tes3mpClientAttribs[index].enabled=true;GLctx.enableVertexAttribArray(index)};";
	      if (source.indexOf(enableTarget) === -1) {
	        console.warn("TES3MP client attrib enable patch target missing");
	      } else {
	        source = source.replace(enableTarget, enablePatch);
	      }

	      var disableTarget = "var _emscripten_glDisableVertexAttribArray=index=>{GLctx.disableVertexAttribArray(index)};";
	      var disablePatch = "var _emscripten_glDisableVertexAttribArray=index=>{tes3mpClientAttribs[index]=tes3mpClientAttribs[index]||{};tes3mpClientAttribs[index].enabled=false;GLctx.disableVertexAttribArray(index)};";
	      if (source.indexOf(disableTarget) === -1) {
	        console.warn("TES3MP client attrib disable patch target missing");
	      } else {
	        source = source.replace(disableTarget, disablePatch);
	      }

		      source = source.replace(
		        "if(GLImmediate.totalEnabledClientAttributes==0&&mode<=6){GLctx.drawArrays(mode,first,count);return}",
		        "if(GLImmediate.totalEnabledClientAttributes==0&&mode<=6){if(!tes3mpUploadClientAttribs(first,count))return;if(typeof tes3mpDrawArraysCompat==\"function\")tes3mpDrawArraysCompat(mode,first,count);else GLctx.drawArrays(mode,first,count);return}"
		      );
		      source = source.replace(
		        "if(GLImmediate.totalEnabledClientAttributes==0&&mode<=6&&GLctx.currentElementArrayBufferBinding){GLctx.drawElements(mode,count,type,indices);return}",
		        "if(GLImmediate.totalEnabledClientAttributes==0&&mode<=6&&GLctx.currentElementArrayBufferBinding){if(!tes3mpUploadClientAttribs(0,count,type,indices))return;if(typeof tes3mpDrawElementsCompat==\"function\")tes3mpDrawElementsCompat(mode,count,type,indices);else GLctx.drawElements(mode,count,type,indices);return}"
		      );
	      source = source.replace(
	        "GLImmediate.prepareClientAttributes(count,false);GLImmediate.mode=mode;if(!GLctx.currentArrayBufferBinding){GLImmediate.vertexData=(growMemViews(),HEAPF32).subarray(GLImmediate.vertexPointer>>>2>>>0,GLImmediate.vertexPointer+(first+count)*GLImmediate.stride>>>2>>>0);GLImmediate.firstVertex=first;GLImmediate.lastVertex=first+count}",
	        "if(!tes3mpUploadClientAttribs(first,count))return;GLImmediate.prepareClientAttributes(count,false);GLImmediate.mode=mode;if(!GLctx.currentArrayBufferBinding){GLImmediate.vertexData=(growMemViews(),HEAPF32).subarray(GLImmediate.vertexPointer>>>2>>>0,GLImmediate.vertexPointer+(first+count)*GLImmediate.stride>>>2>>>0);GLImmediate.firstVertex=first;GLImmediate.lastVertex=first+count}"
	      );
	      source = source.replace(
	        "var _emscripten_glDrawArraysInstanced=(mode,first,count,primcount)=>{GLctx.drawArraysInstanced(mode,first,count,primcount)};",
	        "var _emscripten_glDrawArraysInstanced=(mode,first,count,primcount)=>{if(!tes3mpUploadClientAttribs(first,count))return;if(typeof tes3mpDrawArraysInstancedCompat==\"function\")tes3mpDrawArraysInstancedCompat(mode,first,count,primcount);else GLctx.drawArraysInstanced(mode,first,count,primcount)};"
	      );
	      source = source.replace(
	        "function _emscripten_glDrawElementsInstanced(mode,count,type,indices,primcount){indices>>>=0;GLctx.drawElementsInstanced(mode,count,type,indices,primcount)}",
	        "function _emscripten_glDrawElementsInstanced(mode,count,type,indices,primcount){indices>>>=0;if(!tes3mpUploadClientAttribs(0,count,type,indices))return;if(typeof tes3mpDrawElementsInstancedCompat==\"function\")tes3mpDrawElementsInstancedCompat(mode,count,type,indices,primcount);else GLctx.drawElementsInstanced(mode,count,type,indices,primcount)}"
	      );
	      source = source.replace(
	        "var _emscripten_glDrawElementsInstanced=(mode,count,type,indices,primcount)=>{GLctx.drawElementsInstanced(mode,count,type,indices,primcount)};",
	        "var _emscripten_glDrawElementsInstanced=(mode,count,type,indices,primcount)=>{if(!tes3mpUploadClientAttribs(0,count,type,indices))return;if(typeof tes3mpDrawElementsInstancedCompat==\"function\")tes3mpDrawElementsInstancedCompat(mode,count,type,indices,primcount);else GLctx.drawElementsInstanced(mode,count,type,indices,primcount)};"
	      );

	      var polygonModeTarget = "var _emscripten_glPolygonModeWEBGL=(face,mode)=>{GLctx.webglPolygonMode[\"polygonModeWEBGL\"](face,mode)};var _emscripten_glPolygonOffset=";
	      var polygonModePatch = "var _emscripten_glPolygonMode=()=>{};var _glPolygonMode=_emscripten_glPolygonMode;var _emscripten_glPolygonModeWEBGL=(face,mode)=>{if(GLctx.webglPolygonMode)GLctx.webglPolygonMode[\"polygonModeWEBGL\"](face,mode)};var _emscripten_glPolygonOffset=";
	      if (source.indexOf(polygonModeTarget) !== -1) {
	        source = source.replace(polygonModeTarget, polygonModePatch);
	      }

	      return source;
	    }

	    function patchTes3mpElementBufferCopyTracking(source) {
	      if (source.indexOf("function _emscripten_glCopyBufferSubData") === -1) {
	        return source;
	      }

	      var bindTarget = "_emscripten_glBindBuffer=(target,buffer)=>{if(target==34962){GLctx.currentArrayBufferBinding=buffer;GLImmediate.lastArrayBuffer=buffer}else if(target==34963){GLctx.currentElementArrayBufferBinding=buffer}if(target==35051){GLctx.currentPixelPackBufferBinding=buffer}else if(target==35052){GLctx.currentPixelUnpackBufferBinding=buffer}GLctx.bindBuffer(target,GL.buffers[buffer])};";
	      var bindPatch = "_emscripten_glBindBuffer=(target,buffer)=>{if(target==34962){GLctx.currentArrayBufferBinding=buffer;GLImmediate.lastArrayBuffer=buffer}else if(target==34963){GLctx.currentElementArrayBufferBinding=buffer}else if(target==36662){GLctx.currentCopyReadBufferBinding=buffer}else if(target==36663){GLctx.currentCopyWriteBufferBinding=buffer}if(target==35051){GLctx.currentPixelPackBufferBinding=buffer}else if(target==35052){GLctx.currentPixelUnpackBufferBinding=buffer}GLctx.bindBuffer(target,GL.buffers[buffer])};";
	      if (source.indexOf(bindTarget) === -1) {
	        console.warn("TES3MP copy buffer bind tracking target missing");
	      } else {
	        source = source.replace(bindTarget, bindPatch);
	      }

	      var copyTarget = "function _emscripten_glCopyBufferSubData(x0,x1,x2,x3,x4){x2>>>=0;x3>>>=0;x4>>>=0;return GLctx.copyBufferSubData(x0,x1,x2,x3,x4)}";
	      var copyPatch = "function _emscripten_glCopyBufferSubData(x0,x1,x2,x3,x4){x2>>>=0;x3>>>=0;x4>>>=0;var sourceId=x0==34963?GLctx.currentElementArrayBufferBinding:x0==36662?GLctx.currentCopyReadBufferBinding:x0==34962?GLctx.currentArrayBufferBinding:0;var destId=x1==34963?GLctx.currentElementArrayBufferBinding:x1==36663?GLctx.currentCopyWriteBufferBinding:x1==34962?GLctx.currentArrayBufferBinding:0;var sourceBuffer=sourceId?GL.buffers[sourceId]:null;var destBuffer=destId?GL.buffers[destId]:null;var sourceData=sourceBuffer&&(sourceBuffer.emscriptenElementArrayBufferData||sourceBuffer.emscriptenBufferData);if(destBuffer&&sourceData&&x4){var destData=destBuffer.emscriptenBufferData||destBuffer.emscriptenElementArrayBufferData;if(!destData||destData.length<x3+x4){var resized=new Uint8Array(x3+x4);if(destData)resized.set(destData);destData=resized}destData.set(sourceData.subarray(x2,x2+x4),x3);destBuffer.emscriptenBufferData=destData;if(x1==34963||destBuffer.emscriptenElementArrayBufferData)destBuffer.emscriptenElementArrayBufferData=destData}return GLctx.copyBufferSubData(x0,x1,x2,x3,x4)}";
	      if (source.indexOf(copyTarget) === -1) {
	        console.warn("TES3MP copy buffer subdata tracking target missing");
	      } else {
	        source = source.replace(copyTarget, copyPatch);
	      }

	      return source;
	    }

	    function patchTes3mpTextureParameterCompat(source) {
	      if (source.indexOf("_emscripten_glTexParameterf") === -1) {
	        return source;
	      }

	      var helperTarget = "var _emscripten_glTexParameterf=";
		      var helperPatch = "function tes3mpIgnoreTextureParameter(pname){return pname==4100||pname==32959||pname==33169||pname==34049}function tes3mpNormalizeTextureParameter(pname,param){if((pname==10242||pname==10243||pname==32882)&&param==10496)return 33071;return param}var _emscripten_glTexParameterf=";
	      if (source.indexOf("function tes3mpIgnoreTextureParameter(") === -1) {
	        if (source.indexOf(helperTarget) === -1) {
	          console.warn("TES3MP texture parameter helper target missing");
	        } else {
	          source = source.replace(helperTarget, helperPatch);
	        }
	      }

	      var replacements = [
	        [
	          "var _emscripten_glTexParameterf=(x0,x1,x2)=>GLctx.texParameterf(x0,x1,x2);",
		          "var _emscripten_glTexParameterf=(x0,x1,x2)=>{if(tes3mpIgnoreTextureParameter(x1))return;x2=tes3mpNormalizeTextureParameter(x1,x2);GLctx.texParameterf(x0,x1,x2)};"
	        ],
	        [
	          "var _emscripten_glTexParameterfv=(target,pname,params)=>{var param=HEAPF32[params>>2];GLctx.texParameterf(target,pname,param)};",
		          "var _emscripten_glTexParameterfv=(target,pname,params)=>{if(tes3mpIgnoreTextureParameter(pname))return;var param=tes3mpNormalizeTextureParameter(pname,HEAPF32[params>>2]);GLctx.texParameterf(target,pname,param)};"
	        ],
	        [
	          "var _emscripten_glTexParameteri=(x0,x1,x2)=>GLctx.texParameteri(x0,x1,x2);",
		          "var _emscripten_glTexParameteri=(x0,x1,x2)=>{if(tes3mpIgnoreTextureParameter(x1))return;x2=tes3mpNormalizeTextureParameter(x1,x2);GLctx.texParameteri(x0,x1,x2)};"
	        ],
	        [
	          "var _emscripten_glTexParameteriv=(target,pname,params)=>{var param=HEAP32[params>>2];GLctx.texParameteri(target,pname,param)};",
		          "var _emscripten_glTexParameteriv=(target,pname,params)=>{if(tes3mpIgnoreTextureParameter(pname))return;var param=tes3mpNormalizeTextureParameter(pname,HEAP32[params>>2]);GLctx.texParameteri(target,pname,param)};"
	        ]
	      ];
	      for (var i = 0; i < replacements.length; i++) {
	        if (source.indexOf(replacements[i][0]) === -1) {
	          console.warn("TES3MP texture parameter compatibility target missing");
	        } else {
	          source = source.replace(replacements[i][0], replacements[i][1]);
	        }
	      }

	      return source;
	    }

	    function patchTes3mpLegacyNormalOutsideBegin(source) {
	      if (source.indexOf("_emscripten_glNormal3f") === -1) {
	        return source;
	      }

	      var assertTarget = "var _emscripten_glNormal3f=(x,y,z)=>{assert(GLImmediate.mode>=0);";
	      if (source.indexOf(assertTarget) !== -1) {
	        return source.replace(assertTarget, "var _emscripten_glNormal3f=(x,y,z)=>{if(GLImmediate.mode<0)return;assert(GLImmediate.mode>=0);");
	      }
	      var directTarget = "var _emscripten_glNormal3f=(x,y,z)=>{GLImmediate.vertexData[GLImmediate.vertexCounter++]=x;";
	      if (source.indexOf(directTarget) !== -1) {
	        return source.replace(directTarget, "var _emscripten_glNormal3f=(x,y,z)=>{if(GLImmediate.mode<0)return;GLImmediate.vertexData[GLImmediate.vertexCounter++]=x;");
	      }
	      console.warn("TES3MP normal outside begin patch target missing");
	      return source;
	    }

	    function patchTes3mpBgraTextureUploads(source) {
	      if (source.indexOf("var _glTexImage2D=_emscripten_glTexImage2D") === -1) {
	        return source;
	      }

	      var helperTarget = "var _glTexImage2D=_emscripten_glTexImage2D;";
	      var helperPatch = String.raw`function tes3mpTextureBytes(pixels,count){return pixels?(growMemViews(),HEAPU8).subarray(pixels>>>0,(pixels>>>0)+Math.max(0,count|0)):null}function tes3mpConvertAlphaPixels(width,height,pixels){var count=Math.max(0,width|0)*Math.max(0,height|0);var input=tes3mpTextureBytes(pixels,count);if(!input)return null;var output=new Uint8Array(count*4);for(var i=0,j=0;i<count;i++,j+=4){output[j]=255;output[j+1]=255;output[j+2]=255;output[j+3]=input[i]}return output}function tes3mpConvertLuminancePixels(width,height,pixels){var count=Math.max(0,width|0)*Math.max(0,height|0);var input=tes3mpTextureBytes(pixels,count);if(!input)return null;var output=new Uint8Array(count*4);for(var i=0,j=0;i<count;i++,j+=4){var l=input[i];output[j]=l;output[j+1]=l;output[j+2]=l;output[j+3]=255}return output}function tes3mpConvertLuminanceAlphaPixels(width,height,pixels){var count=Math.max(0,width|0)*Math.max(0,height|0);var input=tes3mpTextureBytes(pixels,count*2);if(!input)return null;var output=new Uint8Array(count*4);for(var i=0,j=0;i<count*2;i+=2,j+=4){var l=input[i];output[j]=l;output[j+1]=l;output[j+2]=l;output[j+3]=input[i+1]}return output}function tes3mpConvertBgrPixels(width,height,pixels){var count=Math.max(0,width|0)*Math.max(0,height|0)*3;var input=tes3mpTextureBytes(pixels,count);if(!input)return null;var output=new Uint8Array(count);for(var i=0;i<count;i+=3){output[i]=input[i+2];output[i+1]=input[i+1];output[i+2]=input[i]}return output}function tes3mpConvertBgraPixels(width,height,pixels){var count=Math.max(0,width|0)*Math.max(0,height|0)*4;var input=tes3mpTextureBytes(pixels,count);if(!input)return null;var output=new Uint8Array(count);for(var i=0;i<count;i+=4){output[i]=input[i+2];output[i+1]=input[i+1];output[i+2]=input[i];output[i+3]=input[i+3]}return output}function tes3mpUploadTextureAsWebGL(target,level,internalFormat,width,height,border,format,type,pixels){if(type!==5121)return false;if(internalFormat===6402&&format===6402){GLctx.texImage2D(target,level,33189,width,height,border,format,5123,null);return true}if(format===6406||internalFormat===6406){GLctx.texImage2D(target,level,6408,width,height,border,6408,type,tes3mpConvertAlphaPixels(width,height,pixels));return true}if(format===6409||internalFormat===6409||internalFormat===32832){GLctx.texImage2D(target,level,6408,width,height,border,6408,type,tes3mpConvertLuminancePixels(width,height,pixels));return true}if(format===6410||internalFormat===6410||internalFormat===32837){GLctx.texImage2D(target,level,6408,width,height,border,6408,type,tes3mpConvertLuminanceAlphaPixels(width,height,pixels));return true}if(format===32992){GLctx.texImage2D(target,level,6407,width,height,border,6407,type,tes3mpConvertBgrPixels(width,height,pixels));return true}if(format===32993){GLctx.texImage2D(target,level,6408,width,height,border,6408,type,tes3mpConvertBgraPixels(width,height,pixels));return true}return false}function tes3mpUploadSubTextureAsWebGL(target,level,xoffset,yoffset,width,height,format,type,pixels){if(type!==5121)return false;if(format===6406){GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,6408,type,tes3mpConvertAlphaPixels(width,height,pixels));return true}if(format===6409){GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,6408,type,tes3mpConvertLuminancePixels(width,height,pixels));return true}if(format===6410){GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,6408,type,tes3mpConvertLuminanceAlphaPixels(width,height,pixels));return true}if(format===32992){GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,6407,type,tes3mpConvertBgrPixels(width,height,pixels));return true}if(format===32993){GLctx.texSubImage2D(target,level,xoffset,yoffset,width,height,6408,type,tes3mpConvertBgraPixels(width,height,pixels));return true}return false}` + helperTarget;
	      if (source.indexOf("function tes3mpUploadTextureAsWebGL(") === -1) {
	        source = source.replace(helperTarget, helperPatch);
	      }

	      var texImageTargets = [
	        "var _emscripten_glTexImage2D=(target,level,internalFormat,width,height,border,format,type,pixels)=>{",
	        "var _emscripten_glTexImage2D=(target,level,internalFormat,width,height,border,format,type,pixels)=>{pixels>>>=0;",
	        "function _emscripten_glTexImage2D(target,level,internalFormat,width,height,border,format,type,pixels){pixels>>>=0;"
	      ];
	      var texImagePatched = false;
	      for (var texImageIndex = 0; texImageIndex < texImageTargets.length; texImageIndex++) {
	        if (source.indexOf(texImageTargets[texImageIndex]) !== -1) {
	          source = source.replace(texImageTargets[texImageIndex], texImageTargets[texImageIndex] + "if(tes3mpUploadTextureAsWebGL(target,level,internalFormat,width,height,border,format,type,pixels))return;");
	          texImagePatched = true;
	          break;
	        }
	      }
	      if (!texImagePatched) {
	        console.warn("TES3MP texture texImage compatibility target missing");
	      }

	      var texSubImageTargets = [
	        "var _emscripten_glTexSubImage2D=(target,level,xoffset,yoffset,width,height,format,type,pixels)=>{",
	        "var _emscripten_glTexSubImage2D=(target,level,xoffset,yoffset,width,height,format,type,pixels)=>{pixels>>>=0;",
	        "function _emscripten_glTexSubImage2D(target,level,xoffset,yoffset,width,height,format,type,pixels){pixels>>>=0;"
	      ];
	      var texSubImagePatched = false;
	      for (var texSubImageIndex = 0; texSubImageIndex < texSubImageTargets.length; texSubImageIndex++) {
	        if (source.indexOf(texSubImageTargets[texSubImageIndex]) !== -1) {
	          source = source.replace(texSubImageTargets[texSubImageIndex], texSubImageTargets[texSubImageIndex] + "if(tes3mpUploadSubTextureAsWebGL(target,level,xoffset,yoffset,width,height,format,type,pixels))return;");
	          texSubImagePatched = true;
	          break;
	        }
	      }
	      if (!texSubImagePatched) console.warn("TES3MP texture texSubImage compatibility target missing");

	      return source;
	    }

	    function patchTes3mpLegacyMaterialEmission(source) {
	      if (source.indexOf("GLEmulation.materialEmission") === -1 ||
	          source.indexOf('abort("glMaterialfv: TODO: "+pname)') === -1) {
	        return source;
	      }

	      var target = '}else if(pname==5633){GLEmulation.materialShininess[0]=(growMemViews(),HEAPF32)[param>>>2>>>0]}else{abort("glMaterialfv: TODO: "+pname)}}';
	      var replacement = '}else if(pname==5632){GLEmulation.materialEmission[0]=(growMemViews(),HEAPF32)[param>>>2>>>0];GLEmulation.materialEmission[1]=(growMemViews(),HEAPF32)[param+4>>>2>>>0];GLEmulation.materialEmission[2]=(growMemViews(),HEAPF32)[param+8>>>2>>>0];GLEmulation.materialEmission[3]=(growMemViews(),HEAPF32)[param+12>>>2>>>0]}else if(pname==5633){GLEmulation.materialShininess[0]=(growMemViews(),HEAPF32)[param>>>2>>>0]}else{abort("glMaterialfv: TODO: "+pname)}}';
	      var targetCurrent = '}else if(pname==5633){GLEmulation.materialShininess[0]=HEAPF32[param>>2]}else{abort("glMaterialfv: TODO: "+pname)}}';
	      var replacementCurrent = '}else if(pname==5632){GLEmulation.materialEmission[0]=HEAPF32[param>>2];GLEmulation.materialEmission[1]=HEAPF32[param+4>>2];GLEmulation.materialEmission[2]=HEAPF32[param+8>>2];GLEmulation.materialEmission[3]=HEAPF32[param+12>>2]}else if(pname==5633){GLEmulation.materialShininess[0]=HEAPF32[param>>2]}else{abort("glMaterialfv: TODO: "+pname)}}';
	      if (source.indexOf(targetCurrent) !== -1) {
	        return source.replace(targetCurrent, replacementCurrent);
	      }
	      if (source.indexOf(target) === -1) {
	        console.warn("TES3MP material emission compatibility target missing");
	        return source;
	      }
	      return source.replace(target, replacement);
	    }

	    function patchOpenMwRuntimeMemoryViewFallback(source) {
	      if (source.indexOf("var GL={") === -1 ||
	          /(?:function|var)\s+growMemViews\b/.test(source)) {
	        return source;
	      }
	      return source.replace("var GL={", "var growMemViews=function(){return null};var GL={");
	    }

	    function patchOpenMwRuntimeScript(source, src) {
	      source = patchEmscriptenRuntimeScriptUrl(source, src);
	      if (typeof MorrowindOpenMwRuntimePolicy === "undefined") {
	        console.warn("OpenMW runtime policy module missing");
	      } else {
	        var shaderDetachPolicy =
	          MorrowindOpenMwRuntimePolicy.guardStaleShaderDetach(source);
	        source = shaderDetachPolicy.source;
	        if (!shaderDetachPolicy.guardedDetach) {
	          console.warn("OpenMW stale shader detach target missing");
	        }
	      }
	      source = patchOpenMwRuntimeMemoryViewFallback(source);
	      source = patchTes3mpRelayWorkerBootstrap(source);
      source = patchTes3mpBrowserHostDatagramTransport(source);
	      source = patchTes3mpOffscreenEgl(source);
	      source = patchTes3mpFixedWasmMemoryViews(source);
	      source = patchTes3mpKeyboardTextInput(source);
	      source = patchTes3mpStaleEventCallbackGuard(source);
	      source = patchTes3mpWorkerWebGLCompat(source);
	      source = patchTes3mpFixedFunctionRenderCompat(source);
	      source = patchTes3mpImmediateIndexTypes(source);
	      source = patchTes3mpClientVertexAttribArrays(source);
	      source = patchTes3mpElementBufferCopyTracking(source);
		      source = patchTes3mpTextureParameterCompat(source);
      source = patchTes3mpCppExceptionDiagnostics(source);
		      source = patchTes3mpLegacyMaterialEmission(source);
		      source = patchTes3mpLegacyNormalOutsideBegin(source);
		      source = patchTes3mpBgraTextureUploads(source);
		      source = patchOpenMwRuntimeCanvasSizing(source);
	      source = patchOpenMwRuntimeMouseMovementCarry(source);
	      source = patchTes3mpOffscreenCanvasResizeProxy(source);

      if (!/(?:^|[?&])unsafe-ubopatch=1(?:&|$)/.test(window.location.search) ||
          /(?:^|[?&])no-ubopatch=1(?:&|$)/.test(window.location.search)) {
        return source;
      }
      var filteredExtensionList = '"WEBGL_multi_draw","WEBGL_polygon_mode"]';
      var patchedExtensionList = '"WEBGL_multi_draw","WEBGL_polygon_mode","GL_ARB_uniform_buffer_object"]';
      if (source.indexOf('"GL_ARB_uniform_buffer_object"') !== -1) return source;
      if (source.indexOf(filteredExtensionList) === -1) {
        console.warn("OpenMW runtime extension patch target missing");
        return source;
      }
      return source.replace(filteredExtensionList, patchedExtensionList);
    }
