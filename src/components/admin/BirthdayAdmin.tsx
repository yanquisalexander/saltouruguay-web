import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { LucideLoader2, LucideCheck, LucideTrash2, LucideCake, LucideClock } from "lucide-preact";

interface Message {
    id: number;
    message: string;
    createdAt: string;
    userId: number;
    username: string;
    displayName: string;
    avatar: string | null;
}

export default function BirthdayAdmin() {
    const [pending, setPending] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPending();
    }, []);

    async function loadPending() {
        setLoading(true);
        const { data, error } = await actions.cumple.getPendingMessages({});
        if (data?.messages) setPending(data.messages);
        setLoading(false);
    }

    async function handleApprove(id: number) {
        toast.loading("Aprobando...", { id: `approve-${id}` });
        const { error } = await actions.cumple.approveMessage({ messageId: id });
        if (error) {
            toast.error(error.message, { id: `approve-${id}` });
        } else {
            toast.success("Mensaje aprobado", { id: `approve-${id}` });
            setPending((prev) => prev.filter((m) => m.id !== id));
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("¿Eliminar este mensaje?")) return;
        toast.loading("Eliminando...", { id: `delete-${id}` });
        const { error } = await actions.cumple.deleteMessage({ messageId: id });
        if (error) {
            toast.error(error.message, { id: `delete-${id}` });
        } else {
            toast.success("Mensaje eliminado", { id: `delete-${id}` });
            setPending((prev) => prev.filter((m) => m.id !== id));
        }
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("es-UY", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Montevideo",
        });
    }

    function getAvatar(url: string | null, name: string) {
        return url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=9146ff&color=fff&bold=true`;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <LucideCake className="text-pink-400" size={24} />
                <h1 className="text-2xl font-bold text-white">Mensajes de Cumpleaños</h1>
                <span className="bg-pink-500/20 text-pink-300 text-xs font-medium px-2.5 py-1 rounded-full">
                    {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
                </span>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <LucideLoader2 size={32} className="animate-spin text-pink-400" />
                    <p className="text-white/30 text-sm">Cargando mensajes...</p>
                </div>
            ) : pending.length === 0 ? (
                <div className="bg-[#1a1b2e] rounded-2xl border border-[#2a2d4a] p-10 text-center">
                    <LucideCake className="text-white/10 mx-auto mb-3" size={48} />
                    <p className="text-white/30 text-sm">No hay mensajes pendientes</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pending.map((msg) => (
                        <div
                            key={msg.id}
                            className="bg-[#1a1b2e] rounded-2xl border border-[#2a2d4a] p-4 flex items-start gap-4"
                        >
                            <img
                                src={getAvatar(msg.avatar, msg.username)}
                                alt={msg.displayName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-[#2a2d4a] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white/90 text-sm font-medium">{msg.displayName}</span>
                                    <span className="text-white/30 text-xs">@{msg.username}</span>
                                    <span className="text-white/20 text-xs flex items-center gap-1">
                                        <LucideClock size={10} />
                                        {formatDate(msg.createdAt)}
                                    </span>
                                </div>
                                <p className="text-white/70 text-sm whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => handleApprove(msg.id)}
                                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                    title="Aprobar"
                                >
                                    <LucideCheck size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(msg.id)}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="Eliminar"
                                >
                                    <LucideTrash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
