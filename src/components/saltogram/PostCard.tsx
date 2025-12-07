import { useState } from "react";
import type { SaltogramPost } from "@/types/saltogram";
import ReactionButton from "./ReactionButton";
import CommentSection from "./CommentSection";
import { MessageCircle, Flag, Pin, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface PostCardProps {
    post: SaltogramPost;
    currentUserId: number;
}

export default function PostCard({ post }: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount);

    const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
        addSuffix: true,
        locale: es,
    });

    const handleCommentAdded = () => {
        setCommentsCount((prev: number) => prev + 1);
    };

    return (
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300">
            {/* Header */}
            <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={
                                post.user.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.username}`
                            }
                            alt={post.user.displayName}
                            className="w-12 h-12 rounded-full border-2 border-purple-500/30"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white">
                                    {post.user.displayName}
                                </h3>
                                {post.isPinned && (
                                    <Pin
                                        size={16}
                                        className="text-yellow-500"
                                        title="Publicación fijada"
                                    />
                                )}
                                {post.isFeatured && (
                                    <Sparkles
                                        size={16}
                                        className="text-purple-500"
                                        title="Publicación destacada"
                                    />
                                )}
                            </div>
                            <p className="text-sm text-white/50">@{post.user.username}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white/50">{timeAgo}</span>
                    </div>
                </div>

                {/* Text Content */}
                {post.text && (
                    <p className="text-white/90 mb-4 whitespace-pre-wrap break-words">
                        {post.text}
                    </p>
                )}
            </div>

            {/* Image */}
            {post.imageUrl && (
                <div className="relative">
                    <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="w-full object-cover max-h-[600px]"
                        loading="lazy"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="p-6 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-6">
                        <ReactionButton postId={post.id} />
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="flex items-center gap-2 text-white/70 hover:text-purple-400 transition-colors"
                        >
                            <MessageCircle size={20} />
                            <span className="font-medium">{commentsCount}</span>
                        </button>
                    </div>
                    <button
                        className="text-white/50 hover:text-red-400 transition-colors"
                        title="Reportar"
                    >
                        <Flag size={20} />
                    </button>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <CommentSection
                        postId={post.id}
                        onCommentAdded={handleCommentAdded}
                    />
                )}
            </div>
        </div>
    );
}
