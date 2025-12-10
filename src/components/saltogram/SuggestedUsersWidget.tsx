import { useState } from "preact/hooks";
import { LucideUserPlus, LucideCheck, LucideUsers } from "lucide-preact";
import { actions } from "astro:actions";
import { toast } from "sonner";

interface SuggestedUser {
    id: number;
    displayName: string;
    username: string;
    avatar: string | null;
}

interface Props {
    users: SuggestedUser[];
}

export default function SuggestedUsersWidget({ users }: Props) {
    const [sentRequests, setSentRequests] = useState<number[]>([]);
    const [loading, setLoading] = useState<number | null>(null);

    const handleAddFriend = async (userId: number) => {
        setLoading(userId);
        try {
            const { error } = await actions.friends.sendRequest({ friendId: userId });
            if (error) throw new Error(error.message);

            setSentRequests([...sentRequests, userId]);
            toast.success("Solicitud enviada");
        } catch (e: any) {
            toast.error(e.message || "Error al enviar solicitud");
        } finally {
            setLoading(null);
        }
    };

    if (users.length === 0) return null;

    return (
        <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-anton text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                <LucideUsers size={18} className="text-blue-500" /> A quién seguir
            </h3>

            <div className="space-y-4">
                {users.map((user) => {
                    const isSent = sentRequests.includes(user.id);

                    return (
                        <div key={user.id} className="flex items-center justify-between group">
                            <a href={`/saltogram/u/${user.username}`} className="flex items-center gap-3">
                                <img
                                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                    alt={user.displayName}
                                    className="w-10 h-10 rounded-full object-cover border border-white/5"
                                />
                                <div>
                                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                                        {user.displayName}
                                    </p>
                                    <p className="text-xs text-white/30">@{user.username}</p>
                                </div>
                            </a>

                            <button
                                onClick={() => !isSent && handleAddFriend(user.id)}
                                disabled={isSent || loading === user.id}
                                className={`
                                    p-2 rounded-lg transition-all duration-300
                                    ${isSent
                                        ? 'bg-green-500/10 text-green-500 cursor-default'
                                        : 'bg-white/5 text-white/50 hover:bg-blue-500 hover:text-white'
                                    }
                                `}
                                title={isSent ? "Solicitud enviada" : "Añadir amigo"}
                            >
                                {loading === user.id ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : isSent ? (
                                    <LucideCheck size={16} />
                                ) : (
                                    <LucideUserPlus size={16} />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
