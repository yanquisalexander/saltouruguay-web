import { useState, useRef, useEffect } from "preact/hooks";
import { LucideX, LucideUploadCloud, LucideLoader2, LucideImage, LucideVideo, LucideStar, LucideGlobe, LucideUsers, LucideMusic, LucideTrash2, LucideMaximize2, LucidePlay, LucidePause } from "lucide-preact";
import { toast } from "sonner";
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import MusicPicker from "./MusicPicker";

interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateStoryModal({ isOpen, onClose, onCreated }: CreateStoryModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [duration, setDuration] = useState(5);
    const [visibility, setVisibility] = useState<'public' | 'friends' | 'vip'>('public');
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState<any | null>(null);
    const [stickerConfig, setStickerConfig] = useState({ x: 50, y: 50, scale: 1 });
    const [musicStart, setMusicStart] = useState(0);
    const [musicDuration, setMusicDuration] = useState(15);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    
    const waveformContainerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsPluginRef = useRef<RegionsPlugin | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setPreview(null);
            setMediaType(null);
            setDuration(5);
            setVisibility('public');
            setShowMusicPicker(false);
            setSelectedMusic(null);
            setStickerConfig({ x: 50, y: 50, scale: 1 });
            setMusicStart(0);
            setMusicDuration(15);
            setIsPlayingPreview(false);
            
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
        }
    }, [isOpen]);

    // Initialize WaveSurfer when music is selected
    useEffect(() => {
        if (selectedMusic && waveformContainerRef.current) {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }

            // Create gradients
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Vibrant gradient for progress (played part)
            const progressGradient = ctx!.createLinearGradient(0, 0, 0, 48);
            progressGradient.addColorStop(0, '#FFD700');   // Gold
            progressGradient.addColorStop(0.5, '#FFA500'); // Orange
            progressGradient.addColorStop(1, '#FF4500');   // OrangeRed

            // Dimmed gradient for the rest of the wave
            const waveGradient = ctx!.createLinearGradient(0, 0, 0, 48);
            waveGradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
            waveGradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.5)');
            waveGradient.addColorStop(1, 'rgba(255, 69, 0, 0.5)');

            const ws = WaveSurfer.create({
                container: waveformContainerRef.current,
                waveColor: waveGradient,
                progressColor: progressGradient,
                cursorColor: 'rgba(255, 255, 255, 0.5)',
                barWidth: 3,
                barGap: 2,
                barRadius: 3,
                height: 48,
                url: selectedMusic.preview,
                normalize: true,
            });

            const wsRegions = RegionsPlugin.create();
            ws.registerPlugin(wsRegions);
            regionsPluginRef.current = wsRegions;

            ws.on('decode', () => {
                // Create the initial region
                wsRegions.addRegion({
                    start: 0,
                    end: 15,
                    color: 'rgba(255, 255, 255, 0.1)',
                    drag: true,
                    resize: true,
                    minLength: 5,
                    maxLength: 30,
                });
                
                // Auto-play when ready
                ws.play();
                setIsPlayingPreview(true);
            });

            wsRegions.on('region-updated', (region) => {
                setMusicStart(region.start);
                setMusicDuration(region.end - region.start);
                // Loop playback within region
                region.play();
                setIsPlayingPreview(true);
            });

            wsRegions.on('region-clicked', (region, e) => {
                e.stopPropagation();
                region.play();
                setIsPlayingPreview(true);
            });
            
            ws.on('play', () => setIsPlayingPreview(true));
            ws.on('pause', () => setIsPlayingPreview(false));

            wavesurferRef.current = ws;

            return () => {
                ws.destroy();
            };
        }
    }, [selectedMusic]);

    const togglePlayback = (e: Event) => {
        e.stopPropagation();
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
        }
    };
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startConfig = useRef({ x: 0, y: 0, scale: 1 });

    if (!isOpen) return null;

    const handleDragStart = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        
        isDragging.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        startConfig.current = { ...stickerConfig };
    };

    const handleResizeStart = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        
        isResizing.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        startConfig.current = { ...stickerConfig };
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (!isDragging.current && !isResizing.current) return;
        if (!containerRef.current) return;

        if (isDragging.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = e.clientX - startPos.current.x;
            const deltaY = e.clientY - startPos.current.y;
            
            const percentX = (deltaX / rect.width) * 100;
            const percentY = (deltaY / rect.height) * 100;

            setStickerConfig(prev => ({
                ...prev,
                x: Math.min(100, Math.max(0, startConfig.current.x + percentX)),
                y: Math.min(100, Math.max(0, startConfig.current.y + percentY))
            }));
        } else if (isResizing.current) {
             const deltaX = e.clientX - startPos.current.x;
             const scaleDelta = deltaX * 0.005;
             
             setStickerConfig(prev => ({
                 ...prev,
                 scale: Math.max(0.5, Math.min(3, startConfig.current.scale + scaleDelta))
             }));
        }
    };

    const handlePointerUp = (e: PointerEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.releasePointerCapture(e.pointerId);
        isDragging.current = false;
        isResizing.current = false;
    };

    const handleFileSelect = (e: Event) => {
        const selectedFile = (e.target as HTMLInputElement).files?.[0];
        if (!selectedFile) return;

        if (selectedFile.size > 50 * 1024 * 1024) {
            toast.error("El archivo es demasiado grande (Máx 50MB)");
            return;
        }

        setFile(selectedFile);
        const isVideo = selectedFile.type.startsWith('video/');
        setMediaType(isVideo ? 'video' : 'image');
        const url = URL.createObjectURL(selectedFile);
        setPreview(url);

        if (isVideo) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function () {
                setDuration(Math.min(video.duration, 60));
            };
            video.src = url;
        } else {
            setDuration(5);
        }
    };

    const toggleVisibility = () => {
        if (visibility === 'public') setVisibility('friends');
        else if (visibility === 'friends') setVisibility('vip');
        else setVisibility('public');
    };

    const handleSubmit = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const finalDuration = selectedMusic ? musicDuration : duration;
            formData.append("duration", finalDuration.toString());
            formData.append("visibility", visibility);
            
            if (selectedMusic) {
                formData.append("metadata", JSON.stringify({ 
                    music: {
                        ...selectedMusic,
                        config: {
                            ...stickerConfig,
                            startTime: musicStart,
                            duration: musicDuration
                        }
                    }
                }));
            }

            const response = await fetch("/api/saltogram/stories", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Error al subir");

            toast.success("Historia publicada");
            onCreated();
        } catch (error) {
            console.error(error);
            toast.error("Error al publicar historia");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#242526] w-full max-w-md h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200 flex flex-col relative">
                
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0 z-10 bg-[#242526]">
                    <h3 className="text-white font-bold text-lg">Crear Historia</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white">
                        <LucideX size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {!preview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-colors group"
                        >
                            <div className="p-6 bg-blue-500/10 rounded-full text-blue-400 group-hover:scale-110 transition-transform">
                                <LucideUploadCloud size={48} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium text-lg">Sube una foto o video</p>
                                <p className="text-white/40 text-sm mt-1">Arrastra o haz clic para seleccionar</p>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*,video/*"
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div 
                            ref={containerRef}
                            className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
                        >
                            {mediaType === 'video' ? (
                                <video src={preview} className="max-w-full max-h-full object-contain pointer-events-none" />
                            ) : (
                                <img src={preview} className="max-w-full max-h-full object-contain pointer-events-none" />
                            )}

                            {/* Music Sticker */}
                            {selectedMusic && (
                                <div 
                                    className="absolute bg-white/90 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 shadow-xl max-w-[80%] cursor-move touch-none select-none group"
                                    style={{
                                        left: `${stickerConfig.x}%`,
                                        top: `${stickerConfig.y}%`,
                                        transform: `translate(-50%, -50%) scale(${stickerConfig.scale})`,
                                        zIndex: 10
                                    }}
                                    onPointerDown={handleDragStart}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                >
                                    <img src={selectedMusic.album.cover_medium} className="w-12 h-12 rounded-lg shadow-sm pointer-events-none" />
                                    <div className="min-w-0 pointer-events-none">
                                        <p className="text-black font-bold text-sm truncate">{selectedMusic.title}</p>
                                        <p className="text-black/60 text-xs truncate">{selectedMusic.artist.name}</p>
                                    </div>
                                    <div className="flex gap-1 items-end h-4 ml-2 pointer-events-none">
                                        <div className="w-1 bg-black/80 h-full animate-pulse"></div>
                                        <div className="w-1 bg-black/80 h-2/3 animate-pulse delay-75"></div>
                                        <div className="w-1 bg-black/80 h-full animate-pulse delay-150"></div>
                                    </div>
                                    
                                    {/* Delete Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedMusic(null); }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 z-20"
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <LucideX size={12} />
                                    </button>

                                    {/* Resize Handle */}
                                    <div 
                                        className="absolute -bottom-3 -right-3 bg-blue-500 text-white rounded-full p-1.5 shadow-md cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        onPointerDown={handleResizeStart}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                    >
                                        <LucideMaximize2 size={12} />
                                    </div>
                                </div>
                            )}

                            {/* Music Controls */}
                            {selectedMusic && (
                                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-3 flex flex-col gap-3 z-30 animate-in slide-in-from-bottom-10">
                                    <div className="flex items-center justify-between text-white/80 text-xs">
                                        <span>{musicStart.toFixed(1)}s</span>
                                        <span className="font-bold text-white">{musicDuration.toFixed(1)}s</span>
                                        <span>{(musicStart + musicDuration).toFixed(1)}s</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={togglePlayback}
                                            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                                        >
                                            {isPlayingPreview ? <LucidePause size={20} /> : <LucidePlay size={20} />}
                                        </button>

                                        {/* WaveSurfer Container */}
                                        <div 
                                            ref={waveformContainerRef}
                                            className="relative flex-1 h-12 bg-white/10 rounded-lg overflow-hidden cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tools Overlay */}
                            <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
                                {mediaType !== 'video' && (
                                    <button 
                                        onClick={() => setShowMusicPicker(true)}
                                        className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                                        title="Añadir música"
                                    >
                                        <LucideMusic size={20} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => { setFile(null); setPreview(null); setSelectedMusic(null); }}
                                    className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all"
                                    title="Descartar"
                                >
                                    <LucideTrash2 size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Music Picker Overlay */}
                    {showMusicPicker && (
                        <MusicPicker 
                            onSelect={(track) => {
                                setSelectedMusic(track);
                                setMusicStart(0);
                                setShowMusicPicker(false);
                            }}
                            onClose={() => setShowMusicPicker(false)}
                        />
                    )}
                </div>

                {/* Footer */}
                {preview && (
                    <div className="p-4 border-t border-white/10 bg-[#242526] shrink-0 flex justify-between items-center gap-4">
                        <button
                            onClick={toggleVisibility}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                ${visibility === 'public' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : ''}
                                ${visibility === 'friends' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : ''}
                                ${visibility === 'vip' ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : ''}
                            `}
                        >
                            {visibility === 'public' && <><LucideGlobe size={16} /> Público</>}
                            {visibility === 'friends' && <><LucideUsers size={16} /> Amigos</>}
                            {visibility === 'vip' && <><LucideStar size={16} /> VIP</>}
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <LucideLoader2 className="animate-spin" size={20} /> : "Compartir Historia"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
