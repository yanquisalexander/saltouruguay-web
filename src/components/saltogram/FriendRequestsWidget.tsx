import { useEffect, useState } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { route } from "preact-router";
import { LucideCheck, LucideX } from "lucide-preact";

interface FriendRequest {
    id: number;
    user: {
        id: number;
        displayName: string;
        username: string;
        avatar: string | null;
    };
    createdAt: Date;
}

interface FriendRequestsWidgetProps {
    initialRequests: FriendRequest[];
    onRequestsChange?: (next: FriendRequest[]) => void;
}

export default function FriendRequestsWidget({ initialRequests, onRequestsChange }: FriendRequestsWidgetProps) {
    const [requests, setRequests] = useState(initialRequests);

    useEffect(() => {
        setRequests(initialRequests);
    }, [initialRequests]);

    const handleAccept = async (requestId: number) => {
        const { error } = await actions.friends.acceptRequest({ requestId });
        if (error) {
            toast.error(error.message);
            return;
        }
        const next = requests.filter(r => r.id !== requestId);
        setRequests(next);
        onRequestsChange?.(next);
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
        onRequestsChange?.(next);
        toast.success("Solicitud rechazada");
    };

    if (requests.length === 0) return null;

    // Show only first 3 in widget
    const displayRequests = requests.slice(0, 3);

    return (
        <div className="bg-white/5 rounded-3xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Solicitudes</p>
                <button
                    onClick={() => route('/saltogram/requests')}
                    className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                >
                    Ver todo
                </button>
            </div>

            <div className="space-y-4">
                {displayRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-3">
                        <a href={`/saltogram/u/${req.user.username}`} className="shrink-0">
                            <img
                                src={req.user.avatar || `https://ui-avatars.com/api/?name=${req.user.displayName}`}
                                alt={req.user.displayName}
                                className="w-10 h-10 rounded-full object-cover border border-white/10"
                            />
                        </a>
                        <div className="flex-1 min-w-0">
                            <a href={`/saltogram/u/${req.user.username}`} className="font-medium text-white text-sm hover:underline truncate block">
                                {req.user.displayName}
                            </a>
                            <div className="flex gap-2 mt-1.5">
                                <button
                                    onClick={() => handleAccept(req.id)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center"
                                    title="Aceptar"
                                >
                                    <LucideCheck size={14} />
                                </button>
                                <button
                                    onClick={() => handleReject(req.id)}
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center"
                                    title="Rechazar"
                                >
                                    <LucideX size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
