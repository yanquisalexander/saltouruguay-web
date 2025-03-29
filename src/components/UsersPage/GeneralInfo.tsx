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
                id: "twitch-unlink",
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
            <div class="p-6 pt-0 space-y-6 max-w-[100vw] md:max-w-none">
                {/* Nombre de usuario */}
                <div class="space-y-2">
                    <label class="text-sm font-medium" for="username">Nombre de usuario</label>
                    <div class="flex items-center gap-2">
                        <div class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 w-full overflow-auto break-words">
                            {session.user.name}
                        </div>
                        <button
                            class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 hover:bg-neutral-500/10 transition-all duration-200"
                            type="button"
                            onClick={() => toast("Por el momento no puedes editar tu nombre de usuario.", { icon: "⚠️", description: "Estamos trabajando en ello." })}
                        >
                            Editar
                        </button>
                    </div>
                </div>

                {/* Correo electrónico */}
                <div class="space-y-2 w-full">
                    <label class="text-sm font-medium" for="email">Correo electrónico</label>
                    <div class="flex flex-col md:flex-row items-end md:items-center gap-2" title="Tu correo electrónico, proporcionado por Twitch">
                        <div class="rounded-md border px-3 overflow-scroll py-2 text-sm bg-zinc-900/50 cursor-not-allowed w-full opacity-60 max-w-[calc(100vw-8rem)] md:max-w-none">
                            <span>
                                {session.user.email ? session.user.email : "No disponible"}
                            </span>
                        </div>
                        <button disabled class="rounded-md border disabled:cursor-not-allowed px-3 py-2 text-sm bg-zinc-900/50 disabled:opacity-60">Verificado</button>
                    </div>
                </div>

                {/* Conexiones */}
                <div class="pt-4 border-t border-neutral-500/10">
                    <h3 class="text-lg font-medium mb-4">Conexiones</h3>
                    <div class="space-y-4">
                        {connections.map((conn) => (
                            <div key={conn.id} class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                                <div class="flex items-center gap-3">
                                    <div class="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                        {conn.icon}
                                    </div>
                                    <div>
                                        <p class="font-medium">{conn.name}</p>
                                        <p class="text-sm text-neutral-400 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] md:max-w-[300px]">
                                            {conn.details}
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-x-4 sm:flex-row flex-col">
                                    {conn.isConnected && <LucideCircleCheckBig class="text-green-500" />}
                                    {conn.canUnlink && (
                                        <button
                                            class="border px-3 py-2 rounded-md text-sm hover:bg-accent w-full sm:w-auto"
                                            type="button"
                                            onClick={conn.isConnected ? conn.unlinkHandler : conn.linkHandler}
                                        >
                                            {conn.isConnected ? "Desconectar" : "Conectar"}
                                        </button>
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
