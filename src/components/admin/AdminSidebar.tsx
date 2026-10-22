import { useEffect, useState } from "preact/hooks";
import {
    LucideGamepad2, LucideMedal, LucideTrophy, LucideUsers,
    LucideCode, LucideSettings, LucideLayoutDashboard, LucidePaintbrush,
    LucideCalendar, LucideSwords, LucidePanelLeftClose, LucidePanelLeftOpen,
    LucideLogOut, LucideMenu, LucideX, LucideExternalLink,
    LucideBell, LucideMail, LucideTv, LucideCake,
} from "lucide-preact";
import type { Session } from "@auth/core/types";

// --- CONFIGURACIÓN DE ICONOS ---
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
    swords: LucideSwords,
    bell: LucideBell,
    mail: LucideMail,
    tv: LucideTv,
    cake: LucideCake,
};

const navigationGroups = [
    {
        title: "Principal",
        links: [
            { label: "Dashboard", url: "/admin", icon: "home" },
            { label: "Usuarios", url: "/admin/usuarios", icon: "users" },
            { label: "CMS Páginas", url: "/admin/custom-pages", icon: "paintbrush" },
            { label: "Notificaciones", url: "/admin/notificaciones", icon: "bell" },
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
        title: "Broadcast & Utilidades",
        links: [
            { label: "Email Manager", url: "/admin/email-manager", icon: "mail" },
            { label: "Overlay OBS", url: "/admin/overlay", icon: "tv" },
            { label: "Cumpleaños", url: "/admin/cumple", icon: "cake" },
        ],
    },
    {
        title: "Sistema & APIs",
        links: [
            { label: "OAuth Apps", url: "/admin/developer/apps", icon: "code" },
            { label: "Twitch Events", url: "/admin/system/twitch-events", icon: "settings" },
        ],
    },
];

export default function AdminSidebar({
    session,
    initialPathname,
}: {
    session: Session | null;
    initialPathname: string;
}) {
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("admin-sidebar-collapsed") === "true";
        }
        return false;
    });

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [pathname, setPathname] = useState(initialPathname);

    const toggleSidebar = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        localStorage.setItem("admin-sidebar-collapsed", String(newState));
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
        document.addEventListener("astro:page-load", updatePath);
        return () => document.removeEventListener("astro:page-load", updatePath);
    }, []);

    const sidebarWidth = collapsed ? "md:w-20" : "md:w-68";

    return (
        <>
            {/* Topbar móvil */}
            <div className="md:hidden fixed top-0 left-0 z-40 w-full h-16 flex items-center justify-between px-4 bg-[#08080c]/95 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 -ml-2 text-white/70 hover:text-white active:bg-white/10 rounded-xl transition-colors cursor-pointer"
                        aria-label="Abrir navegación"
                    >
                        <LucideMenu size={22} />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <img
                            src="/images/logo_salto.webp"
                            alt="SaltoUruguayServer"
                            className="size-8 object-scale-down shrink-0"
                        />
                        <div className="flex flex-col">
                            <span className="font-anton text-base text-white tracking-wide uppercase leading-none">
                                Salto Admin
                            </span>
                            <span className="text-[10px] font-rubik text-white/40 leading-none mt-0.5">
                                Panel de Control
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <img
                        src={session?.user?.image || "/favicon.svg"}
                        alt={session?.user?.name || "Admin"}
                        className="size-8 rounded-lg border border-white/15 bg-black/50 object-cover"
                    />
                </div>
            </div>

            {/* Backdrop para móvil */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity duration-200"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar principal */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 h-full flex flex-col
                    bg-[#08080c] border-r border-white/[0.08]
                    transition-[width,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                    ${isMobileOpen ? "translate-x-0 w-72 shadow-2xl shadow-black/80" : "-translate-x-full w-72"}
                    md:translate-x-0 md:static ${sidebarWidth}
                `}
            >
                {/* Header del sidebar */}
                <div
                    className={`
                        h-16 flex items-center shrink-0 border-b border-white/[0.08] relative px-4
                        ${collapsed ? "md:justify-center md:px-0" : "justify-between"}
                    `}
                >
                    <div
                        className={`
                            flex items-center gap-3 overflow-hidden transition-all duration-300
                            ${collapsed ? "md:w-0 md:opacity-0 md:absolute" : "w-auto opacity-100"}
                        `}
                    >
                        <div className="size-9 overflow-hidden shrink-0">
                            <img
                                src="/images/logo_salto.webp"
                                alt="SaltoUruguayServer"
                                className="size-full object-scale-down"
                            />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-anton text-lg text-white tracking-wide leading-none truncate">
                                SALTO ADMIN
                            </span>
                            <span className="text-[10px] font-rubik text-white/40 leading-none mt-1">
                                Panel de Control
                            </span>
                        </div>
                    </div>

                    {/* Botón de colapsar en Desktop / Cerrar en Mobile */}
                    <button
                        onClick={() => (window.innerWidth < 768 ? setIsMobileOpen(false) : toggleSidebar())}
                        className={`
                            text-white/50 hover:text-white hover:bg-white/[0.06] p-2 rounded-xl transition-all cursor-pointer
                            ${collapsed ? "md:hidden" : "block"}
                        `}
                        title={collapsed ? "Expandir menú" : "Colapsar menú"}
                    >
                        <div className="md:hidden"><LucideX size={20} /></div>
                        <div className="hidden md:block"><LucidePanelLeftClose size={18} /></div>
                    </button>

                    {/* Botón expandir cuando está colapsado en desktop */}
                    {collapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex size-10 rounded-xl hover:bg-violet-600/20 hover:border-violet-400/40 border border-transparent items-center justify-center transition-all group cursor-pointer"
                            title="Expandir menú"
                        >
                            <LucidePanelLeftOpen size={18} className="text-white/60 group-hover:text-violet-300" />
                        </button>
                    )}
                </div>

                {/* Área de Navegación con scroll fino */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
                    {navigationGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="w-full">
                            {/* Título de Grupo */}
                            <div
                                className={`
                                    px-4 mb-1.5 text-[10px] font-bold text-white/35 uppercase tracking-wider transition-all duration-300 whitespace-nowrap
                                    ${collapsed ? "md:opacity-0 md:h-0 md:mb-0 md:px-0" : "opacity-100"}
                                `}
                            >
                                {group.title}
                            </div>

                            {/* Enlaces */}
                            <ul className="space-y-0.5 px-2.5">
                                {group.links.map((link, linkIdx) => {
                                    const Icon = iconMap[link.icon as keyof typeof iconMap] || LucideLayoutDashboard;
                                    const active = isActive(link.url);

                                    return (
                                        <li key={linkIdx}>
                                            <a
                                                href={link.url}
                                                onClick={() => setIsMobileOpen(false)}
                                                className={`
                                                    group relative flex items-center rounded-xl transition-all duration-200 min-h-[40px]
                                                    ${active
                                                        ? "bg-violet-600/20 text-white font-medium border border-violet-500/30"
                                                        : "text-white/60 hover:text-white hover:bg-white/[0.05] border border-transparent"
                                                    }
                                                    ${collapsed ? "md:justify-center md:px-0" : "justify-start px-3 gap-3"}
                                                `}
                                                title={collapsed ? link.label : ""}
                                            >
                                                {/* Indicador de barra vertical activa */}
                                                {active && (
                                                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-violet-400 rounded-r-full"></span>
                                                )}

                                                <Icon
                                                    size={18}
                                                    className={`shrink-0 transition-transform ${active
                                                        ? "text-violet-300 scale-105"
                                                        : "text-white/50 group-hover:text-violet-300 group-hover:scale-105"
                                                        }`}
                                                />

                                                <span
                                                    className={`
                                                        whitespace-nowrap font-rubik text-sm transition-all duration-300
                                                        ${collapsed ? "md:w-0 md:opacity-0 md:absolute" : "w-auto opacity-100"}
                                                    `}
                                                >
                                                    {link.label}
                                                </span>

                                                {/* Tooltip flotante si está colapsado */}
                                                {collapsed && (
                                                    <div className="hidden md:block absolute left-full ml-3 px-3 py-1.5 bg-[#12121a] border border-white/15 text-white text-xs font-medium rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
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

                {/* Footer del sidebar */}
                <div className="p-3 border-t border-white/[0.08] bg-[#08080c]">
                    {collapsed ? (
                        <div className="flex flex-col gap-2 items-center">
                            <a
                                href="/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="size-9 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Ver sitio público"
                            >
                                <LucideExternalLink size={17} />
                            </a>
                            <a
                                href="/api/auth/signout"
                                className="size-9 flex items-center justify-center rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Cerrar sesión"
                            >
                                <LucideLogOut size={17} />
                            </a>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-2.5">
                                <img
                                    src={session?.user?.image || "/favicon.svg"}
                                    alt={session?.user?.name || "Admin"}
                                    className="size-8 rounded-lg object-cover bg-black/50 border border-white/15 shrink-0"
                                />
                                <div className="flex flex-col overflow-hidden min-w-0">
                                    <span className="text-xs font-semibold text-white truncate">
                                        {session?.user?.name || "Administrador"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
                                <a
                                    href="/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors"
                                >
                                    <LucideExternalLink size={12} />
                                    <span>Sitio</span>
                                </a>
                                <span className="w-px h-3 bg-white/10"></span>
                                <a
                                    href="/api/auth/signout"
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <LucideLogOut size={12} />
                                    <span>Salir</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
