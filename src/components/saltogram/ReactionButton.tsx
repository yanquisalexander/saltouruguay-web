import { useState, useEffect } from "react";
import type { SaltogramReaction } from "@/types/saltogram";
import { toast } from "sonner";

interface ReactionButtonProps {
    postId: number;
}

const EMOJIS = ["❤️", "🔥", "😂", "👍", "😮", "😢", "😡"];

export default function ReactionButton({ postId }: ReactionButtonProps) {
    const [reactions, setReactions] = useState<SaltogramReaction[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReactions();
    }, [postId]);

    const fetchReactions = async () => {
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/reactions`);
            const data = await response.json();
            setReactions(data.reactions || []);
        } catch (error) {
            console.error("Error fetching reactions:", error);
        }
    };

    const handleReaction = async (emoji: string) => {
        if (loading) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/reactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ emoji }),
            });

            const data = await response.json();

            if (response.ok) {
                // Refresh reactions
                await fetchReactions();
                setShowPicker(false);
            } else {
                toast.error(data.error || "Error al reaccionar");
            }
        } catch (error) {
            console.error("Error adding reaction:", error);
            toast.error("Error al reaccionar");
        } finally {
            setLoading(false);
        }
    };

    const totalReactions = reactions.reduce((sum: number, r: SaltogramReaction) => sum + r.count, 0);

    return (
        <div className="relative">
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-2 text-white/70 hover:text-red-400 transition-colors group"
            >
                <span className="text-xl group-hover:scale-110 transition-transform">
                    ❤️
                </span>
                <span className="font-medium">{totalReactions}</span>
            </button>

            {/* Emoji Picker */}
            {showPicker && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-white/20 p-2 flex gap-2 z-10 animate-fade-in-up">
                    {EMOJIS.map((emoji) => {
                        const reaction = reactions.find((r: SaltogramReaction) => r.emoji === emoji);
                        return (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                disabled={loading}
                                className="relative group/emoji hover:scale-125 transition-transform text-2xl p-2 rounded-lg hover:bg-white/10"
                            >
                                {emoji}
                                {reaction && reaction.count > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                        {reaction.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Click outside to close */}
            {showPicker && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowPicker(false)}
                />
            )}
        </div>
    );
}
