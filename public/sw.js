const CACHE_NAME = 'vf-nexus-v9-2-3-stable';
const APP_SHELL = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('vf-nexus-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

function isStaticAsset(req) {
  return ['image', 'font', 'style', 'script'].includes(req.destination);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear páginas autenticadas/dinâmicas. Evita app piscando com HTML antigo.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline')));
    return;
  }

  if (isStaticAsset(req) || url.pathname === '/manifest.json') {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => cached)));
  }
});

self.addEventListener('message', (event) => {
  // Atualização manual apenas quando o usuário aceitar pelo banner.
  if (event.data?.type === 'VF_NEXUS_APPLY_UPDATE') self.skipWaiting();
});
