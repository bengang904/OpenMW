    var statusElement = document.getElementById("status");
    var progressElement = document.getElementById("progress");
    var outputElement = document.getElementById("output");
    var shellElement = document.getElementById("shell");
    var topbarElement = document.getElementById("topbar");
    var canvasWrapElement = document.getElementById("canvas-wrap");
    var canvasElement = document.getElementById("canvas");
    var touchControlsElement = document.getElementById("touch-controls");
    var touchMoveZoneElement = document.getElementById("touch-move-zone");
    var touchStickThumbElement = document.getElementById("touch-stick-thumb");
    var touchLookZoneElement = document.getElementById("touch-look-zone");
    var touchActionButtons = {
      attack: document.getElementById("touch-attack"),
      use: document.getElementById("touch-use"),
      confirm: document.getElementById("touch-confirm"),
      jump: document.getElementById("touch-jump"),
      menu: document.getElementById("touch-menu"),
      chat: document.getElementById("touch-chat"),
      escape: document.getElementById("touch-escape")
    };
    var videoOverlayElement = document.getElementById("video-overlay");
    var browserVideoElement = document.getElementById("browser-video");
    var modeScreenElement = document.getElementById("mode-screen");
    var modeSinglePlayerButton = document.getElementById("mode-single-player");
    var modeMultiplayerButton = document.getElementById("mode-multiplayer");
    var modeStatusElement = document.getElementById("mode-status");
    var saveToolsElement = document.getElementById("save-tools");
    var lobbyToolsElement = document.getElementById("lobby-tools");
    var accountToolsElement = document.getElementById("account-tools");
    var chatToolsElement = document.getElementById("chat-tools");
    var helpToolsElement = document.getElementById("help-tools");
    var lobbyToggleButton = document.getElementById("lobby-toggle");
    var lobbyToggleStateElement = document.getElementById("lobby-toggle-state");
    var accountToggleButton = document.getElementById("account-toggle");
    var accountToggleStateElement = document.getElementById("account-toggle-state");
    var chatToggleButton = document.getElementById("chat-toggle");
    var chatToggleStateElement = document.getElementById("chat-toggle-state");
    var helpToggleButton = document.getElementById("help-toggle");
    var lobbyPanelElement = document.getElementById("lobby-panel");
    var lobbyCloseButton = document.getElementById("lobby-close");
    var accountPanelElement = document.getElementById("account-panel");
    var accountCloseButton = document.getElementById("account-close");
    var accountAuthSectionElement = document.getElementById("account-auth-section");
    var accountRecoverySectionElement = document.getElementById("account-recovery-section");
    var accountProfileSectionElement = document.getElementById("account-profile-section");
    var accountUsernameElement = document.getElementById("account-username");
    var accountPasswordElement = document.getElementById("account-password");
    var accountRecoveryUsernameElement = document.getElementById("account-recovery-username");
    var accountRecoveryCodeElement = document.getElementById("account-recovery-code");
    var accountRecoveryPasswordElement = document.getElementById("account-recovery-password");
    var accountRecoverButton = document.getElementById("account-recover");
    var accountLoginButton = document.getElementById("account-login");
    var accountRegisterButton = document.getElementById("account-register");
    var accountLogoutButton = document.getElementById("account-logout");
    var accountErrorElement = document.getElementById("account-error");
    var accountNameElement = document.getElementById("account-name");
    var accountUsernameViewElement = document.getElementById("account-username-view");
    var accountProfileNameElement = document.getElementById("account-profile-name");
    var accountSaveProfileButton = document.getElementById("account-save-profile");
    var accountCurrentPasswordElement = document.getElementById("account-current-password");
    var accountNewPasswordElement = document.getElementById("account-new-password");
    var accountChangePasswordButton = document.getElementById("account-change-password");
    var accountRecoveryMetaElement = document.getElementById("account-recovery-meta");
    var accountDownloadRecoveryButton = document.getElementById("account-download-recovery");
    var cloudSaveStatusElement = document.getElementById("cloud-save-status");
    var cloudSaveLabelElement = document.getElementById("cloud-save-label");
    var cloudSaveUploadButton = document.getElementById("cloud-save-upload");
    var cloudSaveListElement = document.getElementById("cloud-save-list");
    var chatPanelElement = document.getElementById("chat-panel");
    var chatCloseButton = document.getElementById("chat-close");
    var chatRoomElement = document.getElementById("chat-room");
    var chatStatusElement = document.getElementById("chat-status");
    var chatErrorElement = document.getElementById("chat-error");
    var chatMessageListElement = document.getElementById("chat-message-list");
    var chatInputElement = document.getElementById("chat-input");
    var chatSendButton = document.getElementById("chat-send");
    var helpPanelElement = document.getElementById("help-panel");
    var helpCloseButton = document.getElementById("help-close");
    var lobbyDisplayNameElement = document.getElementById("lobby-display-name");
    var lobbySessionSaveButton = document.getElementById("lobby-session-save");
    var lobbyRefreshButton = document.getElementById("lobby-refresh");
    var lobbyStatusElement = document.getElementById("lobby-status");
    var lobbyJoinDetailsElement = document.getElementById("lobby-join-details");
    var lobbyInstanceNameElement = document.getElementById("lobby-instance-name");
    var lobbyInstanceDescriptionElement = document.getElementById("lobby-instance-description");
    var lobbyInstanceMaxElement = document.getElementById("lobby-instance-max");
    var lobbyInstancePasswordElement = document.getElementById("lobby-instance-password");
    var lobbyRulesetElement = document.getElementById("lobby-ruleset");
    var lobbyStartCellElement = document.getElementById("lobby-start-cell");
    var lobbyPaceElement = document.getElementById("lobby-pace");
    var lobbyTimeOfDayElement = document.getElementById("lobby-time-of-day");
    var lobbyWeatherElement = document.getElementById("lobby-weather");
    var lobbyCombatElement = document.getElementById("lobby-combat");
    var lobbyCreateErrorElement = document.getElementById("lobby-create-error");
    var lobbyCreateButton = document.getElementById("lobby-create");
    var lobbyInstanceListElement = document.getElementById("lobby-instance-list");
    var lobbyBrowserCountElement = document.getElementById("lobby-browser-count");
    var lobbyFilterTextElement = document.getElementById("lobby-filter-text");
    var lobbyFilterKindElement = document.getElementById("lobby-filter-kind");
    var lobbyTabButtons = Array.prototype.slice.call(document.querySelectorAll("[data-lobby-tab]"));
    var lobbyTabPanels = Array.prototype.slice.call(document.querySelectorAll("[data-lobby-panel]"));
    var lobbyDirectTargetElement = document.getElementById("lobby-direct-target");
    var lobbyDirectPasswordElement = document.getElementById("lobby-direct-password");
    var lobbyDirectJoinButton = document.getElementById("lobby-direct-join");
    var lobbyDirectErrorElement = document.getElementById("lobby-direct-error");
    var commandToggleButton = document.getElementById("command-toggle");
    var commandToggleStateElement = document.getElementById("command-toggle-state");
    var commandPanelElement = document.getElementById("command-panel");
    var commandCloseButton = document.getElementById("command-close");
    var commandRenderSizeElement = document.getElementById("command-render-size");
    var commandFullscreenStateElement = document.getElementById("command-fullscreen-state");
    var commandTouchStateElement = document.getElementById("command-touch-state");
    var commandTouchModeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-touch-mode]"));
    var commandTouchLookElement = document.getElementById("command-touch-look");
    var commandTouchLookValueElement = document.getElementById("command-touch-look-value");
    var commandModListElement = document.getElementById("command-mod-list");
    var commandModStatusElement = document.getElementById("command-mod-status");
    var commandModApplyButton = document.getElementById("command-mod-apply");
    var renderProfileButtons = Array.prototype.slice.call(document.querySelectorAll("[data-render-profile]"));
    var fullscreenToggleButton = document.getElementById("fullscreen-toggle");
    var syncSaveButton = document.getElementById("sync-save");
    var exportSaveButton = document.getElementById("export-save");
    var importSaveButton = document.getElementById("import-save");
    var importSaveFileElement = document.getElementById("import-save-file");
    var saveToastElement = document.getElementById("save-toast");
    var loadingOverlayElement = document.getElementById("loading-overlay");
    var loadingSplashElement = document.getElementById("loading-splash");
    var loadingTextElement = document.getElementById("loading-text");
    var mainMenuActionsElement = document.getElementById("main-menu-actions");
    var newDefaultButton = document.getElementById("new-default");
    var newBlankButton = document.getElementById("new-blank");
    var browserRenderProfileStorageKey = "openmw-render-profile";
    var browserRenderProfiles = {
      low: { label: "Lo", width: 1280, height: 720 },
      med: { label: "Med", width: 1600, height: 900 },
      high: { label: "Hi", width: 1920, height: 1080 }
    };
    var browserDefaultRenderProfile = "med";
    var browserRenderProfile = browserDefaultRenderProfile;
    var browserBaseRenderWidth = browserRenderProfiles[browserRenderProfile].width;
    var browserBaseRenderHeight = browserRenderProfiles[browserRenderProfile].height;
    var browserTargetRenderPixels = browserBaseRenderWidth * browserBaseRenderHeight;
    var browserGameAspectWidth = 16;
    var browserGameAspectHeight = 9;
    var browserGuiReferenceWidth = 1280;
    var browserGuiReferenceHeight = 720;
    var canvasRenderCapTimers = [];
    var touchControlsModeStorageKey = "morrowind-touch-controls-mode";
    var touchControlsLookStorageKey = "morrowind-touch-look-sensitivity";
    var touchControlsMode = "auto";
    var touchLookSensitivity = 3;
    var touchMovePointerId = null;
    var touchLookPointerId = null;
    var touchLookLastPoint = null;
    var touchPendingLookDeltaX = 0;
    var touchPendingLookDeltaY = 0;
    var touchLookFrame = 0;
    var touchPressedKeys = {};
    var touchPressedMouseButtons = {};
    var touchEscapeSentToGame = false;
    var touchMovementState = { x: 0, y: 0 };
    var browserModStorageKey = "openmw-enabled-mods";
    var browserModCatalog = [
      {
        id: "official-splash",
        title: "Original Loading Art",
        description: "Official loading art from the installed Morrowind data.",
        statusLabel: "Package",
        defaultEnabled: true,
        runtimeScript: "openmw-splash.data.js"
      },
      {
        id: "cell-preload",
        title: "Cell Preloading",
        description: "Keeps nearby cells prepared during area transitions.",
        statusLabel: "Core",
        defaultEnabled: true,
        reloadRequired: true
      },
      {
        id: "web-stability",
        title: "Web Stability Layer",
        description: "Render caps, save sync, log throttling, and loading guards.",
        statusLabel: "Locked",
        defaultEnabled: true,
        locked: true
      }
    ];
    var browserModSelection = {};
    var browserModLoadState = {};
    var browserModReloadRequired = false;
    var lobbyApiBase = "/api/lobby/v1";
    var accountApiBase = "/api/account/v1";
    var chatApiBase = "/api/chat/v1";
    var accountCsrfStorageKey = "openmw-account-csrf";
    var lobbySessionStorageKey = "openmw-lobby-session";
    var lobbyDisplayNameStorageKey = "openmw-lobby-display-name";
    var lobbyOwnedInstancesStorageKey = "openmw-lobby-owned-instances";
    var tes3mpLaunchStorageKey = "openmw-tes3mp-launch";
    var lobbyTabStorageFallback = {};
    var lobbyState = {};
    var lobbyOwnedInstances = {};
    var lobbyInstances = [];
    var lobbyConfig = {
      createMode: "unknown",
      createRequiresInvite: false,
      inviteConfigured: false,
      tes3mp: {}
    };
    var lobbyConfigPromise = null;
    var lobbyBusy = false;
    var lobbyPollTimer = 0;
    var lobbyHeartbeatTimer = 0;
    var lobbyEventAbortController = null;
    var accountState = {
      account: null,
      csrfToken: "",
      saves: []
    };
    var accountBusy = false;
    var cloudSaveBusy = false;
    var chatRooms = [];
    var chatMessages = [];
    var chatEventAbortController = null;
    var chatPollTimer = 0;
    var chatBusy = false;
    var chatDeletingMessageIds = {};
    var browserHostRuntime = null;
    var browserHostSignalPollTimer = 0;
    var browserHostSyntheticServerPort = 25565;
    var browserHostLocalPort = 40000;
    var browserHostNextPeerPort = 40001;
    var browserHostDataChannelHighWaterBytes = 8 * 1024 * 1024;
    var browserHostDataChannelLowWaterBytes = 1024 * 1024;
    var browserHostPeerReconnectGraceMs = 30000;
