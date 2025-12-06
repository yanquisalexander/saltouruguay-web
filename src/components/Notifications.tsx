import { useState, useEffect, useRef } from "preact/hooks";
import {
    LucideBell,
    LucideCheckCheck,
    LucideX,
    LucideInbox,
    LucideExternalLink,
    LucideMegaphone
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
    id: string;
    title: string;
    description: string;
    imageURL?: string;
    link: NotificationLink;
    tags: NotificationTag[];
    date?: string; // Opcional: para mostrar cuándo llegó
}

interface NotificationState {
    read: Notification[];
    unread: Notification[];
}

// --- MOCK DATA (Ejemplo) ---
const NOTIFICATIONS_DATA: Notification[] = [
    /* {
        id: "saltocraft-promo",
        title: "¡SaltoCraft III Extremo!",
        description: "Las inscripciones ya están abiertas. ¿Tienes lo necesario para sobrevivir?",
        imageURL: "/images/ads/mc-extremo.webp",
        link: { title: "Ver detalles", url: "/torneos" },
        tags: [{ type: "ads", title: "Torneo" }],
        date: "Hace 2 horas"
    } */
];

export const Notifications = () => {
    const [state, setState] = useState<NotificationState>({ read: [], unread: NOTIFICATIONS_DATA });
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Cargar estado inicial
    useEffect(() => {
        const storedReadIds = JSON.parse(localStorage.getItem("notifications-read-ids") || "[]");

        const read = NOTIFICATIONS_DATA.filter(n => storedReadIds.includes(n.id));
        const unread = NOTIFICATIONS_DATA.filter(n => !storedReadIds.includes(n.id));

        setState({ read, unread });
    }, []);

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

    const markAllAsRead = () => {
        if (state.unread.length === 0) return;

        const newRead = [...state.unread, ...state.read];
        setState({ read: newRead, unread: [] });

        // Guardamos solo IDs para ahorrar espacio
        const readIds = newRead.map(n => n.id);
        localStorage.setItem("notifications-read-ids", JSON.stringify(readIds));
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