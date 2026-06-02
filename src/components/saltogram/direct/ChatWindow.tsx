import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideArrowLeft, LucideSend } from "lucide-preact";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS, PUSHER_EVENTS_DM } from "@/consts/pusher";

interface ChatWindowProps {
    otherUser: any;
    currentUser: any;
    initialMessages: any[];
}

const TYPING_TIMEOUT = 2000;

export default function ChatWindow({ otherUser, currentUser, initialMessages }: ChatWindowProps) {
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [otherTyping, setOtherTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingThrottleRef = useRef<number>(0);
    const typingTimeoutRef = useRef<number>(0);

    const currentUserId = Number(currentUser.id);
    const dmChannel = PUSHER_CHANNELS.DM(currentUserId, otherUser.id);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // ── Pusher DM ──
    useEffect(() => {
        try {
            pusherService.bind(dmChannel, PUSHER_EVENTS_DM.NEW_MESSAGE, (data: any) => {
                if (data.senderId === otherUser.id) {
                    setMessages(prev => {
                        if (prev.some((m: any) => m.id === data.id)) return prev;
                        return [...prev, {
                            id: Date.now() + Math.random(),
                            senderId: data.senderId,
                            receiverId: currentUserId,
                            content: data.content,
                            createdAt: data.createdAt || new Date().toISOString(),
                            isRead: false,
                        }];
                    });
                }
            });

            pusherService.bind(dmChannel, PUSHER_EVENTS_DM.CLIENT_TYPING, (data: any) => {
                if (data.senderId === otherUser.id) {
                    setOtherTyping(true);
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = window.setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT);
                }
            });
        } catch (e) {
            console.error("[ChatWindow] Pusher error:", e);
        }

        return () => {
            pusherService.unbindEvent(dmChannel, PUSHER_EVENTS_DM.NEW_MESSAGE);
            pusherService.unbindEvent(dmChannel, PUSHER_EVENTS_DM.CLIENT_TYPING);
            clearTimeout(typingTimeoutRef.current);
        };
    }, [otherUser.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, otherTyping]);

    // Poll fallback
    useEffect(() => {
        const interval = setInterval(async () => {
            const { data } = await actions.messages.getConversation({ otherUserId: otherUser.id });
            if (data?.messages) {
                if (data.messages.length !== messages.length || data.messages[data.messages.length - 1]?.id !== messages[messages.length - 1]?.id) {
                    setMessages(data.messages);
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [otherUser.id, messages]);

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
                console.error(error);
            } else {
                const { data } = await actions.messages.getConversation({ otherUserId: otherUser.id });
                if (data?.messages) setMessages(data.messages);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-[#0f1124]/90 backdrop-blur-xl rounded-[28px] border border-white/8 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-3 bg-[#0f1124]/90">
                <a href="/saltogram/direct" className="text-white/50 hover:text-white transition-colors duration-200 p-1 -ml-1 rounded-full hover:bg-white/8">
                    <LucideArrowLeft size={20} />
                </a>
                <img
                    src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.displayName}`}
                    className="w-9 h-9 rounded-full ring-2 ring-[#b3c8ff]/15"
                />
                <div>
                    <h2 className="text-white font-bold text-sm">{otherUser.displayName}</h2>
                    <p className="text-white/40 text-[10px]">@{otherUser.username}</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0b1a] custom-scrollbar">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUserId;
                    const prevMsg = messages[index - 1];
                    const nextMsg = messages[index + 1];

                    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                    const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

                    const showDate = index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

                    return (
                        <div key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-3">
                                    <span className="text-[10px] text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
                                        {format(new Date(msg.createdAt), "d 'de' MMMM", { locale: es })}
                                    </span>
                                </div>
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isFirstInGroup ? 'mt-1' : 'mt-0.5'}`}>
                                <div
                                    className={`max-w-[80%] px-3.5 py-2.5 text-sm wrap-break-word leading-relaxed ${
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
                                    {msg.story && (
                                        <div className="mb-2 pb-2 border-b border-white/20">
                                            <p className="text-[10px] text-white/50 mb-1">Respondió a tu historia:</p>
                                            <div className="h-32 rounded-lg overflow-hidden bg-black/20 relative">
                                                {msg.story.mediaType === 'image' ? (
                                                    <img src={msg.story.mediaUrl} className="w-full h-full object-cover opacity-70" />
                                                ) : (
                                                    <video src={msg.story.mediaUrl} className="w-full h-full object-cover opacity-70" />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {msg.reaction && (
                                        <div className="text-4xl mb-1">{msg.reaction}</div>
                                    )}

                                    {msg.content && (
                                        <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                                    )}

                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-[#6b7099]' : 'text-white/30'}`}>
                                        {format(new Date(msg.createdAt), "HH:mm")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

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

            {/* Input Area */}
            <div className="px-3 py-3 bg-[#0f1124]/90 border-t border-white/8">
                <div className="flex items-center gap-2 bg-[#1a1b2e] rounded-full px-4 py-2 border border-white/5 focus-within:border-[#b3c8ff]/30 focus-within:bg-[#1a1b2e]/80 transition-all duration-200">
                    <input
                        type="text"
                        value={newMessage}
                        onInput={(e) => {
                            setNewMessage(e.currentTarget.value);
                            handleTyping();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Envía un mensaje..."
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
