import { PUSHER_KEY } from "@/config";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import Pusher from "pusher-js";
import { StreamerWarsPlayers } from "./streamer-wars/Players";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { LucideBellRing, LucideFlag, LucideLockKeyholeOpen } from "lucide-preact";

const GENERAL_ACTIONS = [
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
    }
];

export const StreamerWarsAdmin = () => {
    const [pusher, setPusher] = useState<Pusher | null>(null);

    const [announcementText, setAnnouncementText] = useState<string>("");

    useEffect(() => {
        const host = 'soketi.saltouruguayserver.com';

        const pusherInstance = new Pusher(PUSHER_KEY, {
            wsHost: host,
            cluster: "us2",
            enabledTransports: ['ws', 'wss'],
            forceTLS: !import.meta.env.DEV, // Usa TLS solo en producción
        });

        setPusher(pusherInstance);



        return () => {
            // Limpia la instancia de Pusher al desmontar el componente
            pusherInstance.disconnect();
        };
    }, []);


    return (
        <div class="flex flex-col items-center">
            <h1 class="text-3xl font-bold text-center mb-4">Admin Streamer Wars</h1>
            {pusher && (
                <div class="flex flex-col items-center">
                    <StreamerWarsPlayers pusher={pusher} />


                    <div class="w-full mt-8">
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



                    <div class="actions mt-8">
                        <h2 class="text-2xl font-bold mb-4">Acciones generales</h2>
                        <div class="grid grid-cols-2 gap-4">
                            {GENERAL_ACTIONS.map(({ name, classes, icon: Icon, execute }) => (
                                <button
                                    class={`p-4 rounded-lg transition text-white font-bold ${classes}`}
                                    onClick={execute}
                                >
                                    {
                                        Icon && <Icon class="size-5 inline-block mr-2 align-middle" />
                                    }
                                    <span>{name}</span>
                                </button>
                            ))}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );

};
