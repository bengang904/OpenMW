    function lobbyAuthHeaders() {
      return lobbyState && lobbyState.sessionToken
        ? { Authorization: "Bearer " + lobbyState.sessionToken }
        : {};
    }

    function lobbyFetch(path, options) {
    console.log("Blocked lobby API:", path);

    return Promise.resolve({
        ok:true,
        body:{}
    });
}

    function readAccountCsrfToken() {
      try {
        return sessionStorage.getItem(accountCsrfStorageKey) || "";
      } catch (error) {
        return "";
      }
    }

    function storeAccountCsrfToken(value) {
      accountState.csrfToken = value || "";
      try {
        if (accountState.csrfToken) {
          sessionStorage.setItem(accountCsrfStorageKey, accountState.csrfToken);
        } else {
          sessionStorage.removeItem(accountCsrfStorageKey);
        }
      } catch (error) {
      }
    }

    function getApiErrorCode(error) {
      return error && error.body && error.body.error && error.body.error.code || "";
    }

    function formatAccountError(error, fallback) {
      var code = getApiErrorCode(error);
      if (code === "account_required") return "Sign in again.";
      if (code === "credentials_invalid") return "Username or password is incorrect.";
      if (code === "username_invalid") return "Username must be 3 to 32 characters.";
      if (code === "password_invalid") return "Password must be at least 8 characters.";
      if (code === "account_exists") return "Account already exists.";
      if (code === "recovery_invalid") return "Recovery code is incorrect.";
      if (code === "csrf_required") return "Session expired. Sign in again.";
      if (code === "save_quota_exceeded") return "Cloud save storage is full.";
      if (code === "save_conflict") return "Cloud save changed. Refresh and try again.";
      if (code === "rate_limited") return "Too many requests. Try again shortly.";
      if (code === "account_store_unavailable") return "Account service unavailable.";
      return error && error.message ? error.message : fallback;
    }

    function accountFetch(path, options) {
  console.log("Blocked account request:", path);

  return Promise.resolve({
    ok: true,
    body: {}
  });
}

    function chatFetch(path, options) {
      options = options || {};
      var method = options.method || "GET";
      var request = {
        baseUrl: chatApiBase,
        path: path,
        method: method,
        headers: options.headers || {},
        csrfToken: accountState.csrfToken
      };
      if (options.body) request.body = options.body;
      return MorrowindApi.request(request);
    }
