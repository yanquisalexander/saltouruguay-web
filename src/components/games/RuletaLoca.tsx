import { playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { motion, useMotionValue, animate } from "motion/react";
import { WHEEL_SEGMENTS, type WheelSegment } from "@/utils/games/wheel-segments";
import { GameHUD, GameReward } from "./GameHUD";
import { Instructions } from "../streamer-wars/Instructions";

interface RuletaLocaProps {
    initialSession?: any;
    initialPhrase?: any;
}

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

// Utilidad para delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const RuletaLoca = ({ initialSession, initialPhrase }: RuletaLocaProps) => {
    const [gameState, setGameState] = useState<"loading" | "idle" | "spinning" | "guessing" | "won" | "lost">("idle");
    const [session, setSession] = useState(initialSession);
    const [phrase, setPhrase] = useState(initialPhrase);
    const [currentWheelValue, setCurrentWheelValue] = useState(0);
    const [currentSegment, setCurrentSegment] = useState<WheelSegment | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(0);
    const [showSolveInput, setShowSolveInput] = useState(false);
    const [showLetterDialog, setShowLetterDialog] = useState(false);
    const [showWheelDialog, setShowWheelDialog] = useState(false);
    const [solveGuess, setSolveGuess] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const wheelRotation = useMotionValue(0);
    const lastTickCountRef = useRef(Math.floor(0 / 45));
    const gameContainerRef = useRef<HTMLDivElement | null>(null);

    // Carga inicial y listeners
    useEffect(() => {
        // Carga el estado inicial solo después de las instrucciones o si ya hay sesión
        const initGame = async () => {
            setShowInstructions(false);
            if (initialSession) {
                setGameState("idle");
            } else {
                setGameState("loading");
                await loadGameState();
            }
        };

        // Escuchar evento de fin de instrucciones
        document.addEventListener("instructions-ended", initGame, { once: true });

        const unsubscribe = wheelRotation.onChange((latest: number) => {
            const currentTickCount = Math.floor(latest / 45);
            if (currentTickCount > lastTickCountRef.current) {
                playSound({ sound: STREAMER_WARS_SOUNDS.TICK, volume: 0.3 });
                lastTickCountRef.current = currentTickCount;
            }
        });

        return () => {
            unsubscribe();
            document.removeEventListener("instructions-ended", initGame);
        };
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === gameContainerRef.current);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!gameContainerRef.current) return;
        try {
            if (!document.fullscreenElement) await gameContainerRef.current.requestFullscreen();
            else await document.exitFullscreen();
        } catch (error) {
            console.error("Error toggling fullscreen:", error);
        }
    };

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

    // Lógica de la ruleta (sin cambios funcionales, solo visuales luego)
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

                const segmentIndex = WHEEL_SEGMENTS.findIndex(s => s.label === segment.label);
                const segmentAngle = (segmentIndex * 45) + 22.5;
                const pointerOffset = 90;
                const targetVisualAngle = (360 - segmentAngle - pointerOffset + 360) % 360;
                const currentRotation = wheelRotation.get();
                const currentFullRotations = Math.floor(currentRotation / 360);
                let targetRotation = (currentFullRotations * 360) + targetVisualAngle;

                if (targetRotation <= currentRotation) targetRotation += 360;

                const randomSpins = 5 + Math.floor(Math.random() * 4);
                const finalRotation = targetRotation + (randomSpins * 360);

                lastTickCountRef.current = Math.floor(wheelRotation.get() / 45);

                await new Promise<void>(resolve => {
                    animate(wheelRotation, finalRotation, {
                        duration: 4,
                        ease: [0.25, 0.1, 0.25, 1],
                        onComplete: () => resolve()
                    });
                });

                setIsSpinning(false);

                if (segment.type === "bankrupt") {
                    toast.error("¡Bancarrota!");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_ERROR, volume: 0.6, reverbAmount: 0.2 });
                    if (result.data.session) setSession(result.data.session);
                    setGameState("idle");
                    setTimeout(() => setShowWheelDialog(false), 2000);
                } else if (segment.type === "lose_turn") {
                    toast.warning("¡Pierdes el turno!");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.EQUIPO_ELIMINADO, volume: 0.5, reverbAmount: 0.3 });
                    setGameState("idle");
                    setTimeout(() => setShowWheelDialog(false), 2000);
                } else {
                    toast.success(`¡Giraste ${segment.label} puntos!`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ELIJE_CONSONANTE, volume: 0.7, reverbAmount: 0.1 });
                    setGameState("guessing");
                    setShowWheelDialog(false);
                    setShowLetterDialog(true);
                }
            }
        } catch (error: any) {
            console.error("Error spinning wheel:", error);
            toast.error("Error al girar la ruleta");
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
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GANAR, volume: 0.8, reverbAmount: 0.4 });
                    setTimeout(() => setGameState("won"), 3000);
                } else {
                    toast.error("¡Incorrecto!");
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_LETRA, volume: 0.6, reverbAmount: 0.2 });
                    await sleep(1500);
                    playSound({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_FRASE_VOCERA, volume: 0.5, });
                    setShowSolveInput(false);
                    setSolveGuess("");
                }
            }
        } catch (error: any) {
            console.error("Error solving puzzle:", error);
            toast.error("Error al resolver el panel");
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

            setShowLetterDialog(false);

            if (result.data) {
                setSession(result.data.session);

                if (result.data.puzzleSolved) {
                    setRewardAmount(result.data.coinsEarned);
                    setShowReward(true);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_GANAR, volume: 0.8, reverbAmount: 0.4 });
                    setTimeout(() => setGameState("won"), 3000);
                } else if (result.data.found) {
                    toast.success(`¡Letra "${letter}" encontrada!`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.6, reverbAmount: 0.1 });
                    setGameState("idle");
                } else {
                    toast.error(`La letra "${letter}" no está.`);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_LETRA, volume: 0.5, reverbAmount: 0.2 });
                    await sleep(1200);
                    playSoundWithReverb({ sound: STREAMER_WARS_SOUNDS.RULETA_LOCA_ERROR_LETRA_VOCERA, volume: 0.5, reverbAmount: 0.1 });
                    setGameState("idle");
                }
            }
        } catch (error: any) {
            console.error("Error guessing letter:", error);
            toast.error("Error al adivinar la letra");
            setGameState("idle");
        }
        setSelectedLetter(null);
    };

    const handleForfeit = async () => {
        if (!session || !confirm("¿Estás seguro de que quieres rendirte?")) return;
        try {
            await actions.games.ruletaLoca.forfeitGame({ sessionId: session.id });
            setGameState("lost");
        } catch (error: any) {
            console.error("Error forfeiting:", error);
        }
    };

    // --- Renderers ---

    const renderPhrasePanel = () => {
        if (!phrase || !session) return null;
        const words = phrase.phrase.split(" ");

        return (
            <div className="flex flex-wrap gap-6 justify-center items-center mb-8 p-6 bg-black/40 border-4 border-black rounded-xl backdrop-blur-sm">
                {words.map((word: string, wordIndex: number) => (
                    <div key={wordIndex} className="flex gap-2">
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
                                        w-10 h-14 md:w-14 md:h-20 flex items-center justify-center
                                        text-2xl md:text-4xl font-bold font-press-start-2p
                                        border-4 border-black
                                        transition-all duration-300
                                        ${isLetter
                                            ? isGuessed
                                                ? "bg-white text-black"
                                                : "bg-blue-800 text-transparent"
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
            <div className="relative flex items-center justify-center">
                {/* Borde exterior de la ruleta estilo 8-bit */}
                <div className="absolute rounded-full border-[12px] border-black w-[20rem] h-[20rem] md:w-[34rem] md:h-[34rem] z-0 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]"></div>

                <motion.div
                    className={`relative rounded-full border-8 border-yellow-500 overflow-hidden w-[18rem] h-[18rem] md:w-[32rem] md:h-[32rem] z-10`}
                    style={{
                        rotate: wheelRotation,
                        background: "conic-gradient(from 0deg, #ef4444 0deg 45deg, #3b82f6 45deg 90deg, #22c55e 90deg 135deg, #eab308 135deg 180deg, #a855f7 180deg 225deg, #ec4899 225deg 270deg, #64748b 270deg 315deg, #f97316 315deg 360deg)"
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 bg-yellow-400 rounded-full border-8 border-black z-10 flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                            <div className="w-8 h-8 bg-black rounded-full opacity-50"></div>
                        </div>
                    </div>
                    {WHEEL_SEGMENTS.map((segment, index) => {
                        const angle = (index * 45) + 22.5;
                        const radian = (angle * Math.PI) / 180;
                        const radius = 120;
                        const x = Math.cos(radian) * radius;
                        const y = Math.sin(radian) * radius;

                        return (
                            <div
                                key={index}
                                className="absolute text-white font-bold font-press-start-2p text-sm md:text-base drop-shadow-[2px_2px_0px_#000]"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'upright',
                                    transformOrigin: 'center',
                                }}
                            >
                                {segment.label}
                            </div>
                        );
                    })}
                </motion.div>

                {/* Puntero estilo 8-bit (Triángulo CSS con bordes duros) */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-20"
                    style={{
                        filter: "drop-shadow(4px 4px 0px rgba(0,0,0,0.8))"
                    }}
                >
                    <div className="w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-t-[50px] border-t-red-600 relative">
                        {/* Borde simulado del puntero */}
                        <div className="absolute -top-[54px] -left-[29px] w-0 h-0 border-l-[29px] border-l-transparent border-r-[29px] border-r-transparent border-t-[58px] border-t-black -z-10"></div>
                    </div>
                </div>
            </div>
        );
    };

    if (gameState === "loading") {
        return (
            <div className="flex items-center justify-center min-h-dvh bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-purple-900 to-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin w-16 h-16 border-8 border-yellow-400 border-t-transparent rounded-full"></div>
                    <div className="text-yellow-400 font-press-start-2p animate-pulse">CARGANDO...</div>
                </div>
            </div>
        );
    }

    return (
        <>
            {showInstructions && (
                <Instructions
                    customLayout
                    duration={12000} // Para que el usuario lo cierre manualmente
                    controls={[
                        { keys: ["Click Izq"], label: "Acciones" },
                    ]}
                >
                    <p className="font-mono max-w-2xl text-left mb-4">
                        ¡Bienvenido a <strong>Ruleta Loca</strong>! El objetivo es adivinar la frase oculta acumulando puntos.
                    </p>
                    <ul className="font-mono text-left list-disc list-inside space-y-2 mb-4">
                        <li>Gira la ruleta para obtener un valor en puntos.</li>
                        <li>Si caes en una cifra, podrás elegir una consonante.</li>
                        <li>Si la letra está en el panel, ganarás los puntos multiplicados por las veces que aparezca.</li>
                        <li>Cuidado con la <strong>BANCARROTA</strong> (pierdes todo) y <strong>PERDER TURNO</strong>.</li>
                    </ul>
                    <p className="font-mono max-w-2xl text-left">
                        Puedes intentar <strong>RESOLVER</strong> el panel en cualquier momento, pero si fallas perderás tu turno. ¡El que tenga más puntos al final gana las SaltoCoins!
                    </p>
                </Instructions>
            )}

            <div
                ref={gameContainerRef}
                className={`h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-purple-900 to-slate-900 text-white ${isFullscreen ? "p-4 overflow-y-auto" : "p-4"}`}
            >
                <div className="max-w-6xl mx-auto flex flex-col items-center min-h-full">
                    {/* Header */}
                    <div className="w-full flex flex-col md:flex-row items-center justify-between mb-8 pt-4 gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-4xl">🎡</span>
                            <h1 className="text-3xl md:text-5xl font-bold font-press-start-2p text-yellow-400 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                                RULETA LOCA
                            </h1>
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-press-start-2p text-xs py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                        >
                            {isFullscreen ? "SALIR PANTALLA" : "PANTALLA COMPLETA"}
                        </button>
                    </div>

                    {!session || !phrase ? (
                        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl">
                            <div className="bg-slate-800 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] text-center">
                                <p className="font-mono text-lg mb-8 leading-relaxed">
                                    Presiona el botón para comenzar una nueva partida y desafiar tu suerte.
                                </p>
                                <button
                                    onClick={startNewGame}
                                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-press-start-2p text-xl py-6 px-12 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                >
                                    INICIAR JUEGO
                                </button>
                            </div>
                        </div>
                    ) : gameState === "won" ? (
                        <div className="flex flex-col items-center justify-center flex-1 w-full animate-in zoom-in duration-300">
                            <div className="bg-green-600 border-4 border-black p-10 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,0.5)]">
                                <h2 className="font-press-start-2p text-4xl mb-6 text-yellow-300 drop-shadow-[4px_4px_0px_#000]">¡VICTORIA!</h2>
                                <p className="font-press-start-2p text-xl mb-4">PUNTOS: {session.currentScore}</p>
                                <div className="bg-black/30 p-4 mb-8 border-2 border-black/50">
                                    <p className="font-mono text-lg text-white/90">"{phrase.phrase}"</p>
                                </div>
                                <button
                                    onClick={startNewGame}
                                    className="bg-white hover:bg-gray-100 text-black font-press-start-2p py-4 px-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                >
                                    JUGAR OTRA VEZ
                                </button>
                            </div>
                        </div>
                    ) : gameState === "lost" ? (
                        <div className="flex flex-col items-center justify-center flex-1 w-full">
                            <div className="bg-red-600 border-4 border-black p-10 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,0.5)]">
                                <h2 className="font-press-start-2p text-3xl mb-6 text-white drop-shadow-[4px_4px_0px_#000]">GAME OVER</h2>
                                <p className="font-mono text-lg mb-8">La frase era: "{phrase.phrase}"</p>
                                <button
                                    onClick={startNewGame}
                                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-press-start-2p py-4 px-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                >
                                    REINTENTAR
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center">
                            {/* HUD */}
                            <div className="w-full mb-8">
                                <GameHUD
                                    score={session.currentScore}
                                    showCoins={false}
                                    additionalInfo={{
                                        label: "CATEGORÍA",
                                        value: phrase.category,
                                    }}
                                />
                            </div>

                            {/* Panel de Frase */}
                            {renderPhrasePanel()}

                            {/* Controles Principales */}
                            <div className="flex flex-col items-center gap-6 w-full">
                                <button
                                    onClick={() => setShowWheelDialog(true)}
                                    disabled={isSpinning || gameState === "guessing"}
                                    className={`
                                        font-press-start-2p text-xl py-6 px-12 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all
                                        ${isSpinning || gameState === "guessing"
                                            ? "bg-gray-500 text-gray-300 cursor-not-allowed shadow-none translate-y-1"
                                            : "bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black active:translate-y-1 active:shadow-none animate-pulse"
                                        }
                                    `}
                                >
                                    {isSpinning ? "GIRANDO..." : gameState === "guessing" ? "¡ELIGE LETRA!" : "ABRIR RULETA"}
                                </button>

                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={() => setShowSolveInput(true)}
                                        disabled={isSpinning || gameState !== "idle"}
                                        className="bg-green-500 hover:bg-green-400 disabled:bg-gray-600 disabled:text-gray-400 text-white font-press-start-2p text-sm py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                    >
                                        RESOLVER
                                    </button>
                                    <button
                                        onClick={handleForfeit}
                                        className="bg-red-500 hover:bg-red-400 text-white font-press-start-2p text-sm py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                    >
                                        RENDIRSE
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- MODALES --- */}

                {/* Modal Ruleta */}
                {showWheelDialog && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="flex flex-col items-center justify-center w-full h-full">
                            <h2 className="font-press-start-2p text-2xl md:text-3xl mb-8 text-yellow-400 drop-shadow-[4px_4px_0px_#000] text-center">
                                ¡GIRA LA RULETA!
                            </h2>
                            <div className="transform scale-75 md:scale-100 mb-8">
                                {renderWheel()}
                            </div>
                            {currentSegment && !isSpinning && (
                                <div className="font-press-start-2p text-2xl mb-6 text-white drop-shadow-[2px_2px_0px_#000]">
                                    {currentSegment.label}
                                </div>
                            )}
                            <button
                                onClick={handleSpinWheel}
                                disabled={isSpinning}
                                className={`
                                    font-press-start-2p text-2xl py-4 px-10 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all
                                    ${isSpinning
                                        ? "bg-gray-600 text-gray-400 cursor-not-allowed shadow-none translate-y-1"
                                        : "bg-red-500 hover:bg-red-400 text-white active:translate-y-1 active:shadow-none"
                                    }
                                `}
                            >
                                {isSpinning ? "..." : "¡GIRAR!"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Selección de Letra */}
                {showLetterDialog && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-blue-900 border-4 border-black p-6 md:p-8 max-w-4xl w-full shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative">
                            <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-black"></div>
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-black"></div>
                            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-black"></div>
                            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-black"></div>

                            <h2 className="font-press-start-2p text-xl md:text-2xl mb-8 text-center text-yellow-400 drop-shadow-[3px_3px_0px_#000]">
                                ELIGE UNA CONSONANTE
                            </h2>

                            <div className="grid grid-cols-7 gap-2 md:gap-4 justify-items-center">
                                {ALPHABET.map((letter) => {
                                    const isGuessed = session?.guessedLetters?.includes(letter);
                                    return (
                                        <button
                                            key={letter}
                                            onClick={() => handleGuessLetter(letter)}
                                            disabled={isGuessed}
                                            className={`
                                                w-10 h-10 md:w-16 md:h-16 flex items-center justify-center
                                                text-lg md:text-2xl font-bold font-press-start-2p
                                                border-4 border-black
                                                transition-all duration-100
                                                ${isGuessed
                                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                                                    : "bg-white hover:bg-yellow-300 text-black hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                                                }
                                            `}
                                        >
                                            {letter}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Resolver */}
                {showSolveInput && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-purple-900 border-4 border-black p-6 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <h2 className="font-press-start-2p text-xl mb-4 text-center text-white">RESOLVER PANEL</h2>
                            <p className="font-mono text-sm mb-6 text-center text-gray-300">
                                Escribe la frase exacta. Si fallas, pierdes el turno.
                            </p>
                            <input
                                type="text"
                                value={solveGuess}
                                onInput={(e) => setSolveGuess((e.target as HTMLInputElement).value)}
                                className="w-full bg-black border-4 border-white text-yellow-400 font-press-start-2p text-center p-4 mb-6 uppercase outline-none focus:border-yellow-400"
                                placeholder="FRASE..."
                                autoFocus
                            />
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => setShowSolveInput(false)}
                                    className="bg-gray-600 hover:bg-gray-500 text-white font-press-start-2p text-xs py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleSolvePuzzle}
                                    disabled={!solveGuess.trim()}
                                    className="bg-green-500 hover:bg-green-400 disabled:bg-gray-700 text-white font-press-start-2p text-xs py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                                >
                                    RESOLVER
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
        </>
    );
};