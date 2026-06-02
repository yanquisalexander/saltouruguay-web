import { useCallback, useEffect, useMemo, useState, useRef } from "preact/hooks";
import { Router, route, type RouterOnChangeArgs } from "preact-router";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { toast } from "sonner";
import {
    LucideCompass,
    LucideHome,
    LucideSearch,
    LucideSend,
    LucideUserCircle,
    LucideUsers,
    LucideSparkles,
    LucideChevronRight,
    LucideLoader2,
    LucideBookmark,
    LucideArrowLeft,
    LucideX,
    LucideBell,
    LucideZap,
} from "lucide-preact";
import { Notifications } from "@/components/Notifications";
import type { SaltogramPost, FriendRequest, FriendRequestState, SuggestedUser, TrendingTag, ConversationPreview } from "@/types/saltogram";

import DirectView from "./views/DirectView";
import ChatView from "./views/ChatView";
import RequestsView from "./views/RequestsView";
import FeedView from "./views/FeedView";
import ProfileView from "./views/ProfileView";
import PostView from "./views/PostView";
import FriendRequestsWidget from "./FriendRequestsWidget";
import SuggestedUsersWidget from "./SuggestedUsersWidget";
import { useCoordinatedPoll } from "@/utils/client/useCoordinatedPoll";


type ActiveView = "home" | "explore" | "direct" | "chat" | "requests" | "profile" | "post";

interface SaltogramAppProps {
    user?: Session["user"];
    stats: { posts: number; likes: number };
    trendingTags: TrendingTag[];
    friendRequests: FriendRequest[];
    suggestedUsers: SuggestedUser[];
    initialRoute: string;
    basePath: string;
    initialPost?: SaltogramPost | null;
}

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

const parseRoute = (path: string): { view: ActiveView; username?: string; postId?: number; partnerId?: string } => {
    const clean = path.split("?")[0];
    const segments = clean.split("/").filter(Boolean);
    const saltogramIndex = segments.indexOf("saltogram");
    const internal = saltogramIndex === -1 ? segments : segments.slice(saltogramIndex + 1);

    if (internal.length === 0) return { view: "home" };

    const [first, second] = internal;

    if (first === "direct") {
        if (second) return { view: "chat", partnerId: second };
        return { view: "direct" };
    }
    if (first === "explore" || first === "explorar") return { view: "explore" };
    if (first === "requests" || first === "solicitudes") return { view: "requests" };
    if (first === "post" && second) {
        const postId = Number(second);
        return { view: "post", postId: Number.isNaN(postId) ? undefined : postId };
    }
    if (first === "u" && second) {
        return { view: "profile", username: second };
    }
    if (first === "profile") return { view: "profile" };

    return { view: "home" };
};

/**
 * Badge pill reutilizable — estilo M3 Expressive
 */
function Badge({ count, color = "blue" }: { count: number; color?: "blue" | "red" | "amber" }) {
    if (count <= 0) return null;
    const colors: Record<string, string> = {
        blue: "bg-[#b3c8ff] text-[#001849]",
        red: "bg-[#ffb4ab] text-[#690005]",
        amber: "bg-[#ffddb3] text-[#4a1900]",
    };
    return (
        <span
            className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 text-[11px] font-bold flex items-center justify-center rounded-full ${colors[color]}`}
        >
            {count > 99 ? "99+" : count}
        </span>
    );
}

/**
 * NavItem para la sidebar — M3 NavigationDrawerItem
 */
function SideNavItem({
    item,
    isActive,
    onClick,
}: {
    item: { id: string; label: string; icon: any; badge?: number; disabled?: boolean };
    isActive: boolean;
    onClick: () => void;
}) {
    const Icon = item.icon;
    return (
        <li>
            <button
                onClick={onClick}
                disabled={item.disabled}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium
                    transition-all duration-200 relative
                    ${isActive
                        ? "bg-[#b3c8ff] text-[#001849]"
                        : item.disabled
                            ? "text-white/25 cursor-not-allowed"
                            : "text-white/70 hover:bg-white/8 hover:text-white active:scale-[0.98]"
                    }
                `}
            >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && item.badge > 0 && (
                    <span className={`
                        text-xs px-2.5 py-0.5 rounded-full font-semibold
                        ${isActive ? "bg-[#001849]/20 text-[#001849]" : "bg-[#b3c8ff]/15 text-[#b3c8ff]"}
                    `}>
                        {item.badge}
                    </span>
                )}
            </button>
        </li>
    );
}

