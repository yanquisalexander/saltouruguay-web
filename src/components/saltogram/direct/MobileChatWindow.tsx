import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideArrowLeft, LucideSend, LucideLoader2 } from "lucide-preact";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS, PUSHER_EVENTS_DM } from "@/consts/pusher";

interface MobileChatWindowProps {
    otherUserId: string;
    currentUser: any;
}

const TYPING_TIMEOUT = 2000;

export default function MobileChatWindow({ otherUserId, currentUser }: MobileChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [otherTyping, setOtherTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingThrottleRef = useRef<number>(0);
    const typingTimeoutRef = useRef<number>(0);

    const currentUserId = Number(currentUser.id);
    const otherUserIdNum = Number(otherUserId);
    const dmChannel = PUSHER_CHANNELS.DM(currentUserId, otherUserIdNum);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // ── Pusher DM ──
    useEffect(() => {
        try {
            pusherService.bind(dmChannel, PUSHER_EVENTS_DM.NEW_MESSAGE, (data: any) => {
                if (data.senderId === otherUserIdNum) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === data.id)) return prev;
                        return [...prev, {
                            id: Date.now() + Math.random(),
                            senderId: data.senderId,
                            receiverId: currentUserId,
                            content: data.content,
                            createdAt: data.createdAt || new Date().toISOString(),
                            isRead: false,
                        }];
                    });
                    if (document.hasFocus()) {
                        actions.messages.markAsRead({ otherUserId: otherUserIdNum }).catch(() => {});
                    }
                }
            });

            pusherService.bind(dmChannel, PUSHER_EVENTS_DM.CLIENT_TYPING, (data: any) => {
                if (data.senderId === otherUserIdNum) {
                    setOtherTyping(true);
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = window.setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT);
                }
            });
        } catch (e) {
            console.error("[MobileChatWindow] Pusher error:", e);
        }

        return () => {
            pusherService.unbindEvent(dmChannel, PUSHER_EVENTS_DM.NEW_MESSAGE);
            pusherService.unbindEvent(dmChannel, PUSHER_EVENTS_DM.CLIENT_TYPING);
            clearTimeout(typingTimeoutRef.current);
        };
    }, [otherUserId]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [otherUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, otherTyping]);

    const loadData = async () => {
        setLoading(true);
        await loadMessages();
        setLoading(false);
    };

    const loadMessages = async () => {
        try {
            const { data } = await actions.messages.getConversation({ otherUserId: otherUserIdNum });
            if (data) {
                if (data.messages) {
                    setMessages(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
                            return data.messages;
                        }
                        return prev;
                    });
                }
                if (data.partner) {
                    setOtherUser(data.partner);
                }
                if (document.hasFocus()) {
                    const hasUnread = data.messages?.some((m: any) => m.senderId === otherUserIdNum && !m.isRead);
                    if (hasUnread) {
                        await actions.messages.markAsRead({ otherUserId: otherUserIdNum });
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

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
                        username: currentUser.displayName,
                    });
                }
            } catch (e) {}
        }
    }, [dmChannel, currentUserId, currentUser.displayName]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        const tempId = Date.now();
        const optimisticMessage = {
            id: tempId,
            senderId: currentUserId,
            receiverId: otherUserIdNum,
            content: newMessage,
            createdAt: new Date().toISOString(),
            isRead: false
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage("");
        setSending(true);

        try {
            const { error } = await actions.messages.send({
                receiverId: otherUserIdNum,
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
        <div className="flex flex-col h-full bg-[#0a0b1a]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 sticky top-0 bg-[#0f1124]/90 backdrop-blur-xl z-10">
                <a href="/saltogram/direct" className="p-1 -ml-1 text-white/50 hover:text-white hover:bg-white/8 rounded-full transition-all duration-200 active:scale-90">
                    <LucideArrowLeft size={20} />
                </a>
                {otherUser ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.displayName}`}
                            className="w-9 h-9 rounded-full ring-2 ring-[#b3c8ff]/15 object-cover"
                        />
                        <span className="font-bold text-sm text-white">{otherUser.displayName || otherUser.username}</span>
                    </div>
                ) : (
                    <span className="font-bold text-sm text-white">Chat</span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0b1a] custom-scrollbar">
                {loading && messages.length === 0 ? (
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

                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
                                <div
                                    className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed shadow-xs wrap-break-word ${
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
            <div className="px-3 py-3 border-t border-white/8 bg-[#0f1124]/90">
                <div className="flex items-center gap-2 bg-[#1a1b2e] rounded-full px-4 py-2 border border-white/5 focus-within:border-[#b3c8ff]/30 focus-within:bg-[#1a1b2e]/80 transition-all duration-200">
                    <input
                        type="text"
                        value={newMessage}
                        onInput={(e) => {
                            setNewMessage(e.currentTarget.value);
                            handleTyping();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Enviar mensaje..."
                        className="flex-1 bg-transparent border-none outline-hidden text-white placeholder-white/25 text-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="text-[#b3c8ff] disabled:opacity-40 disabled:cursor-not-allowed p-1.5 hover:bg-[#b3c8ff]/10 rounded-full transition-all duration-200 active:scale-90"
                    >
                        <LucideSend size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
