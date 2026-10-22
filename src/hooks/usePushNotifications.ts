import { useState, useEffect, useCallback } from "preact/hooks";
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

export function usePushNotifications(enabled = true) {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    const syncSubscription = useCallback(async (subscription: PushSubscription | null) => {
        if (!subscription) {
            setIsSubscribed(false);
            return;
        }

        const keys = subscription.toJSON().keys;
        if (!keys?.p256dh || !keys?.auth) {
            setIsSubscribed(false);
            return;
        }

        try {
            await actions.notifications.subscribe({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: keys.p256dh,
                    auth: keys.auth
                }
            });
            setIsSubscribed(true);
        } catch (error) {
            console.error("Error syncing push subscription:", error);
            setIsSubscribed(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            setIsSupported(false);
            setIsSubscribed(false);
            return;
        }

        if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)) {
            return;
        }

        setIsSupported(true);
        setPermission(Notification.permission);

        let cancelled = false;

        (async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                const subscription = await registration.pushManager.getSubscription();
                if (!cancelled) {
                    await syncSubscription(subscription);
                }
            } catch (error) {
                console.error("Error checking push subscription:", error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, syncSubscription]);

    const subscribe = async () => {
        if (!enabled || !isSupported) return;
        setLoading(true);
        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);
            if (permissionResult !== 'granted') {
                return;
            }

            const vapidKey = import.meta.env.PUBLIC_VAPID_KEY;
            if (!vapidKey) {
                console.warn("PUBLIC_VAPID_KEY not set");
                return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');
            if (!registration.active) {
                await navigator.serviceWorker.ready;
            }

            const existing = await registration.pushManager.getSubscription();
            const subscription = existing ?? await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });

            await syncSubscription(subscription);
        } catch (error) {
            console.error("Error subscribing to push notifications:", error);
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
