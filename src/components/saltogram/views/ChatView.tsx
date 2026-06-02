import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { LucideArrowLeft, LucideLoader2, LucideSend, LucideCheck, LucideCheckCheck } from "lucide-preact";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Session } from "@auth/core/types";
import { route } from "preact-router";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS, PUSHER_EVENTS_DM } from "@/consts/pusher";

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

const TYPING_TIMEOUT = 2000;

export default function ChatView({ partnerId, user }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [partner, setPartner] = useState<Partner | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState("");
    const [otherTyping, setOtherTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingThrottleRef = useRef<number>(0);
    const typingTimeoutRef = useRef<number>(0);

    const currentUserId = Number(user?.id);
    const otherUserId = Number(partnerId);
    const dmChannel = PUSHER_CHANNELS.DM(currentUserId, otherUserId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // ── Pusher: suscripción al canal privado DM ──
    useEffect(() => {
        if (!partnerId || !user) return;

        try {
            pusherService.bind(dmChannel, PUSHER_EVENTS_DM.NEW_MESSAGE, (data: any) => {
                if (data.senderId === otherUserId) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === data.id)) return prev;
                        const newMsg: Message = {
                            id: Date.now() + Math.random(),
                            senderId: data.senderId,
                            receiverId: currentUserId,
                            content: data.content,
                            reaction: data.reaction || null,
                            createdAt: data.createdAt || new Date().toISOString(),
                            isRead: false,
                        };
                        return [...prev, newMsg];
                    });
                    if (document.hasFocus()) {
                        actions.messages.markAsRead({ otherUserId }).catch(() => {});
                    }
                }
            });

            pusherService.bind(dmChannel, PUSHER_EVENTS_DM.CLIENT_TYPING, (data: any) => {
                if (data.senderId === otherUserId) {
                    setOtherTyping(true);
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = window.setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT);
                }
            });
        } catch (e) {
            console.error("[ChatView] Pusher error:", e);
        }

        return () => {
            pusherService.unbindEvent(dmChannel, PUSHER_EVENTS_DM.NEW_MESSAGE);
            pusherService.unbindEvent(dmChannel, PUSHER_EVENTS_DM.CLIENT_TYPING);
            clearTimeout(typingTimeoutRef.current);
        };
    }, [partnerId, user]);

    useEffect(() => {
        if (!partnerId || !user) return;

        const loadMessages = async () => {
            setLoading(true);
            try {
                const { data, error } = await actions.messages.getConversation({ otherUserId });
                if (error) throw new Error(error.message);

                setMessages(data?.messages as Message[] ?? []);
                setPartner(data?.partner as Partner ?? null);

                if (document.hasFocus()) {
                    await actions.messages.markAsRead({ otherUserId });
                }
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
    }, [messages, otherTyping]);

    const handleTyping = useCallback(() => {
        const now = Date.now();
        if (now - typingThrottleRef.current > 2000) {
            typingThrottleRef.current = now;
            try {
                const channel = pusherService.getChannel(dmChannel);
                if (channel) {
                    channel.trigger(PUSHER_EVENTS_DM.CLIENT_TYPING, {
                        senderId: currentUserId,
                        userId: currentUserId,
                        username: user?.displayName,
                    });
                }
            } catch (e) {}
        }
    }, [dmChannel, currentUserId, user?.displayName]);

    const handleSend = async (e: Event) => {
        e.preventDefault();
        if (!inputText.trim() || !partnerId || sending) return;

        const content = inputText.trim();
        setInputText("");
        setSending(true);

        const tempId = Date.now();
        const optimisticMessage: Message = {
            id: tempId,
            senderId: currentUserId,
            receiverId: otherUserId,
            content: content,
            reaction: null,
            createdAt: new Date().toISOString(),
            isRead: false,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        scrollToBottom();

        try {
            const { error } = await actions.messages.send({
                receiverId: otherUserId,
                content: content
            });

            if (error) throw new Error(error.message);
        } catch (err) {
            console.error(err);
            toast.error("Error al enviar mensaje");
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setInputText(content);
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
                <LucideLoader2 className="animate-spin text-[#b3c8ff]" size={32} />
            </div>
        );
    }

    return (
        <section className="bg-[#0f1124]/80 backdrop-blur-xl rounded-[28px] border border-white/8 flex flex-col h-[calc(100vh-140px)] md:h-[600px]">
            {/* Header */}
            <header className="p-4 border-b border-white/8 flex items-center gap-3 bg-[#0f1124]/90 rounded-t-[28px]">
                <button
                    onClick={() => route("/saltogram/direct")}
                    className="p-2 hover:bg-white/8 rounded-full text-white/60 hover:text-white transition-all duration-200 active:scale-90"
                >
                    <LucideArrowLeft size={20} />
                </button>
                {partner && (
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => route(`/saltogram/u/${partner.username}`)}>
                        <img
                            src={partner.avatar || `https://ui-avatars.com/api/?name=${partner.displayName}`}
                            alt={partner.displayName}
                            className="w-10 h-10 rounded-full ring-2 ring-[#b3c8ff]/15 object-cover"
                        />
                        <div>
                            <h3 className="text-white font-bold text-sm leading-tight">{partner.displayName}</h3>
                            <p className="text-[10px] text-white/40">@{partner.username}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0a0b1a]">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/40 gap-1">
                        <p>No hay mensajes aún.</p>
                        <p className="text-sm text-white/30">Envía un mensaje para comenzar la charla.</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId === currentUserId;
                        const prevMsg = messages[index - 1];
                        const nextMsg = messages[index + 1];

                        const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                        const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

                        const showTime = isLastInGroup || !nextMsg || nextMsg.senderId !== msg.senderId;

                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirstInGroup ? "mt-2" : "mt-0.5"}`}>
                                <div
                                    className={`max-w-[80%] px-3.5 py-2.5 text-sm wrap-break-word leading-relaxed ${
                                        isMe
                                            ? "bg-[#b3c8ff] text-[#001849]"
                                            : "bg-[#1a1b2e] text-white/90"
                                    }`}
                                    style={{
                                        borderRadius: '18px',
                                        borderTopRightRadius: isMe && !isFirstInGroup ? '4px' : '18px',
                                        borderBottomRightRadius: isMe && !isLastInGroup ? '4px' : '18px',
                                        borderTopLeftRadius: !isMe && !isFirstInGroup ? '4px' : '18px',
                                        borderBottomLeftRadius: !isMe && !isLastInGroup ? '4px' : '18px',
                                    }}
                                >
                                    {msg.story && (
                                        <div className="mb-2 pb-2 border-b border-white/20">
                                            <div className="flex items-center gap-2 text-[10px] text-white/50 mb-1">
                                                <span>Respondió a una historia</span>
                                            </div>
                                            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
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
                                                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                                                <div className="absolute bottom-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                                    {msg.story.mediaType === 'video' ? (
                                                        <div className="w-1.5 h-1.5 bg-black rounded-xs" />
                                                    ) : (
                                                        <div className="w-1 h-1.5 bg-black rounded-xs transform rotate-45 border-l border-b border-black" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <p className="whitespace-pre-wrap wrap-break-word">{msg.content || msg.reaction}</p>

                                    {showTime && (
                                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-[#6b7099]" : "text-white/30"}`}>
                                            <span className="text-[10px]">
                                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                                            </span>
                                            {isMe && (
                                                msg.isRead ? (
                                                    <LucideCheckCheck size={12} className="text-[#b3c8ff]" />
                                                ) : (
                                                    <LucideCheck size={12} className="text-white/40" />
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Typing indicator */}
                {otherTyping && (
                    <div className="flex items-start">
                        <div className="bg-[#1a1b2e] text-white/50 text-xs px-3.5 py-2 rounded-[18px] rounded-tl-none animate-in fade-in duration-200">
                            <span className="flex items-center gap-1">
                                Escribiendo
                                <span className="flex gap-0.5">
                                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                            </span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/8 bg-[#0f1124]/90 rounded-b-[28px]">
                <div className="flex items-center gap-2 bg-[#1a1b2e] rounded-full px-4 py-2 border border-white/5 focus-within:border-[#b3c8ff]/30 focus-within:bg-[#1a1b2e]/80 transition-all duration-200">
                    <input
                        type="text"
                        value={inputText}
                        onInput={(e) => {
                            setInputText((e.target as HTMLInputElement).value);
                            handleTyping();
                        }}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-transparent border-none outline-hidden text-white text-sm placeholder:text-white/25"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || sending}
                        className="p-1.5 text-[#b3c8ff] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#b3c8ff]/10 rounded-full transition-all duration-200 active:scale-90"
                    >
                        {sending ? <LucideLoader2 size={18} className="animate-spin" /> : <LucideSend size={18} />}
                    </button>
                </div>
            </form>
        </section>
    );
}
