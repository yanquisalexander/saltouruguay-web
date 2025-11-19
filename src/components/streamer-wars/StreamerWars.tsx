import type { Session } from "@auth/core/types";
import { useEffect, useRef, useState } from "preact/hooks";
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
import { LucideBug, LucideVolume2 } from "lucide-preact";
import { CURRENT_DAY, JourneyTransition } from "./JourneyTransition";
import { CaptainBribery } from "./games/CaptainBribery";
import { type Players } from "../admin/streamer-wars/Players";
import { AutoElimination } from "./games/AutoElimination";
import { WelcomeToStreamerWars } from "./WelcomeToStreamerWars";
import { navigate } from "astro:transitions/client";
import { AdminChat } from "./AdminChat";
import { StreamerWarsCinematicPlayer } from "./StreamerWarsCinematicPlayer";
import { Dalgona } from "./games/Dalgona";
import { TugOfWar } from "./games/TugOfWar";
import { StreamerWarsAudioManager } from "./StreamerWarsAudioManager";
import { Timer } from "./Timer";
import CurrentPlayer from "./CurrentPlayer";
import { VoiceChat } from "./VoiceChat";
import { VoiceControls } from "./VoiceControls";

const PRELOAD_SOUNDS = () => {
    Object.values(STREAMER_WARS_SOUNDS).forEach((sound) => {
        const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
        audio.preload = "auto";
    });
};

