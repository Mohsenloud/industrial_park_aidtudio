// Service Worker for Alborz Industrial Park Web Push Notifications & PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'سامانه شهرک صنعتی البرز',
    body: 'پیام جدیدی دریافت شد.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    url: '/',
    tag: 'general'
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      notificationData = { ...notificationData, ...parsed };
    }
  } catch (err) {
    if (event.data) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon.svg',
    badge: notificationData.badge || '/icon.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: notificationData.tag || 'alborz_push',
    renotify: true,
    dir: 'rtl',
    lang: 'fa',
    data: {
      url: notificationData.url || '/'
    },
    actions: [
      {
        action: 'open_url',
        title: 'مشاهده جزئیات'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open with the target URL, focus it
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
