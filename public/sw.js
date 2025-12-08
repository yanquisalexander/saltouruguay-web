self.addEventListener('push', function (event) {
    if (event.data) {
        const payload = event.data.json();

        const options = {
            body: payload.body,
            icon: payload.icon || '/android-chrome-192x192.png',
            badge: '/favicon.png',
            data: payload.data || {},
            vibrate: [100, 50, 100],
            actions: [
                {
                    action: 'open',
                    title: 'Ver'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(payload.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const urlToOpen = event.notification.data.url || '/';

        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            }).then(function (windowClients) {
                // Check if there is already a window/tab open with the target URL
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If not, open a new window/tab
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});
