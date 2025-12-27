import { useEffect, useState } from "preact/hooks";
import {
    LucideGamepad2, LucideMedal, LucideTrophy, LucideUsers,
    LucideCode, LucideSettings, LucideLayoutDashboard, LucidePaintbrush,
    LucideCalendar, LucideSwords, LucidePanelLeftClose, LucidePanelLeftOpen,
    LucideLogOut, LucideMenu, LucideX
} from "lucide-preact";
import type { Session } from "@auth/core/types";

// --- CONFIGURACIÓN ---
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
        title: "Principal",
        links: [
            { label: "Dashboard", url: "/admin", icon: "home" },
            { label: "Usuarios", url: "/admin/usuarios", icon: "users" },
            { label: "CMS Páginas", url: "/admin/custom-pages", icon: "paintbrush" },
        ],
    },
    {
        title: "Competición",
        links: [
            { label: "Eventos", url: "/admin/eventos", icon: "calendar" },
            { label: "Torneos", url: "/admin/torneos", icon: "trophy" },
            { label: "MC Extremo", url: "/admin/mc-extremo", icon: "swords" },
            { label: "Streamer Wars", url: "/admin/guerra-streamers", icon: "gamepad" },
        ],
    },
    {
        title: "Sistema",
        links: [
            { label: "OAuth Apps", url: "/admin/developer/apps", icon: "code" },
            { label: "Twitch Events", url: "/admin/system/twitch-events", icon: "settings" }
        ]
    },
];

