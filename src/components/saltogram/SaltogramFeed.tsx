import { useEffect, useState, useCallback, useRef } from "preact/hooks";
import type { SaltogramPost } from "@/types/saltogram";
import PostCard from "./PostCard";
import CreatePostModal from "./CreatePostModal";
import { toast } from "sonner";
import {
    LucideLoader2,
    LucideArrowUp,
    LucideFilter,
    LucideFlame,
    LucideClock,
    LucideCamera
} from "lucide-preact";
import type { Session } from "@auth/core/types";

interface SaltogramFeedProps {
    user?: Session['user'];
}

export default function SaltogramFeed({ user }: SaltogramFeedProps) {
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
    const pollingRef = useRef<number | null>(null);

    // --- DATA FETCHING (Sin cambios en lógica, solo limpieza) ---
    const fetchPosts = async (pageNum: number, reset = false) => {
        try {
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: "10",
                sort,
            });
            if (tag) params.append("tag", tag);

            const response = await fetch(`/api/saltogram/posts?${params.toString()}`);
            const data = await response.json();
            if (data.posts && data.posts.length > 0) {
                setPosts(prev => reset ? data.posts : [...prev, ...data.posts]);
                setHasMore(data.posts.length === 10);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar el feed");
        } finally {
            setLoading(false);
        }
    };

    const startPolling = useCallback(() => {
        if (posts.length === 0) return;
        const poll = async () => {
            try {
                const lastPostId = posts[0]?.id || 0;
                const response = await fetch(`/api/saltogram/poll?lastPostId=${lastPostId}`);
                const data = await response.json();
                if (data.hasNewPosts) setHasNewPosts(true);
                pollingRef.current = window.setTimeout(poll, 10000); // Polling más lento (10s) para no saturar
            } catch (error) {
                pollingRef.current = window.setTimeout(poll, 15000);
            }
        };
        poll();
    }, [posts]);

    useEffect(() => {
        // Read tag from URL
        const urlParams = new URLSearchParams(window.location.search);
        const tagParam = urlParams.get("tag");
        if (tagParam) setTag(tagParam);
    }, []);

    useEffect(() => { fetchPosts(1, true); }, [sort, tag]);
    useEffect(() => { startPolling(); return () => { if (pollingRef.current) clearTimeout(pollingRef.current); }; }, [startPolling]);

    // Infinite Scroll
    useEffect(() => {
        if (loading || !hasMore) return;
        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) setPage(prev => prev + 1);
        });
        if (lastPostRef.current) observerRef.current.observe(lastPostRef.current);
        return () => observerRef.current?.disconnect();
    }, [loading, hasMore]);

    useEffect(() => { if (page > 1) fetchPosts(page); }, [page]);

    // --- HANDLERS ---
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

    // --- RENDER ---
    return (
        <div className="relative space-y-8">

            {/* NEW POSTS TOAST (Floating Pill) */}
            {hasNewPosts && (
                <div className="sticky top-24 z-30 flex justify-center animate-bounce-in">
                    <button
                        onClick={handleLoadNewPosts}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-xl shadow-blue-900/30 transition-transform hover:scale-105 active:scale-95 border border-blue-400/50 backdrop-blur-md"
                    >
                        <LucideArrowUp size={16} />
                        <span className="text-sm uppercase tracking-wide">Nuevas Publicaciones</span>
                    </button>
                </div>
            )}

            {/* FILTROS (Segmented Control) */}
            <div className="flex flex-col gap-4">
                {tag && (
                    <div className="flex items-center justify-between p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl animate-fade-in">
                        <div className="flex items-center gap-2 text-purple-300">
                            <LucideFilter size={18} />
                            <span className="font-bold">Filtrando por: <span className="text-white">#{tag}</span></span>
                        </div>
                        <button
                            onClick={() => {
                                setTag(null);
                                const url = new URL(window.location.href);
                                url.searchParams.delete("tag");
                                window.history.pushState({}, "", url);
                            }}
                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Limpiar filtro
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="inline-flex p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setSort("recent")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${sort === "recent"
                                ? "bg-purple-600 text-white shadow-lg"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <LucideClock size={16} /> Recientes
                        </button>
                        <button
                            onClick={() => setSort("popular")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${sort === "popular"
                                ? "bg-yellow-500 text-black shadow-lg"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <LucideFlame size={16} /> Populares
                        </button>
                    </div>

                    <div className="hidden md:flex text-xs text-white/30 font-mono items-center gap-2">
                        <LucideFilter size={12} /> {posts.length} resultados
                    </div>
                </div>

                {/* FEED CONTENT */}
                <div className="space-y-6">
                    {loading && posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <LucideLoader2 class="animate-spin-clockwise animate-iteration-count-infinite text-purple-500" size={40} />
                            <p className="text-white/50 font-rubik animate-pulse">Sincronizando feed...</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-[#0a0a0a]/60 border border-white/5 rounded-3xl">
                            <div className="p-4 bg-white/5 rounded-full mb-4 text-white/20">
                                <LucideCamera size={48} />
                            </div>
                            <h3 className="text-2xl font-anton text-white uppercase tracking-wide mb-2">Está muy tranquilo por aquí</h3>
                            <p className="text-white/50 max-w-sm mx-auto mb-6">
                                Sé el primero en compartir algo épico con la comunidad.
                            </p>
                            <button
                                onClick={() => user ? setIsModalOpen(true) : toast.error("Debes iniciar sesión para publicar")}
                                className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Crear Publicación
                            </button>
                        </div>
                    ) : (
                        posts.map((post: SaltogramPost, index: number) => (
                            <div
                                key={post.id}
                                ref={index === posts.length - 1 ? lastPostRef : null}
                                className="animate-fade-in-up"
                                style={{ animationDelay: `${index * 50}ms` }} // Stagger effect
                            >
                                <PostCard post={post} currentUserId={user?.id} isAdmin={user?.isAdmin} />
                            </div>
                        ))
                    )}

                    {loading && posts.length > 0 && (
                        <div className="flex justify-center py-8">
                            <LucideLoader2 className="animate-spin text-white/30" size={24} />
                        </div>
                    )}
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
        </div>
    );
}