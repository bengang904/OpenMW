const SHELL_CACHE = "morrowind-app-shell-057b18d036c8b4d5";
const STATIC_CACHE = "morrowind-app-static-f6d3d8d6ba75ed3f";
const RUNTIME_CACHE = "morrowind-app-runtime-c4ac39025188740b";
const OWN_CACHE_PREFIX = "morrowind-app-";
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/app/057b18d036c8b4d5/modules/api-client.js",
  "/app/057b18d036c8b4d5/modules/openmw-runtime-policy.js",
  "/app/057b18d036c8b4d5/modules/runtime-error-policy.js",
  "/app/057b18d036c8b4d5/modules/tes3mp-render-policy.js",
  "/app/057b18d036c8b4d5/release-config.js",
  "/app/057b18d036c8b4d5/scripts/00-bootstrap.js",
  "/app/057b18d036c8b4d5/scripts/10-touch-input.js",
  "/app/057b18d036c8b4d5/scripts/20-shell-mods.js",
  "/app/057b18d036c8b4d5/scripts/30-multiplayer-session.js",
  "/app/057b18d036c8b4d5/scripts/31-multiplayer-signaling.js",
  "/app/057b18d036c8b4d5/scripts/32-multiplayer-relay.js",
  "/app/057b18d036c8b4d5/scripts/33-multiplayer-peers.js",
  "/app/057b18d036c8b4d5/scripts/34-multiplayer-launch.js",
  "/app/057b18d036c8b4d5/scripts/40-api-client.js",
  "/app/057b18d036c8b4d5/scripts/41-account-cloud-saves.js",
  "/app/057b18d036c8b4d5/scripts/42-chat.js",
  "/app/057b18d036c8b4d5/scripts/43-lobby-browser.js",
  "/app/057b18d036c8b4d5/scripts/44-lobby-events-panels.js",
  "/app/057b18d036c8b4d5/scripts/49-initialize-state.js",
  "/app/057b18d036c8b4d5/scripts/50-display-tools.js",
  "/app/057b18d036c8b4d5/scripts/60-runtime-manifest-home.js",
  "/app/057b18d036c8b4d5/scripts/61-loading-readiness.js",
  "/app/057b18d036c8b4d5/scripts/62-persistence-gameplay.js",
  "/app/057b18d036c8b4d5/scripts/63-settings-audio.js",
  "/app/057b18d036c8b4d5/scripts/64-save-archives.js",
  "/app/057b18d036c8b4d5/scripts/65-ui-events.js",
  "/app/057b18d036c8b4d5/scripts/66-diagnostics.js",
  "/app/057b18d036c8b4d5/scripts/70-runtime-loader.js",
  "/app/057b18d036c8b4d5/scripts/71-tes3mp-runtime-patch.js",
  "/app/057b18d036c8b4d5/scripts/72-runtime-boot.js",
  "/app/057b18d036c8b4d5/scripts/rendering-compat.js",
  "/app/057b18d036c8b4d5/styles/00-fonts-tokens-base.css",
  "/app/057b18d036c8b4d5/styles/10-touch-video.css",
  "/app/057b18d036c8b4d5/styles/20-home-ribbon.css",
  "/app/057b18d036c8b4d5/styles/30-panels-common.css",
  "/app/057b18d036c8b4d5/styles/40-lobby.css",
  "/app/057b18d036c8b4d5/styles/50-account-chat-help.css",
  "/app/057b18d036c8b4d5/styles/60-tools-loading.css",
  "/app/057b18d036c8b4d5/styles/90-responsive.css",
  "/static/f6d3d8d6ba75ed3f/assets/morrowind-app.png"
];

const RUNTIME_METADATA_RE =
  /\/runtime\/[a-f0-9]+\/(?:.*\.js|.*\.wasm|.*\.cfg|.*\.data\.chunks\.json)$/;
const DATA_CHUNK_RE = /\/runtime\/[a-f0-9]+\/(?:openmw|tes3mp)\.data\.\d+$/;
const DATA_PACKAGE_RE =
  /\/runtime\/[a-f0-9]+\/(?:openmw|tes3mp|tes3mp-server|openmw-splash|openmw-mod-[a-z0-9-]+)\.data$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const active = new Set([SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => {
        if (!key.startsWith(OWN_CACHE_PREFIX) || active.has(key)) return null;
        return caches.delete(key);
      })))
      .then(() => self.clients.claim())
  );
});

function withIsolationHeaders(response) {
  if (!response) return response;
  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function cacheFirst(request, cacheName) {
  if (request.headers.has("range")) return withIsolationHeaders(await fetch(request));
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return withIsolationHeaders(cached);
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone()).catch((error) => {
      console.warn("Morrowind cache write failed", request.url, error);
    });
  }
  return withIsolationHeaders(response);
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put("/", response.clone()).catch(() => {});
    return withIsolationHeaders(response);
  } catch {
    const fallback = await cache.match(request) || await cache.match("/");
    return withIsolationHeaders(fallback || new Response("offline", { status: 503 }));
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).then(withIsolationHeaders));
    return;
  }
  if (request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (url.pathname.startsWith("/app/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (DATA_CHUNK_RE.test(url.pathname) || RUNTIME_METADATA_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }
  if (DATA_PACKAGE_RE.test(url.pathname)) {
    event.respondWith(fetch(request).then(withIsolationHeaders));
    return;
  }
  event.respondWith(fetch(request).then(withIsolationHeaders));
});
