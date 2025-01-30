import { PUSHER_KEY } from "@/config";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import Pusher from "pusher-js";
import { StreamerWarsPlayers } from "./streamer-wars/Players";
import { actions } from "astro:actions";

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

    const announceTechDifficulties = async () => {
        await actions.streamerWars.techDifficulties();
    }

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

                    <button
                        class="mt-8 bg-red-500 transition hover:bg-red-600 text-black font-bold py-2 px-4 rounded-lg"
                        onClick={announceTechDifficulties}
                    >
                        Anunciar dificultades técnicas
                    </button>
                </div>
            )}
        </div>
    );

};
