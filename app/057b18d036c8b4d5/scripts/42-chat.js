    function renderChatRooms() {
      if (!chatRooms.length) return;
      var current = chatRoomElement.value || "global";
      chatRoomElement.textContent = "";
      chatRooms.forEach(function(room) {
        var option = document.createElement("option");
        option.value = room.id;
        option.textContent = room.name || room.id;
        chatRoomElement.appendChild(option);
      });
      chatRoomElement.value = chatRooms.some(function(room) {
        return room.id === current;
      }) ? current : chatRooms[0].id;
    }

    function renderChatMessages() {
      chatMessageListElement.textContent = "";
      if (!chatMessages.length) {
        var empty = document.createElement("div");
        empty.className = "chat-message-row";
        empty.textContent = "No messages yet.";
        chatMessageListElement.appendChild(empty);
        return;
      }
      chatMessages.forEach(function(message) {
        var ownMessage = isOwnChatMessage(message);
        var row = document.createElement("div");
        row.className = "chat-message-row" + (ownMessage ? " own" : "");
        var head = document.createElement("span");
        head.className = "chat-message-head";
        var time = document.createElement("span");
        time.className = "chat-meta";
        time.textContent = formatPanelTime(message.createdAt);
        var author = document.createElement("span");
        author.className = "chat-author";
        author.textContent = message.displayName || "Nerevarine";
        head.appendChild(time);
        head.appendChild(author);
        if (ownMessage) {
          var remove = document.createElement("button");
          remove.type = "button";
          remove.className = "chat-delete-button";
          remove.textContent = "x";
          remove.title = "Delete message";
          remove.setAttribute("aria-label", "Delete message");
          remove.disabled = !!chatDeletingMessageIds[message.id];
          remove.addEventListener("click", function() {
            deleteChatMessage(message);
          });
          head.appendChild(remove);
        }
        var text = document.createElement("span");
        text.className = "chat-text";
        text.textContent = message.text || "";
        row.appendChild(head);
        row.appendChild(text);
        chatMessageListElement.appendChild(row);
      });
      chatMessageListElement.scrollTop = chatMessageListElement.scrollHeight;
    }

    function loadChatRooms() {
      return chatFetch("/rooms").then(function(result) {
        chatRooms = result.items || [];
        renderChatRooms();
        return chatRooms;
      }).catch(function(error) {
        console.warn("Chat rooms unavailable", error);
        return [];
      });
    }

    function loadChatMessages() {
      var roomId = chatRoomElement.value || "global";
      return chatFetch("/rooms/" + encodeURIComponent(roomId) + "/messages?limit=80").then(function(result) {
        setChatError("");
        chatMessages = result.items || [];
        renderChatMessages();
        return chatMessages;
      }).catch(function(error) {
        setChatError(formatAccountError(error, "Chat unavailable"));
        if (!chatMessages.length) renderChatMessages();
        return [];
      });
    }

    function appendChatMessage(message) {
      if (!message || message.roomId !== (chatRoomElement.value || "global")) return;
      if (chatMessages.some(function(item) { return item.id === message.id; })) return;
      chatMessages.push(message);
      if (chatMessages.length > 100) chatMessages = chatMessages.slice(chatMessages.length - 100);
      renderChatMessages();
    }

    function removeChatMessage(messageId, roomId) {
      if (roomId && roomId !== (chatRoomElement.value || "global")) return;
      var before = chatMessages.length;
      chatMessages = chatMessages.filter(function(item) {
        return item.id !== messageId;
      });
      if (chatMessages.length !== before) renderChatMessages();
    }

    function deleteChatMessage(message) {
      if (!accountSignedIn() || !message || !message.id || !isOwnChatMessage(message) || chatDeletingMessageIds[message.id]) return;
      chatDeletingMessageIds[message.id] = true;
      setChatError("");
      renderChatMessages();
      chatFetch("/rooms/" + encodeURIComponent(message.roomId || chatRoomElement.value || "global") + "/messages/" + encodeURIComponent(message.id), {
        method: "DELETE"
      }).then(function(result) {
        removeChatMessage(result.messageId || message.id, result.roomId || message.roomId);
      }).catch(function(error) {
        setChatError(formatAccountError(error, "Delete failed"));
      }).finally(function() {
        delete chatDeletingMessageIds[message.id];
        renderChatMessages();
      });
    }

    function sendChatMessage() {
      if (!accountSignedIn() || chatBusy) return;
      var text = chatInputElement.value.replace(/\s+/g, " ").trim();
      if (!text) return;
      chatBusy = true;
      setChatError("");
      renderAccountPanel();
      chatFetch("/rooms/" + encodeURIComponent(chatRoomElement.value || "global") + "/messages", {
        method: "POST",
        body: { text: text }
      }).then(function(result) {
        chatInputElement.value = "";
        appendChatMessage(result.message);
      }).catch(function(error) {
        setChatError(formatAccountError(error, "Message failed"));
      }).finally(function() {
        chatBusy = false;
        renderAccountPanel();
      });
    }

    function stopChatEventStream() {
      if (chatEventAbortController) {
        chatEventAbortController.abort();
        chatEventAbortController = null;
      }
    }

    function startChatEventStream() {
      stopChatEventStream();
      if (!window.ReadableStream || !accountSignedIn()) return;
      chatEventAbortController = new AbortController();
      fetch(chatApiBase + "/events", {
        headers: { Accept: "text/event-stream" },
        cache: "no-store",
        credentials: "same-origin",
        signal: chatEventAbortController.signal
      }).then(function(response) {
        if (!response.ok || !response.body) throw new Error("chat events unavailable");
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
                if (event.type === "chat.message") appendChatMessage(event.message);
                if (event.type === "chat.delete") removeChatMessage(event.messageId, event.roomId);
              } catch (error) {
              }
            });
            return read();
          });
        }
        return read();
      }).catch(function() {
        if (chatEventAbortController && accountSignedIn()) setTimeout(startChatEventStream, 8000);
      });
    }

    function startChatPolling() {
      clearInterval(chatPollTimer);
      chatPollTimer = setInterval(loadChatMessages, 15000);
      loadChatMessages();
    }
