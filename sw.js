// Southwest Edge Portal — Service Worker (network-first)
//
// This file must be deployed alongside index.html, at the same path referenced
// by index.html's registration call: navigator.serviceWorker.register('sw.js').
//
// The whole point of this file: NEVER let a stale cached copy of the app be
// served when a fresh one is available. Every request tries the network
// FIRST. The cache is only ever used as a fallback if the network genuinely
// fails (e.g., the device is offline) — never as a shortcut when online.
//
// CACHE_NAME is deliberately bumped so that installing this new service
// worker forces every old cache to be thrown out immediately, and every
// currently-open tab gets taken over right away rather than waiting for the
// user to close and reopen the app.

const CACHE_NAME = 'edge-portal-network-first-v3';

self.addEventListener('install', (event) => {
  // Activate this service worker immediately, without waiting for other
  // open tabs running an older version to close first.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Throw away every cache that isn't this version — guarantees no old,
      // stale cached files can ever be served again once this activates.
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      // Take control of every currently-open tab immediately, rather than
      // only affecting tabs opened after this point.
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle simple GET requests — anything else (POST, etc.) should
  // always just go straight to the network untouched.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        // Always try the network first. This is the entire fix: a "deploy"
        // should always actually be what a user sees the next time they load
        // the app, as long as they have any connection at all.
        const networkResponse = await fetch(event.request, { cache: 'no-store' });
        // Keep a copy for offline fallback, but never let this cached copy
        // be used while the network is actually reachable.
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        // Network genuinely failed (offline, etc.) — fall back to whatever
        // was last successfully cached, if anything.
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
