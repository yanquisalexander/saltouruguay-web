import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { useEffect, useState, useCallback } from "preact/hooks";
import { SimonSaysButtons } from "../games/SimonSaysButtons";

const PlayersProgress = ({ players, currentPlayers, patternsProgress }) => {
    console.log({ players, currentPlayers, patternsProgress });
    /* 
    currentPlayers: [
    100,
    2
]
    */
    return (
        <div class="grid grid-cols-12 gap-2">
            {currentPlayers.map(playerNumber => {
                const player = players.find(p => p.playerNumber === parseInt(playerNumber));
                console.log(playerNumber, player);
                const playerProgress = patternsProgress[playerNumber] || [];

                return player ? (
                    <div key={playerNumber} class="col-span-4 flex flex-col justify-center items-center">
                        <div class="text-white text-center">
                            <p class="text-lg font-bold">{player.name}</p>
                            <p class="text-sm">Jugador #{playerNumber}</p>
                        </div>
                        <div class="flex justify-center items-center">
                            {playerProgress.map((color, index) => (
                                <div key={index} class="w-6 h-6 rounded-full m-1" style={{ backgroundColor: color }}></div>
                            ))}
                        </div>
                    </div>
                ) : null;
            })}
        </div>
    );
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

    const [playersProgress, setPlayersProgress] = useState({});
    const [activeButton, setActiveButton] = useState(null);
    const [showingPattern, setShowingPattern] = useState(false);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        const simonSaysChannel = pusher?.subscribe("streamer-wars.simon-says");

        simonSaysChannel?.bind("pusher:subscription_succeeded", () => {
            console.log("Conexión exitosa al canal de Simon Says");
        });

        simonSaysChannel?.bind("game-state", (newGameState) => {
            setGameState(prevState => {
                if (newGameState.currentRound !== prevState.currentRound) {
                    setPlayersProgress({});
                }
                return newGameState;
            });
        });

        simonSaysChannel?.bind("client-player-input", ({ playerNumber, color }) => {
            setPlayersProgress(prev => ({
                ...prev,
                [playerNumber]: [...(prev[playerNumber] || []), color],
            }));
        });

        return () => {
            simonSaysChannel?.unbind_all();
            simonSaysChannel?.unsubscribe();
        };
    }, [pusher]);

    useEffect(() => {
        if (gameState.status === "playing") {
            showPattern(gameState.pattern);
        }
    }, [gameState.pattern, gameState.status, showPattern]);

    return (
        <div class="grid grid-cols-12 gap-2 text-white">
            <div class="col-span-4 flex flex-col justify-center items-center">
                <PlayersProgress players={players} currentPlayers={Object.values(gameState.currentPlayers)} patternsProgress={playersProgress} />
            </div>
            <div class="col-span-8 flex flex-col justify-center items-center">
                <SimonSaysButtons activeButton={activeButton} showingPattern={showingPattern} onClick={() => {}} />
            </div>
        </div>
    );
};