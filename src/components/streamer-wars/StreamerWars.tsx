import type { Session } from "@auth/core/types";
import { useEffect, useState, useCallback, useMemo, useRef } from "preact/hooks";
import { toast } from "sonner";
import Pusher, { type Channel } from "pusher-js";
import { CDN_PREFIX, playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { LucideBug } from "lucide-preact";

// UI Components
import { SimonSays } from "./games/SimonSays";
import { WaitForDayOpen } from "./views/WaitForDayOpen";
import WaitingScreen from "./WaitingScreen";
import { PlayerEliminated } from "./PlayerEliminated";
import { WaitingRoom } from "./views/WaitingRoom";
import { TeamSelector } from "./views/TeamSelector";
import { JourneyTransition, CURRENT_DAY } from "./JourneyTransition";
import { CaptainBribery } from "./games/CaptainBribery";
import { AutoElimination } from "./games/AutoElimination";
import { WelcomeToStreamerWars } from "./WelcomeToStreamerWars";
import { AdminChat } from "./AdminChat";
import { StreamerWarsCinematicPlayer } from "./StreamerWarsCinematicPlayer";
import { Dalgona } from "./games/Dalgona";
import { TugOfWar } from "./games/TugOfWar";
import { Bomb } from "./games/Bomb";
import { Fishing } from "./games/Fishing";
import { StreamerWarsAudioManager } from "./StreamerWarsAudioManager";
import { VoiceChat } from "./VoiceChat";
import { VoiceControls } from "./VoiceControls";
import CurrentPlayer from "./CurrentPlayer";
import { JourneyTitle } from "./JourneyTitle";

// Hooks
import { useStreamerWarsSocket } from "./hooks/useStreamerWarsSocket";
import type { Players } from "../admin/streamer-wars/Players";
import { InmersiveInstructions } from "./InmersiveInstructions";

const SplashScreen = ({ onEnd }: { onEnd: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [fadingOut, setFadingOut] = useState(false);
    const [visible, setVisible] = useState(true);

    // Nuevo estado para controlar la animación de entrada (escala)
    const [isZoomedOut, setIsZoomedOut] = useState(false);
    const alertedRef = useRef(false);

    useEffect(() => {
        // Disparamos la transición de escala un instante después de montar
        const scaleTimer = setTimeout(() => {
            setIsZoomedOut(true);
        }, 50);

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                // Trigger alerta al 50%
                if (prev > 50 && !alertedRef.current) {
                    alertedRef.current = true;
                    // toast.success(...) y playSound(...) aquí
                }
                return prev + 1;
            });
        }, 25);

        const endTimer = setTimeout(() => {
            document.dispatchEvent(new CustomEvent('splash-screen-ended'));
            setFadingOut(true);
            setTimeout(() => {
                setVisible(false);
                onEnd();
            }, 500);
        }, 2500);

        return () => {
            clearInterval(interval);
            clearTimeout(endTimer);
            clearTimeout(scaleTimer);
        };
    }, [onEnd]);

    if (!visible) return null;

    return (
        // Contenedor principal: maneja el fondo negro y el fade-out final
        <div
            className={`fixed inset-0 bg-black z-[8000] transition-opacity duration-500 overflow-hidden ${fadingOut ? 'opacity-0' : 'opacity-100'
                }`}
        >
            {/* 
                Contenedor animado: Maneja la escala.
                Usamos una curva cubic-bezier (0.16, 1, 0.3, 1) que da ese efecto 
                de entrar muy rápido y frenar súper suave (estilo Bowser/Smash Bros).
            */}
            <div
                className={`w-full h-full flex flex-col justify-center items-center transform transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isZoomedOut ? 'scale-100' : 'scale-[2]'
                    }`}
            >
                <h3 className="with-glyph flex relative w-max text-3xl transform px-2 font-atomic tracking-wider font-bold text-[#b4cd02] mix-blend-screen !skew-x-[-20deg] -rotate-6">
                    <span className="flex !skew-x-[20deg] transform">Guerra de Streamers</span>
                </h3>

                <div className="w-56 mt-8 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[#b4cd02] rounded-xl transition-all duration-75 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <span className="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">
                    &#x0055;
                </span>
                <span className="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">
                    &#x0050;
                </span>
            </div>
        </div>
    );
};

// Configuración estática
const GAME_CONFIG = {
    TeamSelector,
    SimonSays,
    CaptainBribery,
    AutoElimination,
    Dalgona,
    TugOfWar,
    Bomb,
    Fishing
};

