    function setAccountError(message) {
      accountErrorElement.textContent = message || "";
      accountErrorElement.hidden = !message;
    }

    function downloadTextFile(filename, text) {
      var link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function() {
        URL.revokeObjectURL(link.href);
      }, 1000);
    }

    function downloadRecoveryCode(recoveryCode, username) {
      if (!recoveryCode) return;
      var safeUsername = String(username || "account").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "account";
      var timestamp = new Date().toISOString();
      downloadTextFile("morrowind-app-recovery-" + safeUsername + ".txt", [
        "Morrowind App recovery code",
        "",
        "Username: " + (username || ""),
        "Recovery code: " + recoveryCode,
        "Generated: " + timestamp,
        "",
        "Store this somewhere safe. It can reset your password."
      ].join("\n"));
    }

    function setChatError(message) {
      chatErrorElement.textContent = message || "";
      chatErrorElement.hidden = !message;
    }

    function accountSignedIn() {
      return !!(accountState.account && accountState.account.id);
    }

    function currentAccountId() {
      return accountState.account && accountState.account.id || "";
    }

    function isOwnChatMessage(message) {
      return !!(message && message.accountId && message.accountId === currentAccountId());
    }

    function getAccountPlayerName() {
      if (!accountSignedIn()) return "";
      return sanitizeLobbyText(
        accountState.account.username || accountState.account.displayName,
        "Nerevarine",
        32
      );
    }

    function getLobbyPlayerName() {
      return getAccountPlayerName() ||
        sanitizeLobbyText(lobbyDisplayNameElement.value || getStoredLobbyDisplayName(), "Nerevarine", 32);
    }

    function syncLobbyPlayerNameToAccount(options) {
      var accountName = getAccountPlayerName();
      if (!accountName) return "";
      lobbyDisplayNameElement.value = accountName;
      storeLobbyDisplayName(accountName);
      if (options && options.resetSession &&
          lobbyState && lobbyState.sessionToken &&
          sanitizeLobbyText(lobbyState.displayName, "", 32) !== accountName) {
        lobbyState = {};
        storeLobbySessionState();
      }
      return accountName;
    }

    function updateLobbyIdentityControls() {
      var accountLocked = !!getAccountPlayerName();
      if (accountLocked) syncLobbyPlayerNameToAccount({ resetSession: true });
      lobbyDisplayNameElement.disabled = accountLocked || !shellControlsEnabled;
      lobbySessionSaveButton.disabled = accountLocked || !shellControlsEnabled;
    }

    function formatBytes(value) {
      value = Math.max(0, Number(value) || 0);
      if (value >= 1024 * 1024 * 1024) return (value / (1024 * 1024 * 1024)).toFixed(1) + " GB";
      if (value >= 1024 * 1024) return (value / (1024 * 1024)).toFixed(1) + " MB";
      if (value >= 1024) return (value / 1024).toFixed(1) + " KB";
      return value + " B";
    }

    function formatPanelTime(value) {
      var date = value ? new Date(value) : null;
      if (!date || isNaN(date.getTime())) return "";
      return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    function renderCloudSaves() {
      cloudSaveListElement.textContent = "";
      var signedIn = accountSignedIn();
      if (!signedIn) {
        var signedOut = document.createElement("div");
        signedOut.className = "cloud-save-row";
        signedOut.textContent = "Sign in to use cloud saves.";
        cloudSaveListElement.appendChild(signedOut);
        return;
      }
      if (!accountState.saves.length) {
        var empty = document.createElement("div");
        empty.className = "cloud-save-row";
        empty.textContent = "No cloud saves yet.";
        cloudSaveListElement.appendChild(empty);
        return;
      }
      accountState.saves.forEach(function(save) {
        var revision = save.latestRevision || {};
        var row = document.createElement("div");
        row.className = "cloud-save-row";

        var head = document.createElement("div");
        head.className = "cloud-save-head";
        var title = document.createElement("div");
        title.className = "cloud-save-title";
        title.textContent = save.label || "Browser save";
        var time = document.createElement("div");
        time.className = "cloud-save-meta";
        time.textContent = formatPanelTime(save.updatedAt || revision.createdAt);
        head.appendChild(title);
        head.appendChild(time);

        var meta = document.createElement("div");
        meta.className = "cloud-save-meta";
        meta.textContent = [
          revision.sizeBytes ? formatBytes(revision.sizeBytes) : "",
          save.revisionCount ? save.revisionCount + " revision" + (save.revisionCount === 1 ? "" : "s") : ""
        ].filter(Boolean).join(" / ");

        var actions = document.createElement("div");
        actions.className = "cloud-save-actions";
        var restore = document.createElement("button");
        restore.type = "button";
        restore.textContent = "Restore";
        restore.disabled = !revision.id || cloudSaveBusy || isTes3mpRuntimeActive();
        restore.addEventListener("click", function() {
          restoreCloudSave(save);
        });
        var remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Delete";
        remove.disabled = cloudSaveBusy;
        remove.addEventListener("click", function() {
          deleteCloudSave(save);
        });
        actions.appendChild(restore);
        actions.appendChild(remove);

        row.appendChild(head);
        row.appendChild(meta);
        row.appendChild(actions);
        cloudSaveListElement.appendChild(row);
      });
    }

    function renderAccountPanel() {
      var signedIn = accountSignedIn();
      accountAuthSectionElement.hidden = signedIn;
      accountRecoverySectionElement.hidden = signedIn;
      accountProfileSectionElement.hidden = !signedIn;
      accountToggleButton.classList.toggle("online", signedIn);
      accountToggleButton.classList.toggle("offline", !signedIn);
      chatToggleButton.classList.toggle("online", signedIn);
      chatToggleButton.classList.toggle("offline", !signedIn);
      accountToggleStateElement.textContent = signedIn ? "In" : "Out";
      chatToggleStateElement.textContent = signedIn ? "On" : "Out";
      if (signedIn) {
        var username = accountState.account.username || accountState.account.displayName || "Nerevarine";
        accountNameElement.textContent = username;
        accountUsernameViewElement.textContent = "Username";
        if (document.activeElement !== accountProfileNameElement) {
          accountProfileNameElement.value = username;
        }
        accountRecoveryMetaElement.textContent = accountState.account.hasRecoveryCode
          ? "Recovery code ready. Download a new one to rotate it."
          : "No recovery code stored yet. Download one now.";
      }
      var disabled = accountBusy;
      [accountUsernameElement, accountPasswordElement, accountLoginButton, accountRegisterButton].forEach(function(element) {
        if (element) element.disabled = disabled || signedIn;
      });
      [accountRecoveryUsernameElement, accountRecoveryCodeElement, accountRecoveryPasswordElement, accountRecoverButton].forEach(function(element) {
        if (element) element.disabled = disabled || signedIn;
      });
      [accountProfileNameElement, accountSaveProfileButton, accountLogoutButton, accountCurrentPasswordElement, accountNewPasswordElement, accountChangePasswordButton, accountDownloadRecoveryButton].forEach(function(element) {
        if (element) element.disabled = disabled || !signedIn;
      });
      cloudSaveUploadButton.disabled = !signedIn || cloudSaveBusy || isTes3mpRuntimeActive();
      cloudSaveLabelElement.disabled = !signedIn || cloudSaveBusy;
      if (!signedIn) {
        cloudSaveStatusElement.textContent = "Not signed in";
      } else if (cloudSaveBusy) {
        cloudSaveStatusElement.textContent = "Working";
      } else {
        cloudSaveStatusElement.textContent = formatBytes(accountState.usedBytes || 0) + " used";
      }
      chatStatusElement.textContent = signedIn
        ? "Signed in as " + (accountState.account.username || accountState.account.displayName || "Nerevarine")
        : "Sign in to send";
      chatStatusElement.disabled = signedIn;
      chatStatusElement.setAttribute("aria-label", signedIn ? chatStatusElement.textContent : "Open account sign in");
      chatSendButton.disabled = !signedIn || chatBusy;
      updateLobbyIdentityControls();
      renderCloudSaves();
    }

    function setAccountSession(payload) {
      payload = payload || {};
      accountState.account = payload.account || null;
      storeAccountCsrfToken(payload.csrfToken || "");
      if (accountState.account && (accountState.account.username || accountState.account.displayName)) {
        var username = accountState.account.username || accountState.account.displayName;
        accountUsernameElement.value = username;
        accountRecoveryUsernameElement.value = username;
        syncLobbyPlayerNameToAccount({ resetSession: true });
      }
      renderAccountPanel();
      renderChatMessages();
      if (accountSignedIn()) {
        loadCloudSaves();
        startChatEventStream();
      } else {
        accountState.saves = [];
        stopChatEventStream();
        renderAccountPanel();
      }
    }

    function loadAccountMe() {
      accountState.csrfToken = readAccountCsrfToken();
      return accountFetch("/me").then(function(result) {
        setAccountSession(result);
        return result;
      }).catch(function(error) {
        accountState.account = null;
        storeAccountCsrfToken("");
        renderAccountPanel();
        renderChatMessages();
        return null;
      });
    }

    function submitAccountAuth(createAccount) {
      if (accountBusy) return;
      accountBusy = true;
      setAccountError("");
      renderAccountPanel();
      accountFetch(createAccount ? "/register" : "/login", {
        method: "POST",
        body: {
          username: accountUsernameElement.value || lobbyDisplayNameElement.value,
          password: accountPasswordElement.value
        }
      }).then(function(result) {
        accountPasswordElement.value = "";
        setAccountSession(result);
        if (createAccount && result.recoveryCode) {
          downloadRecoveryCode(result.recoveryCode, result.account && (result.account.username || result.account.displayName));
        }
        showSaveToast(createAccount ? "Account created" : "Signed in");
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Sign in failed"));
      }).finally(function() {
        accountBusy = false;
        renderAccountPanel();
      });
    }

    function logoutAccount() {
      if (accountBusy) return;
      accountBusy = true;
      accountFetch("/logout", { method: "POST" }).catch(function() {
      }).finally(function() {
        accountState.account = null;
        accountState.saves = [];
        storeAccountCsrfToken("");
        accountBusy = false;
        stopChatEventStream();
        renderAccountPanel();
        renderChatMessages();
        showSaveToast("Signed out");
      });
    }

    function saveAccountProfile() {
      if (!accountSignedIn() || accountBusy) return;
      accountBusy = true;
      setAccountError("");
      renderAccountPanel();
      accountFetch("/me", {
        method: "PATCH",
        body: {
          username: accountProfileNameElement.value
        }
      }).then(function(result) {
        accountState.account = result.account || accountState.account;
        var username = accountState.account && (accountState.account.username || accountState.account.displayName);
        if (username) {
          lobbyDisplayNameElement.value = username;
          storeLobbyDisplayName(username);
        }
        showSaveToast("Username saved");
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Profile save failed"));
      }).finally(function() {
        accountBusy = false;
        renderAccountPanel();
      });
    }

    function recoverAccountPassword() {
      if (accountBusy) return;
      accountBusy = true;
      setAccountError("");
      renderAccountPanel();
      accountFetch("/recover", {
        method: "POST",
        body: {
          username: accountRecoveryUsernameElement.value || accountUsernameElement.value,
          recoveryCode: accountRecoveryCodeElement.value,
          newPassword: accountRecoveryPasswordElement.value
        }
      }).then(function(result) {
        accountRecoveryCodeElement.value = "";
        accountRecoveryPasswordElement.value = "";
        accountPasswordElement.value = "";
        setAccountSession(result);
        if (result.recoveryCode) {
          downloadRecoveryCode(result.recoveryCode, result.account && (result.account.username || result.account.displayName));
        }
        showSaveToast("Password reset");
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Password reset failed"));
      }).finally(function() {
        accountBusy = false;
        renderAccountPanel();
      });
    }

    function changeAccountPassword() {
      if (!accountSignedIn() || accountBusy) return;
      accountBusy = true;
      setAccountError("");
      renderAccountPanel();
      accountFetch("/password", {
        method: "POST",
        body: {
          currentPassword: accountCurrentPasswordElement.value,
          newPassword: accountNewPasswordElement.value
        }
      }).then(function(result) {
        accountCurrentPasswordElement.value = "";
        accountNewPasswordElement.value = "";
        accountState.account = result.account || accountState.account;
        showSaveToast("Password reset");
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Password reset failed"));
      }).finally(function() {
        accountBusy = false;
        renderAccountPanel();
      });
    }

    function downloadAccountRecoveryCode() {
      if (!accountSignedIn() || accountBusy) return;
      accountBusy = true;
      setAccountError("");
      renderAccountPanel();
      accountFetch("/recovery-code", { method: "POST" }).then(function(result) {
        accountState.account = result.account || accountState.account;
        downloadRecoveryCode(result.recoveryCode, accountState.account && (accountState.account.username || accountState.account.displayName));
        showSaveToast("Recovery code downloaded");
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Recovery code failed"));
      }).finally(function() {
        accountBusy = false;
        renderAccountPanel();
      });
    }

    function loadCloudSaves() {
      if (!accountSignedIn()) {
        renderAccountPanel();
        return Promise.resolve([]);
      }
      return accountFetch("/saves").then(function(result) {
        accountState.saves = result.items || [];
        accountState.usedBytes = result.usedBytes || 0;
        accountState.maxBytes = result.maxBytes || 0;
        renderAccountPanel();
        return accountState.saves;
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Cloud saves unavailable"));
        return [];
      });
    }

    function uploadCloudSave() {
      if (!accountSignedIn() || cloudSaveBusy) return;
      if (isTes3mpRuntimeActive()) {
        showSaveToast("Upload after leaving multiplayer");
        canvasElement.focus();
        return;
      }
      cloudSaveBusy = true;
      setAccountError("");
      renderAccountPanel();
      createOpenMwUserDataArchive().then(function(archive) {
        var label = cloudSaveLabelElement.value || "Browser save";
        return accountFetch("/saves?label=" + encodeURIComponent(label), {
          method: "POST",
          rawBody: archive.blob,
          headers: {
            "Content-Type": "application/x-tar",
            "X-Save-Label": label,
            "X-Client-Build": buildVersion
          }
        });
      }).then(function(result) {
        accountState.usedBytes = result.usedBytes || accountState.usedBytes || 0;
        showSaveToast("Cloud save uploaded");
        return loadCloudSaves();
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Cloud upload failed"));
      }).finally(function() {
        cloudSaveBusy = false;
        renderAccountPanel();
      });
    }

    function restoreCloudSave(save) {
      var revision = save && save.latestRevision || {};
      if (!accountSignedIn() || !save || !revision.id || cloudSaveBusy) return;
      if (isTes3mpRuntimeActive()) {
        showSaveToast("Restore after leaving multiplayer");
        canvasElement.focus();
        return;
      }
      cloudSaveBusy = true;
      setAccountError("");
      renderAccountPanel();
      accountFetch("/saves/" + encodeURIComponent(save.id) + "/revisions/" + encodeURIComponent(revision.id) + "/download", {
        responseType: "blob"
      }).then(function(blob) {
        return importOpenMwUserDataBlob(blob);
      }).then(function() {
        showSaveToast("Cloud save restored");
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Cloud restore failed"));
      }).finally(function() {
        cloudSaveBusy = false;
        renderAccountPanel();
      });
    }

    function deleteCloudSave(save) {
      if (!accountSignedIn() || !save || cloudSaveBusy) return;
      cloudSaveBusy = true;
      setAccountError("");
      renderAccountPanel();
      accountFetch("/saves/" + encodeURIComponent(save.id), {
        method: "DELETE"
      }).then(function(result) {
        accountState.usedBytes = result.usedBytes || 0;
        showSaveToast("Cloud save deleted");
        return loadCloudSaves();
      }).catch(function(error) {
        setAccountError(formatAccountError(error, "Cloud delete failed"));
      }).finally(function() {
        cloudSaveBusy = false;
        renderAccountPanel();
      });
    }
