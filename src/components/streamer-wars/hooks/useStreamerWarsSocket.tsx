import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState, useMemo } from "preact/hooks";
import { toast } from "sonner";
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
import { actions } from "astro:actions";

export const useStreamerWarsSocket = (session: Session | null) => {
    const [pusher, setPusher] = useState<Pusher | null>(null);
    const [gameState, setGameState] = useState<{ component: string; props: any } | null>(null);
    const [recentlyEliminatedPlayer, setRecentlyEliminatedPlayer] = useState<number | number[] | null>(null);
    const [dayAvailable, setDayAvailable] = useState(false);

    // Timer states
    const [showTimer, setShowTimer] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerKey, setTimerKey] = useState(0);

    // Refs para mantener persistencia sin re-renders
    const globalChannel = useRef<Channel | null>(null);
    const presenceChannel = useRef<Channel | null>(null);

    // Audio Refs
    const [bgVolume, setBgVolume] = useState(0);
    const bgAudio = useRef<HTMLAudioElement | null>(null);
    const audioInstances = useRef<Record<string, HTMLAudioElement>>({});

    const ensureAudioInstance = (audioId: string) => {
        if (!audioInstances.current[audioId]) {
            const audioEl = new Audio(`${CDN_PREFIX}${audioId}.mp3`);
            audioEl.preload = 'auto';
            audioInstances.current[audioId] = audioEl;
        }

        return audioInstances.current[audioId]!;
    };

    // ID estable para evitar reconexiones si el objeto session cambia pero el usuario es el mismo
    const userId = useMemo(() => session?.user?.email || session?.user?.name || "anonymous", [session?.user?.email, session?.user?.name]);
    const playerNumber = session?.user?.streamerWarsPlayerNumber;

    const playerNumberRef = useRef<number | undefined>(playerNumber);
    useEffect(() => {
        playerNumberRef.current = playerNumber;
    }, [playerNumber]);

    const sessionRef = useRef<Session | null>(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // Se asume que si no hay gameState o no tiene componente, estamos en sala de espera
    const isOnWaitingRoom = (!gameState || !gameState.component) && dayAvailable;

    // ---------------------------------------------------------------------------
    // 1. GESTIÓN DE AUDIO DE FONDO (WAITING ROOM)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // Solo inicializar si no existe
        if (!bgAudio.current) {
            bgAudio.current = new Audio(`${CDN_PREFIX}${STREAMER_WARS_SOUNDS.WAITING_ROOM_LOOP}.mp3`);
            bgAudio.current.loop = true;
            bgAudio.current.preload = "auto";
        }

        const audio = bgAudio.current;

        if (isOnWaitingRoom) {
            // Intentar reproducir solo si está pausado para evitar excepciones
            if (audio.paused) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch((error) => {
                        console.warn("Autoplay prevented or interrupted:", error);
                    });
                }
            }
        } else {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0; // Resetear al salir
            }
        }

        // Limpieza al desmontar hook completo
        return () => {
            if (bgAudio.current) {
                bgAudio.current.pause();
            }
        };
    }, [isOnWaitingRoom]);

    // Efecto separado para volumen para evitar reiniciar el audio
    useEffect(() => {
        if (bgAudio.current) {
            bgAudio.current.volume = bgVolume;
        }
    }, [bgVolume]);

    // ---------------------------------------------------------------------------
    // 2. PRECARGA DE AUDIOS (Efecto único)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        AVAILABLE_AUDIOS.forEach((audio) => {
            const audioEl = ensureAudioInstance(audio.id);
            audioEl.addEventListener('ended', () => {
                console.debug(`Audio ${audio.id} ended naturally`);
            });
        });

        return () => {
            Object.values(audioInstances.current).forEach((audio) => {
                audio.pause();
                audio.currentTime = 0;
            });
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const hydrateAudioState = async () => {
            try {
                const { data, error } = await actions.audio.getCurrentAudioState({});
                if (isCancelled || error || !data?.states) return;

                Object.entries(data.states as Record<string, AudioState>).forEach(([audioId, state]) => {
                    const audio = ensureAudioInstance(audioId);
                    if (!audio) return;

                    audio.volume = state.volume ?? 1;
                    audio.loop = state.loop ?? false;

                    if (state.playing) {
                        audio.currentTime = 0;
                        audio.play().catch(err => console.error(`Error hydrating audio ${audioId}`, err));
                    } else {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                });
            } catch (err) {
                console.warn("Failed to hydrate audio state", err);
            }
        };

        hydrateAudioState();

        return () => {
            isCancelled = true;
        };
    }, []);

    // ---------------------------------------------------------------------------
    // 3. CONEXIÓN PUSHER (Socket)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!session) return;

        const timeouts: number[] = [];
        let timersActive = true;



        const pusherInstance = new Pusher(PUSHER_KEY, {
            wsHost: import.meta.env.DEV ? 'localhost' : 'soketi.saltouruguayserver.com',
            wsPort: import.meta.env.DEV ? 6001 : 443,
            cluster: "us2",
            enabledTransports: ["ws", "wss"],
            forceTLS: !import.meta.env.DEV,
            activityTimeout: 60000,
            pongTimeout: 30000,
            disableStats: true,
        });

        // Dentro de tu useEffect, justo después de crear la instancia


        pusherInstance.connection.bind("state_change", (states: any) => {
            console.log("Pusher state change:", states.current);
        });

        pusherInstance.connection.bind("error", (err: any) => {
            console.error("Pusher connection error:", err);
        });

        setPusher(pusherInstance);

        const channel = pusherInstance.subscribe("streamer-wars");
        const presence = pusherInstance.subscribe("presence-streamer-wars");
        globalChannel.current = channel;
        presenceChannel.current = presence;


        const handleAudioBlob = (audioBase64: string, volume = 0.5, reverb = 0.0) => {
            try {
                const audioBytes = decodeAudioFromPusher(audioBase64);
                const audioBuffer = audioBytes.buffer.slice(
                    audioBytes.byteOffset,
                    audioBytes.byteOffset + audioBytes.byteLength
                );

                const timeoutId = window.setTimeout(() => {
                    playSoundWithReverb({
                        arrayBuffer: audioBuffer,
                        volume,
                        reverbAmount: reverb,
                    }).catch((err) => console.error("Error reproduciendo audio remoto", err));
                }, 500);

                timeouts.push(timeoutId);
            } catch (e) {
                console.error("Error decoding audio blob", e);
            }
        };

        const handlePlayerEliminated = async ({ playerNumber: pNum, audioBase64 }: { playerNumber: number | number[]; audioBase64: string }) => {
            console.info("Player eliminated:", pNum);
            await playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.05 });
            setRecentlyEliminatedPlayer(pNum);
            setTimeout(() => handleAudioBlob(audioBase64, 0.5, 0.7), 500);
        };

        const handleMegaphony = ({ audioBase64 }: { audioBase64: string }) => {
            handleAudioBlob(audioBase64, 0.8, 0.5);
        };

        const handleIsolation = (targetNumbers: number | number[]) => {
            const targets = Array.isArray(targetNumbers) ? targetNumbers : [targetNumbers];
            const currentPlayerNumber = playerNumberRef.current;
            if (currentPlayerNumber && targets.includes(currentPlayerNumber)) {
                setDayAvailable(false);
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
                toast.error("¡Has sido aislado!", {
                    icon: <LucideSiren />,
                    description: "Un moderador analizará tu caso.",
                    richColors: true,
                    duration: 10000,
                    position: "bottom-center",
                    dismissible: true,
                });
                setTimeout(() => navigate('/guerra-streamers'), 5000);
            }
        };

        const bindChannelHandlers = (targetChannel: Channel) => {
            targetChannel.bind("launch-game", ({ game, props }: any) => {
                console.log("Launch game received:", game, props);
                bgAudio.current?.pause();
                setGameState({
                    component: game,
                    props: { session: sessionRef.current, pusher: pusherInstance, ...props },
                });

                const onInstructionsEnded = () => {
                    const START_GAME_SOUNDS = [
                        STREAMER_WARS_SOUNDS.ES_HORA_DE_JUGAR,
                        STREAMER_WARS_SOUNDS.QUE_COMIENCE_EL_JUEGO,
                    ];
                    const randomSound = START_GAME_SOUNDS[Math.floor(Math.random() * START_GAME_SOUNDS.length)];
                    playSound({ sound: randomSound });
                };
                document.addEventListener("instructions-ended", onInstructionsEnded, { once: true });
            });

            targetChannel.bind("send-to-waiting-room", () => {
                console.log("Send to waiting room received");
                setGameState(null);
                toast("Todos los jugadores han sido enviados a la sala de espera");
            });

            targetChannel.bind("episode-title", ({ episode }: { episode: number }) => {
                console.log("Episode title received:", episode);
            });

            targetChannel.bind("player-eliminated", handlePlayerEliminated);
            targetChannel.bind("players-eliminated", ({ playerNumbers, audioBase64 }: { playerNumbers: number | number[], audioBase64: string }) => {
                handlePlayerEliminated({ playerNumber: playerNumbers, audioBase64 });
            });

            targetChannel.bind("megaphony", handleMegaphony);

            targetChannel.bind("reload-for-user", ({ playerNumber: pNum }: { playerNumber: number }) => {
                if (playerNumberRef.current === pNum) location.reload();
            });

            targetChannel.bind("new-announcement", ({ message }: { message: string }) => {
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

            targetChannel.bind("player-aislated", ({ playerNumber }: { playerNumber: number }) => handleIsolation(playerNumber));
            targetChannel.bind("players-aislated", ({ playerNumbers }: { playerNumbers: number[] }) => handleIsolation(playerNumbers));

            targetChannel.bind("audio-update", ({ audioId, action, data }: { audioId: string, action: string, data: any }) => {
                const audio = ensureAudioInstance(audioId);
                if (!audio) return;

                if (data?.volume !== undefined) audio.volume = data.volume;
                if (data?.loop !== undefined) audio.loop = data.loop;

                try {
                    switch (action) {
                        case 'PLAY':
                            audio.currentTime = 0;
                            audio.play().catch(e => console.error(`Error playing ${audioId}`, e));
                            break;
                        case 'PAUSE':
                            audio.pause();
                            break;
                        case 'STOP':
                            audio.pause();
                            audio.currentTime = 0;
                            break;
                    }
                } catch (err) {
                    console.warn(`Audio action ${action} failed for ${audioId}`, err);
                }
            });

            targetChannel.bind("audio-mute-all", () => {
                Object.values(audioInstances.current).forEach(a => a.volume = 0);
            });

            targetChannel.bind("audio-stop-all", () => {
                Object.values(audioInstances.current).forEach(a => {
                    a.pause();
                    a.currentTime = 0;
                });
            });

            targetChannel.bind("show-timer", (data: any) => {
                try {
                    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                    setTimerSeconds(parsedData.seconds);
                    setShowTimer(true);
                    setTimerKey(prev => prev + 1);
                } catch (e) {
                    console.warn('Error parsing timer data', e);
                }
            });
        };

        bindChannelHandlers(channel);

        actions.streamerWars.getCurrentTimer().then(({ data, error }) => {
            if (!timersActive || error || !data) return;
            const elapsed = (Date.now() - data.startedAt) / 1000;
            const remaining = data.duration - elapsed;
            if (remaining > 0) {
                setTimerSeconds(Math.ceil(remaining));
                setShowTimer(true);
                setTimerKey(prev => prev + 1);
            }
        });

        const welcomeHandler = () => { bgAudio.current = null; };
        document.addEventListener("welcome-dialog-closed", welcomeHandler, { once: true });

        return () => {
            timersActive = false;
            console.log("Cleanup useStreamerWarsSocket");
            timeouts.forEach(window.clearTimeout);
            document.removeEventListener("welcome-dialog-closed", welcomeHandler);

            // Unbind specific events instead of all to avoid removing binds from other hooks
            if (channel) {
                channel.unbind("launch-game");
                channel.unbind("send-to-waiting-room");
                channel.unbind("episode-title");
                channel.unbind("player-eliminated");
                channel.unbind("players-eliminated");
                channel.unbind("megaphony");
                channel.unbind("reload-for-user");
                channel.unbind("new-announcement");
                channel.unbind("player-aislated");
                channel.unbind("players-aislated");
                channel.unbind("audio-update");
                channel.unbind("audio-mute-all");
                channel.unbind("audio-stop-all");
                channel.unbind("show-timer");
            }

            pusherInstance.disconnect();
        };
    }, [userId]);

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
        showTimer,
        timerSeconds,
        timerKey,
        onTimerEnd: () => setShowTimer(false),
    };
};