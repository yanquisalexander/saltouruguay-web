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
import { useInterval } from "@/utils/client/hooks/useInterval";


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

    // Contadores para Badges
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const base = useMemo(() => normalizePath(basePath), [basePath]);

    // --- LÓGICA DE POLLING OPTIMIZADA ---

    // Función de ejecución única (stateless)
    const handleGlobalPoll = useCallback(async () => {
        if (!user) return;

        try {
            // Llamamos a la action optimizada (Promise.all backend)
            const { data, error } = await actions.saltogram.poll({});

            if (error) {
                console.error("Poll error:", error);
                return;
            }

            if (data) {
                setUnreadMessagesCount(data.unreadMessages);
                setUnreadNotificationsCount(data.unreadNotifications);

                // Nota: friendRequestsState es un array local manejado por la UI y Widgets.
                // Si quisieras sincronizarlo estrictamente con el servidor, deberías recargar la lista
                // si data.friendRequests !== friendRequestsState.length
            }
        } catch (error) {
            // Fallo silencioso en background
            console.error(error);
        }
    }, [user]);

    // Intervalo controlado: 60 segundos si hay usuario logueado.
    // Esto evita el bucle infinito y reduce costos serverless.
    useInterval(handleGlobalPoll, user ? 60000 : null);

    // --- FIN LÓGICA POLLING ---

    // Calculo de mensajes no leídos (combina local con servidor)
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
        } catch (err) {
            console.error(err);
            toast.error("No pudimos cargar tus mensajes");
        } finally {
            setLoadingConversations(false);
        }
    }, [user]);

    // Search Logic
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
                if (isMounted) {
                    setSearchResults(data?.users ?? []);
                }
            } catch (err) {
                if (isMounted) {
                    setSearchResults([]);
                }
            } finally {
                if (isMounted) setSearchLoading(false);
            }
        }, 250);
        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [searchQuery]);

    useEffect(() => {
        if (activeView === "direct") {
            loadConversations();
        }
    }, [activeView, loadConversations]);

    // Focus input when mobile search opens
    useEffect(() => {
        if (mobileSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [mobileSearchOpen]);

    const navItems = useMemo(() => (
        [
            { id: "home" as const, label: "Inicio", icon: LucideHome, path: "/saltogram" },
            { id: "explore" as const, label: "Explorar", icon: LucideCompass, path: "/saltogram/explore" },
            { id: "direct" as const, label: "Mensajes", icon: LucideSend, badge: unreadMessages, path: "/saltogram/direct" },
            { id: "requests" as const, label: "Solicitudes", icon: LucideUsers, badge: friendRequestsState.length, path: "/saltogram/requests" },
            { id: "profile" as const, label: "Perfil", icon: LucideUserCircle, disabled: !user, path: user ? `/saltogram/u/${user.username}` : "#" },
        ]
    ), [friendRequestsState.length, unreadMessages, user]);

    const handleNavClick = (item: typeof navItems[0]) => {
        if (item.id === "profile" && !user) {
            toast.info("Iniciá sesión para ver tu perfil");
            return;
        }
        route(item.path);
    };

    const handleRouteChange = (e: RouterOnChangeArgs) => {
        const current = parseRoute(e.url);
        setActiveView(current.view);
    };

    const renderSearchResults = () => {
        if (!searchOpen && !mobileSearchOpen) return null;
        if (searchQuery.length < 2) return null;

        return (
            <div className={`${mobileSearchOpen ? 'relative w-full' : 'absolute mt-2 w-full'} bg-[#0c0c0f]/95 border border-white/10 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-40`}>
                {searchLoading ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-white/60 text-sm">
                        <LucideLoader2 size={16} className="animate-spin" />
                        Buscando...
                    </div>
                ) : (
                    searchResults.length > 0 ? (
                        searchResults.map((result) => (
                            <button
                                key={result.id}
                                onClick={() => {
                                    setSearchOpen(false);
                                    setMobileSearchOpen(false);
                                    setSearchQuery("");
                                    route(`/saltogram/u/${result.username}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0"
                            >
                                <img
                                    src={result.avatar || `https://ui-avatars.com/api/?name=${result.displayName}`}
                                    className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                    alt={result.displayName}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-semibold truncate">{result.displayName}</p>
                                    <p className="text-xs text-white/40 truncate">@{result.username}</p>
                                </div>
                                <LucideChevronRight size={16} className="text-white/30" />
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-white/40 text-sm text-center">
                            No se encontraron resultados
                        </div>
                    )
                )}
            </div>
        );
    };

    return (
        <div className="w-full relative">
            <header className="sticky top-4 z-30 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 shadow-2xl transition-all duration-300">
                {!mobileSearchOpen ? (
                    <>
                        <div className="flex items-center gap-3 shrink-0">
                            <a href="/" data-astro-reload className="text-white/60 hover:text-white transition-colors p-1" aria-label="Volver al sitio principal" title="Volver al sitio principal">
                                <LucideArrowLeft size={20} />
                            </a>
                            <div className="hidden sm:block">
                                <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 leading-none mb-1">Saltogram</p>
                                <h1 className="text-xl font-anton text-white leading-none">Comunidad</h1>
                            </div>
                            <div className="sm:hidden">
                                <h1 className="text-xl font-anton text-white">Saltogram</h1>
                            </div>
                        </div>

                        {/* Desktop Search Bar */}
                        <div className="flex-1 max-w-xl relative hidden sm:block">
                            <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                            <input
                                value={searchQuery}
                                onChange={(event) => {
                                    setSearchQuery((event.target as HTMLInputElement).value);
                                    setSearchOpen(true);
                                }}
                                onFocus={() => setSearchOpen(true)}
                                placeholder="Buscar perfiles o etiquetas"
                                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all focus:bg-white/10"
                            />
                            {renderSearchResults()}
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Mobile Search Button */}
                            <button
                                onClick={() => setMobileSearchOpen(true)}
                                className="sm:hidden p-2.5 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <LucideSearch size={18} />
                            </button>

                            <button
                                onClick={() => route("/saltogram/direct")}
                                className={`p-2.5 rounded-full border transition-colors relative ${activeView === "direct" ? "bg-white text-black border-white" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"}`}
                                title="Mensajes"
                            >
                                <LucideSend size={18} />
                                {unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-[#0c0c0f]">
                                        {unreadMessages}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => route("/saltogram/requests")}
                                className={`p-2.5 rounded-full border transition-colors relative ${activeView === "requests" ? "bg-white text-black border-white" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"}`}
                                title="Solicitudes"
                            >
                                <LucideUsers size={18} />
                                {friendRequestsState.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-[#0c0c0f]">
                                        {friendRequestsState.length}
                                    </span>
                                )}
                            </button>

                            <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>

                            <Notifications unreadCount={unreadNotificationsCount} />
                        </div>
                    </>
                ) : (
                    /* Mobile Expanded Search Bar */
                    <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative flex-1">
                            <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                onInput={(event) => setSearchQuery((event.target as HTMLInputElement).value)}
                                placeholder="Buscar..."
                                className="w-full bg-white/10 border border-white/20 rounded-full py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                                >
                                    <LucideX size={14} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setMobileSearchOpen(false);
                                setSearchQuery("");
                            }}
                            className="text-sm font-medium text-white/60 hover:text-white px-2"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </header>

            {/* Mobile Search Results Overlay */}
            {mobileSearchOpen && searchQuery.length >= 2 && (
                <div className="fixed inset-x-4 top-[88px] z-20 sm:hidden">
                    {renderSearchResults()}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px] gap-6 mt-6">
                <aside className="hidden lg:flex flex-col gap-4 sticky top-24 h-fit">
                    <nav className="bg-white/5 rounded-3xl border border-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Principal</p>
                        <ul className="space-y-1">
                            {navItems.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleNavClick(item)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-medium transition ${activeView === item.id
                                            ? "bg-white text-black"
                                            : item.disabled
                                                ? "text-white/30"
                                                : "text-white/70 hover:bg-white/10"
                                            }`}
                                        disabled={item.disabled}
                                    >
                                        <item.icon size={16} />
                                        <span>{item.label}</span>
                                        {item.badge && item.badge > 0 && (
                                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {user && (
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-4 flex items-center gap-3">
                            <img
                                src={user.image || `https://ui-avatars.com/api/?name=${user.name}`}
                                alt={user.name ?? "Usuario"}
                                className="w-12 h-12 rounded-2xl border border-white/10 object-cover"
                            />
                            <div className="flex-1">
                                <p className="text-xs text-white/40">Conectado</p>
                                <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
                                <button
                                    onClick={() => route(`/saltogram/u/${user.username}`)}
                                    className="text-xs text-white/60 hover:text-white flex items-center gap-1"
                                >
                                    Ver perfil <LucideChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white/5 rounded-3xl border border-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Tendencias</p>
                        <ul className="space-y-2">
                            {trendingTags.map((tag) => (
                                <li key={tag.tag}>
                                    <a
                                        href={`${base}?tag=${tag.tag.replace("#", "")}`}
                                        className="flex items-center justify-between text-sm text-white/70 hover:text-white"
                                    >
                                        <span>{tag.tag}</span>
                                        <span className="text-xs text-white/40">{tag.count}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                <Router onChange={handleRouteChange}>
                    <FeedView path="/saltogram" view="home" user={user} />
                    <FeedView path="/saltogram/explore" view="explore" user={user} />
                    <ProfileView path="/saltogram/u/:username" user={user} />
                    <ProfileView path="/saltogram/profile" user={user} />
                    <PostView path="/saltogram/post/:postId" user={user} initialPost={initialPost} />
                    <DirectView path="/saltogram/direct" user={user} conversations={conversations} loadingConversations={loadingConversations} loadConversations={loadConversations} />
                    <ChatView path="/saltogram/direct/:partnerId" user={user} />
                    <RequestsView path="/saltogram/requests" friendRequestsState={friendRequestsState} setFriendRequestsState={setFriendRequestsState} />
                </Router>

                <aside className="hidden xl:flex flex-col gap-4 sticky top-24 h-fit">
                    <div className="bg-white/5 rounded-3xl border border-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Actividad</p>
                        <h3 className="text-lg font-anton text-white mb-4">Resumen</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                    <LucideSparkles size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-white/40">Destacados</p>
                                    <p className="text-sm text-white font-semibold">{stats.likes} reacciones</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-2xl bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                                    <LucideBookmark size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-white/40">Entradas</p>
                                    <p className="text-sm text-white font-semibold">{stats.posts} publicados</p>
                                </div>
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

            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-md md:hidden z-40">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl px-4 py-2 flex items-center justify-between">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item)}
                            className={`flex flex-col items-center flex-1 gap-1 text-[11px] ${activeView === item.id ? "text-white" : "text-white/40"}`}
                            disabled={item.disabled}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}