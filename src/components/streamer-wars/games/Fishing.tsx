import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { FISHING_VALID_KEYS } from "@/utils/streamer-wars/constants";

// ============= TYPES =============

interface FishingProps {
    session: Session;
    pusher: Pusher;
    players: { id: number; name: string; avatar: string; playerNumber: number }[];
}

interface DifficultyConfig {
    playerBarDecayRate: number;     // Cuánto baja la barra por segundo (la fuerza del pez)
    fishTimerDuration: number;      // Tiempo límite
    keyChangeInterval: number;      // Cada cuánto cambian las teclas
    numberOfKeys: number;           // Cuántas teclas hay que spamear
    progressPerTap: number;         // CAMBIO: Cuánto sube por cada pulsación individual
}

// ============= CONSTANTS =============

const INITIAL_DIFFICULTY: DifficultyConfig = {
    playerBarDecayRate: 15,         // AUMENTADO: El pez tira más fuerte (15% por seg)
    fishTimerDuration: 15,
    keyChangeInterval: 4000,
    numberOfKeys: 2,
    progressPerTap: 4,              // NUEVO: 4% de progreso por cada pulsación correcta
};

const DIFFICULTY_SCALING = {
    playerBarDecayRateIncrease: 2,      // +2% fuerza del pez por ronda
    fishTimerDecrease: 1,
    keyChangeIntervalDecrease: 200,
    progressPerTapDecrease: 0.2,        // -0.2% ganancia por tap por ronda (necesitas tapear más rápido)
};

const MIN_FISH_TIMER = 5;
const MIN_KEY_CHANGE_INTERVAL = 1500;
const ROUND_TRANSITION_DELAY = 2000;
const WRONG_KEY_PENALTY = 5; // Castigo de 5% por pulsar tecla incorrecta

// ============= HELPER FUNCTIONS =============

const getRandomKeys = (count: number): string[] => {
    const keys: string[] = [];
    const available = [...FISHING_VALID_KEYS];

    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * available.length);
        keys.push(available[idx]);
        available.splice(idx, 1);
    }

    return keys;
};

const getDifficultyForRound = (round: number): DifficultyConfig => {
    const roundsCompleted = round - 1;

    return {
        playerBarDecayRate: INITIAL_DIFFICULTY.playerBarDecayRate +
            (roundsCompleted * DIFFICULTY_SCALING.playerBarDecayRateIncrease),
        fishTimerDuration: Math.max(
            MIN_FISH_TIMER,
            INITIAL_DIFFICULTY.fishTimerDuration - (roundsCompleted * DIFFICULTY_SCALING.fishTimerDecrease)
        ),
        keyChangeInterval: Math.max(
            MIN_KEY_CHANGE_INTERVAL,
            INITIAL_DIFFICULTY.keyChangeInterval - (roundsCompleted * DIFFICULTY_SCALING.keyChangeIntervalDecrease)
        ),
        numberOfKeys: roundsCompleted >= 3 ? 3 : 2,
        progressPerTap: Math.max(
            1.5, // Mínimo 1.5% por tap
            INITIAL_DIFFICULTY.progressPerTap - (roundsCompleted * DIFFICULTY_SCALING.progressPerTapDecrease)
        ),
    };
};

// ============= COMPONENT =============

