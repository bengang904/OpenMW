
    syncSaveButton.addEventListener("click", function() {
      if (isTes3mpRuntimeActive()) {
        showSaveToast("Sync deferred during multiplayer");
        canvasElement.focus();
        return;
      }
      syncPersistentUserFiles("manual").then(function() {
        canvasElement.focus();
      });
    });

    commandToggleButton.addEventListener("click", function(event) {
      event.stopPropagation();
      toggleCommandPanel();
    });

    lobbyToggleButton.addEventListener("click", function(event) {
      event.stopPropagation();
      toggleLobbyPanel();
    });

    accountToggleButton.addEventListener("click", function(event) {
      event.stopPropagation();
      toggleAccountPanel();
    });

    chatToggleButton.addEventListener("click", function(event) {
      event.stopPropagation();
      toggleChatPanel();
    });

    helpToggleButton.addEventListener("click", function(event) {
      event.stopPropagation();
      toggleHelpPanel();
    });

    commandCloseButton.addEventListener("click", function(event) {
      event.stopPropagation();
      setCommandPanelOpen(false);
    });

    lobbyCloseButton.addEventListener("click", function(event) {
      event.stopPropagation();
      setLobbyPanelOpen(false);
    });

    accountCloseButton.addEventListener("click", function(event) {
      event.stopPropagation();
      setAccountPanelOpen(false);
    });

    chatCloseButton.addEventListener("click", function(event) {
      event.stopPropagation();
      setChatPanelOpen(false);
    });

    helpCloseButton.addEventListener("click", function(event) {
      event.stopPropagation();
      setHelpPanelOpen(false);
    });

    ["pointerdown", "pointerup", "click", "keydown"].forEach(function(eventName) {
      commandPanelElement.addEventListener(eventName, function(event) {
        event.stopPropagation();
      });
      lobbyPanelElement.addEventListener(eventName, function(event) {
        event.stopPropagation();
      });
      accountPanelElement.addEventListener(eventName, function(event) {
        event.stopPropagation();
      });
      chatPanelElement.addEventListener(eventName, function(event) {
        event.stopPropagation();
      });
      helpPanelElement.addEventListener(eventName, function(event) {
        event.stopPropagation();
      });
    });

    accountLoginButton.addEventListener("click", function() {
      submitAccountAuth(false);
    });

    accountRegisterButton.addEventListener("click", function() {
      submitAccountAuth(true);
    });

    accountLogoutButton.addEventListener("click", logoutAccount);
    accountSaveProfileButton.addEventListener("click", saveAccountProfile);
    accountChangePasswordButton.addEventListener("click", changeAccountPassword);
    accountDownloadRecoveryButton.addEventListener("click", downloadAccountRecoveryCode);
    accountRecoverButton.addEventListener("click", recoverAccountPassword);
    cloudSaveUploadButton.addEventListener("click", uploadCloudSave);

    [accountUsernameElement, accountPasswordElement].forEach(function(element) {
      element.addEventListener("keydown", function(event) {
        if (event.key !== "Enter") return;
        submitAccountAuth(false);
      });
    });

    [accountRecoveryUsernameElement, accountRecoveryCodeElement, accountRecoveryPasswordElement].forEach(function(element) {
      element.addEventListener("keydown", function(event) {
        if (event.key !== "Enter") return;
        recoverAccountPassword();
      });
    });

    accountProfileNameElement.addEventListener("keydown", function(event) {
      if (event.key === "Enter") saveAccountProfile();
    });

    [accountCurrentPasswordElement, accountNewPasswordElement].forEach(function(element) {
      element.addEventListener("keydown", function(event) {
        if (event.key === "Enter") changeAccountPassword();
      });
    });

    chatRoomElement.addEventListener("change", function() {
      setChatError("");
      loadChatMessages();
    });

    chatStatusElement.addEventListener("click", function(event) {
      event.stopPropagation();
      openAccountFromChatStatus();
    });

    chatSendButton.addEventListener("click", sendChatMessage);
    chatInputElement.addEventListener("keydown", function(event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      sendChatMessage();
    });

    lobbySessionSaveButton.addEventListener("click", function() {
      if (accountSignedIn()) {
        syncLobbyPlayerNameToAccount({ resetSession: true });
        showSaveToast("Player name uses account name");
        loadLobbyInstances();
        return;
      }
      storeLobbyDisplayName(sanitizeLobbyText(lobbyDisplayNameElement.value, "Nerevarine", 32));
      lobbyState = {};
      storeLobbySessionState();
      loadLobbyInstances();
    });

    lobbyRefreshButton.addEventListener("click", function() {
      loadLobbyInstances();
    });

    [lobbyFilterTextElement, lobbyFilterKindElement].forEach(function(element) {
      if (!element) return;
      element.addEventListener(element.tagName === "SELECT" ? "change" : "input", renderLobbyInstances);
    });

    lobbyTabButtons.forEach(function(button) {
      button.addEventListener("click", function() {
        setLobbyActiveTab(button.getAttribute("data-lobby-tab") || "public");
      });
    });

    lobbyCreateButton.addEventListener("click", function() {
      createLobbyInstance();
    });

    lobbyDirectJoinButton.addEventListener("click", function() {
      directJoinLobbyInstance();
    });

    [lobbyDirectTargetElement, lobbyDirectPasswordElement].forEach(function(element) {
      if (!element) return;
      element.addEventListener("keydown", function(event) {
        if (event.key === "Enter") directJoinLobbyInstance();
      });
    });

    commandModApplyButton.addEventListener("click", function(event) {
      event.stopPropagation();
      if (isTes3mpRuntimeActive()) {
        showSaveToast("Apply after leaving multiplayer");
        canvasElement.focus();
        return;
      }
      commandModApplyButton.disabled = true;
      commandModStatusElement.textContent = "Reloading";
      syncPersistentUserFiles("manual").then(function() {
        window.location.reload();
      }, function() {
        window.location.reload();
      });
    });

    renderProfileButtons.forEach(function(button) {
      button.addEventListener("click", function() {
        setBrowserRenderProfile(button.getAttribute("data-render-profile"), {
          persist: true,
          toast: true
        });
        try {
          window.dispatchEvent(new Event("resize"));
        } catch (error) {
        }
        setTimeout(function() {
          scheduleCanvasRenderCap("render-profile-resize");
        }, 200);
        canvasElement.focus();
      });
    });

    commandTouchModeButtons.forEach(function(button) {
      button.addEventListener("click", function() {
        setTouchControlsMode(button.getAttribute("data-touch-mode"), {
          persist: true,
          toast: true
        });
        canvasElement.focus();
      });
    });

    if (commandTouchLookElement) {
      commandTouchLookElement.addEventListener("input", function() {
        setTouchLookSensitivity(commandTouchLookElement.value, { persist: true });
      });
      commandTouchLookElement.addEventListener("change", function() {
        showSaveToast("Touch look " + getTouchLookLabel());
        canvasElement.focus();
      });
    }

    fullscreenToggleButton.addEventListener("click", function() {
      toggleGameFullscreen();
    });

    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
    window.addEventListener("resize", function() {
      scheduleCanvasRenderCap("resize");
    });
    window.addEventListener("orientationchange", function() {
      scheduleCanvasRenderCap("orientation");
    });
    if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
      window.visualViewport.addEventListener("resize", function() {
        scheduleCanvasRenderCap("visual-viewport-resize");
      });
      window.visualViewport.addEventListener("scroll", function() {
        scheduleCanvasRenderCap("visual-viewport-scroll");
      });
    }

    exportSaveButton.addEventListener("click", exportOpenMwUserData);

    importSaveButton.addEventListener("click", function() {
      importSaveFileElement.click();
    });

    importSaveFileElement.addEventListener("change", function() {
      importOpenMwUserData(importSaveFileElement.files[0]);
    });

    newDefaultButton.addEventListener("click", function() {
      startNewGameMode("default");
    });

    newBlankButton.addEventListener("click", function() {
      startNewGameMode("blank");
    });

    window.addEventListener("pagehide", function() {
      notifyOwnedBrowserHostShutdownOnUnload("pagehide");
      syncPersistentUserFiles("pagehide");
    });

    window.addEventListener("beforeunload", function() {
      notifyOwnedBrowserHostShutdownOnUnload("beforeunload");
      syncPersistentUserFiles("beforeunload");
    });

    window.addEventListener("blur", function() {
      schedulePersistentSync("blur", 0);
    });

    document.addEventListener("freeze", function() {
      syncPersistentUserFiles("freeze");
    });

    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "hidden") {
        syncPersistentUserFiles("hidden");
      }
    });
