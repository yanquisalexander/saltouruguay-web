import { useEffect, useState } from "preact/hooks";
import {
    LucideGamepad2, LucideMedal, LucideTrophy, LucideUsers,
    LucideCode, LucideSettings, LucideLayoutDashboard, LucidePaintbrush,
    LucideCalendar, LucideSwords, LucidePanelLeftClose, LucidePanelLeftOpen,
    LucideLogOut, LucideMenu, LucideX, LucideExternalLink, LucideShieldCheck
} from "lucide-preact";
import type { Session } from "@auth/core/types";

// --- CONFIGURACIÓN DE ICONOS & CATEGORÍAS ---
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

    // Ancho dinámico para desktop
    const sidebarWidth = collapsed ? "md:w-20" : "md:w-72";

    return (
        <>
            {/* ==============================================
                1. MOBILE HEADER BAR (Solo visible en < md)
               ============================================== */}
            <div className="md:hidden fixed top-0 left-0 z-40 w-full h-16 flex items-center justify-between px-4 bg-[#08080a]/95 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 -ml-2 text-white/70 hover:text-white active:bg-white/10 rounded-xl transition-colors"
                        aria-label="Abrir menú"
                    >
                        <LucideMenu size={22} />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-900/30 border border-purple-400/30">
                            <span className="font-anton text-white text-sm">S</span>
                        </div>
                        <span className="font-anton text-lg text-white tracking-wide uppercase">Salto Admin</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <img
                        src={session?.user?.image || "/favicon.svg"}
                        alt={session?.user?.name || "Admin"}
                        className="size-8 rounded-lg border border-white/10 bg-black/50 object-cover"
                    />
                </div>
            </div>

            {/* ==============================================
                2. MOBILE BACKDROP (Fondo oscuro con Blur)
               ============================================== */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* ==============================================
                3. SIDEBAR CONTAINER PRINCIPAL
               ============================================== */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 h-full flex flex-col
                    bg-[#08080a] border-r border-white/10
                    transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                    
                    /* Lógica Móvil (Off-canvas) */
                    ${isMobileOpen ? "translate-x-0 w-72 shadow-2xl" : "-translate-x-full w-72"}
                    
                    /* Lógica Desktop (Static & Collapsible) */
                    md:translate-x-0 md:static ${sidebarWidth}
                `}
            >
                {/* --- HEADER SIDEBAR --- */}
                <div className={`
                    h-16 flex items-center shrink-0 border-b border-white/10 relative px-4
                    ${collapsed ? "md:justify-center md:px-0" : "justify-between"}
                `}>
                    {/* LOGO + BRANDING */}
                    <div className={`
                        flex items-center gap-3 overflow-hidden transition-all duration-300
                        ${collapsed ? "md:w-0 md:opacity-0 md:absolute" : "w-auto opacity-100"}
                    `}>
                        <div className="size-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-900/30 border border-purple-400/30 shrink-0">
                            <span className="font-anton text-white text-base">S</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-anton text-lg text-white tracking-wide leading-none truncate">
                                SALTO ADMIN
                            </span>
                            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-widest leading-none mt-1">
                                Control Panel
                            </span>
                        </div>
                    </div>

                    {/* BOTÓN COLAPSAR (Desktop) / CERRAR (Mobile) */}
                    <button
                        onClick={() => window.innerWidth < 768 ? setIsMobileOpen(false) : toggleSidebar()}
                        className={`
                            text-white/50 hover:text-white hover:bg-white/5 p-2 rounded-xl transition-all
                            ${collapsed ? "md:hidden" : "block"}
                        `}
                        title={collapsed ? "Expandir menú" : "Colapsar menú"}
                    >
                        <div className="md:hidden"><LucideX size={20} /></div>
                        <div className="hidden md:block"><LucidePanelLeftClose size={18} /></div>
                    </button>

                    {/* ICONO SOLO PARA VISTA COLAPSADA (Desktop) */}
                    {collapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex size-10 rounded-xl hover:bg-purple-600/20 hover:border-purple-400/40 border border-transparent items-center justify-center transition-all group"
                            title="Expandir menú"
                        >
                            <LucidePanelLeftOpen size={20} className="text-white/60 group-hover:text-purple-300" />
                        </button>
                    )}
                </div>

                {/* --- NAVIGATION SCROLL AREA --- */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                    {categories.map((category, idx) => (
                        <div key={idx} className="w-full">

                            {/* TÍTULO DE CATEGORÍA */}
                            <div className={`
                                px-4 mb-2 text-[10px] font-bold text-white/30 uppercase tracking-widest transition-all duration-300 whitespace-nowrap
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
                                                    group relative flex items-center rounded-xl transition-all duration-200 min-h-[42px] border
                                                    ${active
                                                        ? "bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white font-semibold shadow-lg shadow-purple-950/40 border-purple-400/40"
                                                        : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
                                                    }
                                                    /* LAYOUT: Centrado si colapsado en desktop */
                                                    ${collapsed ? "md:justify-center md:px-0" : "justify-start px-3 gap-3"}
                                                    justify-start px-3 gap-3 /* Mobile default */
                                                `}
                                                title={collapsed ? link.label : ""}
                                            >
                                                {/* ICONO */}
                                                <Icon
                                                    size={18}
                                                    className={`shrink-0 transition-transform ${active ? "text-white" : "text-white/50 group-hover:text-purple-300 group-hover:scale-110"}`}
                                                />

                                                {/* TEXTO */}
                                                <span className={`
                                                    whitespace-nowrap font-medium text-sm pt-0.5 transition-all duration-300
                                                    ${collapsed ? "md:w-0 md:opacity-0 md:absolute" : "w-auto opacity-100"}
                                                `}>
                                                    {link.label}
                                                </span>

                                                {/* TOOLTIP FLOTANTE PARA ESCRITORIO COLAPSADO */}
                                                {collapsed && (
                                                    <div className="hidden md:block absolute left-full ml-3 px-3 py-1.5 bg-[#18181b] border border-white/10 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                                                        {link.label}
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

                {/* --- FOOTER DEL SIDEBAR --- */}
                <div className="p-3 border-t border-white/10 bg-[#08080a]">
                    {collapsed ? (
                        // FOOTER COLAPSADO
                        <div className="flex flex-col gap-2 items-center">
                            <a
                                href="/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="size-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Ver sitio público"
                            >
                                <LucideExternalLink size={18} />
                            </a>
                            <a
                                href="/api/auth/signout"
                                className="size-9 flex items-center justify-center rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Cerrar sesión"
                            >
                                <LucideLogOut size={18} />
                            </a>
                        </div>
                    ) : (
                        // FOOTER EXPANDIDO
                        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                <img
                                    src={session?.user?.image || "/favicon.svg"}
                                    alt={session?.user?.name || "Admin"}
                                    className="size-9 rounded-lg object-cover bg-black/50 border border-white/10 shrink-0"
                                />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-bold text-white truncate max-w-[120px]">
                                        {session?.user?.name || "Administrador"}
                                    </span>
                                    <span className="text-[9px] text-purple-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                                        <LucideShieldCheck size={10} /> Admin
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 pt-1.5 border-t border-white/5">
                                <a
                                    href="/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-md transition-colors uppercase tracking-wider"
                                >
                                    <LucideExternalLink size={12} /> Sitio
                                </a>
                                <span className="w-px h-3 bg-white/10"></span>
                                <a
                                    href="/api/auth/signout"
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors uppercase tracking-wider"
                                >
                                    <LucideLogOut size={12} /> Salir
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}