import { useEffect, useRef, useState } from "preact/hooks";

/** Timer único rAF para minijuegos. Reemplaza los loops dispersos (Fishing/AndI/Tug). */
export const useSWTimer = ({
  durationMs,
  autoStart = true,
  onEnd,
}: {
  durationMs: number;
  autoStart?: boolean;
  onEnd?: () => void;
}) => {
  const [remaining, setRemaining] = useState(durationMs);
  const [running, setRunning] = useState(autoStart);
  const raf = useRef(0);
  const endAt = useRef(0);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!running) return;
    endAt.current = performance.now() + remaining;
    const tick = () => {
      const left = Math.max(0, endAt.current - performance.now());
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        onEndRef.current?.();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return {
    remainingMs: remaining,
    remainingSec: Math.ceil(remaining / 1000),
    progress: durationMs > 0 ? 1 - remaining / durationMs : 0,
    running,
    start: () => setRunning(true),
    stop: () => setRunning(false),
    reset: (ms = durationMs) => { setRemaining(ms); setRunning(false); },
  };
};

export const SWTimerBar = ({ progress, dangerAt = 0.8 }: { progress: number; dangerAt?: number }) => (
  <div class="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
    <div
      class={`h-full rounded-full transition-all duration-100 ${progress >= dangerAt ? "bg-red-500" : progress >= dangerAt - 0.2 ? "bg-orange-400" : "bg-[#b4cd02]"}`}
      style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
    />
  </div>
);
