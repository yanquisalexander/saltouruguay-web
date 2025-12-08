import { useState, useRef, useEffect } from "preact/hooks";
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

    return (
        <div className="flex flex-col items-center gap-2 relative group cursor-pointer w-20 flex-shrink-0" onClick={handleClick}>
            {/* Bubble */}
            <div className="absolute -top-10 z-10 transition-transform duration-200 group-hover:-translate-y-1">
                {note ? (
                    <div className="bg-white text-black px-3 py-2 rounded-2xl rounded-bl-none shadow-lg min-w-[80px] max-w-[120px] text-center relative animate-fade-in-up duration-300 border border-gray-200 flex flex-col items-center justify-center gap-0.5">
                        {note.musicTitle ? (
                            <>
                                <div className="flex items-center justify-center gap-1 w-full">
                                    <LucideMusic size={10} className="text-black shrink-0" />
                                    <span className="text-[10px] font-bold leading-tight truncate">{note.musicTitle}</span>
                                </div>
                                <span className="text-[9px] text-gray-500 leading-tight truncate w-full block">{note.musicArtist}</span>
                                {note.text && (
                                    <p className="text-[11px] font-medium leading-tight break-words line-clamp-2 mt-0.5 w-full">
                                        {note.text}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-[11px] font-medium leading-tight break-words line-clamp-3">
                                {note.text || "..."}
                            </p>
                        )}
                    </div>
                ) : isCurrentUser ? (
                    <div className="bg-white/10 backdrop-blur-md text-gray-300 px-3 py-1.5 rounded-2xl rounded-bl-none shadow-lg text-center border border-white/10">
                        <p className="text-[10px] font-medium whitespace-nowrap">Dejar nota</p>
                    </div>
                ) : null}
            </div>

            {/* Avatar */}
            <div className="relative mt-2">
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-transparent to-transparent group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300">
                    <div className="w-full h-full rounded-full border-2 border-[#18191a] overflow-hidden bg-[#242526]">
                        <img
                            src={user.avatar || user.image || `https://ui-avatars.com/api/?name=${user.displayName || user.name}`}
                            alt={user.displayName || user.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {isCurrentUser && !note && (
                    <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-2 border-[#18191a]">
                        <LucidePlus size={12} />
                    </div>
                )}
            </div>

            <span className="text-xs text-gray-400 font-medium truncate w-full text-center">
                {isCurrentUser ? "Tu nota" : (user.displayName || user.name).split(' ')[0]}
            </span>
        </div>
    );
}