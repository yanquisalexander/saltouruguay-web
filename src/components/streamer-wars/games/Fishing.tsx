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
    playerBarDecayRate: number;     // How fast the player bar decreases per second
    fishTimerDuration: number;      // How many seconds until the fish arrives
    keyChangeInterval: number;      // How often keys change (ms)
    numberOfKeys: number;           // Number of keys (2 or 3)
    progressPerCorrectKey: number;  // How much progress per frame when all keys are held
}

// ============= CONSTANTS =============

const INITIAL_DIFFICULTY: DifficultyConfig = {
    playerBarDecayRate: 2,          // 2% per second decay
    fishTimerDuration: 15,          // 15 seconds
    keyChangeInterval: 4000,        // 4 seconds between key changes
    numberOfKeys: 2,                // Start with 2 keys
    progressPerCorrectKey: 0.8,     // 0.8% progress per frame (at 60fps = ~48% per second when correct)
};

const DIFFICULTY_SCALING = {
    playerBarDecayRateIncrease: 0.5,    // +0.5% per round
    fishTimerDecrease: 1,               // -1 second per round (min 5)
    keyChangeIntervalDecrease: 200,     // -200ms per round (min 1500)
    progressPerKeyDecrease: 0.05,       // -0.05 per round
};

const MIN_FISH_TIMER = 5;
const MIN_KEY_CHANGE_INTERVAL = 1500;
const ROUND_TRANSITION_DELAY = 2000;

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
        numberOfKeys: roundsCompleted >= 3 ? 3 : 2,  // 3 keys starting round 4
        progressPerCorrectKey: Math.max(
            0.3,
            INITIAL_DIFFICULTY.progressPerCorrectKey - (roundsCompleted * DIFFICULTY_SCALING.progressPerKeyDecrease)
        ),
    };
};

// ============= COMPONENT =============

