import { useState, useEffect, useRef } from "preact/hooks";
import type { SaltogramReaction } from "@/types/saltogram";
import { toast } from "sonner";
import { LucideHeart, LucideLoader2 } from "lucide-preact";

interface ReactionButtonProps {
    postId: number;
    currentUserId?: number;
}

const EMOJIS = ["❤️", "🔥", "😂", "👍", "😮", "😢", "😡"];

export default function ReactionButton({ postId, currentUserId }: ReactionButtonProps) {
    const [reactions, setReactions] = useState<SaltogramReaction[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reactingTo, setReactingTo] = useState<string | null>(null); // Para saber qué emoji está cargando
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchReactions();

        // Close on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [postId]);

    const fetchReactions = async () => {
        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/reactions`);
            const data = await response.json();
            setReactions(data.reactions || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleReaction = async (emoji: string) => {
        if (!currentUserId) {
            toast.error("Debes iniciar sesión para reaccionar");
            return;
        }
        if (loading) return;

        setLoading(true);
        setReactingTo(emoji); // Activar spinner en este emoji específico

        try {
            const response = await fetch(`/api/saltogram/posts/${postId}/reactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji }),
            });

            const data = await response.json();

            if (response.ok) {
                await fetchReactions();
                setShowPicker(false);
                // Pequeña animación de éxito o feedback podría ir aquí
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

    return (
        <div className="relative" ref={containerRef}>

            {/* TRIGGER BUTTON */}
            <button
                onClick={() => setShowPicker(!showPicker)}
                className={`
                    group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300
                    ${showPicker
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-red-400 hover:bg-white/5'
                    }
                `}
            >
                <div className="relative">
                    <LucideHeart
                        size={20}
                        className={`
                            transition-transform duration-300
                            ${showPicker || hasReactions ? 'fill-red-500 text-red-500' : 'group-hover:scale-110'}
                            ${showPicker ? 'scale-110' : ''}
                        `}
                    />
                    {/* Efecto de partículas (simulado con opacidad) si hay reacciones */}
                    {hasReactions && !showPicker && (
                        <div className="absolute inset-0 bg-red-500 blur-lg opacity-20 rounded-full"></div>
                    )}
                </div>

                <span className={`font-medium text-sm ${hasReactions ? 'text-white' : 'text-inherit'}`}>
                    {totalReactions > 0 ? totalReactions : 'Me gusta'}
                </span>
            </button>

            {/* EMOJI PICKER (Floating Pill) */}
            {showPicker && (
                <div className="absolute bottom-full left-0 mb-3 z-20 animate-in slide-in-from-bottom-2 fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-1 p-2 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl ring-1 ring-white/5">
                        {EMOJIS.map((emoji) => {
                            const reactionData = reactions.find((r) => r.emoji === emoji);
                            const count = reactionData ? reactionData.count : 0;
                            const isLoadingThis = reactingTo === emoji;

                            return (
                                <button
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                    disabled={loading}
                                    className="relative group/emoji flex flex-col items-center justify-center p-2 rounded-full hover:bg-white/10 transition-all hover:-translate-y-1 active:scale-95 w-10 h-10"
                                >
                                    {/* Contenido del botón */}
                                    {isLoadingThis ? (
                                        <LucideLoader2 size={16} className="animate-spin text-white/50" />
                                    ) : (
                                        <span className="text-2xl leading-none filter drop-shadow-md group-hover/emoji:scale-125 transition-transform duration-200">
                                            {emoji}
                                        </span>
                                    )}

                                    {/* Contador Flotante (Badge) */}
                                    {count > 0 && (
                                        <span className="absolute -top-2 bg-white text-black text-[9px] font-bold px-1.5 rounded-full shadow-lg border border-gray-200 min-w-[16px] text-center opacity-0 group-hover/emoji:opacity-100 transition-opacity transform translate-y-1 group-hover/emoji:translate-y-0">
                                            {count}
                                        </span>
                                    )}

                                    {/* Indicador de "activo" sutil debajo si tiene votos */}
                                    {count > 0 && !isLoadingThis && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-white/30 rounded-full"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {/* Triángulo/Flecha del tooltip */}
                    <div className="absolute left-6 -bottom-1.5 w-3 h-3 bg-[#0a0a0a]/90 border-r border-b border-white/10 rotate-45 transform"></div>
                </div>
            )}
        </div>
    );
}