export const Fishing = ({ session, pusher, players }: FishingProps) => {
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'round-complete' | 'eliminated' | 'ended'>('waiting');
    const [currentRound, setCurrentRound] = useState(1);
    const [playerProgress, setPlayerProgress] = useState(0);
    const [fishProgress, setFishProgress] = useState(0);
    const [activeKeys, setActiveKeys] = useState<string[]>([]);
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set()); // Solo para visuales
    const [difficulty, setDifficulty] = useState<DifficultyConfig>(INITIAL_DIFFICULTY);
    const [showWarning, setShowWarning] = useState(false);

    const gameLoopRef = useRef<number | null>(null);
    const keyChangeTimeoutRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const isPlayingRef = useRef(false);

    // ============= KEY HANDLING (SPAM LOGIC) =============

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignorar si el juego no está activo o si es un evento de repetición (mantener presionado)
        if (!isPlayingRef.current || e.repeat) return;

        const key = e.key.toUpperCase();

        if (FISHING_VALID_KEYS.includes(key)) {
            e.preventDefault();

            // Visual feedback
            setPressedKeys(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });

            // Lógica de juego: ¿Es la tecla correcta?
            // Si activeKeys incluye la tecla pulsada, damos progreso.
            if (activeKeys.includes(key)) {
                setPlayerProgress(prev => Math.min(100, prev + difficulty.progressPerTap));
                // Opcional: Sonido sutil de tap exitoso podría ir aquí
            } else {
                // Penalización por pulsar teclas incorrectas (spamear a lo loco)
                setPlayerProgress(prev => Math.max(0, prev - WRONG_KEY_PENALTY));
            }
        }
    }, [activeKeys, difficulty.progressPerTap]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const key = e.key.toUpperCase();
        if (FISHING_VALID_KEYS.includes(key)) {
            e.preventDefault();
            // Solo actualizamos visuales al soltar
            setPressedKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, []);

    useEffect(() => {
        if (gameStatus === 'playing') {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
            };
        }
    }, [gameStatus, handleKeyDown, handleKeyUp]);

    // ============= KEY CHANGE LOGIC =============

    const scheduleKeyChange = useCallback(() => {
        if (keyChangeTimeoutRef.current) {
            clearTimeout(keyChangeTimeoutRef.current);
        }

        keyChangeTimeoutRef.current = window.setTimeout(() => {
            if (isPlayingRef.current) {
                // Limpiar teclas presionadas visualmente para evitar confusión
                setPressedKeys(new Set());
                setActiveKeys(getRandomKeys(difficulty.numberOfKeys));
                scheduleKeyChange();
            }
        }, difficulty.keyChangeInterval);
    }, [difficulty.keyChangeInterval, difficulty.numberOfKeys]);

    // ============= GAME LOOP (ONLY DECAY & TIMER) =============

    const startRound = useCallback(() => {
        const roundDifficulty = getDifficultyForRound(currentRound);
        setDifficulty(roundDifficulty);
        setPlayerProgress(30); // Empezamos con un poco de barra para dar tiempo de reacción
        setFishProgress(0);
        setActiveKeys(getRandomKeys(roundDifficulty.numberOfKeys));
        setPressedKeys(new Set());
        setShowWarning(false);
        setGameStatus('playing');
        isPlayingRef.current = true;
        lastFrameTimeRef.current = performance.now();
        scheduleKeyChange();
    }, [currentRound, scheduleKeyChange]);

    const handleElimination = useCallback(async () => {
        isPlayingRef.current = false;
        setGameStatus('eliminated');

        if (keyChangeTimeoutRef.current) clearTimeout(keyChangeTimeoutRef.current);
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

        playSound({ sound: STREAMER_WARS_SOUNDS.FISHING_ELIMINATED, volume: 0.8 });
        toast.error("¡El pez te arrastró! Has sido eliminado.", { position: "bottom-center", duration: 5000 });

        try {
            await actions.games.fishing.recordElimination();
        } catch (error) {
            console.error("Error recording elimination:", error);
        }
    }, []);

    const handleRoundComplete = useCallback(() => {
        isPlayingRef.current = false;
        setGameStatus('round-complete');

        if (keyChangeTimeoutRef.current) clearTimeout(keyChangeTimeoutRef.current);

        playSound({ sound: STREAMER_WARS_SOUNDS.FISHING_ROUND_COMPLETE, volume: 0.7 });
        toast.success(`¡Pescado capturado! Ronda ${currentRound} completada.`, { position: "bottom-center" });

        setTimeout(() => {
            setCurrentRound(prev => prev + 1);
        }, ROUND_TRANSITION_DELAY);
    }, [currentRound]);

    useEffect(() => {
        if (gameStatus !== 'playing') return;

        const gameLoop = (currentTime: number) => {
            if (!isPlayingRef.current) return;

            const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
            lastFrameTimeRef.current = currentTime;

            // 1. Decaimiento constante (La fuerza del pez)
            // Ya no verificamos teclas aquí, el progreso se gana en handleKeyDown
            setPlayerProgress(prev => {
                const decay = difficulty.playerBarDecayRate * deltaTime;
                return Math.max(0, prev - decay);
            });

            // 2. Timer del pez (Game Over timer)
            setFishProgress(prev => {
                const increment = (100 / difficulty.fishTimerDuration) * deltaTime;
                return Math.min(100, prev + increment);
            });

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [gameStatus, difficulty]);

    // Check win/lose conditions
    useEffect(() => {
        if (gameStatus !== 'playing') return;

        if (playerProgress >= 100) {
            handleRoundComplete();
            return;
        }

        // Si la barra llega a 0, ¿pierdes inmediatamente o solo pierdes si se acaba el tiempo?
        // En este estilo de juego, llegar a 0 suele ser solo un revés, la derrota es el tiempo.
        // Pero si quieres que perder la barra sea eliminación, descomenta esto:
        /*
        if (playerProgress <= 0) {
             // Opcional: Game Over por perder la caña
        }
        */

        if (fishProgress >= 100 && playerProgress < 100) {
            handleElimination();
            return;
        }

        if (fishProgress >= 80 && !showWarning) {
            setShowWarning(true);
            playSound({ sound: STREAMER_WARS_SOUNDS.FISHING_WARNING, volume: 0.5 });
        }
    }, [playerProgress, fishProgress, gameStatus, showWarning, handleRoundComplete, handleElimination]);

    // Start next round logic
    useEffect(() => {
        if (currentRound > 1 && gameStatus === 'round-complete') {
            setTimeout(() => {
                startRound();
            }, ROUND_TRANSITION_DELAY / 4);
        }
    }, [currentRound, gameStatus, startRound]);

    // ============= PUSHER EVENTS =============
    // ... (El código de Pusher se mantiene igual, lo omito para brevedad, es idéntico al anterior) ...
    useEffect(() => {
        const channel = pusher?.subscribe("streamer-wars");
        channel?.bind("fishing:game-started", () => {
            setGameStatus('waiting');
            setCurrentRound(1);
            setPlayerProgress(0);
            setFishProgress(0);
            startRound();
        });
        channel?.bind("fishing:game-ended", () => {
            isPlayingRef.current = false;
            setGameStatus('ended');
            if (keyChangeTimeoutRef.current) clearTimeout(keyChangeTimeoutRef.current);
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        });
        channel?.bind("fishing:game-reset", () => {
            isPlayingRef.current = false;
            setGameStatus('waiting');
            setCurrentRound(1);
            setPlayerProgress(0);
            setFishProgress(0);
            setPressedKeys(new Set());
            setActiveKeys([]);
        });
        return () => {
            channel?.unbind("fishing:game-started");
            channel?.unbind("fishing:game-ended");
            channel?.unbind("fishing:game-reset");
        };
    }, [pusher, startRound]);


    // ============= RENDER HELPERS =============

    const getKeyClass = (key: string) => {
        const isActive = activeKeys.includes(key);
        const isPressed = pressedKeys.has(key);
        // Visualmente: 
        // Azul = Tecla objetivo
        // Verde = Tecla objetivo siendo presionada
        // Rojo = Tecla incorrecta presionada

        if (!isActive && isPressed) return 'bg-red-600 border-red-400 text-white animate-pulse transform scale-95';
        if (isActive && isPressed) return 'bg-green-500 border-green-300 text-white transform scale-95 shadow-[0_0_15px_rgba(34,197,94,0.8)]';
        if (isActive) return 'bg-blue-600 border-blue-400 text-white animate-bounce';

        return 'bg-gray-700 border-gray-500 text-gray-400 opacity-50';
    };

    const renderKeyBox = (key: string, index: number) => (
        <div
            key={`${key}-${index}`}
            className={`
                w-16 h-16 md:w-20 md:h-20
                flex items-center justify-center
                text-2xl md:text-3xl font-bold font-press-start-2p
                border-b-8 border-r-8 border-t-2 border-l-2 rounded-xl
                active:border-b-2 active:border-r-2 active:translate-y-1 active:translate-x-1
                transition-all duration-75
                ${getKeyClass(key)}
            `}
        >
            {key}
        </div>
    );

    return (
        <>
            <Instructions
                duration={10000}
                customTitle="¡A Pescar!"
                controls={[
                    {
                        keys: ["KEYBOARD"],
                        label: "SPAMEA las teclas que ves en pantalla"
                    }
                ]}
            >
                <p class="font-mono max-w-2xl text-left">
                    ¡El pez está tirando fuerte! Tu barra de progreso bajará constantemente.
                    <br /><br />
                    Debes <strong>PULSAR REPETIDAMENTE</strong> (Spamear) las teclas que aparecen en azul.
                    <br />
                    ¡No las mantengas presionadas, no funcionará! Tienes que machacar el teclado.
                </p>
                <br />
                <p class="font-mono max-w-2xl text-left">
                    <strong>¡Cuidado!</strong> Si pulsas la tecla equivocada, perderás progreso.
                </p>
            </Instructions>

            <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-blue-900 via-blue-800 to-cyan-900 text-white p-4 relative overflow-hidden">

                {/* Visual Background Effects */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0idHJhbnNwYXJlbnQiPjwvcmVjdD4KPHBhdGggZD0iTTAgMzBjMTAtMTAgMjAtMTAgMzAgMHMzMCAxMCAzMCAwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuMyI+PC9wYXRoPgo8L3N2Zz4=')] animate-pulse" />
                </div>

                {/* --- Header UI --- */}
                <div className="absolute top-4 left-4 z-10">
                    <div className="bg-black/60 px-4 py-2 rounded-lg border-2 border-cyan-500/50">
                        <span className="text-xs font-mono text-cyan-300">RONDA</span>
                        <p className="text-2xl font-bold font-press-start-2p text-white">{currentRound}</p>
                    </div>
                </div>

                <h2 className="text-2xl md:text-4xl font-bold mb-6 font-squids text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] z-10">
                    🐟 Vamos a pescar 🐟
                </h2>

                {/* --- Fish Timer (Opponent) --- */}
                <div className="w-full max-w-2xl mb-8 z-10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono text-orange-300">🐟 El pez está llegando...</span>

                        <span className="text-sm font-mono text-orange-300">{Math.ceil((100 - fishProgress) / (100 / difficulty.fishTimerDuration))}s</span>

                    </div>
                    <div className={`h-6 bg-gray-800 rounded-full overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${showWarning ? 'animate-pulse' : ''}`}>
                        <div
                            className={`h-full transition-all duration-100 ${fishProgress >= 80 ? 'bg-red-600' : 'bg-orange-500'}`}
                            style={{ width: `${fishProgress}%` }}
                        />
                    </div>
                </div>

                {/* --- Game Status Visuals --- */}
                {gameStatus === 'playing' && (
                    <div className="text-center mb-4 z-10 animate-pulse">
                        <p className="text-yellow-300 font-press-start-2p text-sm">
                            ¡PULSA RÁPIDO!
                        </p>
                    </div>
                )}

                {/* --- Keys Display --- */}
                {(gameStatus === 'playing' || gameStatus === 'round-complete') && (
                    <div className="flex gap-6 mb-8 z-10">
                        {activeKeys.map((key, idx) => renderKeyBox(key, idx))}
                    </div>
                )}

                {/* --- Player Progress Bar --- */}
                {(gameStatus === 'playing' || gameStatus === 'round-complete') && (
                    <div className="w-full max-w-2xl z-10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-mono text-cyan-300">Tu Captura</span>
                            <span className="text-sm font-mono text-cyan-300">{Math.floor(playerProgress)}%</span>
                        </div>
                        <div className="h-12 bg-gray-800 rounded-full overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                            <div
                                className={`h-full transition-all duration-75 ${playerProgress >= 80 ? 'bg-green-500' :
                                    playerProgress >= 40 ? 'bg-blue-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${playerProgress}%` }}
                            />
                            {/* Fish Icon traveling */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 text-3xl transition-all duration-75 filter drop-shadow-lg"
                                style={{ left: `calc(${Math.min(playerProgress, 94)}% + 5px)` }}
                            >
                                🐟
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Over / Win Screens (Simplificado visualmente para no repetir código largo) */}
                {gameStatus === 'eliminated' && <div className="z-10 text-red-500 font-bold text-2xl font-press-start-2p">ELIMINADO</div>}

            </div >
        </>
    );
};