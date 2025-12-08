import { useState, useEffect } from "preact/hooks";
import { LucideX, LucideMusic, LucideLoader2, LucideGlobe, LucideUsers, LucideStar, LucideTrash2 } from "lucide-preact";
import { actions } from "astro:actions";
import { toast } from "sonner";
import MusicPicker from "../stories/MusicPicker";

interface CreateNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    existingNote?: any;
}

export default function CreateNoteModal({ isOpen, onClose, onCreated, existingNote }: CreateNoteModalProps) {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState<any | null>(null);
    const [visibility, setVisibility] = useState<'public' | 'friends' | 'vip'>('public');

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#242526] w-full max-w-md rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                {showMusicPicker ? (
                    <div className="h-[500px]">
                        <MusicPicker
                            onSelect={(track) => {
                                setSelectedMusic(track);
                                setShowMusicPicker(false);
                            }}
                            onClose={() => setShowMusicPicker(false)}
                        />
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Nueva nota</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">
                                <LucideX size={24} />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center gap-6">
                            {/* Avatar & Bubble Preview */}
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-gray-700 overflow-hidden border-2 border-white/10">
                                    {/* User avatar would go here, but we might not have it in props easily without passing it down. 
                                        For preview we can just show a placeholder or nothing. */}
                                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                                </div>

                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-2 rounded-2xl rounded-bl-none shadow-lg min-w-[100px] text-center animate-fade-in-up">
                                    {selectedMusic && (
                                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full shadow-sm z-20">
                                            <LucideMusic size={10} />
                                        </div>
                                    )}
                                    <p className="text-sm font-medium leading-tight break-words">
                                        {text || (selectedMusic ? `🎵 ${selectedMusic.title}` : "Tu pensamiento...")}
                                    </p>
                                </div>
                            </div>

                            <div className="w-full space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">
                                        Mensaje ({text.length}/60)
                                    </label>
                                    <textarea
                                        value={text}
                                        onInput={(e) => setText(e.currentTarget.value.slice(0, 60))}
                                        placeholder="Comparte un pensamiento..."
                                        className="w-full bg-[#18191a] border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none h-24"
                                    />
                                </div>

                                {selectedMusic ? (
                                    <div className="flex items-center gap-3 bg-[#18191a] p-3 rounded-lg border border-white/10">
                                        <img
                                            src={selectedMusic.album.cover_small}
                                            className="w-10 h-10 rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{selectedMusic.title}</p>
                                            <p className="text-xs text-gray-400 truncate">{selectedMusic.artist.name}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedMusic(null)}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <LucideTrash2 size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowMusicPicker(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#18191a] hover:bg-[#3a3b3c] border border-white/10 rounded-lg text-gray-300 transition-colors"
                                    >
                                        <LucideMusic size={18} />
                                        <span>Añadir música</span>
                                    </button>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">
                                        Visibilidad
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setVisibility('public')}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${visibility === 'public'
                                                ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                                                : 'bg-[#18191a] border-white/10 text-gray-400 hover:bg-[#3a3b3c]'
                                                }`}
                                        >
                                            <LucideGlobe size={18} />
                                            <span className="text-xs">Público</span>
                                        </button>
                                        <button
                                            onClick={() => setVisibility('friends')}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${visibility === 'friends'
                                                ? 'bg-green-500/10 border-green-500 text-green-500'
                                                : 'bg-[#18191a] border-white/10 text-gray-400 hover:bg-[#3a3b3c]'
                                                }`}
                                        >
                                            <LucideUsers size={18} />
                                            <span className="text-xs">Amigos</span>
                                        </button>
                                        <button
                                            onClick={() => setVisibility('vip')}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${visibility === 'vip'
                                                ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                                                : 'bg-[#18191a] border-white/10 text-gray-400 hover:bg-[#3a3b3c]'
                                                }`}
                                        >
                                            <LucideStar size={18} />
                                            <span className="text-xs">VIP</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-[#18191a]">
                            {existingNote ? (
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Eliminar
                                </button>
                            ) : <div />}

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-300 hover:text-white font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || (!text && !selectedMusic)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm flex items-center gap-2"
                                >
                                    {loading && <LucideLoader2 size={16} className="animate-spin" />}
                                    {existingNote ? 'Actualizar' : 'Compartir'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
