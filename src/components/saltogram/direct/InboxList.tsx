import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { LucideCircle } from "lucide-preact";

interface InboxListProps {
    conversations: any[];
}

export default function InboxList({ conversations }: InboxListProps) {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white/40"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Tus mensajes</h3>
                <p className="text-white/50 max-w-xs">
                    Envía fotos y mensajes privados a tus amigos. Responde a sus historias para iniciar una conversación.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {conversations.map((conv) => (
                <a
                    key={conv.user.id}
                    href={`/comunidad/saltogram/direct/${conv.user.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                    <div className="relative">
                        <img
                            src={conv.user.avatar || `https://ui-avatars.com/api/?name=${conv.user.displayName}`}
                            alt={conv.user.displayName}
                            className="w-14 h-14 rounded-full object-cover border border-white/10"
                        />
                        {conv.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#242526]">
                                {conv.unreadCount}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className={`text-white truncate ${conv.unreadCount > 0 ? 'font-bold' : 'font-medium'}`}>
                                {conv.user.displayName}
                            </h3>
                            <span className="text-xs text-white/40 whitespace-nowrap ml-2">
                                {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: es })}
                            </span>
                        </div>
                        
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-white/60'}`}>
                            {conv.lastMessage.senderId === conv.user.id ? '' : 'Tú: '}
                            {conv.lastMessage.content || (conv.lastMessage.reaction ? `Reaccionó ${conv.lastMessage.reaction}` : 'Envió una historia')}
                        </p>
                    </div>
                    
                    {conv.unreadCount > 0 && (
                        <div className="text-blue-500">
                            <LucideCircle size={10} fill="currentColor" />
                        </div>
                    )}
                </a>
            ))}
        </div>
    );
}
