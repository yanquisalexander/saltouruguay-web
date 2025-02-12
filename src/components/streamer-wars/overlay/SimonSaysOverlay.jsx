import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { useEffect, useState, useCallback, useMemo } from "preact/hooks";
import { SimonSaysButtons } from "../games/SimonSaysButtons";

// Componente para mostrar el progreso de los jugadores
const PlayersProgress = ({ players, currentPlayers, patternsProgress }) => {
    return (
        <div class="flex flex-col h-full w-full bg-black/40 justify-center items-center gap-4">
            {players
                .filter((player) => currentPlayers.includes(player.playerNumber))
                .map((player) => {
                    // Accedemos directamente al progreso del jugador mediante su número
                    const playerProgress = patternsProgress[player.playerNumber] || [];
                    return (
                        <div
                            key={player.playerNumber}
                            class="flex border-blue-600 gap-x-4 w-[80%] border bg-blue-500/20 p-2 rounded-md items-center"
                        >
                            <div class="flex gap-2 items-center">
                                <img
                                    src={player.avatar}
                                    alt={player.displayName}
                                    class="size-8 rounded-md"
                                />
                                <div class="font-atomic text-lg text-lime-200">
                                    #{player.playerNumber.toString().padStart(3, "0")}
                                </div>
                            </div>
                            <div class="flex gap-1 mt-2">
                                {playerProgress.map((color, index) => (
                                    <div
                                        key={index}
                                        class={`size-5 rounded-full ${getColorClass(color)}`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
};

// Función auxiliar para manejar clases de colores en Tailwind
const getColorClass = (color) => {
    const colors = {
        red: "bg-red-500",
        blue: "bg-blue-500",
        green: "bg-green-500",
        yellow: "bg-yellow-500",
    };
    return colors[color] || "bg-gray-500"; // Color de respaldo si no se encuentra
};

export const SimonSaysOverlay = ({ initialGameState, channel, players, pusher }) => {
    const [gameState, setGameState] = useState({
        teams: {},
        currentRound: 0,
        currentPlayers: {},
        pattern: [],
        eliminatedPlayers: [],
        status: "waiting",
        completedPlayers: [],
        playerWhoAlreadyPlayed: [],
        ...initialGameState,
    });

    

    const [playersProgress, setPlayersProgress] = useState([]);
    const [activeButton, setActiveButton] = useState(null);
    const [showingPattern, setShowingPattern] = useState(false);

    useEffect(() => {
        console.log({playersProgress})

    }, [playersProgress])

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Muestra el patrón con animación y sonidos
    const showPattern = useCallback(async (pattern) => {
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

    useEffect(() => {
        if (!pusher) return;
        console.log("Simon Says Overlay", pusher);
        const simonSaysChannel = pusher.subscribe("streamer-wars.simon-says");

        simonSaysChannel.bind("game-state", (newGameState) => {
            setGameState((prevState) => {
                if (newGameState.currentRound !== prevState.currentRound) {
                    setPlayersProgress({});
                }
                return newGameState;
            });
        });

        simonSaysChannel.bind("client-player-input", ({ playerNumber, color }) => {
            console.log("client-player-input", { playerNumber, color });

            // Actualizamos el progreso del jugador sin mutar el estado anterior
            setPlayersProgress((prevProgress) => {
                const newProgress = { ...prevProgress };

                // Verifica si el jugador forma parte de los jugadores activos
                if (
                    gameState.currentPlayers.blue === playerNumber ||
                    gameState.currentPlayers.red === playerNumber
                ) {
                    newProgress[playerNumber] = [
                        ...(newProgress[playerNumber] || []),
                        color,
                    ];
                }

                return newProgress;
            });
        });

        return () => {
            simonSaysChannel.unbind("game-state");
            simonSaysChannel.unbind("client-player-input");
            pusher.unsubscribe("streamer-wars.simon-says");
        };
    }, [pusher, gameState.currentPlayers]);

    useEffect(() => {
        if (gameState.pattern.length > 0) {
            showPattern(gameState.pattern);
        }
    }, [gameState.pattern, showPattern]);

    // Calculamos los jugadores actuales a partir de gameState.currentPlayers
    const currentPlayers = useMemo(
        () => Object.values(gameState.currentPlayers),
        [gameState.currentPlayers]
    );

    console.log({ gameState, players, currentPlayers, playersProgress });

    return (
        <div class="grid grid-cols-12 h-screen gap-2 text-white">
            <div class="col-span-4 flex flex-col justify-center items-center">
                <PlayersProgress
                    players={players}
                    currentPlayers={currentPlayers}
                    patternsProgress={playersProgress}
                />
            </div>
            <div class="col-span-8 flex flex-col justify-center items-center">
                <SimonSaysButtons
                    activeButton={activeButton}
                    showingPattern={showingPattern}
                    onClick={() => {}}
                />
            </div>
        </div>
    );
};
