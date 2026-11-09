const CACHE = "win2k-desktop-v1";
const isAsset = (u) => /\/assets\/.+\.(png|gif|ico|woff2?|ttf)$/i.test(u.pathname);
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await cache.addAll(["/", "/main.js", "/desktop.css"]).catch(() => {});
        // Warm every icon in the background so later windows never wait on the network.
        try {
          const list = await (await fetch(new URL("assets-manifest.json", self.location))).json();
          for (let i = 0; i < list.length; i += 24)
            await Promise.all(list.slice(i, i + 24).map((f) => cache.add(new URL(f, self.location)).catch(() => {})));
        } catch {}
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
    return event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  event.respondWith(
    fetch(request)
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
