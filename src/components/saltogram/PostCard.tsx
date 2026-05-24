import { useState } from "preact/hooks";
import type { SaltogramPost } from "@/types/saltogram";
import ReactionButton from "./ReactionButton";
import CommentSection from "./CommentSection";
import {
    MessageCircle, Flag, Pin, Sparkles, MoreHorizontal,
    Trash2, Star, Share2, BadgeCheck, Crown, LucideCalendar, LucideLink2
} from "lucide-preact";
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
        } catch { toast.error("Error al fijar"); }
    };

    const handleFeature = async () => {
        try {
            const { data, error } = await actions.saltogram.toggleFeature({ postId: post.id });
            if (error) throw new Error(error.message);
            setIsFeatured(data.isFeatured);
            toast.success(data.isFeatured ? "Añadido a destacados" : "Removido de destacados");
            setShowMenu(false);
        } catch { toast.error("Error al destacar"); }
    };

    const handleDelete = async () => {
        if (!confirm("¿Eliminar publicación permanentemente?")) return;
        try {
            const { error } = await actions.saltogram.deletePost({ postId: post.id });
            if (error) throw new Error(error.message);
            setIsDeleted(true);
            toast.success("Publicación eliminada");
        } catch { toast.error("Error al eliminar"); }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/saltogram/post/${post.id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Enlace copiado");
        } catch {
            toast.error("Error al copiar enlace");
        }
    };

    const formatText = (text: string) => {
        if (!text) return null;
        return text.split(/(\s+)/).map((word, i) => {
            if (word.startsWith("#") && word.length > 1) {
                const tag = word.substring(1);
                return (
                    <a key={i} href={`/saltogram?tag=${tag}`} className="text-[#b3c8ff] hover:text-[#c5d5ff] font-medium hover:underline">
                        {word}
                    </a>
                );
            }
            if (word.startsWith("@") && word.length > 1) {
                const username = word.substring(1);
                if (/^[a-zA-Z0-9_]+$/.test(username)) {
                    return (
                        <a key={i} href={`/saltogram/u/${username}`} className="text-[#b3c8ff] hover:text-[#c5d5ff] font-medium hover:underline">
                            {word}
                        </a>
                    );
                }
            }
            return word;
        });
    };

    if (isDeleted) return null;

    return (
        <article className={`
            relative
            bg-[#1a1b2e]
            rounded-[28px]
            border transition-all duration-300 overflow-hidden
            ${isFeatured
                ? "border-[#f9c96a]/25 shadow-[0_0_0_1px_rgba(249,201,106,0.08)]"
                : "border-[#2a2d4a]"
            }
        `}>

            {/* ── BADGES fijado / destacado ── */}
            {(isPinned || isFeatured) && (
                <div className="absolute top-4 right-14 flex gap-1.5 z-10">
                    {isPinned && (
                        <span
                            className="bg-[#f9c96a]/10 text-[#f9c96a] p-1.5 rounded-full border border-[#f9c96a]/20"
                            title="Fijado"
                        >
                            <Pin size={13} fill="currentColor" />
                        </span>
                    )}
                    {isFeatured && (
                        <span
                            className="bg-[#c9b3ff]/10 text-[#c9b3ff] p-1.5 rounded-full border border-[#c9b3ff]/20"
                            title="Destacado"
                        >
                            <Sparkles size={13} fill="currentColor" />
                        </span>
                    )}
                </div>
            )}

            {/* ── HEADER ── */}
            <div className="p-4 pb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <a href={`/saltogram/u/${post.user.username}`} className="shrink-0">
                        <img
                            src={post.user.avatar || `https://ui-avatars.com/api/?name=${post.user.displayName}`}
                            alt={post.user.displayName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#2a2d4a]"
                            loading="lazy"
                        />
                    </a>
                    <div className="min-w-0">
                        <a
                            href={`/saltogram/u/${post.user.username}`}
                            className="flex items-center gap-1.5 font-semibold text-[15px] text-white hover:text-[#b3c8ff] transition-colors leading-tight"
                        >
                            <span className="truncate">{post.user.displayName}</span>
                            {post.user.admin && (
                                <BadgeCheck size={15} className="text-[#b3c8ff] shrink-0" />
                            )}
                            {post.user.twitchTier && post.user.twitchTier > 0 && (
                                <span className="
                                    flex items-center gap-0.5 shrink-0
                                    bg-[#c9b3ff]/10 text-[#c9b3ff]
                                    text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                    border border-[#c9b3ff]/20
                                ">
                                    <Crown size={9} />
                                    T{post.user.twitchTier}
                                </span>
                            )}
                        </a>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <a
                                href={`/saltogram/post/${post.id}`}
                                className="text-xs text-[#6b7099] hover:text-[#8a8fa8] transition-colors"
                            >
                                {timeAgo}
                            </a>
                            <span className="text-[#3a3d5a]">·</span>
                            <span className="text-xs text-[#6b7099]">@{post.user.username}</span>
                        </div>
                    </div>
                </div>

                {/* Menú contextual — M3 icon button */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        aria-label="Opciones"
                        className="
                            p-2 rounded-full text-[#6b7099]
                            hover:bg-[#2a2d4a] hover:text-white
                            transition-all duration-200 active:scale-90
                        "
                    >
                        <MoreHorizontal size={19} strokeWidth={1.8} />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="
                                absolute right-0 top-full mt-1 w-48
                                bg-[#12131f] border border-[#2a2d4a]
                                rounded-[20px] shadow-2xl z-50
                                overflow-hidden py-1.5
                                animate-in fade-in zoom-in-95 duration-150
                            ">
                                {isAdmin && (
                                    <>
                                        <button onClick={handlePin} className="w-full px-4 py-2.5 text-left text-sm text-[#c0c4d8] hover:bg-[#2a2d4a] hover:text-white flex items-center gap-2.5 transition-colors">
                                            <Pin size={15} strokeWidth={1.8} /> {isPinned ? "Desfijar" : "Fijar"}
                                        </button>
                                        <button onClick={handleFeature} className="w-full px-4 py-2.5 text-left text-sm text-[#c0c4d8] hover:bg-[#2a2d4a] hover:text-white flex items-center gap-2.5 transition-colors">
                                            <Star size={15} strokeWidth={1.8} /> {isFeatured ? "Quitar destacado" : "Destacar"}
                                        </button>
                                        <div className="h-px bg-[#2a2d4a] my-1 mx-3" />
                                    </>
                                )}
                                {(isAdmin || currentUserId === post.userId) && (
                                    <button onClick={handleDelete} className="w-full px-4 py-2.5 text-left text-sm text-[#ff8fa3] hover:bg-[#ff8fa3]/10 flex items-center gap-2.5 transition-colors">
                                        <Trash2 size={15} strokeWidth={1.8} /> Eliminar
                                    </button>
                                )}
                                <button
                                    onClick={() => { handleShare(); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-[#c0c4d8] hover:bg-[#2a2d4a] hover:text-white flex items-center gap-2.5 transition-colors"
                                >
                                    <LucideLink2 size={15} strokeWidth={1.8} /> Copiar enlace
                                </button>
                                <button
                                    onClick={() => { toast.success("Reporte enviado"); setShowMenu(false); }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-[#c0c4d8] hover:bg-[#2a2d4a] hover:text-white flex items-center gap-2.5 transition-colors"
                                >
                                    <Flag size={15} strokeWidth={1.8} /> Reportar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── TEXTO ── */}
            {post.text && (
                <div className="px-4 pb-3">
                    <p className="text-[15px] text-[#c0c4d8] leading-relaxed whitespace-pre-wrap break-words">
                        {formatText(post.text)}
                    </p>
                </div>
            )}

            {/* ── MÚSICA ── */}
            {post.metadata?.music && (
                <div className="px-4 pb-3">
                    <PostMusicPlayer music={post.metadata.music} />
                </div>
            )}

            {/* ── EVENTO ── M3 Card outlined tonal */}
            {post.metadata?.event && (
                <div className="px-4 pb-3">
                    <a
                        href={`/eventos/${post.metadata.event.id}`}
                        className="
                            flex items-center gap-3 p-3
                            bg-[#12131f] border border-[#2a2d5a]
                            rounded-[20px] overflow-hidden relative
                            hover:border-[#b3c8ff]/30 hover:bg-[#1a1b38]
                            transition-all duration-200 group
                        "
                    >
                        {post.metadata.event.cover && (
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <img src={post.metadata.event.cover} className="w-full h-full object-cover blur-2xl" />
                            </div>
                        )}
                        <div className="
                            w-16 h-16 rounded-[16px] shrink-0
                            bg-[#b3c8ff]/10 border border-[#b3c8ff]/15
                            flex items-center justify-center overflow-hidden
                            relative z-10
                        ">
                            {post.metadata.event.cover ? (
                                <img src={post.metadata.event.cover} className="w-full h-full object-cover" />
                            ) : (
                                <LucideCalendar className="text-[#b3c8ff]" size={24} strokeWidth={1.5} />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 relative z-10">
                            <p className="text-[#b3c8ff] text-[10px] font-bold uppercase tracking-widest mb-0.5">Evento</p>
                            <p className="text-white font-semibold text-base truncate group-hover:text-[#b3c8ff] transition-colors">
                                {post.metadata.event.name}
                            </p>
                            <p className="text-[#6b7099] text-xs flex items-center gap-1 mt-0.5">
                                <LucideCalendar size={12} strokeWidth={1.8} />
                                {formatDistanceToNow(new Date(post.metadata.event.startDate), { addSuffix: true, locale: es })}
                            </p>
                        </div>
                    </a>
                </div>
            )}

            {/* ── IMAGEN ── */}
            {post.imageUrl && (
                <div className="w-full bg-[#12131f] overflow-hidden">
                    <img
                        src={post.imageUrl}
                        alt="Contenido de publicación"
                        className="w-full h-auto max-h-[560px] object-contain"
                        loading="lazy"
                    />
                </div>
            )}

            {/* ── FOOTER / ACCIONES ── M3 action bar */}
            <div className="px-2 pt-1 pb-2 border-t border-[#2a2d4a]">
                <div className="flex items-center">

                    {/* Reacciones */}
                    <div className="flex-1 flex justify-center">
                        <ReactionButton
                            postId={post.id}
                            currentUserId={currentUserId}
                            initialData={{
                                reactions: post.reactions,
                                userReaction: post.userReaction,
                                recentReactions: post.recentReactions,
                            }}
                        />
                    </div>

                    {/* Comentar */}
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className={`
                            flex-1 flex items-center justify-center gap-2
                            py-2.5 px-3 rounded-full text-sm font-medium
                            transition-all duration-200
                            ${showComments
                                ? "text-[#b3c8ff] bg-[#b3c8ff]/10"
                                : "text-[#6b7099] hover:text-white hover:bg-[#2a2d4a]"
                            }
                        `}
                    >
                        <MessageCircle size={18} strokeWidth={1.8} />
                        <span className="hidden sm:inline">Comentar</span>
                        {commentsCount > 0 && (
                            <span className="text-xs opacity-70">{commentsCount}</span>
                        )}
                    </button>

                    {/* Compartir */}
                    <button
                        onClick={handleShare}
                        className="
                            flex-1 flex items-center justify-center gap-2
                            py-2.5 px-3 rounded-full text-sm font-medium
                            text-[#6b7099] hover:text-white hover:bg-[#2a2d4a]
                            transition-all duration-200
                        "
                        title="Copiar enlace"
                    >
                        <Share2 size={18} strokeWidth={1.8} />
                        <span className="hidden sm:inline">Compartir</span>
                    </button>
                </div>

                {/* Sección de comentarios */}
                {(showComments || (post.latestComments && post.latestComments.length > 0)) && (
                    <div className="mt-2 pt-2 border-t border-[#2a2d4a]">
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
                )}
            </div>
        </article>
    );
}