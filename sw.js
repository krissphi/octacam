/**
 * sw.js — OctaCam Service Worker
 * Caches all static assets for offline use.
 * Strategy: Cache-First for static assets, Network-First for index.html.
 */

const CACHE_NAME = 'octacam-v22.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/favicon.svg',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/css/base.css',
  '/css/variables.css',
  '/css/components.css',
  '/css/viewport.css',
  '/css/sidebarDashboard.css',
  '/css/sidebarControls.css',
  '/css/responsive.css',
  '/js/main.js',
  '/js/state.js',
  '/js/camera.js',
  '/js/audio.js',
  '/js/devices.js',
  '/js/renderer.js',
  '/js/recorder.js',
  '/js/snapshot.js',
  '/js/chromaEngine.js',
  '/js/lutParser.js',
  '/js/ui.js',
  '/js/ui/uiPresets.js',
  '/js/ui/uiChromaKey.js',
  '/js/ui/uiHotkeys.js',
  '/js/ui/uiReset.js',
  '/assets/krissphi.png'
];

// Install: pre-cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.warn('[SW] Pre-cache failed (some assets may be missing):', err);
    })
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Cache-first for static assets, Network-first for HTML
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, external CDN, and chrome-extension requests
  if (request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin.split('//')[1])) return;

  // Network-first for HTML (always get freshest version)
  if (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for all other static assets (CSS, JS, images)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      });
    })
  );
});
