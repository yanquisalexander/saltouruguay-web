import { useEffect, useState, useCallback, useRef } from "preact/hooks";
import type { SaltogramPost } from "@/types/saltogram";
import PostCard from "./PostCard";
import CreatePostModal from "./CreatePostModal";
import NotesTray from "./notes/NotesTray";
import { toast } from "sonner";
import {
    LucideLoader2,
    LucideArrowUp,
    LucideFlame,
    LucideClock,
    LucideCamera,
    LucideImage,
    LucideSmile,
    LucideX,
} from "lucide-preact";
import type { Session } from "@auth/core/types";
import { useInterval } from "@/utils/client/hooks/useInterval";


interface SaltogramFeedProps {
    user?: Session['user'];
    targetUserId?: number;
}

export default function SaltogramFeed({ user, targetUserId }: SaltogramFeedProps) {
    const [posts, setPosts] = useState<SaltogramPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<"recent" | "popular">("recent");
    const [tag, setTag] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasNewPosts, setHasNewPosts] = useState(false);

    const observerRef = useRef<IntersectionObserver | null>(null);
    const lastPostRef = useRef<HTMLDivElement | null>(null);

    const fetchPosts = async (pageNum: number, reset = false) => {
        try {
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: "10",
                sort,
            });
            if (tag) params.append("tag", tag);
            if (targetUserId) params.append("userId", targetUserId.toString());

            const response = await fetch(`/api/saltogram/posts?${params.toString()}`);
            const data = await response.json();

            if (data.posts && data.posts.length > 0) {
                setPosts(prev => reset ? data.posts : [...prev, ...data.posts]);
                setHasMore(data.posts.length === 10);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            toast.error("Error al cargar el feed");
        } finally {
            setLoading(false);
        }
    };

    const checkForNewPosts = useCallback(async () => {
        const lastPostId = posts.reduce((max, p) => (p.id > max ? p.id : max), 0);
        if (lastPostId === 0) return;
        try {
            const response = await fetch(`/api/saltogram/poll?lastPostId=${lastPostId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.hasNewPosts) setHasNewPosts(true);
            }
        } catch { /* silencioso */ }
    }, [posts]);

    const shouldPoll = !targetUserId && !hasNewPosts && posts.length > 0;
    useInterval(checkForNewPosts, shouldPoll ? 30000 : null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tagParam = urlParams.get("tag");
        if (tagParam) setTag(tagParam);
    }, []);

    useEffect(() => {
        setLoading(true);
        setPosts([]);
        setHasMore(true);
        setPage(1);
        setHasNewPosts(false);
        fetchPosts(1, true);
    }, [sort, tag, targetUserId]);

    useEffect(() => {
        if (loading || !hasMore) return;
        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) setPage(prev => prev + 1);
        });
        if (lastPostRef.current) observerRef.current.observe(lastPostRef.current);
        return () => observerRef.current?.disconnect();
    }, [loading, hasMore]);

    useEffect(() => { if (page > 1) fetchPosts(page); }, [page]);

    const handleNewPost = (newPost: SaltogramPost) => {
        setPosts([newPost, ...posts]);
        setIsModalOpen(false);
        toast.success("¡Publicado con éxito!");
    };

    const handleLoadNewPosts = () => {
        setHasNewPosts(false);
        setPage(1);
        fetchPosts(1, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const openModal = () => setIsModalOpen(true);
        const btn = document.getElementById("create-post-btn");
        if (btn) {
            btn.addEventListener("click", openModal);
            return () => btn.removeEventListener("click", openModal);
        }
    }, []);

    return (
        <div className="relative space-y-4">

            {/* ── BANNER "nuevas publicaciones" ── M3 suggestion chip flotante */}
            {hasNewPosts && (
                <div className="sticky top-[4.5rem] z-30 flex justify-center pointer-events-none">
                    <button
                        onClick={handleLoadNewPosts}
                        className="
                            pointer-events-auto
                            flex items-center gap-2 px-5 py-2.5
                            bg-[#b3c8ff] text-[#001849]
                            text-sm font-semibold rounded-full
                            shadow-[0_4px_24px_rgba(0,0,0,0.5)]
                            hover:bg-[#c5d5ff] active:scale-95
                            transition-all duration-200
                            animate-in fade-in slide-in-from-top-2
                        "
                    >
                        <LucideArrowUp size={15} strokeWidth={2.5} />
                        Nuevas publicaciones
                    </button>
                </div>
            )}

            {/* ── CREAR PUBLICACIÓN ── M3 Card tonal */}
            {user && !targetUserId && (
                <div className="
                    bg-[#1a1b2e] rounded-[28px]
                    border border-[#2a2d4a]
                    p-4
                ">
                    <div className="flex gap-3 items-center">
                        <a href={`/saltogram/u/${user.username}`} className="shrink-0">
                            <img
                                src={user.image || `https://ui-avatars.com/api/?name=${user.name}`}
                                alt={user.name || "Usuario"}
                                className="w-10 h-10 rounded-full object-cover border-2 border-[#2a2d4a]"
                            />
                        </a>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="
                                flex-1 text-left text-sm text-[#8a8fa8]
                                bg-[#12131f] hover:bg-[#1e2038]
                                border border-[#2a2d4a]
                                rounded-full px-5 py-2.5
                                transition-colors duration-200
                            "
                        >
                            ¿Qué estás pensando, {user.name?.split(' ')[0]}?
                        </button>
                    </div>

                    {/* Acciones rápidas */}
                    <div className="flex items-center justify-around mt-3 pt-3 border-t border-[#2a2d4a]">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="
                                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                                text-[#8eca8e] hover:bg-[#8eca8e]/10
                                transition-all duration-200
                            "
                        >
                            <LucideImage size={18} strokeWidth={1.8} />
                            <span className="hidden sm:inline">Foto/Video</span>
                        </button>
                        <div className="w-px h-5 bg-[#2a2d4a]" />
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="
                                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                                text-[#f9c96a] hover:bg-[#f9c96a]/10
                                transition-all duration-200
                            "
                        >
                            <LucideSmile size={18} strokeWidth={1.8} />
                            <span className="hidden sm:inline">Sentimiento</span>
                        </button>
                        <div className="w-px h-5 bg-[#2a2d4a]" />
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="
                                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                                text-[#b3c8ff] hover:bg-[#b3c8ff]/10
                                transition-all duration-200
                            "
                        >
                            <LucideCamera size={18} strokeWidth={1.8} />
                            <span className="hidden sm:inline">Publicar</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ── NOTES TRAY ── */}
            {!targetUserId && <NotesTray user={user} />}

            {/* ── FILTROS ── */}
            <div className="flex flex-col gap-3">

                {/* Tag activo — M3 filter chip */}
                {tag && (
                    <div className="
                        flex items-center justify-between
                        px-4 py-3
                        bg-[#2a1f4a] border border-[#7c5cbf]/40
                        rounded-[20px]
                        animate-in fade-in duration-200
                    ">
                        <span className="text-sm text-[#c9b3ff] font-medium">
                            Filtrando por <span className="text-white font-semibold">#{tag}</span>
                        </span>
                        <button
                            onClick={() => {
                                setTag(null);
                                const url = new URL(window.location.href);
                                url.searchParams.delete("tag");
                                window.history.pushState({}, "", url);
                            }}
                            className="
                                flex items-center gap-1.5 text-xs text-[#c9b3ff]
                                bg-[#c9b3ff]/10 hover:bg-[#c9b3ff]/20
                                px-3 py-1.5 rounded-full
                                transition-colors duration-200
                            "
                        >
                            <LucideX size={12} />
                            Quitar
                        </button>
                    </div>
                )}

                {/* Sort toggle — M3 segmented button */}
                <div className="flex items-center justify-between">
                    <div className="
                        flex p-1 gap-1
                        bg-[#12131f] border border-[#2a2d4a]
                        rounded-full
                    ">
                        <button
                            onClick={() => setSort("recent")}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-full
                                text-sm font-semibold transition-all duration-200
                                ${sort === "recent"
                                    ? "bg-[#b3c8ff] text-[#001849]"
                                    : "text-[#6b7099] hover:text-white hover:bg-white/5"
                                }
                            `}
                        >
                            <LucideClock size={15} strokeWidth={sort === "recent" ? 2.5 : 1.8} />
                            Recientes
                        </button>
                        <button
                            onClick={() => setSort("popular")}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-full
                                text-sm font-semibold transition-all duration-200
                                ${sort === "popular"
                                    ? "bg-[#f9c96a] text-[#2a1800]"
                                    : "text-[#6b7099] hover:text-white hover:bg-white/5"
                                }
                            `}
                        >
                            <LucideFlame size={15} strokeWidth={sort === "popular" ? 2.5 : 1.8} />
                            Populares
                        </button>
                    </div>

                    {posts.length > 0 && (
                        <span className="hidden md:block text-xs text-[#6b7099] tabular-nums">
                            {posts.length} publicaciones
                        </span>
                    )}
                </div>

                {/* ── LISTA DE POSTS ── */}
                <div className="space-y-4">
                    {loading && posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <LucideLoader2 size={32} className="animate-spin text-[#b3c8ff]" strokeWidth={1.5} />
                            <p className="text-[#6b7099] text-sm animate-pulse">Sincronizando feed…</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="
                            flex flex-col items-center justify-center
                            py-20 px-6 text-center
                            bg-[#1a1b2e] border border-[#2a2d4a]
                            rounded-[28px]
                        ">
                            <div className="
                                w-16 h-16 rounded-[22px]
                                bg-[#b3c8ff]/10 border border-[#b3c8ff]/15
                                flex items-center justify-center mb-4
                            ">
                                <LucideCamera size={28} className="text-[#b3c8ff]/60" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Está muy tranquilo por aquí</h3>
                            <p className="text-sm text-[#6b7099] max-w-xs mx-auto mb-6">
                                Sé el primero en compartir algo con la comunidad.
                            </p>
                            <button
                                onClick={() => user ? setIsModalOpen(true) : toast.error("Debés iniciar sesión para publicar")}
                                className="
                                    px-6 py-2.5 rounded-full text-sm font-semibold
                                    bg-[#b3c8ff] text-[#001849]
                                    hover:bg-[#c5d5ff] active:scale-95
                                    transition-all duration-200
                                "
                            >
                                Crear publicación
                            </button>
                        </div>
                    ) : (
                        posts.map((post: SaltogramPost, index: number) => (
                            <div
                                key={post.id}
                                ref={index === posts.length - 1 ? lastPostRef : null}
                                className="animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
                            >
                                <PostCard post={post} currentUserId={user?.id} isAdmin={user?.isAdmin} />
                            </div>
                        ))
                    )}

                    {/* Spinner de carga incremental */}
                    {loading && posts.length > 0 && (
                        <div className="flex justify-center py-6">
                            <LucideLoader2 size={22} className="animate-spin text-[#6b7099]" strokeWidth={1.5} />
                        </div>
                    )}

                    {/* Fin del feed */}
                    {!hasMore && posts.length > 0 && (
                        <div className="flex items-center gap-3 py-6 px-4">
                            <div className="flex-1 h-px bg-[#2a2d4a]" />
                            <span className="text-xs text-[#6b7099] shrink-0">Fin del feed</span>
                            <div className="flex-1 h-px bg-[#2a2d4a]" />
                        </div>
                    )}
                </div>
            </div>

            {user && (
                <CreatePostModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onPostCreated={handleNewPost}
                    user={user}
                />
            )}
        </div>
    );
}