import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { useChatStore } from '@/stores/chatStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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

    const handleOpenChat = (user: any) => {
        openChat(user);
        // Optional: close inbox when opening a chat? Maybe not, Facebook keeps it open or separate.
        // onClose(); 
    };

    return (
        <div className="w-80 h-96 bg-card border border-border rounded-t-lg shadow-xl flex flex-col">
            <div className="p-3 border-b border-border flex justify-between items-center bg-card rounded-t-lg">
                <h3 className="font-bold text-lg text-card-foreground">Mensajes</h3>
                <div className="flex gap-2">
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-card">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No tienes mensajes recientes.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {conversations.map((conv) => (
                            <button
                                key={conv.user.id}
                                onClick={() => handleOpenChat(conv.user)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                            >
                                <div className="relative">
                                    <img
                                        src={conv.user.avatar || '/images/avatars/default.png'}
                                        alt={conv.user.username}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold truncate text-card-foreground">
                                            {conv.user.name || conv.user.username}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: es })}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-card-foreground' : 'text-muted-foreground'}`}>
                                        {conv.lastMessage.senderId === conv.user.id ? '' : 'Tú: '}
                                        {conv.lastMessage.content}
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