import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import { toast } from "sonner";
import { SimonSays } from "./games/SimonSays";
import { WaitForDayOpen } from "./views/WaitForDayOpen";
import WaitingScreen from "./WaitingScreen";
import Pusher, { type Channel } from "pusher-js";
import { CDN_PREFIX, playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { PlayerEliminated } from "./PlayerEliminated";
import { WaitingRoom } from "./views/WaitingRoom";
import { TeamSelector } from "./views/TeamSelector";
import { useStreamerWarsSocket } from "./hooks/useStreamerWarsSocket";
import { actions } from "astro:actions";
import { LucideBug } from "lucide-preact";
import { JourneyTransition, CURRENT_DAY } from "./JourneyTransition";
import { CaptainBribery } from "./games/CaptainBribery";
import { type Players } from "../admin/streamer-wars/Players";
import { AutoElimination } from "./games/AutoElimination";
import { WelcomeToStreamerWars } from "./WelcomeToStreamerWars";
import { navigate } from "astro:transitions/client";
import { AdminChat } from "./AdminChat";
import { StreamerWarsCinematicPlayer } from "./StreamerWarsCinematicPlayer";
import { Dalgona } from "./games/Dalgona";
import { TugOfWar } from "./games/TugOfWar";
import { Bomb } from "./games/Bomb";
import { StreamerWarsAudioManager } from "./StreamerWarsAudioManager";
import { VoiceChat } from "./VoiceChat";
import { VoiceControls } from "./VoiceControls";
import CurrentPlayer from "./CurrentPlayer";
import { JourneyTitle } from "./JourneyTitle";

// Configuración estática fuera del componente para evitar recreación
const GAME_CONFIG = {
    TeamSelector,
    SimonSays,
    CaptainBribery,
    AutoElimination,
    Dalgona,
    TugOfWar,
    Bomb
};

const SplashScreen = ({ onEnd }: { onEnd: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [fadingOut, setFadingOut] = useState(false);
    const [visible, setVisible] = useState(true);
    const alertedRef = useRef(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                // Trigger alerta al 50%
                if (prev > 50 && !alertedRef.current) {
                    alertedRef.current = true;
                    toast.success("Para una mejor experiencia, usa pantalla completa (F11) y activa el sonido 🔊", {
                        position: 'top-right',
                        richColors: true,
                    });
                    playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 0.3 });
                }
                return prev + 1;
            });
        }, 25); // Ligeramente más rápido para UX

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
        };
    }, [onEnd]);

    if (!visible) return null;

    return (
        <div className={`fixed inset-0 bg-black flex flex-col justify-center items-center z-[8000] transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <h3 class="with-glyph flex relative w-max text-3xl transform px-2 font-atomic tracking-wider font-bold text-[#b4cd02] mix-blend-screen !skew-x-[-20deg] -rotate-6">
                <span class="flex !skew-x-[20deg] transform">Guerra de Streamers</span>
            </h3>
            <div className="w-56 mt-8 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#b4cd02] rounded-xl transition-all duration-75 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">&#x0055;</span>
            <span className="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">&#x0050;</span>
        </div>
    );
};

export const StreamerWars = ({ session }: { session: Session }) => {
    // Estados Globales
    const [players, setPlayers] = useState<Players[]>([]);
    const [splashEnded, setSplashEnded] = useState(false);
    const [showingJourneyTransition, setShowingJourneyTransition] = useState(false);
    const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
    const [showWaitingScreen, setShowWaitingScreen] = useState(true);
    const [expectedPlayers, setExpectedPlayers] = useState<number>(50);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
    const [journeyTransitionProps, setJourneyTransitionProps] = useState({ phase: "start", key: Math.random() });
    const [currentEpisode, setCurrentEpisode] = useState<number | null>(null);

    // Hook del Socket Optimizado
    const {
        pusher, gameState, setGameState, recentlyEliminatedPlayer,
        globalChannel, presenceChannel, bgAudio, bgVolume, setBgVolume,
        setDayAvailable, dayAvailable, showTimer, timerSeconds,
        timerKey, onTimerEnd
    } = useStreamerWarsSocket(session);

    // Listener para Splash Screen
    useEffect(() => {
        const handleSplashEnd = () => setSplashEnded(true);
        document.addEventListener("splash-screen-ended", handleSplashEnd);

        // Preload Sounds una sola vez
        Object.values(STREAMER_WARS_SOUNDS).forEach((sound) => {
            const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
            audio.preload = "auto";
        });

        return () => document.removeEventListener("splash-screen-ended", handleSplashEnd);
    }, []);

    // Carga inicial de datos
    const fetchInitialData = useCallback(async () => {
        try {
            // Paralelizamos peticiones para velocidad
            const [gameStateRes, playersRes, teamsRes] = await Promise.all([
                actions.streamerWars.getGameState(),
                actions.streamerWars.getPlayers(),
                actions.streamerWars.getPlayersTeams()
            ]);

            // 1. Restaurar Game State
            if (gameStateRes.data) {
                const data = gameStateRes.data;
                if (data.dayAvailable !== undefined) setDayAvailable(data.dayAvailable);
                if (data.expectedPlayers !== undefined) setExpectedPlayers(data.expectedPlayers);
                if (data.waitingScreenVisible !== undefined) setShowWaitingScreen(data.waitingScreenVisible);

                if (data.gameState?.game) {
                    setGameState({
                        component: data.gameState.game,
                        props: { session, channel: globalChannel.current, players, pusher, ...data.gameState.props }
                    });
                }
            }

            // 2. Configurar Jugadores y Equipos
            if (playersRes.data && teamsRes.data) {
                const apiPlayers = playersRes.data.players;
                const teams = teamsRes.data.playersTeams;

                // Detectar equipo del usuario actual
                const myPlayerNum = session.user.streamerWarsPlayerNumber;
                if (myPlayerNum) {
                    for (const [teamColor, teamPlayers] of Object.entries(teams)) {
                        if ((teamPlayers as any[]).some((p: any) => p.playerNumber === myPlayerNum)) {
                            setCurrentTeamId(teamColor);
                            break;
                        }
                    }
                }

                // Mapear jugadores con info de equipo
                setPlayers(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const mergedPlayers = [...prev];

                    apiPlayers.forEach((p: any) => {
                        if (!existingIds.has(p.id)) {
                            let team = undefined;
                            // Buscar equipo de este jugador
                            for (const [teamColor, teamPlayers] of Object.entries(teams)) {
                                if ((teamPlayers as any[]).some((tp: any) => tp.playerNumber === p.playerNumber)) {
                                    team = teamColor;
                                    break;
                                }
                            }

                            mergedPlayers.push({
                                id: p.id,
                                playerNumber: p.playerNumber,
                                displayName: p.displayName || p.name || '',
                                avatar: p.avatar || '',
                                admin: p.admin || false,
                                online: false,
                                eliminated: p.eliminated || false,
                                team: team
                            });
                        }
                    });
                    return mergedPlayers;
                });
            }
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    }, [session, setDayAvailable, setExpectedPlayers, setShowWaitingScreen, setGameState, setPlayers]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);


    // -----------------------------------------------------------------------
    // LÓGICA DE SOCKETS DEL JUEGO PRINCIPAL
    // -----------------------------------------------------------------------
    // Se separa en un useEffect que depende de globalChannel.current para asegurar
    // que los bindings se reapliquen si el socket se reconecta (anti-desconexión).
    useEffect(() => {
        console.log("StreamerWars useEffect for globalChannel running");
        const channel = globalChannel.current;
        if (!channel) {
            console.log("No channel, returning");
            return;
        }

        console.log("Binding events to globalChannel");

        // --- EVENT HANDLERS ---

        const handleDayAvailable = () => {
            setShowingJourneyTransition(true);
            setJourneyTransitionProps({ phase: "start", key: Math.random() });

            const onTransitionEnd = () => {
                setDayAvailable(true);
                setTimeout(() => {
                    setShowingJourneyTransition(false);
                    if (session.user.username.toLowerCase() !== 'saltouruguayserver') {
                        setShowWelcomeDialog(true);
                    }
                }, 500);
            };
            document.addEventListener("journey-transition-ended", onTransitionEnd, { once: true });
        };

        const handleShowWaitingScreen = (payload: any) => {
            try {
                const expected = typeof payload?.expectedPlayers === 'number'
                    ? payload.expectedPlayers
                    : parseInt(payload?.expectedPlayers || '0', 10);
                setExpectedPlayers(Number.isFinite(expected) ? expected : 0);
                setShowWaitingScreen(true);
            } catch (e) {
                setShowWaitingScreen(true);
            }
        };

        const handleHideWaitingScreen = () => setShowWaitingScreen(false);

        const handleDayFinished = () => {
            setShowingJourneyTransition(true);
            setJourneyTransitionProps({ phase: "finish", key: Math.random() });

            const onFinishEnd = () => {
                setDayAvailable(false);
                toast.success(`Día #0${CURRENT_DAY} finalizado`, { duration: 8000, richColors: true });
                setTimeout(() => {
                    setShowingJourneyTransition(false);
                    navigate('/guerra-streamers');
                }, 500);
            };
            document.addEventListener("journey-transition-ended", onFinishEnd, { once: true });
        };

        const handleNewVersion = () => {
            playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 1 });
            toast.warning(`¡Nueva versión disponible!`, {
                description: "Recarga la página para disfrutar de las últimas mejoras.",
                duration: 15000,
                position: 'top-right',
                richColors: true,
                action: { label: 'Recargar', onClick: () => location.reload() },
            });
        };

        const handleTechDifficulties = () => {
            playSound({ sound: STREAMER_WARS_SOUNDS.PROBLEMAS_TECNICOS, volume: 1 });
            toast(`Estamos experimentando dificultades técnicas.`, {
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
        };

        const handlePlayerJoinedTeam = ({ playerNumber, team }: { playerNumber: number; team: string }) => {
            if (playerNumber === session.user.streamerWarsPlayerNumber) {
                setCurrentTeamId(team);
            }
            // Actualizar lista local también
            setPlayers(prev => prev.map(p => p.playerNumber === playerNumber ? { ...p, team } : p));
        };

        const handleEpisodeTitle = ({ episode }: { episode: number }) => {
            setCurrentEpisode(episode);
        };

        // --- BINDINGS ---
        channel.bind("day-available", handleDayAvailable);
        channel.bind("show-waiting-screen", handleShowWaitingScreen);
        channel.bind("hide-waiting-screen", handleHideWaitingScreen);
        channel.bind("day-finished", handleDayFinished);
        channel.bind('new-version', handleNewVersion);
        channel.bind('tech-difficulties', handleTechDifficulties);
        channel.bind('player-joined', handlePlayerJoinedTeam);
        channel.bind('episode-title', handleEpisodeTitle);

        // CLEANUP IMPORTANTE: Desvincular eventos al desmontar o cambiar canal
        // Esto previene duplicación de eventos si el hook useStreamerWarsSocket reconecta.
        return () => {
            console.log("Unbinding events from globalChannel");
            channel.unbind("day-available", handleDayAvailable);
            channel.unbind("show-waiting-screen", handleShowWaitingScreen);
            channel.unbind("hide-waiting-screen", handleHideWaitingScreen);
            channel.unbind("day-finished", handleDayFinished);
            channel.unbind('new-version', handleNewVersion);
            channel.unbind('tech-difficulties', handleTechDifficulties);
            channel.unbind('player-joined', handlePlayerJoinedTeam);
            channel.unbind('episode-title', handleEpisodeTitle);
        };
    }, [globalChannel.current]); // Dependencia crítica: globalChannel.current

    // -----------------------------------------------------------------------
    // PRESENCE CHANNEL (Estado Online/Offline)
    // -----------------------------------------------------------------------
    useEffect(() => {
        const pChannel = presenceChannel.current;
        if (!pChannel) return;

        const handleSubscriptionSucceeded = (members: any) => {
            const onlineIds = new Set(Object.values(members.members).map((m: any) => m.id));
            setPlayers(prev => prev.map(p => ({ ...p, online: onlineIds.has(p.id) })));
        };

        const handleMemberAdded = (member: any) => {
            setPlayers(prev => prev.map(p => p.id === member.info.id ? { ...p, online: true } : p));
        };

        const handleMemberRemoved = (member: any) => {
            setPlayers(prev => prev.map(p => p.id === member.info.id ? { ...p, online: false } : p));
        };

        pChannel.bind("pusher:subscription_succeeded", handleSubscriptionSucceeded);
        pChannel.bind("pusher:member_added", handleMemberAdded);
        pChannel.bind("pusher:member_removed", handleMemberRemoved);

        return () => {
            pChannel.unbind("pusher:subscription_succeeded", handleSubscriptionSucceeded);
            pChannel.unbind("pusher:member_added", handleMemberAdded);
            pChannel.unbind("pusher:member_removed", handleMemberRemoved);
        };
    }, [presenceChannel.current]);

    return (
        <>
            <SplashScreen onEnd={() => { }} />

            {pusher && <StreamerWarsCinematicPlayer userId={session.user.id} pusher={pusher} />}

            <PlayerEliminated session={session} playerNumber={recentlyEliminatedPlayer} />

            <CurrentPlayer
                session={session}
                showTimer={showTimer}
                timerSeconds={timerSeconds}
                timerKey={timerKey}
                onTimerEnd={onTimerEnd}
            />

            <div slot="sidebar-left"></div>

            {splashEnded && (
                <>
                    {showingJourneyTransition && (
                        // @ts-ignore
                        <JourneyTransition
                            key={journeyTransitionProps.key}
                            players={players.filter((p) => p.playerNumber <= 50)}
                            {...journeyTransitionProps}
                        />
                    )}

                    {currentEpisode && (
                        <JourneyTitle
                            episode={currentEpisode}
                            onEnd={() => setCurrentEpisode(null)}
                        />
                    )}

                    {dayAvailable && showWaitingScreen && (
                        <WaitingScreen players={players} expectedPlayers={expectedPlayers} />
                    )}

                    <WelcomeToStreamerWars
                        session={session}
                        bgAudio={bgAudio.current}
                        isOpen={showWelcomeDialog}
                        setIsOpen={setShowWelcomeDialog}
                    />

                    {pusher && globalChannel.current && (
                        <>
                            {!dayAvailable ? (
                                <WaitForDayOpen session={session} players={players} />
                            ) : (
                                gameState && !showWaitingScreen ? (
                                    <GameComponent
                                        gameState={gameState}
                                        players={players}
                                        pusher={pusher}
                                        session={session}
                                        channel={globalChannel.current}
                                    />
                                ) : (
                                    <WaitingRoom
                                        session={session}
                                        channel={globalChannel.current}
                                        bgVolume={bgVolume}
                                        setBgVolume={setBgVolume}
                                        bgAudio={bgAudio.current}
                                    />
                                )
                            )}
                        </>
                    )}

                    <AdminChat session={session} channel={globalChannel.current} isAdmin={session.user.isAdmin || false} />
                    <StreamerWarsAudioManager session={session} channel={globalChannel.current} isAdmin={session.user.isAdmin || false} />
                    <VoiceControls isAdmin={session.user.isAdmin || false} />
                    <VoiceChat
                        pusher={pusher}
                        userId={session.user.id}
                        teamId={currentTeamId}
                        isAdmin={session.user.isAdmin || false}
                        players={players}
                    />
                </>
            )}
        </>
    );
};

// Componente optimizado para renderizado de juegos
const GameComponent = ({ gameState, players, pusher, session, channel }: { gameState: any; players: any[]; pusher: Pusher; session: Session; channel: Channel }) => {
    const Component = GAME_CONFIG[gameState.component as keyof typeof GAME_CONFIG];

    if (!Component) return (
        <div class="flex flex-col items-center h-full justify-center">
            <h1 class="text-2xl font-bold mb-4 font-squids">Juego no encontrado</h1>
            <p class="text-white text-center font-press-start-2p">El juego seleccionado no está disponible.</p>
        </div>
    );

    return <Component {...gameState.props} players={players} pusher={pusher} session={session} channel={channel} />;
};