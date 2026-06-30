// One-shot replacement for the old Workbox SW: drop all caches and unregister.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        clients.map((client) => {
          if ('navigate' in client) return client.navigate(client.url);
          return client.focus();
        })
      );
      await self.registration.unregister();
    })()
  );
});
