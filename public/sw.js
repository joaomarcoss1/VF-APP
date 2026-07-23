const CACHE_NAME = 'vf-nexus-v9-4-static'
const APP_SHELL = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']
const PRIVATE_PATHS = ['/api/', '/master/', '/dashboard', '/produtos', '/clientes', '/vendas', '/financeiro', '/estoque', '/relatorios']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('vf-nexus-') && key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]))
})

const isStaticAsset = (request) => ['image', 'font', 'style', 'script'].includes(request.destination)
const isPrivate = (url) => PRIVATE_PATHS.some((path) => url.pathname.startsWith(path)) || url.pathname.includes('supabase')

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isPrivate(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match('/offline')))
    return
  }

  if (isStaticAsset(request) || APP_SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      return cached || network
    }).catch(() => caches.match(request)))
  }
})

// A atualização só é aplicada após confirmação explícita da interface.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'VF_NEXUS_APPLY_UPDATE') self.skipWaiting()
})
