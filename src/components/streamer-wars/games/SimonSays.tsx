import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { SimonSaysGameState } from "@/utils/streamer-wars";
import { getTranslation } from "@/utils/translate";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { useState, useEffect, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { SimonSaysButtons, colors } from "./SimonSaysButtons"; // Asegúrate de ajustar la ruta según tu estructura

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
    const gameRivals = Object.values(gameState.currentPlayers).filter(p => p !== playerNumber);

    // Recuperar estado inicial tras finalizar las instrucciones
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
                `Jugador #${playerNumber.toString().padStart(3, "0")} ha sido eliminado`,
                { position: "bottom-center" }
            );
        });

        simonSaysChannel?.bind("completed-pattern", ({ playerNumber }: { playerNumber: number }) => {
            if (playerNumber === session.user.streamerWarsPlayerNumber!) return;
            toast.success(
                `Jugador #${playerNumber.toString().padStart(3, "0")} ha completado el patrón`,
                { position: "bottom-center" }
            );
        });

        simonSaysChannel?.bind("client-player-input", ({ playerNumber, color }: { playerNumber: number; color: string }) => {
            console.log(`Jugador #${playerNumber} ha seleccionado el color ${color}`);
        });

        // Cleanup: desuscribir eventos al desmontar
        return () => {
            simonSaysChannel?.unbind_all();
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
            toast.error("¡Incorrecto! Has sido eliminado");
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
            await actions.games.simonSays.patternFailed({ playerNumber: session.user.id });
            return;
        }

        if (updatedPattern.length === gameState.pattern.length) {
            toast.success("¡Correcto! Sigues en juego", { position: "bottom-center" });
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT });
            setWaitingNextRound(true);
            await actions.games.simonSays.completePattern({ playerNumber: session.user.id });
            setPlayerPattern([]);
        }
    };

    const getStatusMessage = () => {
        if (gameIsWaiting) return "Esperando que el administrador comience el juego";
        if (isEliminated) return "¡Has sido eliminado!";
        if (waitingNextRound) return "Esperando al siguiente patrón";
        if (showingPattern) return "Simon dice...";
        return "Tu turno";
    };

    // Mostrar el patrón al iniciar la ronda
    useEffect(() => {
        if (gameIsPlaying && gameState.pattern.length > 0) {
            showPattern(gameState.pattern);
        }
    }, [gameState.pattern, gameIsPlaying, showPattern]);

    return (
        <>
            <Instructions duration={8000}>
                <p class="font-mono max-w-2xl text-left">
                    "Simon dice" es un juego de memoria en el que se muestra un patrón de colores que los jugadores deben repetir en el mismo orden.
                    <br />
                    Si un jugador se equivoca, será eliminado del juego.
                </p>
                <p class="font-mono max-w-2xl text-left">
                    Los jugadores irán rotando a medida que avanza el juego. Cuando sea tu turno, haz clic en los colores para repetir el patrón.
                </p>
            </Instructions>
            <div
                className="flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))]   
          from-lime-600 via-transparent to-transparent text-white p-4"
            >
                {!gameIsWaiting && (
                    <div className="flex gap-2 mt-4">
                        {playerPattern.map((color, index) => (
                            <div
                                key={index}
                                className={`size-4 rounded-full bg-gradient-to-b ${colors.find(c => c.name === color)?.gradient}`}
                            />
                        ))}
                    </div>
                )}

                <h2 className="text-2xl text-[#b4cd02] font-bold mt-4 font-atomic">
                    Simón dice
                </h2>

                {/* Mostrar avatares de jugadores */}
                {gameIsPlaying && (
                    <div class="flex items-center gap-x-4 mt-4">
                        {isCurrentPlayerPlaying && (
                            <>
                                <div class="relative">
                                    <img
                                        src={players.find(p => p?.playerNumber === playerNumber)?.avatar}
                                        alt="Tu avatar"
                                        class="size-10 rounded-full ring-2 ring-white/20"
                                    />
                                </div>
                                <span class="font-atomic">VS.</span>
                            </>
                        )}

                        {gameRivals.map(rival => {
                            const rivalPlayer = players.find(p =>
                                isCurrentPlayerPlaying ? p.playerNumber === rival : p.id === rival
                            );
                            return (
                                <div key={rival} class="relative">
                                    <img
                                        src={rivalPlayer?.avatar}
                                        alt={`Avatar de jugador #${rival}`}
                                        class="size-10 rounded-full ring-2 ring-white/20"
                                    />
                                    <span class="absolute -bottom-4 inset-x-0 bg-white font-atomic text-black text-md rounded-full px-1">
                                        #{rival?.toString().padStart(3, "0")}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Mensaje para jugadores que no están en turno */}
                {gameIsPlaying && !isCurrentPlayerPlaying && (
                    <div className="text-center mt-4">
                        <p className="text-2xl font-teko">
                            Tus compañeros están jugando en este momento
                        </p>
                    </div>
                )}

                {isCurrentPlayerPlaying && (
                    <div className="mt-4 text-3xl font-medium font-teko italic">
                        {getStatusMessage()}
                    </div>
                )}

                {gameIsPlaying && (
                    <>
                        {isEliminated ? (
                            <div className="text-center mt-4">
                                <p className="text-lg font-bold font-atomic">
                                    ¡Has sido eliminado del juego!
                                </p>
                            </div>
                        ) : isCurrentPlayerPlaying ? (
                            !isCompleted ? (
                                <SimonSaysButtons
                                    activeButton={activeButton}
                                    showingPattern={showingPattern}
                                    onClick={handlePlayerInput}
                                />
                            ) : (
                                <div className="text-center mt-4">
                                    <p className="text-lg font-bold font-atomic">
                                        ¡Felicidades!<br />
                                        Continúas en el desafío
                                    </p>
                                </div>
                            )
                        ) : !isEliminated && (
                            <div className="text-center mt-4">
                                <p className="text-2xl font-teko">
                                    ¡Espera tu turno!<br />
                                    Pronto será tu oportunidad
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};
