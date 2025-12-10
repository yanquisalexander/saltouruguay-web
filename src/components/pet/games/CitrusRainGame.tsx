import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { LucideTrophy, LucideX, LucidePlay } from 'lucide-preact';
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface CitrusRainGameProps {
    onComplete: (score: number) => void;
    onClose: () => void;
}

interface FallingItem {
    id: number;
    x: number;
    y: number;
    type: 'orange' | 'lemon' | 'rotten';
    speed: number;
}

export default function CitrusRainGame({ onComplete, onClose }: CitrusRainGameProps) {
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [items, setItems] = useState<FallingItem[]>([]);
    const [playerX, setPlayerX] = useState(50); // Percentage 0-100
    const playerXRef = useRef(50); // Ref for animation loop access
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();
    const spawnTimerRef = useRef<number>(0);

    // Game Loop
    const animate = (time: number) => {
        if (gameState !== 'playing') return;

        if (lastTimeRef.current !== undefined) {
            const deltaTime = time - lastTimeRef.current;

            // Spawn items
            spawnTimerRef.current += deltaTime;
            if (spawnTimerRef.current > 800) { // Spawn every 800ms
                spawnItem();
                spawnTimerRef.current = 0;
            }

            // Update items
            setItems(prevItems => {
                const newItems: FallingItem[] = [];
                const caughtTypes: ('orange' | 'lemon' | 'rotten')[] = [];
                const currentPlayerX = playerXRef.current;

                const playerRect = {
                    left: currentPlayerX - 10, // Approximate player width in %
                    right: currentPlayerX + 10,
                    top: 80, // Player is at bottom (visual adjustment)
                    bottom: 95
                };

                prevItems.forEach(item => {
                    // Move item down
                    const newY = item.y + item.speed * (deltaTime / 16);

                    // Check collision with player
                    if (
                        newY > playerRect.top &&
                        newY < playerRect.bottom &&
                        item.x > playerRect.left &&
                        item.x < playerRect.right
                    ) {
                        // Caught!
                        caughtTypes.push(item.type);
                        return; // Remove item
                    }

                    // Keep item if still on screen
                    if (newY < 100) {
                        newItems.push({ ...item, y: newY });
                    }
                });

                // Handle catches outside of state updater to avoid conflicts
                if (caughtTypes.length > 0) {
                    setTimeout(() => {
                        caughtTypes.forEach(type => handleCatch(type));
                    }, 0);
                }

                return newItems;
            });
        }

        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }; useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(animate);

            // Timer
            const timerInterval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                clearInterval(timerInterval);
            };
        }
    }, [gameState]);

    const spawnItem = () => {
        const types: ('orange' | 'lemon' | 'rotten')[] = ['orange', 'orange', 'lemon', 'rotten'];
        const type = types[Math.floor(Math.random() * types.length)];

        setItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                x: Math.random() * 90 + 5, // 5% to 95%
                y: -10,
                type,
                speed: Math.random() * 0.5 + 0.5 // Random speed
            }
        ]);
    };

    const handleCatch = (type: 'orange' | 'lemon' | 'rotten') => {
        if (type === 'orange') {
            setScore(s => s + 10);
            playSound({ sound: STREAMER_WARS_SOUNDS.UI_CLICK, volume: 0.3 });
        } else if (type === 'lemon') {
            setScore(s => s + 5);
            playSound({ sound: STREAMER_WARS_SOUNDS.UI_CLICK, volume: 0.3 });
        } else {
            setScore(s => Math.max(0, s - 20));
            playSound({ sound: STREAMER_WARS_SOUNDS.ERROR, volume: 0.5 });
            // Visual feedback for bad item?
        }
    };

    const endGame = () => {
        setGameState('gameover');
        playSound({ sound: STREAMER_WARS_SOUNDS.LEVEL_UP });
    };

    const handleMouseMove = (e: any) => {
        if (gameState !== 'playing' || !gameAreaRef.current) return;

        const rect = gameAreaRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        const newX = Math.max(5, Math.min(95, percentage));
        setPlayerX(newX);
        playerXRef.current = newX;
    };

    const handleTouchMove = (e: any) => {
        if (gameState !== 'playing' || !gameAreaRef.current) return;

        const rect = gameAreaRef.current.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        const newX = Math.max(5, Math.min(95, percentage));
        setPlayerX(newX);
        playerXRef.current = newX;
    }; return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-md h-[600px] bg-gradient-to-b from-sky-900 to-sky-950 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-4 flex justify-between items-center z-10 bg-black/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🍊</span>
                        <span className="font-bold text-white">Lluvia de Cítricos</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white">
                        <LucideX size={24} />
                    </button>
                </div>

                {/* Game Area */}
                <div
                    ref={gameAreaRef}
                    className="flex-1 relative cursor-none touch-none"
                    onMouseMove={handleMouseMove}
                    onTouchMove={handleTouchMove}
                >
                    {gameState === 'intro' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-20 bg-black/40 backdrop-blur-sm">
                            <h3 className="text-3xl font-black text-orange-400 mb-4 drop-shadow-lg">¡Atrapa la Fruta!</h3>
                            <p className="text-white/80 mb-8 text-lg">
                                Mueve a tu mascota para atrapar naranjas y limones.
                                <br />
                                <span className="text-red-400 font-bold">¡Evita los podridos! 🤢</span>
                            </p>
                            <button
                                onClick={() => {
                                    setGameState('playing');
                                    lastTimeRef.current = performance.now();
                                }}
                                className="bg-orange-500 hover:bg-orange-400 text-white px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <LucidePlay fill="currentColor" />
                                Jugar
                            </button>
                        </div>
                    )}

                    {gameState === 'playing' && (
                        <>
                            {/* HUD */}
                            <div className="absolute top-4 left-4 right-4 flex justify-between text-white font-bold text-xl z-10 pointer-events-none">
                                <div className="bg-black/40 px-4 py-1 rounded-full backdrop-blur-md border border-white/10">
                                    Puntos: <span className="text-yellow-400">{score}</span>
                                </div>
                                <div className={`bg-black/40 px-4 py-1 rounded-full backdrop-blur-md border border-white/10 ${timeLeft < 5 ? 'text-red-500 animate-pulse' : ''}`}>
                                    ⏱️ {timeLeft}s
                                </div>
                            </div>

                            {/* Items */}
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    className="absolute text-4xl transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{
                                        left: `${item.x}%`,
                                        top: `${item.y}%`
                                    }}
                                >
                                    {item.type === 'orange' ? '🍊' : item.type === 'lemon' ? '🍋' : '🤢'}
                                </div>
                            ))}

                            {/* Player (Basket/Pet) */}
                            <div
                                className="absolute bottom-8 transform -translate-x-1/2 transition-transform duration-75 pointer-events-none"
                                style={{ left: `${playerX}%` }}
                            >
                                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                    <span className="text-4xl">🧺</span>
                                </div>
                            </div>
                        </>
                    )}

                    {gameState === 'gameover' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-20 bg-black/60 backdrop-blur-md animate-fade-in">
                            <LucideTrophy className="text-yellow-400 mb-4 animate-bounce" size={64} />
                            <h3 className="text-4xl font-black text-white mb-2">¡Tiempo!</h3>
                            <p className="text-white/60 mb-6 text-xl">Puntuación Final</p>
                            <div className="text-6xl font-black text-yellow-400 mb-8 drop-shadow-lg">
                                {score}
                            </div>
                            <div className="flex gap-4">

                                <button
                                    onClick={() => onComplete(score)}
                                    className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
                                >
                                    Recoger Premio
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
