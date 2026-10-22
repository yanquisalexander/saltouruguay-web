const DEFAULT_ICON = '/android-chrome-192x192.png';
const DEFAULT_TITLE = 'SaltoUruguay';

self.addEventListener('push', function (event) {
    let payload = {};

    if (event.data) {
        try {
            payload = event.data.json();
        } catch {
            payload = { body: event.data.text() };
        }
    }

    const data = payload.data || {};
    const options = {
        body: payload.body || '',
        icon: payload.icon || DEFAULT_ICON,
        image: payload.image,
        badge: '/favicon.png',
        data,
        vibrate: [100, 50, 100],
        tag: data.notificationId ? `notification-${data.notificationId}` : undefined,
        actions: [
            {
                action: 'open',
                title: 'Ver'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title || DEFAULT_TITLE, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action && event.action !== 'open') return;

    const target = event.notification.data?.url || '/';
    const urlToOpen = new URL(target, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (windowClients) {
            for (const client of windowClients) {
                if (new URL(client.url).origin !== new URL(urlToOpen).origin) continue;
                if ('focus' in client) {
                    if ('navigate' in client) {
                        client.navigate(urlToOpen).catch(() => {});
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
