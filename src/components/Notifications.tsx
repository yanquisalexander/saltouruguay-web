import { useState, useEffect, useRef } from "preact/hooks";
import { actions } from "astro:actions";
import {
    LucideBell,
    LucideCheckCheck,
    LucideX,
    LucideInbox,
    LucideExternalLink,
    LucideMegaphone,
    LucideRadio
} from "lucide-preact";

// --- TYPES ---
interface NotificationLink {
    title: string;
    url: string;
}

interface NotificationTag {
    type: "ads" | "info" | "alert" | "success";
    title: string;
}

interface Notification {
    id: string | number;
    title: string;
    description: string;
    imageURL?: string;
    link: NotificationLink;
    tags: NotificationTag[];
    date?: string;
    isDynamic?: boolean;
}

interface NotificationState {
    read: Notification[];
    unread: Notification[];
}

// --- MOCK DATA (Ejemplo) ---
const NOTIFICATIONS_DATA: Notification[] = [
    {
        id: "new-page-ui",
        title: "Acabamos de mejorar para ti",
        description: "Estamos trabajando en una nueva interfaz de usuario para mejorar tu experiencia en SaltoUruguayServer.",
        imageURL: "/og.webp",
        link: { title: "Descubre más", url: "#" },
        tags: [{ type: "info", title: "Novedad" }],
    }
];

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

