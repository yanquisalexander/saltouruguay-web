import { useEffect } from "preact/hooks";
import { LucideLoader2, LucideInbox } from "lucide-preact";
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
        <section className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 p-6">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Mensajes Directos</p>
                    <h2 className="text-2xl font-anton text-white">Bandeja</h2>
                </div>
                <button
                    onClick={loadConversations}
                    className="text-sm text-white/60 hover:text-white flex items-center gap-2"
                >
                    <LucideLoader2 size={16} className={loadingConversations ? "animate-spin" : "hidden md:inline"} />
                    Actualizar
                </button>
            </header>
            {user ? (
                conversations.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-16 gap-3 text-white/60">
                        {loadingConversations ? (
                            <LucideLoader2 size={32} className="animate-spin" />
                        ) : (
                            <LucideInbox size={32} />
                        )}
                        <p className="text-base font-medium">Tu bandeja está tranquila</p>
                        <p className="text-sm text-white/40 max-w-sm">
                            Chatea con tus amistades o responde historias para iniciar una conversación.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-white/5">
                        {conversations.map((conv) => (
                            <li
                                key={conv.user.id}
                                onClick={() => route(`/saltogram/direct/${conv.user.id}`)}
                                className="py-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors px-2 rounded-xl -mx-2"
                            >
                                <img
                                    src={conv.user.avatar || `https://ui-avatars.com/api/?name=${conv.user.displayName}`}
                                    alt={conv.user.displayName}
                                    className="w-12 h-12 rounded-full border border-white/10 object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm ${conv.unreadCount ? "text-white font-semibold" : "text-white/70"}`}>
                                            {conv.user.displayName}
                                        </p>
                                        <span className="text-xs text-white/40 ml-4 whitespace-nowrap">
                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate ${conv.unreadCount ? "text-white" : "text-white/50"}`}>
                                        {conv.lastMessage.senderId === conv.user.id ? "" : "Tú: "}
                                        {conv.lastMessage.content || conv.lastMessage.reaction || "Reaccionó a tu historia"}
                                    </p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )
            ) : (
                <div className="text-center py-16 space-y-3">
                    <p className="text-white/70">Debes iniciar sesión para ver tus mensajes.</p>
                </div>
            )}
        </section>
    );
}
