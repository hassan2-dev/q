const CACHE = "mushaf-albait-v4";
const AUDIO_CACHE = "mushaf-audio-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/db.js",
  "./data/quran.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./fonts/AmiriQuran-Regular.ttf",
  "./fonts/Amiri-Regular.ttf",
  "./fonts/Amiri-Bold.ttf",
  "./fonts/ArefRuqaa-Regular.ttf",
  "./fonts/ArefRuqaa-Bold.ttf",
  "./fonts/Tajawal-Regular.ttf",
  "./fonts/Tajawal-Medium.ttf",
  "./fonts/Tajawal-Bold.ttf"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE && key !== AUDIO_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Offline surah audio saved via Cache API (opaque OK)
  if (url.hostname === "cdn.islamic.network") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(AUDIO_CACHE);
        const cached = await cache.match(event.request.url);
        try {
          const fresh = await fetch(event.request);
          if (fresh && (fresh.ok || fresh.type === "opaque")) return fresh;
        } catch {
          /* use cache */
        }
        if (cached) return cached;
        return Response.error();
      })()
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/audio/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && event.request.method === "GET") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./index.html")))
  );
});
