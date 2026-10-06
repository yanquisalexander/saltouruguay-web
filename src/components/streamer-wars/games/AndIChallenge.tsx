import type { Session } from "@auth/core/types";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { actions } from "astro:actions";
import { PUSHER_CHANNELS, PUSHER_EVENTS_ANDI } from "@/consts/pusher";
import type { Players } from "@/components/admin/streamer-wars/Players";
import { Instructions } from "../Instructions";
import { SWGameShell } from "./_sw/SWGameShell";
import { SWHud } from "./_sw/SWHud";
import { useSWChannel } from "./_sw/swChannel";
import { swSound } from "./_sw/SWSounds";
import { swToast } from "../swToast";

const TARGET_TIME = 5.388;
const AUDIO_SRC = "https://cdn.saltouruguayserver.com/sounds/cutted-song-click-challenge.mp3?t=aaaa";

const RATING_COLORS: Record<string, string> = {
    PERFECT: '#22c55e',
    GOOD: '#06b6d4',
    EARLY: '#f59e0b',
    LATE: '#f97316',
    MISS: '#ef4444',
};

const RATING_LABELS: Record<string, string> = {
    PERFECT: '¡PERFECTO!',
    GOOD: '¡BIEN!',
    EARLY: 'TEMPRANO',
    LATE: 'TARDE',
    MISS: 'FALLASTE',
};

interface AndIChallengeProps {
    session: Session;
    pusher: Pusher;
    channel: Channel;
    players: Players[];
}

interface PlayerResult {
    playerNumber: number;
    rating: string;
    ms: number;
}

const calculateRating = (ms: number): { rating: string; ms: number } => {
    const W = { perfect: 80, good: 200, early: 500 };
    const diff = Math.abs(ms);
    const early = ms < 0;
    let rating: string;
    if (diff <= W.perfect) rating = 'PERFECT';
    else if (diff <= W.good) rating = 'GOOD';
    else if (diff <= W.early) rating = early ? 'EARLY' : 'LATE';
    else rating = 'MISS';
    return { rating, ms: Math.round(diff) };
};

const fmt = (s: number) => {
    if (!isFinite(s)) return '00:00:000ms';
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(Math.floor(s % 60)).padStart(2, '0');
    const ms = String(Math.floor((s % 1) * 1000)).padStart(3, '0');
    return `${mm}:${ss}:${ms}ms`;
};