/**
 * Botón de acción flotante del header — M3 IconButton tonal
 */
function HeaderIconBtn({
    icon: Icon,
    onClick,
    active,
    badge,
    badgeColor,
    label,
}: {
    icon: any;
    onClick: () => void;
    active?: boolean;
    badge?: number;
    badgeColor?: "blue" | "red";
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`
                relative p-2.5 rounded-full transition-all duration-200
                ${active
                    ? "bg-[#b3c8ff] text-[#001849]"
                    : "bg-white/8 text-white/70 hover:bg-white/14 hover:text-white active:scale-[0.95]"
                }
            `}
        >
            <Icon size={20} strokeWidth={1.8} />
            {badge !== undefined && <Badge count={badge} color={badgeColor ?? "blue"} />}
        </button>
    );
}

export default function SaltogramApp({
    user,
    stats,
    trendingTags,
    friendRequests,
    suggestedUsers,
    initialRoute,
    basePath,
    initialPost,
}: SaltogramAppProps) {
    const parsed = useMemo(() => parseRoute(initialRoute), [initialRoute]);
    const [activeView, setActiveView] = useState<ActiveView>(parsed.view);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [friendRequestsState, setFriendRequestsState] = useState<FriendRequestState[]>(
        friendRequests.map(r => ({ ...r, createdAt: new Date(r.createdAt) }))
    );
    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const base = useMemo(() => normalizePath(basePath), [basePath]);

    // Global poll coordinado entre pestañas via BroadcastChannel
    const globalPollEnabled = user && activeView !== "chat" && activeView !== "post" && activeView !== "profile";
    useCoordinatedPoll({
        pollFn: async () => {
            if (!user) return null;
            const { data, error } = await actions.saltogram.poll({});
            return error || !data ? null : data as Record<string, unknown>;
        },
        onResult: (data) => {
            setUnreadMessagesCount(data.unreadMessages as number);
            setUnreadNotificationsCount(data.unreadNotifications as number);
        },
        intervalMs: 60000,
        channelName: "saltogram-poll",
        enabled: globalPollEnabled,
    });

    const unreadMessages = useMemo(
        () => {
            const fromConversations = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
            return Math.max(fromConversations, unreadMessagesCount);
        },
        [conversations, unreadMessagesCount]
    );

    const loadConversations = useCallback(async () => {
        if (!user) return;
        setLoadingConversations(true);
        try {
            const { data, error } = await actions.messages.getConversations();
            if (error) throw new Error(error.message);
            setConversations(data?.conversations ?? []);
        } catch {
            toast.error("No pudimos cargar tus mensajes");
        } finally {
            setLoadingConversations(false);
        }
    }, [user]);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        let isMounted = true;
        const timeout = window.setTimeout(async () => {
            try {
                setSearchLoading(true);
                const { data, error } = await actions.saltogram.searchUsers({ query: searchQuery });
                if (error) throw new Error(error.message);
                if (isMounted) setSearchResults(data?.users ?? []);
            } catch {
                if (isMounted) setSearchResults([]);
            } finally {
                if (isMounted) setSearchLoading(false);
            }
        }, 250);
        return () => { isMounted = false; clearTimeout(timeout); };
    }, [searchQuery]);

    useEffect(() => {
        if (activeView === "direct") loadConversations();
    }, [activeView, loadConversations]);

    useEffect(() => {
        if (mobileSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [mobileSearchOpen]);

    const navItems = useMemo(() => ([
        { id: "home" as const, label: "Inicio", icon: LucideHome, path: "/saltogram" },
        { id: "explore" as const, label: "Explorar", icon: LucideCompass, path: "/saltogram/explore" },
        { id: "direct" as const, label: "Mensajes", icon: LucideSend, badge: unreadMessages, path: "/saltogram/direct" },
        { id: "requests" as const, label: "Solicitudes", icon: LucideUsers, badge: friendRequestsState.length, path: "/saltogram/requests" },
        { id: "profile" as const, label: "Perfil", icon: LucideUserCircle, disabled: !user, path: user ? `/saltogram/u/${user.username}` : "#" },
    ]), [friendRequestsState.length, unreadMessages, user]);

    const handleNavClick = (item: typeof navItems[0]) => {
        if (item.id === "profile" && !user) {
            toast.info("Iniciá sesión para ver tu perfil");
            return;
        }
        route(item.path);
    };

    const handleRouteChange = (e: RouterOnChangeArgs) => {
        setActiveView(parseRoute(e.url).view);
    };

    /** Dropdown de resultados de búsqueda */
    const SearchResultsDropdown = ({ mobile = false }: { mobile?: boolean }) => {
        if (searchQuery.length < 2) return null;

        return (
            <div className={`
                ${mobile ? "relative w-full mt-2" : "absolute top-full left-0 right-0 mt-2"}
                bg-[#1a1b2e] border border-white/10 rounded-[28px] shadow-2xl
                max-h-72 overflow-y-auto z-50 overflow-hidden
            `}>
                {searchLoading ? (
                    <div className="flex items-center gap-3 px-5 py-4 text-white/50 text-sm">
                        <LucideLoader2 size={16} className="animate-spin" />
                        Buscando…
                    </div>
                ) : searchResults.length > 0 ? (
                    searchResults.map((result) => (
                        <button
                            key={result.id}
                            onClick={() => {
                                setSearchOpen(false);
                                setMobileSearchOpen(false);
                                setSearchQuery("");
                                route(`/saltogram/u/${result.username}`);
                            }}
                            className="
                                w-full flex items-center gap-3 px-5 py-3.5
                                hover:bg-white/6 text-left transition-colors
                                border-b border-white/6 last:border-0
                                active:bg-white/10
                            "
                        >
                            <img
                                src={result.avatar || `https://ui-avatars.com/api/?name=${result.displayName}`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-[#b3c8ff]/30"
                                alt={result.displayName}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-semibold truncate">{result.displayName}</p>
                                <p className="text-xs text-white/40 truncate">@{result.username}</p>
                            </div>
                            <LucideChevronRight size={16} className="text-white/25 shrink-0" />
                        </button>
                    ))
                ) : (
                    <div className="px-5 py-4 text-white/40 text-sm text-center">
                        Sin resultados para "{searchQuery}"
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full relative">
            {/* ===================== HEADER ===================== */}
            {/*
             * M3 Expressive: "Top App Bar" adaptado.
             * Superficie con color tonal primario oscuro, forma de contenedor redondeado.
             */}
            <header className="
                sticky top-3 z-30
                bg-[#0f1124]/90 backdrop-blur-2xl
                border border-white/8
                rounded-[32px]
                px-4 py-2.5
                flex items-center justify-between gap-3
                shadow-[0_4px_32px_rgba(0,0,0,0.4)]
                transition-all duration-300
            ">
                {!mobileSearchOpen ? (
                    <>
                        {/* Logo / Branding */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <a
                                href="/"
                                data-astro-reload
                                className="
                                    p-2.5 rounded-full text-white/60
                                    hover:bg-white/8 hover:text-white
                                    transition-all duration-200
                                "
                                aria-label="Volver al sitio principal"
                            >
                                <LucideArrowLeft size={20} strokeWidth={1.8} />
                            </a>

                            <div className="hidden sm:flex items-center gap-2">
                                {/* Icono tonal M3 */}
                                <div className="w-9 h-9 rounded-[14px] bg-[#b3c8ff]/15 flex items-center justify-center">
                                    <LucideZap size={18} className="text-[#b3c8ff]" strokeWidth={2} />
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase tracking-[0.45em] text-white/35 leading-none mb-0.5">Social</p>
                                    <h1 className="text-[17px] font-bold text-white leading-none tracking-tight">Saltogram</h1>
                                </div>
                            </div>
                            <div className="sm:hidden">
                                <div className="w-9 h-9 rounded-[14px] bg-[#b3c8ff]/15 flex items-center justify-center">
                                    <LucideZap size={18} className="text-[#b3c8ff]" strokeWidth={2} />
                                </div>
                            </div>
                        </div>

                        {/* Barra de búsqueda Desktop — M3 SearchBar */}
                        <div className="flex-1 max-w-lg relative hidden sm:block">
                            <div className="relative">
                                <LucideSearch
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                                    size={16}
                                    strokeWidth={1.8}
                                />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery((e.target as HTMLInputElement).value);
                                        setSearchOpen(true);
                                    }}
                                    onFocus={() => setSearchOpen(true)}
                                    placeholder="Buscar perfiles o etiquetas…"
                                    className="
                                        w-full bg-white/6 border border-white/8
                                        rounded-full py-2.5 pl-10 pr-10
                                        text-sm text-white placeholder:text-white/35
                                        focus:outline-hidden focus:bg-white/10 focus:border-[#b3c8ff]/40
                                        focus:ring-2 focus:ring-[#b3c8ff]/20
                                        transition-all duration-200
                                    "
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white p-0.5"
                                    >
                                        <LucideX size={14} />
                                    </button>
                                )}
                            </div>
                            {searchOpen && <SearchResultsDropdown />}
                        </div>

                        {/* Acciones del header */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Botón búsqueda móvil */}
                            <button
                                onClick={() => setMobileSearchOpen(true)}
                                className="sm:hidden p-2.5 rounded-full bg-white/6 text-white/60 hover:bg-white/12 hover:text-white transition-all duration-200"
                            >
                                <LucideSearch size={19} strokeWidth={1.8} />
                            </button>

                            <HeaderIconBtn
                                icon={LucideSend}
                                onClick={() => route("/saltogram/direct")}
                                active={activeView === "direct"}
                                badge={unreadMessages}
                                badgeColor="blue"
                                label="Mensajes"
                            />

                            <HeaderIconBtn
                                icon={LucideUsers}
                                onClick={() => route("/saltogram/requests")}
                                active={activeView === "requests"}
                                badge={friendRequestsState.length}
                                badgeColor="red"
                                label="Solicitudes"
                            />

                            <div className="w-px h-7 bg-white/10 mx-0.5 hidden sm:block" />

                            <Notifications unreadCount={unreadNotificationsCount} />

                            {/* Avatar del usuario */}
                            {user && (
                                <button
                                    onClick={() => route(`/saltogram/u/${user.username}`)}
                                    className="ml-1 relative group"
                                    title="Ver mi perfil"
                                >
                                    <img
                                        src={user.image || `https://ui-avatars.com/api/?name=${user.name}`}
                                        alt={user.name ?? "Usuario"}
                                        className="
                                            w-9 h-9 rounded-full object-cover
                                            border-2 border-transparent
                                            group-hover:border-[#b3c8ff]/60
                                            transition-all duration-200
                                        "
                                    />
                                    {/* Indicador de estado activo */}
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#69ffa0] rounded-full border-2 border-[#0f1124]" />
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    /* Búsqueda móvil expandida */
                    <div className="flex items-center w-full gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="relative flex-1">
                            <LucideSearch
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
                                size={16}
                                strokeWidth={1.8}
                            />
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                                placeholder="Buscar…"
                                className="
                                    w-full bg-white/8 border border-[#b3c8ff]/30
                                    rounded-full py-2.5 pl-10 pr-10
                                    text-sm text-white placeholder:text-white/35
                                    focus:outline-hidden focus:ring-2 focus:ring-[#b3c8ff]/30
                                    transition-all
                                "
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white"
                                >
                                    <LucideX size={14} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); }}
                            className="text-sm font-medium text-[#b3c8ff] hover:text-white px-1 transition-colors shrink-0"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </header>

            {/* Resultados búsqueda móvil — overlay */}
            {mobileSearchOpen && searchQuery.length >= 2 && (
                <div className="fixed inset-x-4 top-22 z-20 sm:hidden">
                    <SearchResultsDropdown mobile />
                </div>
            )}

            {/* ===================== LAYOUT PRINCIPAL ===================== */}
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_300px] gap-5 mt-5">

                {/* ---- SIDEBAR IZQUIERDA (M3 Navigation Drawer) ---- */}
                <aside className="hidden lg:flex flex-col gap-3 sticky top-20 h-fit">

                    {/* Navigation rail */}
                    <nav className="
                        bg-[#0f1124]/80 backdrop-blur-xl
                        rounded-[28px] border border-white/8
                        p-3
                    ">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-white/30 px-4 mb-2 mt-1">Navegación</p>
                        <ul className="space-y-0.5">
                            {navItems.map((item) => (
                                <SideNavItem
                                    key={item.id}
                                    item={item}
                                    isActive={activeView === item.id}
                                    onClick={() => handleNavClick(item)}
                                />
                            ))}
                        </ul>
                    </nav>

                    {/* Tarjeta de usuario — M3 Card tonal */}
                    {user && (
                        <div className="
                            bg-[#b3c8ff]/8 rounded-[28px] border border-[#b3c8ff]/12
                            p-4 flex items-center gap-3
                        ">
                            <div className="relative shrink-0">
                                <img
                                    src={user.image || `https://ui-avatars.com/api/?name=${user.name}`}
                                    alt={user.name ?? "Usuario"}
                                    className="w-11 h-11 rounded-[18px] border-2 border-[#b3c8ff]/25 object-cover"
                                />
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#69ffa0] rounded-full border-2 border-[#0f1124]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-[#b3c8ff]/60">Conectado como</p>
                                <p className="text-sm font-semibold text-white leading-tight truncate">{user.name}</p>
                                <button
                                    onClick={() => route(`/saltogram/u/${user.username}`)}
                                    className="text-xs text-[#b3c8ff]/70 hover:text-[#b3c8ff] flex items-center gap-0.5 transition-colors mt-0.5"
                                >
                                    Ver perfil <LucideChevronRight size={11} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tendencias — M3 Card outlined */}
                    <div className="
                        bg-white/3 rounded-[28px] border border-white/7
                        p-4
                    ">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-white/30 mb-3">Tendencias</p>
                        <ul className="space-y-1">
                            {trendingTags.map((tag, idx) => (
                                <li key={tag.tag}>
                                    <a
                                        href={`${base}?tag=${tag.tag.replace("#", "")}`}
                                        className="
                                            flex items-center justify-between
                                            px-3 py-2 rounded-full text-sm
                                            text-white/60 hover:text-white hover:bg-white/6
                                            transition-all duration-150
                                        "
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[10px] text-white/20 font-mono w-4">{idx + 1}</span>
                                            <span className="text-[#b3c8ff]/80 font-medium">{tag.tag}</span>
                                        </div>
                                        <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                                            {tag.count}
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* ---- CONTENIDO PRINCIPAL ---- */}
                <main>
                    <Router onChange={handleRouteChange}>
                        <FeedView path="/saltogram" view="home" user={user} />
                        <FeedView path="/saltogram/explore" view="explore" user={user} />
                        <ProfileView path="/saltogram/u/:username" user={user} />
                        <ProfileView path="/saltogram/profile" user={user} />
                        <PostView path="/saltogram/post/:postId" user={user} initialPost={initialPost} />
                        <DirectView
                            path="/saltogram/direct"
                            user={user}
                            conversations={conversations}
                            loadingConversations={loadingConversations}
                            loadConversations={loadConversations}
                        />
                        <ChatView path="/saltogram/direct/:partnerId" user={user} />
                        <RequestsView
                            path="/saltogram/requests"
                            friendRequestsState={friendRequestsState}
                            setFriendRequestsState={setFriendRequestsState}
                        />
                    </Router>
                </main>

                {/* ---- SIDEBAR DERECHA ---- */}
                <aside className="hidden xl:flex flex-col gap-3 sticky top-20 h-fit">

                    {/* Resumen de actividad — M3 Card elevado */}
                    <div className="
                        bg-[#0f1124]/80 backdrop-blur-xl rounded-[28px]
                        border border-white/8 p-5
                    ">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-white/30 mb-1">Actividad</p>
                        <h3 className="text-base font-bold text-white mb-4 tracking-tight">Tu resumen</h3>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Stat card — M3 tonal container */}
                            <div className="
                                bg-[#b3c8ff]/10 rounded-[20px] p-3.5
                                border border-[#b3c8ff]/12
                            ">
                                <div className="w-8 h-8 rounded-full bg-[#b3c8ff]/15 flex items-center justify-center mb-2">
                                    <LucideSparkles size={15} className="text-[#b3c8ff]" strokeWidth={2} />
                                </div>
                                <p className="text-2xl font-bold text-white leading-none">{stats.likes}</p>
                                <p className="text-xs text-white/45 mt-0.5">reacciones</p>
                            </div>

                            <div className="
                                bg-[#ffddb3]/8 rounded-[20px] p-3.5
                                border border-[#ffddb3]/10
                            ">
                                <div className="w-8 h-8 rounded-full bg-[#ffddb3]/12 flex items-center justify-center mb-2">
                                    <LucideBookmark size={15} className="text-[#ffddb3]" strokeWidth={2} />
                                </div>
                                <p className="text-2xl font-bold text-white leading-none">{stats.posts}</p>
                                <p className="text-xs text-white/45 mt-0.5">publicaciones</p>
                            </div>
                        </div>
                    </div>

                    <FriendRequestsWidget
                        initialRequests={friendRequestsState}
                        onRequestsChange={setFriendRequestsState}
                    />

                    <SuggestedUsersWidget users={suggestedUsers} />
                </aside>
            </div>

            {/* ===================== BOTTOM NAV MÓVIL (M3 Navigation Bar) ===================== */}
            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[420px] md:hidden z-40">
                <div className="
                    bg-[#0f1124]/95 backdrop-blur-2xl
                    border border-white/10
                    rounded-[32px] px-2 py-2
                    flex items-center justify-around
                    shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                ">
                    {navItems.map((item) => {
                        const isActive = activeView === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item)}
                                disabled={item.disabled}
                                className={`
                                    flex flex-col items-center gap-1 flex-1 py-1.5 px-2
                                    rounded-[20px] transition-all duration-200
                                    ${isActive
                                        ? "text-[#001849]"
                                        : item.disabled
                                            ? "text-white/20"
                                            : "text-white/45 hover:text-white/70"
                                    }
                                `}
                            >
                                {/* Pill indicador activo */}
                                <div className={`
                                    relative flex items-center justify-center
                                    h-8 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    ${isActive
                                        ? "bg-[#b3c8ff] rounded-full px-5"
                                        : "px-2"
                                    }
                                `}>
                                    <Icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                        className={isActive ? "text-[#001849]" : ""}
                                    />
                                    {item.badge && item.badge > 0 && !isActive && (
                                        <Badge count={item.badge} color={item.id === "requests" ? "red" : "blue"} />
                                    )}
                                </div>
                                <span className={`
                                    text-[10px] font-medium leading-none
                                    transition-all duration-200
                                    ${isActive ? "text-[#b3c8ff]" : ""}
                                `}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Espaciado bottom para no tapar contenido con la nav */}
            <div className="h-20 md:hidden" />
        </div>
    );
}