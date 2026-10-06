import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { Instructions } from "../Instructions";
import { Button } from "@/components/ui/8bit/button";
import type { JSX } from "preact/jsx-runtime";
import { PUSHER_EVENTS_BOMB } from "@/consts/pusher";
import { SWGameShell } from "./_sw/SWGameShell";
import { SWStatusScreen } from "./_sw/SWStatusScreen";
import { SWHud } from "./_sw/SWHud";
import { useSWChannel } from "./_sw/swChannel";
import { swSound } from "./_sw/SWSounds";
import { swToast } from "../swToast";

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
// UI migrada al Design System _sw (Fase 1). Se conserva ChallengeCard/InputArea.
// ---------------------------------------------------------------------------

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
                <label htmlFor="bomb-answer" className="sr-only">Respuesta para desactivar la bomba</label>
                <input
                    ref={inputRef}
                    id="bomb-answer"
                    type="text"
                    value={value}
                    onInput={onInput}
                    placeholder="Escribe tu respuesta..."
                    aria-label="Respuesta para desactivar la bomba"
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

    const gameStatusRef = useRef(gameStatus);
    gameStatusRef.current = gameStatus;
    const triggerShake = useCallback(() => { setIsShaking(true); setTimeout(() => setIsShaking(false), 500); }, []);

    // Pusher vía hook único (bind/unbind simétrico, sin dep gameStatus que resuscribía)
    useSWChannel(channel, {
        [PUSHER_EVENTS_BOMB.START]: (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            setCurrentChallenge(data.challenge);
            setChallengesCompleted(data.challengesCompleted);
            setErrorsCount(data.errorsCount);
            setGameStatus('playing');
            resetAnswerField();
            setShowInstructions(false);
            swSound.warning();
            swToast.info('¡Bomba activada! Desactivala', { duration: 4000 });
        },
        [PUSHER_EVENTS_BOMB.GAME_STARTED]: () => {
            if (gameStatusRef.current !== 'waiting') return;
            setCurrentChallenge(null);
            setChallengesCompleted(0);
            setErrorsCount(0);
            setGameStatus('waiting');
            resetAnswerField();
            setIsSubmitting(false);
        },
        [PUSHER_EVENTS_BOMB.NEXT_CHALLENGE]: (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            setCurrentChallenge(data.challenge);
            setChallengesCompleted(data.challengesCompleted);
            setErrorsCount(data.errorsCount);
            resetAnswerField();
            setIsSubmitting(false);
            swSound.correct();
        },
        [PUSHER_EVENTS_BOMB.ERROR]: (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            triggerShake();
            setErrorsCount(data.errorsCount);
            setIsSubmitting(false);
            resetAnswerField();
            swSound.error();
            inputRef.current?.focus();
        },
        [PUSHER_EVENTS_BOMB.SUCCESS]: (data: any) => {
            if (data.playerNumber === playerNumber) {
                setGameStatus('completed');
                setCurrentChallenge(null);
                swSound.win();
                return;
            }
            swToast.success(`Jugador #${data.playerNumber.toString().padStart(3, '0')} desactiva la bomba`);
        },
        [PUSHER_EVENTS_BOMB.FAILED]: (data: any) => {
            if (data.playerNumber !== playerNumber) return;
            triggerShake();
            setGameStatus('failed');
            setCurrentChallenge(null);
            swSound.lose();
        },
        [PUSHER_EVENTS_BOMB.GAME_ENDED]: () => {
            if (gameStatusRef.current !== 'playing') return;
            setGameStatus('failed');
            setCurrentChallenge(null);
        },
    });

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

    // ------ Render (Design System _sw) ------

    if (gameStatus !== 'playing') {
        return (
            <SWGameShell accent="red" title="Desactiva la bomba" shaking={isShaking}>
                {showInstructions && gameStatus === 'waiting' && (
                    <Instructions duration={15000} customTitle="¡LA BOMBA!" controls={[{ keys: ["Enter"], label: "Enviar" }]}>
                        <p className="font-mono">5 desafíos. 3 errores y explota. Buena suerte.</p>
                    </Instructions>
                )}
                <SWStatusScreen
                    status={gameStatus === 'waiting' ? 'waiting' : gameStatus === 'completed' ? 'completed' : 'failed'}
                    title={gameStatus === 'waiting' ? 'Esperando activación' : gameStatus === 'completed' ? '¡Desactivada!' : '¡Boom! Eliminado'}
                    subtitle={gameStatus === 'waiting' ? 'El juego comenzará pronto' : undefined}
                />
            </SWGameShell>
        );
    }

    return (
        <SWGameShell accent="red" title={currentChallenge ? 'Desactiva la bomba' : 'Bomba desarmada'} shaking={isShaking}>
            <SWHud
                leftLabel="Progreso"
                leftValue={`${challengesCompleted}/5`}
                title="Desactiva la bomba"
                rightLabel="Errores"
                rightValue={`${errorsCount}/3`}
                progress={challengesCompleted / 5}
            />
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
        </SWGameShell>
    );
};
