const CACHE = "win2k-desktop-v4";
const isAsset = (u) => /\/assets\/.+\.(png|gif|ico|woff2?|ttf)$/i.test(u.pathname);
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(["/", "/main.js", "/desktop.css"]).catch(() => {});
        // Only the shell is pre-cached; icons and program modules are cached the first time they are used.
      }),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;
  if (isAsset(url))
    // Stale-while-revalidate: instant from cache, refreshed in the background so replaced icons reach everyone.
    return event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          const net = fetch(request, { cache: "no-cache" })
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
  event.respondWith(
    fetch(request, { cache: "no-cache" })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then(
            (cached) =>
              cached ||
              (request.mode === "navigate"
                ? caches.match("/")
                : Response.error()),
          ),
      ),
  );
});
