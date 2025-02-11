import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState } from "preact/hooks";
import { toast } from "sonner";
import Pusher, { type Channel } from "pusher-js";
import { PUSHER_KEY } from "@/config";
import { playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

export const useStreamerWarsSocket = (session: Session | null) => {
    const [pusher, setPusher] = useState<Pusher | null>(null);
    const [gameState, setGameState] = useState<{ component: string; props: any } | null>(null);
    const [recentlyEliminatedPlayer, setRecentlyEliminatedPlayer] = useState<number | null>(null);
    const globalChannel = useRef<Channel | null>(null);
    const presenceChannel = useRef<Channel | null>(null);

    useEffect(() => {
        const pusherInstance = new Pusher(PUSHER_KEY, {
            wsHost: 'soketi.saltouruguayserver.com',
            cluster: "us2",
            enabledTransports: ['ws', 'wss'],
            forceTLS: true,
        });

        setPusher(pusherInstance);

        globalChannel.current = pusherInstance.subscribe("streamer-wars");
        presenceChannel.current = pusherInstance.subscribe("presence-streamer-wars");

        globalChannel.current.bind("player-eliminated", async ({ playerNumber, audioBase64 }: { playerNumber: number, audioBase64: string }) => {
            await playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.2 });
            setRecentlyEliminatedPlayer(playerNumber);
            setTimeout(() => {
                const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                audio.volume = 0.5;
                audio.play();
                playSoundWithReverb({ sound: `data:audio/mp3;base64,${audioBase64}`, volume: 0.5, isBase64: true, reverbAmount: 0.5 });
                /*  const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
                 audio.play(); */
            }, 1000);
        });

        globalChannel.current.bind("send-to-waiting-room", () => {
            setGameState(null);
            toast("Todos los jugadores han sido enviados a la sala de espera");
        });

        globalChannel.current.bind("launch-game", ({ game, props }: { game: string, props: any }) => {
            setGameState({
                component: game,
                props: { session, pusher: pusherInstance, ...props },
            });

            document.addEventListener('instructions-ended', () => {
                const START_GAME_SOUNDS = [
                    STREAMER_WARS_SOUNDS.ES_HORA_DE_JUGAR,
                    STREAMER_WARS_SOUNDS.QUE_COMIENCE_EL_JUEGO,
                ]

                const randomSound = START_GAME_SOUNDS[Math.floor(Math.random() * START_GAME_SOUNDS.length)];

                playSound({ sound: randomSound });
            }, { once: true });
        });

        return () => {
            globalChannel.current?.unbind_all();
            globalChannel.current?.unsubscribe();
            presenceChannel.current?.unbind_all();
            presenceChannel.current?.unsubscribe();
            pusherInstance.disconnect();
        };
    }, []);

    return { pusher, gameState, setGameState, recentlyEliminatedPlayer, globalChannel, presenceChannel };
};
