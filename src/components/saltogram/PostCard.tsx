import { useState } from "preact/hooks";
import type { SaltogramPost } from "@/types/saltogram";
import ReactionButton from "./ReactionButton";
import CommentSection from "./CommentSection";
import { MessageCircle, Flag, Pin, Sparkles, MoreHorizontal, Trash2, Star, Share2, BadgeCheck, Crown } from "lucide-preact";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { actions } from "astro:actions";
import { toast } from "sonner";
import PostMusicPlayer from "./PostMusicPlayer";

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

    // Formatear texto con hashtags y menciones
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
            if (word.startsWith("@") && word.length > 1) {
                const username = word.substring(1);
                // Simple regex to check if it's a valid username format (alphanumeric + underscore)
                if (/^[a-zA-Z0-9_]+$/.test(username)) {
                    return (
                        <a key={i} href={`/comunidad/saltogram/u/${username}`} className="text-blue-400 hover:text-blue-300 font-medium hover:underline">
                            {word}
                        </a>
                    );
                }
            }
            return word;
        });
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/comunidad/saltogram/${post.id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Enlace copiado al portapapeles");
        } catch (err) {
            toast.error("Error al copiar enlace");
        }
    };

    if (isDeleted) return null;

    return (
        <article className={`
            relative bg-[#242526] rounded-xl shadow-sm transition-all duration-300
            ${isFeatured
                ? 'border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.05)]'
                : 'border border-white/5'
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
            <div className="p-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <a href={`/comunidad/saltogram/u/${post.user.username}`}>
                        <img
                            src={post.user.avatar || `https://ui-avatars.com/api/?name=${post.user.displayName}`}
                            alt={post.user.displayName}
                            className="size-10 rounded-full object-cover border border-white/5"
                            loading="lazy"
                        />
                    </a>
                    <div>
                        <a href={`/comunidad/saltogram/u/${post.user.username}`} className="font-semibold text-[#e4e6eb] text-[15px] leading-tight hover:underline cursor-pointer flex items-center gap-1">
                            {post.user.displayName}
                            {post.user.admin && (
                                <BadgeCheck size={16} className="text-blue-400 fill-blue-400/10" />
                            )}
                            {post.user.twitchTier && post.user.twitchTier > 0 && (
                                <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-0.5 ml-1">
                                    <Crown size={10} />
                                    <span className="font-bold">T{post.user.twitchTier}</span>
                                </span>
                            )}
                        </a>
                        <div className="flex items-center gap-1 text-[13px] text-[#b0b3b8] mt-0.5">
                            <a href={`/comunidad/saltogram/${post.id}`} className="hover:underline">{timeAgo}</a>
                            <span>·</span>
                            <span className="text-xs">@{post.user.username}</span>
                        </div>
                    </div>
                </div>

                {/* Dropdown Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 text-[#b0b3b8] hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Opciones"
                    >
                        <MoreHorizontal size={20} />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#242526] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                                {isAdmin && (
                                    <>
                                        <button onClick={handlePin} className="w-full px-4 py-2.5 text-left text-sm text-[#e4e6eb] hover:bg-white/5 flex items-center gap-2">
                                            <Pin size={16} /> {isPinned ? "Desfijar" : "Fijar"}
                                        </button>
                                        <button onClick={handleFeature} className="w-full px-4 py-2.5 text-left text-sm text-[#e4e6eb] hover:bg-white/5 flex items-center gap-2">
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
                                    className="w-full px-4 py-2.5 text-left text-sm text-[#e4e6eb] hover:bg-white/5 flex items-center gap-2"
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
                <div className="px-4 pb-3">
                    <p className="text-[#e4e6eb] text-[15px] whitespace-pre-wrap break-words leading-relaxed font-normal">
                        {formatText(post.text)}
                    </p>
                </div>
            )}

            {/* Music Player */}
            {post.metadata?.music && (
                <div className="px-4 mb-3">
                    <PostMusicPlayer music={post.metadata.music} />
                </div>
            )}

            {/* Image */}
            {post.imageUrl && (
                <div className="relative w-full bg-black">
                    <img
                        src={post.imageUrl}
                        alt="Post content"
                        className="w-full h-auto max-h-[600px] object-contain"
                        loading="lazy"
                    />
                </div>
            )}

            {/* Footer / Actions */}
            <div className="px-4 py-1 border-t border-white/10">
                <div className="flex items-center justify-between gap-1">
                    <div className="flex-1 flex justify-center hover:bg-white/5 rounded-lg py-1 transition-colors">
                        <ReactionButton postId={post.id} currentUserId={currentUserId} />
                    </div>

                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-[#b0b3b8] hover:bg-white/5 rounded-lg transition-colors group"
                    >
                        <MessageCircle size={20} />
                        <span className="text-[15px] font-medium">Comentar</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-[#b0b3b8] hover:bg-white/5 rounded-lg transition-colors"
                        title="Copiar enlace"
                    >
                        <Share2 size={20} />
                        <span className="text-[15px] font-medium">Compartir</span>
                    </button>
                </div>

                {/* Comments Area */}
                <div className="mt-2 pt-2 border-t border-white/5">
                    <CommentSection
                        postId={post.id}
                        onCommentAdded={handleCommentAdded}
                        currentUserId={currentUserId}
                        preview={!showComments}
                        initialComments={post.latestComments}
                        onToggleComments={() => setShowComments(!showComments)}
                        totalComments={commentsCount}
                    />
                </div>
            </div>
        </article>
    );
}