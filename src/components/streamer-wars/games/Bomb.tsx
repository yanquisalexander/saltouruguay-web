import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { toast } from "sonner";
import { Instructions } from "../Instructions";
import { Button } from "@/components/ui/8bit/button";
import type { JSX } from "preact/jsx-runtime";
import { PUSHER_EVENTS_BOMB } from "@/consts/pusher";

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

// ---------------------------------------------------------------------------
// Estilos CSS inyectados (una sola vez, fuera del componente)
// ---------------------------------------------------------------------------

const customStyles = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
    20%, 40%, 60%, 80% { transform: translateX(8px); }
}
.animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
.bg-stripes-red-black {
    background-image: linear-gradient(135deg, #450a0a 25%, #000 25%, #000 50%, #450a0a 50%, #450a0a 75%, #000 75%, #000 100%);
    background-size: 28.28px 28.28px;
}
.bomb-container-shaking {
    box-shadow: inset 0 0 60px rgba(239,68,68,.8), 0 0 30px rgba(239,68,68,.5) !important;
    border-color: rgb(239,68,68) !important;
}`;

// ---------------------------------------------------------------------------
// Componentes de UI (fuera de Bomb para evitar remounts)
// ---------------------------------------------------------------------------

const BaseContainer = ({ isShaking, children }: { isShaking: boolean; children: preact.ComponentChildren }) => (
    <div className={`w-full h-full text-white overflow-hidden relative flex flex-col
        bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-red-900/50 via-neutral-950 to-neutral-950
        border-4 border-red-900/60 shadow-[inset_0_0_30px_rgba(220,38,38,0.3)]
        transition-all duration-200
        ${isShaking ? 'animate-shake bomb-container-shaking' : ''}`}>
        <style>{customStyles}</style>
        <div className="absolute top-0 left-0 w-full h-3 bg-stripes-red-black opacity-40 z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-3 bg-stripes-red-black opacity-40 z-0 pointer-events-none" />
        {children}
    </div>
);

const StatusScreen = ({ status }: { status: 'waiting' | 'completed' | 'failed' }) => {
    if (status === 'waiting') return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center z-20 relative">
            <h2 className="text-xl md:text-2xl font-bold mb-3 font-squids animate-pulse text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">ESPERANDO...</h2>
            <div className="text-5xl md:text-6xl mb-6 drop-shadow-lg">💣</div>
            <p className="text-gray-300 font-mono">El juego comenzará pronto</p>
        </div>
    );
    if (status === 'completed') return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-green-900/30 z-20 relative backdrop-blur-xs">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-green-400 font-squids drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]">¡DESACTIVADA!</h2>
            <div className="text-6xl md:text-7xl mb-4 drop-shadow-lg">✅</div>
        </div>
    );
    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center bg-red-950/50 z-20 relative backdrop-blur-xs">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-red-500 font-squids drop-shadow-[0_0_20px_rgba(239,68,68,1)]">¡BOOM!</h2>
            <div className="text-6xl md:text-7xl mb-4 drop-shadow-lg">💥</div>
            <p className="text-lg font-mono text-red-300">Has sido eliminado</p>
        </div>
    );
};

const BombHeader = ({ challengesCompleted, errorsCount, hasChallenge }: {
    challengesCompleted: number;
    errorsCount: number;
    hasChallenge: boolean;
}) => (
    <div className="flex-none px-3 py-2 w-full bg-neutral-900/80 border-b-2 border-red-900/50 z-10 flex justify-between items-center backdrop-blur-md shadow-lg relative">
        <div className="text-center">
            <p className="text-[10px] md:text-xs text-red-400/80 font-mono uppercase tracking-widest">Progreso</p>
            <p className="text-base md:text-lg font-bold text-green-400 font-squids drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">{challengesCompleted}/5</p>
        </div>
        <h2 className={`text-lg md:text-2xl font-bold font-squids tracking-[0.2em] hidden md:block drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse ${hasChallenge ? 'text-red-500' : 'text-green-400'}`}>
            {hasChallenge ? "DESACTIVA LA BOMBA" : "BOMBA DESARMADA"}
        </h2>
        <div className="md:hidden text-2xl animate-pulse drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">💣</div>
        <div className="text-center">
            <p className="text-[10px] md:text-xs text-red-400/80 font-mono uppercase tracking-widest">Errores</p>
            <p className={`text-base md:text-lg font-bold font-squids ${errorsCount > 0 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-red-700'}`}>
                {errorsCount}/3
            </p>
        </div>
    </div>
);

const ProgressBar = ({ value }: { value: number }) => (
    <div className="w-full bg-neutral-950 h-2 flex-none border-b border-red-900/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-stripes-red-black opacity-10" />
        <div
            className="bg-linear-to-r from-green-600 to-green-400 h-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(74,222,128,0.6)] relative z-10"
            style={{ width: `${(value / 5) * 100}%` }}
        />
    </div>
);

const ChallengeCard = ({ challenge, isSubmitting, onAnswer }: {
    challenge: BombChallenge;
    isSubmitting: boolean;
    onAnswer: (answer: string) => void;
}) => {
    const typeLabel: Record<string, string> = {
        math: '📊 Matemáticas',
        logic: '🧩 Lógica',
        word: '📝 Palabra',
        sequence: '🔢 Secuencia',
    };

    return (
        <div className="flex-1 flex flex-col w-full relative overflow-y-auto p-3 md:p-4 z-10 scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-neutral-900">
            <div className="flex-1 flex flex-col justify-center items-center w-full max-w-3xl mx-auto my-2">
                <div className="w-full bg-neutral-800/80 rounded-xl p-4 md:p-5 mb-4 border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1">
                        <div className="w-12 h-0.5 bg-yellow-500/30 rotate-45 transform origin-bottom-left" />
                    </div>
                    <span className="inline-block mb-4 text-[10px] md:text-xs font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-xs font-mono uppercase tracking-widest border border-yellow-500/30">
                        {typeLabel[challenge.type]}
                    </span>
                    <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-white font-press-start-2p wrap-break-word leading-relaxed text-center drop-shadow-md">
                        {challenge.question}
                    </h3>
                    {challenge.options && (
                        <div className="grid grid-cols-2 gap-2 w-full max-w-lg mx-auto mt-4">
                            {challenge.options.map((opt, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => onAnswer(opt)}
                                    className="w-full px-3 py-3 bg-neutral-800/80 border-2 border-neutral-700 rounded-lg font-mono text-sm md:text-base text-gray-200
                                               hover:border-yellow-500 hover:text-yellow-400 hover:bg-neutral-800
                                               transition-all duration-150 cursor-pointer active:scale-[0.97]
                                               disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const BombInputArea = ({ inputRef, formRef, hasAnswer, isSubmitting, onInput, onSubmit, value }: {
    inputRef: { current: HTMLInputElement | null };
    formRef: { current: HTMLFormElement | null };
    hasAnswer: boolean;
    isSubmitting: boolean;
    onInput: (e: JSX.TargetedEvent<HTMLInputElement>) => void;
    onSubmit: (e: JSX.TargetedEvent<HTMLFormElement, Event>) => void;
    value: string;
}) => (
    <div className="flex-none p-3 md:p-4 w-full bg-neutral-900/90 border-t-2 border-red-900/50 z-20 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-3xl mx-auto flex flex-col md:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onInput={onInput}
                    placeholder="Escribe tu respuesta..."
                    className="w-full h-full px-3 py-3 bg-neutral-800/80 border-2 border-gray-600 rounded-lg text-white text-base md:text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/30 focus:outline-hidden font-mono uppercase placeholder:normal-case transition-all text-center md:text-left"
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-mono hidden md:block pointer-events-none">
                    ⏎ ENTER
                </div>
            </div>
            <Button
                type="submit"
                disabled={!hasAnswer || isSubmitting}
                className="w-full md:w-auto px-6 py-3 font-press-start-2p bg-red-600 hover:bg-red-700 text-white whitespace-nowrap text-xs md:text-sm rounded-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]"
                font="retro"
            >
                {isSubmitting ? 'ENVIANDO...' : 'DESACTIVAR'}
            </Button>
        </form>
    </div>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export const Bomb = ({ session, pusher, channel }: BombProps) => {
    const [currentChallenge, setCurrentChallenge] = useState<BombChallenge | null>(null);
    const [challengesCompleted, setChallengesCompleted] = useState(0);
    const [errorsCount, setErrorsCount] = useState(0);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'completed' | 'failed'>('waiting');
    const [hasAnswer, setHasAnswer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [isShaking, setIsShaking] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const answerRef = useRef('');
    const playerNumber = session.user.streamerWarsPlayerNumber;

    const handleInput = useCallback((e: JSX.TargetedEvent<HTMLInputElement>) => {
        const nextValue = e.currentTarget.value;
        answerRef.current = nextValue;
        setInputValue(nextValue);
        setHasAnswer(nextValue.trim().length > 0);
    }, []);

    const resetAnswerField = useCallback(() => {
        answerRef.current = '';
        setInputValue('');
        setHasAnswer(false);
    }, []);

    // Enfocar input al cambiar de challenge
    useEffect(() => {
        if (gameStatus === 'playing' && currentChallenge && !isSubmitting) {
            inputRef.current?.focus();
        }
    }, [currentChallenge, gameStatus, isSubmitting]);

    // Cargar estado inicial si el jugador ya estaba en medio del juego
    useEffect(() => {
        if (!playerNumber) return;
        const fetchInitialState = async () => {
            try {
                const res = await fetch('/api/bomb?action=player-state');
                const result = await res.json();
                if (result.success && result.gameStatus === 'active' && result.playerState) {
                    setCurrentChallenge(result.playerState.currentChallenge || null);
                    setChallengesCompleted(result.playerState.challengesCompleted);
                    setErrorsCount(result.playerState.errorsCount);
                    setGameStatus(
                        result.playerState.status === 'completed' ? 'completed' :
                        result.playerState.status === 'failed' ? 'failed' : 'playing'
                    );
                    setShowInstructions(false);
                }
            } catch (err) {
                console.error('Error fetching initial game state:', err);
            }
        };
        if (session.user?.id && playerNumber) fetchInitialState();
    }, [session.user?.id, playerNumber]);

    // Pusher events
    useEffect(() => {
        if (!session.user?.id || !pusher || !playerNumber) return;

        const triggerShake = () => { setIsShaking(true); setTimeout(() => setIsShaking(false), 500); };

        channel.bind(PUSHER_EVENTS_BOMB.START, (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            setCurrentChallenge(data.challenge);
            setChallengesCompleted(data.challengesCompleted);
            setErrorsCount(data.errorsCount);
            setGameStatus('playing');
            resetAnswerField();
            setShowInstructions(false);
            toast.info('¡ACTIVADA! 💣', { position: 'bottom-center' });
        });

        channel.bind(PUSHER_EVENTS_BOMB.GAME_STARTED, () => {
            if (gameStatus !== 'waiting') return;
            setCurrentChallenge(null);
            setChallengesCompleted(0);
            setErrorsCount(0);
            setGameStatus('waiting');
            resetAnswerField();
            setIsSubmitting(false);
        });

        channel.bind(PUSHER_EVENTS_BOMB.NEXT_CHALLENGE, (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            setCurrentChallenge(data.challenge);
            setChallengesCompleted(data.challengesCompleted);
            setErrorsCount(data.errorsCount);
            resetAnswerField();
            setIsSubmitting(false);
        });

        channel.bind(PUSHER_EVENTS_BOMB.ERROR, (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            triggerShake();
            setErrorsCount(data.errorsCount);
            setIsSubmitting(false);
            resetAnswerField();
            inputRef.current?.focus();
        });

        channel.bind(PUSHER_EVENTS_BOMB.SUCCESS, (data: any) => {
            if (data.playerNumber === playerNumber) {
                setGameStatus('completed');
                setCurrentChallenge(null);
                return;
            }
            toast.success(`Jugador #${data.playerNumber.toString().padStart(3, '0')}, pasa!`);
        });

        channel.bind(PUSHER_EVENTS_BOMB.FAILED, (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            triggerShake();
            setGameStatus('failed');
            setCurrentChallenge(null);
        });

        channel.bind(PUSHER_EVENTS_BOMB.GAME_ENDED, () => {
            if (gameStatus !== 'playing') return;
            setGameStatus('failed');
            setCurrentChallenge(null);
        });

        return () => {
            channel.unbind(PUSHER_EVENTS_BOMB.START);
            channel.unbind(PUSHER_EVENTS_BOMB.GAME_STARTED);
            channel.unbind(PUSHER_EVENTS_BOMB.NEXT_CHALLENGE);
            channel.unbind(PUSHER_EVENTS_BOMB.ERROR);
            channel.unbind(PUSHER_EVENTS_BOMB.SUCCESS);
            channel.unbind(PUSHER_EVENTS_BOMB.FAILED);
            channel.unbind(PUSHER_EVENTS_BOMB.GAME_ENDED);
        };
    }, [session.user?.id, pusher, gameStatus, playerNumber, resetAnswerField]);

    const submitAnswer = useCallback(async () => {
        const trimmedAnswer = answerRef.current.trim();
        if (!trimmedAnswer || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/bomb?action=submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer: trimmedAnswer }),
            });
            const result = await res.json();
            setIsSubmitting(false);
            if (result.success) return;
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            resetAnswerField();
            requestAnimationFrame(() => inputRef.current?.focus());
        } catch {
            setIsSubmitting(false);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isSubmitting, resetAnswerField]);

    const handleOption = (answer: string) => {
        answerRef.current = answer;
        setInputValue(answer);
        setHasAnswer(true);
        submitAnswer();
    };

    const handleSubmit = (e: JSX.TargetedEvent<HTMLFormElement, Event>) => {
        e.preventDefault();
        submitAnswer();
    };

    // ------ Render ------

    if (gameStatus !== 'playing') {
        return (
            <BaseContainer isShaking={isShaking}>
                {showInstructions && gameStatus === 'waiting' && (
                    <Instructions duration={import.meta.env.DEV ? 5000 : 60000} customTitle="¡LA BOMBA!" controls={[{ keys: ["Enter"], label: "Enviar" }]}>
                        <p className="font-mono">5 desafíos. 3 vidas. Buena suerte.</p>
                    </Instructions>
                )}
                <StatusScreen status={gameStatus} />
            </BaseContainer>
        );
    }

    return (
        <BaseContainer isShaking={isShaking}>
            <BombHeader
                challengesCompleted={challengesCompleted}
                errorsCount={errorsCount}
                hasChallenge={!!currentChallenge}
            />
            <ProgressBar value={challengesCompleted} />
            {currentChallenge && (
                <ChallengeCard
                    challenge={currentChallenge}
                    isSubmitting={isSubmitting}
                    onAnswer={handleOption}
                />
            )}
            <BombInputArea
                inputRef={inputRef}
                formRef={formRef}
                hasAnswer={hasAnswer}
                isSubmitting={isSubmitting}
                onInput={handleInput}
                onSubmit={handleSubmit}
                value={inputValue}
            />
        </BaseContainer>
    );
};
