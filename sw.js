const CACHE = "mushaf-albait-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/db.js",
  "./data/quran.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./fonts/Amiri-Regular.ttf",
  "./fonts/Amiri-Bold.ttf",
  "./fonts/ArefRuqaa-Regular.ttf",
  "./fonts/ArefRuqaa-Bold.ttf",
  "./fonts/Tajawal-Regular.ttf",
  "./fonts/Tajawal-Medium.ttf",
  "./fonts/Tajawal-Bold.ttf"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./index.html")))
  );
});
