import { useState } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideUserPlus, LucideUserCheck, LucideUserX, LucideLoader2, LucideCheck, LucideX } from "lucide-preact";
import { toast } from "sonner";

interface FriendButtonProps {
    friendId: number;
    initialStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
    requestId?: number;
}

export default function FriendButton({ friendId, initialStatus, requestId }: FriendButtonProps) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);

    const handleSendRequest = async () => {
        setLoading(true);
        const { error } = await actions.friends.sendRequest({ friendId });
        setLoading(false);
        if (error) {
            toast.error(error.message);
            return;
        }
        setStatus('pending_sent');
        toast.success("Solicitud enviada");
    };

    const handleAcceptRequest = async () => {
        if (!requestId) return;
        setLoading(true);
        const { error } = await actions.friends.acceptRequest({ requestId });
        setLoading(false);
        if (error) {
            toast.error(error.message);
            return;
        }
        setStatus('accepted');
        toast.success("Solicitud aceptada");
    };

    const handleRejectRequest = async () => {
        if (!requestId) return;
        setLoading(true);
        const { error } = await actions.friends.rejectRequest({ requestId });
        setLoading(false);
        if (error) {
            toast.error(error.message);
            return;
        }
        setStatus('none');
        toast.success("Solicitud rechazada");
    };

    const handleRemoveFriend = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar a este amigo?")) return;
        setLoading(true);
        const { error } = await actions.friends.removeFriend({ friendId });
        setLoading(false);
        if (error) {
            toast.error(error.message);
            return;
        }
        setStatus('none');
        toast.success("Amigo eliminado");
    };

    if (loading) {
        return (
            <button disabled class="px-4 py-2 bg-white/10 rounded-lg text-white/50 cursor-not-allowed">
                <LucideLoader2 class="animate-spin" size={20} />
            </button>
        );
    }

    if (status === 'accepted') {
        return (
            <div class="flex gap-2">
                <button class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg flex items-center gap-2 cursor-default">
                    <LucideUserCheck size={20} />
                    <span>Amigos</span>
                </button>
                <button
                    onClick={handleRemoveFriend}
                    class="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Eliminar amigo"
                >
                    <LucideUserX size={20} />
                </button>
            </div>
        );
    }

    if (status === 'pending_sent') {
        return (
            <button disabled class="px-4 py-2 bg-white/10 text-white/50 rounded-lg flex items-center gap-2 cursor-not-allowed">
                <LucideUserCheck size={20} />
                <span>Solicitud enviada</span>
            </button>
        );
    }

    if (status === 'pending_received') {
        return (
            <div class="flex gap-2">
                <button
                    onClick={handleAcceptRequest}
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                    <LucideCheck size={20} />
                    <span>Aceptar</span>
                </button>
                <button
                    onClick={handleRejectRequest}
                    class="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                    <LucideX size={20} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleSendRequest}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
            <LucideUserPlus size={20} />
            <span>Agregar amigo</span>
        </button>
    );
}