export const Fishing = ({ session, pusher, players }: FishingProps) => {
    // Game state
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'round-complete' | 'eliminated' | 'ended'>('waiting');
    const [currentRound, setCurrentRound] = useState(1);
    const [playerProgress, setPlayerProgress] = useState(0);
    const [fishProgress, setFishProgress] = useState(0);
    const [activeKeys, setActiveKeys] = useState<string[]>([]);
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
    const [difficulty, setDifficulty] = useState<DifficultyConfig>(INITIAL_DIFFICULTY);
    const [showWarning, setShowWarning] = useState(false);

    // Refs for game loop
    const gameLoopRef = useRef<number | null>(null);
    const keyChangeTimeoutRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const isPlayingRef = useRef(false);

    const playerNumber = session.user.streamerWarsPlayerNumber;

    // ============= KEY HANDLING =============

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const key = e.key.toUpperCase();
        if (FISHING_VALID_KEYS.includes(key)) {
            e.preventDefault();
            setPressedKeys(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
        }
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const key = e.key.toUpperCase();
        if (FISHING_VALID_KEYS.includes(key)) {
            e.preventDefault();
            setPressedKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, []);

    // Add/remove key listeners
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
                setActiveKeys(getRandomKeys(difficulty.numberOfKeys));
                scheduleKeyChange();
            }
        }, difficulty.keyChangeInterval);
    }, [difficulty.keyChangeInterval, difficulty.numberOfKeys]);

    // ============= GAME LOOP =============

    const startRound = useCallback(() => {
        const roundDifficulty = getDifficultyForRound(currentRound);
        setDifficulty(roundDifficulty);
        setPlayerProgress(0);
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
        
        if (keyChangeTimeoutRef.current) {
            clearTimeout(keyChangeTimeoutRef.current);
        }
        if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current);
        }

        playSound({ sound: STREAMER_WARS_SOUNDS.FISHING_ELIMINATED, volume: 0.8 });
        toast.error("¡El pez escapó! Has sido eliminado.", { position: "bottom-center", duration: 5000 });

        // Notify backend
        try {
            await actions.games.fishing.recordElimination();
        } catch (error) {
            console.error("Error recording elimination:", error);
        }
    }, []);

    const handleRoundComplete = useCallback(() => {
        isPlayingRef.current = false;
        setGameStatus('round-complete');
        
        if (keyChangeTimeoutRef.current) {
            clearTimeout(keyChangeTimeoutRef.current);
        }

        playSound({ sound: STREAMER_WARS_SOUNDS.FISHING_ROUND_COMPLETE, volume: 0.7 });
        toast.success(`¡Ronda ${currentRound} completada!`, { position: "bottom-center" });

        // Start next round after delay
        setTimeout(() => {
            setCurrentRound(prev => prev + 1);
        }, ROUND_TRANSITION_DELAY);
    }, [currentRound]);

    // Main game loop
    useEffect(() => {
        if (gameStatus !== 'playing') return;

        const gameLoop = (currentTime: number) => {
            if (!isPlayingRef.current) return;

            const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
            lastFrameTimeRef.current = currentTime;

            // Check if all active keys are being pressed
            const allKeysPressed = activeKeys.length > 0 && 
                activeKeys.every(key => pressedKeys.has(key));
            const anyWrongKeyPressed = Array.from(pressedKeys).some(
                key => !activeKeys.includes(key)
            );

            // Update player progress
            setPlayerProgress(prev => {
                let newProgress = prev;
                
                if (allKeysPressed && !anyWrongKeyPressed) {
                    // Progress increases when correct keys are held
                    newProgress += difficulty.progressPerCorrectKey;
                } else {
                    // Progress decreases over time
                    newProgress -= difficulty.playerBarDecayRate * deltaTime;
                }
                
                return Math.max(0, Math.min(100, newProgress));
            });

            // Update fish timer progress
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
    }, [gameStatus, activeKeys, pressedKeys, difficulty]);

    // Check win/lose conditions
    useEffect(() => {
        if (gameStatus !== 'playing') return;

        // Player completed the bar
        if (playerProgress >= 100) {
            handleRoundComplete();
            return;
        }

        // Fish arrived (timer ran out) and player hasn't completed
        if (fishProgress >= 100 && playerProgress < 100) {
            handleElimination();
            return;
        }

        // Warning when fish is close
        if (fishProgress >= 80 && !showWarning) {
            setShowWarning(true);
            playSound({ sound: STREAMER_WARS_SOUNDS.FISHING_WARNING, volume: 0.5 });
        }
    }, [playerProgress, fishProgress, gameStatus, showWarning, handleRoundComplete, handleElimination]);

    // Start next round when round number changes
    useEffect(() => {
        if (currentRound > 1 && gameStatus === 'round-complete') {
            setTimeout(() => {
                startRound();
            }, ROUND_TRANSITION_DELAY / 4); // Short delay before starting next round
        }
    }, [currentRound, gameStatus, startRound]);

    // ============= PUSHER EVENTS =============

    useEffect(() => {
        const channel = pusher?.subscribe("streamer-wars");

        channel?.bind("fishing:game-started", () => {
            setGameStatus('waiting');
            setCurrentRound(1);
            setPlayerProgress(0);
            setFishProgress(0);
            toast.success("¡El juego de pesca ha comenzado!", { position: "bottom-center" });
            
            // Start first round after instructions
            const onInstructionsEnded = () => {
                startRound();
            };
            document.addEventListener("instructions-ended", onInstructionsEnded, { once: true });
        });

        channel?.bind("fishing:game-ended", () => {
            isPlayingRef.current = false;
            setGameStatus('ended');
            if (keyChangeTimeoutRef.current) {
                clearTimeout(keyChangeTimeoutRef.current);
            }
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
            toast.info("El juego ha terminado", { position: "bottom-center" });
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

    // Load initial state callback
    const loadInitialState = useCallback(async () => {
        const { error, data } = await actions.games.fishing.getGameState();
        if (!error && data?.gameState) {
            if (data.gameState.status === 'active') {
                // Check if player is already eliminated
                const elimResult = await actions.games.fishing.isEliminated();
                if (elimResult.data?.eliminated) {
                    setGameStatus('eliminated');
                }
            }
        }
    }, []);

    // Load initial state on instructions end
    useEffect(() => {
        document.addEventListener("instructions-ended", loadInitialState, { once: true });
        return () => {
            document.removeEventListener("instructions-ended", loadInitialState);
        };
    }, [loadInitialState]);

    // ============= RENDER HELPERS =============

    const getKeyClass = (key: string) => {
        const isActive = activeKeys.includes(key);
        const isPressed = pressedKeys.has(key);
        const isCorrect = isActive && isPressed;
        const isWrong = !isActive && isPressed;

        if (isWrong) return 'bg-red-600 border-red-400 text-white animate-pulse';
        if (isCorrect) return 'bg-green-500 border-green-300 text-white shadow-[0_0_20px_rgba(34,197,94,0.8)]';
        if (isActive) return 'bg-blue-600 border-blue-400 text-white animate-bounce';
        return 'bg-gray-700 border-gray-500 text-gray-400';
    };

    const renderKeyBox = (key: string, index: number) => (
        <div
            key={`${key}-${index}`}
            className={`
                w-16 h-16 md:w-20 md:h-20
                flex items-center justify-center
                text-2xl md:text-3xl font-bold font-press-start-2p
                border-4 rounded-lg
                transition-all duration-150
                ${getKeyClass(key)}
            `}
        >
            {key}
        </div>
    );

    // ============= MAIN RENDER =============

    return (
        <>
            <Instructions 
                duration={10000}
                customTitle="¡Vamos a Pescar!"
                controls={[
                    {
                        keys: ["KEYBOARD"],
                        label: "Mantén presionadas las teclas que aparecen en pantalla"
                    }
                ]}
            >
                <p class="font-mono max-w-2xl text-left">
                    En este juego deberás llenar tu barra de progreso antes de que el pez llegue.
                    <br /><br />
                    Para hacerlo, mantén presionadas <strong>TODAS</strong> las teclas que aparecen en pantalla al mismo tiempo.
                    Tu barra crecerá mientras las mantengas presionadas correctamente.
                </p>
                <br />
                <p class="font-mono max-w-2xl text-left">
                    <strong>¡Cuidado!</strong> Si sueltas las teclas o presionas teclas incorrectas, tu barra bajará.
                    Las teclas cambiarán durante el juego, ¡así que mantente atento!
                </p>
                <br />
                <p class="font-mono max-w-2xl text-left">
                    Cada ronda será más difícil: la barra bajará más rápido, el pez llegará más pronto,
                    y eventualmente aparecerán más teclas para presionar.
                </p>
            </Instructions>

            <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-blue-900 via-blue-800 to-cyan-900 text-white p-4 relative overflow-hidden">
                
                {/* Water effect background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0idHJhbnNwYXJlbnQiPjwvcmVjdD4KPHBhdGggZD0iTTAgMzBjMTAtMTAgMjAtMTAgMzAgMHMzMCAxMCAzMCAwIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuMyI+PC9wYXRoPgo8L3N2Zz4=')] animate-pulse" />
                </div>

                {/* Header: Round & Status */}
                <div className="absolute top-4 left-4 z-10">
                    <div className="bg-black/60 px-4 py-2 rounded-lg border-2 border-cyan-500/50">
                        <span className="text-xs font-mono text-cyan-300">RONDA</span>
                        <p className="text-2xl font-bold font-press-start-2p text-white">{currentRound}</p>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-4xl font-bold mb-6 font-squids text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] z-10">
                    🐟 Vamos a Pescar 🐟
                </h2>

                {/* Fish Timer Bar (Top) */}
                <div className="w-full max-w-2xl mb-8 z-10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono text-orange-300">🐟 El pez está llegando...</span>
                        <span className="text-sm font-mono text-orange-300">{Math.ceil((100 - fishProgress) / (100 / difficulty.fishTimerDuration))}s</span>
                    </div>
                    <div className={`h-6 bg-gray-800 rounded-full overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${showWarning ? 'animate-pulse' : ''}`}>
                        <div 
                            className={`h-full transition-all duration-100 ${
                                fishProgress >= 80 
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' 
                                    : fishProgress >= 50 
                                        ? 'bg-gradient-to-r from-orange-500 to-orange-600' 
                                        : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                            }`}
                            style={{ width: `${fishProgress}%` }}
                        />
                    </div>
                    {showWarning && (
                        <p className="text-center text-red-400 font-press-start-2p text-xs mt-2 animate-bounce">
                            ¡El pez está por llegar!
                        </p>
                    )}
                </div>

                {/* Game Status Messages */}
                {gameStatus === 'waiting' && (
                    <div className="flex flex-col items-center justify-center z-10">
                        <div className="text-6xl mb-4 animate-bounce">🎣</div>
                        <p className="text-xl font-press-start-2p text-cyan-300 animate-pulse">
                            Esperando...
                        </p>
                    </div>
                )}

                {gameStatus === 'eliminated' && (
                    <div className="flex flex-col items-center justify-center bg-red-900/80 rounded-xl p-8 border-4 border-red-500 z-10">
                        <div className="text-6xl mb-4">💀</div>
                        <p className="text-2xl font-press-start-2p text-red-400 mb-2">
                            ¡ELIMINADO!
                        </p>
                        <p className="text-sm font-mono text-red-300">
                            El pez escapó...
                        </p>
                    </div>
                )}

                {gameStatus === 'ended' && (
                    <div className="flex flex-col items-center justify-center bg-green-900/80 rounded-xl p-8 border-4 border-green-500 z-10">
                        <div className="text-6xl mb-4">🏆</div>
                        <p className="text-2xl font-press-start-2p text-green-400 mb-2">
                            ¡Juego Terminado!
                        </p>
                        <p className="text-sm font-mono text-green-300">
                            Rondas completadas: {currentRound - 1}
                        </p>
                    </div>
                )}

                {gameStatus === 'round-complete' && (
                    <div className="flex flex-col items-center justify-center bg-green-900/80 rounded-xl p-8 border-4 border-green-500 z-10 animate-bounce">
                        <div className="text-6xl mb-4">🎉</div>
                        <p className="text-xl font-press-start-2p text-green-400">
                            ¡Ronda Completada!
                        </p>
                        <p className="text-sm font-mono text-green-300 mt-2">
                            Preparando siguiente ronda...
                        </p>
                    </div>
                )}

                {/* Active Keys Display */}
                {(gameStatus === 'playing' || gameStatus === 'round-complete') && (
                    <div className="flex gap-4 mb-8 z-10">
                        {activeKeys.map((key, idx) => renderKeyBox(key, idx))}
                    </div>
                )}

                {/* Player Progress Bar (Bottom) */}
                {(gameStatus === 'playing' || gameStatus === 'round-complete') && (
                    <div className="w-full max-w-2xl z-10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-mono text-cyan-300">Tu Progreso</span>
                            <span className="text-sm font-mono text-cyan-300">{Math.floor(playerProgress)}%</span>
                        </div>
                        <div className="h-10 bg-gray-800 rounded-full overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                            {/* Progress fill */}
                            <div 
                                className={`h-full transition-all duration-75 ${
                                    playerProgress >= 80 
                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                        : playerProgress >= 50 
                                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500' 
                                            : 'bg-gradient-to-r from-blue-500 to-cyan-600'
                                }`}
                                style={{ width: `${playerProgress}%` }}
                            />
                            {/* Small fish indicator */}
                            <div 
                                className="absolute top-1/2 -translate-y-1/2 text-2xl transition-all duration-75"
                                style={{ left: `calc(${Math.min(playerProgress, 95)}% - 10px)` }}
                            >
                                🐠
                            </div>
                        </div>
                    </div>
                )}

                {/* Difficulty indicator */}
                {gameStatus === 'playing' && (
                    <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-2 rounded-lg border border-gray-600 z-10">
                        <span className="text-xs font-mono text-gray-400">
                            Dificultad: {'⬆️'.repeat(Math.min(currentRound, 5))}
                        </span>
                    </div>
                )}

                {/* Currently pressed keys debug (optional, can be removed) */}
                {gameStatus === 'playing' && pressedKeys.size > 0 && (
                    <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-2 rounded-lg border border-gray-600 z-10">
                        <span className="text-xs font-mono text-gray-400">
                            Presionando: {Array.from(pressedKeys).join(', ')}
                        </span>
                    </div>
                )}
            </div>
        </>
    );
};