// --- HOOK PERSONALIZADO: Lógica de Eventos del Juego ---
// Extrae la complejidad de los listeners del componente principal
const useGameEventListeners = (
    channel: Channel | undefined,
    session: Session,
    actions: {
        setDayAvailable: (v: boolean) => void;
        setShowingJourneyTransition: (v: boolean) => void;
        setJourneyTransitionProps: (v: any) => void;
        setShowWelcomeDialog: (v: boolean) => void;
        setExpectedPlayers: (v: number) => void;
        setShowWaitingScreen: (v: boolean) => void;
        setCurrentTeamId: (v: string | null) => void;
        setPlayers: (fn: (prev: Players[]) => Players[]) => void;
        setCurrentEpisode: (v: number | null) => void;
    }
) => {
    useEffect(() => {
        if (!channel) return;

        const handlers = {
            dayAvailable: () => {
                actions.setShowingJourneyTransition(true);
                actions.setJourneyTransitionProps({ phase: "start", key: Math.random() });

                const onTransitionEnd = () => {
                    actions.setDayAvailable(true);
                    setTimeout(() => {
                        actions.setShowingJourneyTransition(false);
                        if (session.user.username.toLowerCase() !== 'saltouruguayserver') {
                            actions.setShowWelcomeDialog(true);
                        }
                    }, 500);
                };
                document.addEventListener("journey-transition-ended", onTransitionEnd, { once: true });
            },
            showWaitingScreen: (payload: any) => {
                const expected = parseInt(payload?.expectedPlayers || '0', 10);
                actions.setExpectedPlayers(Number.isFinite(expected) ? expected : 0);
                actions.setShowWaitingScreen(true);
            },
            hideWaitingScreen: () => actions.setShowWaitingScreen(false),
            dayFinished: () => {
                actions.setShowingJourneyTransition(true);
                actions.setJourneyTransitionProps({ phase: "finish", key: Math.random() });

                const onFinishEnd = () => {
                    actions.setDayAvailable(false);
                    toast.success(`Día #0${CURRENT_DAY} finalizado`, { duration: 8000, richColors: true });
                    setTimeout(() => {
                        actions.setShowingJourneyTransition(false);
                        navigate('/guerra-streamers');
                    }, 500);
                };
                document.addEventListener("journey-transition-ended", onFinishEnd, { once: true });
            },
            newVersion: () => {
                playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 1 });
                toast.warning(`¡Nueva versión disponible!`, {
                    description: "Recarga la página para disfrutar de las últimas mejoras.",
                    duration: 15000,
                    position: 'top-right',
                    richColors: true,
                    action: { label: 'Recargar', onClick: () => location.reload() },
                });
            },
            techDifficulties: () => {
                playSound({ sound: STREAMER_WARS_SOUNDS.PROBLEMAS_TECNICOS, volume: 1 });
                toast("Estamos experimentando dificultades técnicas.", {
                    icon: <LucideBug />,
                    duration: 8000,
                    position: 'top-right',
                    richColors: true,
                    classNames: {
                        toast: 'bg-neutral-900 text-white border border-neutral-600',
                        icon: 'text-yellow-600 p-5 rounded-full',
                        title: 'font-rubik uppercase font-medium',
                    }
                });
            },
            playerJoined: ({ playerNumber, team }: { playerNumber: number; team: string }) => {
                if (playerNumber === session.user.streamerWarsPlayerNumber) {
                    actions.setCurrentTeamId(team);
                }
                actions.setPlayers(prev => prev.map(p => p.playerNumber === playerNumber ? { ...p, team } : p));
            },
            episodeTitle: ({ episode }: { episode: number }) => actions.setCurrentEpisode(episode)
        };

        // Batch binding
        channel.bind("day-available", handlers.dayAvailable);
        channel.bind("show-waiting-screen", handlers.showWaitingScreen);
        channel.bind("hide-waiting-screen", handlers.hideWaitingScreen);
        channel.bind("day-finished", handlers.dayFinished);
        channel.bind('new-version', handlers.newVersion);
        channel.bind('tech-difficulties', handlers.techDifficulties);
        channel.bind('player-joined', handlers.playerJoined);
        channel.bind('episode-title', handlers.episodeTitle);

        return () => {
            // Batch unbinding
            channel.unbind("day-available", handlers.dayAvailable);
            channel.unbind("show-waiting-screen", handlers.showWaitingScreen);
            channel.unbind("hide-waiting-screen", handlers.hideWaitingScreen);
            channel.unbind("day-finished", handlers.dayFinished);
            channel.unbind('new-version', handlers.newVersion);
            channel.unbind('tech-difficulties', handlers.techDifficulties);
            channel.unbind('player-joined', handlers.playerJoined);
            channel.unbind('episode-title', handlers.episodeTitle);
        };
    }, [channel, session.user.id]); // Dependencias reducidas
};

