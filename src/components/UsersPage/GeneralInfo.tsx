import type { Session } from "@auth/core/types";
import { useState } from "preact/hooks";
import { toast } from "sonner";
import { LucideCheck, LucideUnlink, LucideLink, LucideMail, LucideUser } from "lucide-preact";
import type { APIUser } from "discord-api-types/v10";
import { IcBaselineDiscord } from "../preactIcons/Discord";

export const GeneralInfo = ({ session, discordUser }: { session: Session, discordUser: APIUser | null }) => {
    const [unlinkingDiscord, setUnlinkingDiscord] = useState(false);

    const handleDiscordUnlink = async () => {
        setUnlinkingDiscord(true);
        try {
            const response = await fetch('/api/discord/unlink', { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                toast.success(data.message || "Desvinculado correctamente");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error(data.error || "Error al desvincular");
            }
        } catch (error) {
            toast.error("Error de servidor");
        } finally {
            setUnlinkingDiscord(false);
        }
    };

    const connections = [
        {
            id: "twitch",
            name: "Twitch",
            color: "#9146FF",
            icon: <img src="/twitch-icon.png" alt="Twitch" className="size-6" />,
            isConnected: !!session,
            username: session ? session.user.name : null,
            status: "Conectado (Principal)",
            canUnlink: false,
            action: () => toast.info("Cuenta principal no desconectable")
        },
        {
            id: "discord",
            name: "Discord",
            color: "#5865F2",
            icon: <IcBaselineDiscord className="size-6" />,
            isConnected: !!discordUser,
            username: discordUser ? `${discordUser.username}#${discordUser.discriminator}` : null,
            status: discordUser ? "Conectado" : "No conectado",
            canUnlink: true,
            action: discordUser ? handleDiscordUnlink : () => location.href = "/api/discord/link"
        },
    ];

    return (
        <div className="p-6 md:p-8 space-y-10 animate-fade-in">

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div>
                <h3 className="text-xl font-anton text-white uppercase tracking-wide mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                    Datos Personales
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username Field */}
                    <div className="group bg-white/5 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                        <label className="text-xs font-rubik text-white/40 uppercase tracking-widest font-bold mb-2 block flex items-center gap-2">
                            <LucideUser size={12} /> Nombre de usuario
                        </label>
                        <div className="flex items-center justify-between">
                            <span className="text-white font-medium text-lg">{session.user.name}</span>
                            <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded">Solo lectura</span>
                        </div>
                    </div>

                    {/* Email Field */}
                    <div className="group bg-white/5 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                        <label className="text-xs font-rubik text-white/40 uppercase tracking-widest font-bold mb-2 block flex items-center gap-2">
                            <LucideMail size={12} /> Correo Electrónico
                        </label>
                        <div className="flex items-center justify-between">
                            <span className="text-white font-medium text-lg truncate max-w-[200px] opacity-80">{session.user.email}</span>
                            <div className="flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-1 rounded text-xs font-bold">
                                <LucideCheck size={12} /> Verificado
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: CONEXIONES */}
            <div>
                <h3 className="text-xl font-anton text-white uppercase tracking-wide mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                    Conexiones Activas
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className={`
                                relative overflow-hidden rounded-xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all
                                ${conn.isConnected
                                    ? 'bg-white/5 border-white/10 hover:border-white/20'
                                    : 'bg-black/40 border-white/5 opacity-80 hover:opacity-100'
                                }
                            `}
                        >
                            {/* Color Bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: conn.color }}></div>

                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div
                                    className="size-12 rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg"
                                    style={{ backgroundColor: conn.isConnected ? conn.color : '#1a1a1a' }}
                                >
                                    {conn.icon}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white leading-none mb-1">{conn.name}</h4>
                                    <p className="text-sm text-white/50 font-rubik">
                                        {conn.username || "Sin vincular"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {conn.isConnected && (
                                    <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                                        <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
                                        Activo
                                    </span>
                                )}

                                {conn.canUnlink ? (
                                    <button
                                        onClick={conn.action}
                                        disabled={conn.id === 'discord' && unlinkingDiscord}
                                        className={`
                                            flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full sm:w-auto
                                            ${conn.isConnected
                                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20'
                                                : 'bg-white text-black hover:bg-gray-200'
                                            }
                                        `}
                                    >
                                        {conn.id === 'discord' && unlinkingDiscord ? (
                                            "Procesando..."
                                        ) : (
                                            conn.isConnected ? <><LucideUnlink size={16} /> Desconectar</> : <><LucideLink size={16} /> Conectar</>
                                        )}
                                    </button>
                                ) : (
                                    <span className="text-xs text-white/30 italic px-2">No desconectable</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};