export default function AdminSidebar({ session, initialPathname }: { session: Session | null, initialPathname: string }) {
    // Estado Desktop Persistente
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('admin-sidebar-collapsed') === 'true';
        return false;
    });

    // Estado Móvil
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [pathname, setPathname] = useState(initialPathname);

    const toggleSidebar = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        localStorage.setItem('admin-sidebar-collapsed', String(newState));
    };

    const isActive = (url: string) => {
        if (url === "/admin") return pathname === "/admin";
        return pathname.startsWith(url);
    };

    useEffect(() => {
        const updatePath = () => {
            setPathname(window.location.pathname);
            setIsMobileOpen(false);
        };
        document.addEventListener('astro:page-load', updatePath);
        return () => document.removeEventListener('astro:page-load', updatePath);
    }, []);

    // Clases dinámicas de ancho
    // Móvil: w-72 (Fijo cuando está abierto)
    // Desktop: w-72 (Expandido) vs w-20 (Colapsado)
    const sidebarWidth = collapsed ? "md:w-20" : "md:w-72";

    return (
        <>
            {/* ==============================================
                1. MOBILE HEADER BAR (Solo visible en < md)
               ============================================== */}
            <div className="md:hidden fixed top-0 left-0 z-40 w-full h-16 flex items-center justify-between px-4 bg-[#09090b]/95 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 -ml-2 text-white/70 hover:text-white active:bg-white/10 rounded-lg transition-colors"
                    >
                        <LucideMenu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="size-6 rounded bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="font-anton text-white text-xs">S</span>
                        </div>
                        <span className="font-teko text-xl text-white tracking-wide pt-0.5">ADMIN</span>
                    </div>
                </div>
                {/* Avatar Móvil */}
                <img src={session?.user?.image || "/og.webp"} className="size-8 rounded-lg border border-white/10 bg-black" />
            </div>

            {/* ==============================================
                2. MOBILE BACKDROP (Fondo oscuro)
               ============================================== */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-[45] md:hidden backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* ==============================================
                3. SIDEBAR CONTAINER PRINCIPAL
               ============================================== */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 h-full flex flex-col
                    bg-[#09090b] border-r border-white/5 
                    transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                    
                    /* Lógica Móvil (Off-canvas) */
                    ${isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"}
                    
                    /* Lógica Desktop (Static & Collapsible) */
                    md:translate-x-0 md:static ${sidebarWidth}
                `}
            >
                {/* --- HEADER --- */}
                <div className={`
                    h-16 flex items-center shrink-0 border-b border-white/5 relative
                    ${collapsed ? "md:justify-center" : "justify-between px-5"}
                    px-5 /* Default padding mobile */
                `}>

                    {/* LOGO + TÍTULO (Oculto si colapsado en desktop) */}
                    <div className={`
                        flex items-center gap-3 overflow-hidden transition-all duration-300
                        ${collapsed ? "md:w-0 md:opacity-0 md:absolute" : "w-auto opacity-100"}
                    `}>

                        <span className="font-teko text-2xl text-white tracking-wide pt-1 whitespace-nowrap">
                            ADMIN PANEL
                        </span>
                    </div>

                    {/* BOTÓN COLAPSAR (Desktop) / CERRAR (Mobile) */}
                    <button
                        onClick={() => window.innerWidth < 768 ? setIsMobileOpen(false) : toggleSidebar()}
                        className={`
                            text-white/40 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors
                            ${collapsed ? "md:hidden" : "block"}
                        `}
                    >
                        <div className="md:hidden"><LucideX size={20} /></div>
                        <div className="hidden md:block"><LucidePanelLeftClose size={20} /></div>
                    </button>

                    {/* LOGO SOLO ICONO (Visible solo si colapsado en Desktop) */}
                    {collapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex size-10 rounded-xl hover:bg-white/5 items-center justify-center transition-colors group"
                            title="Expandir"
                        >
                            <LucidePanelLeftOpen size={24} className="text-white/40 group-hover:text-white" />
                        </button>
                    )}
                </div>

                {/* --- NAVIGATION SCROLL AREA --- */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-8 custom-scrollbar">
                    {categories.map((category, idx) => (
                        <div key={idx} className="w-full">

                            {/* TÍTULO DE SECCIÓN */}
                            <div className={`
                                px-5 mb-3 text-[10px] font-bold text-white/30 uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                                ${collapsed ? "md:opacity-0 md:h-0 md:mb-0 md:px-0" : "opacity-100"}
                            `}>
                                {category.title}
                            </div>

                            {/* LISTA DE LINKS */}
                            <ul className="space-y-1 px-3">
                                {category.links.map((link, linkIdx) => {
                                    const Icon = iconMap[link.icon as keyof typeof iconMap];
                                    const active = isActive(link.url);

                                    return (
                                        <li key={linkIdx}>
                                            <a
                                                href={link.url}
                                                onClick={() => setIsMobileOpen(false)}
                                                className={`
                                                    group relative flex items-center rounded-xl transition-all duration-200 min-h-[44px]
                                                    ${active
                                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                                        : "text-gray-400 hover:text-gray-100 hover:bg-white/5"
                                                    }
                                                    /* LAYOUT: Centrado si colapsado, Inicio si expandido */
                                                    ${collapsed ? "md:justify-center md:px-0" : "justify-start px-3 gap-3"}
                                                    justify-start px-3 gap-3 /* Mobile default */
                                                `}
                                                title={collapsed ? link.label : ""}
                                            >
                                                {/* ICONO */}
                                                <Icon
                                                    size={20}
                                                    className={`shrink-0 transition-transform ${!active && "group-hover:scale-110"}`}
                                                />

                                                {/* TEXTO (Oculto absolutamente si colapsado para evitar saltos) */}
                                                <span className={`
                                                    whitespace-nowrap font-medium text-sm pt-0.5 transition-all duration-300
                                                    ${collapsed ? "md:w-0 md:opacity-0 md:absolute" : "w-auto opacity-100"}
                                                `}>
                                                    {link.label}
                                                </span>

                                                {/* TOOLTIP FLOTANTE (Solo Desktop Hover cuando colapsado) */}
                                                {collapsed && (
                                                    <div className="hidden md:block absolute left-full ml-4 px-2.5 py-1.5 bg-white text-black text-xs font-bold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                                                        {link.label}
                                                        {/* Flechita del tooltip */}
                                                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white rotate-45"></div>
                                                    </div>
                                                )}
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
                    {collapsed ? (
                        // FOOTER COLAPSADO (Solo Avatar o Icono Salir)
                        <div className="flex flex-col gap-2 items-center">
                            <a href="/" className="size-10 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors" title="Salir">
                                <LucideLogOut size={20} />
                            </a>
                            <div className="size-8 rounded-lg bg-white/5 p-0.5 cursor-help" title={session?.user?.name}>
                                <img src={session?.user?.image || "/og.webp"} className="w-full h-full rounded-md object-cover" />
                            </div>
                        </div>
                    ) : (
                        // FOOTER EXPANDIDO
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                            <img src={session?.user?.image || "/og.webp"} className="size-9 rounded-lg object-cover bg-black shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold text-white truncate max-w-[110px]">{session?.user?.name}</span>
                                <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider">Admin</span>
                            </div>
                            <a href="/" className="ml-auto p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Salir de la Admin">
                                <LucideLogOut size={16} />
                            </a>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}