// --- COMPONENTE PRINCIPAL ---

export const StreamerWars = ({ session }: { session: Session }) => {
    // 1. State Grouping
    // Agrupamos estados booleanos simples para reducir la cantidad de hooks useState dispersos si se desea, 
    // pero mantenerlos separados es mejor para evitar re-renders de toda la UI si solo cambia uno.
    const [players, setPlayers] = useState<Players[]>([]);
    const [uiState, setUiState] = useState({
        splashEnded: false,
        showingJourneyTransition: false,
        showWelcomeDialog: false,
        showWaitingScreen: true,
        currentEpisode: null as number | null,
        journeyProps: { phase: "start", key: Math.random() }
    });

    const [expectedPlayers, setExpectedPlayers] = useState<number>(50);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

    // Helpers para actualizar UI state parcialmente
    const updateUi = (update: Partial<typeof uiState>) => setUiState(prev => ({ ...prev, ...update }));

    // 2. Socket Hook
    const {
        pusher, gameState, setGameState, recentlyEliminatedPlayer,
        globalChannel, presenceChannel, bgAudio, bgVolume, setBgVolume,
        setDayAvailable, dayAvailable, showTimer, timerSeconds,
        timerKey, onTimerEnd
    } = useStreamerWarsSocket(session);

    // 3. Initial Data Fetching Optimizado
    const fetchInitialData = useCallback(async () => {
        try {
            const [gameStateRes, playersRes, teamsRes] = await Promise.all([
                actions.streamerWars.getGameState(),
                actions.streamerWars.getPlayers(),
                actions.streamerWars.getPlayersTeams()
            ]);

            // Restaurar estado del juego
            if (gameStateRes.data) {
                const { data } = gameStateRes;
                if (data.dayAvailable !== undefined) setDayAvailable(data.dayAvailable);
                if (data.expectedPlayers !== undefined) setExpectedPlayers(data.expectedPlayers);
                if (data.waitingScreenVisible !== undefined) updateUi({ showWaitingScreen: data.waitingScreenVisible });

                if (data.gameState?.game) {
                    // Nota: Pasamos props mínimos necesarios, el resto se inyecta en render
                    setGameState({
                        component: data.gameState.game,
                        props: data.gameState.props
                    });
                }
            }

            // Procesar Jugadores y Equipos (Algoritmo Optimizado O(N))
            if (playersRes.data && teamsRes.data) {
                const apiPlayers = playersRes.data.players;
                const teams = teamsRes.data.playersTeams;
                const myPlayerNum = session.user.streamerWarsPlayerNumber;

                // Mapa de búsqueda rápida: PlayerNumber -> TeamColor
                const playerTeamMap = new Map<number, string>();

                Object.entries(teams).forEach(([color, teamPlayers]) => {
                    (teamPlayers as any[]).forEach(p => {
                        playerTeamMap.set(p.playerNumber, color);
                        if (p.playerNumber === myPlayerNum) setCurrentTeamId(color);
                    });
                });

                setPlayers(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPlayers = apiPlayers
                        .filter((p: any) => !existingIds.has(p.id))
                        .map((p: any) => ({
                            id: p.id,
                            playerNumber: p.playerNumber,
                            displayName: p.displayName || p.name || '',
                            avatar: p.avatar || '',
                            admin: p.admin || false,
                            online: false,
                            eliminated: p.eliminated || false,
                            team: playerTeamMap.get(p.playerNumber)
                        }));

                    return [...prev, ...newPlayers];
                });
            }
        } catch (error) {
            console.error("Error init data:", error);
        }
    }, [session.user.streamerWarsPlayerNumber]); // Dependencias mínimas

    useEffect(() => {
        fetchInitialData();

        // Preload sounds
        Object.values(STREAMER_WARS_SOUNDS).forEach((sound) => {
            const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
            audio.preload = "metadata"; // 'auto' puede ser agresivo, 'metadata' es más rápido init
        });

        // Splash listener
        const handleSplashEnd = () => updateUi({ splashEnded: true });
        document.addEventListener("splash-screen-ended", handleSplashEnd);
        return () => document.removeEventListener("splash-screen-ended", handleSplashEnd);
    }, [fetchInitialData]);

    // 4. Event Listener Hook Integration
    useGameEventListeners(globalChannel.current, session, {
        setDayAvailable,
        setShowingJourneyTransition: (v) => updateUi({ showingJourneyTransition: v }),
        setJourneyTransitionProps: (v) => updateUi({ journeyProps: v }),
        setShowWelcomeDialog: (v) => updateUi({ showWelcomeDialog: v }),
        setExpectedPlayers,
        setShowWaitingScreen: (v) => updateUi({ showWaitingScreen: v }),
        setCurrentTeamId,
        setPlayers,
        setCurrentEpisode: (v) => updateUi({ currentEpisode: v })
    });

    // 5. Presence Channel Logic
    useEffect(() => {
        const pChannel = presenceChannel.current;
        if (!pChannel) return;

        const updateOnlineStatus = (memberId: string, status: boolean) => {
            setPlayers(prev => prev.map(p => p.id === memberId ? { ...p, online: status } : p));
        };

        const handleSubSuccess = (members: any) => {
            const onlineIds = new Set(Object.values(members.members).map((m: any) => m.id));
            setPlayers(prev => prev.map(p => ({ ...p, online: onlineIds.has(p.id) })));
        };

        pChannel.bind("pusher:subscription_succeeded", handleSubSuccess);
        pChannel.bind("pusher:member_added", (m: any) => updateOnlineStatus(m.info.id, true));
        pChannel.bind("pusher:member_removed", (m: any) => updateOnlineStatus(m.info.id, false));

        return () => {
            pChannel.unbind_all();
        };
    }, [presenceChannel.current]); // Dependencia en el ref.current es tricky en React puro, pero suele funcionar si el hook padre fuerza render

    // 6. Render Logic Simplificada
    const MainContent = useMemo(() => {
        if (!dayAvailable) return <WaitForDayOpen session={session} players={players} />;

        if (gameState && !uiState.showWaitingScreen && globalChannel.current) {
            // Inyección dinámica de props
            const finalProps = {
                ...gameState.props,
                session,
                channel: globalChannel.current,
                players,
                pusher
            };

            const GameComponent = GAME_CONFIG[gameState.component as keyof typeof GAME_CONFIG];

            if (!GameComponent) return <ErrorGameView />;
            return <GameComponent {...finalProps} />;
        }

        return (
            <WaitingRoom
                session={session}
                channel={globalChannel.current}
                bgVolume={bgVolume}
                setBgVolume={setBgVolume}
                bgAudio={bgAudio.current}
            />
        );
    }, [dayAvailable, gameState, uiState.showWaitingScreen, players, bgVolume, globalChannel.current]);


    return (
        <>
            <SplashScreen onEnd={() => { }} />
            {pusher && <StreamerWarsCinematicPlayer userId={session.user.id} />}

            <PlayerEliminated session={session} playerNumber={recentlyEliminatedPlayer} />
            <CurrentPlayer session={session} showTimer={showTimer} timerSeconds={timerSeconds} timerKey={timerKey} onTimerEnd={onTimerEnd} />

            <div slot="sidebar-left" />

            {uiState.splashEnded && (
                <>
                    {uiState.showingJourneyTransition && (
                        // @ts-ignore
                        <JourneyTransition key={uiState.journeyProps.key} players={players.slice(0, 50)} {...uiState.journeyProps} />
                    )}

                    {typeof uiState.currentEpisode === "number" && (
                        <JourneyTitle episode={uiState.currentEpisode} onEnd={() => updateUi({ currentEpisode: null })} />
                    )}

                    {dayAvailable && uiState.showWaitingScreen && (
                        <WaitingScreen players={players} expectedPlayers={expectedPlayers} />
                    )}

                    <InmersiveInstructions />

                    <WelcomeToStreamerWars
                        session={session}
                        bgAudio={bgAudio.current}
                        isOpen={uiState.showWelcomeDialog}
                        setIsOpen={(v) => updateUi({ showWelcomeDialog: v })}
                    />

                    {pusher && globalChannel.current && MainContent}

                    <AdminChat session={session} channel={globalChannel.current} isAdmin={session.user.isAdmin || false} />
                    <StreamerWarsAudioManager session={session} channel={globalChannel.current} isAdmin={session.user.isAdmin || false} />
                    <VoiceControls isAdmin={session.user.isAdmin || false} />
                    <VoiceChat userId={session.user.id} teamId={currentTeamId} isAdmin={session.user.isAdmin || false} players={players} />
                </>
            )}
        </>
    );
};

const ErrorGameView = () => (
    <div class="flex flex-col items-center h-full justify-center">
        <h1 class="text-2xl font-bold mb-4 font-squids">Juego no encontrado</h1>
        <p class="text-white text-center font-press-start-2p">El juego seleccionado no está disponible.</p>
    </div>
);