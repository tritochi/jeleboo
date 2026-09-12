// Adapted from augy-studios/pwa-template (MIT) — see README.md in this folder.
// Cache strategy unchanged from the original: it's the right strategy for a
// live-data app (network-first for API calls means a stale cached AQI number
// is never served as if it were current).

const CACHE = "jeleboo-offline-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico"
  // add the built CSS/JS bundle filenames here once the build step produces them —
  // Vite hashes filenames per build, so this list gets generated, not hand-written
];

/* -- Install: cache shell -- */

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
    .then(cache => cache.addAll(ASSETS))
    .then(() => self.skipWaiting())
  );
});

/* -- Activate: clean old caches -- */

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
    .then(keys =>
      Promise.all(
        keys
        .filter(k => k !== CACHE)
        .map(k => caches.delete(k))
      )
    )
    .then(() => self.clients.claim())
  );
});

/* -- Fetch: strategy per route -- */

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Backend API (readings, thresholds) - network-first.
  // A live AQI reading must never be silently served stale from cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Google Fonts, if used - cache-first (immutable)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // static assets - cache-first
  event.respondWith(cacheFirst(request));
});

/* -- Strategies -- */

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Offline or upstream down: tell the UI honestly rather than serving a
    // stale reading as if it were live. The frontend should fall back to
    // its own last-known cached value + "last updated" timestamp, not this.
    return new Response(
      JSON.stringify({
        success: false,
        error: 'You appear to be offline.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}
