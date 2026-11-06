/* Time Tracker - service worker
 * Provides offline support by caching the app shell (HTML, CSS, JS, manifest, icons).
 * No backend, no external data caching needed - everything the app needs is static.
 */

const CACHE_NAME = "time-tracker-cache-v6";
const APP_SHELL = [
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests for our own origin / app shell.
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Prefer current same-origin resources so app updates are picked up
        // immediately, while retaining them for offline use.
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          request.url.startsWith(self.location.origin)
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback: use the cached app shell when the network is unavailable.
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return undefined;
        });
      })
  );
});
