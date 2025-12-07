import { useState, useEffect, useRef } from "preact/hooks";
import { LucideSearch, LucideMusic, LucidePlay, LucidePause, LucideLoader2 } from "lucide-preact";

interface Track {
    id: number;
    title: string;
    artist: { name: string };
    album: { cover_small: string; cover_medium: string };
    preview: string;
}

interface MusicPickerProps {
    onSelect: (track: Track) => void;
    onClose: () => void;
}

export default function MusicPicker({ onSelect, onClose }: MusicPickerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Track[]>([]);
    const [loading, setLoading] = useState(false);
    const [playingPreview, setPlayingPreview] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                searchMusic();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const searchMusic = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/deezer/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setResults(data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const togglePreview = (previewUrl: string) => {
        if (playingPreview === previewUrl) {
            audioRef.current?.pause();
            setPlayingPreview(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(previewUrl);
            audioRef.current.play();
            setPlayingPreview(previewUrl);
            audioRef.current.onended = () => setPlayingPreview(null);
        }
    };

    // Stop audio when unmounting
    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    return (
        <div className="absolute inset-0 bg-[#18191a] z-20 flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <div className="relative flex-1">
                    <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                        type="text"
                        value={query}
                        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                        placeholder="Buscar música..."
                        className="w-full bg-[#242526] text-white rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        autoFocus
                    />
                </div>
                <button onClick={onClose} className="text-white font-medium text-sm">Cancelar</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <LucideLoader2 className="animate-spin text-white/40" />
                    </div>
                ) : results.length > 0 ? (
                    <div className="space-y-1">
                        {results.map(track => (
                            <div key={track.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group">
                                <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                                    <img src={track.album.cover_small} alt={track.title} className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePreview(track.preview); }}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        {playingPreview === track.preview ? <LucidePause size={20} className="text-white" /> : <LucidePlay size={20} className="text-white" />}
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(track)}>
                                    <p className="text-white font-medium truncate">{track.title}</p>
                                    <p className="text-white/50 text-sm truncate">{track.artist.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-white/30 gap-2">
                        <LucideMusic size={32} />
                        <p>Busca tus canciones favoritas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
