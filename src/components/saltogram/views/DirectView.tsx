import { useEffect } from "preact/hooks";
import { LucideLoader2, LucideInbox, LucideMessageCircle } from "lucide-preact";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Session } from "@auth/core/types";
import type { ConversationPreview } from "@/types/saltogram";
import { route } from "preact-router";

interface DirectViewProps {
    user?: Session["user"];
    conversations: ConversationPreview[];
    loadingConversations: boolean;
    loadConversations: () => void;
    path?: string;
}

export default function DirectView({ user, conversations, loadingConversations, loadConversations }: DirectViewProps) {
    useEffect(() => {
        document.title = "Mensajes - Saltogram";
    }, []);

    return (
        <section className="bg-[#0f1124]/80 backdrop-blur-xl rounded-[28px] border border-white/8 p-6">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Mensajes Directos</p>
                    <h2 className="text-2xl font-anton text-white tracking-wide">Bandeja</h2>
                </div>
                <button
                    onClick={loadConversations}
                    className="text-sm text-white/50 hover:text-white flex items-center gap-2 transition-colors duration-200"
                >
                    <LucideLoader2 size={16} className={loadingConversations ? "animate-spin" : "hidden md:inline"} />
                    Actualizar
                </button>
            </header>
            {user ? (
                conversations.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-16 gap-3 text-white/60">
                        {loadingConversations ? (
                            <LucideLoader2 size={36} className="animate-spin text-[#b3c8ff]" />
                        ) : (
                            <div className="w-16 h-16 bg-[#b3c8ff]/8 rounded-full flex items-center justify-center">
                                <LucideMessageCircle size={28} className="text-[#b3c8ff]/60" />
                            </div>
                        )}
                        <p className="text-base font-medium text-white/80">Tu bandeja está tranquila</p>
                        <p className="text-sm text-white/40 max-w-sm">
                            Chatea con tus amistades o responde historias para iniciar una conversación.
                        </p>
                    </div>
                ) : (
                    <ul>
                        {conversations.map((conv) => (
                            <li
                                key={conv.user.id}
                                onClick={() => route(`/saltogram/direct/${conv.user.id}`)}
                                className="py-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors duration-200 px-3 rounded-[20px] -mx-3 border-b border-white/[0.03] last:border-b-0"
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={conv.user.avatar || `https://ui-avatars.com/api/?name=${conv.user.displayName}`}
                                        alt={conv.user.displayName}
                                        className="w-12 h-12 rounded-full object-cover ring-2 ring-[#b3c8ff]/10"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-sm truncate ${conv.unreadCount ? "text-white font-semibold" : "text-white/70"}`}>
                                            {conv.user.displayName}
                                        </p>
                                        <span className="text-[10px] text-white/30 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className={`text-xs truncate ${conv.unreadCount ? "text-white/80 font-medium" : "text-white/40"}`}>
                                            {conv.lastMessage.senderId === conv.user.id ? "" : <span className="text-[#b3c8ff]/60">Tú: </span>}
                                            {conv.lastMessage.content || conv.lastMessage.reaction || "Reaccionó a tu historia"}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <span className="shrink-0 ml-2 px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#b3c8ff] text-[#001849]">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            ) : (
                <div className="text-center py-16 space-y-3">
                    <p className="text-white/60">Debes iniciar sesión para ver tus mensajes.</p>
                </div>
            )}
        </section>
    );
}
