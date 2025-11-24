import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { SimonSaysGameState } from "@/utils/streamer-wars";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { useState, useEffect, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { SimonSaysButtons, colors } from "./SimonSaysButtons";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const SimonSays = ({
    session,
    pusher,
    players
}: {
    session: Session;
    pusher: Pusher;
    players: { id: number; name: string; avatar: string; playerNumber: number }[];
}) => {

    const [gameState, setGameState] = useState<SimonSaysGameState>({
        teams: {},
        currentRound: 0,
        currentPlayers: {},
        pattern: [],
        eliminatedPlayers: [],
        status: "waiting",
        completedPlayers: [],
        playerWhoAlreadyPlayed: []
    });

    const [playerPattern, setPlayerPattern] = useState<string[]>([]);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [waitingNextRound, setWaitingNextRound] = useState(false);
    const [showingPattern, setShowingPattern] = useState(false);
    const [rivalInputs, setRivalInputs] = useState<{ [key: number]: string[] }>({});

    // Variables derivadas
    const playerNumber = session.user.streamerWarsPlayerNumber;
    const isEliminated =
        playerNumber !== undefined && gameState.eliminatedPlayers?.includes(playerNumber);
    const isCompleted =
        playerNumber !== undefined && gameState.completedPlayers.includes(playerNumber);
    const isCurrentPlayerPlaying =
        playerNumber !== undefined &&
        Object.values(gameState.currentPlayers).includes(playerNumber);

    const gameIsWaiting = gameState.status === "waiting";
    const gameIsPlaying = gameState.status === "playing";

    // Recuperar estado inicial
    useEffect(() => {
        const onInstructionsEnded = async () => {
            await sleep(2000);
            const { error, data } = await actions.games.simonSays.getGameState();
            if (!error && data) {
                setGameState(data.gameState);
            }
        };

        document.addEventListener("instructions-ended", onInstructionsEnded, { once: true });
        return () => {
            document.removeEventListener("instructions-ended", onInstructionsEnded);
        };
    }, []);

    const simonSaysChannel = pusher?.subscribe("streamer-wars.simon-says");

    useEffect(() => {
        simonSaysChannel?.bind("game-state", (newGameState: SimonSaysGameState) => {
            setGameState(newGameState);
            if (newGameState.status === "playing") {
                setPlayerPattern([]);
                setWaitingNextRound(false);
            }
        });

        simonSaysChannel?.bind("pattern-failed", ({ playerNumber }: { playerNumber: number }) => {
            toast.error(
                `Jugador #${playerNumber.toString().padStart(3, "0")} eliminado`,
                { position: "bottom-center" }
            );
        });

        simonSaysChannel?.bind("completed-pattern", ({ playerNumber }: { playerNumber: number }) => {
            if (playerNumber === session.user.streamerWarsPlayerNumber!) return;
            toast.success(
                `Jugador #${playerNumber.toString().padStart(3, "0")} completó el patrón`,
                { position: "bottom-center" }
            );
        });

        simonSaysChannel?.bind("client-player-input", ({ playerNumber, color }: { playerNumber: number; color: string }) => {
            setRivalInputs(prev => {
                const newInputs = { ...prev };
                if (!newInputs[playerNumber]) newInputs[playerNumber] = [];
                newInputs[playerNumber].push(color);
                return newInputs;
            });
        });

        return () => {
            simonSaysChannel?.unbind("game-state");
            simonSaysChannel?.unbind("pattern-failed");
            simonSaysChannel?.unbind("completed-pattern");
            simonSaysChannel?.unbind("client-player-input");
            simonSaysChannel?.unsubscribe();
        };
    }, [simonSaysChannel, session.user.streamerWarsPlayerNumber]);

    const showPattern = useCallback(async (pattern: string[]) => {
        setShowingPattern(true);
        for (const color of pattern) {
            setActiveButton(color);
            playSound({ sound: STREAMER_WARS_SOUNDS.CLICK_SIMON_SAYS });
            await sleep(600);
            setActiveButton(null);
            await sleep(300);
        }
        setShowingPattern(false);
    }, []);

    const handlePlayerInput = async (color: string) => {
        if (waitingNextRound || showingPattern || isEliminated) return;

        playSound({ sound: STREAMER_WARS_SOUNDS.CLICK_SIMON_SAYS });
        const updatedPattern = [...playerPattern, color];
        setPlayerPattern(updatedPattern);

        simonSaysChannel.trigger("client-player-input", {
            playerNumber: session.user.streamerWarsPlayerNumber!,
            color
        });

        if (color !== gameState.pattern[updatedPattern.length - 1]) {
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
            await actions.games.simonSays.patternFailed({ playerNumber: session.user.id });
            return;
        }

        if (updatedPattern.length === gameState.pattern.length) {
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT });
            setWaitingNextRound(true);
            const randomDelay = Math.floor(Math.random() * 1500) + 500;
            await sleep(randomDelay);
            await actions.games.simonSays.completePattern({ playerNumber: session.user.id });
            setPlayerPattern([]);
        }
    };

    const getStatusMessage = () => {
        if (gameIsWaiting) return "Esperando inicio...";
        if (isEliminated) return "¡Has sido eliminado!";
        if (waitingNextRound) return "Ronda completada, espera...";
        if (showingPattern) return "Memoriza el patrón";
        return "¡Tu turno!";
    };

    useEffect(() => {
        if (gameIsPlaying && gameState.pattern.length > 0) {
            showPattern(gameState.pattern);
        }
    }, [gameState.pattern, gameIsPlaying, showPattern]);

    useEffect(() => {
        setRivalInputs({});
    }, [gameState.pattern]);

    // Render Helpers
    const renderRivals = () => {
        const rivalsNumbers = Object.entries(gameState.currentPlayers)
            .filter(([, num]) => num !== playerNumber)
            .map(([, num]) => num);

        const validRivals = rivalsNumbers
            .map((num) => players.find((p) => p.playerNumber === num))
            .filter((p): p is typeof players[number] => Boolean(p && p.avatar));

        if (validRivals.length === 0) return null;

        return validRivals.map((rivalPlayer) => (
            <div key={rivalPlayer.playerNumber} className="relative group">
                {/* Avatar cuadrado con estilo pixelado */}
                <div className="w-10 h-10 md:w-12 md:h-12 bg-neutral-800 border-2 border-white shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
                    <img
                        src={rivalPlayer.avatar}
                        alt={`Rival #${rivalPlayer.playerNumber}`}
                        className="w-full h-full object-cover pixelated-img opacity-90"
                        style={{ imageRendering: "pixelated" }}
                        onError={(e) => { e.currentTarget.src = "/fallback.png"; }}
                    />
                </div>
                {/* Etiqueta simple */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-mono font-bold px-1 border border-white whitespace-nowrap z-10">
                    #{rivalPlayer.playerNumber}
                </div>
            </div>
        ));
    };

    return (
        <>
            <style>{`
                .bg-grid-pattern {
                    background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    background-size: 30px 30px;
                }
                .scanlines {
                    background: linear-gradient(
                        to bottom,
                        rgba(255,255,255,0),
                        rgba(255,255,255,0) 50%,
                        rgba(0,0,0,0.1) 50%,
                        rgba(0,0,0,0.1)
                    );
                    background-size: 100% 4px;
                }
                .pixelated-img {
                    image-rendering: pixelated;
                }
            `}</style>

            <Instructions duration={10000}
                controls={[
                    {
                        keys: ["LEFT_CLICK"],
                        label: "Haz clic en los colores para repetir el patrón"
                    }
                ]}
            >
                <p class="font-mono max-w-2xl text-left">
                    "Simon dice" es un juego de memoria donde aparecerá una secuencia de colores. Tu tarea es repetir esa misma secuencia, siguiendo el mismo orden sin equivocarte.
                    <br />
                    Si un jugador se equivoca en algún color, quedará eliminado del juego.
                </p>
                <br />
                <p class="font-mono max-w-2xl text-left">
                    Los jugadores irán tomando turnos uno después del otro. Cuando llegue tu turno, haz clic en los colores en el orden correcto para repetir el patrón que se mostró.
                    <br />
                    <br />
                    A medida que el juego avanza, la secuencia se hará más larga y tendrás que concentrarte para seguirla. ¡Pon atención y demuestra tu memoria!
                </p>

            </Instructions>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="flex relative flex-col items-center justify-center w-full h-full bg-slate-900 text-white overflow-hidden">

                {/* Fondos sutiles para dar textura sin molestar */}
                <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(30,41,59,0.5)_0%,_rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
                <div className="absolute inset-0 scanlines pointer-events-none z-50 opacity-10"></div>

                {/* --- UI SUPERIOR: PATRÓN DEL JUGADOR (Estilo barra de estado) --- */}
                {!gameIsWaiting && (
                    <div className="absolute top-4 left-4 z-20 bg-black/60 p-2 border border-white/20 backdrop-blur-md rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
                        <p className="text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wider">Tu Secuencia:</p>
                        <div className="flex gap-2 h-6 min-w-[100px] items-center">
                            {playerPattern.map((color, index) => {
                                const colDef = colors.find(c => c.name === color);
                                const swatchClass = colDef?.gradient
                                    ? colDef.gradient.split(' ')[0].replace('from-', 'bg-')
                                    : 'bg-gray-500';

                                return (
                                    <div
                                        key={index}
                                        className={`w-3 h-3 md:w-4 md:h-4 border border-black shadow-sm ${swatchClass}`}
                                        style={{ backgroundColor: color === 'yellow' ? '#facc15' : color }}
                                    />
                                );
                            })}
                            {playerPattern.length === 0 && <span className="text-gray-600 text-xs font-mono">esperando entrada...</span>}
                        </div>
                    </div>
                )}

                {/* --- UI SUPERIOR DERECHA: TÍTULO Y RIVALES --- */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-6 z-20">
                    {/* Título original solicitado */}
                    <h2 className="text-2xl md:text-3xl font-bold font-squids text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        Simon dice
                    </h2>

                    {/* Lista vertical de rivales en juego */}
                    {gameIsPlaying && (
                        <div className="flex flex-col gap-3 p-3 bg-black/30 border-l border-white/10">
                            {renderRivals()}
                        </div>
                    )}
                </div>


                {/* --- ÁREA CENTRAL DE JUEGO --- */}
                <div className="relative z-10 flex flex-col items-center justify-center p-4 w-full max-w-4xl">

                    {/* MENSAJES DE ESTADO */}
                    {isCurrentPlayerPlaying && (
                        <div className={`mb-8 px-8 py-3 bg-neutral-900 border-l-4 ${isEliminated ? 'border-red-600' : 'border-blue-500'} shadow-[8px_8px_0_0_rgba(0,0,0,0.4)]`}>
                            <h3 className={`text-xl md:text-2xl font-bold font-mono tracking-tight ${isEliminated ? 'text-red-500' : 'text-blue-400'}`}>
                                {getStatusMessage()}
                            </h3>
                        </div>
                    )}

                    {!isCurrentPlayerPlaying && !isEliminated && gameIsPlaying && (
                        <div className="mb-8 flex flex-col items-center w-full">
                            <div className="bg-neutral-800/80 px-4 py-2 border border-white/20 mb-4 backdrop-blur-sm shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
                                <span className="text-sm font-mono text-gray-300">Esperando a otros jugadores...</span>
                            </div>

                            {/* Visualización de lo que hacen los otros */}
                            <div className="flex gap-4 flex-wrap justify-center max-w-2xl">
                                {(() => {
                                    const rivalsNumbers = Object.entries(gameState.currentPlayers)
                                        .filter(([, num]) => num !== playerNumber)
                                        .map(([, num]) => num);

                                    const validRivals = rivalsNumbers
                                        .map((num) => players.find((p) => p.playerNumber === num))
                                        .filter((p): p is typeof players[number] => Boolean(p && p.avatar));

                                    return validRivals.map(rival => (
                                        <div key={rival.playerNumber} className="flex flex-col items-center bg-black/40 p-2 border border-white/10 shadow-lg">
                                            <div className="flex gap-1 mb-1 min-h-[12px]">
                                                {rivalInputs[rival.playerNumber]?.map((color, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-2 h-2 border border-white/30"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-gray-400">#{rival.playerNumber}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* JUEGO PRINCIPAL - CONSOLA FÍSICA */}
                    {gameIsPlaying && (
                        <>
                            {isEliminated ? (
                                <div className="flex flex-col items-center justify-center p-12 bg-neutral-900 border border-red-900 shadow-[10px_10px_0_0_rgba(0,0,0,0.5)]">
                                    <p className="text-4xl font-bold font-mono text-red-500 mb-4">
                                        ELIMINADO
                                    </p>
                                    <p className="text-sm font-mono text-gray-500">Más suerte la próxima vez</p>
                                </div>
                            ) : (
                                <div className={`transition-all duration-300 ${!isCurrentPlayerPlaying ? 'opacity-50 scale-95 grayscale' : 'scale-100'}`}>
                                    {/* Carcasa del dispositivo */}
                                    <div className="bg-neutral-800 p-3 md:p-6 rounded-none border-t border-l border-white/10 border-b-4 border-r-4 border-black/50 shadow-[20px_20px_0_0_rgba(0,0,0,0.4)]">
                                        {/* Panel interno oscuro */}
                                        <div className="bg-black/40 p-4 border border-black/30 shadow-inner">
                                            <SimonSaysButtons
                                                activeButton={activeButton}
                                                showingPattern={showingPattern}
                                                onClick={isCurrentPlayerPlaying && !isCompleted ? handlePlayerInput : () => { }}
                                            />
                                        </div>
                                    </div>

                                    {isCompleted && (
                                        <div className="mt-6 text-center bg-green-900/20 border-l-4 border-green-500 p-3 backdrop-blur-sm">
                                            <p className="text-lg font-bold font-mono text-green-400">
                                                ¡Nivel Completado!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};