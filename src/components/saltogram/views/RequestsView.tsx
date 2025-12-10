import { useEffect, useState } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { LucideUsers, LucideCheck, LucideX } from "lucide-preact";
import type { FriendRequestState } from "@/types/saltogram";

interface RequestsViewProps {
    friendRequestsState: FriendRequestState[];
    setFriendRequestsState: (requests: FriendRequestState[]) => void;
    path?: string;
}

export default function RequestsView({ friendRequestsState, setFriendRequestsState }: RequestsViewProps) {
    const [requests, setRequests] = useState(friendRequestsState);

    useEffect(() => {
        document.title = "Solicitudes - Saltogram";
    }, []);

    useEffect(() => {
        setRequests(friendRequestsState);
    }, [friendRequestsState]);

    const handleAccept = async (requestId: number) => {
        const { error } = await actions.friends.acceptRequest({ requestId });
        if (error) {
            toast.error(error.message);
            return;
        }
        const next = requests.filter(r => r.id !== requestId);
        setRequests(next);
        setFriendRequestsState(next);
        toast.success("Solicitud aceptada");
    };

    const handleReject = async (requestId: number) => {
        const { error } = await actions.friends.rejectRequest({ requestId });
        if (error) {
            toast.error(error.message);
            return;
        }
        const next = requests.filter(r => r.id !== requestId);
        setRequests(next);
        setFriendRequestsState(next);
        toast.success("Solicitud rechazada");
    };

    return (
        <section className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 p-6">
            <header className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Solicitudes</p>
                <h2 className="text-2xl font-anton text-white">Amistades pendientes</h2>
                <p className="text-sm text-white/50 mt-1">Gestioná quién puede seguir tus aventuras.</p>
            </header>

            {requests.length === 0 ? (
                <div className="flex flex-col items-center text-center py-16 gap-3 text-white/60">
                    <LucideUsers size={32} />
                    <p className="text-base font-medium">No tienes solicitudes pendientes</p>
                    <p className="text-sm text-white/40 max-w-sm">
                        Cuando alguien quiera ser tu amigo, aparecerá aquí.
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-white/5">
                    {requests.map((req) => (
                        <li key={req.id} className="py-4 flex items-center gap-4">
                            <a href={`/saltogram/u/${req.user.username}`}>
                                <img
                                    src={req.user.avatar || `https://ui-avatars.com/api/?name=${req.user.displayName}`}
                                    alt={req.user.displayName}
                                    className="w-12 h-12 rounded-full border border-white/10 object-cover"
                                />
                            </a>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <a href={`/saltogram/u/${req.user.username}`} className="text-sm text-white font-semibold hover:underline">
                                        {req.user.displayName}
                                    </a>
                                    <span className="text-xs text-white/40 ml-4 whitespace-nowrap">
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-white/50">@{req.user.username}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAccept(req.id)}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-full transition-colors flex items-center gap-1"
                                >
                                    <LucideCheck size={14} />
                                    Confirmar
                                </button>
                                <button
                                    onClick={() => handleReject(req.id)}
                                    className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium rounded-full transition-colors flex items-center gap-1"
                                >
                                    <LucideX size={14} />
                                    Eliminar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
