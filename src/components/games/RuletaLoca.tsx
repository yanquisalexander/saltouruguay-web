import { playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { motion, useMotionValue, animate } from "motion/react";
import { WHEEL_SEGMENTS, type WheelSegment } from "@/utils/games/wheel-segments";
import { GameHUD, GameReward } from "./GameHUD";

interface RuletaLocaProps {
    initialSession?: any;
    initialPhrase?: any;
}

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

export const RuletaLoca = ({ initialSession, initialPhrase }: RuletaLocaProps) => {
    const [gameState, setGameState] = useState<"loading" | "idle" | "spinning" | "guessing" | "won" | "lost">("loading");
    const [session, setSession] = useState(initialSession);
    const [phrase, setPhrase] = useState(initialPhrase);
    const [currentWheelValue, setCurrentWheelValue] = useState(0);
    const [currentSegment, setCurrentSegment] = useState<WheelSegment | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(0);
    const [showSolveInput, setShowSolveInput] = useState(false);
    const [solveGuess, setSolveGuess] = useState("");
    const wheelRotation = useMotionValue(0);
    const lastTickCountRef = useRef(Math.floor(0 / 45));

    useEffect(() => {
        loadGameState();

        // Listen for rotation changes to play tick sounds
        const unsubscribe = wheelRotation.onChange((latest: number) => {
            const currentTickCount = Math.floor(latest / 45);
            if (currentTickCount > lastTickCountRef.current) {
                playSound({ sound: STREAMER_WARS_SOUNDS.TICK, volume: 0.3 });
                lastTickCountRef.current = currentTickCount;
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const loadGameState = async () => {
        try {
            const result = await actions.games.ruletaLoca.getGameState();

            if (result.data?.hasActiveGame) {
                setSession(result.data.session);
                setPhrase(result.data.phrase);
                setGameState("idle");
            } else {
                setGameState("idle");
            }
        } catch (error) {
            console.error("Error loading game state:", error);
            setGameState("idle");
        }
    };

    const startNewGame = async () => {
        try {
            setGameState("loading");
            const result = await actions.games.ruletaLoca.startGame();

            if (result.data) {
                setSession(result.data.session);
                setPhrase(result.data.phrase);
                setGameState("idle");
                toast.success("¡Nuevo juego iniciado!");
            }
        } catch (error: any) {
            console.error("Error starting game:", error);
            toast.error(error.message || "Error al iniciar el juego");
            setGameState("idle");
        }
    };

    const handleSpinWheel = async () => {
        if (isSpinning || gameState === "guessing") return;

        try {
            setIsSpinning(true);
            setGameState("spinning");
            playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GIRAR, volume: 0.5, reverbAmount: 0.3 });

            const result = await actions.games.ruletaLoca.spinWheel();

            if (result.data) {
                const segment = result.data.segment;
                setCurrentSegment(segment);
                setCurrentWheelValue(segment.value);

                // 1. Encontrar el índice (Asegúrate de que no haya etiquetas duplicadas en WHEEL_SEGMENTS)
                const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.label === segment.label);

                // 2. Calcular la posición objetivo absoluta
                // El puntero está en 0 grados (arriba).
                // El centro del segmento está en: (index * 45) + 22.5
                const segmentAngle = (segmentIndex * 45) + 22.5;

                // El ángulo visual en el círculo (0-360) donde debe terminar la ruleta
                // para que el segmento quede arriba.
                const pointerOffset = 90; // El indicador está en 12 en punto mientras que el gradiente inicia en las 3 en punto
                const targetVisualAngle = (360 - segmentAngle - pointerOffset + 360) % 360;

                // 3. Calcular la rotación final basada en la rotación acumulada actual
                const currentRotation = wheelRotation.get();

                // Obtenemos cuántas vueltas completas ha dado ya la ruleta
                const currentFullRotations = Math.floor(currentRotation / 360);

                // Calculamos el siguiente punto de parada válido
                let targetRotation = (currentFullRotations * 360) + targetVisualAngle;

                // Si el objetivo calculado está atrás o es igual al actual, sumamos 360 para avanzar
                if (targetRotation <= currentRotation) {
                    targetRotation += 360;
                }

                // 4. Añadir giros extra ALEATORIOS PERO ENTEROS
                // Math.floor es crucial aquí. Si usas decimales, desalineas el objetivo.
                const randomSpins = 5 + Math.floor(Math.random() * 4); // Entre 5 y 8 vueltas enteras
                const finalRotation = targetRotation + (randomSpins * 360);

                // Reiniciar contador de ticks para el sonido
                lastTickCountRef.current = Math.floor(wheelRotation.get() / 45);

                // Animar
                await new Promise<void>(resolve => {
                    animate(wheelRotation, finalRotation, {
                        duration: 4, // Un poco más largo para el dramatismo
                        ease: [0.25, 0.1, 0.25, 1],
                        onComplete: () => resolve()
                    });
                });

                setIsSpinning(false);

                // Handle special segments logic (igual que antes)
                if (segment.type === "bankrupt") {
                    toast.error("¡Bancarrota! Pierdes todos tus puntos.");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.6, reverbAmount: 0.2 });
                    if (result.data.session) {
                        setSession(result.data.session);
                    }
                    setGameState("idle");
                } else if (segment.type === "lose_turn") {
                    toast.warning("¡Pierdes el turno!");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.EQUIPO_ELIMINADO, volume: 0.5, reverbAmount: 0.3 });
                    setGameState("idle");
                } else {
                    toast.success(`¡Giraste ${segment.label} puntos!`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.7, reverbAmount: 0.1 });
                    setGameState("guessing");
                }
            }
        } catch (error: any) {
            console.error("Error spinning wheel:", error);
            toast.error(error.message || "Error al girar la ruleta");
            setIsSpinning(false);
            setGameState("idle");
        }
    };

    const handleSolvePuzzle = async () => {
        if (!session || !solveGuess.trim()) return;

        try {
            const result = await actions.games.ruletaLoca.solvePuzzle({
                sessionId: session.id,
                guess: solveGuess,
            });

            if (result.data) {
                if (result.data.success) {
                    setSession(result.data.session);
                    setRewardAmount(result.data.coinsEarned);
                    setShowReward(true);
                    setShowSolveInput(false);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 0.8, reverbAmount: 0.4 });
                    setTimeout(() => {
                        setGameState("won");
                    }, 3000);
                } else {
                    toast.error("¡Incorrecto! Esa no es la frase.");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.6, reverbAmount: 0.2 });
                    setShowSolveInput(false);
                    setSolveGuess("");
                }
            }
        } catch (error: any) {
            console.error("Error solving puzzle:", error);
            toast.error(error.message || "Error al resolver el panel");
        }
    };

    const handleGuessLetter = async (letter: string) => {
        if (gameState !== "guessing" || !session || !currentSegment) return;

        setSelectedLetter(letter);

        try {
            const result = await actions.games.ruletaLoca.guessLetter({
                sessionId: session.id,
                letter,
                wheelValue: currentWheelValue,
            });

            if (result.data) {
                setSession(result.data.session);

                if (result.data.puzzleSolved) {
                    setRewardAmount(result.data.coinsEarned);
                    setShowReward(true);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 0.8, reverbAmount: 0.4 });
                    setTimeout(() => {
                        setGameState("won");
                    }, 3000);
                } else if (result.data.found) {
                    toast.success(`¡Correcto! La letra "${letter}" está en la frase.`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.6, reverbAmount: 0.1 });
                    setGameState("idle");
                } else {
                    toast.error(`La letra "${letter}" no está en la frase.`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.5, reverbAmount: 0.2 });
                    setGameState("idle");
                }
            }
        } catch (error: any) {
            console.error("Error guessing letter:", error);
            toast.error(error.message || "Error al adivinar la letra");
            setGameState("idle");
        }

        setSelectedLetter(null);
    };

    const handleForfeit = async () => {
        if (!session) return;

        if (!confirm("¿Estás seguro de que quieres rendirte?")) return;

        try {
            await actions.games.ruletaLoca.forfeitGame({ sessionId: session.id });
            toast.info("Te has rendido. ¡Mejor suerte la próxima vez!");
            setGameState("lost");
        } catch (error: any) {
            console.error("Error forfeiting game:", error);
            toast.error(error.message || "Error al rendirse");
        }
    };

    const renderPhrasePanel = () => {
        if (!phrase || !session) return null;

        const words = phrase.phrase.split(" ");

        return (
            <div className="flex flex-wrap gap-4 justify-center items-center mb-8">
                {words.map((word: string, wordIndex: number) => (
                    <div key={wordIndex} className="flex gap-1">
                        {word.split("").map((char: string, charIndex: number) => {
                            const normalizedChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                            const isLetter = /[A-Z]/.test(normalizedChar);
                            const isGuessed = session.guessedLetters?.some((letter: string) =>
                                letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === normalizedChar
                            );

                            return (
                                <div
                                    key={charIndex}
                                    className={`
                                        w-12 h-16 flex items-center justify-center
                                        text-2xl font-bold font-press-start-2p
                                        border-4 border-black
                                        ${isLetter
                                            ? isGuessed
                                                ? "bg-yellow-400 text-black"
                                                : "bg-blue-900 text-transparent"
                                            : "bg-transparent border-transparent"
                                        }
                                    `}
                                    style={{
                                        boxShadow: isLetter ? "4px 4px 0px 0px rgba(0,0,0,1)" : "none",
                                    }}
                                >
                                    {isLetter ? (isGuessed ? char : "") : char}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    const renderWheel = () => {
        return (
            <div className="relative flex items-center justify-center mb-8">
                <motion.div
                    className="relative w-64 h-64 rounded-full border-8 border-yellow-500 overflow-hidden"
                    style={{
                        rotate: wheelRotation,
                        background: "conic-gradient(from 0deg, #ff6b6b 0deg 45deg, #4ecdc4 45deg 90deg, #45b7d1 90deg 135deg, #f9ca24 135deg 180deg, #6c5ce7 180deg 225deg, #fd79a8 225deg 270deg, #2d3436 270deg 315deg, #e17055 315deg 360deg)"
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-yellow-500 rounded-full border-4 border-black"></div>
                    </div>
                    {/* Segment labels */}
                    {WHEEL_SEGMENTS.map((segment, index) => {
                        const angle = (index * 45) + 22.5;
                        const radian = (angle * Math.PI) / 180;
                        const radius = 100; // Distance from center
                        const x = Math.cos(radian) * radius;
                        const y = Math.sin(radian) * radius;

                        return (
                            <div
                                key={index}
                                className="absolute text-white font-bold text-sm"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
                                    transformOrigin: 'center',
                                }}
                            >
                                {segment.label}
                            </div>
                        );
                    })}
                </motion.div>
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-0 h-0"
                    style={{
                        borderLeft: "15px solid transparent",
                        borderRight: "15px solid transparent",
                        borderTop: "30px solid #000",
                    }}
                />
            </div>
        );
    };

    const renderLetterPad = () => {
        return (
            <div className="grid grid-cols-7 gap-2 max-w-2xl mx-auto mb-8">
                {ALPHABET.map((letter) => {
                    const isGuessed = session?.guessedLetters?.includes(letter);
                    const isDisabled = isGuessed || gameState !== "guessing";

                    return (
                        <button
                            key={letter}
                            onClick={() => handleGuessLetter(letter)}
                            disabled={isDisabled}
                            className={`
                                w-12 h-12 flex items-center justify-center
                                text-xl font-bold font-press-start-2p
                                border-4 border-black rounded-lg
                                transition-all duration-200
                                ${isDisabled
                                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    : "bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-110 active:scale-95"
                                }
                            `}
                            style={{
                                boxShadow: !isDisabled ? "4px 4px 0px 0px rgba(0,0,0,1)" : "2px 2px 0px 0px rgba(0,0,0,0.5)",
                            }}
                        >
                            {letter}
                        </button>
                    );
                })}
            </div>
        );
    };

    if (gameState === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900">
                <div className="pixel-panel text-center pixel-pulse">
                    <div className="text-white pixel-heading text-xl">
                        Cargando...
                    </div>
                </div>
            </div>
        );
    }

    if (!session || !phrase) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900 text-white p-4">
                <div className="pixel-panel max-w-2xl text-center">
                    <h1 className="pixel-heading text-3xl mb-6 pixel-text-secondary">
                        Ruleta Loca
                    </h1>
                    <p className="pixel-text text-lg mb-8">
                        ¡Bienvenido a Ruleta Loca! Gira la ruleta, adivina las letras y resuelve la frase para ganar SaltoCoins.
                    </p>
                    <button
                        onClick={startNewGame}
                        className="pixel-btn-primary text-lg"
                    >
                        Iniciar Juego
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === "won") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900 text-white p-4">
                <div className="pixel-panel max-w-2xl text-center pixel-glow">
                    <h1 className="pixel-heading text-3xl mb-6 pixel-text-secondary animate-bounce">
                        ¡Ganaste!
                    </h1>
                    <p className="pixel-text text-2xl mb-4">Puntuación final: {session.currentScore}</p>
                    <p className="pixel-text text-lg mb-8 text-white/80">La frase era: "{phrase.phrase}"</p>
                    <button
                        onClick={startNewGame}
                        className="pixel-btn-success text-lg"
                    >
                        Jugar de Nuevo
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === "lost") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900 text-white p-4">
                <div className="pixel-panel max-w-2xl text-center">
                    <h1 className="pixel-heading text-3xl mb-6 text-red-400">
                        Fin del Juego
                    </h1>
                    <p className="pixel-text text-lg mb-8 text-white/80">La frase era: "{phrase.phrase}"</p>
                    <button
                        onClick={startNewGame}
                        className="pixel-btn-secondary text-lg"
                    >
                        Jugar de Nuevo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900 text-white p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="text-4xl md:text-5xl font-bold font-press-start-2p mb-4 text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                        🎡 Ruleta Loca 🎡
                    </h1>
                </div>

                {/* Game HUD */}
                <GameHUD
                    score={session.currentScore}
                    showCoins={false}
                    additionalInfo={{
                        label: "Categoría",
                        value: phrase.category,
                    }}
                />

                {/* Phrase Panel */}
                {renderPhrasePanel()}

                {/* Wheel */}
                <div className="mb-8">
                    {renderWheel()}
                    <div className="text-center">
                        {currentSegment && !isSpinning && (
                            <div className="text-2xl font-bold mb-4 animate-pulse">
                                {currentSegment.label}
                            </div>
                        )}
                        <button
                            onClick={handleSpinWheel}
                            disabled={isSpinning || gameState === "guessing"}
                            className={`${isSpinning || gameState === "guessing" ? "pixel-btn opacity-50 cursor-not-allowed" : "pixel-btn-secondary"}`}
                        >
                            {isSpinning ? "Girando..." : gameState === "guessing" ? "Elige una letra" : "Girar Ruleta"}
                        </button>
                    </div>
                </div>

                {/* Letter Pad */}
                {renderLetterPad()}

                {/* Actions */}
                <div className="text-center flex justify-center gap-4">
                    <button
                        onClick={() => setShowSolveInput(true)}
                        className="pixel-btn-primary"
                        disabled={isSpinning || gameState === "loading" || gameState === "won" || gameState === "lost"}
                    >
                        Resolver Panel
                    </button>
                    <button
                        onClick={handleForfeit}
                        className="pixel-btn-danger"
                    >
                        Rendirse
                    </button>
                </div>
            </div>

            {/* Solve Input Modal */}
            {showSolveInput && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="pixel-panel max-w-md w-full p-6">
                        <h2 className="pixel-heading text-xl mb-4 text-center">Resolver Panel</h2>
                        <p className="pixel-text text-sm mb-4 text-center text-white/70">
                            Escribe la frase completa. ¡Cuidado con la ortografía!
                        </p>
                        <input
                            type="text"
                            value={solveGuess}
                            onInput={(e) => setSolveGuess((e.target as HTMLInputElement).value)}
                            className="pixel-input w-full mb-6 uppercase text-center"
                            placeholder="ESCRIBE LA FRASE..."
                            autoFocus
                        />
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowSolveInput(false)}
                                className="pixel-btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSolvePuzzle}
                                className="pixel-btn-success"
                                disabled={!solveGuess.trim()}
                            >
                                Resolver
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reward Modal */}
            <GameReward
                coins={rewardAmount}
                visible={showReward}
                onComplete={() => setShowReward(false)}
            />
        </div>
    );
};
