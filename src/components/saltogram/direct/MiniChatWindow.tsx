import { useState, useEffect, useRef } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideX, LucideMinus, LucideSend, LucideImage, LucideSmile, LucideLoader2 } from "lucide-preact";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useChatStore } from "@/stores/chatStore";

interface MiniChatWindowProps {
    otherUser: any;
    currentUser: any;
}

const CHANNEL_NAME = "saltogram-chat-bc";

export default function MiniChatWindow({ otherUser, currentUser }: MiniChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const lastBroadcastRef = useRef<number>(0);
    const { closeChat, minimizeChat } = useChatStore();

    const currentUserId = Number(currentUser.id);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // ── BroadcastChannel: coordinación entre pestañas ──
    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") return;
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = channel;

        channel.onmessage = (event) => {
            const { type, payload } = event.data || {};
            if (type !== "chat-messages" || payload?.partnerId !== otherUser.id) return;
            lastBroadcastRef.current = Date.now();
            if (payload.messages) {
                setMessages(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(payload.messages)) {
                        return payload.messages;
                    }
                    return prev;
                });
            }
        };

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [otherUser.id]);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [otherUser.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const broadcastMessages = (msgs: any[]) => {
        if (channelRef.current) {
            channelRef.current.postMessage({
                type: "chat-messages",
                payload: { partnerId: otherUser.id, messages: msgs },
            });
        }
    };

    const loadMessages = async () => {
        // Si otra pestaña ya trajo datos hace < 3s, saltamos
        if (Date.now() - lastBroadcastRef.current < 3000) return;
        try {
            const { data } = await actions.messages.getConversation({ otherUserId: otherUser.id });
            if (data?.messages) {
                setMessages(prev => {
                    const serialized = JSON.stringify(data.messages);
                    if (JSON.stringify(prev) !== serialized) {
                        broadcastMessages(data.messages);
                        return data.messages;
                    }
                    return prev;
                });

                const hasUnread = data.messages.some((m: any) => m.senderId === otherUser.id && !m.isRead);
                if (hasUnread) {
                    await actions.messages.markAsRead({ otherUserId: otherUser.id });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        const tempId = Date.now();
        const optimisticMessage = {
            id: tempId,
            senderId: currentUserId,
            receiverId: otherUser.id,
            content: newMessage,
            createdAt: new Date().toISOString(),
            isRead: false
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage("");
        setSending(true);

        try {
            const { error } = await actions.messages.send({
                receiverId: otherUser.id,
                content: optimisticMessage.content
            });

            if (error) {
                setMessages(prev => prev.filter(m => m.id !== tempId));
            } else {
                loadMessages();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="w-80 h-96 bg-[#0f1124]/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            {/* Header — tonal glass */}
            <div className="p-3 bg-[#0f1124]/90 border-b border-white/8 flex items-center justify-between z-10 cursor-pointer" onClick={() => minimizeChat(otherUser.id)}>
                <div className="flex items-center gap-2.5">
                    <div className="relative">
                        <img
                            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.displayName}`}
                            className="w-8 h-8 rounded-full ring-2 ring-[#b3c8ff]/20"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0f1124]" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm leading-tight">{otherUser.displayName}</h3>
                        <span className="text-[10px] text-emerald-400/80 font-medium">En línea</span>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); minimizeChat(otherUser.id); }}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/8 rounded-full transition-colors duration-200 active:scale-90"
                    >
                        <LucideMinus size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); closeChat(otherUser.id); }}
                        className="p-1.5 text-white/40 hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-full transition-colors duration-200 active:scale-90"
                    >
                        <LucideX size={16} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#0a0b1a] custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <LucideLoader2 className="animate-spin text-[#b3c8ff]" size={24} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/30 text-sm italic">Sin mensajes aún</p>
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
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
                                <div
                                    className={`max-w-[85%] px-3.5 py-2 text-sm wrap-break-word leading-relaxed ${
                                        isMe
                                            ? 'bg-[#b3c8ff] text-[#001849]'
                                            : 'bg-[#1a1b2e] text-white/90'
                                    }`}
                                    style={{
                                        borderRadius: '18px',
                                        borderTopRightRadius: isMe && !isFirstInGroup ? '4px' : '18px',
                                        borderBottomRightRadius: isMe && !isLastInGroup ? '4px' : '18px',
                                        borderTopLeftRadius: !isMe && !isFirstInGroup ? '4px' : '18px',
                                        borderBottomLeftRadius: !isMe && !isLastInGroup ? '4px' : '18px',
                                    }}
                                >
                                    {msg.content}
                                </div>
                                {showTime && (
                                    <span className={`text-[10px] text-white/20 mt-0.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                        {format(new Date(msg.createdAt), 'HH:mm', { locale: es })}
                                    </span>
                                )}
                                {isMe && index === messages.length - 1 && msg.isRead && (
                                    <span className="text-[10px] text-[#b3c8ff]/60 mr-1">Leído</span>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input — tonal pill */}
            <div className="p-2.5 bg-[#0f1124]/90 border-t border-white/8">
                <div className="flex items-center gap-2 bg-[#1a1b2e] rounded-full px-4 py-2 border border-white/5 focus-within:border-[#b3c8ff]/30 focus-within:bg-[#1a1b2e]/80 transition-all duration-200">
                    <input
                        type="text"
                        value={newMessage}
                        onInput={(e) => setNewMessage(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-transparent border-none outline-hidden text-white placeholder-white/25 text-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="text-[#b3c8ff] disabled:opacity-40 disabled:cursor-not-allowed p-1.5 hover:bg-[#b3c8ff]/10 rounded-full transition-all duration-200 active:scale-90"
                    >
                        {sending ? (
                            <LucideLoader2 className="animate-spin" size={18} />
                        ) : (
                            <LucideSend size={18} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
