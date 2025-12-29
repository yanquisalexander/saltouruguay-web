import { LucideMusic, LucidePlus } from "lucide-preact";

interface NoteBubbleProps {
    note?: any;
    user: any;
    isCurrentUser?: boolean;
    onClick?: () => void;
}

export default function NoteBubble({ note, user, isCurrentUser, onClick }: NoteBubbleProps) {
    const handleClick = (e: MouseEvent) => {
        e.stopPropagation();
        onClick?.();
    };

    // Clases base para el efecto vidrio
    const glassBubbleClass = "backdrop-blur-xl border shadow-lg transition-all duration-300";

    // Si hay nota, usamos un vidrio oscuro. Si es el usuario actual sin nota, un vidrio más claro/sutil.
    const bubbleStyle = note
        ? "bg-black/60 border-white/10 text-white shadow-purple-500/5"
        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10";

    return (
        <div
            className="flex flex-col items-center gap-3 relative group cursor-pointer w-[84px] flex-shrink-0 pt-8" // pt-8 para dar espacio a la burbuja al flotar
            onClick={handleClick}
        >
            {/* --- BUBBLE (La nota en sí) --- */}
            <div className={`absolute -top-2 z-20 transition-all duration-300 transform origin-bottom ${note ? 'scale-100 opacity-100 group-hover:-translate-y-2' : 'scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 group-hover:-translate-y-1'}`}>
                {(note || isCurrentUser) && (
                    <div className={`
                        ${glassBubbleClass} ${bubbleStyle}
                        px-3 py-2.5 rounded-2xl rounded-bl-none 
                        min-w-[85px] max-w-[110px] 
                        flex flex-col items-center justify-center gap-1
                        relative
                    `}>
                        {note ? (
                            <>
                                {note.musicTitle ? (
                                    <div className="flex flex-col items-center w-full">
                                        <div className="flex items-center justify-center gap-1.5 w-full text-purple-300">
                                            <LucideMusic size={10} className="shrink-0 animate-pulse" />
                                            <span className="text-[10px] font-bold leading-tight truncate max-w-full">
                                                {note.musicTitle}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-white/50 leading-tight truncate w-full text-center">
                                            {note.musicArtist}
                                        </span>
                                        {note.text && (
                                            <p className="text-[11px] font-medium leading-tight break-words line-clamp-2 mt-1 w-full text-center text-white/90">
                                                "{note.text}"
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-[11px] font-medium leading-tight break-words line-clamp-3 text-center text-white/90">
                                        {note.text || "..."}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-[10px] font-medium whitespace-nowrap px-1">Dejar una nota</p>
                        )}

                        {/* Pequeño triangulo del globo de texto */}
                        <div className={`absolute -bottom-1.5 left-0 w-3 h-3 border-l border-b transform rotate-45 ${note ? 'bg-black/60 border-white/10' : 'bg-[#1a1a1a] border-white/5'} clip-path-triangle`}></div>
                    </div>
                )}
            </div>

            {/* --- AVATAR --- */}
            <div className="relative">
                {/* Anillo del Avatar */}
                <div className={`
                    w-[68px] h-[68px] rounded-full p-[3px] transition-all duration-300
                    ${note
                        ? "bg-gradient-to-tr from-purple-500 via-pink-500 to-yellow-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        : "bg-white/10 group-hover:bg-white/20 border border-white/5"
                    }
                `}>
                    <div className="w-full h-full rounded-full border-[3px] border-[#0c0c0f] overflow-hidden bg-[#1a1a1a] relative">
                        <img
                            src={user.avatar || user.image || `https://ui-avatars.com/api/?name=${user.displayName || user.name}`}
                            alt={user.displayName || user.name}
                            className={`w-full h-full object-cover transition-transform duration-500 ${note ? 'group-hover:scale-110' : 'opacity-80 group-hover:opacity-100'}`}
                        />
                        {/* Overlay oscuro si no hay nota para dar énfasis al botón + */}
                        {isCurrentUser && !note && (
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors"></div>
                        )}
                    </div>
                </div>

                {/* Botón Flotante "+" (Solo usuario actual sin nota) */}
                {isCurrentUser && !note && (
                    <div className="absolute bottom-0 right-0 translate-x-1 translate-y-1">
                        <div className="bg-white text-black p-1.5 rounded-full border-[3px] border-[#0c0c0f] shadow-lg group-hover:scale-110 transition-transform">
                            <LucidePlus size={14} strokeWidth={3} />
                        </div>
                    </div>
                )}
            </div>

            {/* --- NOMBRE --- */}
            <span className={`
                text-[11px] font-medium truncate w-full text-center transition-colors
                ${note ? "text-white" : "text-white/40 group-hover:text-white/70"}
            `}>
                {isCurrentUser ? "Tu nota" : (user.displayName || user.name).split(' ')[0]}
            </span>
        </div>
    );
}