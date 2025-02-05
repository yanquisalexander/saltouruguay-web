import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { SimonSaysGameState } from "@/utils/streamer-wars";
import { getTranslation } from "@/utils/translate";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideCircleDotDashed } from "lucide-preact";
import { useState, useEffect } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";

export const SimonSays = ({
    session,
    pusher
}: {
    session: Session;
    pusher: Pusher;
}) => {
    const colors = [
        { name: "red", gradient: "from-red-400 to-red-600" },
        { name: "blue", gradient: "from-blue-400 to-blue-600" },
        { name: "green", gradient: "from-green-400 to-green-600" },
        { name: "yellow", gradient: "from-yellow-400 to-yellow-600" },
    ] as const;

    const [gameState, setGameState] = useState<SimonSaysGameState>({
        teams: {},
        currentRound: 0,
        currentPlayers: {},
        pattern: [],
        eliminatedPlayers: [],
        status: 'waiting',
        completedPlayers: []
    });

    useEffect(() => {
        actions.games.simonSays.getGameState().then(({ error, data }) => {
            if (error) {
                console.error(error);
                return;
            }
            setGameState(data.gameState);
        });
    }, []);

    const [playerPattern, setPlayerPattern] = useState<string[]>([]);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [waitingNextRound, setWaitingNextRound] = useState(false);
    const [showingPattern, setShowingPattern] = useState(false);

    const simonSaysChannel = pusher?.subscribe("streamer-wars.simon-says");

    useEffect(() => {
        simonSaysChannel?.bind("game-state", (newGameState: SimonSaysGameState) => {
            setGameState(newGameState);
            setPlayerPattern([]);
            setWaitingNextRound(false);

            if (newGameState.status === 'playing') {
                showPattern(newGameState.pattern);
            }
            console.log(newGameState);
        });

        simonSaysChannel?.bind("pattern-failed", ({ playerNumber }: { playerNumber: number }) => {
            toast.error(`Jugador #${playerNumber} ha sido eliminado`);
        });
    }, [simonSaysChannel]);

    const showPattern = async (pattern: string[]) => {
        setShowingPattern(true);
        for (const color of pattern) {
            setActiveButton(color);
            playSound({ sound: STREAMER_WARS_SOUNDS.CLICK_SIMON_SAYS });
            await new Promise(resolve => setTimeout(resolve, 600));
            setActiveButton(null);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        setShowingPattern(false);
        setWaitingNextRound(false);
    };

    const handlePlayerInput = async (color: string) => {
        if (waitingNextRound || showingPattern) return;

        playSound({ sound: STREAMER_WARS_SOUNDS.CLICK_SIMON_SAYS });

        const updatedPattern = [...playerPattern, color];
        setPlayerPattern(updatedPattern);

        if (color === gameState.pattern[updatedPattern.length - 1]) {
            if (updatedPattern.length === gameState.pattern.length) {
                toast.success("Correcto! Sigues en juego");
                setPlayerPattern([]);
                playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT });
                setWaitingNextRound(true);
                await actions.games.simonSays.completePattern({ playerNumber: session.user.id });
                return;
            }
        } else {
            toast.error("Incorrecto! Has sido eliminado");
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });

            await actions.games.simonSays.patternFailed({ playerNumber: session.user.id });
            return;
        }
    };

    // Determinamos el mensaje que se debe mostrar basado en el estado del juego
    const getStatusMessage = () => {
        if (gameState.status === 'waiting') {
            return "Esperando que el administrador comience el juego";
        }

        if (waitingNextRound) {
            return "Esperando al siguiente patrón";
        }

        if (showingPattern) {
            return "Simon dice...";
        }

        return "Tu turno";
    };

    useEffect(() => {
        if (gameState.status === 'playing') {
            showPattern(gameState.pattern);
        }
    }, [gameState.pattern]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))]   
                    from-lime-600 via-transparent to-transparent text-white p-4">
            {
                gameState.status !== 'waiting' && (

                    <div className="flex gap-2 mt-4">
                        {playerPattern.map((color, index) => (
                            <div className={`size-4 rounded-full bg-gradient-to-b ${colors.find(c => c.name === color)?.gradient}`}
                                key={index}
                            />
                        ))}
                    </div>
                )
            }

            <h2 className="text-2xl text-[#b4cd02] font-bold mt-4 font-atomic">
                Simón dice
            </h2>

            <div className="mt-4 text-3xl font-medium font-teko italic">
                {getStatusMessage()}
            </div>

            {gameState.status === 'playing' && session.user.streamerWarsPlayerNumber !== undefined && gameState.currentPlayers[session.user.streamerWarsPlayerNumber] && (
                <div className="grid grid-cols-2 gap-4 mt-8">
                    {colors.map(({ name, gradient }) => (
                        <div
                            key={name}
                            className={`size-48 flex justify-center items-center text-xl font-teko uppercase italic font-medium cursor-pointer transition-transform 
                            hover:scale-105 active:scale-95 rounded-3xl bg-gradient-to-b ${gradient}
                            ${activeButton === name ? "scale-125" : ""} transition-all duration-300`}
                            onClick={() => handlePlayerInput(name)}
                        >
                            {getTranslation(name)}
                        </div>
                    ))}
                </div>
            )}

            {
                /* 
                    El jugador actual ya ha jugado?
                */

                session.user.streamerWarsPlayerNumber !== undefined && gameState.completedPlayers.includes(session.user.streamerWarsPlayerNumber) && (
                    <div className="text-center mt-4">
                        <LucideCircleDotDashed className="size-16 text-[#b4cd02]" />
                        <p className="text-lg font-bold font-atomic">
                            ¡Felicidades!<br />
                            Continúas en el desafío
                        </p>
                    </div>
                )
            }

            {
                /* 
                    Aún no ha jugado el jugador actual y el juego está en curso sin el jugador actual?
                */

                session.user.streamerWarsPlayerNumber !== undefined && !gameState.completedPlayers.includes(session.user.streamerWarsPlayerNumber) && gameState.status === 'playing' && !gameState.currentPlayers[session.user.streamerWarsPlayerNumber] && (
                    <div className="text-center mt-4">
                        <LucideCircleDotDashed className="size-16 text-[#b4cd02]" />
                        <p className="text-lg font-bold font-atomic">
                            ¡Espera tu turno!<br />
                            Pronto será tu oportunidad
                        </p>
                    </div>
                )


            }




        </div>
    );
};
