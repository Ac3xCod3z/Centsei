/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

// This config is injected by the build script
const firebaseConfig = __FIREBASE_CONFIG__;

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// receive background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, tag, url } = (payload?.data || {});
  self.registration.showNotification(title || 'Centsei', {
    body: body || 'You have a new reminder.',
    tag: tag,
    icon: '/CentseiLogo.png',
    badge: '/CentseiLogo.png',
    data: { url: url || '/' },
  });
});

// handle clicks → open/focus the app at the right date
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(targetUrl); return; }
      return self.clients.openWindow(targetUrl);
    })
  );
});
