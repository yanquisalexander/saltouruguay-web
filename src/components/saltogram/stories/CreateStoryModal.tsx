import { useState, useRef } from "preact/hooks";
import { LucideX, LucideUploadCloud, LucideLoader2, LucideImage, LucideVideo, LucideStar, LucideGlobe, LucideUsers } from "lucide-preact";
import { toast } from "sonner";

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: Event) => {
        const selectedFile = (e.target as HTMLInputElement).files?.[0];
        if (!selectedFile) return;

        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error("El archivo es demasiado grande (Máx 10MB)");
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
                setDuration(video.duration);
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
            formData.append("duration", duration.toString());
            formData.append("visibility", visibility);

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
            <div className="bg-[#242526] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg">Crear Historia</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white">
                        <LucideX size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {!preview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/20 rounded-xl h-64 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-colors group"
                        >
                            <div className="p-4 bg-blue-500/10 rounded-full text-blue-400 group-hover:scale-110 transition-transform">
                                <LucideUploadCloud size={40} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">Sube una foto o video</p>
                                <p className="text-white/40 text-sm">PNG, JPG, MP4 (Max 10MB)</p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative h-96 bg-black rounded-xl overflow-hidden flex items-center justify-center">
                            {mediaType === 'image' ? (
                                <img src={preview} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <video src={preview} className="max-w-full max-h-full object-contain" controls />
                            )}
                            <button
                                onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500/80 transition-colors"
                            >
                                <LucideX size={20} />
                            </button>
                            
                            {/* Visibility Toggle Overlay */}
                            <button
                                onClick={toggleVisibility}
                                className={`absolute bottom-4 right-4 p-2 rounded-full transition-colors flex items-center gap-2 px-4 ${
                                    visibility === 'vip' ? 'bg-green-500 text-white' : 
                                    visibility === 'friends' ? 'bg-blue-500 text-white' :
                                    'bg-black/50 text-white/70 hover:bg-black/70'
                                }`}
                            >
                                {visibility === 'vip' && <LucideStar size={18} fill="currentColor" />}
                                {visibility === 'friends' && <LucideUsers size={18} />}
                                {visibility === 'public' && <LucideGlobe size={18} />}
                                <span className="text-sm font-medium">
                                    {visibility === 'vip' ? "Mejores Amigos" : 
                                     visibility === 'friends' ? "Solo Amigos" : "Público"}
                                </span>
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                    />

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={!file || loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {loading && <LucideLoader2 size={18} className="animate-spin" />}
                            {loading ? "Publicando..." : "Compartir en Historia"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
