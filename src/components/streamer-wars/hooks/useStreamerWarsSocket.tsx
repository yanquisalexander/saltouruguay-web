import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState } from "preact/hooks";
import { toast } from "sonner";
import { toast as retroToast } from "@/components/ui/8bit/toast";
import Pusher, { type Channel } from "pusher-js";
import { PUSHER_KEY } from "@/config";
import {
    CDN_PREFIX,
    playSound,
    playSoundWithReverb,
    STREAMER_WARS_SOUNDS,
} from "@/consts/Sounds";
import { LucideSiren } from "lucide-preact";
import { navigate } from "astro/virtual-modules/transitions-router.js";
import { decodeAudioFromPusher } from "@/services/pako-compress.client";
import { AVAILABLE_AUDIOS, type AudioState } from "@/types/audio";

export const useStreamerWarsSocket = (session: Session | null) => {
    const [pusher, setPusher] = useState<Pusher | null>(null);
    const [gameState, setGameState] = useState<{ component: string; props: any } | null>(null);
    const [recentlyEliminatedPlayer, setRecentlyEliminatedPlayer] = useState<number | number[] | null>(null);
    const globalChannel = useRef<Channel | null>(null);
    const presenceChannel = useRef<Channel | null>(null);
    const [dayAvailable, setDayAvailable] = useState(false);

    const [bgVolume, setBgVolume] = useState(0);
    const bgAudio = useRef<HTMLAudioElement | null>(null);
    const audioInstances = useRef<Record<string, HTMLAudioElement>>({});

    // Se asume que si no hay gameState o no tiene componente, estamos en sala de espera
    const isOnWaitingRoom = (!gameState || !gameState.component) && dayAvailable;

    // Inicializa el audio de fondo (sala de espera)
    useEffect(() => {
        bgAudio.current = new Audio(`${CDN_PREFIX}${STREAMER_WARS_SOUNDS.WAITING_ROOM_LOOP}.mp3`);
        bgAudio.current.loop = true;
    }, [isOnWaitingRoom]);

    // Actualiza el volumen y controla play/pause según el estado de la sala de espera
    useEffect(() => {
        if (!bgAudio.current) return;
        bgAudio.current.volume = bgVolume;
    }, [bgVolume, isOnWaitingRoom]);

    // Configuración y eventos de Pusher
    useEffect(() => {
        // Array para almacenar los IDs de los timeouts y limpiarlos al desmontar
        const timeouts: number[] = [];

        const pusherInstance = new Pusher(PUSHER_KEY, {
            wsHost: import.meta.env.DEV ? 'localhost' : 'soketi.saltouruguayserver.com',
            wsPort: import.meta.env.DEV ? 6001 : 443,
            // wsHost: "soketi.saltouruguayserver.com",
            cluster: "us2",
            enabledTransports: ["ws", "wss"],
            forceTLS: !import.meta.env.DEV,

        });
        setPusher(pusherInstance);

        globalChannel.current = pusherInstance.subscribe("streamer-wars");
        presenceChannel.current = pusherInstance.subscribe("presence-streamer-wars");

        // Manejadores de eventos
        const handlePlayerEliminated = async ({
            playerNumber,
            audioBase64,
        }: {
            playerNumber: number | number[];
            audioBase64: string;
        }) => {
            await playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.05 });
            setRecentlyEliminatedPlayer(playerNumber);

            const audioBytes = decodeAudioFromPusher(audioBase64);

            const blob = new Blob([new Uint8Array(audioBytes)], { type: "audio/mpeg" }); // o audio/wav
            const url = URL.createObjectURL(blob);
            const timeoutId = setTimeout(() => {
                playSoundWithReverb({
                    sound: url,
                    volume: 0.5,
                    isBase64: false,
                    reverbAmount: 0.7,
                });
            }, 1000);
            // @ts-ignore
            timeouts.push(timeoutId);
        };

        const handleSendToWaitingRoom = () => {
            setGameState(null);
            toast("Todos los jugadores han sido enviados a la sala de espera");
        };

        const handleLaunchGame = ({
            game,
            props,
        }: {
            game: string;
            props: any;
        }) => {
            bgAudio.current?.pause();
            setGameState({
                component: game,
                props: { session, pusher: pusherInstance, ...props },
            });
            document.addEventListener(
                "instructions-ended",
                () => {
                    const START_GAME_SOUNDS = [
                        STREAMER_WARS_SOUNDS.ES_HORA_DE_JUGAR,
                        STREAMER_WARS_SOUNDS.QUE_COMIENCE_EL_JUEGO,
                    ];
                    const randomSound =
                        START_GAME_SOUNDS[Math.floor(Math.random() * START_GAME_SOUNDS.length)];
                    playSound({ sound: randomSound });
                },
                { once: true }
            );
        };

        const handleMegaphony = async ({
            audioBase64,
        }: {
            audioBase64: string;
        }) => {
            const audioBytes = decodeAudioFromPusher(audioBase64);

            const blob = new Blob([new Uint8Array(audioBytes)], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);
            const timeoutId = setTimeout(() => {
                playSoundWithReverb({
                    sound: url,
                    volume: 0.8,
                    isBase64: false,
                    reverbAmount: 0.5,
                });
            }, 500);
            // @ts-ignore
            timeouts.push(timeoutId);
        };

        document.addEventListener("welcome-dialog-closed", () => {
            // destroy audio
            bgAudio.current = null
        }, { once: true });
        // Bind de eventos a Pusher
        globalChannel.current.bind("player-eliminated", handlePlayerEliminated);
        globalChannel.current.bind("players-eliminated", ({ playerNumbers, audioBase64 }: { playerNumbers: number | number[], audioBase64: string }) => {
            handlePlayerEliminated({ playerNumber: playerNumbers, audioBase64 });
        });
        globalChannel.current.bind("megaphony", handleMegaphony);

        globalChannel.current.bind("reload-for-user", ({ playerNumber }: { playerNumber: number }) => {
            if (playerNumber === session?.user.streamerWarsPlayerNumber) {
                location.reload();
            }
        });
        globalChannel.current.bind("send-to-waiting-room", handleSendToWaitingRoom);
        globalChannel.current.bind("launch-game", handleLaunchGame);
        globalChannel.current.bind("new-announcement", ({ message }: { message: string }) => {
            playSound({ sound: STREAMER_WARS_SOUNDS.ATENCION_JUGADORES, volume: 1 });
            toast.warning("Nuevo anuncio", {
                icon: <LucideSiren />,
                description: message,
                richColors: true,
                duration: 8000,
                position: "top-center",
                classNames: {
                    title: 'font-bold font-mono',
                    icon: 'flex flex-col justify-center items-center p-5 rounded-full',
                    description: 'font-mono text-sm',
                }
            });


        });

        globalChannel.current?.bind("player-aislated", ({ playerNumber }: { playerNumber: number }) => {
            if (playerNumber === session?.user.streamerWarsPlayerNumber) {
                setDayAvailable(false);
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
                toast.error("¡Has sido aislado!", {
                    icon: <LucideSiren />,
                    description: "Un moderador analizará tu caso y te informará si puedes volver a jugar.",
                    richColors: true,
                    duration: 10000,
                    position: "bottom-center",
                    dismissible: true,
                    classNames: {
                        icon: 'flex flex-col justify-center items-center p-5 rounded-full',
                    }
                });

                setTimeout(() => {
                    navigate('/guerra-streamers');
                }, 5000);
            }
        })

        globalChannel.current?.bind("players-aislated", ({ playerNumbers }: { playerNumbers: number[] }) => {
            if (!session?.user.streamerWarsPlayerNumber) return;
            if (playerNumbers.includes(session?.user.streamerWarsPlayerNumber)) {

                setDayAvailable(false);
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
                toast.error("¡Has sido aislado!", {
                    icon: <LucideSiren />,
                    description: "Un moderador analizará tu caso y te informará si puedes volver a jugar.",
                    richColors: true,
                    duration: 10000,
                    position: "bottom-center",
                    dismissible: true,
                    classNames: {
                        icon: 'flex flex-col justify-center items-center p-5 rounded-full',
                    }
                });

                setTimeout(() => {
                    navigate('/guerra-streamers');
                }, 5000);
            }
        })

        globalChannel.current?.bind("audio-update", ({ audioId, action, data }: { audioId: string, action: string, data: any }) => {
            console.log('audio-update', audioId, action, data);
            if (!audioInstances.current[audioId]) {
                audioInstances.current[audioId] = new Audio(`${CDN_PREFIX}${audioId}.mp3`);
            }
            const audio = audioInstances.current[audioId];
            
            switch (action) {
                case 'PLAY':
                    // Always start from the beginning
                    audio.currentTime = 0;
                    audio.loop = data.loop;
                    audio.volume = data.volume;
                    audio.play().catch(err => console.error('Error playing audio:', err));
                    break;
                case 'PAUSE':
                    audio.pause();
                    audio.loop = data.loop;
                    audio.volume = data.volume;
                    break;
                case 'STOP':
                    audio.pause();
                    audio.currentTime = 0;
                    audio.loop = data.loop;
                    audio.volume = data.volume;
                    break;
                case 'SET_VOLUME':
                    audio.volume = data.volume;
                    audio.loop = data.loop;
                    break;
                case 'SET_LOOP':
                    audio.loop = data.loop;
                    audio.volume = data.volume;
                    break;
            }
        });

        globalChannel.current?.bind("audio-mute-all", () => {
            Object.values(audioInstances.current).forEach(audio => {
                audio.volume = 0;
            });
        });

        globalChannel.current?.bind("audio-stop-all", () => {
            Object.values(audioInstances.current).forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        });

        return () => {
            // Limpieza: cancelamos timeouts, desbindamos eventos y desconectamos Pusher
            timeouts.forEach(clearTimeout);
            globalChannel.current?.unbind_all();
            globalChannel.current?.unsubscribe();
            presenceChannel.current?.unbind_all();
            presenceChannel.current?.unsubscribe();
            pusherInstance.disconnect();
        };
    }, [session]);

    // Preload audio files
    useEffect(() => {
        // Preload all audio files
        AVAILABLE_AUDIOS.forEach(audio => {
            const audioEl = new Audio(`${CDN_PREFIX}${audio.id}.mp3`);
            audioEl.preload = 'auto';
            audioInstances.current[audio.id] = audioEl;
        });
    }, []);

    return {
        pusher,
        gameState,
        setGameState,
        recentlyEliminatedPlayer,
        globalChannel,
        presenceChannel,
        bgVolume,
        setBgVolume,
        bgAudio,
        dayAvailable,
        setDayAvailable,
    };
};
