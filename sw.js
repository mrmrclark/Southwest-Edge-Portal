// Southwest Edge Portal — service worker
// Caches just the app shell (this file, the HTML, icons) so the app still opens
// if there's no connection. Live data calls (weather, news, logo lookups) always
// try the network first and are never served from this cache.
//
// IMPORTANT: this uses a NETWORK-FIRST strategy for the shell files — it always
// tries to fetch the latest version first, and only falls back to whatever's
// cached if there's genuinely no connection. An earlier version of this file
// did the opposite (cache-first), which meant updates could silently fail to
// show up even after a hard refresh. Fixed now.
const CACHE_NAME = 'swe-portal-shell-v2';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')));
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin || !isShellFile) {
    // Anything else (weather API, ORION feed, contact logo lookups, etc.) — let the
    // browser handle it normally, straight to the network, no caching involved.
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // offline — fall back to whatever we've cached
  );
});
