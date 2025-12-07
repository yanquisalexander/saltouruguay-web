import { useState, useEffect, useRef } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideArrowLeft, LucideSend, LucideImage, LucideSmile } from "lucide-preact";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ChatWindowProps {
    otherUser: any;
    currentUser: any;
    initialMessages: any[];
}

export default function ChatWindow({ otherUser, currentUser, initialMessages }: ChatWindowProps) {
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentUserId = Number(currentUser.id);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Poll for new messages every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            const { data } = await actions.messages.getConversation({ otherUserId: otherUser.id });
            if (data?.messages) {
                // Simple diff check or just replace for now (inefficient but works for small chats)
                // Ideally we should only append new ones
                if (data.messages.length !== messages.length || data.messages[data.messages.length - 1]?.id !== messages[messages.length - 1]?.id) {
                    setMessages(data.messages);
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [otherUser.id, messages]);

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
                // Revert on error
                setMessages(prev => prev.filter(m => m.id !== tempId));
                console.error(error);
            } else {
                // Refresh to get real ID and state
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
        <div className="bg-[#242526] rounded-xl border border-white/10 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#242526]">
                <a href="/comunidad/saltogram/direct" className="text-white/70 hover:text-white">
                    <LucideArrowLeft size={24} />
                </a>
                <img
                    src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.displayName}`}
                    className="w-10 h-10 rounded-full border border-white/10"
                />
                <div>
                    <h2 className="text-white font-bold text-sm">{otherUser.displayName}</h2>
                    <p className="text-white/50 text-xs">@{otherUser.username}</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#18191a]">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUserId;
                    const showDate = index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

                    return (
                        <div key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-4">
                                    <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full">
                                        {format(new Date(msg.createdAt), "d 'de' MMMM", { locale: es })}
                                    </span>
                                </div>
                            )}
                            
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                    isMe 
                                        ? 'bg-blue-600 text-white rounded-br-none' 
                                        : 'bg-[#3a3b3c] text-white rounded-bl-none'
                                }`}>
                                    {/* Story Reply Context */}
                                    {msg.story && (
                                        <div className="mb-2 pb-2 border-b border-white/20">
                                            <p className="text-xs opacity-70 mb-1">Respondió a tu historia:</p>
                                            <div className="h-32 rounded-lg overflow-hidden bg-black/20 relative">
                                                {msg.story.mediaType === 'image' ? (
                                                    <img src={msg.story.mediaUrl} className="w-full h-full object-cover opacity-70" />
                                                ) : (
                                                    <video src={msg.story.mediaUrl} className="w-full h-full object-cover opacity-70" />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reaction */}
                                    {msg.reaction && (
                                        <div className="text-4xl mb-1">{msg.reaction}</div>
                                    )}

                                    {/* Text Content */}
                                    {msg.content && (
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    )}
                                    
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-white/40'}`}>
                                        {format(new Date(msg.createdAt), "HH:mm")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#242526] border-t border-white/10">
                <div className="flex items-center gap-2 bg-[#3a3b3c] rounded-full px-4 py-2">
                    <button className="text-white/50 hover:text-white transition-colors">
                        <LucideSmile size={24} />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onInput={(e) => setNewMessage(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Envía un mensaje..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/50 text-sm"
                    />
                    {newMessage.trim() ? (
                        <button 
                            onClick={handleSend}
                            disabled={sending}
                            className="text-blue-500 hover:text-blue-400 font-semibold text-sm transition-colors"
                        >
                            Enviar
                        </button>
                    ) : (
                        <button className="text-white/50 hover:text-white transition-colors">
                            <LucideImage size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