export const Notifications = () => {
    const [state, setState] = useState<NotificationState>({ read: [], unread: [] });
    const [isOpen, setIsOpen] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [loadingPush, setLoadingPush] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Cargar estado inicial
    useEffect(() => {
        const loadNotifications = async () => {
            // 1. Load Static
            const storedReadIds = JSON.parse(localStorage.getItem("notifications-read-ids") || "[]");
            const staticRead = NOTIFICATIONS_DATA.filter(n => storedReadIds.includes(n.id));
            const staticUnread = NOTIFICATIONS_DATA.filter(n => !storedReadIds.includes(n.id));

            // 2. Load Dynamic
            let dynamicUnread: Notification[] = [];
            let dynamicRead: Notification[] = [];

            try {
                const { data, error } = await actions.notifications.get();
                if (data && data.notifications) {
                    const mapped = data.notifications.map((n: any) => ({
                        id: n.id,
                        title: n.title,
                        description: n.message,
                        imageURL: n.image,
                        link: { title: "Ver", url: n.link || "#" },
                        tags: [{ type: "info", title: n.type || "Info" }],
                        date: new Date(n.createdAt).toLocaleDateString(),
                        isDynamic: true,
                        read: n.read
                    }));

                    dynamicUnread = mapped.filter((n: any) => !n.read);
                    dynamicRead = mapped.filter((n: any) => n.read);
                }
            } catch (e) {
                console.error("Error loading dynamic notifications", e);
            }

            setState({
                read: [...staticRead, ...dynamicRead],
                unread: [...staticUnread, ...dynamicUnread]
            });
        };

        loadNotifications();
        checkPushSubscription();
    }, []);

    const checkPushSubscription = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setPushEnabled(!!subscription);
        }
    };

    const enablePushNotifications = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert("Push notifications not supported");
            return;
        }

        setLoadingPush(true);
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
                setPushEnabled(true);
            }
        } catch (e) {
            console.error("Error enabling push", e);
            alert("Error enabling notifications. Check console.");
        } finally {
            setLoadingPush(false);
        }
    };

    // Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAllAsRead = async () => {
        if (state.unread.length === 0) return;

        // Optimistic update
        const newRead = [...state.unread, ...state.read];
        setState({ read: newRead, unread: [] });

        // 1. Mark Static
        const staticIds = state.unread.filter(n => !n.isDynamic).map(n => n.id);
        const storedReadIds = JSON.parse(localStorage.getItem("notifications-read-ids") || "[]");
        localStorage.setItem("notifications-read-ids", JSON.stringify([...storedReadIds, ...staticIds]));

        // 2. Mark Dynamic
        const dynamicIds = state.unread.filter(n => n.isDynamic).map(n => n.id as number);
        if (dynamicIds.length > 0) {
            await actions.notifications.markRead({ notificationIds: dynamicIds });
        }
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div ref={ref} className="relative z-50">
            {/* --- TRIGGER BUTTON --- */}
            <button
                onClick={toggleOpen}
                className={`
                    relative p-2 rounded-xl transition-all duration-300
                    ${isOpen
                        ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }
                `}
                aria-label="Notificaciones"
            >
                <LucideBell size={20} className={state.unread.length > 0 ? 'animate-swing' : ''} />

                {state.unread.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-[#0a0a0a]"></span>
                    </span>
                )}
            </button>

            {/* --- DROPDOWN PANEL --- */}
            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 md:w-96 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5">

                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="font-anton text-lg tracking-wide text-white">Notificaciones</h3>
                            <div className="flex gap-3">
                                {!pushEnabled && (
                                    <button
                                        onClick={enablePushNotifications}
                                        disabled={loadingPush}
                                        className="text-[10px] uppercase font-bold tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                                        title="Activar notificaciones push"
                                    >
                                        <LucideRadio size={14} className={loadingPush ? "animate-spin" : ""} />
                                        {loadingPush ? "Activando..." : "Activar Push"}
                                    </button>
                                )}
                                {state.unread.length > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[10px] uppercase font-bold tracking-widest text-white/50 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                                        title="Marcar todas como leídas"
                                    >
                                        <LucideCheckCheck size={14} /> Marcar Leídas
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Body Scrollable */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">

                            {/* Estado Vacío */}
                            {state.unread.length === 0 && state.read.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                                    <div className="p-4 bg-white/5 rounded-full mb-3 text-white/20">
                                        <LucideInbox size={32} />
                                    </div>
                                    <p className="text-white/60 font-rubik text-sm">Estás al día.</p>
                                    <p className="text-white/30 text-xs mt-1">No hay nuevas alertas.</p>
                                </div>
                            )}

                            {/* Lista de No Leídas */}
                            {state.unread.length > 0 && (
                                <div className="py-2">
                                    <div className="px-4 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="size-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                        Nuevas ({state.unread.length})
                                    </div>
                                    {state.unread.map(notification => (
                                        <NotificationItem key={notification.id} data={notification} isRead={false} />
                                    ))}
                                </div>
                            )}

                            {/* Lista de Leídas */}
                            {state.read.length > 0 && (
                                <div className="py-2 border-t border-white/5 bg-black/20">
                                    <div className="px-4 py-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                        Anteriores
                                    </div>
                                    {state.read.map(notification => (
                                        <NotificationItem key={notification.id} data={notification} isRead={true} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer (Opcional) */}
                        {/* <div className="p-2 border-t border-white/5 text-center bg-black/40">
                            <a href="/notificaciones" className="text-xs text-white/40 hover:text-white transition-colors">Ver historial completo</a>
                        </div> */}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: Item Individual ---
const NotificationItem = ({ data, isRead }: { data: Notification, isRead: boolean }) => {
    return (
        <a
            href={data.link.url}
            className={`
                group relative block p-4 transition-all duration-300 border-l-2
                ${isRead
                    ? 'border-transparent hover:bg-white/5 opacity-60 hover:opacity-100'
                    : 'border-yellow-500 bg-white/[0.03] hover:bg-white/[0.07]'
                }
            `}
        >
            {/* Imagen de Fondo (Si existe) */}
            {data.imageURL && (
                <div className="absolute top-0 right-0 w-24 h-full overflow-hidden opacity-20 mask-image-l-fade pointer-events-none">
                    <img src={data.imageURL} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0a0a0a]"></div>
                </div>
            )}

            <div className="relative z-10 flex gap-3">
                {/* Icono Tipo */}
                <div className={`
                    mt-1 size-8 rounded-lg flex items-center justify-center shrink-0 border
                    ${isRead
                        ? 'bg-white/5 border-white/5 text-white/30'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }
                `}>
                    {data.tags[0]?.type === 'ads' ? <LucideMegaphone size={14} /> : <LucideBell size={14} />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className={`text-sm font-bold leading-tight ${isRead ? 'text-white/80' : 'text-white'}`}>
                            {data.title}
                        </h4>
                        {data.date && <span className="text-[9px] text-white/30 whitespace-nowrap">{data.date}</span>}
                    </div>

                    <p className="text-xs text-white/50 line-clamp-2 leading-relaxed font-rubik mb-2">
                        {data.description}
                    </p>

                    {/* Tags & Action */}
                    <div className="flex items-center gap-2">
                        {data.tags.map(tag => (
                            <span key={tag.title} className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/40 uppercase tracking-wider">
                                {tag.title || 'Info'}
                            </span>
                        ))}
                        <span className="text-[10px] text-yellow-500/80 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                            {data.link.title} <LucideExternalLink size={10} />
                        </span>
                    </div>
                </div>
            </div>
        </a>
    )
}