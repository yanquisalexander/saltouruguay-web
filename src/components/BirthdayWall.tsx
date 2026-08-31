import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { LucideLoader2, LucideCake, LucideSend, LucidePartyPopper, LucideShield, LucideTrash2 } from "lucide-preact";

interface User {
    id: number;
    name: string;
    image: string | null;
    isAdmin: boolean;
}

interface BirthdayMessage {
    id: number;
    message: string;
    createdAt: string;
    userId: number;
    username: string;
    displayName: string;
    avatar: string | null;
}

interface BirthdayWallProps {
    user: User;
}

export default function BirthdayWall({ user }: BirthdayWallProps) {
    const [messages, setMessages] = useState<BirthdayMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState("");
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        loadMessages();
        if (user.isAdmin) loadPendingCount();
    }, []);

    async function loadMessages() {
        setLoading(true);
        const { data, error } = await actions.cumple.getApprovedMessages();
        if (data?.messages) setMessages(data.messages);
        setLoading(false);
    }

    async function loadPendingCount() {
        const { data } = await actions.cumple.getPendingCount({});
        if (data?.count !== undefined) setPendingCount(data.count);
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        setSending(true);
        toast.loading("Enviando mensaje...", { id: "send-birthday" });

        const { data, error } = await actions.cumple.sendMessage({ message: trimmed });

        if (error) {
            toast.error(error.message, { id: "send-birthday" });
        } else {
            toast.success("Mensaje enviado, pendiente de aprobación", { id: "send-birthday" });
            setText("");
        }

        setSending(false);
    }

    function getAvatarUrl(avatar: string | null, username: string) {
        return avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=9146ff&color=fff&bold=true`;
    }

    function formatDate(dateStr: string) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es-UY", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "America/Montevideo",
        });
    }

    async function handleDelete(messageId: number) {
        if (!confirm("¿Eliminar este mensaje?")) return;
        toast.loading("Eliminando...", { id: `delete-${messageId}` });
        const { error } = await actions.cumple.deleteMessage({ messageId });
        if (error) {
            toast.error(error.message, { id: `delete-${messageId}` });
        } else {
            toast.success("Mensaje eliminado", { id: `delete-${messageId}` });
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-full px-6 py-2">
                    <LucidePartyPopper className="text-pink-400" size={20} />
                    <span className="text-pink-300 font-medium text-sm tracking-wide uppercase">Feliz Cumpleaños</span>
                    <LucidePartyPopper className="text-pink-400" size={20} />
                </div>
                <h1 className="font-anton text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-wide">
                    SaltoUruguay<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Server</span>
                </h1>
                <p className="text-white/50 text-sm max-w-md mx-auto">
                    Deja tu mensaje de cumpleaños para SaltoUruguayServer
                </p>
            </div>

            {/* Form */}
            <div className="bg-[#1a1b2e] rounded-[28px] border border-[#2a2d4a] p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <img
                        src={getAvatarUrl(user.image, user.name)}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#2a2d4a]"
                    />
                    <div className="flex-1">
                        <p className="text-white/80 text-sm font-medium">{user.name}</p>
                        <p className="text-white/30 text-xs">Escribe tu mensaje de cumpleaños</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} class="space-y-3">
                    <textarea
                        value={text}
                        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
                        placeholder="¡Feliz cumpleaños SaltoUruguayServer! 🎂..."
                        maxLength={500}
                        rows={3}
                        className="w-full bg-[#12131f] border border-[#2a2d4a] rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/20 resize-none focus:outline-none focus:border-pink-500/50 transition-colors"
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-white/20 text-xs">{text.length}/500</span>
                        <button
                            type="submit"
                            disabled={sending || !text.trim()}
                            className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/20"
                        >
                            {sending ? (
                                <>
                                    <LucideLoader2 className="animate-spin" size={16} />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <LucideSend size={16} />
                                    Enviar mensaje
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {user.isAdmin && pendingCount > 0 && (
                    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2">
                        <LucideShield className="text-yellow-400" size={14} />
                        <span className="text-yellow-300 text-xs">
                            {pendingCount} mensaje{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""} de aprobación
                        </span>
                    </div>
                )}
            </div>

            {/* Messages Wall */}
            <div className="space-y-4">
                <h2 className="font-anton text-2xl text-white/80 uppercase tracking-wide flex items-center gap-2">
                    <LucideCake className="text-pink-400" size={24} />
                    Mensajes de la comunidad
                </h2>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <LucideLoader2 size={32} className="animate-spin text-pink-400" />
                        <p className="text-white/30 text-sm animate-pulse">Cargando mensajes...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="bg-[#1a1b2e] rounded-[28px] border border-[#2a2d4a] p-10 text-center space-y-3">
                        <LucideCake className="text-white/10 mx-auto" size={48} />
                        <p className="text-white/30 text-sm">Sé el primero en dejar tu mensaje de cumpleaños</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className="bg-[#1a1b2e] rounded-[28px] border border-[#2a2d4a] p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${index * 40}ms` }}
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={getAvatarUrl(msg.avatar, msg.username)}
                                        alt={msg.displayName}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-[#2a2d4a]"
                                        loading="lazy"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/90 text-sm font-medium truncate">{msg.displayName}</p>
                                        <p className="text-white/30 text-xs">@{msg.username}</p>
                                    </div>
                                    <span className="text-white/20 text-[10px] whitespace-nowrap">{formatDate(msg.createdAt)}</span>
                                    {user.isAdmin && (
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="text-white/20 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-red-500/10"
                                            title="Eliminar mensaje"
                                        >
                                            <LucideTrash2 size={13} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
