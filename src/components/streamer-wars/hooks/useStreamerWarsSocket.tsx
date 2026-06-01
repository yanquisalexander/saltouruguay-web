import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState, useMemo } from "preact/hooks";
import { toast } from "sonner";
import type { Channel } from "pusher-js";
import {
    CDN_PREFIX,
    playSound,
    playSoundWithReverb,
    STREAMER_WARS_SOUNDS,
} from "@/consts/Sounds";
import { LucideSiren } from "lucide-preact";
import { navigate } from "astro/virtual-modules/transitions-router.js";
import { AVAILABLE_AUDIOS, type AudioState } from "@/types/audio";
import { actions } from "astro:actions";
import { usePusher } from "@/hooks/usePusher";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "@/consts/pusher";

export const useStreamerWarsSocket = (session: Session | null) => {
    const { pusher } = usePusher();
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
            bgAudio.current.pause();
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
        if (!session || !pusher) return;

        const timeouts: number[] = [];
        let timersActive = true;

        // Use the singleton service to get channels
        const channel = pusherService.subscribe(PUSHER_CHANNELS.GLOBAL);
        const presence = pusherService.subscribe(PUSHER_CHANNELS.PRESENCE);
        globalChannel.current = channel;
        presenceChannel.current = presence;

        // Store handler references for cleanup
        const handlers = new Map<string, (data: any) => void>();

        const handleAudioUrl = async (audioUrl: string, volume = 0.5, reverb = 0.0) => {
            try {
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();

                const timeoutId = window.setTimeout(() => {
                    playSoundWithReverb({
                        arrayBuffer,
                        volume,
                        reverbAmount: reverb,
                    }).catch((err) => console.error("Error reproduciendo audio remoto", err));
                }, 500);

                timeouts.push(timeoutId);
            } catch (e) {
                console.error("Error fetching audio from URL", e);
            }
        };

        const handlePlayerEliminated = async ({ playerNumber: pNum, audioUrl }: { playerNumber: number | number[]; audioUrl: string }) => {
            console.info("Player eliminated:", pNum);
            await playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO, volume: 0.05 });
            setRecentlyEliminatedPlayer(pNum);
            if (audioUrl) setTimeout(() => handleAudioUrl(audioUrl, 0.5, 0.7), 500);
        };

        const handleMegaphony = ({ audioUrl }: { audioUrl: string }) => {
            handleAudioUrl(audioUrl, 0.8, 0.5);
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
            const handleLaunchGame = ({ game, props }: any) => {
                console.log("Launch game received:", game, props);
                bgAudio.current?.pause();
                setGameState({
                    component: game,
                    props: { session: sessionRef.current, pusher, ...props },
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
            };
            handlers.set(PUSHER_EVENTS.LAUNCH_GAME, handleLaunchGame);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.LAUNCH_GAME, handleLaunchGame);

            const handleSendToWaitingRoom = () => {
                console.log("Send to waiting room received");
                setGameState(null);
                toast("Todos los jugadores han sido enviados a la sala de espera");
            };

            const handleEpisodeTitle = ({ episode }: { episode: number }) => {
                console.log("Episode title received:", episode);
            };

            const handlePlayersEliminated = ({ playerNumbers, audioUrl }: { playerNumbers: number | number[], audioUrl: string }) => {
                handlePlayerEliminated({ playerNumber: playerNumbers, audioUrl });
            };

            const handleReloadForUser = ({ playerNumber: pNum }: { playerNumber: number }) => {
                if (playerNumberRef.current === pNum) location.reload();
            };

            const handleNewAnnouncement = ({ message }: { message: string }) => {
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
            };

            const handlePlayerAislated = ({ playerNumber }: { playerNumber: number }) => handleIsolation(playerNumber);
            const handlePlayersAislated = ({ playerNumbers }: { playerNumbers: number[] }) => handleIsolation(playerNumbers);

            const handleAudioUpdate = ({ audioId, action, data }: { audioId: string, action: string, data: any }) => {
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
            };

            const handleAudioMuteAll = () => {
                Object.values(audioInstances.current).forEach(a => a.volume = 0);
            };

            const handleAudioStopAll = () => {
                Object.values(audioInstances.current).forEach(a => {
                    a.pause();
                    a.currentTime = 0;
                });
            };

            const handleShowTimer = (data: any) => {
                try {
                    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                    setTimerSeconds(parsedData.seconds);
                    setShowTimer(true);
                    setTimerKey(prev => prev + 1);
                } catch (e) {
                    console.warn('Error parsing timer data', e);
                }
            };

            // Bind all events using the service and store references
            handlers.set(PUSHER_EVENTS.SEND_TO_WAITING_ROOM, handleSendToWaitingRoom);
            handlers.set(PUSHER_EVENTS.EPISODE_TITLE, handleEpisodeTitle);
            handlers.set(PUSHER_EVENTS.PLAYER_ELIMINATED, handlePlayerEliminated);
            handlers.set(PUSHER_EVENTS.PLAYERS_ELIMINATED, handlePlayersEliminated);
            handlers.set(PUSHER_EVENTS.MEGAPHONY, handleMegaphony);
            handlers.set(PUSHER_EVENTS.RELOAD_FOR_USER, handleReloadForUser);
            handlers.set(PUSHER_EVENTS.NEW_ANNOUNCEMENT, handleNewAnnouncement);
            handlers.set(PUSHER_EVENTS.PLAYER_AISLATED, handlePlayerAislated);
            handlers.set(PUSHER_EVENTS.PLAYERS_AISLATED, handlePlayersAislated);
            handlers.set(PUSHER_EVENTS.AUDIO_UPDATE, handleAudioUpdate);
            handlers.set(PUSHER_EVENTS.AUDIO_MUTE_ALL, handleAudioMuteAll);
            handlers.set(PUSHER_EVENTS.AUDIO_STOP_ALL, handleAudioStopAll);
            handlers.set(PUSHER_EVENTS.SHOW_TIMER, handleShowTimer);

            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.SEND_TO_WAITING_ROOM, handleSendToWaitingRoom);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.EPISODE_TITLE, handleEpisodeTitle);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.PLAYER_ELIMINATED, handlePlayerEliminated);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.PLAYERS_ELIMINATED, handlePlayersEliminated);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.MEGAPHONY, handleMegaphony);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.RELOAD_FOR_USER, handleReloadForUser);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.NEW_ANNOUNCEMENT, handleNewAnnouncement);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.PLAYER_AISLATED, handlePlayerAislated);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.PLAYERS_AISLATED, handlePlayersAislated);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.AUDIO_UPDATE, handleAudioUpdate);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.AUDIO_MUTE_ALL, handleAudioMuteAll);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.AUDIO_STOP_ALL, handleAudioStopAll);
            pusherService.bind(PUSHER_CHANNELS.GLOBAL, PUSHER_EVENTS.SHOW_TIMER, handleShowTimer);
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

            // Unbind all events from this hook using stored handler references
            handlers.forEach((handler, eventName) => {
                pusherService.unbind(PUSHER_CHANNELS.GLOBAL, eventName, handler);
            });
            handlers.clear();

            // Don't disconnect pusher - it's shared across the app
        };
    }, [userId, pusher]);

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