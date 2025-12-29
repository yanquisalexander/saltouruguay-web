import { useState, useEffect } from "preact/hooks";
import { createPortal } from 'preact/compat';
import { LucideX, LucideMusic, LucideLoader2, LucideGlobe, LucideUsers, LucideStar, LucideTrash2, LucideHeadphones } from "lucide-preact";
import { actions } from "astro:actions";
import { toast } from "sonner";
import MusicPicker from "../stories/MusicPicker";

interface CreateNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    existingNote?: any;
    currentUser?: any; // Añadido para mostrar el avatar real en el preview
}

export default function CreateNoteModal({ isOpen, onClose, onCreated, existingNote, currentUser }: CreateNoteModalProps) {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState<any | null>(null);
    const [visibility, setVisibility] = useState<'public' | 'friends' | 'vip'>('public');

    // Clases reutilizables
    const glassPanel = "bg-[#121212]/80 backdrop-blur-xl border border-white/10 shadow-2xl";
    const glassInput = "bg-white/5 border border-white/10 focus:border-white/30 focus:bg-black/40 transition-all outline-none text-white placeholder:text-white/30";

    useEffect(() => {
        if (isOpen) {
            if (existingNote) {
                setText(existingNote.text || "");
                if (existingNote.musicUrl) {
                    setSelectedMusic({
                        id: existingNote.musicTrackId,
                        title: existingNote.musicTitle,
                        artist: { name: existingNote.musicArtist },
                        album: { cover_small: existingNote.musicCover },
                        preview: existingNote.musicUrl
                    });
                }
            } else {
                setText("");
                setSelectedMusic(null);
            }
            setVisibility('public');
        }
    }, [isOpen, existingNote]);

    const handleSubmit = async () => {
        if (!text && !selectedMusic) {
            toast.error("Debes añadir texto o música");
            return;
        }

        setLoading(true);
        try {
            const { error } = await actions.notes.create({
                text: text || undefined,
                musicUrl: selectedMusic?.preview,
                musicTrackId: selectedMusic?.id?.toString(),
                musicTitle: selectedMusic?.title,
                musicArtist: selectedMusic?.artist?.name,
                musicCover: selectedMusic?.album?.cover_small,
                visibility
            });

            if (error) throw error;

            toast.success("Nota publicada");
            onCreated();
        } catch (e) {
            console.error(e);
            toast.error("Error al publicar la nota");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Seguro que quieres eliminar tu nota?")) return;

        setLoading(true);
        try {
            const { error } = await actions.notes.delete({});
            if (error) throw error;

            toast.success("Nota eliminada");
            onCreated();
        } catch (e) {
            console.error(e);
            toast.error("Error al eliminar");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const content = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop con blur */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            <div className={`relative w-full max-w-md ${glassPanel} rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]`}>

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-bold text-white tracking-wide">
                        {showMusicPicker ? "Seleccionar música" : (existingNote ? "Editar nota" : "Nueva nota")}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <LucideX size={20} />
                    </button>
                </div>

                {showMusicPicker ? (
                    <div className="flex-1 overflow-hidden min-h-[400px]">
                        <MusicPicker
                            onSelect={(track) => {
                                setSelectedMusic(track);
                                setShowMusicPicker(false);
                            }}
                            onClose={() => setShowMusicPicker(false)}
                        />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 flex flex-col items-center gap-8">

                            {/* --- PREVIEW SECTION --- */}
                            <div className="flex flex-col items-center gap-3 pt-4">
                                {/* Bubble Preview */}
                                <div className="relative animate-fade-in-up">
                                    <div className={`
                                        bg-black/60 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-purple-500/10
                                        px-4 py-3 rounded-2xl rounded-bl-none 
                                        min-w-[120px] max-w-[200px] text-center relative
                                        flex flex-col items-center justify-center gap-1
                                    `}>
                                        {selectedMusic && (
                                            <div className="absolute -top-3 -right-3 bg-gradient-to-tr from-purple-500 to-pink-500 text-white p-1.5 rounded-full shadow-lg z-20 animate-bounce-in">
                                                <LucideMusic size={12} />
                                            </div>
                                        )}

                                        {selectedMusic ? (
                                            <>
                                                <div className="flex items-center gap-1.5 text-purple-300 w-full justify-center">
                                                    <LucideHeadphones size={12} />
                                                    <span className="text-xs font-bold truncate max-w-[140px]">{selectedMusic.title}</span>
                                                </div>
                                                <span className="text-[10px] text-white/50 truncate w-full">{selectedMusic.artist.name}</span>
                                            </>
                                        ) : null}

                                        <p className={`font-medium leading-tight break-words w-full ${selectedMusic ? 'text-xs mt-1 text-white/90' : 'text-sm'}`}>
                                            {text || (selectedMusic ? `"${text}"` : "Tu pensamiento...")}
                                        </p>

                                        {/* Triangle */}
                                        <div className="absolute -bottom-1.5 left-0 w-3 h-3 bg-black/60 border-l border-b border-white/10 transform rotate-45"></div>
                                    </div>
                                </div>

                                {/* Avatar Preview */}
                                <div className="w-[72px] h-[72px] rounded-full p-[3px] bg-gradient-to-tr from-purple-500 via-pink-500 to-yellow-500 shadow-lg shadow-purple-500/20">
                                    <div className="w-full h-full rounded-full border-[3px] border-[#121212] overflow-hidden bg-black">
                                        <img
                                            src={currentUser?.image || `https://ui-avatars.com/api/?name=Yo`}
                                            className="w-full h-full object-cover"
                                            alt="Preview"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* --- INPUTS SECTION --- */}
                            <div className="w-full space-y-5">
                                {/* Text Input */}
                                <div className="relative group">
                                    <textarea
                                        value={text}
                                        onInput={(e) => setText(e.currentTarget.value.slice(0, 60))}
                                        placeholder="¿Qué estás pensando?"
                                        className={`w-full ${glassInput} rounded-2xl p-4 resize-none h-28 text-base`}
                                    />
                                    <div className="absolute bottom-3 right-3 text-xs font-mono transition-colors duration-300">
                                        <span className={text.length >= 60 ? "text-red-400" : "text-white/30"}>
                                            {text.length}
                                        </span>
                                        <span className="text-white/10">/60</span>
                                    </div>
                                </div>

                                {/* Music Selector */}
                                {selectedMusic ? (
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 group hover:bg-white/10 transition-colors">
                                        <img
                                            src={selectedMusic.album.cover_small}
                                            className="w-12 h-12 rounded-lg shadow-sm"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{selectedMusic.title}</p>
                                            <p className="text-xs text-white/50 truncate">{selectedMusic.artist.name}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedMusic(null)}
                                            className="text-white/30 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all"
                                        >
                                            <LucideTrash2 size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowMusicPicker(true)}
                                        className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/40 transition-all duration-300 group`}
                                    >
                                        <div className="p-1.5 bg-white/5 rounded-full group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                            <LucideMusic size={16} />
                                        </div>
                                        <span className="text-sm font-medium">Añadir canción</span>
                                    </button>
                                )}

                                {/* Visibility Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-white/40 mb-3 uppercase tracking-wider ml-1">
                                        ¿Quién puede ver esto?
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'public', icon: LucideGlobe, label: 'Público', color: 'blue' },
                                            { id: 'friends', icon: LucideUsers, label: 'Amigos', color: 'green' },
                                            { id: 'vip', icon: LucideStar, label: 'VIP', color: 'yellow' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setVisibility(opt.id as any)}
                                                className={`
                                                    flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300
                                                    ${visibility === opt.id
                                                        ? `bg-${opt.color}-500/20 border-${opt.color}-500/50 text-${opt.color}-400 shadow-[0_0_15px_rgba(0,0,0,0.3)] scale-[1.02]`
                                                        : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/70'
                                                    }
                                                `}
                                            >
                                                <opt.icon size={20} />
                                                <span className="text-xs font-medium">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {!showMusicPicker && (
                    <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md flex justify-between items-center">
                        {existingNote ? (
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                <LucideTrash2 size={16} />
                                <span className="hidden sm:inline">Eliminar</span>
                            </button>
                        ) : <div />}

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-white/60 hover:text-white font-medium text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || (!text && !selectedMusic)}
                                className={`
                                    px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg
                                    transition-all duration-300
                                    ${loading || (!text && !selectedMusic)
                                        ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                        : 'bg-white text-black hover:bg-gray-200 hover:scale-105 hover:shadow-white/20'
                                    }
                                `}
                            >
                                {loading && <LucideLoader2 size={16} className="animate-spin" />}
                                {existingNote ? 'Guardar Cambios' : 'Compartir Nota'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}