import { useState } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";

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
}

export default function FriendRequestsWidget({ initialRequests }: FriendRequestsWidgetProps) {
    const [requests, setRequests] = useState(initialRequests);

    const handleAccept = async (requestId: number) => {
        const { error } = await actions.friends.acceptRequest({ requestId });
        if (error) {
            toast.error(error.message);
            return;
        }
        setRequests(prev => prev.filter(r => r.id !== requestId));
        toast.success("Solicitud aceptada");
    };

    const handleReject = async (requestId: number) => {
        const { error } = await actions.friends.rejectRequest({ requestId });
        if (error) {
            toast.error(error.message);
            return;
        }
        setRequests(prev => prev.filter(r => r.id !== requestId));
        toast.success("Solicitud rechazada");
    };

    if (requests.length === 0) return null;

    return (
        <div className="bg-[#242526] rounded-xl p-4 border border-white/5 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#e4e6eb] font-semibold text-[17px]">Solicitudes de amistad</h3>
                <span className="text-blue-400 text-sm cursor-pointer hover:underline">Ver todo</span>
            </div>

            <div className="space-y-4">
                {requests.map(req => (
                    <div key={req.id} className="flex items-center gap-3">
                        <a href={`/comunidad/saltogram/u/${req.user.username}`}>
                            <img
                                src={req.user.avatar || `https://ui-avatars.com/api/?name=${req.user.displayName}`}
                                alt={req.user.displayName}
                                className="w-[60px] h-[60px] rounded-full object-cover border border-white/5"
                            />
                        </a>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <a href={`/comunidad/saltogram/u/${req.user.username}`} className="font-semibold text-[#e4e6eb] text-[15px] hover:underline truncate block">
                                    {req.user.displayName}
                                </a>
                                <span className="text-xs text-[#b0b3b8] whitespace-nowrap ml-2">
                                    {new Date(req.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => handleAccept(req.id)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold py-1.5 rounded-md transition-colors"
                                >
                                    Confirmar
                                </button>
                                <button
                                    onClick={() => handleReject(req.id)}
                                    className="flex-1 bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] text-[15px] font-semibold py-1.5 rounded-md transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
