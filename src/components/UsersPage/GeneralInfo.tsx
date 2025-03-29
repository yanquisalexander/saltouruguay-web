import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { useState, useRef } from 'preact/hooks';
import { toast } from "sonner";
import { LucideCircleCheckBig } from "lucide-preact";
import type { APIUser } from "discord-api-types/v10";
import { IcBaselineDiscord } from "../preactIcons/Discord";

export const GeneralInfo = ({ session, discordUser }: { session: Session, discordUser: APIUser | null }) => {
    return (
        <>
            <div class="flex flex-col space-y-1.5 py-6 px-2">
                <h3 class="text-xl font-semibold leading-none tracking-tight">
                    Información de usuario
                </h3>
                <p class="text-sm text-neutral-400">
                    Gestiona tu información personal y cómo se muestra en la plataforma.
                </p>
            </div>
            <div class="p-6 pt-0 space-y-6">
                <div class="space-y-2">
                    <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        for="username">
                        Nombre de usuario
                    </label>
                    <div class="flex items-center gap-2">
                        <div class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 w-full">
                            {session.user.name}
                        </div>
                        <button
                            class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 hover:bg-neutral-500/10 transition-all duration-200"
                            type="button"
                            onClick={() => {
                                toast('Por el momento no puedes editar tu nombre de usuario.', {
                                    icon: "⚠️",
                                    description: "Estamos trabajando en ello.",
                                    action: {
                                        label: "Cerrar",
                                        onClick: () => { }
                                    }
                                } as any)
                            }}

                        >
                            Editar
                        </button>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        for="email">
                        Correo electrónico
                    </label>
                    <div class="flex items-center gap-2">
                        <div class="rounded-md border px-3 py-2 text-sm bg-zinc-900/50 w-full">
                            {session.user.email}
                        </div>
                        <button
                            disabled
                            class="rounded-md border px-3 disabled:opacity-60 disabled:cursor-not-allowed py-2 text-sm bg-zinc-900/50 hover:bg-neutral-500/10 transition-all duration-200"
                            type="button"


                        >
                            Verificado
                        </button>
                    </div>
                </div>

                <div class="pt-4 border-t border-neutral-500/10">
                    <h3 class="text-lg font-medium mb-4">Conexiones</h3>

                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                    <IcBaselineDiscord />

                                </div>
                                <div>
                                    <p class="font-medium">
                                        Discord
                                    </p>
                                    <p class="text-sm text-neutral-400">
                                        {discordUser ? `Conectado como ${discordUser.username}#${discordUser.discriminator}` : "No conectado"}
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-x-4">
                                {
                                    discordUser
                                        ? (
                                            <>
                                                <LucideCircleCheckBig class="text-green-500" />
                                                <button
                                                    class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                                                    type="button"
                                                    onClick={() => {
                                                        toast.error('No disponible por el momento.')
                                                    }}
                                                >
                                                    Desconectar
                                                </button>
                                            </>
                                        )
                                        : <button
                                            class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                                            type="button"
                                            onClick={() => {
                                                toast.loading('Conectando a Discord...')
                                                location.href = "/api/discord/link"
                                            }}
                                        >
                                            Conectar
                                        </button>
                                }

                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}