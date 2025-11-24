import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { StreamerWarsPlayers } from "./streamer-wars/Players";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { LucideBellRing, LucideCoffee, LucideFlag, LucideGavel, LucideLockKeyholeOpen, LucideMessageSquareLock, LucideRefreshCw, LucideTrash2 } from "lucide-preact";
import type { Session } from "@auth/core/types";
import { usePusher } from "@/hooks/usePusher";


let GENERAL_ACTIONS = [
    {
        name: "Anunciar dificultades técnicas",
        classes: "bg-red-500 hover:bg-red-600 !text-black",
        icon: LucideBellRing,
        execute: async () => {
            toast.promise(actions.streamerWars.techDifficulties(), {
                loading: "Enviando anuncio...",
                success: "Anuncio enviado",
                error: "Error al enviar anuncio",
            });
        }
    },
    {
        name: "Desbloquear jornada",
        classes: "bg-green-500 hover:bg-green-600 !text-black",
        icon: LucideLockKeyholeOpen,
        execute: async () => {
            toast.promise(actions.streamerWars.setDayAsAvailable(), {
                loading: "Desbloqueando jornada...",
                success: "Jornada desbloqueada",
                error: "Error al desbloquear jornada",
            });
        }
    },
    {
        name: "Finalizar jornada",
        classes: "bg-blue-500 hover:bg-blue-600 !text-black",
        icon: LucideFlag,
        execute: async () => {
            toast.promise(actions.streamerWars.finishDay(), {
                loading: "Finalizando jornada...",
                success: "Jornada finalizada",
                error: "Error al finalizar jornada",
            });
        }
    },
    {
        name: "Iniciar Simón Dice",
        classes: "bg-yellow-500 hover:bg-yellow-600 !text-black",
        icon: LucideFlag,
        execute: async () => {
            toast.promise(actions.games.simonSays.startGame(), {
                loading: "Iniciando Simón Dice...",
                success: "Simón Dice iniciado",
                error: "Error al iniciar Simón Dice",
            });
        }
    },
    {
        name: "Siguiente ronda Simón Dice",
        classes: "bg-yellow-500 hover:bg-yellow-600 !text-black",
        icon: LucideFlag,
        execute: async () => {
            toast.promise(actions.games.simonSays.advanceToNextRoundForCurrentPlayers(), {
                loading: "Avanzando ronda...",
                success: "Ronda avanzada",
                error: "Error al avanzar ronda",
            });
        }
    },
    {
        name: "Simón Dice: Siguiente ronda con otros jugadores",
        classes: "bg-sky-500 hover:bg-sky-600 !text-black",
        icon: LucideFlag,
        execute: async () => {
            toast.promise(actions.games.simonSays.nextRoundWithOtherPlayers(), {
                loading: "Cambiando jugadores...",
                success: "Jugadores cambiados",
                error: "Error al cambiar jugadores",
            });
        }
    },
    {
        name: "Enviar Jugadores a Sala de Espera",
        classes: "bg-purple-500 hover:bg-purple-600 !text-black",
        icon: LucideCoffee,
        execute: async () => {
            toast.promise(actions.streamerWars.sendToWaitingRoom(), {
                loading: "Enviando jugadores a sala de espera...",
                success: "Jugadores enviados a sala de espera",
                error: "Error al enviar jugadores a sala de espera",
            });
        }
    },
    {
        name: "Limpiar el chat",
        classes: "bg-gray-500 hover:bg-gray-600 !text-black",
        icon: LucideTrash2,
        execute: async () => {
            toast.promise(actions.streamerWars.clearChat(), {
                loading: "Limpiando chat...",
                success: "Chat limpiado",
                error: "Error al limpiar chat",
            });
        }
    },
    {
        name: "Reiniciar Roles",
        classes: "bg-gray-500 hover:bg-gray-600 !text-black",
        icon: LucideRefreshCw,
        execute: async () => {
            toast.promise(actions.streamerWars.resetRoles(), {
                loading: "Reiniciando roles...",
                error: "Error al reiniciar roles",
            });
        }
    },
    {
        name: "Quitar aislamiento de jugadores",
        classes: "bg-gray-500 hover:bg-gray-600 !text-black",
        icon: LucideGavel,
        execute: async () => {
            toast.promise(actions.streamerWars.unaislateAllPlayers(), {
                loading: "Quitando aislamiento...",
                error: "Error al desaislar jugadores",
            });
        }
    },
    {
        name: "Recargar overlay",
        classes: "bg-lime-500 hover:bg-lime-600 !text-black",
        icon: LucideRefreshCw,
        execute: async () => {
            toast.promise(actions.streamerWars.reloadOverlay(), {
                loading: "Recargando overlay...",
                success: "Overlay recargado",
                error: "Error al recargar overlay",
            });
        }
    },
    {
        name: "Bloquear chat",
        classes: "bg-red-500 hover:bg-red-600 !text-black",
        icon: LucideMessageSquareLock,
        execute: async () => {
            toast.promise(actions.streamerWars.lockChat(), {
                loading: "Bloqueando chat...",
                success: "Chat bloqueado",
                error: "Error al bloquear chat",
            });
        }
    },
    {
        name: "Desbloquear chat",
        classes: "bg-green-500 hover:bg-green-600 !text-black",
        icon: LucideMessageSquareLock,
        execute: async () => {
            toast.promise(actions.streamerWars.unlockChat(), {
                loading: "Desbloqueando chat...",
                success: "Chat desbloqueado",
                error: "Error al desbloquear chat",
            });
        }
    }
]


