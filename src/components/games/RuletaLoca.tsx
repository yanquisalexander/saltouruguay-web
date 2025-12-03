import { playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { motion, useMotionValue, animate } from "motion/react";
import { WHEEL_SEGMENTS, type WheelSegment } from "@/utils/games/wheel-segments";

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

                // Find segment index
                const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.label === segment.label);
                const targetAngle = (segmentIndex * 45) + 22.5; // Center of segment

                // Calculate the rotation needed to reach targetAngle
                const currentAngle = wheelRotation.get() % 360;
                let delta = targetAngle - currentAngle;
                if (delta < 0) delta += 360;

                // Animate wheel spin
                const spins = 5 + Math.random() * 3; // 5-8 full rotations
                const finalRotation = wheelRotation.get() + (360 * spins) + delta;

                // Reset tick counter
                lastTickCountRef.current = Math.floor(wheelRotation.get() / 45);

                // Animate with Framer Motion
                animate(wheelRotation, finalRotation, {
                    duration: 3,
                    ease: [0.25, 0.1, 0.25, 1], // Custom cubic-bezier for ease-out
                });

                // Wait for animation
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Update the motion value to the normalized angle
                wheelRotation.set(finalRotation % 360);
                setIsSpinning(false);

                // Handle special segments
                if (segment.type === "bankrupt") {
                    toast.error("¡Bancarrota! Pierdes todos tus puntos.");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.6, reverbAmount: 0.2 });
                    // Reset score logic would go here
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
                    toast.success(`¡Felicidades! Ganaste ${result.data.coinsEarned} SaltoCoins`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 0.8, reverbAmount: 0.4 });
                    setGameState("won");
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
                <div className="text-white text-2xl font-press-start-2p animate-pulse">
                    Cargando...
                </div>
            </div>
        );
    }

    if (!session || !phrase) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900 text-white p-4">
                <h1 className="text-4xl font-bold font-press-start-2p mb-8 text-yellow-400">
                    Ruleta Loca
                </h1>
                <p className="text-xl mb-8 text-center max-w-2xl">
                    ¡Bienvenido a Ruleta Loca! Gira la ruleta, adivina las letras y resuelve la frase para ganar SaltoCoins.
                </p>
                <button
                    onClick={startNewGame}
                    className="px-8 py-4 bg-yellow-400 text-black font-bold font-press-start-2p rounded-lg border-4 border-black hover:bg-yellow-300 transition-all duration-200 hover:scale-110 active:scale-95"
                    style={{ boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" }}
                >
                    Iniciar Juego
                </button>
            </div>
        );
    }

    if (gameState === "won") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900 text-white p-4">
                <h1 className="text-4xl font-bold font-press-start-2p mb-8 text-yellow-400 animate-bounce">
                    ¡Ganaste!
                </h1>
                <p className="text-2xl mb-4">Puntuación final: {session.currentScore}</p>
                <p className="text-xl mb-8">La frase era: "{phrase.phrase}"</p>
                <button
                    onClick={startNewGame}
                    className="px-8 py-4 bg-yellow-400 text-black font-bold font-press-start-2p rounded-lg border-4 border-black hover:bg-yellow-300 transition-all duration-200 hover:scale-110 active:scale-95"
                    style={{ boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" }}
                >
                    Jugar de Nuevo
                </button>
            </div>
        );
    }

    if (gameState === "lost") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-cyan-900 text-white p-4">
                <h1 className="text-4xl font-bold font-press-start-2p mb-8 text-red-400">
                    Fin del Juego
                </h1>
                <p className="text-xl mb-8">La frase era: "{phrase.phrase}"</p>
                <button
                    onClick={startNewGame}
                    className="px-8 py-4 bg-yellow-400 text-black font-bold font-press-start-2p rounded-lg border-4 border-black hover:bg-yellow-300 transition-all duration-200 hover:scale-110 active:scale-95"
                    style={{ boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" }}
                >
                    Jugar de Nuevo
                </button>
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
                    <div className="flex justify-center gap-8 text-xl">
                        <div className="bg-black/50 px-4 py-2 rounded-lg border-2 border-yellow-500/50">
                            <span className="text-yellow-300">Categoría:</span> {phrase.category}
                        </div>
                        <div className="bg-black/50 px-4 py-2 rounded-lg border-2 border-yellow-500/50">
                            <span className="text-yellow-300">Puntos:</span> {session.currentScore}
                        </div>
                    </div>
                </div>

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
                            className={`
                                px-8 py-4 font-bold font-press-start-2p rounded-lg border-4 border-black
                                transition-all duration-200
                                ${isSpinning || gameState === "guessing"
                                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                    : "bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-110 active:scale-95"
                                }
                            `}
                            style={{
                                boxShadow: isSpinning || gameState === "guessing" ? "2px 2px 0px 0px rgba(0,0,0,0.5)" : "6px 6px 0px 0px rgba(0,0,0,1)",
                            }}
                        >
                            {isSpinning ? "Girando..." : gameState === "guessing" ? "Elige una letra" : "Girar Ruleta"}
                        </button>
                    </div>
                </div>

                {/* Letter Pad */}
                {renderLetterPad()}

                {/* Actions */}
                <div className="text-center">
                    <button
                        onClick={handleForfeit}
                        className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg border-4 border-black hover:bg-red-500 transition-all duration-200"
                        style={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
                    >
                        Rendirse
                    </button>
                </div>
            </div>
        </div>
    );
};
