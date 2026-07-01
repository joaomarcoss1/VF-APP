self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (error) {
    data = { title: 'VF Nexus', body: event.data ? event.data.text() : 'Nova notificação' }
  }

  const title = data.title || 'VF Nexus'
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'vf-app-notificacao',
    data: {
      url: data.url || '/agendamentos',
    },
    vibrate: [100, 40, 100],
    requireInteraction: Boolean(data.requireInteraction),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/agendamentos'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
      return undefined
    }),
  )
})
