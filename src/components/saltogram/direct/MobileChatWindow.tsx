import { h } from 'preact';
import { useState, useEffect, useRef } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideArrowLeft, LucideSend, LucideLoader2 } from "lucide-preact";

interface MobileChatWindowProps {
    otherUserId: string;
    currentUser: any;
}

export default function MobileChatWindow({ otherUserId, currentUser }: MobileChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentUserId = Number(currentUser.id);
    const otherUserIdNum = Number(otherUserId);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [otherUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            }
        } catch (e) {
            console.error(e);
        }
    };

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
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b border-border sticky top-0 bg-background z-10">
                <a href="/saltogram/direct" className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-full">
                    <LucideArrowLeft />
                </a>
                {otherUser ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.displayName}`}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="font-bold text-lg text-foreground">{otherUser.displayName || otherUser.username}</span>
                    </div>
                ) : (
                    <span className="font-bold text-lg text-foreground">Chat</span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {loading && messages.length === 0 ? (
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
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
                                <div
                                    className={`max-w-[85%] px-4 py-2 text-base shadow-sm break-words ${isMe
                                            ? 'bg-gradient-to-br from-electric-violet-600 to-electric-violet-500 text-white'
                                            : 'bg-muted text-foreground'
                                        }`}
                                    style={{
                                        borderRadius: '20px',
                                        borderTopRightRadius: isMe && !isFirstInGroup ? '4px' : '20px',
                                        borderBottomRightRadius: isMe && !isLastInGroup ? '4px' : '20px',
                                        borderTopLeftRadius: !isMe && !isFirstInGroup ? '4px' : '20px',
                                        borderBottomLeftRadius: !isMe && !isLastInGroup ? '4px' : '20px',
                                    }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-background">
                <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                    <input
                        type="text"
                        value={newMessage}
                        onInput={(e) => setNewMessage(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Enviar mensaje..."
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="text-primary disabled:opacity-50 disabled:cursor-not-allowed p-1 hover:bg-primary/10 rounded-full transition-colors"
                    >
                        <LucideSend size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}