    function createBrowserHostPeer(runtime, userId, attemptId) {
      var existing = runtime.peers[userId];
      if (browserHostPeerReusable(existing, attemptId)) return existing;
      if (existing) disposeBrowserHostPeer(runtime, existing, "replaced");
      var pc = createBrowserHostPeerConnection(runtime.config);
      installBrowserHostPeerConnectionDiagnostics(runtime, pc, "host-peer-" + userId);
      var assignedPort = browserHostNextPeerPort++;
      var peer = {
        userId: userId,
        attemptId: attemptId || "",
        port: assignedPort,
        pc: pc,
        channel: null,
        closed: false,
        pendingIce: [],
        healthTimer: 0
      };
      runtime.peers[userId] = peer;
      runtime.peersByPort[assignedPort] = peer;
      function handlePeerStateChange() {
        var state = browserHostPeerState(peer);
        if (state.peerConnectionState === "failed" ||
            state.peerConnectionState === "closed" ||
            state.iceConnectionState === "failed" ||
            state.iceConnectionState === "closed") {
          disposeBrowserHostPeer(runtime, peer, "peer-" + (state.peerConnectionState || state.iceConnectionState || "closed"));
        } else if (state.iceConnectionState === "disconnected") {
          scheduleBrowserHostPeerHealthCheck(runtime, peer, "peer-disconnected", browserHostPeerReconnectGraceMs);
        }
      }
      pc.addEventListener("connectionstatechange", handlePeerStateChange);
      pc.addEventListener("iceconnectionstatechange", handlePeerStateChange);
      pc.onicecandidate = function(event) {
        if (!event.candidate) return;
        browserHostSendSignal(runtime.config, userId, "ice", {
          candidate: event.candidate,
          attemptId: peer.attemptId || ""
        }).catch(function(error) {
          handleBrowserHostSignalSendFailure(runtime, "host-ice", error, peer);
        });
      };
      pc.ondatachannel = function(event) {
        peer.channel = event.channel;
        installBrowserHostChannelDiagnostics(runtime, peer.channel, "host-peer-" + assignedPort);
        peer.channel.addEventListener("close", function() {
          disposeBrowserHostPeer(runtime, peer, "channel-close");
        });
        peer.channel.addEventListener("error", function() {
          disposeBrowserHostPeer(runtime, peer, "channel-error");
        });
        peer.channel.onmessage = function(message) {
          var frame = decodeBrowserHostFrame(message.data);
          if (!runtime.serverWorker) return;
          var packet = copyBrowserHostBytes(frame.bytes);
          recordBrowserHostDatagram(runtime, "peer-to-server", assignedPort, packet);
          runtime.serverWorker.postMessage({
            type: "datagram",
            sourcePort: assignedPort,
            bytes: packet
          }, [packet.buffer]);
        };
      };
      return peer;
    }

    function handleBrowserHostSignal(runtime, item) {
      var payload = item.payload || {};
      var attemptId = payload.attemptId || "";
      if (runtime.mode === "host") {
        if (item.kind === "offer" && payload.sdp) {
          var peer = createBrowserHostPeer(runtime, item.senderUserId, attemptId);
          peer.attemptId = attemptId || peer.attemptId || "";
          peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            .then(function() {
              var pending = peer.pendingIce.splice(0);
              return Promise.all(pending.map(function(candidate) {
                return peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
              }));
            })
            .then(function() {
              return peer.pc.createAnswer();
            })
            .then(function(answer) {
              return peer.pc.setLocalDescription(answer).then(function() {
                return browserHostSendSignal(runtime.config, item.senderUserId, "answer", {
                  sdp: peer.pc.localDescription,
                  assignedPort: peer.port,
                  attemptId: peer.attemptId || ""
                });
              });
	            })
	            .catch(function(error) {
	              if (isFatalBrowserHostSignalError(error)) {
	                handleBrowserHostSignalSendFailure(runtime, "host-answer", error, peer);
	              }
	              console.error("Browser host offer failed", error);
	            });
        } else if (item.kind === "ice" && payload.candidate) {
          var icePeer = createBrowserHostPeer(runtime, item.senderUserId, attemptId);
          if (attemptId && icePeer.attemptId && icePeer.attemptId !== attemptId) return;
          if (attemptId && !icePeer.attemptId) icePeer.attemptId = attemptId;
          if (!icePeer.pc.remoteDescription) {
            icePeer.pendingIce.push(payload.candidate);
          } else {
            icePeer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(function(error) {
              console.warn("Browser host ICE failed", error);
            });
          }
        }
      } else if (runtime.mode === "guest") {
        if (attemptId && runtime.attemptId && attemptId !== runtime.attemptId) return;
        if (item.kind === "answer" && payload.sdp) {
          runtime.assignedPort = Number(payload.assignedPort) || runtime.assignedPort;
          runtime.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            .then(function() {
              var pending = runtime.pendingIce.splice(0);
              return Promise.all(pending.map(function(candidate) {
                return runtime.pc.addIceCandidate(new RTCIceCandidate(candidate));
              }));
            })
            .catch(function(error) {
              console.error("Browser host answer failed", error);
            });
        } else if (item.kind === "ice" && payload.candidate) {
          if (!runtime.pc.remoteDescription) {
            runtime.pendingIce.push(payload.candidate);
          } else {
            runtime.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(function(error) {
              console.warn("Browser host ICE failed", error);
            });
          }
        }
      }
    }

    function prepareBrowserHostedAsHost(config) {
      var runtime = {
        mode: "host",
        config: config,
        localPort: browserHostLocalPort,
        serverPort: Number(config.browserHost.serverPort) || browserHostSyntheticServerPort,
        clientInbox: [],
        peers: {},
        peersByPort: {},
        seenSignals: {},
        signalCursor: "",
        handleSignal: null,
        serverWorker: null,
        serverReady: false,
        serverFailed: false
      };
      runtime.handleSignal = function(item) {
        handleBrowserHostSignal(runtime, item);
      };
      browserHostRuntime = runtime;
      installBrowserHostTransport(runtime);
      startBrowserHostSignalPolling(runtime);
      return createBrowserHostServerWorker(runtime).then(function() {
        showSaveToast("Browser server ready");
        return runtime;
      });
    }

    function prepareBrowserHostedAsGuest(config) {
      return new Promise(function(resolve, reject) {
        var runtime = null;
        var opened = false;
        var settled = false;
        var timer = 0;
        function closeGuestRuntime() {
          clearTimeout(timer);
          if (!runtime) return;
          clearInterval(runtime.relaySharedPumpTimer);
          clearInterval(runtime.clientInboxPumpTimer);
          runtime.relaySharedPumpTimer = 0;
          runtime.clientInboxPumpTimer = 0;
          if (browserHostRuntime === runtime) {
            stopBrowserHostSignalPolling();
            browserHostRuntime = null;
          }
          try {
            if (runtime.channel && runtime.channel.readyState !== "closed") runtime.channel.close();
          } catch (error) {
          }
          try {
            if (runtime.pc && runtime.pc.connectionState !== "closed") runtime.pc.close();
          } catch (error) {
          }
          if (Module.__tes3mpDatagramTransport) Module.__tes3mpDatagramTransport = null;
          if (window.__tes3mpDatagramTransport) window.__tes3mpDatagramTransport = null;
        }
        function fail(error) {
          if (opened || settled) return false;
          settled = true;
          var reason = error && error.message ? error.message : "Client host connection failed.";
          recordBrowserHostSignalFailure(runtime, "guest-fail", error || reason);
          releaseBrowserHostGuestReservation(config, reason);
          closeGuestRuntime();
          reject(error instanceof Error ? error : new Error(reason));
          return true;
        }
        runtime = {
          mode: "guest",
          config: config,
          localPort: 0,
          serverPort: Number(config.browserHost.serverPort) || browserHostSyntheticServerPort,
          clientInbox: [],
          seenSignals: {},
          signalCursor: "",
          pc: createBrowserHostPeerConnection(config),
          channel: null,
          pendingIce: [],
          assignedPort: 0,
          attemptId: config.joinToken || config.createdAt || config.instanceId || "",
          handleSignal: null,
          fail: fail
        };
        installBrowserHostPeerConnectionDiagnostics(runtime, runtime.pc, "guest-host");
        function checkPeerConnectionFailed() {
          var connectionState = runtime.pc && runtime.pc.connectionState || "";
          var iceState = runtime.pc && runtime.pc.iceConnectionState || "";
          if (connectionState === "failed" ||
              connectionState === "closed" ||
              iceState === "failed" ||
              iceState === "closed") {
            fail(new Error("Client host WebRTC connection failed before opening."));
          }
        }
        runtime.pc.addEventListener("connectionstatechange", checkPeerConnectionFailed);
        runtime.pc.addEventListener("iceconnectionstatechange", checkPeerConnectionFailed);
        timer = setTimeout(function() {
          if (!opened) {
            var debug = browserHostDebugState(runtime);
            console.warn("Browser host guest connection timed out", debug);
            fail(new Error("Timed out connecting to client host."));
          }
        }, 45000);
        runtime.handleSignal = function(item) {
          handleBrowserHostSignal(runtime, item);
        };
        runtime.pc.onicecandidate = function(event) {
          if (!event.candidate) return;
          browserHostSendSignal(config, config.browserHost.hostUserId, "ice", {
            candidate: event.candidate
          }).catch(function(error) {
            handleBrowserHostSignalSendFailure(runtime, "guest-ice", error);
          });
        };
        runtime.channel = createBrowserHostDataChannel(runtime.pc);
        installBrowserHostChannelDiagnostics(runtime, runtime.channel, "guest-host");
        runtime.channel.onopen = function() {
          if (settled) return;
          settled = true;
          opened = true;
          runtime.signalingComplete = true;
          clearTimeout(timer);
          stopBrowserHostSignalPolling();
          showSaveToast("Connected to client host");
          resolve(runtime);
        };
        runtime.channel.onmessage = function(message) {
          var frame = decodeBrowserHostFrame(message.data);
          recordBrowserHostDatagram(runtime, "server-to-guest", frame.port || runtime.serverPort, frame.bytes);
          enqueueBrowserHostClientPacket(runtime, {
            bytes: copyBrowserHostBytes(frame.bytes),
            sourcePort: frame.port || runtime.serverPort
          });
        };
        runtime.channel.onerror = function(error) {
          if (!opened) {
            fail(new Error("Client host data channel failed before opening."));
          } else {
            console.error("Browser host data channel error", error);
          }
        };
        runtime.channel.onclose = function() {
          if (!opened) fail(new Error("Client host data channel closed before opening."));
        };
        browserHostRuntime = runtime;
        installBrowserHostTransport(runtime);
        startBrowserHostSignalPolling(runtime);
        runtime.pc.createOffer()
          .then(function(offer) {
            return runtime.pc.setLocalDescription(offer);
          })
          .then(function() {
            return browserHostSendSignal(config, config.browserHost.hostUserId, "offer", {
              sdp: runtime.pc.localDescription
            });
          })
          .catch(function(error) {
            fail(error);
          });
      });
    }

    function prepareBrowserHostedMultiplayer(config) {
      if (!isBrowserHostLaunchConfig(config)) return Promise.resolve(null);
      if (browserHostRuntime && browserHostRuntime.config && browserHostRuntime.config.instanceId === config.instanceId) {
        installBrowserHostTransport(browserHostRuntime);
        return Promise.resolve(browserHostRuntime);
      }
      if (!lobbyState || !lobbyState.userId) {
        return Promise.reject(new Error("Lobby session is required for client-hosted multiplayer."));
      }
      if (config.role !== "host" && config.role !== "guest") {
        return Promise.reject(new Error("Client-hosted multiplayer role is missing."));
      }
      return config.role === "host" ? prepareBrowserHostedAsHost(config) : prepareBrowserHostedAsGuest(config);
    }
