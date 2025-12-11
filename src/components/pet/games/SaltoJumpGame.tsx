import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { LucideTrophy, LucideX, LucidePlay, LucideArrowUp } from 'lucide-preact';
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import PetSprite from '../PetSprite';

interface SaltoJumpGameProps {
    onComplete: (score: number) => void;
    onClose: () => void;
    appearance: {
        color: string;
        skinId: string | null;
        hatId: string | null;
        accessoryId: string | null;
        eyesId: string | null;
        mouthId: string | null;
    };
}

interface Obstacle {
    id: number;
    x: number; // Percentage 0-100
    type: 'rock' | 'puddle';
    width: number;
    height: number;
}

interface Coin {
    id: number;
    x: number;
    y: number;
    collected: boolean;
}

export default function SaltoJumpGame({ onComplete, onClose, appearance }: SaltoJumpGameProps) {
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);

    // Physics state
    const [playerY, setPlayerY] = useState(0); // 0 is ground, positive is up
    const [isJumping, setIsJumping] = useState(false);
    const velocityY = useRef(0);
    const gravity = 0.6;
    const jumpForce = 12;

    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [coins, setCoins] = useState<Coin[]>([]);

    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();
    const spawnTimerRef = useRef<number>(0);
    const scoreTimerRef = useRef<number>(0);
    const gameSpeedRef = useRef<number>(0.8); // Increases over time

    // Ref for physics position to avoid stale closures and dependency loops
    const playerYRef = useRef(0);

    // Game Loop
    const animate = (time: number) => {
        if (gameState !== 'playing') return;

        if (lastTimeRef.current !== undefined) {
            // const deltaTime = time - lastTimeRef.current; // Use for smoother movement if needed

            // 1. Physics (Gravity & Jumping)
            let newY = playerYRef.current + velocityY.current;

            if (newY > 0) {
                // In air
                velocityY.current -= gravity;
            } else {
                // On ground
                newY = 0;
                velocityY.current = 0;
                setIsJumping(false);
            }
            playerYRef.current = newY;
            setPlayerY(newY);

            // 2. Spawning Obstacles & Coins
            spawnTimerRef.current += 1;
            if (spawnTimerRef.current > 100 / gameSpeedRef.current) { // Spawn rate depends on speed
                if (Math.random() > 0.3) {
                    spawnObstacle();
                } else {
                    spawnCoin();
                }
                spawnTimerRef.current = 0;

                // Increase speed slightly
                if (gameSpeedRef.current < 2.5) {
                    gameSpeedRef.current += 0.01;
                }
            }

            // 3. Update Obstacles
            setObstacles(prev => {
                const newObstacles: Obstacle[] = [];
                const playerRect = {
                    left: 10, // Player is at 10-20% width
                    right: 20,
                    bottom: 10, // Ground level
                    top: 10 + (newY * 2) // Height depends on jump
                };

                let collision = false;

                prev.forEach(obs => {
                    const newX = obs.x - gameSpeedRef.current;

                    // Collision Detection
                    // Simple box collision
                    // Obstacle is at bottom, player jumps over
                    if (
                        newX < playerRect.right &&
                        newX + obs.width > playerRect.left &&
                        playerRect.bottom + newY < obs.height // Player is not high enough
                    ) {
                        collision = true;
                    }

                    if (newX > -20) {
                        newObstacles.push({ ...obs, x: newX });
                    }
                });

                if (collision) {
                    handleGameOver();
                }

                return newObstacles;
            });

            // 4. Update Coins
            setCoins(prev => {
                const newCoins: Coin[] = [];
                const playerRect = {
                    left: 10,
                    right: 20,
                    bottom: newY,
                    top: newY + 15
                };

                prev.forEach(coin => {
                    const newX = coin.x - gameSpeedRef.current;
                    let collected = coin.collected;

                    if (!collected &&
                        newX < playerRect.right &&
                        newX + 5 > playerRect.left &&
                        coin.y < playerRect.top &&
                        coin.y + 5 > playerRect.bottom
                    ) {
                        collected = true;
                        handleCollectCoin();
                    }

                    if (newX > -10 && !collected) {
                        newCoins.push({ ...coin, x: newX });
                    }
                });
                return newCoins;
            });

            // 5. Score
            scoreTimerRef.current += 1;
            if (scoreTimerRef.current > 10) {
                setScore(s => s + 1);
                scoreTimerRef.current = 0;
            }
        }

        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (gameState === 'playing') {
            lastTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState]);




    const spawnObstacle = () => {
        const type = Math.random() > 0.5 ? 'rock' : 'puddle';
        setObstacles(prev => [
            ...prev,
            {
                id: Date.now(),
                x: 100,
                type,
                width: 8,
                height: type === 'rock' ? 12 : 8
            }
        ]);
    };

    const spawnCoin = () => {
        setCoins(prev => [
            ...prev,
            {
                id: Date.now(),
                x: 100,
                y: 25 + Math.random() * 20, // In the air
                collected: false
            }
        ]);
    };

    const handleJump = () => {
        if (gameState !== 'playing') return;
        if (!isJumping) {
            velocityY.current = jumpForce;
            setIsJumping(true);
            playSound({ sound: STREAMER_WARS_SOUNDS.BUTTON_CLICK, volume: 0.3 }); // Jump sound
        }
    };

    const handleCollectCoin = () => {
        setScore(s => s + 50);
        playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT, volume: 0.5 });
    };

    const handleGameOver = () => {
        setGameState('gameover');
        if (score > highScore) setHighScore(score);
    };

    const startGame = () => {
        setScore(0);
        setObstacles([]);
        setCoins([]);
        setPlayerY(0);
        playerYRef.current = 0;
        velocityY.current = 0;
        gameSpeedRef.current = 0.8;
        setGameState('playing');
    };

    return (
        <div
            className="absolute inset-0 z-50 bg-sky-900 overflow-hidden flex flex-col font-sans select-none"
            onClick={handleJump}
        >
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-800 to-sky-900"></div>

            {/* Clouds / Stars */}
            <div className="absolute top-10 left-10 text-white/20 text-4xl animate-pulse">☁️</div>
            <div className="absolute top-20 right-20 text-white/10 text-6xl animate-pulse delay-700">☁️</div>

            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-emerald-800 border-t-4 border-emerald-600">
                <div className="w-full h-full opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}></div>
            </div>

            {/* Game Area */}
            <div className="relative flex-1 w-full h-full overflow-hidden">

                {/* Score */}
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end">
                    <div className="text-3xl font-black text-white drop-shadow-lg font-mono">{score}</div>
                    {highScore > 0 && <div className="text-xs text-white/60 font-mono">HI: {highScore}</div>}
                </div>

                {/* Player */}
                <div
                    className="absolute left-[10%] bottom-[64px] w-16 h-16 flex items-center justify-center will-change-transform"
                    style={{
                        transform: `translateY(-${playerY * 3}px) rotate(${playerY > 0 ? '15deg' : '0deg'})`
                    }}
                >
                    <div className="transform scale-[0.25] origin-center pointer-events-none">
                        <PetSprite
                            appearance={appearance}
                            stats={{ hunger: 100, energy: 100, hygiene: 100, happiness: 100 }}
                            isEating={false}
                            isSleeping={false}
                            disableAnimations={true}
                        />
                    </div>
                </div>                {/* Obstacles */}
                {obstacles.map(obs => (
                    <div
                        key={obs.id}
                        className="absolute bottom-[64px] flex items-end justify-center"
                        style={{
                            left: `${obs.x}%`,
                            width: `${obs.width}%`,
                            height: `${obs.height * 3}px`
                        }}
                    >
                        {obs.type === 'rock' ? (
                            <div className="w-full h-full bg-gray-600 rounded-t-lg border-2 border-gray-500 relative">
                                <div className="absolute top-1 left-1 w-2 h-2 bg-gray-400 rounded-full opacity-50"></div>
                            </div>
                        ) : (
                            <div className="w-full h-4 bg-blue-500/80 rounded-full blur-sm scale-x-150"></div>
                        )}
                    </div>
                ))}

                {/* Coins */}
                {coins.map(coin => (
                    <div
                        key={coin.id}
                        className="absolute w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-200 shadow-lg flex items-center justify-center animate-spin-slow"
                        style={{
                            left: `${coin.x}%`,
                            bottom: `${64 + coin.y * 3}px`
                        }}
                    >
                        <span className="text-[10px] font-bold text-yellow-700">$</span>
                    </div>
                ))}

            </div>

            {/* UI Overlays */}
            {gameState === 'intro' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-8 rounded-3xl border border-white/10 text-center max-w-xs mx-4 shadow-2xl">
                        <div className="w-20 h-20 bg-violet-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg rotate-3">
                            <LucideArrowUp size={40} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">Salto Jump</h2>
                        <p className="text-gray-400 mb-6">Toca la pantalla para saltar obstáculos y recoger monedas.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="p-4 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <LucideX size={24} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); startGame(); }}
                                className="flex-1 py-4 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                            >
                                <LucidePlay size={20} />
                                <span>Jugar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-8 rounded-3xl border border-white/10 text-center max-w-xs mx-4 shadow-2xl animate-fade-in-up">
                        <LucideTrophy className="mx-auto text-yellow-400 mb-4" size={48} />
                        <h2 className="text-3xl font-black text-white mb-1">¡Fin del juego!</h2>
                        <div className="text-5xl font-black text-violet-400 mb-6 tracking-tighter">{score}</div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); startGame(); }}
                                className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors"
                            >
                                Intentar de nuevo
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onComplete(Math.floor(score / 10)); }}
                                className="w-full py-4 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                            >
                                Salir y cobrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tap hint */}
            {gameState === 'playing' && (
                <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none opacity-50 animate-pulse">
                    <span className="text-sm font-bold text-white uppercase tracking-widest">Tap to Jump</span>
                </div>
            )}
        </div>
    );
}
