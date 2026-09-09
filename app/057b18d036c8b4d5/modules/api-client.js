(function installMorrowindApiClient(root) {
  "use strict";

  function parseJsonResponse(response, responseType) {
    if (responseType === "blob" && response.ok) return response.blob();
    return response.text().then(function(text) {
      var json = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch (error) {
          json = { error: { message: text } };
        }
      }
      if (!response.ok) {
        var message = json && json.error && json.error.message
          ? json.error.message
          : "HTTP " + response.status;
        var requestError = new Error(message);
        requestError.status = response.status;
        requestError.body = json;
        throw requestError;
      }
      return json;
    });
  }

  function request(options) {
    var method = options.method || "GET";
    var hasRawBody = Object.prototype.hasOwnProperty.call(options, "rawBody");
    var hasJsonBody = Object.prototype.hasOwnProperty.call(options, "body");
    var headers = Object.assign(
      {
        Accept: options.responseType === "blob"
          ? "application/octet-stream"
          : "application/json"
      },
      hasJsonBody ? { "Content-Type": "application/json" } : {},
      options.headers || {}
    );
    if (!/^(GET|HEAD)$/i.test(method) &&
        options.csrfToken &&
        !headers["X-CSRF-Token"]) {
      headers["X-CSRF-Token"] = options.csrfToken;
    }
    return (options.fetchImpl || root.fetch)(options.baseUrl + options.path, {
      method: method,
      headers: headers,
      body: hasRawBody
        ? options.rawBody
        : hasJsonBody
          ? JSON.stringify(options.body)
          : undefined,
      cache: "no-store",
      credentials: "same-origin"
    }).then(function(response) {
      return parseJsonResponse(response, options.responseType);
    });
  }

  root.MorrowindApi = Object.freeze({
    request: request
  });
})(typeof window !== "undefined" ? window : globalThis);
