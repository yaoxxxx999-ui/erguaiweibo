const cacheName = "erguai-weibo-v7";
const assets = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=3",
  "./styles.css?v=4",
  "./styles.css?v=5",
  "./app.js",
  "./app.js?v=3",
  "./app.js?v=4",
  "./app.js?v=5",
  "./app.js?v=6",
  "./app.js?v=7",
  "./manifest.webmanifest",
  "./icon.svg",
  "./weibos.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)));
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
