import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Button } from "@/components/ui/8bit/button";
import type { JSX } from "preact/jsx-runtime";

interface BombProps {
    session: Session;
    pusher: Pusher;
    channel: Channel;
}

interface BombChallenge {
    type: 'math' | 'logic' | 'word' | 'sequence';
    question: string;
    correctAnswer: string;
    options?: string[];
}

export const Bomb = ({ session, pusher, channel }: BombProps) => {
    const [currentChallenge, setCurrentChallenge] = useState<BombChallenge | null>(null);
    const [challengesCompleted, setChallengesCompleted] = useState(0);
    const [errorsCount, setErrorsCount] = useState(0);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'completed' | 'failed'>('waiting');
    const [hasAnswer, setHasAnswer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [isShaking, setIsShaking] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const answerRef = useRef('');
    const playerNumber = session.user.streamerWarsPlayerNumber;

    const handleInput = useCallback((e: JSX.TargetedEvent<HTMLInputElement>) => {
        const nextValue = e.currentTarget.value;
        answerRef.current = nextValue;
        setHasAnswer(nextValue.trim().length > 0);
    }, [setHasAnswer]);

    const resetAnswerField = useCallback(() => {
        answerRef.current = '';
        setHasAnswer(false);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [setHasAnswer]);

    // --- Efectos (Foco, Fetch Inicial, Pusher) ---
    useEffect(() => {
        if (gameStatus === 'playing' && currentChallenge && !isSubmitting) {
            inputRef.current?.focus();
        }
    }, [currentChallenge, gameStatus, isSubmitting]);

    useEffect(() => {
        if (!playerNumber) return;
        const fetchInitialState = async () => {
            try {
                const response = await fetch('/api/bomb?action=player-state');
                const result = await response.json();
                if (result.success && result.gameStatus === 'active' && result.playerState) {
                    setCurrentChallenge(result.playerState.currentChallenge || null);
                    setChallengesCompleted(result.playerState.challengesCompleted);
                    setErrorsCount(result.playerState.errorsCount);
                    setGameStatus(result.playerState.status === 'completed' ? 'completed' :
                        result.playerState.status === 'failed' ? 'failed' : 'playing');
                    setShowInstructions(false);
                }
            } catch (error) {
                console.error('Error fetching initial game state:', error);
            }
        };
        if (session.user?.id && playerNumber) fetchInitialState();
    }, [session.user?.id, playerNumber]);

    useEffect(() => {
        if (!session.user?.id || !pusher || !playerNumber) return;

        const triggerShake = () => {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        };

        channel.bind('bomb:start', (data: { playerNumber: number; challenge: BombChallenge; challengesCompleted: number; errorsCount: number }) => {
            if (data.playerNumber === playerNumber) {
                setCurrentChallenge(data.challenge);
                setChallengesCompleted(data.challengesCompleted);
                setErrorsCount(data.errorsCount);
                setGameStatus('playing');
                resetAnswerField();
                setShowInstructions(false);
                toast.info('¡ACTIVADA! 💣', { position: 'bottom-center' });
            }
        });

        channel.bind('bomb:game-started', () => {
            if (gameStatus === 'waiting') {
                setCurrentChallenge(null);
                setChallengesCompleted(0);
                setErrorsCount(0);
                setGameStatus('waiting');
                resetAnswerField();
                setIsSubmitting(false);
            }
        });

        channel.bind('bomb:next-challenge', (data: { playerNumber: number; challenge: BombChallenge; challengesCompleted: number; errorsCount: number }) => {
            if (data.playerNumber === playerNumber) {
                setCurrentChallenge(data.challenge);
                setChallengesCompleted(data.challengesCompleted);
                setErrorsCount(data.errorsCount);
                resetAnswerField();
                setIsSubmitting(false);
            }
        });

        channel.bind('bomb:error', (data: { playerNumber: number; errorsCount: number; errorsRemaining: number }) => {
            if (data.playerNumber === playerNumber) {
                triggerShake();
                setErrorsCount(data.errorsCount);
                setIsSubmitting(false);
                resetAnswerField();
                inputRef.current?.focus();
            }
        });

        channel.bind('bomb:success', (data: { playerNumber: number }) => {
            if (data.playerNumber === playerNumber) {
                setGameStatus('completed');
                setCurrentChallenge(null);
                return
            }

            toast.success(`Jugador #${data.playerNumber.toString().padStart(3, '0')}, pasa!`);
        });

        channel.bind('bomb:failed', (data: { playerNumber: number }) => {
            if (data.playerNumber === playerNumber) {
                triggerShake();
                setGameStatus('failed');
                setCurrentChallenge(null);
            }
        });

        channel.bind('bomb:game-ended', () => {
            if (gameStatus === 'playing') {
                setGameStatus('failed');
                setCurrentChallenge(null);
            }
        });

        return () => {
            channel.unbind('bomb:start');
            channel.unbind('bomb:game-started');
            channel.unbind('bomb:next-challenge');
            channel.unbind('bomb:error');
            channel.unbind('bomb:success');
            channel.unbind('bomb:failed');
            channel.unbind('bomb:game-ended');
        };
    }, [session.user?.id, pusher, gameStatus, playerNumber, resetAnswerField]);

    const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement, Event>) => {
        e.preventDefault();
        const trimmedAnswer = answerRef.current.trim();
        if (!trimmedAnswer || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/bomb?action=submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer: trimmedAnswer }),
            });
            const result = await response.json();
            if (!result.success) {
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500);
                setIsSubmitting(false);
                resetAnswerField();
                inputRef.current?.focus();
            }
        } catch (error) {
            setIsSubmitting(false);
        }
    };

    // --- Renderizado ---
    const renderGameStatus = () => {
        if (gameStatus === 'waiting') {
            return (
                <div class="flex flex-col items-center justify-center h-full w-full p-4 text-center z-20 relative">
                    <h2 class="text-3xl font-bold mb-4 font-squids animate-pulse text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">ESPERANDO...</h2>
                    <div class="text-8xl mb-8 drop-shadow-lg">💣</div>
                    <p class="text-gray-300 font-mono">El juego comenzará pronto</p>
                </div>
            );
        }
        if (gameStatus === 'completed') {
            return (
                <div class="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-green-900/30 z-20 relative backdrop-blur-sm">
                    <h2 class="text-4xl font-bold mb-6 text-green-400 font-squids drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]">¡DESACTIVADA!</h2>
                    <div class="text-9xl mb-6 drop-shadow-lg">✅</div>
                </div>
            );
        }
        if (gameStatus === 'failed') {
            return (
                <div class="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-red-950/50 z-20 relative backdrop-blur-sm">
                    <h2 class="text-5xl font-bold mb-6 text-red-500 font-squids drop-shadow-[0_0_20px_rgba(239,68,68,1)]">¡BOOM!</h2>
                    <div class="text-9xl mb-6 drop-shadow-lg">💥</div>
                    <p className="text-xl font-mono text-red-300">Has sido eliminado</p>
                </div>
            );
        }
        return null;
    };

    // Estilos CSS para la animación y las franjas (por si no están en tu tailwind config)
    const customStyles = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
            20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        /* Simulacion de bg-stripes si no lo tienes configurado */
        .bg-stripes-red-black {
            background-image: linear-gradient(135deg, #450a0a 25%, #000000 25%, #000000 50%, #450a0a 50%, #450a0a 75%, #000000 75%, #000000 100%);
            background-size: 28.28px 28.28px;
        }
        /* Clase para el contenedor principal cuando vibra */
        .bomb-container-shaking {
            box-shadow: inset 0 0 60px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.5) !important;
            border-color: rgba(239, 68, 68, 1) !important;
        }
    `;

    // Contenedor Base Común (con estilos retro restaurados)
    const BaseContainer = ({ children }: { children: preact.ComponentChildren }) => (
        <div className={`w-full h-full text-white overflow-hidden relative flex flex-col
            bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/50 via-neutral-950 to-neutral-950
            border-4 border-red-900/60 shadow-[inset_0_0_30px_rgba(220,38,38,0.3)]
            transition-all duration-200
            ${isShaking ? 'animate-shake bomb-container-shaking' : ''}`}>
            <style>{customStyles}</style>
            {/* Franjas de peligro decorativas en los bordes superior e inferior */}
            <div className="absolute top-0 left-0 w-full h-3 bg-stripes-red-black opacity-40 z-0 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-3 bg-stripes-red-black opacity-40 z-0 pointer-events-none"></div>
            {children}
        </div>
    );


    if (gameStatus !== 'playing') {
        return (
            <BaseContainer>
                {showInstructions && gameStatus === 'waiting' && (
                    <Instructions duration={import.meta.env.DEV ? 5000 : 60000} customTitle="¡LA BOMBA!" controls={[{ keys: ["Enter"], label: "Enviar" }]}>
                        <p class="font-mono">5 desafíos. 3 vidas. Buena suerte.</p>
                    </Instructions>
                )}
                {renderGameStatus()}
            </BaseContainer>
        );
    }

    return (
        <BaseContainer>
            {/* 1. HEADER (Fijo arriba) con estilos NEÓN restaurados */}
            <div className="flex-none px-4 py-3 w-full bg-neutral-900/80 border-b-2 border-red-900/50 z-10 flex justify-between items-center backdrop-blur-md shadow-lg relative">
                <div className="text-center">
                    <p className="text-[10px] md:text-xs text-red-400/80 font-mono uppercase tracking-widest">Progreso</p>
                    <p className="text-xl md:text-2xl font-bold text-green-400 font-squids drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">{challengesCompleted}/5</p>
                </div>

                {/* Título con efecto NEÓN restaurado */}
                <h2 className={`text-2xl md:text-4xl font-bold font-squids tracking-[0.2em] hidden md:block drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse ${currentChallenge ? 'text-red-500' : 'text-green-400'}`}>
                    {currentChallenge ? "DESACTIVA LA BOMBA" : "BOMBA DESARMADA"}
                </h2>
                <div className="md:hidden text-4xl animate-pulse drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">💣</div>

                <div className="text-center">
                    <p className="text-[10px] md:text-xs text-red-400/80 font-mono uppercase tracking-widest">Errores</p>
                    <p className={`text-xl md:text-2xl font-bold font-squids ${errorsCount > 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-red-700'}`}>
                        {errorsCount}/3
                    </p>
                </div>
            </div>

            {/* Barra de progreso con brillo */}
            <div className="w-full bg-neutral-950 h-3 flex-none border-b border-red-900/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-stripes-red-black opacity-10"></div>
                <div
                    className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(74,222,128,0.6)] relative z-10"
                    style={{ width: `${(challengesCompleted / 5) * 100}%` }}
                />
            </div>

            {/* 2. ÁREA DE CONTENIDO (Flexible con Scroll interno) */}
            <div className="flex-1 flex flex-col w-full relative overflow-y-auto p-4 md:p-6 z-10 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-neutral-900">
                {currentChallenge && (
                    <div className="flex-1 flex flex-col justify-center items-center w-full max-w-5xl mx-auto my-4">

                        {/* Tarjeta de pregunta con estilos restaurados (borde, sombra) */}
                        <div className="w-full bg-neutral-800/80 rounded-xl p-6 md:p-10 mb-6 border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
                            {/* Decoración de esquina */}
                            <div className="absolute top-0 right-0 p-2">
                                <div className="w-16 h-1 bg-yellow-500/30 rotate-45 transform origin-bottom-left"></div>
                            </div>

                            <span className="inline-block mb-6 text-xs md:text-sm font-bold bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-sm font-mono uppercase tracking-widest border border-yellow-500/30">
                                {currentChallenge.type === 'math' && '📊 Matemáticas'}
                                {currentChallenge.type === 'logic' && '🧩 Lógica'}
                                {currentChallenge.type === 'word' && '📝 Palabra'}
                                {currentChallenge.type === 'sequence' && '🔢 Secuencia'}
                            </span>

                            <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-white font-press-start-2p break-words leading-relaxed text-center drop-shadow-md">
                                {currentChallenge.question}
                            </h3>

                            {currentChallenge.options && (
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    {currentChallenge.options.map((opt, i) => (
                                        <div key={i} className="bg-neutral-900/80 p-4 rounded-lg border-2 border-neutral-700 font-mono text-center text-gray-200 hover:border-yellow-500 transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] hover:text-yellow-400 cursor-pointer">
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 3. ÁREA DE INPUT (Fija abajo) */}
            <div className="flex-none p-4 md:p-6 w-full bg-neutral-900/90 border-t-2 border-red-900/50 z-20 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-stretch">
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            onInput={handleInput}
                            placeholder="Escribe tu respuesta..."
                            className="w-full h-full px-4 py-4 bg-neutral-800/80 border-2 border-gray-600 rounded-lg text-white text-lg md:text-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/30 focus:outline-none font-mono uppercase placeholder:normal-case transition-all text-center md:text-left"
                            disabled={isSubmitting}
                            autoComplete="off"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-mono hidden md:block pointer-events-none">
                            ⏎ ENTER
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={!hasAnswer || isSubmitting}
                        className="w-full md:w-auto px-8 py-4 font-press-start-2p bg-red-600 hover:bg-red-700 text-white whitespace-nowrap text-sm md:text-base rounded-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]"
                        font="retro"
                    >
                        {isSubmitting ? 'ENVIANDO...' : 'DESACTIVAR'}
                    </Button>
                </form>
            </div>
        </BaseContainer>
    );
};