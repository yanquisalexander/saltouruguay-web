import { useEffect, useRef, useState } from "preact/hooks";
import { motion, AnimatePresence } from "motion/react";
import { LucideX, LucideMusic, LucidePlay, LucidePause, LucideMessageCircle, LucideTrash2, LucideRefreshCw } from "lucide-preact";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface NoteBottomSheetProps {
    note: any;
    onClose: () => void;
    currentUser?: any;
    onDelete?: () => void;
    onReplace?: () => void;
}

export default function NoteBottomSheet({ note, onClose, currentUser, onDelete, onReplace }: NoteBottomSheetProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = currentUser?.id && note?.userId === Number(currentUser.id);

    useEffect(() => {
        if (note?.musicTrackId) {
            // Fetch fresh URL using ID to avoid expiration
            fetch(`/api/deezer/track?id=${note.musicTrackId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.preview) {
                        setAudioUrl(data.preview);
                    } else {
                        setAudioUrl(note.musicUrl);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching track:", err);
                    setAudioUrl(note.musicUrl);
                });
        } else if (note?.musicUrl) {
            setAudioUrl(note.musicUrl);
        } else {
            setAudioUrl(null);
        }
    }, [note]);

    useEffect(() => {
        if (audioUrl) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(audioUrl);
            audioRef.current.onended = () => setIsPlaying(false);

            // Auto-play
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [audioUrl]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Seguro que quieres eliminar tu nota?")) return;

        setIsDeleting(true);
        try {
            const { error } = await actions.notes.delete({});
            if (error) throw error;

            toast.success("Nota eliminada");
            onDelete?.();
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Error al eliminar");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!note) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                />

                {/* Sheet */}
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    drag="y"
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_: any, info: any) => {
                        if (info.offset.y > 100) onClose();
                    }}
                    className="relative w-full max-w-md bg-[#242526] rounded-t-3xl overflow-hidden pointer-events-auto border-t border-white/10 pb-8"
                >
                    {/* Drag Handle */}
                    <div className="w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                    </div>

                    <div className="p-6 flex flex-col items-center gap-6">
                        {/* User Info */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500">
                                <div className="w-full h-full rounded-full border-4 border-[#242526] overflow-hidden">
                                    <img
                                        src={note.user.avatar || note.user.image || `https://ui-avatars.com/api/?name=${note.user.displayName || note.user.name}`}
                                        alt={note.user.displayName || note.user.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-white">{note.user.displayName || note.user.name}</h3>
                                <p className="text-sm text-gray-400">@{note.user.username}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: es })}
                                </p>
                            </div>
                        </div>

                        {/* Note Content */}
                        {note.text && (
                            <div className="w-full bg-[#18191a] rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <LucideMessageCircle size={100} />
                                </div>

                                <p className="text-xl font-medium text-center text-white leading-relaxed relative z-10">
                                    "{note.text}"
                                </p>
                            </div>
                        )}                        {/* Music Player */}
                        {note.musicUrl && (
                            <div className="w-full bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-white/10 flex items-center gap-4">
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    <img
                                        src={note.musicCover}
                                        className={`w-full h-full rounded-lg object-cover ${isPlaying ? 'animate-pulse' : ''}`}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                        <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                                            {isPlaying ? <LucidePause size={20} /> : <LucidePlay size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{note.musicTitle}</p>
                                    <p className="text-xs text-gray-400 truncate">{note.musicArtist}</p>
                                </div>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className={`w-1 bg-purple-500 rounded-full transition-all duration-300 ${isPlaying ? 'animate-music-bar' : 'h-2'}`}
                                            style={{
                                                height: isPlaying ? `${Math.random() * 16 + 8}px` : '8px',
                                                animationDelay: `${i * 0.1}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4 w-full">
                            {isOwner ? (
                                <>
                                    <button
                                        onClick={onReplace}
                                        className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LucideRefreshCw size={20} />
                                        Reemplazar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <LucideTrash2 size={20} />
                                        {isDeleting ? "Eliminando..." : "Eliminar"}
                                    </button>
                                </>
                            ) : (
                                <button className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                    Responder
                                </button>
                            )}
                            {/* <button className="p-3 bg-[#3a3b3c] text-white rounded-xl hover:bg-[#4e4f50] transition-colors">
                                <LucideHeart size={20} />
                            </button> */}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
