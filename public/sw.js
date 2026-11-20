// Service worker minimale: l'app funziona offline dopo la prima visita.
const VERSION = "v1";
const CACHE = `wod-${VERSION}`;
const SHELL = ["/", "/manifest.webmanifest", "/workouts.json", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// La pagina ci manda l'elenco delle risorse già caricate (JS/CSS con hash)
// così il primo avvio offline funziona senza dover ricaricare.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS") return;
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(
        event.data.urls.map((u) =>
          c.match(u).then((hit) => hit || c.add(u)),
        ),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase ecc.: rete diretta

  // Navigazione: rete, con ripiego sulla copia in cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error())),
    );
    return;
  }

  // Dati del catalogo: dalla cache, aggiornati in background.
  if (url.pathname === "/workouts.json") {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  // Risorse statiche con hash: prima la cache.
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
