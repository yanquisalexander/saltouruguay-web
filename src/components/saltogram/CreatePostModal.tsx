import { useState, useRef } from "preact/hooks";
import type { SaltogramPost } from "@/types/saltogram";
import { toast } from "sonner";
import {
    X,
    Image as ImageIcon,
    Send,
    LucideLoader2,
    LucideUploadCloud
} from "lucide-preact";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPostCreated: (post: SaltogramPost) => void;
    user: Session['user'];
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
    const [mentionUsers, setMentionUsers] = useState<any[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize del textarea
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleTextChange = async (e: any) => {
        const val = e.target.value;
        setText(val);
        adjustTextareaHeight();

        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const lastWord = textBeforeCursor.split(/\s/).pop();

        if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
            const query = lastWord.slice(1);
            const { data } = await actions.saltogram.searchUsers({ query });
            if (data?.users && data.users.length > 0) {
                setMentionUsers(data.users);
                setShowMentions(true);
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const handleMentionSelect = (username: string) => {
        const cursor = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = text.slice(0, cursor);
        const textAfterCursor = text.slice(cursor);
        
        const lastWordStart = textBeforeCursor.lastIndexOf("@");
        const newText = textBeforeCursor.slice(0, lastWordStart) + `@${username} ` + textAfterCursor;
        
        setText(newText);
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    const processFile = (file: File) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) return toast.error("Máximo 10MB.");
        if (!file.type.startsWith("image/")) return toast.error("Solo imágenes.");

        setImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleImageSelect = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) processFile(file);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file) processFile(file);
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!text.trim() && !image) return toast.error("Añade texto o imagen");

        setSubmitting(true);
        try {
            const formData = new FormData();
            if (text.trim()) formData.append("text", text.trim());
            if (image) formData.append("image", image);

            const response = await fetch("/api/saltogram/posts", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (response.ok) {
                onPostCreated(data.post);
                setText(""); setImage(null); setImagePreview(null);
                if (textareaRef.current) textareaRef.current.style.height = "auto";
            } else {
                toast.error(data.error || "Error al publicar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al crear la publicación");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal Panel */}
            <div className="relative z-10 bg-[#0a0a0a] rounded-3xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-900/20">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-2xl font-anton text-white uppercase tracking-wide">
                        Crear Publicación
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        disabled={submitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-6">
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <img
                                src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                                alt={user.name || user.username}
                                className="size-12 rounded-full border-2 border-purple-500/30 p-0.5"
                            />
                            <div>
                                <p className="font-bold text-white leading-none">{user.name}</p>
                                <p className="text-sm text-white/50 font-mono">@{user.username}</p>
                            </div>
                        </div>

                        {/* Textarea Auto-resize */}
                        <div className="relative">
                            {/* Mentions Popup */}
                            {showMentions && mentionUsers.length > 0 && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#242526] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                                    {mentionUsers.map(user => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => handleMentionSelect(user.username)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                                        >
                                            <img 
                                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                            <div>
                                                <p className="text-white text-sm font-medium">{user.displayName}</p>
                                                <p className="text-white/40 text-xs">@{user.username}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                ref={textareaRef}
                                value={text}
                                onInput={handleTextChange}
                                placeholder="¿Qué estás pensando, Saltano?"
                                maxLength={500}
                                rows={3}
                                className="w-full p-0 bg-transparent text-white text-lg placeholder:text-white/30 resize-none focus:outline-none min-h-[80px] custom-scrollbar"
                                disabled={submitting}
                            />
                            <p className={`text-xs text-right mt-2 font-mono transition-colors ${text.length > 450 ? 'text-red-400' : 'text-white/30'}`}>
                                {text.length}/500
                            </p>
                        </div>

                        {/* Image Upload / Preview */}
                        <div className="space-y-4">
                            {imagePreview ? (
                                <div className="relative group rounded-2xl overflow-hidden border border-white/10">
                                    <img src={imagePreview} alt="Preview" className="w-full max-h-[400px] object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-colors"
                                            title="Cambiar imagen"
                                        >
                                            <LucideUploadCloud size={24} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="p-3 bg-red-500/80 hover:bg-red-600/80 rounded-xl text-white backdrop-blur-md transition-colors"
                                            title="Eliminar"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => !submitting && fileInputRef.current?.click()}
                                    className={`
                                        relative w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden cursor-pointer group
                                        ${submitting ? 'opacity-50 cursor-not-allowed' : 'border-white/10 bg-white/5 hover:border-purple-500/50 hover:bg-white/[0.07]'}
                                    `}
                                >
                                    <div className="p-4 rounded-full bg-white/5 group-hover:bg-purple-500/10 text-white/50 group-hover:text-purple-400 transition-colors mb-3">
                                        <ImageIcon size={32} />
                                    </div>
                                    <span className="text-sm font-medium text-white/70 group-hover:text-white">
                                        Arrastra una imagen o haz clic
                                    </span>
                                    <span className="text-xs text-white/30 mt-1">
                                        PNG, JPG, GIF (Máx. 10MB)
                                    </span>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" disabled={submitting} />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-6 py-2.5 text-white/70 hover:text-white font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || (!text.trim() && !image)}
                            className={`
                                relative flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-0
                                ${submitting ? '' : 'hover:-translate-y-0.5'}
                            `}
                        >
                            {submitting ? (
                                <>
                                    <LucideLoader2 className="animate-spin" size={18} /> Publicando...
                                </>
                            ) : (
                                <>
                                    Publicar <Send size={18} className="ml-1" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}