// Kryntar service worker — network-first, always.
//
// Strategy: every GET goes to the network first and the fresh response is
// what gets served; the cache is only a fallback for when the network is
// unreachable, so this worker can never serve stale content while online.
// Server-action requests (the ./actions RPC endpoint) and all non-GET
// requests are never intercepted — game access, score submits, and the
// leaderboard always talk straight to the server.

const CACHE = "kryntar-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/actions")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        throw err;
      }
    })(),
  );
});
