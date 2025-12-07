import { useState } from "preact/hooks";
import type { SaltogramPost } from "@/types/saltogram";
import ReactionButton from "./ReactionButton";
import CommentSection from "./CommentSection";
import { MessageCircle, Flag, Pin, Sparkles, MoreHorizontal, Trash2, Star, Share2 } from "lucide-preact";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { actions } from "astro:actions";
import { toast } from "sonner";

interface PostCardProps {
    post: SaltogramPost;
    currentUserId?: number;
    isAdmin?: boolean;
}

export default function PostCard({ post, currentUserId, isAdmin }: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount);
    const [showMenu, setShowMenu] = useState(false);
    const [isPinned, setIsPinned] = useState(post.isPinned);
    const [isFeatured, setIsFeatured] = useState(post.isFeatured);
    const [isDeleted, setIsDeleted] = useState(false);

    const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es });

    const handleCommentAdded = () => setCommentsCount((prev) => prev + 1);

    const handlePin = async () => {
        try {
            const { data, error } = await actions.saltogram.togglePin({ postId: post.id });
            if (error) throw new Error(error.message);
            setIsPinned(data.isPinned);
            toast.success(data.isPinned ? "Fijado en el feed" : "Desfijado del feed");
            setShowMenu(false);
        } catch (e) { toast.error("Error al fijar"); }
    };

    const handleFeature = async () => {
        try {
            const { data, error } = await actions.saltogram.toggleFeature({ postId: post.id });
            if (error) throw new Error(error.message);
            setIsFeatured(data.isFeatured);
            toast.success(data.isFeatured ? "Añadido a destacados" : "Removido de destacados");
            setShowMenu(false);
        } catch (e) { toast.error("Error al destacar"); }
    };

    const handleDelete = async () => {
        if (!confirm("¿Eliminar publicación permanentemente?")) return;
        try {
            const { error } = await actions.saltogram.deletePost({ postId: post.id });
            if (error) throw new Error(error.message);
            setIsDeleted(true);
            toast.success("Publicación eliminada");
        } catch (e) { toast.error("Error al eliminar"); }
    };

    // Formatear texto con hashtags coloreados
    const formatText = (text: string) => {
        if (!text) return null;
        return text.split(/(\s+)/).map((word, i) => {
            if (word.startsWith("#") && word.length > 1) {
                const tag = word.substring(1);
                return (
                    <a key={i} href={`/comunidad/saltogram?tag=${tag}`} className="text-blue-400 hover:text-blue-300 font-medium hover:underline">
                        {word}
                    </a>
                );
            }
            return word;
        });
    };

    if (isDeleted) return null;

    return (
        <article className={`
            relative bg-[#0f0f11] rounded-2xl border transition-all duration-300
            ${isFeatured
                ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.05)]'
                : 'border-white/10 hover:border-white/20 hover:bg-[#121214]'
            }
        `}>
            {/* Badges Flotantes */}
            {(isPinned || isFeatured) && (
                <div className="absolute top-4 right-14 flex gap-2 z-10">
                    {isPinned && (
                        <span className="bg-yellow-500/10 text-yellow-500 p-1.5 rounded-lg border border-yellow-500/20" title="Fijado">
                            <Pin size={14} fill="currentColor" />
                        </span>
                    )}
                    {isFeatured && (
                        <span className="bg-purple-500/10 text-purple-500 p-1.5 rounded-lg border border-purple-500/20" title="Destacado">
                            <Sparkles size={14} fill="currentColor" />
                        </span>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="p-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src={post.user.avatar || `https://ui-avatars.com/api/?name=${post.user.displayName}`}
                        alt={post.user.displayName}
                        className="size-10 rounded-full object-cover border border-white/10"
                        loading="lazy"
                    />
                    <div>
                        <h3 className="font-bold text-white text-sm leading-tight hover:underline cursor-pointer">
                            {post.user.displayName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                            <span>@{post.user.username}</span>
                            <span>•</span>
                            <span>{timeAgo}</span>
                        </div>
                    </div>
                </div>

                {/* Dropdown Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                        aria-label="Opciones"
                    >
                        <MoreHorizontal size={20} />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                                {isAdmin && (
                                    <>
                                        <button onClick={handlePin} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                            <Pin size={16} /> {isPinned ? "Desfijar" : "Fijar"}
                                        </button>
                                        <button onClick={handleFeature} className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                            <Star size={16} /> {isFeatured ? "Quitar destacado" : "Destacar"}
                                        </button>
                                        <div className="h-px bg-white/10 my-1"></div>
                                    </>
                                )}
                                {(isAdmin || currentUserId === post.userId) && (
                                    <button onClick={handleDelete} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                                <button
                                    onClick={() => { toast.success("Reporte enviado"); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                                >
                                    <Flag size={16} /> Reportar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content Text */}
            {post.text && (
                <div className="px-5 pb-3">
                    <p className="text-white/90 text-base whitespace-pre-wrap break-words leading-relaxed font-rubik">
                        {formatText(post.text)}
                    </p>
                </div>
            )}

            {/* Image */}
            {post.imageUrl && (
                <div className="relative w-full bg-black/50">
                    <img
                        src={post.imageUrl}
                        alt="Post content"
                        className="w-full h-auto max-h-[600px] object-contain"
                        loading="lazy"
                    />
                </div>
            )}

            {/* Footer / Actions */}
            <div className="px-5 py-4 border-t border-white/5">
                <div className="flex items-center gap-6">
                    <ReactionButton postId={post.id} currentUserId={currentUserId} />

                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                    >
                        <div className="p-1.5 rounded-full group-hover:bg-white/10 transition-colors">
                            <MessageCircle size={20} />
                        </div>
                        <span className="text-sm font-medium">{commentsCount}</span>
                    </button>

                    <button className="ml-auto p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Compartir">
                        <Share2 size={20} />
                    </button>
                </div>

                {/* Comments Area */}
                {showComments && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                        <CommentSection
                            postId={post.id}
                            onCommentAdded={handleCommentAdded}
                            currentUserId={currentUserId}
                        />
                    </div>
                )}
            </div>
        </article>
    );
}