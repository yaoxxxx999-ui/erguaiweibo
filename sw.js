const cacheName = "erguai-weibo-v8";
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
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("/weibos.txt")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
