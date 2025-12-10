import { useState, useEffect } from "preact/hooks";
import { toast } from "sonner";
import { LucideUserX, LucideLoader2, LucideMessageCircle } from "lucide-preact";
import SaltogramFeed from "../SaltogramFeed";
import type { Session } from "@auth/core/types";
import type { ProfileUser } from "@/types/saltogram";
import { route } from "preact-router";

interface ProfileViewProps {
    user?: Session["user"];
    username?: string; // From router
    path?: string;
}

export default function ProfileView({ user, username }: ProfileViewProps) {
    const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const targetUsername = username || user?.username;

    useEffect(() => {
        if (!targetUsername) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(false);

        fetch(`/api/saltogram/profile/${targetUsername}`)
            .then(res => {
                if (!res.ok) throw new Error("Not found");
                return res.json();
            })
            .then(data => {
                setProfileUser(data.user);
                document.title = `${data.user.displayName} - Saltogram`;
            })
            .catch(() => {
                setError(true);
                setProfileUser(null);
                document.title = "Usuario no encontrado - Saltogram";
            })
            .finally(() => {
                setLoading(false);
            });
    }, [targetUsername]);

    if (!targetUsername) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-4">
                <LucideUserX size={48} />
                <p>Debes iniciar sesión para ver tu perfil.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <LucideLoader2 size={32} className="animate-spin text-white/50" />
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-4">
                <LucideUserX size={48} />
                <p>Usuario no encontrado.</p>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row gap-4 items-start">
                <img
                    src={profileUser.avatar || `https://ui-avatars.com/api/?name=${profileUser.displayName}`}
                    className="w-20 h-20 rounded-2xl border border-white/10 object-cover"
                    alt={profileUser.displayName}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-anton text-white">{profileUser.displayName}</h1>
                        {profileUser.tier && profileUser.tier > 0 && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30 font-medium">
                                VIP
                            </span>
                        )}
                        {profileUser.admin && (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs border border-red-500/30 font-medium">
                                ADMIN
                            </span>
                        )}
                    </div>
                    <p className="text-white/60 text-sm mb-3">@{profileUser.username}</p>
                    {profileUser.bio && (
                        <p className="text-white/80 text-sm mb-4 max-w-lg">{profileUser.bio}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-white/50">
                        <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{profileUser.friendsCount || 0}</span>
                            <span>amigos</span>
                        </div>
                    </div>
                </div>
                {user?.username !== profileUser.username && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => route(`/saltogram/direct/${profileUser.id}`)}
                            className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors flex items-center gap-2"
                        >
                            <LucideMessageCircle size={16} />
                            Mensaje
                        </button>
                        <button
                            onClick={() => toast.success("Pronto podrás enviar solicitudes de amistad")}
                            className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm border border-white/20 hover:bg-white/20 transition-colors"
                        >
                            Agregar a amigos
                        </button>
                    </div>
                )}
            </div>

            <SaltogramFeed
                user={user}
                targetUserId={profileUser.id}
            />
        </section>
    );
}
