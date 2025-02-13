import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { useEffect, useState, useCallback, useMemo } from "preact/hooks";
import { SimonSaysButtons, colors } from "../games/SimonSaysButtons";
import { actions } from "astro:actions";
import { toast } from "sonner";

// Componente para mostrar el progreso de los jugadores
const PlayersProgress = ({ players, currentPlayers, patternsProgress }) => {
    return (
        <div class="flex flex-col h-full w-full justify-center items-center gap-4">
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
                            <div class="flex gap-2 items-center mr-auto">
                                <img
                                    src={player.avatar}
                                    alt={player.displayName}
                                    class="size-8 rounded-md"
                                />
                                <div class="font-atomic text-lg text-lime-200">
                                    #{player.playerNumber.toString().padStart(3, "0")}
                                </div>
                            </div>
                            <div class="grid grid-cols-4 gap-1 mt-2">
                                {playerProgress.map((color, index) => {
                                    const colorClass = colors.find(c => c.name === color)?.gradient;
                                    console.log({ colorClass });
                                    return (
                                        <div
                                            key={index}
                                            class={`size-5 rounded-full col-span-1 bg-gradient-to-br ${colorClass}`}
                                        ></div>
                                    );
                                })}
                                {playerProgress.map((color) => console.log({ color }))}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
};



export const SimonSaysOverlay = ({ channel, players, pusher }) => {
    const [gameState, setGameState] = useState({
        teams: {},
        currentRound: 0,
        currentPlayers: {},
        pattern: [],
        eliminatedPlayers: [],
        status: "waiting",
        completedPlayers: [],
        playerWhoAlreadyPlayed: [],
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
        const restoreGameState = async () => {
            const { error, data } = await actions.games.simonSays.getGameState();
            console.log({ error, data });
                        if (!error && data) {
                            setGameState(data.gameState);
                        }
        }

        restoreGameState();

    }, [])

    useEffect(() => {
        if (!pusher) return;

        const simonSaysChannel = pusher.subscribe("streamer-wars.simon-says");

        simonSaysChannel.bind("game-state", (newGameState) => {
            if (newGameState.currentRound !== gameState.currentRound) {
                setPlayersProgress({});
            }
            setGameState(newGameState);
        });

        simonSaysChannel.bind("client-player-input", ({ playerNumber, color }) => {
            console.log("client-player-input", { playerNumber, color });

            // Actualizamos el progreso del jugador sin mutar el estado anterior
            setPlayersProgress((prevProgress) => {
                const playerProgress = prevProgress[playerNumber] || [];
                return {
                    ...prevProgress,
                    [playerNumber]: [...playerProgress, color],
                };
            });
        });

        simonSaysChannel?.bind("completed-pattern", ({ playerNumber }) => {
            toast.success(
                `Jugador #${playerNumber.toString().padStart(3, "0")} ha completado el patrón`,
                { position: "bottom-center", richColors: true }
            );
        });

        simonSaysChannel?.bind("pattern-failed", ({ playerNumber }) => {
            toast.error(
                `Jugador #${playerNumber.toString().padStart(3, "0")} ha fallado el patrón`,
                { position: "bottom-center", richColors: true }
            );

            // Eliminamos al jugador del progreso
            setPlayersProgress((prevProgress) => {
                const { [playerNumber]: _, ...rest } = prevProgress;
                return rest;
            });
            
        });

        

        return () => {
            simonSaysChannel.unbind("game-state");
            simonSaysChannel.unbind("client-player-input");
            pusher.unsubscribe("streamer-wars.simon-says");
        };
    }, [pusher, gameState.currentPlayers]);

    useEffect(() => {
        if (gameState.pattern.length > 0 && gameState.status === "playing") {
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
        <div class="grid grid-cols-12 h-screen gap-2 text-white animate-fade-in">
            <div class="col-span-4 flex flex-col justify-center items-center bg-gradient-to-r from-black/80 via-black/40 to-transparent">
                <h2 class="text-2xl font-rubik font-bold text-lime-200">
                    Simón dice
                </h2>

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