export const AndIChallenge = ({ session, pusher, channel, players }: AndIChallengeProps) => {
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'ended'>('waiting');
    const [phase, setPhase] = useState<'countdown' | 'playing' | 'result' | 'idle'>('idle');
    const [currentPlayer, setCurrentPlayer] = useState<number | null>(null);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [playerQueue, setPlayerQueue] = useState<number[]>([]);
    const [lastResult, setLastResult] = useState<PlayerResult | null>(null);
    const [results, setResults] = useState<PlayerResult[]>([]);
    const [spectatorTapPos, setSpectatorTapPos] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const [countdownNum, setCountdownNum] = useState<number | null>(null);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioStartedAt, setAudioStartedAt] = useState<number | null>(null);

    const playerNumber = session.user.streamerWarsPlayerNumber;
    const isAdmin = session.user.isAdmin ?? false;
    const myTurn = currentPlayer === playerNumber;
    const isSpectating = gameStatus === 'playing' && currentPlayer !== null && !myTurn;

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressRaf = useRef(0);
    const tappedRef = useRef(false);
    const timerRef = useRef<number | null>(null);

    const getPlayerDisplay = (pn: number) => {
        const p = players.find(p => p.playerNumber === pn);
        return p?.displayName || `#${String(pn).padStart(3, '0')}`;
    };

    // Sync-driven progress animation — all clients use the same timestamp
    useEffect(() => {
        if (audioStartedAt === null) return;
        if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
        setProgress(0);

        const startedAt = audioStartedAt;

        const tick = () => {
            const elapsed = (Date.now() - startedAt) / 1000;
            const dur = audioDuration || 25;
            const pct = (elapsed / dur) * 100;
            setProgress(Math.min(pct, 100));
            if (elapsed < dur) {
                progressRaf.current = requestAnimationFrame(tick);
            }
        };
        tick();

        return () => {
            if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
        };
    }, [audioStartedAt, audioDuration]);

    const startTurn = useCallback(() => {
        setPhase('countdown');
        setLastResult(null);
        setSpectatorTapPos(null);
        tappedRef.current = false;
        setProgress(0);
        setAudioStartedAt(null);

        let n = 3;
        setCountdownNum(n);

        const tick = () => {
            if (n <= 0) {
                setCountdownNum(null);
                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(() => { });
                }
                const now = Date.now();
                setAudioStartedAt(now);
                // Broadcast sync timestamp via server action
                actions.games.andiChallenge.broadcastAudioStart({ startedAt: now }).catch(() => { });
                // Also trigger client event for spectators who can receive it
                try {
                    const gc = pusher?.subscribe(PUSHER_CHANNELS.GLOBAL) as any;
                    gc?.trigger(PUSHER_EVENTS_ANDI.AUDIO_START, { startedAt: now });
                } catch (e) {
                    // Client event may fail silently
                }
                setPhase('playing');
                return;
            }
            n--;
            setCountdownNum(n);
            timerRef.current = window.setTimeout(tick, 900);
        };

        timerRef.current = window.setTimeout(tick, 900);
    }, [pusher]);

    const handleTap = useCallback(async () => {
        if (tappedRef.current || !audioRef.current) return;
        tappedRef.current = true;

        const tapTime = audioRef.current.currentTime;
        const diff = (tapTime - TARGET_TIME) * 1000;

        // Instant local feedback
        const local = calculateRating(diff);
        const localResult: PlayerResult = { playerNumber, rating: local.rating, ms: local.ms };
        setLastResult(localResult);
        setPhase('result');
        setResults(prev => [...prev.filter(r => r.playerNumber !== playerNumber), localResult]);
        setSpectatorTapPos(null);
        if (local.rating === 'PERFECT' || local.rating === 'GOOD') swSound.correct();
        else swSound.error();

        try {
            (channel as any)?.trigger(PUSHER_EVENTS_ANDI.CLIENT_TAP, {
                playerNumber,
                audioCurrentTime: tapTime,
            });
        } catch (e) {
            swToast.error("No se pudo enviar el tap (red)");
        }

        try {
            await actions.games.andiChallenge.recordTap({ ms: diff });
        } catch (e) {
            console.error("recordTap failed", e);
        }
    }, [playerNumber, pusher]);

    // Pusher vía hook único (usa channel por props, sin subscribe extra que leakeaba)
    const audioDurationRef = useRef(audioDuration);
    audioDurationRef.current = audioDuration;
    useSWChannel(channel, {
        [PUSHER_EVENTS_ANDI.GAME_STARTED]: (data: any) => {
            setGameStatus('playing');
            setPlayerQueue(data.players || []);
            setCurrentPlayer(data.currentPlayer);
            setCurrentIndex(data.currentIndex ?? 0);
            setResults([]);
            setLastResult(null);
            setSpectatorTapPos(null);
            setAudioStartedAt(null);
            setPhase('idle');
            swSound.countdown();
        },
        [PUSHER_EVENTS_ANDI.NEXT_PLAYER]: (data: any) => {
            setCurrentPlayer(data.playerNumber);
            setCurrentIndex(data.currentIndex);
            setLastResult(null);
            setSpectatorTapPos(null);
            setAudioStartedAt(null);
            setPhase('idle');
        },
        [PUSHER_EVENTS_ANDI.AUDIO_START]: (data: any) => {
            setAudioStartedAt(data.startedAt);
        },
        [PUSHER_EVENTS_ANDI.CLIENT_TAP]: (data: any) => {
            if (data.playerNumber !== playerNumber) {
                const dur = audioDurationRef.current || 25;
                const pct = (data.audioCurrentTime / dur) * 100;
                setSpectatorTapPos(pct);
            }
        },
        [PUSHER_EVENTS_ANDI.RESULT]: (data: PlayerResult) => {
            setLastResult(data);
            setResults(prev => [...prev.filter(r => r.playerNumber !== data.playerNumber), data]);
            setSpectatorTapPos(null);
            setPhase('result');
            if (timerRef.current) clearTimeout(timerRef.current);
            if (data.rating === 'PERFECT' || data.rating === 'GOOD') swSound.correct();
            else swSound.error();
        },
        [PUSHER_EVENTS_ANDI.GAME_ENDED]: (data: any) => {
            setGameStatus('ended');
            setResults(data.results || []);
            setPhase('idle');
            setCurrentPlayer(null);
            setSpectatorTapPos(null);
            setAudioStartedAt(null);
            swSound.win();
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        },
        [PUSHER_EVENTS_ANDI.GAME_RESET]: () => {
            setGameStatus('waiting');
            setCurrentPlayer(null);
            setCurrentIndex(-1);
            setPlayerQueue([]);
            setResults([]);
            setLastResult(null);
            setSpectatorTapPos(null);
            setAudioStartedAt(null);
            setPhase('idle');
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        },
    });

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
        };
    }, []);

    useEffect(() => {
        document.addEventListener("instructions-ended", () => {
            // Instructions dismissed — game is ready to start via admin
        }, { once: true });
    }, []);

    const dur = audioDuration || 25;
    const progressPct = Math.min(progress, 100);
    const targetPct = (TARGET_TIME / dur) * 100;
    const sortedResults = [...results].sort((a, b) => a.ms - b.ms);

    return (
        <SWGameShell accent="purple" title="El desafío de Whitney">
            <SWHud
                leftLabel="Turno"
                leftValue={currentPlayer ? `#${String(currentPlayer).padStart(3, "0")}` : "—"}
                title="El desafío de Whitney"
                rightLabel="Jugadores"
                rightValue={`${results.length}/${playerQueue.length || "—"}`}
                progress={playerQueue.length ? results.length / Math.max(1, playerQueue.length) : undefined}
            />
            <Instructions duration={15000}
                customTitle="El desafío de Whitney"
                controls={[
                    {
                        keys: ["LEFT_CLICK"],
                        label: "Presiona TAP en el momento exacto"
                    }
                ]}
            >
                <p class="font-mono max-w-2xl text-left">
                    "El desafío de Whitney" es un juego de reflejos y precisión musical.
                    <br /><br />
                    Escucharás un fragmento de canción y deberás presionar el botón <strong>TAP</strong> exactamente en el momento indicado por el administrador.
                    <br /><br />
                    Tu objetivo es acercarte lo más posible al momento exacto. Mientras más cerca estés, mejor será tu puntuación:
                </p>
                <br />
                <ul class="font-mono max-w-2xl text-left space-y-1 list-disc list-inside">
                    <li><span style="color: #22c55e">PERFECTO</span> — Casi exacto</li>
                    <li><span style="color: #06b6d4">BIEN</span> — Muy cerca</li>
                    <li><span style="color: #f59e0b">TEMPRANO</span> — Presionaste antes</li>
                    <li><span style="color: #f97316">TARDE</span> — Presionaste después</li>
                    <li><span style="color: #ef4444">FALLASTE</span> — Muy lejos del momento</li>
                </ul>
                <br />
                <p class="font-mono max-w-2xl text-left">
                    ¡Pon atención al ritmo y demuestra tu precisión!
                </p>
            </Instructions>
            <div class="w-full relative overflow-hidden flex flex-col">
                <style>{`
                @keyframes equalizer {
                    0%, 100% { height: 4px; }
                    25% { height: 16px; }
                    50% { height: 24px; }
                    75% { height: 10px; }
                }
                .bar-1 { animation: equalizer 0.8s ease-in-out infinite; }
                .bar-2 { animation: equalizer 0.6s ease-in-out infinite 0.1s; }
                .bar-3 { animation: equalizer 0.7s ease-in-out infinite 0.2s; }
                .bar-4 { animation: equalizer 0.9s ease-in-out infinite 0.15s; }
                .bar-5 { animation: equalizer 0.5s ease-in-out infinite 0.25s; }
            `}</style>

                <audio
                    ref={audioRef}
                    src={AUDIO_SRC}
                    preload="auto"
                    crossOrigin="anonymous"
                    onLoadedMetadata={() => {
                        if (audioRef.current) setAudioDuration(audioRef.current.duration);
                    }}
                />

                {/* Countdown overlay */}
                {countdownNum !== null && (
                    <div class="fixed inset-0 z-60 flex items-center justify-center" style={{ background: '#000000cc' }}>
                        <span class="text-8xl font-bold font-squids" style={{
                            color: '#c084fc',
                            textShadow: '0 0 40px rgba(192,132,252,0.8), 0 0 80px rgba(192,132,252,0.4)',
                        }}>
                            {countdownNum > 0 ? countdownNum : 'GO!'}
                        </span>
                    </div>
                )}

                {/* Header */}
                <div class="flex items-center justify-between px-4 py-2 bg-neutral-900/80 border-b-2 border-purple-700/50 backdrop-blur-md z-10">
                    <div class="flex items-center gap-3">
                        <h2 class="font-squids text-lg tracking-wider" style={{ color: '#c084fc', textShadow: '0 0 10px rgba(192,132,252,0.6)' }}>
                            El desafío de Whitney
                        </h2>
                        {gameStatus === 'playing' && (
                            <span class="font-mono text-[10px] uppercase tracking-widest text-purple-400/60">
                                {currentIndex + 1}/{playerQueue.length}
                            </span>
                        )}
                    </div>
                    <div class="flex items-center gap-3">
                        {gameStatus === 'playing' && currentPlayer && (
                            <span class="font-mono text-xs text-purple-300/80">
                                Turno: <span class="font-bold">{getPlayerDisplay(currentPlayer)}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Main content */}
                <div class="flex-1 flex flex-col items-center justify-center gap-6 p-6 z-10">

                    {/* Waiting state */}
                    {gameStatus === 'waiting' && (
                        <div class="flex flex-col items-center gap-4">
                            <span class="font-squids text-5xl" style={{
                                color: '#c084fc',
                                textShadow: '0 0 30px rgba(192,132,252,0.6)',
                            }}>
                                El desafío de Whitney
                            </span>
                            <span class="font-mono text-sm text-purple-400/60 animate-pulse">
                                ESPERANDO...
                            </span>
                        </div>
                    )}

                    {/* Game playing state */}
                    {gameStatus === 'playing' && (
                        <>
                            {/* Status message */}
                            {myTurn && phase === 'playing' && (
                                <span class="font-squids text-lg animate-pulse" style={{ color: '#c084fc' }}>
                                    ¡TU TURNO!
                                </span>
                            )}
                            {myTurn && phase === 'countdown' && (
                                <span class="font-squids text-lg" style={{ color: '#a78bfa' }}>
                                    PREPARATE
                                </span>
                            )}
                            {myTurn && phase === 'idle' && (
                                <span class="font-squids text-lg" style={{ color: '#a78bfa' }}>
                                    ¡TU TURNO!
                                </span>
                            )}
                            {isSpectating && phase === 'playing' && (
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span class="font-mono text-xs text-purple-400/60">Jugando...</span>
                                </div>
                            )}

                            {/* Progress bar — spectators always, player only after tapping */}
                            {gameStatus === 'playing' && (!myTurn || phase === 'result') && (
                                <div class="w-full max-w-md flex flex-col gap-1.5">
                                    <div class="flex justify-between font-mono text-[10px] text-purple-400/60">
                                        <span>{fmt((progressPct / 100) * dur)}</span>
                                        <span>{fmt(dur)}</span>
                                    </div>
                                    <div class="relative h-3 rounded-full overflow-hidden" style={{ background: '#1a0033' }}>
                                        <div
                                            class="h-full rounded-full transition-all duration-75"
                                            style={{ width: `${progressPct}%`, background: '#c084fc' }}
                                        />
                                        <>
                                            <div
                                                class="absolute top-0 bottom-0 w-[3px] rounded-full"
                                                style={{ left: `${targetPct}%`, transform: 'translateX(-50%)', background: '#b91c1c' }}
                                            />
                                            <div
                                                class="absolute text-[10px] font-mono pointer-events-none whitespace-nowrap"
                                                style={{ left: `${targetPct}%`, transform: 'translateX(-50%)', top: 'calc(100% + 4px)', color: '#b91c1c' }}
                                            >
                                                ▲ target
                                            </div>
                                        </>
                                        {spectatorTapPos !== null && (
                                            <div
                                                class="absolute top-0 bottom-0 w-[3px] rounded-full"
                                                style={{ left: `${spectatorTapPos}%`, transform: 'translateX(-50%)', background: '#ef4444' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Start button (player decides when to start) */}
                            {myTurn && phase === 'idle' && (
                                <button
                                    onClick={startTurn}
                                    class="w-[160px] h-[160px] rounded-full border-none cursor-pointer flex flex-col items-center justify-center gap-1 select-none touch-none transition-transform active:scale-[0.93]"
                                    style={{
                                        background: 'radial-gradient(circle at center, #c084fc, #7c3aed)',
                                        boxShadow: '0 0 40px rgba(192,132,252,0.4), inset 0 -4px 0 rgba(0,0,0,0.3)',
                                    }}
                                >
                                    <span class="font-squids text-xl tracking-wider" style={{ color: '#fff' }}>
                                        TAP
                                    </span>
                                    <span class="font-mono text-[10px] tracking-wider text-white/60">
                                        para comenzar
                                    </span>
                                </button>
                            )}

                            {/* Tap button */}
                            {myTurn && phase === 'playing' && (
                                <button
                                    onClick={handleTap}
                                    class="w-[160px] h-[160px] rounded-full border-none cursor-pointer flex flex-col items-center justify-center gap-1 select-none touch-none transition-transform active:scale-[0.93]"
                                    style={{
                                        background: 'radial-gradient(circle at center, #c084fc, #7c3aed)',
                                        boxShadow: '0 0 40px rgba(192,132,252,0.4), inset 0 -4px 0 rgba(0,0,0,0.3)',
                                    }}
                                >
                                    <div class="flex items-end gap-[3px] h-6 mb-1">
                                        <div class="w-[5px] rounded-full bg-white/80 bar-1" />
                                        <div class="w-[5px] rounded-full bg-white/80 bar-2" />
                                        <div class="w-[5px] rounded-full bg-white/80 bar-3" />
                                        <div class="w-[5px] rounded-full bg-white/80 bar-4" />
                                        <div class="w-[5px] rounded-full bg-white/80 bar-5" />
                                    </div>
                                    <span class="font-squids text-2xl tracking-wider" style={{ color: '#fff' }}>
                                        TAP
                                    </span>
                                    <span class="font-mono text-[10px] tracking-wider text-white/60">
                                        on the beat
                                    </span>
                                </button>
                            )}

                            {myTurn && phase === 'countdown' && (
                                <div
                                    class="w-[160px] h-[160px] rounded-full flex items-center justify-center"
                                    style={{ background: '#1a0033', border: '2px solid rgba(192,132,252,0.3)' }}
                                >
                                    <span class="font-mono text-sm text-purple-400/60">PREPARA...</span>
                                </div>
                            )}

                            {/* Result */}
                            {lastResult && phase === 'result' && (
                                <div class="flex flex-col items-center gap-1">
                                    <span class="font-squids text-2xl tracking-wider" style={{
                                        color: RATING_COLORS[lastResult.rating] || '#fff',
                                        textShadow: `0 0 20px ${RATING_COLORS[lastResult.rating]}80`,
                                    }}>
                                        {RATING_LABELS[lastResult.rating] || lastResult.rating}
                                    </span>
                                    <span class="font-mono text-xs text-purple-400/60">
                                        {lastResult.ms}ms off
                                    </span>
                                    {!isAdmin && (
                                        <span class="font-mono text-[10px] text-purple-400/40 mt-2">
                                            Esperando al administrador...
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Ended state - leaderboard */}
                    {gameStatus === 'ended' && sortedResults.length > 0 && (
                        <div class="w-full max-w-md space-y-3">
                            <h2 class="font-squids text-xl text-center" style={{
                                color: '#c084fc',
                                textShadow: '0 0 20px rgba(192,132,252,0.6)',
                            }}>
                                Resultados
                            </h2>
                            <div class="space-y-1">
                                {sortedResults.map((r, i) => (
                                    <div
                                        key={r.playerNumber}
                                        class="flex items-center justify-between px-3 py-2 rounded-lg"
                                        style={{ background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)' }}
                                    >
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono text-xs font-bold text-purple-400">#{i + 1}</span>
                                            <span class="font-mono text-sm" style={{ color: '#e9d5ff' }}>{getPlayerDisplay(r.playerNumber)}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono text-xs font-bold" style={{ color: RATING_COLORS[r.rating] }}>{r.rating}</span>
                                            <span class="font-mono text-[10px] text-purple-400/60">({r.ms}ms)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SWGameShell>
    );
};