import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { LucideMessageCircle } from "lucide-preact";

interface InboxListProps {
    conversations: any[];
}

export default function InboxList({ conversations }: InboxListProps) {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-[#b3c8ff]/8 rounded-full flex items-center justify-center mb-4">
                    <LucideMessageCircle size={28} className="text-[#b3c8ff]/60" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Tus mensajes</h3>
                <p className="text-sm text-white/40 max-w-xs">
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
                    href={`/saltogram/direct/${conv.user.id}`}
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors duration-200 border-b border-white/[0.03] last:border-b-0"
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

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2 mb-0.5">
                            <h3 className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                                {conv.user.displayName}
                            </h3>
                            <span className="text-[10px] text-white/30 whitespace-nowrap">
                                {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false, locale: es })}
                            </span>
                        </div>

                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-white/80 font-medium' : 'text-white/40'}`}>
                            {conv.lastMessage.senderId === conv.user.id ? '' : <span className="text-[#b3c8ff]/60">Tú: </span>}
                            {conv.lastMessage.content || (conv.lastMessage.reaction ? `Reaccionó ${conv.lastMessage.reaction}` : 'Envió una historia')}
                        </p>
                    </div>
                </a>
            ))}
        </div>
    );
}
