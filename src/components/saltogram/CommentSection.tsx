import { useState, useEffect, useRef } from "preact/hooks";
import type { SaltogramComment } from "@/types/saltogram";
import { toast } from "sonner";
import { Send, LucideLoader2 } from "lucide-preact";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface CommentSectionProps {
    postId: number;
    onCommentAdded?: () => void;
}

export default function CommentSection({
    postId,
    onCommentAdded,
}: CommentSectionProps) {
    const [comments, setComments] = useState<SaltogramComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/comments?limit=20`);
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
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: newComment }),
            });
            const data = await response.json();

            if (response.ok) {
                setComments([data.comment, ...comments]);
                setNewComment("");
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

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="relative group">
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2 focus-within:border-purple-500/50 focus-within:bg-[#202025] transition-all">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newComment}
                        onInput={(e) => setNewComment((e.target as HTMLInputElement).value)}
                        placeholder="Escribe un comentario..."
                        maxLength={500}
                        className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none py-1"
                        disabled={submitting}
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

            {/* Comments List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <LucideLoader2 className="animate-spin text-white/20" size={24} />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-white/30 text-sm italic">Sé el primero en comentar...</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="group flex gap-3 animate-fade-in-up">
                            <img
                                src={comment.user.avatar || `https://ui-avatars.com/api/?name=${comment.user.displayName}`}
                                alt={comment.user.displayName}
                                className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0 mt-1"
                                loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="bg-[#1a1a1a]/50 rounded-2xl rounded-tl-none px-4 py-2 border border-white/5 group-hover:border-white/10 transition-colors inline-block max-w-full">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className="font-bold text-xs text-white/90">
                                            {comment.user.displayName}
                                        </span>
                                        <span className="text-[10px] text-white/30">
                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/80 whitespace-pre-wrap break-words leading-relaxed">
                                        {comment.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}