import { useEffect, useState } from "preact/hooks";
import {
    LucideGamepad2,
    LucideMedal,
    LucideTrophy,
    LucideUsers,
    LucideCode,
    LucideSettings,
    LucideLayoutDashboard,
    LucidePaintbrush,
    LucideCalendar,
    LucideSwords,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideArrowLeft
} from "lucide-preact";
import type { Session } from "@auth/core/types";

const iconMap = {
    home: LucideLayoutDashboard,
    users: LucideUsers,
    trophy: LucideTrophy,
    medal: LucideMedal,
    gamepad: LucideGamepad2,
    code: LucideCode,
    settings: LucideSettings,
    paintbrush: LucidePaintbrush,
    calendar: LucideCalendar,
    swords: LucideSwords
};

const categories = [
    {
        title: "CORE",
        links: [
            { label: "Dashboard", url: "/admin", icon: "home" },
            { label: "Usuarios", url: "/admin/usuarios", icon: "users" },
            { label: "Páginas", url: "/admin/custom-pages", icon: "paintbrush" },
        ],
    },
    {
        title: "GESTIÓN",
        links: [
            { label: "Eventos", url: "/admin/eventos", icon: "calendar" },
            { label: "Torneos", url: "/admin/torneos", icon: "trophy" },
            { label: "MC Extremo", url: "/admin/mc-extremo", icon: "swords" },
            { label: "Streamer Wars", url: "/admin/guerra-streamers", icon: "gamepad" },
        ],
    },
    {
        title: "DEVELOPER",
        links: [
            { label: "OAuth Apps", url: "/admin/developer/apps", icon: "code" }
        ]
    },
    {
        title: "SISTEMA",
        links: [
            { label: "Twitch Events", url: "/admin/system/twitch-events", icon: "code" }
        ]
    },
];

export default function Sidebar({ session, initialPathname }: { session: Session | null, initialPathname: string }) {
    const [collapsed, setCollapsed] = useState(false);
    const [pathname, setPathname] = useState(initialPathname);

    const isActive = (url: string) => {
        if (url === "/admin") return pathname === "/admin";
        return pathname.startsWith(url);
    }

    useEffect(() => {
        const updatePath = () => setPathname(window.location.pathname);
        document.addEventListener('astro:page-load', updatePath);
        if (window.innerWidth < 1024) setCollapsed(true);
        return () => document.removeEventListener('astro:page-load', updatePath);
    }, []);

    return (
        <aside
            className={`
                fixed md:sticky top-0 left-0 z-50 h-screen 
                bg-[#09090b] border-r border-white/5 
                transition-all duration-300 ease-in-out flex flex-col
                ${collapsed ? "w-20" : "w-72"}
            `}
        >
            {/* --- HEADER --- */}
            <div className={`h-16 flex items-center border-b border-white/5 transition-all duration-300 ${collapsed ? "justify-center px-0" : "justify-between px-4"}`}>

                {/* Logo / Title Wrapper */}
                <div className={`flex items-center overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0 p-0" : "w-auto opacity-100 gap-3"}`}>
                    <div className="size-8 rounded bg-blue-600 flex items-center justify-center shrink-0">
                        <span className="font-anton text-white text-lg">A</span>
                    </div>
                    <span className="font-teko text-2xl text-white tracking-wide whitespace-nowrap">
                        ADMIN PANEL
                    </span>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    title={collapsed ? "Expandir" : "Colapsar"}
                >
                    {collapsed ? <LucidePanelLeftOpen size={20} /> : <LucidePanelLeftClose size={20} />}
                </button>
            </div>

            {/* --- NAVIGATION --- */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
                {categories.map((category, idx) => (
                    <div key={idx} className={`${collapsed ? "mb-4" : "mb-6"}`}>

                        {/* Category Title - Ocultar completamente margen y altura si colapsado */}
                        <div
                            className={`
                                text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-all duration-300 overflow-hidden whitespace-nowrap
                                ${collapsed ? "h-0 opacity-0 mb-0 px-0" : "h-auto opacity-100 mb-2 px-3"}
                            `}
                        >
                            {category.title}
                        </div>

                        {/* Links List */}
                        <ul className="space-y-1">
                            {category.links.map((link, linkIdx) => {
                                const Icon = iconMap[link.icon as keyof typeof iconMap];
                                const active = isActive(link.url);

                                return (
                                    <li key={linkIdx}>
                                        <a
                                            href={link.url}
                                            title={collapsed ? link.label : ""}
                                            className={`
                                                group flex items-center rounded-lg transition-all duration-200 py-2.5
                                                ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-3"}
                                                ${active
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                                }
                                            `}
                                        >
                                            {/* Icono - Mantener tamaño constante */}
                                            <div className="relative flex items-center justify-center shrink-0">
                                                <Icon
                                                    size={20}
                                                    className={`transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}
                                                />

                                                {/* Indicador de activo (Punto) solo visible colapsado */}
                                                {collapsed && active && (
                                                    <div className="absolute -right-2 top-0 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                                )}

                                                {/* Borde izquierdo indicador solo expandido */}
                                                {!collapsed && active && (
                                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full"></div>
                                                )}
                                            </div>

                                            {/* Texto - Ocultar suavemente */}
                                            <span
                                                className={`
                                                    text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300
                                                    ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}
                                                `}
                                            >
                                                {link.label}
                                            </span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* --- FOOTER --- */}
            <div className="p-3 border-t border-white/5 bg-[#09090b]">

                {/* Back to Site */}
                <a
                    href="/"
                    className={`
                        flex items-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors mb-2 py-2
                        ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-3"}
                    `}
                    title="Volver a la web"
                >
                    <LucideArrowLeft size={18} className="shrink-0" />
                    <span
                        className={`
                            text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300
                            ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}
                        `}
                    >
                        Volver a la Web
                    </span>
                </a>

                {/* User Card */}
                <div className={`
                    flex items-center rounded-xl bg-white/5 border border-white/5 overflow-hidden transition-all duration-300
                    ${collapsed ? "justify-center p-2 bg-transparent border-transparent" : "justify-start p-2 gap-3"}
                `}>
                    <div className="relative shrink-0">
                        <img
                            src={session?.user?.image || "/og.webp"}
                            alt="Admin"
                            className="size-9 rounded-lg object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 size-2.5 bg-green-500 border-2 border-[#09090b] rounded-full"></div>
                    </div>

                    <div className={`flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                        <span className="text-sm font-bold text-white truncate leading-tight">
                            {session?.user?.name}
                        </span>
                        <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider leading-tight">
                            Admin
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}