import { FluentEmailAlert } from "@/icons/FluentEmailAlert";
import { useState, useEffect, useRef } from "preact/hooks";


const notifications: Notification[] = [
    /* {
        id: "saltocraft-iii-extremo",
        title: "Se viene SaltoCraft Extremo 3",
        description: "¡Prepárate para el desafío más extremo de SaltoCraft!",
        imageURL: "/images/ads/mc-extremo.webp",
        link: { title: "Inscríbete", url: "/mc-extremo/inscripcion" },
        tags: [{ type: "ads", title: "" }],
    }, */

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

    useEffect(() => {
        // Cargar estado desde localStorage
        const storedRead = localStorage.getItem("notifications-read");
        const read = storedRead ? JSON.parse(storedRead) : [];
        const unread = notifications.filter((n) => !read.find((r: Notification) => r.id === n.id));

        setState({ read, unread });
    }, []);

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    const markAllAsRead = () => {
        const updatedRead = [...state.read, ...state.unread];
        setState({ read: updatedRead, unread: [] });
        localStorage.setItem("notifications-read", JSON.stringify(updatedRead));
    };

    return (
        <section ref={ref} className="md:relative flex items-center">
            <button
                className="relative p-2 hover:bg-brand-gray/5 rounded-2xl border border-transparent hover:border-brand-gray/10 transition-all"
                onClick={handleToggle}
            >
                <FluentEmailAlert />

                {state.unread.length > 0 && (
                    <span className="absolute top-0 left-0 bg-gradient-to-br from-cyan-500 to-blue-800 text-white text-xs rounded-full px-2">
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
                                    className="opacity-80 hover:opacity-100 block p-2 last:border-b-0 relative border-b border-line hover:bg-line/40 transition"
                                >
                                    <h5 className="font-semibold max-w-[26ch] text-balance">{notification.title}</h5>
                                    <p className="text-sm text-balance text-white/60">{notification.description}</p>
                                    {notification.imageURL && (
                                        <img
                                            src={notification.imageURL}
                                            alt={notification.title}
                                            style="mask-image: linear-gradient(to left, rgb(0, 0, 0), rgba(0, 0, 0, 0));"
                                            className="w-1/2 h-full rounded-md absolute top-0 right-0 opacity-40 -z-10"
                                        />
                                    )}
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
                                    className="opacity-60 hover:opacity-100 block p-2 last:border-b-0 relative border-b border-line hover:bg-line/40 transition"
                                >
                                    <h5 className="font-semibold max-w-[26ch] text-balance">{notification.title}</h5>
                                    <p className="text-sm text-balance text-white/60">{notification.description}</p>
                                    {notification.imageURL && (
                                        <img
                                            src={notification.imageURL}
                                            alt={notification.title}
                                            style="mask-image: linear-gradient(to left, rgb(0, 0, 0), rgba(0, 0, 0, 0));"
                                            className="w-1/2 h-full rounded-md absolute top-0 right-0 opacity-40 -z-10"
                                        />
                                    )}
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
};
