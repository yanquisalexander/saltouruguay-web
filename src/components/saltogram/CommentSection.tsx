import { useState, useEffect } from "react";
import type { SaltogramComment } from "@/types/saltogram";
import { toast } from "sonner";
import { Send } from "lucide-react";
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

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const response = await fetch(
                `/api/saltogram/posts/${postId}/comments?limit=20`
            );
            const data = await response.json();
            setComments(data.comments || []);
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: newComment }),
            });

            const data = await response.json();

            if (response.ok) {
                setComments([data.comment, ...comments]);
                setNewComment("");
                onCommentAdded?.();
                toast.success("Comentario agregado");
            } else {
                toast.error(data.error || "Error al comentar");
            }
        } catch (error) {
            console.error("Error adding comment:", error);
            toast.error("Error al comentar");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="border-t border-white/10 pt-4 mt-4">
            {/* Comment Form */}
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment((e.target as HTMLInputElement).value)}
                        placeholder="Escribe un comentario..."
                        maxLength={500}
                        className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-white/10 focus:outline-none focus:border-purple-500 transition-colors"
                        disabled={submitting}
                    />
                    <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-xs text-white/40 mt-1">
                    {newComment.length}/500 caracteres
                </p>
            </form>

            {/* Comments List */}
            {loading ? (
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                </div>
            ) : comments.length === 0 ? (
                <p className="text-white/50 text-center py-4">
                    No hay comentarios todavía
                </p>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {comments.map((comment: SaltogramComment) => {
                        const timeAgo = formatDistanceToNow(
                            new Date(comment.createdAt),
                            {
                                addSuffix: true,
                                locale: es,
                            }
                        );

                        return (
                            <div
                                key={comment.id}
                                className="bg-gray-800/50 rounded-lg p-3"
                            >
                                <div className="flex items-start gap-3">
                                    <img
                                        src={
                                            comment.user.avatar ||
                                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`
                                        }
                                        alt={comment.user.displayName}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-white text-sm">
                                                {comment.user.displayName}
                                            </span>
                                            <span className="text-xs text-white/40">
                                                {timeAgo}
                                            </span>
                                        </div>
                                        <p className="text-white/80 text-sm whitespace-pre-wrap break-words">
                                            {comment.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
