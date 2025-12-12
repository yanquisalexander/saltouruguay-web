import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import type { SaltogramComment } from "@/types/saltogram";
import { toast } from "sonner";
import { Send, LucideLoader2, LucideCornerDownRight, LucideX, BadgeCheck, Crown } from "lucide-preact";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { actions } from "astro:actions";

interface CommentSectionProps {
    postId: number;
    onCommentAdded?: () => void;
    currentUserId?: number;
    preview?: boolean;
    initialComments?: SaltogramComment[];
    onToggleComments?: () => void;
    totalComments?: number;
}

export default function CommentSection({
    postId,
    onCommentAdded,
    currentUserId,
    preview = false,
    initialComments,
    onToggleComments,
    totalComments = 0,
}: CommentSectionProps) {
    const [comments, setComments] = useState<SaltogramComment[]>(initialComments || []);
    const [loading, setLoading] = useState(!initialComments && !preview);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<{ id: number; username: string } | null>(null);
    const [mentionUsers, setMentionUsers] = useState<any[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Optimization: Don't fetch if we have initial comments in preview mode
        if (preview && initialComments) return;

        // Optimization: Don't fetch if there are no comments at all
        if (totalComments === 0) return;

        // If expanded (not preview), fetch only if we don't have all comments
        if (!preview && comments.length >= totalComments && totalComments > 0) return;

        fetchComments();
    }, [postId, preview]);

    const handleInputChange = async (e: any) => {
        const value = e.target.value;
        setNewComment(value);

        const cursor = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursor);
        const lastWord = textBeforeCursor.split(/\s/).pop();

        if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
            const query = lastWord.slice(1);
            const { data } = await actions.saltogram.searchUsers({ query });
            if (data?.users && data.users.length > 0) {
                setMentionUsers(data.users);
                setShowMentions(true);
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const handleMentionSelect = (username: string) => {
        const cursor = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = newComment.slice(0, cursor);
        const textAfterCursor = newComment.slice(cursor);

        const lastWordStart = textBeforeCursor.lastIndexOf("@");
        const newText = textBeforeCursor.slice(0, lastWordStart) + `@${username} ` + textAfterCursor;

        setNewComment(newText);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const fetchComments = async () => {
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/comments?limit=50`);
            const data = await response.json();
            setComments(data.comments || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!currentUserId) {
            toast.error("Debes iniciar sesión para comentar");
            return;
        }
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: newComment,
                    parentId: replyingTo?.id
                }),
            });
            const data = await response.json();

            if (response.ok) {
                setComments([data.comment, ...comments]);
                setNewComment("");
                setReplyingTo(null);
                onCommentAdded?.();
                toast.success("Comentario enviado");
                inputRef.current?.focus();
            } else {
                toast.error(data.error || "Error al comentar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = (commentId: number, username: string) => {
        const comment = comments.find(c => c.id === commentId);
        const targetId = comment?.parentId || commentId;

        // If replying to a reply, add mention
        if (comment?.parentId) {
            setNewComment(`@${username} `);
        }

        setReplyingTo({ id: targetId, username });
        inputRef.current?.focus();
    };

    const rootComments = useMemo(() => {
        return comments.filter(c => !c.parentId);
    }, [comments]);

    const getReplies = (parentId: number) => {
        return comments.filter(c => c.parentId === parentId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    };

    const displayedComments = preview ? rootComments.slice(0, 2) : rootComments;

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* Input Area - Hidden in preview unless we want to allow quick comment */}
            {!preview && (
                <form onSubmit={handleSubmit} className="relative group">
                    {/* Mentions Popup */}
                    {showMentions && mentionUsers.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#242526] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                            {mentionUsers.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleMentionSelect(user.username)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    <img
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <div>
                                        <p className="text-white text-sm font-medium">{user.displayName}</p>
                                        <p className="text-white/40 text-xs">@{user.username}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {replyingTo && (
                        <div className="flex items-center justify-between bg-[#242526] px-4 py-1 text-xs text-white/60 rounded-t-xl border-x border-t border-white/10 -mb-1 pb-2">
                            <span className="flex items-center gap-1">
                                <LucideCornerDownRight size={12} />
                                Respondiendo a <span className="font-bold text-white">{replyingTo.username}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                className="hover:text-white"
                            >
                                <LucideX size={12} />
                            </button>
                        </div>
                    )}
                    <div className={`flex items-center gap-2 bg-[#1a1a1a] border border-white/10 ${replyingTo ? 'rounded-b-xl border-t-0' : 'rounded-xl'} px-4 py-2 focus-within:border-purple-500/50 focus-within:bg-[#202025] transition-all`}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newComment}
                            onInput={handleInputChange}
                            placeholder={currentUserId ? (replyingTo ? `Responde a ${replyingTo.username}...` : "Escribe un comentario...") : "Inicia sesión para comentar"}
                            maxLength={500}
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none py-1"
                            disabled={submitting || !currentUserId}
                        />
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className={`
                                p-1.5 rounded-lg transition-all
                                ${newComment.trim()
                                    ? 'text-purple-400 hover:text-white hover:bg-purple-600'
                                    : 'text-white/20 cursor-not-allowed'
                                }
                            `}
                        >
                            {submitting ? (
                                <LucideLoader2 className="animate-spin" size={18} />
                            ) : (
                                <Send size={18} className={newComment.trim() ? 'translate-x-0.5' : ''} />
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Comments List */}
            <div className={`space-y-4 ${!preview ? 'max-h-[400px] overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                {loading ? (
                    <div className="flex justify-center py-4">
                        <LucideLoader2 className="animate-spin text-white/20" size={24} />
                    </div>
                ) : comments.length === 0 ? (
                    !preview && (
                        <div className="text-center py-6">
                            <p className="text-white/30 text-sm italic">Sé el primero en comentar...</p>
                        </div>
                    )
                ) : (
                    <>
                        {displayedComments.map((comment) => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                allComments={comments}
                                onReply={handleReply}
                                preview={preview}
                                currentUserId={currentUserId}
                            />
                        ))}
                        {preview && totalComments > 2 && (
                            <button
                                onClick={onToggleComments}
                                className="text-white/40 text-sm hover:text-white transition-colors pl-1 mt-2 block"
                            >
                                Ver los {totalComments} comentarios...
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

interface CommentItemProps {
    comment: SaltogramComment;
    allComments: SaltogramComment[];
    onReply: (id: number, username: string) => void;
    preview: boolean;
    isReply?: boolean;
    currentUserId?: number;
}

const formatCommentText = (text: string) => {
    return text.split(/(\s+)/).map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
            const username = part.slice(1);
            // Simple regex to check if it's a valid username format (alphanumeric + underscore)
            if (/^[a-zA-Z0-9_]+$/.test(username)) {
                return (
                    <a key={i} href={`/saltogram/u/${username}`} className="text-blue-400 hover:underline font-medium">
                        {part}
                    </a>
                );
            }
        }
        return part;
    });
};

const CommentItem = ({ comment, allComments, onReply, preview, isReply = false, currentUserId }: CommentItemProps) => {

    const replies = useMemo(() =>
        allComments
            .filter(c => c.parentId === comment.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        , [allComments, comment.id]);

    // Reactions state
    const [reactions, setReactions] = useState<Array<{ emoji: string; count: number }>>([]);
    const [userReaction, setUserReaction] = useState<string | null>(comment.userReaction || null);
    const [loadingReactions, setLoadingReactions] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchReactions = async () => {
            setLoadingReactions(true);
            try {
                const res = await fetch(`/api/saltogram/comments/${comment.id}/reactions`);
                if (!res.ok) return;
                const data = await res.json();
                if (!mounted) return;
                setReactions(data.reactions || []);
                setUserReaction(data.userReaction || null);
            } catch (err) {
                console.error(err);
            } finally {
                if (mounted) setLoadingReactions(false);
            }
        };

        fetchReactions();
        return () => { mounted = false; };
    }, [comment.id]);

    const toggleReaction = async (emoji: string) => {
        if (!currentUserId) {
            // user not logged in — ideally show toast, but keep silent here
            return;
        }

        try {
            const res = await fetch(`/api/saltogram/comments/${comment.id}/reactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji }),
            });
            const data = await res.json();
            if (!res.ok) {
                console.error(data.error);
                return;
            }

            // Update local state
            if (data.action === "added") {
                setUserReaction(emoji);
                setReactions(prev => {
                    const found = prev.find(r => r.emoji === emoji);
                    if (found) return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
                    return [{ emoji, count: 1 }, ...prev];
                });
            } else if (data.action === "removed") {
                setUserReaction(null);
                setReactions(prev => prev.map(r => r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1) } : r));
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={`group flex gap-3 animate-fade-in-up ${isReply ? 'ml-10 mt-2' : ''}`}>
            <img
                src={comment.user.avatar || `https://ui-avatars.com/api/?name=${comment.user.displayName}`}
                alt={comment.user.displayName}
                className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover border border-white/10 shrink-0 mt-1`}
                loading="lazy"
            />
            <div className="flex-1 min-w-0">
                <div className="bg-[#1a1a1a]/50 rounded-2xl rounded-tl-none px-4 py-2 border border-white/5 group-hover:border-white/10 transition-colors inline-block max-w-full">
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-bold text-xs text-white/90 flex items-center gap-1">
                            {comment.user.displayName}
                            {comment.user.admin && (
                                <BadgeCheck size={12} className="text-blue-400 fill-blue-400/10" />
                            )}
                            {comment.user.twitchTier && comment.user.twitchTier > 0 && (
                                <span className="bg-purple-500/20 text-purple-400 text-[8px] px-1 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-0.5">
                                    <Crown size={8} />
                                    <span className="font-bold">T{comment.user.twitchTier}</span>
                                </span>
                            )}
                        </span>
                        <span className="text-[10px] text-white/30">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                        </span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap break-words leading-relaxed">
                        {formatCommentText(comment.text)}
                    </p>
                </div>

                {!preview && (
                    <div className="flex items-center gap-4 mt-1 ml-2">
                        <div className="flex items-center gap-2">
                            {reactions && reactions.length > 0 && (
                                <div className="flex items-center gap-1">
                                    {reactions.slice(0, 4).map(r => (
                                        <button
                                            key={r.emoji}
                                            type="button"
                                            onClick={() => toggleReaction(r.emoji)}
                                            className="text-xs text-white/40 hover:text-white px-2 py-0.5 rounded-full bg-white/2 transition-colors flex items-center gap-1"
                                        >
                                            <span>{r.emoji}</span>
                                            <span className="text-[11px]">{r.count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => toggleReaction('❤️')}
                                className={`text-xs px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${userReaction === '❤️' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white bg-white/2'}`}
                            >
                                <span>❤️</span>
                                <span className="text-[11px]">
                                    {(() => {
                                        const found = reactions.find(r => r.emoji === '❤️');
                                        return found ? found.count : 0;
                                    })()}
                                </span>
                            </button>

                        </div>

                        <button
                            onClick={() => onReply(comment.id, comment.user.username)}
                            className="text-xs text-white/40 hover:text-white font-medium transition-colors"
                        >
                            Responder
                        </button>
                    </div>
                )}

                {/* Replies */}
                {!preview && replies.length > 0 && (
                    <div className="mt-2">
                        {replies.map(reply => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                allComments={allComments}
                                onReply={onReply}
                                preview={preview}
                                isReply={true}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};