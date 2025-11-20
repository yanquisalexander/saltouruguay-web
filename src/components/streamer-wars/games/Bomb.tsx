import type { Session } from "@auth/core/types";
import { useState, useEffect } from "preact/hooks";
import type Pusher from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Button as RetroButton } from "@/components/ui/8bit/button";

interface BombProps {
    session: Session;
    pusher: Pusher;
}

interface BombChallenge {
    type: 'math' | 'logic' | 'word' | 'sequence';
    question: string;
    correctAnswer: string;
    options?: string[];
}

export const Bomb = ({ session, pusher }: BombProps) => {
    const [currentChallenge, setCurrentChallenge] = useState<BombChallenge | null>(null);
    const [challengesCompleted, setChallengesCompleted] = useState(0);
    const [errorsCount, setErrorsCount] = useState(0);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'completed' | 'failed'>('waiting');
    const [answer, setAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);

    // Fetch initial game state on component mount
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const response = await fetch('/api/bomb?action=player-state');
                const result = await response.json();

                console.log('Bomb fetchInitialState result:', result);

                if (result.success && result.gameStatus === 'active' && result.playerState) {
                    console.log('Setting player state:', result.playerState);
                    setCurrentChallenge(result.playerState.currentChallenge || null);
                    setChallengesCompleted(result.playerState.challengesCompleted);
                    setErrorsCount(result.playerState.errorsCount);
                    setGameStatus(result.playerState.status === 'completed' ? 'completed' :
                        result.playerState.status === 'failed' ? 'failed' : 'playing');
                } else {
                    console.log('Not setting player state, conditions not met:', {
                        success: result.success,
                        gameStatus: result.gameStatus,
                        hasPlayerState: !!result.playerState
                    });
                }
            } catch (error) {
                console.error('Error fetching initial game state:', error);
            }
        };

        if (session.user?.id) {
            fetchInitialState();
        }
    }, [session.user?.id]);

    // Subscribe to streamer-wars channel
    useEffect(() => {
        if (!session.user?.id || !pusher) return;

        const channel = pusher.subscribe('streamer-wars');

        // Listen for game start event
        channel.bind('bomb:start', (data: { userId: number; challenge: BombChallenge; challengesCompleted: number; errorsCount: number }) => {
            console.log('Received bomb:start event:', data);
            if (data.userId === session.user.id) {
                console.log('Setting game to playing state');
                setCurrentChallenge(data.challenge);
                setChallengesCompleted(data.challengesCompleted);
                setErrorsCount(data.errorsCount);
                setGameStatus('playing');
                setAnswer('');
                toast.info('¡La bomba está activada! Responde correctamente para desactivarla.', { position: 'bottom-center' });
            }
        });

        // Listen for game started event (broadcast to all)
        channel.bind('bomb:game-started', (data: { totalPlayers: number }) => {
            console.log('Received bomb:game-started event:', data);
            // Only reset if not already playing
            if (gameStatus === 'waiting') {
                console.log('Resetting to waiting state');
                setCurrentChallenge(null);
                setChallengesCompleted(0);
                setErrorsCount(0);
                setGameStatus('waiting');
                setAnswer('');
                setIsSubmitting(false);
            }
        });

        // Listen for next challenge event
        channel.bind('bomb:next-challenge', (data: { userId: number; challenge: BombChallenge; challengesCompleted: number; errorsCount: number }) => {
            console.log('Received bomb:next-challenge event:', data);
            if (data.userId === session.user.id) {
                setCurrentChallenge(data.challenge);
                setChallengesCompleted(data.challengesCompleted);
                setErrorsCount(data.errorsCount);
                setAnswer('');
                setIsSubmitting(false);
                toast.success('¡Correcto! Siguiente desafío...', { position: 'bottom-center' });
            }
        });

        // Listen for error event
        channel.bind('bomb:error', (data: { userId: number; errorsCount: number; errorsRemaining: number }) => {
            console.log('Received bomb:error event:', data);
            if (data.userId === session.user.id) {
                setErrorsCount(data.errorsCount);
                setIsSubmitting(false);
                toast.error(`¡Incorrecto! Te quedan ${data.errorsRemaining} intentos.`, { position: 'bottom-center' });
            }
        });

        // Listen for success event
        channel.bind('bomb:success', (data: { userId: number }) => {
            console.log('Received bomb:success event:', data);
            if (data.userId === session.user.id) {
                setGameStatus('completed');
                setCurrentChallenge(null);
                toast.success('¡Felicitaciones! Desactivaste la bomba.', { position: 'bottom-center' });
            }
        });

        // Listen for failed event
        channel.bind('bomb:failed', (data: { userId: number }) => {
            console.log('Received bomb:failed event:', data);
            if (data.userId === session.user.id) {
                setGameStatus('failed');
                setCurrentChallenge(null);
                toast.error('¡La bomba explotó! Has sido eliminado.', { position: 'bottom-center' });
            }
        });

        // Listen for game ended event
        channel.bind('bomb:game-ended', () => {
            console.log('Received bomb:game-ended event');
            if (gameStatus === 'playing') {
                setGameStatus('failed');
                setCurrentChallenge(null);
                toast.info('El juego ha terminado.', { position: 'bottom-center' });
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe('streamer-wars');
        };
    }, [session.user?.id, pusher, gameStatus]);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        if (!answer.trim() || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/bomb?action=submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ answer: answer.trim() }),
            });

            const result = await response.json();

            if (!result.success) {
                toast.error(result.error || 'Error al enviar respuesta', { position: 'bottom-center' });
                setIsSubmitting(false);
            }
            // The Pusher events will handle the UI updates
        } catch (error) {
            console.error('Error submitting answer:', error);
            toast.error('Error de conexión', { position: 'bottom-center' });
            setIsSubmitting(false);
        }
    };

    const renderGameStatus = () => {
        if (gameStatus === 'waiting') {
            return (
                <div class="text-center">
                    <h2 class="text-2xl font-bold mb-4">Esperando inicio del juego...</h2>
                    <div class="animate-pulse text-6xl mb-4">💣</div>
                    <p class="text-gray-400">El administrador iniciará el juego pronto.</p>
                </div>
            );
        }

        if (gameStatus === 'completed') {
            return (
                <div class="text-center">
                    <h2 class="text-3xl font-bold mb-4 text-green-500">¡Bomba Desactivada!</h2>
                    <div class="text-8xl mb-4">✅</div>
                    <p class="text-xl text-gray-300">Has completado todos los desafíos exitosamente.</p>
                    <p class="text-lg text-gray-400 mt-2">Desafíos completados: {challengesCompleted}/5</p>
                </div>
            );
        }

        if (gameStatus === 'failed') {
            return (
                <div class="text-center">
                    <h2 class="text-3xl font-bold mb-4 text-red-500">¡Boom! 💥</h2>
                    <div class="text-8xl mb-4">❌</div>
                    <p class="text-xl text-gray-300">La bomba explotó. Has sido eliminado.</p>
                    <p class="text-lg text-gray-400 mt-2">Desafíos completados: {challengesCompleted}/5</p>
                    <p class="text-lg text-gray-400">Errores cometidos: {errorsCount}/3</p>
                </div>
            );
        }

        return null;
    };

    if (gameStatus !== 'playing') {
        return (
            <div class="flex flex-col items-center justify-center min-h-screen p-4">
                {renderGameStatus()}
            </div>
        );
    }

    return (
        <div class="flex flex-col items-center justify-center min-h-screen p-4">
            {showInstructions && (
                <Instructions
                    description="Desactiva la bomba respondiendo correctamente 5 desafíos. Tienes un máximo de 3 errores. ¡Piensa bien antes de responder!"
                    onContinue={() => setShowInstructions(false)}
                />
            )}

            {!showInstructions && (
                <div class="w-full max-w-2xl bg-neutral-900 rounded-lg shadow-2xl p-8 border-4 border-red-600">
                    {/* Header with stats */}
                    <div class="flex justify-between items-center mb-6">
                        <div class="text-center flex-1">
                            <p class="text-sm text-gray-400">Desafíos Completados</p>
                            <p class="text-3xl font-bold text-green-500">{challengesCompleted}/5</p>
                        </div>
                        <div class="text-6xl animate-pulse">💣</div>
                        <div class="text-center flex-1">
                            <p class="text-sm text-gray-400">Errores</p>
                            <p class="text-3xl font-bold text-red-500">{errorsCount}/3</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div class="w-full bg-gray-700 rounded-full h-4 mb-6">
                        <div 
                            class="bg-green-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${(challengesCompleted / 5) * 100}%` }}
                        ></div>
                    </div>

                    {/* Challenge */}
                    {currentChallenge && (
                        <div class="mb-8">
                            <div class="bg-neutral-800 rounded-lg p-6 mb-4 border-2 border-yellow-500">
                                <p class="text-sm text-yellow-500 mb-2 uppercase tracking-wide">
                                    {currentChallenge.type === 'math' && '📊 Matemáticas'}
                                    {currentChallenge.type === 'logic' && '🧩 Lógica'}
                                    {currentChallenge.type === 'word' && '📝 Completar Palabra'}
                                    {currentChallenge.type === 'sequence' && '🔢 Secuencia'}
                                </p>
                                <h3 class="text-2xl font-bold text-white mb-2">{currentChallenge.question}</h3>
                            </div>

                            <form onSubmit={handleSubmit} class="space-y-4">
                                <input
                                    type="text"
                                    value={answer}
                                    onInput={(e) => setAnswer((e.target as HTMLInputElement).value)}
                                    placeholder="Escribe tu respuesta aquí..."
                                    class="w-full px-4 py-3 bg-neutral-800 border-2 border-gray-600 rounded-lg text-white text-lg focus:border-blue-500 focus:outline-none"
                                    disabled={isSubmitting}
                                    autoFocus
                                />

                                <RetroButton
                                    type="submit"
                                    disabled={!answer.trim() || isSubmitting}
                                    class="w-full text-lg py-4"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}
                                </RetroButton>
                            </form>
                        </div>
                    )}

                    {/* Help text */}
                    <div class="text-center text-sm text-gray-400 mt-6">
                        <p>⚠️ Lee cuidadosamente cada pregunta antes de responder</p>
                        <p class="mt-2">Las respuestas no distinguen entre mayúsculas y minúsculas</p>
                    </div>
                </div>
            )}
        </div>
    );
};
