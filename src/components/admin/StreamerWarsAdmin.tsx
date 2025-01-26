import { PUSHER_KEY } from "@/config";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import Pusher from "pusher-js";
import { StreamerWarsPlayers } from "./streamer-wars/Players";

export const StreamerWarsAdmin = () => {
    const [pusher, setPusher] = useState<Pusher | null>(null);

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
                </div>
            )}
        </div>
    );

};
