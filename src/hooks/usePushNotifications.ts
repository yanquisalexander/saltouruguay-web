import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);

            // Check if already subscribed
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    setIsSubscribed(!!subscription);
                });
            });
        }
    }, []);

    const subscribe = async () => {
        if (!isSupported) return;
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            const vapidKey = import.meta.env.PUBLIC_VAPID_KEY;
            if (!vapidKey) {
                console.warn("PUBLIC_VAPID_KEY not set");
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            // Send to server
            const keys = subscription.toJSON().keys;
            if (keys && keys.p256dh && keys.auth) {
                await actions.notifications.subscribe({
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: keys.p256dh,
                        auth: keys.auth
                    }
                });
                setPermission("granted");
                setIsSubscribed(true);
            }
        } catch (error) {
            console.error("Error subscribing to push notifications:", error);
            // If permission was denied during the process
            if (Notification.permission === 'denied') {
                setPermission('denied');
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        permission,
        isSupported,
        isSubscribed,
        loading,
        subscribe
    };
}
