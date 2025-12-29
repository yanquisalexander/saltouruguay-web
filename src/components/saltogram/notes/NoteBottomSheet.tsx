import { useEffect, useRef, useState } from "preact/hooks";
import { createPortal } from 'preact/compat';
import { motion, AnimatePresence } from "motion/react";
import { LucideX, LucideMusic, LucidePlay, LucidePause, LucideMessageCircle, LucideTrash2, LucideRefreshCw, LucideCornerUpLeft } from "lucide-preact";
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
            fetch(`/api/deezer/track?id=${note.musicTrackId}`)
                .then(res => res.json())
                .then(data => setAudioUrl(data.preview || note.musicUrl))
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
            if (audioRef.current) audioRef.current.pause();
            audioRef.current = new Audio(audioUrl);
            audioRef.current.onended = () => setIsPlaying(false);

            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(() => setIsPlaying(false));
            }
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

    const content = (
        <AnimatePresence>
            <div className="fixed inset-0 z-[99999] flex items-end justify-center pointer-events-none">

                {/* Backdrop con Blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
                />

                {/* Sheet Container Glassmorphism */}
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
                    className="relative w-full max-w-md bg-[#121212]/85 backdrop-blur-2xl rounded-t-[32px] overflow-hidden pointer-events-auto border-t border-white/10 pb-8 shadow-2xl"
                >
                    {/* Decorative Top Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/20 rounded-full mt-3 z-20" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors z-30"
                    >
                        <LucideX size={20} />
                    </button>

                    <div className="p-6 flex flex-col items-center gap-8 pt-12">

                        {/* 1. Header & User */}
                        <div className="flex flex-col items-center gap-4 relative z-10">
                            <div className="relative group cursor-pointer">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
                                <div className="w-[88px] h-[88px] rounded-full p-[3px] bg-gradient-to-tr from-purple-500 to-pink-500 relative z-10">
                                    <div className="w-full h-full rounded-full border-4 border-[#121212] overflow-hidden bg-black">
                                        <img
                                            src={note.user.avatar || note.user.image || `https://ui-avatars.com/api/?name=${note.user.displayName || note.user.name}`}
                                            alt={note.user.displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <h3 className="text-xl font-anton text-white tracking-wide">{note.user.displayName || note.user.name}</h3>
                                <div className="flex items-center gap-2 justify-center text-sm mt-1">
                                    <span className="text-white/40">@{note.user.username}</span>
                                    <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                                    <span className="text-white/40">
                                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: es })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Content Area */}
                        <div className="w-full space-y-4">

                            {/* Text Bubble */}
                            {note.text && (
                                <div className="w-full bg-white/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                                    <div className="absolute -top-4 -left-4 text-white/5 group-hover:text-white/10 transition-colors">
                                        <LucideMessageCircle size={80} />
                                    </div>
                                    <p className="text-lg font-medium text-center text-white/90 leading-relaxed relative z-10 break-words">
                                        "{note.text}"
                                    </p>
                                </div>
                            )}

                            {/* Music Player Card */}
                            {note.musicUrl && (
                                <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 group">
                                    {/* Blurred Background Cover */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center opacity-40 blur-xl scale-110 group-hover:scale-125 transition-transform duration-700"
                                        style={{ backgroundImage: `url(${note.musicCover})` }}
                                    ></div>
                                    <div className="absolute inset-0 bg-black/40"></div>

                                    <div className="relative z-10 p-4 flex items-center gap-4">
                                        <div className="relative w-14 h-14 flex-shrink-0 cursor-pointer" onClick={togglePlay}>
                                            <img
                                                src={note.musicCover}
                                                className={`w-full h-full rounded-xl object-cover shadow-lg ${isPlaying ? 'animate-pulse' : ''}`}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                {isPlaying ? <LucidePause size={24} className="text-white fill-current" /> : <LucidePlay size={24} className="text-white fill-current" />}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <LucideMusic size={12} className="text-purple-400" />
                                                <p className="text-sm font-bold text-white truncate">{note.musicTitle}</p>
                                            </div>
                                            <p className="text-xs text-white/60 truncate">{note.musicArtist}</p>
                                        </div>

                                        {/* Visualizer Bars */}
                                        <div className="flex gap-[3px] items-end h-6 pr-2">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1 bg-white rounded-full transition-all duration-300 ${isPlaying ? 'animate-equalizer' : 'h-1.5 opacity-30'
                                                        }`}
                                                    style={{
                                                        // Variamos la duración para que cada barra tenga su propio ritmo
                                                        animationDuration: `${0.4 + (i * 0.15)}s`,
                                                        // Añadimos un delay negativo para que la animación empiece en puntos distintos
                                                        animationDelay: `-${i * 0.2}s`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Actions */}
                        <div className="flex gap-3 w-full">
                            {isOwner ? (
                                <>
                                    <button
                                        onClick={onReplace}
                                        className="flex-1 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                                    >
                                        <LucideRefreshCw size={18} />
                                        <span>Actualizar</span>
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="py-3.5 px-5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-2xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <LucideTrash2 size={20} />
                                    </button>
                                </>
                            ) : (
                                <button className="flex-1 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-white/10">
                                    <LucideCornerUpLeft size={18} />
                                    <span>Responder</span>
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    // Renderizamos en el body usando Portal para saltarnos cualquier restricción de z-index o overflow
    return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}