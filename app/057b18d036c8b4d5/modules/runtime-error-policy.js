(function installMorrowindRuntimeErrorPolicy(root) {
  "use strict";

  const pointerLockFailure = /pointer lock/i;
  const recoverablePointerLockErrors = new Set([
    "AbortError",
    "NotAllowedError",
    "SecurityError",
    "WrongDocumentError"
  ]);

  function errorMessage(reason) {
    return reason && reason.message
      ? String(reason.message)
      : String(reason || "");
  }

  function classifyUnhandledRejection(reason) {
    const message = errorMessage(reason);
    const name = reason && reason.name ? String(reason.name) : "";
    if (recoverablePointerLockErrors.has(name) && pointerLockFailure.test(message)) {
      return Object.freeze({
        fatal: false,
        code: "pointer-lock-unavailable",
        message
      });
    }
    return Object.freeze({
      fatal: true,
      code: "unhandled-rejection",
      message
    });
  }

  root.MorrowindRuntimeErrorPolicy = Object.freeze({
    classifyUnhandledRejection
  });
})(typeof window !== "undefined" ? window : globalThis);
