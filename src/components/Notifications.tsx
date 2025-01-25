import { useState, useEffect, useRef } from "preact/hooks";

const notifications = [
    {
        id: "inscripciones-guerra-streamers",
        title: "¡Inscripciones abiertas para la Guerra de Streamers!",
        description: "¡Participa en la Guerra de Streamers y gana premios increíbles! ¿Estás listo para la batalla?",
        imageURL: "/images/ads/stream-wars.webp",
        link: { title: "Inscríbete", url: "/guerra-streamers/inscripcion" },
        tags: [{ type: "ads", title: "" }],
    },
    {
        id: "administrar-cuenta",
        title: '"Mi cuenta" ahora disponible',
        description: "Administra tu cuenta de forma más sencilla y rápida. ¡Descubre todas las novedades!",
        //imageURL: "/images/ads/stream-wars.webp",
        link: { title: "Mi Cuenta", url: "/usuario" },
        tags: [{ type: "ads", title: "" }],
    },


];

interface Notification {
    id: string;
    title: string;
    description: string;
    imageURL?: string;
    link: { title: string; url: string };
    tags: { type: string; title: string }[];
}

interface NotificationState {
    read: Notification[];
    unread: Notification[];
}

export const Notifications = () => {
    const [state, setState] = useState<NotificationState>({ read: [], unread: notifications });
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const handleToggle = () => setIsOpen(!isOpen);
    const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAllAsRead = () => {
        const updatedRead = [...state.read, ...state.unread];
        setState({ read: updatedRead, unread: [] });
        localStorage.setItem("notifications", JSON.stringify(updatedRead));
    };

    return (
        <section ref={ref} className="md:relative flex items-center">
            <button
                className="relative p-2 hover:bg-brand-gray/5 md:rounded-2xl border border-transparent hover:border-brand-gray/10 transition-all"
                onClick={handleToggle}
            >
                <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
                    <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
                </svg>
                {state.unread.length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-2">
                        {state.unread.length}
                    </span>
                )}
            </button>
            {isOpen && (
                <section className="animate-fade-in right-2 animate-duration-100 max-h-[60vh] overflow-y-scroll hidden-scroll absolute bg-[#0b1422] p-4 rounded-xl top-20 md:top-[calc(100%_+_.5rem)] md:-right-4 w-[calc(100%_-_1rem)] sm:w-[400px] z-50">
                    <h3 className="font-semibold text-lg pb-2 border-b border-line">Notificaciones</h3>
                    {state.unread.length > 0 ? (
                        <>
                            <h4 className="text-right text-xs text-white/60 py-2">No leídas</h4>
                            {state.unread.map((notification) => (
                                <a
                                    key={notification.id}
                                    href={notification.link.url}
                                    className="opacity-60 hover:opacity-80 block p-2 last:border-b-0 relative border-b border-line hover:bg-line/40 transition"
                                >
                                    <h5 className="font-semibold max-w-[26ch] text-balance">{notification.title}</h5>
                                    <p className="text-sm text-balance text-white/60">
                                        {notification.description}
                                    </p>
                                    {
                                        notification.imageURL && (
                                            <img
                                                src={notification.imageURL}
                                                alt={notification.title}
                                                style="mask-image: linear-gradient(to left, rgb(0, 0, 0), rgba(0, 0, 0, 0));"
                                                className="w-1/2 h-full rounded-md absolute top-0 right-0 opacity-40 -z-10"
                                            />
                                        )
                                    }

                                </a>
                            ))}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 mt-2">No tienes notificaciones</p>
                    )}
                    {state.read.length > 0 && (
                        <>
                            <h4 className="text-sm font-semibold mt-4">Leídas</h4>
                            {state.read.map((notification) => (
                                <a
                                    key={notification.id}
                                    href={notification.link.url}
                                    className="block p-2 text-gray-400 hover:opacity-80 transition"
                                >
                                    <h5 className="font-semibold">{notification.title}</h5>
                                    <p className="text-sm">{notification.description}</p>
                                </a>
                            ))}
                        </>
                    )}
                    <button
                        className="mt-4 text-sm text-blue-500 hover:underline"
                        onClick={markAllAsRead}
                    >
                        Marcar todas como leídas
                    </button>
                </section>
            )}
        </section>
    );
}
