import { useEffect, useRef, useState } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { LucideArrowLeft, LucideLoader2, LucideSend, LucideCheck, LucideCheckCheck } from "lucide-preact";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Session } from "@auth/core/types";
import { route } from "preact-router";

interface ChatViewProps {
    partnerId?: string;
    user?: Session["user"];
}

interface Message {
    id: number;
    senderId: number;
    receiverId: number;
    content: string | null;
    reaction: string | null;
    createdAt: string;
    isRead: boolean;
    story?: {
        id: number;
        mediaUrl: string;
        mediaType: 'image' | 'video';
    };
}

interface Partner {
    id: number;
    username: string;
    displayName: string;
    avatar: string | null;
}

export default function ChatView({ partnerId, user }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [partner, setPartner] = useState<Partner | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!partnerId || !user) return;

        const loadMessages = async () => {
            setLoading(true);
            try {
                const { data, error } = await actions.messages.getConversation({ otherUserId: Number(partnerId) });
                if (error) throw new Error(error.message);

                setMessages(data?.messages as Message[] ?? []);
                setPartner(data?.partner as Partner ?? null);

                // Mark as read
                await actions.messages.markAsRead({ otherUserId: Number(partnerId) });
            } catch (err) {
                console.error(err);
                toast.error("Error al cargar la conversación");
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [partnerId, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (e: Event) => {
        e.preventDefault();
        if (!inputText.trim() || !partnerId || sending) return;

        const content = inputText.trim();
        setInputText("");
        setSending(true);

        // Optimistic update
        const tempId = Date.now();
        const optimisticMessage: Message = {
            id: tempId,
            senderId: Number(user?.id),
            receiverId: Number(partnerId),
            content: content,
            reaction: null,
            createdAt: new Date().toISOString(),
            isRead: false,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom();

        try {
            const { error } = await actions.messages.send({
                receiverId: Number(partnerId),
                content: content
            });

            if (error) throw new Error(error.message);
        } catch (err) {
            console.error(err);
            toast.error("Error al enviar mensaje");
            // Revert optimistic update if needed, or just let the user know
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setInputText(content); // Restore text
        } finally {
            setSending(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20 text-white/60">
                <p>Debes iniciar sesión para ver tus mensajes.</p>
            </div>
        );
    }

    if (loading && !partner) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <LucideLoader2 className="animate-spin text-white/40" size={32} />
            </div>
        );
    }

    return (
        <section className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 flex flex-col h-[calc(100vh-140px)] md:h-[600px]">
            {/* Header */}
            <header className="p-4 border-b border-white/10 flex items-center gap-3 bg-white/5 rounded-t-3xl">
                <button
                    onClick={() => route("/saltogram/direct")}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"
                >
                    <LucideArrowLeft size={20} />
                </button>
                {partner && (
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => route(`/saltogram/u/${partner.username}`)}>
                        <img
                            src={partner.avatar || `https://ui-avatars.com/api/?name=${partner.displayName}`}
                            alt={partner.displayName}
                            className="w-10 h-10 rounded-full border border-white/10 object-cover"
                        />
                        <div>
                            <h3 className="text-white font-medium leading-tight">{partner.displayName}</h3>
                            <p className="text-xs text-white/40">@{partner.username}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/40 gap-2">
                        <p>No hay mensajes aún.</p>
                        <p className="text-sm">Envía un mensaje para comenzar la charla.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === Number(user.id);
                        return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe
                                    ? "bg-blue-600 text-white rounded-tr-none"
                                    : "bg-white/10 text-white rounded-tl-none"
                                    }`}>
                                    {msg.story && (
                                        <div className="mb-2 pb-2 border-b border-white/20">
                                            <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                                                <span>Respondió a una historia</span>
                                            </div>
                                            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/20">
                                                {msg.story.mediaType === 'video' ? (
                                                    <video
                                                        src={msg.story.mediaUrl}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        preload="metadata"
                                                    />
                                                ) : (
                                                    <img
                                                        src={msg.story.mediaUrl}
                                                        className="w-full h-full object-cover"
                                                        alt="Story preview"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                <div className="absolute bottom-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                                    {msg.story.mediaType === 'video' ? (
                                                        <div className="w-1.5 h-1.5 bg-black rounded-sm" />
                                                    ) : (
                                                        <div className="w-1 h-1.5 bg-black rounded-sm transform rotate-45 border-l border-b border-black" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content || msg.reaction}</p>
                                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-blue-200" : "text-white/40"}`}>
                                        <p className="text-[10px]">
                                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                                        </p>
                                        {isMe && (
                                            <div className="flex">
                                                {msg.isRead ? (
                                                    <LucideCheckCheck size={12} className="text-blue-200" />
                                                ) : (
                                                    <LucideCheck size={12} className="text-blue-200" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-white/5 rounded-b-3xl flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onInput={(e) => setInputText((e.target as HTMLInputElement).value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-full transition-colors"
                >
                    {sending ? <LucideLoader2 size={20} className="animate-spin" /> : <LucideSend size={20} />}
                </button>
            </form>
        </section>
    );
}
