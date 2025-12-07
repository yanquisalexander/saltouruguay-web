import { useEffect, useState, useCallback, useRef } from "react";
import type { SaltogramPost } from "@/types/saltogram";
import PostCard from "./PostCard";
import CreatePostModal from "./CreatePostModal";
import { toast } from "sonner";

interface SaltogramFeedProps {
    user: any;
}

export default function SaltogramFeed({ user }: SaltogramFeedProps) {
    const [posts, setPosts] = useState<SaltogramPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<"recent" | "popular">("recent");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasNewPosts, setHasNewPosts] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const lastPostRef = useRef<HTMLDivElement | null>(null);
    const pollingRef = useRef<number | null>(null);

    const fetchPosts = async (pageNum: number, reset = false) => {
        try {
            const response = await fetch(
                `/api/saltogram/posts?page=${pageNum}&limit=10&sort=${sort}`
            );
            const data = await response.json();

            if (data.posts && data.posts.length > 0) {
                setPosts((prev: SaltogramPost[]) => (reset ? data.posts : [...prev, ...data.posts]));
                setHasMore(data.posts.length === 10);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error fetching posts:", error);
            toast.error("Error al cargar las publicaciones");
        } finally {
            setLoading(false);
        }
    };

    // Long polling for new posts
    const startPolling = useCallback(() => {
        if (posts.length === 0) return;

        const poll = async () => {
            try {
                const lastPostId = posts[0]?.id || 0;
                const response = await fetch(
                    `/api/saltogram/poll?lastPostId=${lastPostId}`
                );
                const data = await response.json();

                if (data.hasNewPosts) {
                    setHasNewPosts(true);
                }

                // Continue polling
                pollingRef.current = window.setTimeout(poll, 2000);
            } catch (error) {
                console.error("Error polling:", error);
                // Retry polling after error
                pollingRef.current = window.setTimeout(poll, 5000);
            }
        };

        poll();
    }, [posts]);

    useEffect(() => {
        fetchPosts(1, true);
    }, [sort]);

    useEffect(() => {
        startPolling();

        return () => {
            if (pollingRef.current) {
                clearTimeout(pollingRef.current);
            }
        };
    }, [startPolling]);

    // Infinite scroll
    useEffect(() => {
        if (loading || !hasMore) return;

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setPage((prev) => prev + 1);
            }
        });

        if (lastPostRef.current) {
            observerRef.current.observe(lastPostRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loading, hasMore]);

    useEffect(() => {
        if (page > 1) {
            fetchPosts(page).catch(console.error);
        }
    }, [page]);

    const handleNewPost = (newPost: SaltogramPost) => {
        setPosts([newPost, ...posts]);
        setIsModalOpen(false);
        toast.success("Publicación creada con éxito");
    };

    const handleLoadNewPosts = () => {
        setHasNewPosts(false);
        setPage(1);
        fetchPosts(1, true);
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
        <div className="space-y-6">
            {/* New Posts Notification */}
            {hasNewPosts && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-down">
                    <button
                        onClick={handleLoadNewPosts}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:shadow-purple-500/50 transition-all duration-300 flex items-center gap-2"
                    >
                        💬 Nuevas publicaciones disponibles
                    </button>
                </div>
            )}

            {/* Sort Filter */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setSort("recent")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        sort === "recent"
                            ? "bg-purple-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                >
                    Más Recientes
                </button>
                <button
                    onClick={() => setSort("popular")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        sort === "popular"
                            ? "bg-purple-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                >
                    Más Populares
                </button>
            </div>

            {/* Posts Feed */}
            {loading && posts.length === 0 ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-white/70 mt-4">Cargando publicaciones...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/40 rounded-2xl border border-white/10">
                    <p className="text-white/70 text-lg mb-4">
                        No hay publicaciones todavía
                    </p>
                    <p className="text-white/50">¡Sé el primero en publicar!</p>
                </div>
            ) : (
                posts.map((post: SaltogramPost, index: number) => (
                    <div
                        key={post.id}
                        ref={index === posts.length - 1 ? lastPostRef : null}
                    >
                        <PostCard post={post} currentUserId={user.id} />
                    </div>
                ))
            )}

            {loading && posts.length > 0 && (
                <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                </div>
            )}

            {/* Create Post Modal */}
            <CreatePostModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onPostCreated={handleNewPost}
                user={user}
            />
        </div>
    );
}
