import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LucideLoader2, LucideMessageCircle } from 'lucide-preact';

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
        <div className="h-full flex flex-col bg-[#0a0b1a]">
            <div className="px-4 py-3 border-b border-white/8 sticky top-0 bg-[#0f1124]/90 backdrop-blur-xl z-10">
                <h1 className="text-lg font-bold text-white">Mensajes</h1>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <LucideLoader2 className="animate-spin text-[#b3c8ff]" size={24} />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
                        <div className="w-14 h-14 bg-[#b3c8ff]/8 rounded-full flex items-center justify-center">
                            <LucideMessageCircle size={24} className="text-[#b3c8ff]/60" />
                        </div>
                        <p className="text-white/50">No tienes mensajes.</p>
                    </div>
                ) : (
                    <div>
                        {conversations.map((conv) => (
                            <a
                                key={conv.user.id}
                                href={`/saltogram/direct/${conv.user.id}`}
                                className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors duration-200 border-b border-white/[0.03]"
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={conv.user.avatar || `https://ui-avatars.com/api/?name=${conv.user.displayName}`}
                                        alt={conv.user.displayName}
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-[#b3c8ff]/10"
                                    />
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-[#ffb4ab] text-[#690005] text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none shadow-sm">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex justify-between items-baseline gap-2">
                                        <span className={`font-semibold text-sm truncate ${conv.unreadCount ? 'text-white' : 'text-white/70'}`}>
                                            {conv.user.displayName}
                                        </span>
                                        <span className="text-[10px] text-white/30 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: es })}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate mt-0.5 ${conv.unreadCount ? 'text-white/80 font-medium' : 'text-white/40'}`}>
                                        {conv.lastMessage.senderId === conv.user.id ? '' : <span className="text-[#b3c8ff]/60">Tú: </span>}
                                        {conv.lastMessage.content || ''}
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
