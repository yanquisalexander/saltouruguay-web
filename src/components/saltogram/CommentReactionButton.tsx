import { useState, useEffect, useRef } from "preact/hooks";
import type { RecentReaction } from "@/types/saltogram";
import { toast } from "sonner";
import { LucideLoader2 } from "lucide-preact";

interface Props {
    commentId: number;
    currentUserId?: number;
}

const EMOJIS = ["❤️", "🔥", "😂", "👍", "😮", "😢", "😡"];

export default function CommentReactionButton({ commentId, currentUserId }: Props) {
    const [reactions, setReactions] = useState<Array<{ emoji: string; count: number }>>([]);
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [recentReactions, setRecentReactions] = useState<RecentReaction[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reactingTo, setReactingTo] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchReactions();
    }, [commentId]);

    const fetchReactions = async () => {
        try {
            const res = await fetch(`/api/saltogram/comments/${commentId}/reactions`);
            const data = await res.json();
            if (!res.ok) return;
            setReactions(data.reactions || []);
            setUserReaction(data.userReaction || null);
            setRecentReactions(data.recentReactions || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleReaction = async (emoji: string) => {
        if (!currentUserId) {
            toast.error("Debes iniciar sesión para reaccionar");
            return;
        }
        if (loading) return;

        setLoading(true);
        setReactingTo(emoji);

        try {
            const res = await fetch(`/api/saltogram/comments/${commentId}/reactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji }),
            });

            const data = await res.json();

            if (res.ok) {
                await fetchReactions();
                setShowPicker(false);
            } else {
                toast.error(data.error || "Error al reaccionar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
            setReactingTo(null);
        }
    };

    const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
    const hasReactions = totalReactions > 0;

    const topEmojis = reactions
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(r => r.emoji);

    const getTooltipText = () => {
        if (recentReactions.length === 0) return "";
        const names = recentReactions.map(r => r.userId === currentUserId ? "Tú" : r.displayName);
        const uniqueNames = [...new Set(names)];
        const displayNames = uniqueNames.slice(0, 5);
        if (totalReactions > displayNames.length) {
            return `${displayNames.join(', ')} y ${totalReactions - displayNames.length} más`;
        }
        return displayNames.join(', ');
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setShowPicker(!showPicker)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-full transition-all duration-300 ${showPicker ? 'bg-white/10' : 'hover:bg-white/5'}`}
                title={getTooltipText()}
            >
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {hasReactions ? (
                        topEmojis.map((emoji, idx) => (
                            <div key={emoji} className="relative z-10 w-5 h-5 flex items-center justify-center bg-[#242526] rounded-full ring-2 ring-[#242526]" style={{ zIndex: 3 - idx }}>
                                <span className="text-xs leading-none">{emoji}</span>
                            </div>
                        ))
                    ) : (
                        <span className="text-white/60">❤</span>
                    )}
                </div>

                <span className={`font-medium text-[13px] ${userReaction ? 'text-red-400' : 'text-[#b0b3b8] group-hover:text-[#e4e6eb]'}`}>
                    {totalReactions > 0 ? totalReactions : 'Me gusta'}
                </span>
            </button>

            {showPicker && (
                <div className="absolute bottom-full left-0 mb-3 z-20 animate-in slide-in-from-bottom-2 fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-1 p-2 bg-[#242526] border border-white/10 rounded-full shadow-2xl ring-1 ring-black/50">
                        {EMOJIS.map((emoji) => {
                            const reactionData = reactions.find((r) => r.emoji === emoji);
                            const count = reactionData ? reactionData.count : 0;
                            const isLoadingThis = reactingTo === emoji;
                            const isSelected = userReaction === emoji;

                            return (
                                <button
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                    disabled={loading}
                                    className={`relative group/emoji flex flex-col items-center justify-center p-2 rounded-full transition-all hover:-translate-y-1 active:scale-95 w-10 h-10 ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                    {isLoadingThis ? (
                                        <LucideLoader2 size={16} className="animate-spin text-white/50" />
                                    ) : (
                                        <span className="text-2xl leading-none filter drop-shadow-md group-hover/emoji:scale-125 transition-transform duration-200">{emoji}</span>
                                    )}

                                    {count > 0 && (
                                        <span className="absolute -top-2 bg-white text-black text-[9px] font-bold px-1.5 rounded-full shadow-lg border border-gray-200 min-w-[16px] text-center opacity-0 group-hover/emoji:opacity-100 transition-opacity transform translate-y-1 group-hover/emoji:translate-y-0">{count}</span>
                                    )}

                                    {isSelected && !isLoadingThis && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="absolute left-6 -bottom-1.5 w-3 h-3 bg-[#242526] border-r border-b border-white/10 rotate-45 transform"></div>
                </div>
            )}
        </div>
    );
}
