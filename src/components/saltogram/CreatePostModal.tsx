import { useState, useRef } from "react";
import type { SaltogramPost } from "@/types/saltogram";
import { toast } from "sonner";
import { X, Image, Upload } from "lucide-react";

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPostCreated: (post: SaltogramPost) => void;
    user: any;
}

export default function CreatePostModal({
    isOpen,
    onClose,
    onPostCreated,
    user,
}: CreatePostModalProps) {
    const [text, setText] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error("La imagen es demasiado grande. Máximo 10MB.");
                return;
            }

            // Check file type
            if (!file.type.startsWith("image/")) {
                toast.error("Por favor selecciona una imagen válida.");
                return;
            }

            setImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!text.trim() && !image) {
            toast.error("Debes agregar texto o una imagen");
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            if (text.trim()) {
                formData.append("text", text.trim());
            }
            if (image) {
                formData.append("image", image);
            }

            const response = await fetch("/api/saltogram/posts", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                onPostCreated(data.post);
                setText("");
                setImage(null);
                setImagePreview(null);
            } else {
                toast.error(data.error || "Error al crear la publicación");
            }
        } catch (error) {
            console.error("Error creating post:", error);
            toast.error("Error al crear la publicación");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white">
                        Nueva Publicación
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-4">
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                            <img
                                src={
                                    user.avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
                                }
                                alt={user.displayName}
                                className="w-12 h-12 rounded-full border-2 border-purple-500/30"
                            />
                            <div>
                                <p className="font-bold text-white">
                                    {user.displayName}
                                </p>
                                <p className="text-sm text-white/50">
                                    @{user.username}
                                </p>
                            </div>
                        </div>

                        {/* Text Input */}
                        <textarea
                            value={text}
                            onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
                            placeholder="¿Qué quieres compartir?"
                            maxLength={500}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-white/10 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                            disabled={submitting}
                        />
                        <p className="text-xs text-white/40 text-right">
                            {text.length}/500 caracteres
                        </p>

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full rounded-lg max-h-96 object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {/* Image Upload */}
                        {!imagePreview && (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg border border-white/10 hover:border-purple-500 transition-colors w-full justify-center"
                                >
                                    <Image size={20} />
                                    <span>Agregar imagen</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || (!text.trim() && !image)}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Publicando...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={20} />
                                    <span>Publicar</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
