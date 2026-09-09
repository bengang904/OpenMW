    function startLobbyPolling() {
      clearInterval(lobbyPollTimer);
      lobbyPollTimer = setInterval(function() {
        if (!isLobbyPanelOpen()) return;
        loadLobbyInstances();
      }, 15000);
    }

    function heartbeatOwnedLobbyInstances() {
      var ids = Object.keys(lobbyOwnedInstances || {});
      if (!ids.length) return Promise.resolve(false);
      var tasks = ids.map(function(id) {
        var owned = lobbyOwnedInstances[id] || {};
        if (!owned.heartbeatToken) return Promise.resolve(false);
        var activeBrowserHost = isActiveBrowserHostForInstance(id);
        if (owned.runtimeKind === "tes3mp-browser-host" && !activeBrowserHost) {
          var localRuntimeFailed = !!(browserHostRuntime &&
            browserHostRuntime.mode === "host" &&
            browserHostRuntime.config &&
            browserHostRuntime.config.instanceId === id &&
            browserHostRuntime.serverFailed);
          if (!localRuntimeFailed) return Promise.resolve(false);
          forgetLobbyOwnedInstance(id);
          return fetch(lobbyApiBase + "/instances/" + encodeURIComponent(id) + "/heartbeat", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: "Bearer " + owned.heartbeatToken
            },
            body: JSON.stringify({
              status: "dead",
              reason: "host-runtime-failed",
              currentPlayers: 0,
              maxPlayers: owned.maxPlayers || 4
            }),
            cache: "no-store",
            credentials: "same-origin"
          }).catch(function() {
            return false;
          });
        }
        if (activeBrowserHost) pruneBrowserHostPeers(browserHostRuntime, "heartbeat-prune");
        var browserHostPeerReports = activeBrowserHost
          ? Object.keys(browserHostRuntime.peers || {}).map(function(userId) {
              var peer = browserHostRuntime.peers[userId];
              var state = browserHostPeerState(peer);
              return {
                userId: userId,
                assignedPort: peer && peer.port || 0,
                attemptId: peer && peer.attemptId || "",
                channelOpen: browserHostPeerOpen(peer),
                channelState: state.channelState,
                peerConnectionState: state.peerConnectionState,
                iceConnectionState: state.iceConnectionState
              };
            })
          : [];
        return fetch(lobbyApiBase + "/instances/" + encodeURIComponent(id) + "/heartbeat", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + owned.heartbeatToken
          },
	          body: JSON.stringify({
	            status: "open",
	            currentPlayers: activeBrowserHost
	                ? 1 + browserHostPeerReports.filter(function(peer) {
	                    return peer.channelOpen;
	                  }).length
	                : 0,
	            peers: browserHostPeerReports,
	            maxPlayers: owned.maxPlayers || 4
	          }),
          cache: "no-store",
          credentials: "same-origin"
        }).then(function(response) {
          if (!response.ok) {
            forgetLobbyOwnedInstance(id);
            return false;
          }
          return true;
        }).catch(function() {
          return false;
        });
      });
      return Promise.all(tasks).then(function() {
        return true;
      });
    }

    function startLobbyHeartbeats() {
      clearInterval(lobbyHeartbeatTimer);
      lobbyHeartbeatTimer = setInterval(heartbeatOwnedLobbyInstances, 10000);
      heartbeatOwnedLobbyInstances();
    }

    function stopLobbyEventStream() {
      if (lobbyEventAbortController) {
        lobbyEventAbortController.abort();
        lobbyEventAbortController = null;
      }
    }

    function startLobbyEventStream() {
      stopLobbyEventStream();
      if (!window.ReadableStream || !lobbyState.sessionToken) return;
      lobbyEventAbortController = new AbortController();
      fetch(lobbyApiBase + "/events", {
        headers: Object.assign({ Accept: "text/event-stream" }, lobbyAuthHeaders()),
        cache: "no-store",
        credentials: "same-origin",
        signal: lobbyEventAbortController.signal
      }).then(function(response) {
        if (!response.ok || !response.body) throw new Error("events unavailable");
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        function read() {
          return reader.read().then(function(result) {
            if (result.done) return;
            buffer += decoder.decode(result.value, { stream: true });
            var parts = buffer.split("\n\n");
            buffer = parts.pop() || "";
            parts.forEach(function(part) {
              var line = part.split("\n").filter(function(value) {
                return value.indexOf("data:") === 0;
              }).map(function(value) {
                return value.slice(5).trim();
              }).join("");
              if (!line) return;
              try {
                var event = JSON.parse(line);
                if (/^instance\./.test(event.type || "")) loadLobbyInstances();
              } catch (error) {
              }
            });
            return read();
          });
        }
        return read();
      }).catch(function() {
        if (lobbyEventAbortController) setTimeout(startLobbyEventStream, 8000);
      });
    }

    function isLobbyPanelOpen() {
      return lobbyPanelElement && lobbyPanelElement.getAttribute("data-open") === "true";
    }

    function closeOverlayPanels(except) {
      if (except !== "command" && isCommandPanelOpen()) setCommandPanelOpen(false, { skipFocus: true });
      if (except !== "lobby" && isLobbyPanelOpen()) setLobbyPanelOpen(false, { skipFocus: true });
      if (except !== "account" && isAccountPanelOpen()) setAccountPanelOpen(false, { skipFocus: true });
      if (except !== "chat" && isChatPanelOpen()) setChatPanelOpen(false, { skipFocus: true });
      if (except !== "help" && isHelpPanelOpen()) setHelpPanelOpen(false, { skipFocus: true });
    }

    function closeTopOverlayPanel() {
      if (isHelpPanelOpen()) {
        setHelpPanelOpen(false, { skipFocus: true });
        return true;
      }
      if (isLobbyPanelOpen()) {
        setLobbyPanelOpen(false, { skipFocus: true });
        return true;
      }
      if (isAccountPanelOpen()) {
        setAccountPanelOpen(false, { skipFocus: true });
        return true;
      }
      if (isChatPanelOpen()) {
        setChatPanelOpen(false, { skipFocus: true });
        return true;
      }
      if (isCommandPanelOpen()) {
        setCommandPanelOpen(false, { skipFocus: true });
        return true;
      }
      return false;
    }

    function setLobbyPanelOpen(open, options) {
      open = !!open;
      options = options || {};
      if (open) closeOverlayPanels("lobby");
      lobbyPanelElement.setAttribute("data-open", open ? "true" : "false");
      lobbyPanelElement.setAttribute("aria-hidden", open ? "false" : "true");
      lobbyToolsElement.setAttribute("data-open", open ? "true" : "false");
      lobbyToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        hydrateDirectJoinFromLocation();
        loadLobbyInstances().then(startLobbyEventStream);
      } else {
        stopLobbyEventStream();
        if (!options.skipFocus) {
          setTimeout(function() {
            if (modeScreenElement.hidden) {
              canvasElement.focus();
            } else {
              modeMultiplayerButton.focus();
            }
          }, 0);
        }
      }
    }

    function toggleLobbyPanel() {
      setLobbyPanelOpen(!isLobbyPanelOpen());
    }

    function isAccountPanelOpen() {
      return accountPanelElement && accountPanelElement.getAttribute("data-open") === "true";
    }

    function setAccountPanelOpen(open, options) {
      open = !!open;
      options = options || {};
      if (open) closeOverlayPanels("account");
      accountPanelElement.setAttribute("data-open", open ? "true" : "false");
      accountPanelElement.setAttribute("aria-hidden", open ? "false" : "true");
      accountToolsElement.setAttribute("data-open", open ? "true" : "false");
      accountToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && accountSignedIn()) loadCloudSaves();
      renderAccountPanel();
      if (!open && !options.skipFocus) {
        setTimeout(function() {
          canvasElement.focus();
        }, 0);
      }
    }

    function toggleAccountPanel() {
      setAccountPanelOpen(!isAccountPanelOpen());
    }

    function isChatPanelOpen() {
      return chatPanelElement && chatPanelElement.getAttribute("data-open") === "true";
    }

    function setChatPanelOpen(open, options) {
      open = !!open;
      options = options || {};
      if (open) closeOverlayPanels("chat");
      chatPanelElement.setAttribute("data-open", open ? "true" : "false");
      chatPanelElement.setAttribute("aria-hidden", open ? "false" : "true");
      chatToolsElement.setAttribute("data-open", open ? "true" : "false");
      chatToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        loadChatRooms().then(loadChatMessages);
      } else if (!options.skipFocus) {
        setTimeout(function() {
          canvasElement.focus();
        }, 0);
      }
    }

    function toggleChatPanel() {
      setChatPanelOpen(!isChatPanelOpen());
    }

    function openAccountFromChatStatus() {
      if (accountSignedIn()) return;
      setChatPanelOpen(false);
      setAccountPanelOpen(true);
      setTimeout(function() {
        try {
          accountUsernameElement.focus({ preventScroll: true });
        } catch (error) {
          accountUsernameElement.focus();
        }
      }, 60);
    }

    function isHelpPanelOpen() {
      return helpPanelElement && helpPanelElement.getAttribute("data-open") === "true";
    }

    function setHelpPanelOpen(open, options) {
      open = !!open;
      options = options || {};
      if (open) closeOverlayPanels("help");
      helpPanelElement.setAttribute("data-open", open ? "true" : "false");
      helpPanelElement.setAttribute("aria-hidden", open ? "false" : "true");
      helpToolsElement.setAttribute("data-open", open ? "true" : "false");
      helpToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open && !options.skipFocus) {
        setTimeout(function() {
          canvasElement.focus();
        }, 0);
      }
    }

    function toggleHelpPanel() {
      setHelpPanelOpen(!isHelpPanelOpen());
    }
