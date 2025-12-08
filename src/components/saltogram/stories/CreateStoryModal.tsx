import { useState, useRef, useEffect } from "preact/hooks";
import { LucideX, LucideUploadCloud, LucideLoader2, LucideImage, LucideVideo, LucideStar, LucideGlobe, LucideUsers, LucideMusic, LucideTrash2, LucideMaximize2, LucidePlay, LucidePause, LucideType, LucideRotateCw } from "lucide-preact";
import { toast } from "sonner";
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import MusicPicker from "./MusicPicker";

interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

interface TextElement {
    id: string;
    content: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    color: string;
    backgroundColor: string;
    font: string;
}

const FONTS = [
    { name: 'Clásica', class: 'font-sans' },
    { name: 'Moderna', class: 'font-rubik' },
    { name: 'Impacto', class: 'font-anton' },
    { name: 'Neon', class: 'font-teko' },
    { name: 'Manuscrita', class: 'font-playwrite' },
    { name: 'Retro', class: 'font-press-start-2p' },
    { name: 'Minecraft', class: 'font-minecraft' },
    { name: 'Squids', class: 'font-squids' },
];

const COLORS = [
    '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'
];

export default function CreateStoryModal({ isOpen, onClose, onCreated }: CreateStoryModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [duration, setDuration] = useState(5);
    const [visibility, setVisibility] = useState<'public' | 'friends' | 'vip'>('public');
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState<any | null>(null);
    const [stickerConfig, setStickerConfig] = useState({ x: 50, y: 50, scale: 1, rotation: 0 });
    const [musicStart, setMusicStart] = useState(0);
    const [musicDuration, setMusicDuration] = useState(15);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    // Text State
    const [texts, setTexts] = useState<TextElement[]>([]);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [textInput, setTextInput] = useState("");
    const [selectedFont, setSelectedFont] = useState(FONTS[0].class);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [selectedBgColor, setSelectedBgColor] = useState('transparent');
    const [activeElementId, setActiveElementId] = useState<string | null>(null); // 'music' or textId

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
            setStickerConfig({ x: 50, y: 50, scale: 1, rotation: 0 });
            setMusicStart(0);
            setMusicDuration(15);
            setIsPlayingPreview(false);
            setTexts([]);
            setEditingTextId(null);
            setActiveElementId(null);

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
            const width = waveformContainerRef.current.clientWidth || 300;

            // Instagram-like gradient for progress (played part) - Horizontal
            const progressGradient = ctx!.createLinearGradient(0, 0, width, 0);
            progressGradient.addColorStop(0, '#833AB4');   // Purple
            progressGradient.addColorStop(0.5, '#FD1D1D'); // Red/Pink
            progressGradient.addColorStop(1, '#FCAF45');   // Orange/Yellow

            const ws = WaveSurfer.create({
                container: waveformContainerRef.current,
                waveColor: 'rgba(255, 255, 255, 0.5)',
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

    const handleFileChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            const file = target.files[0];
            setFile(file);
            setPreview(URL.createObjectURL(file));
            setMediaType(file.type.startsWith('video') ? 'video' : 'image');
        }
    };

    const handleAddText = () => {
        const newText: TextElement = {
            id: crypto.randomUUID(),
            content: "Texto",
            x: 50,
            y: 50,
            scale: 1,
            rotation: 0,
            color: COLORS[0],
            backgroundColor: 'transparent',
            font: FONTS[0].class
        };
        setTexts([...texts, newText]);
        setEditingTextId(newText.id);
        setTextInput(newText.content);
        setSelectedFont(newText.font);
        setSelectedColor(newText.color);
        setSelectedBgColor(newText.backgroundColor);
        setActiveElementId(newText.id);
    };

    const handleUpdateText = (id: string, updates: Partial<TextElement>) => {
        setTexts(texts.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const handleDeleteText = (id: string) => {
        setTexts(texts.filter(t => t.id !== id));
        if (editingTextId === id) {
            setEditingTextId(null);
            setActiveElementId(null);
        }
    };

    const handleTextDragStart = (e: MouseEvent | TouchEvent, id: string) => {
        e.stopPropagation();
        setActiveElementId(id);
        const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const text = texts.find(t => t.id === id);
        if (!text) return;

        const startLeft = text.x;
        const startTop = text.y;

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const container = document.getElementById('story-preview-container');
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const deltaX = ((currentX - startX) / rect.width) * 100;
            const deltaY = ((currentY - startY) / rect.height) * 100;

            handleUpdateText(id, {
                x: Math.max(0, Math.min(100, startLeft + deltaX)),
                y: Math.max(0, Math.min(100, startTop + deltaY))
            });
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);
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
                    },
                    texts: texts
                }));
            } else if (texts.length > 0) {
                formData.append("metadata", JSON.stringify({
                    texts: texts
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
                            id="story-preview-container"
                            className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
                            onClick={() => {
                                setEditingTextId(null);
                                setActiveElementId(null);
                            }}
                        >
                            {mediaType === 'video' ? (
                                <video src={preview} className="max-w-full max-h-full object-contain pointer-events-none" />
                            ) : (
                                <img src={preview} className="max-w-full max-h-full object-contain pointer-events-none" />
                            )}

                            {/* Text Elements */}
                            {texts.map((text) => (
                                <div
                                    key={text.id}
                                    className={`absolute cursor-move select-none group ${text.font}`}
                                    style={{
                                        left: `${text.x}%`,
                                        top: `${text.y}%`,
                                        transform: `translate(-50%, -50%) scale(${text.scale}) rotate(${text.rotation}deg)`,
                                        color: text.color,
                                        backgroundColor: text.backgroundColor,
                                        zIndex: activeElementId === text.id ? 50 : 20,
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        border: activeElementId === text.id ? '2px dashed rgba(255,255,255,0.5)' : 'none'
                                    }}
                                    onMouseDown={(e) => handleTextDragStart(e, text.id)}
                                    onTouchStart={(e) => handleTextDragStart(e, text.id)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTextId(text.id);
                                        setActiveElementId(text.id);
                                        setTextInput(text.content);
                                        setSelectedFont(text.font);
                                        setSelectedColor(text.color);
                                        setSelectedBgColor(text.backgroundColor);
                                    }}
                                >
                                    <span className="whitespace-pre-wrap text-2xl font-bold drop-shadow-lg pointer-events-none">
                                        {text.content}
                                    </span>

                                    {activeElementId === text.id && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteText(text.id); }}
                                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 z-50"
                                            >
                                                <LucideTrash2 size={14} />
                                            </button>

                                            {/* Rotate Handle */}
                                            <div
                                                className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black rounded-full p-1.5 shadow-md cursor-grab active:cursor-grabbing z-50"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    const startX = e.clientX;
                                                    const startRotation = text.rotation;
                                                    const handleRotate = (moveEvent: MouseEvent) => {
                                                        const deltaX = moveEvent.clientX - startX;
                                                        handleUpdateText(text.id, { rotation: startRotation + deltaX });
                                                    };
                                                    const handleUp = () => {
                                                        window.removeEventListener('mousemove', handleRotate);
                                                        window.removeEventListener('mouseup', handleUp);
                                                    };
                                                    window.addEventListener('mousemove', handleRotate);
                                                    window.addEventListener('mouseup', handleUp);
                                                }}
                                            >
                                                <LucideRotateCw size={14} />
                                            </div>

                                            {/* Scale Handle */}
                                            <div
                                                className="absolute -bottom-3 -right-3 bg-blue-500 text-white rounded-full p-1.5 shadow-md cursor-nwse-resize z-50"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    const startY = e.clientY;
                                                    const startScale = text.scale;
                                                    const handleScale = (moveEvent: MouseEvent) => {
                                                        const deltaY = startY - moveEvent.clientY;
                                                        handleUpdateText(text.id, { scale: Math.max(0.5, Math.min(5, startScale + deltaY * 0.01)) });
                                                    };
                                                    const handleUp = () => {
                                                        window.removeEventListener('mousemove', handleScale);
                                                        window.removeEventListener('mouseup', handleUp);
                                                    };
                                                    window.addEventListener('mousemove', handleScale);
                                                    window.addEventListener('mouseup', handleUp);
                                                }}
                                            >
                                                <LucideMaximize2 size={14} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Music Sticker */}
                            {selectedMusic && (
                                <div
                                    className="absolute bg-white/90 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 shadow-xl max-w-[80%] cursor-move touch-none select-none group"
                                    style={{
                                        left: `${stickerConfig.x}%`,
                                        top: `${stickerConfig.y}%`,
                                        transform: `translate(-50%, -50%) scale(${stickerConfig.scale}) rotate(${stickerConfig.rotation}deg)`,
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

                                    {/* Rotate Handle */}
                                    <div
                                        className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black rounded-full p-1.5 shadow-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                            const startX = e.clientX;
                                            const startRotation = stickerConfig.rotation;

                                            const handleRotate = (moveEvent: PointerEvent) => {
                                                const deltaX = moveEvent.clientX - startX;
                                                setStickerConfig(prev => ({ ...prev, rotation: startRotation + deltaX }));
                                            };

                                            const handleUp = () => {
                                                window.removeEventListener('pointermove', handleRotate);
                                                window.removeEventListener('pointerup', handleUp);
                                            };

                                            window.addEventListener('pointermove', handleRotate);
                                            window.addEventListener('pointerup', handleUp);
                                        }}
                                    >
                                        <LucideRotateCw size={12} />
                                    </div>

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

                            {/* Text Editor Controls */}
                            {editingTextId && (
                                <div
                                    className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-4 flex flex-col gap-4 z-40 animate-in slide-in-from-bottom-10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="text"
                                        value={textInput}
                                        onChange={(e) => {
                                            const val = (e.target as HTMLInputElement).value;
                                            setTextInput(val);
                                            handleUpdateText(editingTextId, { content: val });
                                        }}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/50"
                                        placeholder="Escribe algo..."
                                        autoFocus
                                    />

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-white/60 font-medium uppercase">Fuente</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {FONTS.map((font) => (
                                                <button
                                                    key={font.name}
                                                    onClick={() => {
                                                        setSelectedFont(font.class);
                                                        handleUpdateText(editingTextId, { font: font.class });
                                                    }}
                                                    className={`
                                                        px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all
                                                        ${selectedFont === font.class
                                                            ? 'bg-white text-black font-bold'
                                                            : 'bg-white/10 text-white hover:bg-white/20'}
                                                        ${font.class}
                                                    `}
                                                >
                                                    {font.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-white/60 font-medium uppercase">Color</label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
                                                {COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        onClick={() => {
                                                            setSelectedColor(color);
                                                            handleUpdateText(editingTextId, { color: color });
                                                        }}
                                                        className={`
                                                            w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shrink-0
                                                            ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}
                                                        `}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>

                                            <div className="w-px h-8 bg-white/20 mx-2"></div>

                                            <button
                                                onClick={() => {
                                                    const newBg = selectedBgColor === 'transparent' ? 'rgba(0,0,0,0.5)' : selectedBgColor === 'rgba(0,0,0,0.5)' ? 'rgba(255,255,255,0.5)' : 'transparent';
                                                    setSelectedBgColor(newBg);
                                                    handleUpdateText(editingTextId, { backgroundColor: newBg });
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 whitespace-nowrap"
                                            >
                                                Fondo: {selectedBgColor === 'transparent' ? 'Ninguno' : selectedBgColor.includes('0,0,0') ? 'Oscuro' : 'Claro'}
                                            </button>
                                        </div>
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
                                <button
                                    onClick={handleAddText}
                                    className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                                    title="Añadir texto"
                                >
                                    <LucideType size={20} />
                                </button>
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
