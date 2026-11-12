const CACHE_NAME = '369-journal-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const shell = await fetch('./')
    if (!shell.ok) throw new Error('The journal shell could not be cached.')
    await cache.put('./', shell.clone())
    const html = await shell.text()
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1])
    await cache.addAll(['./manifest.webmanifest', './icon.svg', ...assets])
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(caches.match(event.request).then((cached) => {
    if (cached) return cached
    return fetch(event.request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      }
      return response
    }).catch(() => caches.match('./'))
  }))
})
