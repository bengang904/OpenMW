    function getLobbyHostMode() {
      return "browser";
    }

    function isBrowserHostLaunchConfig(config) {
      return !!(config && config.transport === "browser-host" && config.browserHost);
    }

    function browserHostSignalUrl(config, suffix) {
      var path = config &&
        config.browserHost &&
        config.browserHost.signaling &&
        config.browserHost.signaling[suffix];
      return path || "";
    }

    function browserHostSendSignal(config, recipientUserId, kind, payload) {
      var path = browserHostSignalUrl(config, "sendPath");
      if (!path || !recipientUserId) return Promise.resolve(false);
      payload = payload && typeof payload === "object" ? payload : {};
      if (config && config.role === "guest" && !payload.attemptId) {
        payload = Object.assign({}, payload, {
          attemptId: config.joinToken || config.createdAt || config.instanceId || ""
        });
      }
      return lobbyFetch(path, {
        method: "POST",
        body: {
          recipientUserId: recipientUserId,
          kind: kind,
          payload: payload
        }
      }).then(function() {
        return true;
      });
    }

    function recordBrowserHostSignalFailure(runtime, label, error) {
      var state = browserHostDebugState(runtime);
      state.signalFailures = state.signalFailures || [];
      state.signalFailures.push({
        t: Date.now(),
        label: label || "",
        status: error && error.status ? Number(error.status) : 0,
        code: getLobbyErrorCode(error),
        message: error && error.message ? String(error.message) : String(error || "")
      });
      if (state.signalFailures.length > 50) state.signalFailures.splice(0, state.signalFailures.length - 50);
    }

    function handleBrowserHostSignalSendFailure(runtime, label, error, peer) {
      recordBrowserHostSignalFailure(runtime, label, error);
      console.warn("Browser host signaling send failed", error);
      if (runtime && runtime.mode === "guest" && !runtime.signalingComplete && isFatalBrowserHostSignalError(error)) {
        if (typeof runtime.fail === "function") {
          runtime.fail(new Error(formatBrowserHostStartupError(error, "Client host signaling failed.")));
        }
      } else if (runtime && runtime.mode === "host" && peer && isFatalBrowserHostSignalError(error)) {
        disposeBrowserHostPeer(runtime, peer, "signal-send-failed");
      }
    }

    function releaseBrowserHostGuestReservation(config, reason) {
      if (!config || config.role !== "guest" || !config.instanceId) return Promise.resolve(false);
      return lobbyFetch("/instances/" + encodeURIComponent(config.instanceId) + "/leave", {
        method: "POST"
      }).catch(function(error) {
        console.warn("Browser host reservation release failed", reason || "", error);
        return false;
      });
    }

    function encodeBrowserHostFrame(port, bytes) {
      bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
      var frame = new Uint8Array(bytes.byteLength + 4);
      new DataView(frame.buffer).setUint32(0, Number(port) || browserHostSyntheticServerPort, true);
      frame.set(bytes, 4);
      return frame;
    }

    function decodeBrowserHostFrame(data) {
      var bytes = data instanceof Uint8Array ? data : new Uint8Array(data || 0);
      if (bytes.byteLength < 4) {
        return { port: browserHostSyntheticServerPort, bytes: bytes };
      }
      var port = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
      return {
        port: port || browserHostSyntheticServerPort,
        bytes: bytes.slice(4)
      };
    }

    function copyBrowserHostBytes(bytes) {
      bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
      var copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return copy;
    }

    function browserHostChannelSnapshot(channel) {
      if (!channel) return null;
      return {
        readyState: channel.readyState || "",
        bufferedAmount: Number(channel.bufferedAmount) || 0,
        bufferedAmountLowThreshold: Number(channel.bufferedAmountLowThreshold) || 0,
        ordered: channel.ordered,
        maxRetransmits: channel.maxRetransmits,
        maxPacketLifeTime: channel.maxPacketLifeTime
      };
    }

    function browserHostPeerConnectionSnapshot(pc) {
      if (!pc) return null;
      return {
        connectionState: pc.connectionState || "",
        iceConnectionState: pc.iceConnectionState || "",
        iceGatheringState: pc.iceGatheringState || "",
        signalingState: pc.signalingState || ""
      };
    }

    function browserHostRelaySharedSnapshot(runtime) {
      var state = runtime && runtime.relaySharedState;
      if (!state || !state.control || typeof Atomics === "undefined") return null;
      return {
        rxWrite: Atomics.load(state.control, 0),
        rxRead: Atomics.load(state.control, 1),
        rxDrops: Atomics.load(state.control, 2),
        enabled: Atomics.load(state.control, 3),
        targetPort: Atomics.load(state.control, 4),
        pthreadAdoptions: Atomics.load(state.control, 5),
        recvPolls: Atomics.load(state.control, 6),
        rxDelivered: Atomics.load(state.control, 7),
        txWrite: Atomics.load(state.control, 8),
        txRead: Atomics.load(state.control, 9),
        txDrops: Atomics.load(state.control, 10),
        txEnqueued: Atomics.load(state.control, 11),
        txSent: Atomics.load(state.control, 12)
      };
    }

    function browserHostDebugEnabled() {
      try {
        return /\btes3mpDebug=1\b/.test(window.location.search || "") ||
          window.localStorage.getItem("tes3mpBrowserHostDebug") === "1";
      } catch (error) {
        return false;
      }
    }

    function browserHostDebugState(runtime) {
      var root = window.__tes3mpBrowserHostDebug || {
        enabled: browserHostDebugEnabled(),
        counts: {},
        events: [],
        maxClientToServerBytes: 0,
        maxServerToClientBytes: 0
      };
      if (runtime) {
        root.mode = runtime.mode || root.mode || "";
        root.instanceId = runtime.config && runtime.config.instanceId || root.instanceId || "";
        root.channel = browserHostChannelSnapshot(runtime.channel);
        root.peerConnection = browserHostPeerConnectionSnapshot(runtime.pc);
        root.shared = browserHostRelaySharedSnapshot(runtime);
        if (runtime.peers) {
          root.peers = Object.keys(runtime.peers).map(function(userId) {
            var peer = runtime.peers[userId];
            return {
              userId: userId,
              port: peer && peer.port || 0,
              channel: browserHostChannelSnapshot(peer && peer.channel),
              peerConnection: browserHostPeerConnectionSnapshot(peer && peer.pc)
            };
          });
        }
      }
      window.__tes3mpBrowserHostDebug = root;
      return root;
    }

    function recordBrowserHostDatagram(runtime, direction, port, bytes) {
      bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
      var state = browserHostDebugState(runtime);
      state.counts[direction] = (state.counts[direction] || 0) + 1;
      if (/client-to-server|peer-to-server/.test(direction)) {
        state.maxClientToServerBytes = Math.max(state.maxClientToServerBytes || 0, bytes.byteLength);
      } else if (/server-to-client|server-to-peer/.test(direction)) {
        state.maxServerToClientBytes = Math.max(state.maxServerToClientBytes || 0, bytes.byteLength);
      }
      var event = {
        t: Date.now(),
        direction: direction,
        mode: runtime && runtime.mode || "",
        port: Number(port) || 0,
        length: bytes.byteLength,
        firstBytes: Array.prototype.slice.call(bytes.slice(0, 16))
      };
      if (state.events.length < 500 || bytes.byteLength > 64) state.events.push(event);
      if (state.events.length > 1000) state.events.splice(0, state.events.length - 1000);
      if (state.enabled && (bytes.byteLength > 32 || state.counts[direction] <= 10)) {
        console.info("TES3MP_BROWSER_HOST_DATAGRAM " + JSON.stringify(event));
      }
    }

    function recordBrowserHostChannelEvent(runtime, label, channel, detail) {
      var state = browserHostDebugState(runtime);
      state.channelEvents = state.channelEvents || [];
      var event = {
        t: Date.now(),
        label: label || "",
        detail: detail || "",
        channel: browserHostChannelSnapshot(channel)
      };
      state.channelEvents.push(event);
      if (state.channelEvents.length > 100) state.channelEvents.splice(0, state.channelEvents.length - 100);
      if (state.enabled) console.info("TES3MP_BROWSER_HOST_CHANNEL " + JSON.stringify(event));
    }

    function browserHostIceServers(config) {
      var servers = config && config.browserHost && Array.isArray(config.browserHost.iceServers)
        ? config.browserHost.iceServers
        : [];
      return servers.length ? servers : [{ urls: "stun:stun.l.google.com:19302" }];
    }

    function createBrowserHostPeerConnection(config) {
      if (typeof RTCPeerConnection !== "function") {
        throw new Error("WebRTC is not available in this browser.");
      }
      return new RTCPeerConnection({
        iceServers: browserHostIceServers(config),
        iceTransportPolicy: "all"
      });
    }

    function createBrowserHostDataChannel(pc) {
      try {
        return pc.createDataChannel("tes3mp", {
          ordered: true
        });
      } catch (error) {
        console.warn("Reliable browser-host data channel options unavailable; falling back to default channel", error);
        return pc.createDataChannel("tes3mp");
      }
    }

    function showBrowserHostConnectionProblem(runtime, detail) {
      if (runtime !== browserHostRuntime || !runtime || runtime.mode !== "guest" || returningToMainMenu) return;
      showMorrowindLoadingScreen("Client host connection closed. Rejoin the lobby.", 300000, {
        category: "multiplayerStartup",
        signal: detail || "browser-host-connection-closed",
        sticky: true
      });
      showSaveToast("Client host connection closed");
    }

    function installBrowserHostPeerConnectionDiagnostics(runtime, pc, label) {
      if (!pc || pc.__tes3mpBrowserHostDiagnostics) return;
      pc.__tes3mpBrowserHostDiagnostics = true;
      function recordState(kind) {
        var state = browserHostDebugState(runtime);
        state.lastPeerConnectionEvent = {
          t: Date.now(),
          label: label || "",
          kind: kind || "",
          peerConnection: browserHostPeerConnectionSnapshot(pc)
        };
        if ((pc.connectionState === "failed" || pc.connectionState === "closed") && runtime === browserHostRuntime) {
          showBrowserHostConnectionProblem(runtime, "peer-" + pc.connectionState);
        }
      }
      pc.addEventListener("connectionstatechange", function() {
        recordState("connectionstatechange");
      });
      pc.addEventListener("iceconnectionstatechange", function() {
        recordState("iceconnectionstatechange");
      });
    }

    function installBrowserHostChannelDiagnostics(runtime, channel, label) {
      if (!channel || channel.__tes3mpBrowserHostDiagnostics) return;
      channel.__tes3mpBrowserHostDiagnostics = true;
      channel.binaryType = "arraybuffer";
      try {
        channel.bufferedAmountLowThreshold = browserHostDataChannelLowWaterBytes;
      } catch (error) {
      }
      channel.addEventListener("open", function() {
        recordBrowserHostChannelEvent(runtime, label, channel, "open");
      });
      channel.addEventListener("bufferedamountlow", function() {
        recordBrowserHostChannelEvent(runtime, label, channel, "bufferedamountlow");
      });
      channel.addEventListener("close", function() {
        recordBrowserHostChannelEvent(runtime, label, channel, "close");
        showBrowserHostConnectionProblem(runtime, "channel-close");
      });
      channel.addEventListener("error", function(event) {
        recordBrowserHostChannelEvent(runtime, label, channel, "error");
        showBrowserHostConnectionProblem(runtime, "channel-error");
        console.error("Browser host data channel error", event);
      });
    }

    function sendBrowserHostDataChannelFrame(runtime, channel, direction, dropDirection, port, frame, payloadBytes) {
      var payload = payloadBytes instanceof Uint8Array ? payloadBytes : new Uint8Array(payloadBytes || 0);
      var state = browserHostDebugState(runtime);
      if (!channel || channel.readyState !== "open") {
        state.channelClosedDrops = (state.channelClosedDrops || 0) + 1;
        recordBrowserHostDatagram(runtime, dropDirection || (direction + "-drop"), port, payload);
        return -1;
      }
      var bufferedAmount = Number(channel.bufferedAmount) || 0;
      state.maxChannelBufferedAmount = Math.max(state.maxChannelBufferedAmount || 0, bufferedAmount);
      if (bufferedAmount > browserHostDataChannelHighWaterBytes) {
        state.channelBackpressureDrops = (state.channelBackpressureDrops || 0) + 1;
        recordBrowserHostDatagram(runtime, dropDirection || (direction + "-drop"), port, payload);
        return -1;
      }
      try {
        channel.send(frame);
        recordBrowserHostDatagram(runtime, direction, port, payload);
        return payload.byteLength;
      } catch (error) {
        state.channelSendErrors = (state.channelSendErrors || 0) + 1;
        recordBrowserHostDatagram(runtime, dropDirection || (direction + "-drop"), port, payload);
        console.warn("Browser host data channel send failed", error);
        return -1;
      }
    }

    function stopBrowserHostSignalPolling() {
      clearTimeout(browserHostSignalPollTimer);
      clearInterval(browserHostSignalPollTimer);
      browserHostSignalPollTimer = 0;
    }

    function browserHostPeerState(peer) {
      return {
        channelState: peer && peer.channel && peer.channel.readyState || "",
        peerConnectionState: peer && peer.pc && peer.pc.connectionState || "",
        iceConnectionState: peer && peer.pc && peer.pc.iceConnectionState || ""
      };
    }

    function browserHostPeerDisconnectedDuration(peer, state) {
      state = state || browserHostPeerState(peer);
      var disconnected = state.peerConnectionState === "disconnected" ||
        state.iceConnectionState === "disconnected";
      if (!disconnected) {
        if (peer) peer.disconnectedAt = 0;
        return 0;
      }
      if (!peer.disconnectedAt) peer.disconnectedAt = Date.now();
      return Date.now() - peer.disconnectedAt;
    }

    function browserHostPeerTransportUsable(peer) {
      if (!peer || peer.closed) return false;
      var state = browserHostPeerState(peer);
      if (state.channelState === "closing" || state.channelState === "closed") return false;
      if (state.peerConnectionState === "failed" || state.peerConnectionState === "closed") return false;
      if (state.iceConnectionState === "failed" ||
          state.iceConnectionState === "closed") return false;
      if (browserHostPeerDisconnectedDuration(peer, state) >= browserHostPeerReconnectGraceMs) return false;
      return true;
    }

    function browserHostPeerOpen(peer) {
      if (!browserHostPeerTransportUsable(peer)) return false;
      var state = browserHostPeerState(peer);
      if (state.channelState !== "open") return false;
      var pcConnected = state.peerConnectionState === "connected" ||
        state.peerConnectionState === "completed" ||
        state.peerConnectionState === "disconnected" ||
        !state.peerConnectionState;
      var iceConnected = state.iceConnectionState === "connected" ||
        state.iceConnectionState === "completed" ||
        state.iceConnectionState === "disconnected" ||
        !state.iceConnectionState;
      return pcConnected && iceConnected;
    }

    function browserHostHasOpenPeer(runtime) {
      if (!runtime || !runtime.peers) return false;
      return Object.keys(runtime.peers).some(function(userId) {
        return browserHostPeerOpen(runtime.peers[userId]);
      });
    }

    function nextBrowserHostSignalPollDelay(runtime, ok) {
      if (!runtime) return 1000;
      if (ok) {
        runtime.signalPollDelay = runtime.mode === "guest" &&
          runtime.channel &&
          runtime.channel.readyState === "open"
            ? 30000
            : runtime.mode === "host" && browserHostHasOpenPeer(runtime)
              ? 5000
              : 1000;
        runtime.signalPollFailures = 0;
        return runtime.signalPollDelay;
      }
      runtime.signalPollFailures = (runtime.signalPollFailures || 0) + 1;
      var previous = runtime.signalPollDelay || 1000;
      runtime.signalPollDelay = Math.min(Math.max(previous * 2, 2000), 30000);
      return runtime.signalPollDelay;
    }

    function scheduleBrowserHostSignalPoll(runtime, delay) {
      if (!runtime || !runtime.config) return;
      if (runtime.mode === "guest" && runtime.signalingComplete) return;
      clearTimeout(browserHostSignalPollTimer);
      browserHostSignalPollTimer = setTimeout(function() {
        browserHostSignalPollTimer = 0;
        pollBrowserHostSignals(runtime).then(function(ok) {
          if (runtime !== browserHostRuntime) return;
          if (runtime.mode === "guest" && runtime.signalingComplete) return;
          scheduleBrowserHostSignalPoll(runtime, nextBrowserHostSignalPollDelay(runtime, ok));
        });
      }, delay);
    }

    function pollBrowserHostSignals(runtime) {
      if (!runtime || !runtime.config) return Promise.resolve(false);
      var path = browserHostSignalUrl(runtime.config, "pollPath");
      if (!path) return Promise.resolve(false);
      var query = runtime.signalCursor ? "?after=" + encodeURIComponent(runtime.signalCursor) : "";
      return lobbyFetch(path + query)
        .then(function(result) {
          var items = result.items || [];
          items.forEach(function(item) {
            if (!runtime.seenSignals) runtime.seenSignals = {};
            if (runtime.seenSignals[item.id]) return;
            runtime.seenSignals[item.id] = true;
            if (!runtime.signalCursor || String(item.createdAt) > String(runtime.signalCursor)) {
              runtime.signalCursor = item.createdAt;
            }
            runtime.handleSignal(item);
          });
          runtime.lastSignalPollErrorStatus = 0;
          return true;
        })
        .catch(function(error) {
          var status = error && error.status ? Number(error.status) : 0;
          if (runtime &&
              runtime.mode === "guest" &&
              !runtime.signalingComplete &&
              isFatalBrowserHostSignalError(error)) {
            recordBrowserHostSignalFailure(runtime, "poll", error);
            if (typeof runtime.fail === "function") {
              runtime.fail(new Error(formatBrowserHostStartupError(error, "Client host signaling failed.")));
            }
            return false;
          }
          var shouldLog = status !== 429 ||
            runtime.lastSignalPollErrorStatus !== 429 ||
            (runtime.signalPollFailures || 0) === 0;
          runtime.lastSignalPollErrorStatus = status;
          if (shouldLog) console.warn("Browser host signaling poll failed", error);
          return false;
        });
    }

    function startBrowserHostSignalPolling(runtime) {
      stopBrowserHostSignalPolling();
      if (runtime) {
        runtime.signalPollDelay = 1000;
        runtime.signalPollFailures = 0;
      }
      scheduleBrowserHostSignalPoll(runtime, 0);
    }
