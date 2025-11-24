import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { TugOfWarGameState } from "@/utils/streamer-wars";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { useState, useEffect } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Progress } from "@/components/ui/8bit/progress";
import { Button } from "@/components/ui/8bit/button";
import { IS_DEV } from "@/lib/utils";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const TugOfWar = ({
    session,
    pusher,
    players
}: {
    session: Session;
    pusher: Pusher;
    players: { id: number; name: string; avatar: string; playerNumber: number }[];
}) => {
    const [gameState, setGameState] = useState<TugOfWarGameState>({
        teams: {
            teamA: { id: 0, color: '', name: '', playerCount: 0 },
            teamB: { id: 0, color: '', name: '', playerCount: 0 },
        },
        players: { teamA: [], teamB: [] },
        progress: 0,
        status: 'waiting',
        playedTeams: [],
        playerCooldowns: {},
    });

    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const [isOnCooldown, setIsOnCooldown] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [countdownText, setCountdownText] = useState<string | null>(null);

    const playerNumber = session.user.streamerWarsPlayerNumber;

    // Get player's team
    const [playerTeamId, setPlayerTeamId] = useState<number | null>(null);

    useEffect(() => {
        // Determine player's team from session or other means
        // This is a simplified version - in production you'd get this from the backend
        const checkPlayerTeam = async () => {
            // For now, we'll check when the game starts
            if (gameState.status === 'playing' && playerNumber) {
                // Player will know their team when they try to click
            }
        };
        checkPlayerTeam();
    }, [gameState.status, playerNumber]);

    const isPlayerInGame = playerTeamId === gameState.teams.teamA.id ||
        playerTeamId === gameState.teams.teamB.id;

    // Subscribe to Pusher events
    useEffect(() => {
        const globalChannel = pusher?.subscribe("streamer-wars");

        globalChannel?.bind("tug-of-war:game-started", (newGameState: TugOfWarGameState) => {
            setIsStarting(true);
            setCountdownText("Preparados");
            playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION });
            setTimeout(() => {
                setCountdownText("Listos");
                playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION });
            }, 1000);
            setTimeout(() => {
                setCountdownText("¡YA!");
                playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO_COMIENZO });
            }, 2000);
            setTimeout(() => {
                setCountdownText(null);
                setIsStarting(false);
                setGameState(newGameState);
                toast.success("¡Ha comenzado Tug of War!", { position: "bottom-center" });
            }, 3000);
        });

        globalChannel?.bind("tug-of-war:state-update", (data: { progress: number; status: string; winner?: string }) => {
            setGameState(prev => ({
                ...prev,
                progress: data.progress,
                status: data.status as any,
                winner: data.winner as any,
            }));

            if (data.status === 'finished') {
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT });
                const winningTeam = data.winner === 'teamA' ? gameState.teams.teamA.name : gameState.teams.teamB.name;
                toast.success(`¡${winningTeam} ha ganado!`, { position: "bottom-center", duration: 5000 });
            }
        });

        globalChannel?.bind("tug-of-war:game-ended", (data: { winner: string; progress: number; winningTeam: string }) => {
            setGameState(prev => ({
                ...prev,
                status: 'finished',
                winner: data.winner as any,
                progress: data.progress,
            }));
            toast.success(`¡El juego ha terminado! Ganador: ${data.winningTeam}`, { position: "bottom-center", duration: 5000 });
        });

        // Subscribe to game cleared event
        globalChannel?.bind("tug-of-war:game-cleared", () => {
            setGameState(prev => ({
                ...prev,
                status: 'waiting',
                progress: 0,
                winner: undefined,
            }));
            toast.success("¡El estado del juego de la cuerda ha sido limpiado!", { position: "bottom-center", duration: 5000 });
        });

        // Cleanup
        return () => {
            globalChannel?.unbind("tug-of-war:game-started");
            globalChannel?.unbind("tug-of-war:state-update");
            globalChannel?.unbind("tug-of-war:game-ended");
            globalChannel?.unbind("tug-of-war:game-cleared");
        };
    }, [pusher, gameState.teams]);

    // Cooldown countdown
    useEffect(() => {
        if (cooldownRemaining > 0) {
            const interval = setInterval(() => {
                setCooldownRemaining(prev => {
                    const next = Math.max(0, prev - 100);
                    if (next === 0) {
                        setIsOnCooldown(false);
                    }
                    return next;
                });
            }, 100) as any;

            return () => clearInterval(interval);
        }
    }, [cooldownRemaining]);

    // Load initial game state
    useEffect(() => {
        const loadInitialState = async () => {
            await sleep(2000);
            const { error, data } = await actions.games.tugOfWar.getGameState();
            if (!error && data) {
                setGameState(data.gameState);
            }
        };

        document.addEventListener("instructions-ended", loadInitialState, { once: true });
        return () => {
            document.removeEventListener("instructions-ended", loadInitialState);
        };
    }, []);

    const handlePull = async () => {
        if (isOnCooldown || gameState.status !== 'playing') return;

        setIsOnCooldown(true);
        playSound({ sound: STREAMER_WARS_SOUNDS.GOLPE_CUERDA });

        try {
            const { error, data } = await actions.games.tugOfWar.handlePlayerClick();

            if (error) {
                toast.error(error.message || "No puedes tirar de la cuerda ahora", { position: "bottom-center" });
                setIsOnCooldown(false);
                return;
            }

            if (data?.gameState) {
                // Set cooldown (1.5 seconds)
                setCooldownRemaining(1500);
            }
        } catch (err) {
            console.error("Error al tirar de la cuerda:", err);
            setIsOnCooldown(false);
            toast.error("Error al procesar tu acción", { position: "bottom-center" });
        }
    };

    const getTeamAColor = () => {
        const colorMap: Record<string, string> = {
            'red': 'bg-red-500',
            'blue': 'bg-blue-500',
            'yellow': 'bg-yellow-500',
            'purple': 'bg-purple-500',
            'green': 'bg-green-500',
        };
        return colorMap[gameState.teams.teamA.color] || 'bg-blue-500';
    };

    const getTeamBColor = () => {
        const colorMap: Record<string, string> = {
            'red': 'bg-red-500',
            'blue': 'bg-blue-500',
            'yellow': 'bg-yellow-500',
            'purple': 'bg-purple-500',
            'white': 'bg-white text-black',
        };
        return colorMap[gameState.teams.teamB.color] || 'bg-red-500';
    };

    return (
        <>
            {isStarting && countdownText && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000]">
                    <div className="text-4xl font-bold text-white font-press-start-2p">
                        {countdownText}
                    </div>
                </div>
            )}
            <Instructions duration={IS_DEV ? 90000 : 90000}
                controls={[
                    {
                        keys: ["LEFT_CLICK"],
                        label: "Tirar de la cuerda"
                    }
                ]}
            >
                <p class="font-mono max-w-2xl text-left">
                    En equipos, deberán trabajar juntos para tirar de la cuerda y hacer que el equipo contrario caiga.
                    <br />
                    Para hacerlo, solo tienes que hacer Click izquierdo sobre el botón <strong>"¡TIRAR DE LA CUERDA!"</strong>. Cada clic suma <strong>1 punto</strong> para tu equipo.
                </p>
                <br />

                <p class="font-mono max-w-2xl text-left">
                    <strong>¡Importante!</strong> Hay un tiempo de espera de 1.5 segundos entre cada clic. Esto quiere decir que no podrás presionar el botón sin parar, así que necesitarás coordinarte con tu equipo y mantener un buen ritmo.
                    <br />
                    Si el equipo contrario hace clic, podrán ir ganando puntos ellos también y la barra se moverá hacia su lado. Cada clic puede cambiar el resultado.
                </p>
                <br />

                <p class="font-mono max-w-2xl text-left">
                    El juego termina cuando uno de los equipos llena su lado de la barra y llega a los <strong>100 puntos</strong>. El primer equipo en lograrlo será el ganador.
                    <br />
                    ¡Coordinen sus clics, mantengan el esfuerzo y no se rindan!
                </p>

            </Instructions>

            <div className="flex relative flex-col items-center justify-center h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/70 via-transparent to-transparent text-white p-8">
                <h2 className="text-3xl font-bold mb-8 font-squids">
                    Tira y Afloja
                </h2>

                {gameState.status === 'waiting' && (
                    <div className="text-center">
                        <p className="font-press-start-2p">
                            Esperando que el administrador inicie el juego...
                        </p>
                    </div>
                )}

                {gameState.status === 'playing' && (
                    <div className="w-full max-w-4xl flex flex-col items-center gap-8">
                        <Progress
                            value={gameState.progress}
                            teamAColor={getTeamAColor()}
                            teamBColor={getTeamBColor()}
                            teamAName={gameState.teams.teamA.name}
                            teamBName={gameState.teams.teamB.name}
                        />

                        <div className="flex gap-8 items-center">
                            <div className="text-center">
                                <p className="text-sm font-mono mb-2">{gameState.teams.teamA.name}</p>
                                <div className="grid grid-cols-4 gap-1">
                                    {gameState.players.teamA.map(playerNumber => {
                                        const player = players.find(p => p.playerNumber === playerNumber);
                                        return player ? (
                                            <img
                                                key={player.id}
                                                src={player.avatar}
                                                alt={player.name}
                                                className="w-8 h-8 rounded-full ring-1 ring-white/20"
                                                onError={(e) => e.currentTarget.src = "/fallback.png"}
                                            />
                                        ) : null;
                                    })}
                                </div>
                            </div>
                            <div className="text-4xl font-bold">VS</div>
                            <div className="text-center">
                                <p className="text-sm font-mono mb-2">{gameState.teams.teamB.name}</p>
                                <div className="grid grid-cols-4 gap-1">
                                    {gameState.players.teamB.map(playerNumber => {
                                        const player = players.find(p => p.playerNumber === playerNumber);
                                        return player ? (
                                            <img
                                                key={player.id}
                                                src={player.avatar}
                                                alt={player.name}
                                                className="w-8 h-8 rounded-full ring-1 ring-white/20"
                                                onError={(e) => e.currentTarget.src = "/fallback.png"}
                                            />
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handlePull}
                            disabled={isOnCooldown}

                            className={`px-12 py-6 font-press-start-2p ${isOnCooldown ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-yellow-400 text-black hover:bg-yellow-500'}`}
                            font="retro"
                        >
                            {isOnCooldown
                                ? `ESPERA ${(cooldownRemaining / 1000).toFixed(1)}s`
                                : "¡TIRAR DE LA CUERDA!"}
                        </Button>

                        {isOnCooldown && (
                            <div className="w-64 h-2 absolute bottom-16 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400 transition-all duration-100"
                                    style={{ width: `${(cooldownRemaining / 1500) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {gameState.status === 'finished' && (
                    <div className="text-center">
                        <h3 className="text-2xl font-bold mb-4 font-mono">
                            ¡Juego Terminado!
                        </h3>
                        <p className="text-xl mb-4 font-press-start-2p">
                            Ganador: {gameState.winner === 'teamA' ? gameState.teams.teamA.name : gameState.teams.teamB.name}
                        </p>
                        <Progress
                            value={gameState.progress}
                            teamAColor={getTeamAColor()}
                            teamBColor={getTeamBColor()}
                            teamAName={gameState.teams.teamA.name}
                            teamBName={gameState.teams.teamB.name}
                        />
                    </div>
                )}
            </div>
        </>
    );
};
