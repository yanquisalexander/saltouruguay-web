import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { SimonSaysGameState } from "@/utils/streamer-wars";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { SimonSaysButtons, colors } from "./SimonSaysButtons";
import { pusherService } from "@/services/pusher.client";
import { PUSHER_CHANNELS, PUSHER_EVENTS_SIMON } from "@/consts/pusher";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const SimonSays = ({
    session,
    players
}: {
    session: Session;
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

    const gameStateRef = useRef(gameState);
    const waitingNextRoundRef = useRef(false);
    const showingPatternRef = useRef(false);
    const playerPatternRef = useRef<string[]>([]);

    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { waitingNextRoundRef.current = waitingNextRound; }, [waitingNextRound]);
    useEffect(() => { showingPatternRef.current = showingPattern; }, [showingPattern]);
    useEffect(() => { playerPatternRef.current = playerPattern; }, [playerPattern]);

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

    const simonSaysChannel = pusherService.subscribe(PUSHER_CHANNELS.SIMON_SAYS);

    useEffect(() => {
        simonSaysChannel?.bind(PUSHER_EVENTS_SIMON.GAME_STATE, (newGameState: SimonSaysGameState) => {
            setGameState(newGameState);
            if (newGameState.status === "playing") {
                setPlayerPattern([]);
                setWaitingNextRound(false);
            }
        });

        simonSaysChannel?.bind(PUSHER_EVENTS_SIMON.PATTERN_FAILED, ({ playerNumber }: { playerNumber: number }) => {
            toast.error(
                `Jugador #${playerNumber.toString().padStart(3, "0")} eliminado`,
                { position: "bottom-center" }
            );
        });

        simonSaysChannel?.bind(PUSHER_EVENTS_SIMON.COMPLETED_PATTERN, ({ playerNumber }: { playerNumber: number }) => {
            if (playerNumber === session.user.streamerWarsPlayerNumber!) return;
            toast.success(
                `Jugador #${playerNumber.toString().padStart(3, "0")} completó el patrón`,
                { position: "bottom-center" }
            );
        });

        simonSaysChannel?.bind(PUSHER_EVENTS_SIMON.CLIENT_PLAYER_INPUT, ({ playerNumber, color }: { playerNumber: number; color: string }) => {
            setRivalInputs(prev => {
                const newInputs = { ...prev };
                if (!newInputs[playerNumber]) newInputs[playerNumber] = [];
                newInputs[playerNumber].push(color);
                return newInputs;
            });
        });

        return () => {
            simonSaysChannel?.unbind(PUSHER_EVENTS_SIMON.GAME_STATE);
            simonSaysChannel?.unbind(PUSHER_EVENTS_SIMON.PATTERN_FAILED);
            simonSaysChannel?.unbind(PUSHER_EVENTS_SIMON.COMPLETED_PATTERN);
            simonSaysChannel?.unbind(PUSHER_EVENTS_SIMON.CLIENT_PLAYER_INPUT);
            pusherService.unsubscribe(PUSHER_CHANNELS.SIMON_SAYS);
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
        if (waitingNextRoundRef.current || showingPatternRef.current) return;

        const currentGameState = gameStateRef.current;
        const pn = session.user.streamerWarsPlayerNumber!;
        if (currentGameState.eliminatedPlayers?.includes(pn)) return;

        playSound({ sound: STREAMER_WARS_SOUNDS.CLICK_SIMON_SAYS });
        const updatedPattern = [...playerPatternRef.current, color];
        playerPatternRef.current = updatedPattern;
        setPlayerPattern(updatedPattern);

        simonSaysChannel?.trigger(PUSHER_EVENTS_SIMON.CLIENT_PLAYER_INPUT, {
            playerNumber: pn,
            color
        });

        if (color !== currentGameState.pattern[updatedPattern.length - 1]) {
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR });
            await actions.games.simonSays.patternFailed();
            return;
        }

        if (updatedPattern.length === currentGameState.pattern.length) {
            playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT });
            setWaitingNextRound(true);
            const randomDelay = Math.floor(Math.random() * 1500) + 500;
            await sleep(randomDelay);
            await actions.games.simonSays.completePattern();
            playerPatternRef.current = [];
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
        if (gameIsPlaying && gameState.pattern.length > 0 && !isCompleted) {
            showPattern(gameState.pattern);
        }
    }, [gameState.pattern.length, gameState.currentRound, gameIsPlaying, showPattern, isCompleted]);

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
            <div key={rivalPlayer.playerNumber} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full ring-1 ring-white/20 overflow-hidden bg-neutral-800">
                    <img
                        src={rivalPlayer.avatar}
                        alt={`Rival #${rivalPlayer.playerNumber}`}
                        className="w-full h-full object-cover opacity-90"
                        onError={(e) => { e.currentTarget.src = "/fallback.png"; }}
                    />
                </div>
                <span className="font-anton text-[10px] tracking-wider text-neutral-500">
                    #{rivalPlayer.playerNumber}
                </span>
            </div>
        ));
    };

    return (
        <>
            <Instructions duration={30_000}
                controls={[
                    {
                        keys: ["LEFT_CLICK"],
                        label: "Haz clic en los colores para repetir el patrón"
                    }
                ]}
            >
                <p class="font-rubik max-w-2xl text-left text-neutral-300 leading-relaxed">
                    "Simon dice" es un juego de memoria donde aparecerá una secuencia de colores. Tu tarea es repetir esa misma secuencia, siguiendo el mismo orden sin equivocarte.
                    <br />
                    Si un jugador se equivoca en algún color, quedará eliminado del juego.
                </p>
                <br />
                <p class="font-rubik max-w-2xl text-left text-neutral-300 leading-relaxed">
                    Los jugadores irán tomando turnos uno después del otro. Cuando llegue tu turno, haz clic en los colores en el orden correcto para repetir el patrón que se mostró.
                    <br />
                    <br />
                    A medida que el juego avanza, la secuencia se hará más larga y tendrás que concentrarte para seguirla. ¡Pon atención y demuestra tu memoria!
                </p>

            </Instructions>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="flex relative flex-col items-center justify-center w-full h-full bg-[#050505] text-white overflow-hidden">

                {/* Fondo con gradiente radial sutil */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.15)_0%,transparent_100%)] pointer-events-none"></div>

                {/* --- UI SUPERIOR: PATRÓN DEL JUGADOR (Estilo StreamerWars) --- */}
                {!gameIsWaiting && (
                    <div className="absolute top-4 left-4 z-20 bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-lg p-3">
                        <p className="font-anton text-[10px] tracking-[0.2em] text-neutral-500 mb-1.5 uppercase">Tu Secuencia</p>
                        <div className="flex gap-1.5 h-6 min-w-[100px] items-center">
                            {playerPattern.map((color, index) => {
                                const colDef = colors.find(c => c.name === color);
                                const swatchClass = colDef?.gradient
                                    ? colDef.gradient.split(' ')[0].replace('from-', 'bg-')
                                    : 'bg-gray-500';

                                return (
                                    <div
                                        key={index}
                                        className={`w-3 h-3 rounded-sm ${swatchClass}`}
                                    />
                                );
                            })}
                            {playerPattern.length === 0 && <span className="text-neutral-600 text-xs font-teko tracking-wider">esperando entrada...</span>}
                        </div>
                    </div>
                )}

                {/* --- UI SUPERIOR DERECHA: TÍTULO Y RIVALES --- */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-6 z-20">
                    <h2 className="text-4xl md:text-5xl font-atomic italic text-[#b4cd02] tracking-wider drop-shadow-[0_0_15px_rgba(180,205,2,0.2)]">
                        Simon dice
                    </h2>

                    {gameIsPlaying && (
                        <div className="flex flex-col gap-3 p-3 bg-neutral-900/40 border border-neutral-800 rounded-lg">
                            {renderRivals()}
                        </div>
                    )}
                </div>


                {/* --- ÁREA CENTRAL DE JUEGO --- */}
                <div className="relative z-10 flex flex-col items-center justify-center p-4 w-full max-w-4xl">

                    {/* MENSAJES DE ESTADO */}
                    {isCurrentPlayerPlaying && (
                        <div className={`mb-8 px-6 py-3 bg-neutral-900/60 border border-neutral-800 border-l-2 ${isEliminated ? 'border-l-red-600' : 'border-l-[#b4cd02]'} rounded-lg`}>
                            <h3 className={`text-lg md:text-xl font-teko tracking-wider uppercase ${isEliminated ? 'text-red-500' : 'text-[#b4cd02]'}`}>
                                {getStatusMessage()}
                            </h3>
                        </div>
                    )}

                    {!isCurrentPlayerPlaying && !isEliminated && gameIsPlaying && (
                        <div className="mb-8 flex flex-col items-center w-full">
                            <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg px-5 py-2 mb-4">
                                <span className="text-sm font-teko tracking-wider text-neutral-500 uppercase">Esperando a otros jugadores...</span>
                            </div>

                            <div className="flex gap-4 flex-wrap justify-center max-w-2xl">
                                {(() => {
                                    const rivalsNumbers = Object.entries(gameState.currentPlayers)
                                        .filter(([, num]) => num !== playerNumber)
                                        .map(([, num]) => num);

                                    const validRivals = rivalsNumbers
                                        .map((num) => players.find((p) => p.playerNumber === num))
                                        .filter((p): p is typeof players[number] => Boolean(p && p.avatar));

                                    return validRivals.map(rival => (
                                        <div key={rival.playerNumber} className="flex flex-col items-center bg-neutral-900/40 border border-neutral-800 rounded-lg p-2 min-w-[60px]">
                                            <div className="flex gap-1 mb-1 min-h-[12px]">
                                                {rivalInputs[rival.playerNumber]?.map((color, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-2 h-2 rounded-sm border border-white/20"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <span className="font-anton text-[10px] tracking-wider text-neutral-500">#{rival.playerNumber}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* JUEGO PRINCIPAL */}
                    {gameIsPlaying && (
                        <>
                            {isEliminated ? (
                                <div className="flex flex-col items-center justify-center p-10 bg-neutral-900/60 border border-red-900/50 rounded-lg">
                                    <p className="text-5xl font-teko tracking-wider text-red-500 mb-2 uppercase">
                                        Eliminado
                                    </p>
                                    <p className="text-sm font-teko tracking-wider text-neutral-600">Más suerte la próxima vez</p>
                                </div>
                            ) : (
                                <div className={`transition-all duration-300 ${!isCurrentPlayerPlaying ? 'opacity-50 scale-95 grayscale' : 'scale-100'}`}>
                                    <div className="bg-neutral-900/60 p-4 md:p-5 rounded-2xl border border-neutral-800 shadow-lg backdrop-blur-sm">
                                        <SimonSaysButtons
                                            activeButton={activeButton}
                                            showingPattern={showingPattern}
                                            onClick={isCurrentPlayerPlaying && !isCompleted ? handlePlayerInput : () => { }}
                                        />
                                    </div>

                                    {isCompleted && (
                                        <div className="mt-6 bg-green-900/20 border border-green-900/50 rounded-lg p-3 text-center">
                                            <p className="font-teko text-lg tracking-wider text-green-400 uppercase">
                                                Ronda completada
                                            </p>
                                            <p className="text-sm font-teko tracking-wider text-green-300">¡Esperando a los demás jugadores!</p>
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