const SplashScreen = ({ onEnd }: { onEnd: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [alertedBetterExperience, setAlertedBetterExperience] = useState(false);
    const [fadingOut, setFadingOut] = useState(false);

    useEffect(() => {
        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev < 100 ? prev + 1 : 100));
            if (progress > 50 && !alertedBetterExperience) {
                toast.success("Para una mejor experiencia, usa pantalla completa (F11) y activa el sonido 🔊", {
                    position: 'top-right',
                    richColors: true,
                })
                setAlertedBetterExperience(true);
                playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 0.3 });
            }
        }, 30);

        const timer = setTimeout(() => {
            document.dispatchEvent(new CustomEvent('splash-screen-ended'));
            setFadingOut(true);
            setTimeout(() => {
                setLoading(false);
                onEnd();
            }, 500); // Tiempo de fade out
        }, 2500);

        return () => {
            clearTimeout(timer);
            // @ts-ignore
            clearInterval(progressInterval);
        };
    }, [progress, alertedBetterExperience, onEnd]);

    if (!loading) return null;

    return (
        <div className={`fixed inset-0 bg-black flex flex-col justify-center items-center z-[8000] transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <h3 class="with-glyph flex relative w-max text-3xl transform px-2 font-atomic tracking-wider font-bold text-[#b4cd02] mix-blend-screen !skew-x-[-20deg] -rotate-6" data-astro-cid-3jqi3h3c=""> <span class="flex !skew-x-[20deg] transform" data-astro-cid-3jqi3h3c="">
                Guerra de Streamers
            </span> </h3>
            <div className="w-56 mt-8 h-2 bg-gray-700 rounded-full">
                <div className="h-full bg-[#b4cd02] rounded-xl" style={{ width: `${progress}%` }}></div>
            </div>

            <span className="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">
                &#x0055;
            </span>
            <span className="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">
                &#x0050;
            </span>
        </div>
    );
};
export const StreamerWars = ({ session }: { session: Session }) => {
    const [players, setPlayers] = useState<Players[]>([]);
    const { pusher, gameState, setGameState, recentlyEliminatedPlayer, globalChannel, presenceChannel, bgAudio, bgVolume, setBgVolume, setDayAvailable, dayAvailable, showTimer, timerSeconds, timerKey, onTimerEnd } = useStreamerWarsSocket(session);
    const [splashEnded, setSplashEnded] = useState(false);
    const [showingJourneyTransition, setShowingJourneyTransition] = useState(false);
    const [showedWelcomeDialog, setShowedWelcomeDialog] = useState(false);
    const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
    const [showWaitingScreen, setShowWaitingScreen] = useState(true);
    const [expectedPlayers, setExpectedPlayers] = useState<number>(50);
    const [showVoiceControls, setShowVoiceControls] = useState(false);
    const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

    useEffect(() => {
        document.addEventListener("splash-screen-ended", () => {
            setSplashEnded(true);
        })
    }, []);


    const [journeyTransitionProps, setJourneyTransitionProps] = useState({ phase: "start", key: Math.random() });

    const restoreGameStateFromCache = async () => {
        const { data, error } = await actions.streamerWars.getGameState();
        console.log({ data, error });

        if (error) {
            return;
        }

        if (data.dayAvailable) {
            setDayAvailable(data.dayAvailable);
        }

        if (data.expectedPlayers !== undefined) {
            setExpectedPlayers(data.expectedPlayers);
        }

        if (data.waitingScreenVisible !== undefined) {
            setShowWaitingScreen(data.waitingScreenVisible);
        }

        if (data && data.gameState) {
            if (data && data.gameState.game && data.gameState.props) {
                const { game, props } = data.gameState;
                setGameState({ component: game, props: { session, channel: globalChannel.current, players, pusher, ...props } });
            }
        }
    }

    useEffect(() => {
        restoreGameStateFromCache();

        actions.streamerWars.getPlayers().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }


            setPlayers((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));

                const newPlayers = data.players
                    .filter((p: any) => !existingIds.has(p.id))
                    .map((p: any) => ({
                        id: p.id,
                        playerNumber: p.playerNumber,
                        displayName: p.displayName || p.name || '',
                        avatar: p.avatar || '',
                        admin: p.admin || false,
                        online: false,
                        eliminated: p.eliminated || false,
                    }));

                return [...prev, ...newPlayers];
            });
        });

        // Get current player's team
        actions.streamerWars.getPlayersTeams().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }

            // Find the team the current player belongs to
            if (session.user.streamerWarsPlayerNumber) {
                for (const [teamColor, teamPlayers] of Object.entries(data.playersTeams)) {
                    const playerInTeam = (teamPlayers as any[]).find(
                        (p: any) => p.playerNumber === session.user.streamerWarsPlayerNumber
                    );
                    if (playerInTeam) {
                        setCurrentTeamId(teamColor);
                        break;
                    }
                }
            }
        });
    }, []);



    useEffect(() => {

        PRELOAD_SOUNDS();

        globalChannel.current?.bind("day-available", () => {
            setShowingJourneyTransition(true);
            // Actualizamos el key para forzar la remount
            setJourneyTransitionProps({ phase: "start", key: Math.random() });
            document.addEventListener("journey-transition-ended", () => {

                setDayAvailable(true);
                setTimeout(() => {
                    setShowingJourneyTransition(false);
                    if (!showedWelcomeDialog && session.user.username.toLowerCase() !== 'saltouruguayserver') {
                        setShowWelcomeDialog(true);
                        setShowedWelcomeDialog(true);
                    }

                }, 500);
            }, { once: true });
        });

        // Nuevo evento para mostrar la pantalla de espera y pasar expectedPlayers
        globalChannel.current?.bind("show-waiting-screen", (payload: any) => {
            try {
                const expected = typeof payload?.expectedPlayers === 'number' ? payload.expectedPlayers : parseInt(payload?.expectedPlayers || '0', 10);
                setExpectedPlayers(Number.isFinite(expected) ? expected : 0);
                setShowWaitingScreen(true);
            } catch (e) {
                console.warn('show-waiting-screen payload parse error', e, payload);
                setShowWaitingScreen(true);
            }
        });

        globalChannel.current?.bind("hide-waiting-screen", () => {
            setShowWaitingScreen(false);
        });

        globalChannel.current?.bind("day-finished", () => {
            setShowingJourneyTransition(true);
            setJourneyTransitionProps({ phase: "finish", key: Math.random() });
            document.addEventListener("journey-transition-ended", () => {
                setDayAvailable(false);
                toast.success(`Día #0${CURRENT_DAY} finalizado`, {
                    duration: 8000,
                    richColors: true,
                });
                setTimeout(() => {
                    setShowingJourneyTransition(false);
                    navigate('/guerra-streamers')

                }, 500);
            }, { once: true });
        });

        globalChannel.current?.bind('new-version', () => {
            playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 1 });
            toast.warning(`¡Nueva versión disponible!`, {
                description: "Recarga la página para disfrutar de las últimas mejoras.",
                duration: 15000,
                position: 'top-right',
                richColors: true,
                action: {
                    label: 'Recargar',
                    onClick: () => {
                        location.reload();
                    }
                },
            })
        })

        globalChannel.current?.bind('tech-difficulties', () => {
            playSound({ sound: STREAMER_WARS_SOUNDS.PROBLEMAS_TECNICOS, volume: 1 });

            toast(`Estamos experimentando dificultades técnicas. Por favor, espera unos momentos.`, {
                icon: <LucideBug />,
                duration: 8000,
                position: 'top-right',
                richColors: true,
                classNames: {
                    toast: 'bg-neutral-900 text-white border border-neutral-600',
                    icon: 'text-yellow-600 flex flex-col justify-center items-center p-5 rounded-full',
                    title: 'font-rubik uppercase font-medium',
                }
            })
        })

        // Listen for player joined team event to update current team
        globalChannel.current?.bind('player-joined', ({ playerNumber, team }: { playerNumber: number; team: string }) => {
            if (playerNumber === session.user.streamerWarsPlayerNumber) {
                setCurrentTeamId(team);
            }
        })


        presenceChannel.current?.bind("pusher:subscription_succeeded", (members: any) => {
            const onlinePlayers = Object.values(members.members).map((member: any) => ({
                ...member,
                displayName: member.name,
                online: true,
            }));

            setPlayers((prev) =>
                prev.map((player) => ({
                    ...player,
                    online: onlinePlayers.some((p) => p.id === player.id),
                }))
            );
        });

        presenceChannel.current?.bind("pusher:member_added", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) => (player.id === member.info.id ? { ...player, online: true } : player))
            );
        });

        presenceChannel.current?.bind("pusher:member_removed", (member: any) => {
            setPlayers((prev) =>
                prev.map((player) => (player.id === member.info.id ? { ...player, online: false } : player))
            );
        });


        actions.streamerWars.getGameState().then(({ data, error }) => {
            if (!error && data?.gameState) {
                setGameState({ component: data.gameState.game, props: { session, channel: globalChannel.current, players, pusher, ...data.gameState.props } });
            }
        });

        return () => {
            presenceChannel.current?.unbind_all();
            presenceChannel.current?.unsubscribe();
            globalChannel.current?.unbind_all();
        };
    }, []);



    return (
        <>
            <SplashScreen onEnd={() => { }} />
            {pusher && <StreamerWarsCinematicPlayer userId={session.user.id} pusher={pusher} />}
            <PlayerEliminated session={session} playerNumber={recentlyEliminatedPlayer} />
            <CurrentPlayer session={session} showTimer={showTimer} timerSeconds={timerSeconds} timerKey={timerKey} onTimerEnd={onTimerEnd} />
            <div slot="sidebar-left">
                {session.user.isAdmin && (
                    <button onClick={() => setShowVoiceControls(!showVoiceControls)} className="fixed bottom-4 left-4 z-50 bg-black/90 p-2 rounded border border-gray-700">
                        <LucideVolume2 className="w-4 h-4 text-white" />
                    </button>
                )}
            </div>
            {
                splashEnded && (
                    <>
                        {
                            showingJourneyTransition && (
                                // @ts-ignore
                                <JourneyTransition key={journeyTransitionProps.key}
                                    /* 
                                    Excluye eliminados, y los que cuyo número sea superior a 50
                                    */
                                    players={players.filter((p) => p.playerNumber <= 50)}
                                    {...journeyTransitionProps} />

                            )
                        }
                        {
                            // Mostrar WaitingScreen cuando el día esté disponible y el flag esté activo
                            dayAvailable && showWaitingScreen && (
                                <WaitingScreen players={players} expectedPlayers={expectedPlayers} />
                            )
                        }
                        <WelcomeToStreamerWars session={session} bgAudio={bgAudio.current!} isOpen={showWelcomeDialog} setIsOpen={setShowWelcomeDialog} />
                        {pusher && globalChannel.current && presenceChannel.current && session && (
                            <>
                                {
                                    !dayAvailable ? (
                                        <WaitForDayOpen session={session} players={players} />
                                    ) : (
                                        gameState && !showWaitingScreen ? (
                                            <GameComponent gameState={gameState} players={players} pusher={pusher} session={session} channel={globalChannel.current} />
                                        ) : (
                                            <WaitingRoom
                                                session={session}
                                                channel={globalChannel.current}
                                                bgVolume={bgVolume}
                                                setBgVolume={setBgVolume}
                                                bgAudio={bgAudio.current!}
                                            />
                                        )
                                    )
                                }
                            </>
                        )}

                        <AdminChat session={session} channel={globalChannel.current} isAdmin={session.user.isAdmin || false} />
                        <StreamerWarsAudioManager session={session} channel={globalChannel.current} isAdmin={session.user.isAdmin || false} />
                        <VoiceControls isAdmin={session.user.isAdmin || false} show={showVoiceControls} />
                        <VoiceChat
                            pusher={pusher}
                            userId={session.user.id}
                            teamId={currentTeamId}
                            isAdmin={session.user.isAdmin || false}
                        />
                    </>
                )}
        </>
    );
}

const GameComponent = ({ gameState, players, pusher, session, channel }: { gameState: any; players: any[]; pusher: Pusher; session: Session; channel: Channel }) => {
    const GAME_CONFIG = useRef({ TeamSelector, SimonSays, CaptainBribery, AutoElimination, Dalgona, TugOfWar });

    const Component = GAME_CONFIG.current[gameState.component as keyof typeof GAME_CONFIG.current];
    const props = { ...gameState.props, players, pusher, session, channel };

    if (!Component) return (
        <div class="flex flex-col items-center h-full justify-center">
            <h1 class="text-2xl font-bold mb-4 font-squids">Juego no encontrado</h1>
            <p class="text-white text-center font-press-start-2p">El juego seleccionado no está disponible.</p>
        </div>

    )

    return <Component {...props} />;
}