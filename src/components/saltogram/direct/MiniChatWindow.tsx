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

export default function MiniChatWindow({ otherUser, currentUser }: MiniChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { closeChat, minimizeChat } = useChatStore();

    const currentUserId = Number(currentUser.id);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [otherUser.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        try {
            const { data } = await actions.messages.getConversation({ otherUserId: otherUser.id });
            if (data?.messages) {
                setMessages(prev => {
                    // Only update if different to avoid re-renders/scroll jumps
                    if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
                        return data.messages;
                    }
                    return prev;
                });

                // Mark messages as read if there are unread messages from the other user
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
        <div className="w-80 h-96 bg-card rounded-t-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
            {/* Header */}
            <div className="p-3 bg-card border-b border-border flex items-center justify-between shadow-sm z-10 cursor-pointer" onClick={() => minimizeChat(otherUser.id)}>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <img
                            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.displayName}`}
                            className="w-8 h-8 rounded-full border border-border"
                        />
                        {/*                         <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card"></div>
 */}                    </div>
                    <div>
                        <h3 className="text-card-foreground font-bold text-sm leading-tight hover:underline">{otherUser.displayName}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); minimizeChat(otherUser.id); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                    >
                        <LucideMinus size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); closeChat(otherUser.id); }}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                    >
                        <LucideX size={16} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <LucideLoader2 className="animate-spin text-primary" size={24} />
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
                                    className={`max-w-[85%] px-3 py-2 text-sm shadow-sm break-words ${isMe
                                        ? 'bg-gradient-to-br from-electric-violet-600 to-electric-violet-500 text-white'
                                        : 'bg-muted text-foreground'
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
                                {isMe && index === messages.length - 1 && msg.isRead && (
                                    <span className="text-[10px] text-muted-foreground mr-1 mt-0.5 animate-in fade-in duration-300">Leído</span>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 bg-card border-t border-border">
                <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
                    <input
                        type="text"
                        value={newMessage}
                        onInput={(e) => setNewMessage(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Aa"
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="text-primary disabled:opacity-50 disabled:cursor-not-allowed p-1 hover:bg-primary/10 rounded-full transition-colors"
                    >
                        <LucideSend size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
