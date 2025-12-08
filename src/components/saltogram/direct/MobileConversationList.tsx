import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MobileConversationList() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const { data, error } = await actions.messages.getConversations();
            if (data?.conversations) {
                setConversations(data.conversations as any);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="p-4 border-b border-border sticky top-0 bg-background z-10">
                <h1 className="text-xl font-bold text-foreground">Mensajes</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No tienes mensajes.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {conversations.map((conv) => (
                            <a
                                key={conv.user.id}
                                href={`/saltogram/direct/${conv.user.id}`}
                                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                            >
                                <div className="relative">
                                    <img
                                        src={conv.user.avatar || '/images/avatars/default.png'}
                                        className="w-14 h-14 rounded-full object-cover"
                                    />
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold truncate text-foreground text-lg">
                                            {conv.user.name || conv.user.username}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: es })}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                        {conv.lastMessage.senderId === conv.user.id ? '' : 'Tú: '}
                                        {conv.lastMessage.content}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}