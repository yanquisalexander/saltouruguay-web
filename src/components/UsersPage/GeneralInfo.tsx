import type { Session } from "@auth/core/types";
import { useState } from "preact/hooks";
import { toast } from "sonner";
import { LucideCheck, LucideUnlink, LucideLink, LucideMail, LucideUser, LucideCopy, LucideAtSign } from "lucide-preact";
import type { APIUser } from "discord-api-types/v10";
import { IcBaselineDiscord } from "../preactIcons/Discord";

export const GeneralInfo = ({ session, discordUser }: { session: Session, discordUser: APIUser | null }) => {
    const [unlinkingDiscord, setUnlinkingDiscord] = useState(false);

    const handleDiscordUnlink = async () => {
        setUnlinkingDiscord(true);
        try {
            const response = await fetch('/api/linked-accounts/discord/unlink', { method: 'POST' });
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

    const copyEmail = () => {
        if (session.user.email) {
            navigator.clipboard.writeText(session.user.email);
            toast.success("Email copiado");
        }
    };

    const discordLabel = discordUser
        ? `@${discordUser.username}`
        : null;

    const connections = [
        {
            id: "twitch",
            name: "Twitch",
            desc: "Login principal de tu cuenta",
            color: "#9146FF",
            glow: "shadow-[0_0_24px_-6px_rgba(145,70,255,0.5)]",
            icon: <img src="/twitch-icon.png" alt="Twitch" className="size-5" />,
            isConnected: true,
            username: session.user.name,
            status: "Principal",
            canUnlink: false,
            action: () => toast.info("Cuenta principal no desconectable")
        },
        {
            id: "discord",
            name: "Discord",
            desc: "Para roles, sorteos y avisos",
            color: "#5865F2",
            glow: "shadow-[0_0_24px_-6px_rgba(88,101,242,0.5)]",
            icon: <IcBaselineDiscord className="size-5" />,
            isConnected: !!discordUser,
            username: discordLabel,
            status: discordUser ? "Vinculado" : "Sin vincular",
            canUnlink: true,
            action: discordUser ? handleDiscordUnlink : () => location.href = "/api/linked-accounts/discord/link"
        },
    ];

    const linkedCount = connections.filter(c => c.isConnected).length;

    return (
        <div className="p-5 sm:p-7 space-y-8 animate-fade-in">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-anton text-white uppercase tracking-wide leading-none">
                        Datos personales
                    </h3>
                    <p className="text-xs text-white/40 mt-1.5">
                        Tu identidad en Salto Uruguay — sincronizada con Twitch.
                    </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Verificado
                </span>
            </div>

            {/* Datos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="group rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:border-white/15 transition-colors p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5 mb-2">
                        <LucideAtSign size={12} /> Nombre de usuario
                    </p>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-white font-bold text-[15px] truncate">{session.user.name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/35 bg-white/5 border border-white/10 px-2 py-1 rounded-lg shrink-0">
                            Twitch ID
                        </span>
                    </div>
                </div>

                <div className="group rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:border-white/15 transition-colors p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5 mb-2">
                        <LucideMail size={12} /> Correo electrónico
                    </p>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-white/85 font-medium text-[15px] truncate">{session.user.email}</span>
                        <button
                            onClick={copyEmail}
                            title="Copiar email"
                            className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer"
                        >
                            <LucideCopy size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Conexiones */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-anton text-white uppercase tracking-wide leading-none">
                        Conexiones
                    </h3>
                    <span className="text-xs font-mono text-white/40">{linkedCount}/2 vinculadas</span>
                </div>
                <p className="text-xs text-white/40 mb-4">
                    Vinculá Discord para acceder a roles exclusivos y participar en sorteos.
                </p>

                {/* Progress */}
                <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-4">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-500"
                        style={{ width: `${(linkedCount / connections.length) * 100}%` }}
                    />
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className={`
                                relative overflow-hidden rounded-2xl border p-4 flex items-center gap-4 transition-all
                                ${conn.isConnected
                                    ? 'bg-white/[0.04] border-white/10 hover:border-white/20'
                                    : 'bg-black/30 border-dashed border-white/10 hover:border-white/20'
                                }
                            `}
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: conn.color }} />

                            <div
                                className={`size-11 rounded-xl flex items-center justify-center text-white shrink-0 ${conn.isConnected ? conn.glow : "grayscale opacity-50"}`}
                                style={{ backgroundColor: conn.isConnected ? conn.color : '#1c1c22' }}
                            >
                                {conn.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-[15px] font-bold text-white leading-none">{conn.name}</h4>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${conn.isConnected ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/20" : "text-white/35 bg-white/5 border-white/10"}`}>
                                        <span className={`size-1 rounded-full ${conn.isConnected ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                                        {conn.status}
                                    </span>
                                </div>
                                <p className="text-xs text-white/45 truncate mt-1">
                                    {conn.username ?? conn.desc}
                                </p>
                            </div>

                            <div className="shrink-0">
                                {conn.canUnlink ? (
                                    <button
                                        onClick={conn.action}
                                        disabled={conn.id === 'discord' && unlinkingDiscord}
                                        className={`
                                            inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50
                                            ${conn.isConnected
                                                ? 'bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/25'
                                                : 'bg-white text-black hover:bg-zinc-200 shadow-lg'
                                            }
                                        `}
                                    >
                                        {conn.id === 'discord' && unlinkingDiscord ? (
                                            "Procesando…"
                                        ) : (
                                            conn.isConnected ? <><LucideUnlink size={14} /><span className="hidden sm:inline">Desconectar</span></> : <><LucideLink size={14} /> Conectar</>
                                        )}
                                    </button>
                                ) : (
                                    <span className="text-[11px] text-white/30 italic hidden sm:block">No desconectable</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Nota Twitch */}
            <div className="flex items-start gap-3 rounded-2xl bg-violet-500/[0.07] border border-violet-400/20 p-4">
                <span className="size-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <LucideUser size={15} className="text-violet-200" />
                </span>
                <p className="text-xs text-white/55 leading-relaxed">
                    <strong className="text-white/85">¿Cambiaste tu nombre en Twitch?</strong><br />
                    Cerrá sesión y volvé a entrar para sincronizar tu nuevo nombre y avatar automáticamente.
                </p>
            </div>
        </div>
    );
};