export const StreamerWarsAdmin = ({ session }: { session: Session }) => {
    const { pusher } = usePusher();
    const [announcementText, setAnnouncementText] = useState<string>("");

    useEffect(() => {
        if (session?.user?.name!.toLowerCase() === "alexitoo_uy") {
            GENERAL_ACTIONS = [
                ...GENERAL_ACTIONS,
                {
                    name: "Notificar nueva versión",
                    classes: "bg-purple-500 hover:bg-purple-600 !text-black",
                    icon: LucideFlag,
                    execute: async () => {
                        toast.promise(actions.streamerWars.notifyNewVersion(), {
                            loading: "Notificando nueva versión...",
                            success: "Nueva versión notificada",
                            error: "Error al notificar nueva versión",
                        });
                    }
                }
            ];
        }
    }, []);





    return (
        <div class="flex flex-col items-center">
            <h1 class="text-3xl font-bold text-center mb-4">Admin Streamer Wars</h1>
            {pusher && (
                <div class="flex flex-col items-center">
                    <div class="w-full max-w-2xl mt-8">
                        <label class="block text-lg font-bold mb-2" for="announcement">Anuncio</label>
                        <textarea
                            id="announcement"
                            class="w-full p-2 rounded-lg bg-gray-800 text-white"
                            value={announcementText}
                            onInput={(e) => setAnnouncementText((e.target as HTMLTextAreaElement).value)}
                        ></textarea>
                        <button
                            class="mt-4 bg-lime-500 transition hover:bg-lime-600 text-black font-bold py-2 px-4 rounded-lg"
                            onClick={() => {
                                if (!announcementText) return;
                                actions.streamerWars.sendAnnouncement({ message: announcementText });
                            }}
                        >
                            Enviar anuncio
                        </button>
                    </div>



                    <div class="actions mt-8 mb-8">
                        <h2 class="text-2xl font-bold mb-4">Acciones generales</h2>
                        <div class="grid grid-cols-2 gap-4">



                            {GENERAL_ACTIONS.map(({ name, classes, icon: Icon, execute }, index) => (
                                <button
                                    key={index} // Se necesita una key única
                                    class={`p-4 rounded-lg transition text-white font-bold ${classes}`}
                                    onClick={execute}
                                >
                                    {Icon && <Icon class="size-5 inline-block mr-2 align-middle" />}
                                    <span>{name}</span>
                                </button>
                            ))}

                        </div>

                    </div>
                    <StreamerWarsPlayers pusher={pusher} />



                </div>
            )}
        </div>
    );

};
