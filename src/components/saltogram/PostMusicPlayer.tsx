import { useState, useRef, useEffect } from "preact/hooks";
import { LucidePlay, LucidePause } from "lucide-preact";
import WaveSurfer from 'wavesurfer.js';

interface PostMusicPlayerProps {
    music: any;
}

export default function PostMusicPlayer({ music }: PostMusicPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState(music.preview);

    useEffect(() => {
        let active = true;
        if (music.id) {
            fetch(`/api/deezer/track?id=${music.id}`)
                .then(res => res.json())
                .then(data => {
                    if (active && data.preview && data.preview !== music.preview) {
                        setAudioUrl(data.preview);
                    }
                })
                .catch(err => console.error("Error refreshing music URL:", err));
        }
        return () => { active = false; };
    }, [music]);

    useEffect(() => {
        if (containerRef.current) {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }

            // Create gradients
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const width = containerRef.current.clientWidth || 300;

            const progressGradient = ctx!.createLinearGradient(0, 0, width, 0);
            progressGradient.addColorStop(0, '#833AB4');   // Purple
            progressGradient.addColorStop(0.5, '#FD1D1D'); // Red/Pink
            progressGradient.addColorStop(1, '#FCAF45');   // Orange/Yellow

            const ws = WaveSurfer.create({
                container: containerRef.current,
                waveColor: 'rgba(255, 255, 255, 1)',
                progressColor: progressGradient,
                cursorColor: 'transparent',
                barWidth: 2,
                barGap: 2,
                barRadius: 2,
                height: 30,
                url: audioUrl,
                normalize: false,
            }); ws.on('play', () => setIsPlaying(true));
            ws.on('pause', () => setIsPlaying(false));
            ws.on('finish', () => setIsPlaying(false));

            wavesurferRef.current = ws;
        }

        return () => {
            wavesurferRef.current?.destroy();
            wavesurferRef.current = null;
        };
    }, [audioUrl]);

    const togglePlay = () => {
        wavesurferRef.current?.playPause();
    };

    return (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <button
                onClick={togglePlay}
                className="relative group shrink-0 w-12 h-12 rounded-lg overflow-hidden"
            >
                <img src={music.album.cover_medium} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors group-hover:bg-black/50">
                    {isPlaying ? (
                        <LucidePause size={20} className="text-white" />
                    ) : (
                        <LucidePlay size={20} className="text-white" />
                    )}
                </div>
            </button>

            <div className="flex-1 min-w-0 flex flex-col justify-center h-12">
                <div className="flex items-center justify-between mb-1">
                    <div className="truncate pr-2">
                        <p className="text-white font-bold text-sm truncate leading-tight">{music.title}</p>
                        <p className="text-white/50 text-xs truncate leading-tight">{music.artist.name}</p>
                    </div>
                </div>
                <div ref={containerRef} className="w-full" />
            </div>
        </div>
    );
}
