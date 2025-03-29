import type { Session } from "@auth/core/types";
import { useState } from "preact/hooks";
import { toast } from "sonner";
import { LucideCircleCheckBig } from "lucide-preact";
import type { APIUser } from "discord-api-types/v10";
import { IcBaselineDiscord } from "../preactIcons/Discord";

export const GeneralInfo = ({ session, discordUser }: { session: Session, discordUser: APIUser | null }) => {
    const [connections] = useState([
        {
            id: "twitch",
            name: "Twitch",
            icon: <img src="/twitch-icon.png" alt="Twitch" class="size-8" />,
            isConnected: !!session,
            details: session ? `Conectado como ${session.user.name}` : "No conectado",
            canUnlink: true,
            unlinkHandler: () => toast.error("Tu cuenta de Twitch no puede ser desconectada", {
                description: "Este es el método de autenticación principal de la plataforma, por lo que no puedes desconectarla.",
            }),


        },
        {
            id: "discord",
            name: "Discord",
            icon: <IcBaselineDiscord />,
            isConnected: !!discordUser,
            details: discordUser ? `Conectado como ${discordUser.username}#${discordUser.discriminator}` : "No conectado",
            canUnlink: true,
            linkHandler: () => {
                toast.loading("Conectando a Discord...");
                location.href = "/api/discord/link";
            },
            unlinkHandler: () => toast.error("No disponible por el momento."),
        },
    ]);

    return (
        <>
            <div class="flex flex-col space-y-1.5 py-6 px-2">
                <h3 class="text-xl font-semibold leading-none tracking-tight">Información de usuario</h3>
                <p class="text-sm text-neutral-400">Gestiona tu información personal y cómo se muestra en la plataforma.</p>
            </div>
            <div class="p-6 pt-0 space-y-6">
                <div class="space-y-2">
                    <label class="text-sm font-medium" for="username">Nombre de usuario</label>
                    <div class="flex items-center gap-2">
                        <div class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 w-full">{session.user.name}</div>
                        <button
                            class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 hover:bg-neutral-500/10 transition-all duration-200"
                            type="button"
                            onClick={() => toast("Por el momento no puedes editar tu nombre de usuario.", { icon: "⚠️", description: "Estamos trabajando en ello." })}
                        >
                            Editar
                        </button>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="text-sm font-medium" for="email">Correo electrónico</label>
                    <div class="flex items-center gap-2">
                        <div class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 w-full">{session.user.email}</div>
                        <button disabled class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 disabled:opacity-60">Verificado</button>
                    </div>
                </div>
                <div class="pt-4 border-t border-neutral-500/10">
                    <h3 class="text-lg font-medium mb-4">Conexiones</h3>
                    <div class="space-y-4">
                        {connections.map((conn) => (
                            <div key={conn.id} class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                        {conn.icon}
                                    </div>
                                    <div>
                                        <p class="font-medium">{conn.name}</p>
                                        <p class="text-sm text-neutral-400">{conn.details}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-x-4">
                                    {conn.isConnected && <LucideCircleCheckBig class="text-green-500" />}
                                    {conn.canUnlink && (
                                        conn.isConnected ? (
                                            <button
                                                class="border px-3 py-2 rounded-md text-sm hover:bg-accent"
                                                type="button"
                                                onClick={conn.unlinkHandler}
                                            >
                                                Desconectar
                                            </button>
                                        ) : (
                                            <button
                                                class="border px-3 py-2 rounded-md text-sm hover:bg-accent"
                                                type="button"
                                                onClick={conn.linkHandler}
                                            >
                                                Conectar
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};