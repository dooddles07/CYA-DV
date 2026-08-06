/* Service worker: offline shell + push notifications. */

// __BUILD_ID__ is stamped by scripts/stamp-sw.mjs (npm run build's prebuild
// step) with the deploy's git SHA, so a new deploy gets a fresh cache name and
// activate's cleanup evicts the previous deploy's entries automatically —
// no more hand-bumping a literal and hoping nobody forgets.
const CACHE = "cya-__BUILD_ID__";
const OFFLINE_URL = "/offline.html";
const VERSE_URL = "/verse";
const VERSE_API = "/api/verse/today";

self.addEventListener("install", (event) => {
  event.waitUntil(
    // Precache the shell plus today's verse page and data so reading works offline.
    // addAll is atomic; if the verse fetch fails, precache today's verse next visit.
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png", VERSE_URL, VERSE_API]))
      .catch(() => caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"])))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first with cache refresh. Successful responses for the verse page and
// its data are stored so today's verse stays readable offline; navigations fall
// back to the cached page, then the offline shell. Other requests: browser default.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isVerseData = url.origin === self.location.origin && url.pathname === VERSE_API;
  const isStaticAsset = url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");

  if (isStaticAsset) {
    // Cache-first: filenames are content-hashed and immutable, so a cache hit
    // is always correct. Without this, the offline-cached page shell has no
    // JS/CSS to hydrate with and only ever renders static markup.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  if (request.mode !== "navigate" && !isVerseData) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match(OFFLINE_URL);
        return Response.error();
      })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "CYA Daily Verse";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Your verse for today is ready.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "cya-daily-verse",
      data: { url: payload.url || "/verse" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/verse";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
