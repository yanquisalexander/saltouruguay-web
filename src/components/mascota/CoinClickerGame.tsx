import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';

export default function CoinClickerGame() {
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [playsRemaining, setPlaysRemaining] = useState<number | null>(null);
    const [coinsEarned, setCoinsEarned] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkCanPlay();
    }, []);

    useEffect(() => {
        let interval: number | null = null;

        if (gameState === 'playing' && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        finishGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [gameState, timeLeft]);

    const checkCanPlay = async () => {
        setLoading(true);
        try {
            const { data, error } = await actions.pets.canPlayMinigame({ 
                gameName: 'coin_clicker' 
            });
            
            if (error) {
                setMessage('Error al verificar límite de juegos');
            } else if (data) {
                setPlaysRemaining(data.playsRemaining);
                if (!data.canPlay) {
                    setMessage('Has alcanzado el límite diario de juegos');
                }
            }
        } catch (error) {
            console.error('Error checking play limit:', error);
            setMessage('Error al verificar límite de juegos');
        } finally {
            setLoading(false);
        }
    };

    const startGame = () => {
        if (playsRemaining === null || playsRemaining <= 0) {
            setMessage('No tienes más intentos disponibles hoy');
            return;
        }

        setGameState('playing');
        setScore(0);
        setTimeLeft(30);
        setCoinsEarned(null);
        setMessage('');
    };

    const finishGame = async () => {
        setGameState('finished');
        
        try {
            const { data, error } = await actions.pets.recordMinigameSession({
                gameName: 'coin_clicker',
                score: score
            });

            if (error) {
                setMessage('Error al guardar tu puntuación');
            } else if (data) {
                setCoinsEarned(data.coinsEarned);
                setPlaysRemaining(data.playsRemaining);
                setMessage(`¡Ganaste ${data.coinsEarned} Saltocoins!`);
            }
        } catch (error: any) {
            console.error('Error recording game session:', error);
            setMessage(error.message || 'Error al guardar tu puntuación');
        }
    };

    const handleClick = () => {
        if (gameState === 'playing') {
            setScore(prev => prev + 1);
        }
    };

    if (loading) {
        return (
            <div class="flex items-center justify-center p-8">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Cargando juego...</p>
                </div>
            </div>
        );
    }

    return (
        <div class="max-w-2xl mx-auto">
            {/* Game Info */}
            <div class="bg-yellow-100 rounded-lg p-4 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-lg">🪙 Clicker de Monedas</h3>
                        <p class="text-sm text-gray-700">
                            Haz clic en la moneda tantas veces como puedas en 30 segundos
                        </p>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-700">Intentos restantes</div>
                        <div class="text-2xl font-bold text-yellow-600">
                            {playsRemaining !== null ? playsRemaining : '?'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div class="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-center">
                    {message}
                </div>
            )}

            {/* Game Area */}
            <div class="bg-white rounded-2xl shadow-lg p-8">
                {gameState === 'idle' && (
                    <div class="text-center">
                        <div class="text-8xl mb-6">🪙</div>
                        <h2 class="text-2xl font-bold mb-4">¡Haz clic en la moneda!</h2>
                        <p class="text-gray-600 mb-6">
                            Cuantos más clics hagas, más Saltocoins ganarás
                        </p>
                        <button
                            onClick={startGame}
                            disabled={playsRemaining === 0}
                            class="px-8 py-4 bg-yellow-500 text-white font-bold text-lg rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {playsRemaining === 0 ? 'Sin intentos disponibles' : 'Comenzar'}
                        </button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div class="text-center">
                        <div class="mb-6">
                            <div class="text-6xl font-bold text-yellow-600 mb-2">
                                {timeLeft}s
                            </div>
                            <div class="text-2xl font-bold">
                                Puntuación: {score}
                            </div>
                        </div>
                        <button
                            onClick={handleClick}
                            class="text-9xl hover:scale-110 active:scale-95 transition-transform cursor-pointer select-none"
                        >
                            🪙
                        </button>
                        <p class="mt-6 text-gray-600">
                            ¡Haz clic lo más rápido posible!
                        </p>
                    </div>
                )}

                {gameState === 'finished' && (
                    <div class="text-center">
                        <div class="text-6xl mb-4">🎉</div>
                        <h2 class="text-2xl font-bold mb-4">¡Juego Terminado!</h2>
                        <div class="mb-6">
                            <div class="text-lg text-gray-600 mb-2">
                                Tu puntuación:
                            </div>
                            <div class="text-5xl font-bold text-yellow-600 mb-4">
                                {score}
                            </div>
                            {coinsEarned !== null && (
                                <div class="text-lg">
                                    Has ganado <span class="font-bold text-green-600">{coinsEarned}</span> Saltocoins 🪙
                                </div>
                            )}
                        </div>
                        <div class="space-y-3">
                            <button
                                onClick={startGame}
                                disabled={playsRemaining === 0}
                                class="w-full px-8 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {playsRemaining === 0 ? 'Sin intentos disponibles' : `Jugar de nuevo (${playsRemaining} restantes)`}
                            </button>
                            <a
                                href="/mascota/juegos"
                                class="block w-full px-8 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-all"
                            >
                                Ver otros juegos
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div class="mt-6 bg-blue-50 rounded-lg p-4">
                <h4 class="font-bold mb-2">ℹ️ Información</h4>
                <ul class="text-sm text-gray-700 space-y-1">
                    <li>• Puedes jugar hasta 5 veces por día</li>
                    <li>• Cada 10 clics = 1 Saltocoin (máximo 50)</li>
                    <li>• Tu mascota ganará experiencia al jugar</li>
                </ul>
            </div>
        </div>
    );
}
