    function browserHostClientRelay() {
      return typeof globalThis !== "undefined" && globalThis.__tes3mpWebRelay
        ? globalThis.__tes3mpWebRelay
        : null;
    }

    function ensureBrowserHostRelayShared(runtime) {
      if (!runtime) return null;
      if (runtime.relaySharedState) return runtime.relaySharedState;
      if (typeof SharedArrayBuffer !== "function" || typeof Atomics === "undefined") return null;
      var shared = Module.__tes3mpRelayShared ||
        (typeof globalThis !== "undefined" && globalThis.__tes3mpRelayShared) ||
        null;
      var slotCount = shared && shared.slotCount || 512;
      var slotSize = shared && shared.slotSize || 1536;
      var controlInts = shared && shared.controlInts || 16;
      if (!shared || !shared.buffer) {
        var byteLength = controlInts * 4 + (slotCount * 8 + slotCount * slotSize) * 2;
        shared = {
          buffer: new SharedArrayBuffer(byteLength),
          slotCount: slotCount,
          slotSize: slotSize,
          controlInts: controlInts
        };
      }
      Module.__tes3mpRelayShared = shared;
      if (typeof window !== "undefined") window.__tes3mpRelayShared = shared;
      if (typeof globalThis !== "undefined") globalThis.__tes3mpRelayShared = shared;

      var lengthsOffset = controlInts * 4;
      var rxPortsOffset = lengthsOffset + slotCount * 4;
      var rxDataOffset = rxPortsOffset + slotCount * 4;
      var txLengthsOffset = rxDataOffset + slotCount * slotSize;
      var txPortsOffset = txLengthsOffset + slotCount * 4;
      var txDataOffset = txPortsOffset + slotCount * 4;
      var state = {
        shared: shared,
        control: new Int32Array(shared.buffer, 0, controlInts),
        rxLengths: new Int32Array(shared.buffer, lengthsOffset, slotCount),
        rxPorts: new Int32Array(shared.buffer, rxPortsOffset, slotCount),
        rxSlots: new Uint8Array(shared.buffer, rxDataOffset, slotCount * slotSize),
        txLengths: new Int32Array(shared.buffer, txLengthsOffset, slotCount),
        txPorts: new Int32Array(shared.buffer, txPortsOffset, slotCount),
        txSlots: new Uint8Array(shared.buffer, txDataOffset, slotCount * slotSize),
        slotCount: slotCount,
        slotSize: slotSize
      };
      Atomics.store(state.control, 3, 1);
      Atomics.store(state.control, 4, (runtime.serverPort || browserHostSyntheticServerPort) | 0);
      runtime.relaySharedState = state;
      return state;
    }

    function enqueueBrowserHostRelayRing(state, bytes, port, writeIndex, readIndex, dropIndex, lengths, ports, slots) {
      if (!state || !bytes) return false;
      bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
      var write = Atomics.load(state.control, writeIndex);
      var read = Atomics.load(state.control, readIndex);
      var next = (write + 1) % state.slotCount;
      if (next === read) {
        Atomics.store(state.control, readIndex, (read + 1) % state.slotCount);
        Atomics.add(state.control, dropIndex, 1);
      }
      var length = Math.min(bytes.byteLength, state.slotSize);
      slots.set(bytes.subarray(0, length), write * state.slotSize);
      Atomics.store(lengths, write, length);
      Atomics.store(ports, write, (Number(port) || browserHostSyntheticServerPort) & 0xffff);
      Atomics.store(state.control, writeIndex, next);
      Atomics.notify(state.control, writeIndex, 1);
      return true;
    }

    function enqueueBrowserHostRelayShared(runtime, bytes, sourcePort) {
      var state = ensureBrowserHostRelayShared(runtime);
      if (!state) return false;
      return enqueueBrowserHostRelayRing(
        state,
        bytes,
        sourcePort,
        0,
        1,
        2,
        state.rxLengths,
        state.rxPorts,
        state.rxSlots
      );
    }

    function pumpBrowserHostRelayShared(runtime) {
      var state = ensureBrowserHostRelayShared(runtime);
      if (!state || !Module.__tes3mpDatagramTransport) return;
      var guard = 0;
      while (guard++ < state.slotCount) {
        var read = Atomics.load(state.control, 9);
        var write = Atomics.load(state.control, 8);
        if (read === write) return;
        var length = Math.min(Atomics.load(state.txLengths, read), state.slotSize);
        var targetPort = Atomics.load(state.txPorts, read) || runtime.serverPort || browserHostSyntheticServerPort;
        var start = read * state.slotSize;
        var bytes = state.txSlots.slice(start, start + length);
        Atomics.store(state.control, 9, (read + 1) % state.slotCount);
        Atomics.add(state.control, 12, 1);
        Module.__tes3mpDatagramTransport.send(bytes, targetPort);
      }
    }

    function startBrowserHostRelaySharedPump(runtime) {
      if (!runtime || runtime.relaySharedPumpTimer) return;
      ensureBrowserHostRelayShared(runtime);
      runtime.relaySharedPumpTimer = setInterval(function() {
        pumpBrowserHostRelayShared(runtime);
      }, 1);
    }

    function enqueueBrowserHostClientPacket(runtime, packet) {
      recordBrowserHostDatagram(runtime, "server-to-client-enqueue", packet.sourcePort, packet.bytes);
      if (enqueueBrowserHostRelayShared(runtime, packet.bytes, packet.sourcePort)) return true;
      var relay = browserHostClientRelay();
      if (relay && relay.enqueueShared) {
        try {
          if (relay.ensureShared) relay.ensureShared();
          if (relay.enqueueShared(packet.bytes, packet.sourcePort) !== false) return true;
        } catch (error) {
        }
      }
      runtime.clientInbox.push(packet);
      return false;
    }

    function flushBrowserHostClientInbox(runtime) {
      if (!runtime || !runtime.clientInbox || !runtime.clientInbox.length) return;
      var relay = browserHostClientRelay();
      if (!relay || !relay.enqueueShared) return;
      var pending = runtime.clientInbox;
      runtime.clientInbox = [];
      pending.forEach(function(packet) {
        try {
          if (relay.ensureShared) relay.ensureShared();
          if (relay.enqueueShared(packet.bytes, packet.sourcePort) !== false) return;
        } catch (error) {
        }
        runtime.clientInbox.push(packet);
      });
    }

    function startBrowserHostClientInboxPump(runtime) {
      if (!runtime || runtime.clientInboxPumpTimer) return;
      runtime.clientInboxPumpTimer = setInterval(function() {
        flushBrowserHostClientInbox(runtime);
      }, 10);
    }

    function routeBrowserHostServerDatagram(runtime, targetPort, bytes) {
      var packet = {
        bytes: copyBrowserHostBytes(bytes),
        sourcePort: runtime.serverPort
      };
      if (targetPort === runtime.localPort) {
        recordBrowserHostDatagram(runtime, "server-to-client-local", targetPort, packet.bytes);
        enqueueBrowserHostClientPacket(runtime, packet);
        return;
      }
      var peer = runtime.peersByPort[targetPort];
      if (!browserHostPeerOpen(peer)) {
        if (peer) disposeBrowserHostPeer(runtime, peer, "route-closed-peer");
        recordBrowserHostDatagram(runtime, "server-to-peer-drop", targetPort, packet.bytes);
        return;
      }
      var frame = encodeBrowserHostFrame(runtime.serverPort, packet.bytes);
      sendBrowserHostDataChannelFrame(
        runtime,
        peer.channel,
        "server-to-peer",
        "server-to-peer-drop",
        targetPort,
        frame.buffer,
        packet.bytes
      );
    }

    function createBrowserHostServerWorker(runtime) {
      return new Promise(function(resolve, reject) {
        var settled = false;
        var workerUrl = new URL(versionedRuntimeFile("tes3mp-browser-host-worker.js"));
        workerUrl.searchParams.set("server", versionedRuntimeFile(
          runtime.config &&
          runtime.config.browserHost &&
          runtime.config.browserHost.runtime &&
          runtime.config.browserHost.runtime.script
            ? runtime.config.browserHost.runtime.script
            : "tes3mp-server.js"
        ));
        workerUrl.searchParams.set("wasm", versionedRuntimeFile(
          runtime.config &&
          runtime.config.browserHost &&
          runtime.config.browserHost.runtime &&
          runtime.config.browserHost.runtime.wasm
            ? runtime.config.browserHost.runtime.wasm
            : "tes3mp-server.wasm"
        ));
        workerUrl.searchParams.set("data", versionedRuntimeFile(
          runtime.config &&
          runtime.config.browserHost &&
          runtime.config.browserHost.runtime &&
          runtime.config.browserHost.runtime.data
            ? runtime.config.browserHost.runtime.data
            : "tes3mp-server.data"
        ));
        if (runtime.config && runtime.config.playerName) {
          workerUrl.searchParams.set("hostPlayer", runtime.config.playerName);
        }
        if (runtime.config && runtime.config.hostSettings) {
          if (runtime.config.hostSettings.timeOfDay) {
            workerUrl.searchParams.set("timeOfDay", runtime.config.hostSettings.timeOfDay);
          }
          if (runtime.config.hostSettings.weather) {
            workerUrl.searchParams.set("weather", runtime.config.hostSettings.weather);
          }
        }
        if (browserHostDebugEnabled()) workerUrl.searchParams.set("debug", "1");
        var worker = new Worker(workerUrl.href, {
          name: "tes3mp-server-host"
        });
        var timer = setTimeout(function() {
          if (settled) return;
          settled = true;
          runtime.serverReady = false;
          runtime.serverFailed = true;
          reject(new Error("Client-hosted TES3MP server startup timed out."));
        }, 45000);
        runtime.serverWorker = worker;
        worker.onmessage = function(event) {
          var message = event.data || {};
          if (message.type === "ready") {
            runtime.serverReady = true;
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(true);
          } else if (message.type === "datagram") {
            recordBrowserHostDatagram(runtime, "server-worker-out", Number(message.targetPort) || 0, message.bytes);
            routeBrowserHostServerDatagram(runtime, Number(message.targetPort) || 0, message.bytes);
          } else if (message.type === "log") {
            if (message.stream === "stderr") console.warn("[tes3mp-server]", message.line);
            else console.info("[tes3mp-server]", message.line);
          } else if (message.type === "error") {
            console.error("[tes3mp-server]", message.message);
            runtime.serverReady = false;
            runtime.serverFailed = true;
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              reject(new Error(message.message || "Client-hosted TES3MP server failed."));
            }
          } else if (message.type === "exit") {
            console.warn("[tes3mp-server] exited", message.code);
            runtime.serverReady = false;
            runtime.serverFailed = true;
          }
        };
        worker.onerror = function(error) {
          runtime.serverReady = false;
          runtime.serverFailed = true;
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            var detail = error && error.message
              ? error.message
              : error && error.filename
                ? error.filename + ":" + (error.lineno || 0) + " " + (error.message || "")
                : "Client-hosted TES3MP server worker failed.";
            reject(new Error(detail || "Client-hosted TES3MP server worker failed."));
          }
        };
      });
    }

    function installBrowserHostTransport(runtime) {
      Module.__tes3mpDatagramTransport = {
        send: function(bytes, targetPort) {
          var packet = copyBrowserHostBytes(bytes);
          if (runtime.mode === "host") {
            if (!runtime.serverWorker) return 0;
            recordBrowserHostDatagram(runtime, "client-to-server-local", runtime.serverPort, packet);
            runtime.serverWorker.postMessage({
              type: "datagram",
              sourcePort: runtime.localPort,
              bytes: packet
            }, [packet.buffer]);
            return packet.byteLength;
          }
          var frame = encodeBrowserHostFrame(targetPort || runtime.serverPort, packet);
          return sendBrowserHostDataChannelFrame(
            runtime,
            runtime.channel,
            "client-to-host-peer",
            "client-to-host-drop",
            targetPort || runtime.serverPort,
            frame.buffer,
            packet
          );
        },
        recv: function() {
          flushBrowserHostClientInbox(runtime);
          return runtime.clientInbox.shift() || null;
        }
      };
      window.__tes3mpDatagramTransport = Module.__tes3mpDatagramTransport;
      ensureBrowserHostRelayShared(runtime);
      startBrowserHostRelaySharedPump(runtime);
      startBrowserHostClientInboxPump(runtime);
    }

    function browserHostPeerReusable(peer, attemptId) {
      if (!peer || peer.closed) return false;
      if (attemptId && peer.attemptId && peer.attemptId !== attemptId) return false;
      return browserHostPeerTransportUsable(peer);
    }

    function disposeBrowserHostPeer(runtime, peer, reason) {
      if (!runtime || !peer || peer.closed) return;
      peer.closed = true;
      clearTimeout(peer.healthTimer);
      delete runtime.peers[peer.userId];
      delete runtime.peersByPort[peer.port];
      try {
        if (peer.channel && peer.channel.readyState !== "closed") peer.channel.close();
      } catch (error) {
      }
      try {
        if (peer.pc && peer.pc.connectionState !== "closed") peer.pc.close();
      } catch (error) {
      }
      var state = browserHostDebugState(runtime);
      state.peerDisposals = state.peerDisposals || [];
      state.peerDisposals.push({
        t: Date.now(),
        userId: peer.userId || "",
        port: peer.port || 0,
        reason: reason || "peer-disposed"
      });
      if (state.peerDisposals.length > 50) state.peerDisposals.splice(0, state.peerDisposals.length - 50);
    }

    function scheduleBrowserHostPeerHealthCheck(runtime, peer, reason, delay) {
      if (!runtime || !peer || peer.closed) return;
      clearTimeout(peer.healthTimer);
      peer.healthTimer = setTimeout(function() {
        peer.healthTimer = 0;
        if (!browserHostPeerTransportUsable(peer)) {
          disposeBrowserHostPeer(runtime, peer, reason || "peer-transport-unusable");
        } else {
          var state = browserHostPeerState(peer);
          if (state.peerConnectionState === "disconnected" || state.iceConnectionState === "disconnected") {
            scheduleBrowserHostPeerHealthCheck(runtime, peer, reason, browserHostPeerReconnectGraceMs);
          }
        }
      }, Math.max(250, delay || 5000));
    }

    function pruneBrowserHostPeers(runtime, reason) {
      if (!runtime || !runtime.peers) return;
      Object.keys(runtime.peers).forEach(function(userId) {
        var peer = runtime.peers[userId];
        if (!browserHostPeerTransportUsable(peer)) {
          disposeBrowserHostPeer(runtime, peer, reason || "peer-prune");
        }
      });
    }
