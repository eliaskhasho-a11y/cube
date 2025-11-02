self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open("gcube-v3_1").then(cache => cache.addAll([
    "/", "/index.html", "/style.css", "/app.js", "/solver_worker.js"
  ])).catch(()=>{}));
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)).catch(() => caches.match("/"))
  );
});