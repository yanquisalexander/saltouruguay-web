import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { useChatStore } from '@/stores/chatStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LucideX, LucideMessageCircle, LucideLoader2 } from 'lucide-preact';

interface Conversation {
    user: {
        id: string;
        username: string;
        avatar: string;
        name: string;
    };
    lastMessage: {
        content: string;
        createdAt: Date;
        isRead: boolean;
        senderId: string;
    };
    unreadCount: number;
}

export default function InboxWindow({ onClose }: { onClose: () => void }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const { openChat } = useChatStore();

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const { data, error } = await actions.messages.getConversations();
            if (error) {
                console.error(error);
                return;
            }
            if (data && data.conversations) {
                setConversations(data.conversations as any);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChat = (convUser: any) => {
        openChat(convUser);
    };

    return (
        <div className="w-80 h-96 bg-[#0f1124]/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col">
            {/* Header — tonal glass */}
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LucideMessageCircle size={18} className="text-[#b3c8ff]" />
                    <h3 className="font-bold text-base text-white">Mensajes</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/8 rounded-full transition-all duration-200 active:scale-90"
                >
                    <LucideX size={16} />
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto bg-[#0a0b1a] custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <LucideLoader2 className="animate-spin text-[#b3c8ff]" size={24} />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex items-center justify-center h-full px-4">
                        <p className="text-white/40 text-sm italic">No tienes mensajes recientes.</p>
                    </div>
                ) : (
                    <div>
                        {conversations.map((conv) => (
                            <button
                                key={conv.user.id}
                                onClick={() => handleOpenChat(conv.user)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors duration-200 text-left border-b border-white/[0.03] last:border-b-0"
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={conv.user.avatar || `https://ui-avatars.com/api/?name=${conv.user.displayName}`}
                                        alt={conv.user.username}
                                        className="w-11 h-11 rounded-full object-cover ring-2 ring-[#b3c8ff]/10"
                                    />
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[#ffb4ab] text-[#690005] text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none shadow-sm">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-2">
                                        <span className={`font-semibold text-sm truncate ${conv.unreadCount ? 'text-white' : 'text-white/70'}`}>
                                            {conv.user.displayName}
                                        </span>
                                        <span className="text-[10px] text-white/30 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: es })}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-medium text-white/80' : 'text-white/40'}`}>
                                        {conv.lastMessage.senderId !== conv.user.id && (
                                            <span className="text-[#b3c8ff]/60">Tú: </span>
                                        )}
                                        {conv.lastMessage.content || conv.lastMessage.reaction || ''}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
