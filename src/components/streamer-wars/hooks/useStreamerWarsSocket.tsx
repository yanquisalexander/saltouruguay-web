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
import { AVAILABLE_AUDIOS } from "@/types/audio";
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

    // ID estable para evitar reconexiones si el objeto session cambia pero el usuario es el mismo
    const userId = useMemo(() => session?.user?.email || session?.user?.name || "anonymous", [session?.user?.email, session?.user?.name]);
    const playerNumber = session?.user?.streamerWarsPlayerNumber;

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
            if (!audioInstances.current[audio.id]) {
                const audioEl = new Audio(`${CDN_PREFIX}${audio.id}.mp3`);
                audioEl.preload = 'auto';
                audioEl.addEventListener('ended', () => {
                    console.debug(`Audio ${audio.id} ended naturally`);
                });
                audioInstances.current[audio.id] = audioEl;
            }
        });

        return () => {
            Object.values(audioInstances.current).forEach((audio) => {
                audio.pause();
                audio.currentTime = 0;
            });
        };
    }, []);

    // ---------------------------------------------------------------------------
    // 3. CONEXIÓN PUSHER (Socket)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!session) return;

        const timeouts: number[] = [];

        // Configuración optimizada para evitar desconexiones
        const pusherInstance = new Pusher(PUSHER_KEY, {
            wsHost: import.meta.env.DEV ? 'localhost' : 'soketi.saltouruguayserver.com',
            wsPort: import.meta.env.DEV ? 6001 : 443,
            cluster: "us2",
            enabledTransports: ["ws", "wss"],
            forceTLS: !import.meta.env.DEV,
            // Mantener la conexión viva
            activityTimeout: 60000,  // Aumentado de 15000 a 60000
            pongTimeout: 30000,      // Aumentado de 6000 a 30000
            disableStats: true, // Ahorra ancho de banda si no usas analytics de Pusher
        });

        // Debug de conexión
        pusherInstance.connection.bind("state_change", (states: any) => {
            console.log("Pusher state change:", states.current);
        });

        pusherInstance.connection.bind("error", (err: any) => {
            console.error("Pusher connection error:", err);
        });

        setPusher(pusherInstance);

        // Suscripciones
        globalChannel.current = pusherInstance.subscribe("streamer-wars");
        presenceChannel.current = pusherInstance.subscribe("presence-streamer-wars");

        // --- HANDLERS ---

        const handleAudioBlob = (audioBase64: string, volume = 0.5, reverb = 0.0) => {
            try {
                const audioBytes = decodeAudioFromPusher(audioBase64);
                const blob = new Blob([new Uint8Array(audioBytes)], { type: "audio/mpeg" });
                const url = URL.createObjectURL(blob);

                // Delay pequeño para decodificación y sync
                const timeoutId = window.setTimeout(() => {
                    playSoundWithReverb({
                        sound: url,
                        volume: volume,
                        isBase64: false,
                        reverbAmount: reverb,
                    });

                    // Limpieza de memoria: Revocar URL después de que probablemente haya terminado
                    // Asumimos 10 segundos como máximo para un clip de audio de este tipo
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                }, 500);

                timeouts.push(timeoutId);
            } catch (e) {
                console.error("Error decoding audio blob", e);
            }
        };

        const handlePlayerEliminated = async ({ playerNumber: pNum, audioBase64 }: { playerNumber: number | number[]; audioBase64: string }) => {
            await playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.05 });
            setRecentlyEliminatedPlayer(pNum);

            // 1000ms delay específico para eliminación
            setTimeout(() => handleAudioBlob(audioBase64, 0.5, 0.7), 500);
        };

        const handleMegaphony = ({ audioBase64 }: { audioBase64: string }) => {
            handleAudioBlob(audioBase64, 0.8, 0.5);
        };

        // --- BINDING EVENTOS ---

        const channel = globalChannel.current;

        // Gameplay Events
        channel.bind("launch-game", ({ game, props }: any) => {
            console.log("Launch game received:", game, props);
            bgAudio.current?.pause();
            setGameState({
                component: game,
                props: { session, pusher: pusherInstance, ...props },
            });

            // Esperar instrucciones
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

        channel.bind("send-to-waiting-room", () => {
            console.log("Send to waiting room received");
            setGameState(null);
            toast("Todos los jugadores han sido enviados a la sala de espera");
        });

        channel.bind("episode-title", ({ episode }: { episode: number }) => {
            console.log("Episode title received:", episode);
            // Aquí podríamos setear un estado para mostrar JourneyTitle
            // Pero como es similar a JourneyTransition, quizás usar un estado global
            // Por ahora, asumimos que se maneja en StreamerWars
        });

        // Player Status Events
        channel.bind("player-eliminated", handlePlayerEliminated);
        channel.bind("players-eliminated", ({ playerNumbers, audioBase64 }: { playerNumbers: number | number[], audioBase64: string }) => {
            handlePlayerEliminated({ playerNumber: playerNumbers, audioBase64 });
        });

        channel.bind("megaphony", handleMegaphony);

        channel.bind("reload-for-user", ({ playerNumber: pNum }: { playerNumber: number }) => {
            if (pNum === playerNumber) location.reload();
        });

        channel.bind("new-announcement", ({ message }: { message: string }) => {
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

        // Isolation Logic
        const handleIsolation = (targetNumbers: number | number[]) => {
            const targets = Array.isArray(targetNumbers) ? targetNumbers : [targetNumbers];
            if (playerNumber && targets.includes(playerNumber)) {
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

        channel.bind("player-aislated", ({ playerNumber }: { playerNumber: number }) => handleIsolation(playerNumber));
        channel.bind("players-aislated", ({ playerNumbers }: { playerNumbers: number[] }) => handleIsolation(playerNumbers));

        // Audio Control Events
        channel.bind("audio-update", ({ audioId, action, data }: { audioId: string, action: string, data: any }) => {
            // Asegurar que el audio existe, si no, crearlo al vuelo
            if (!audioInstances.current[audioId]) {
                audioInstances.current[audioId] = new Audio(`${CDN_PREFIX}${audioId}.mp3`);
            }

            const audio = audioInstances.current[audioId];
            if (!audio) return;

            // Aplicar props comunes
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

        channel.bind("audio-mute-all", () => {
            Object.values(audioInstances.current).forEach(a => a.volume = 0);
        });

        channel.bind("audio-stop-all", () => {
            Object.values(audioInstances.current).forEach(a => {
                a.pause();
                a.currentTime = 0;
            });
        });

        // Timer Events
        channel.bind("show-timer", (data: any) => {
            try {
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                setTimerSeconds(parsedData.seconds);
                setShowTimer(true);
                setTimerKey(prev => prev + 1);
            } catch (e) {
                console.warn('Error parsing timer data', e);
            }
        });

        // Inicializar Timer si ya existe en servidor
        actions.streamerWars.getCurrentTimer().then(({ data, error }) => {
            if (!error && data) {
                const elapsed = (Date.now() - data.startedAt) / 1000;
                const remaining = data.duration - elapsed;
                if (remaining > 0) {
                    setTimerSeconds(Math.ceil(remaining));
                    setShowTimer(true);
                    setTimerKey(prev => prev + 1);
                }
            }
        });

        // Limpieza de Welcome Dialog
        const welcomeHandler = () => { bgAudio.current = null; };
        document.addEventListener("welcome-dialog-closed", welcomeHandler, { once: true });

        return () => {
            console.log("Cleanup useStreamerWarsSocket");
            timeouts.forEach(window.clearTimeout);
            document.removeEventListener("welcome-dialog-closed", welcomeHandler);

            // Desvincular y desconectar
            channel.unbind_all();
            channel.unsubscribe();
            presenceChannel.current?.unbind_all();
            presenceChannel.current?.unsubscribe();

            pusherInstance.disconnect();
        };
    }, [userId]); // <--- DEPENDENCY CRÍTICA: Solo reconectar si cambia el ID de usuario, no el objeto session entero.

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