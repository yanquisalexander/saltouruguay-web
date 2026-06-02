import { useEffect, useRef, useState } from "preact/hooks";
import { MOOD_STYLES, type Mood } from "./moods";

interface CinematicTimerProps {
  totalSeconds: number;
  mood?: Mood;
}

export const CinematicTimer = ({ totalSeconds, mood = "neutral" }: CinematicTimerProps) => {
  const [display, setDisplay] = useState({ minutes: 0, seconds: 0 });
  const startRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = performance.now();
    const totalMs = totalSeconds * 1000;

    const update = (now: number) => {
      const elapsed = now - startRef.current;
      const remaining = Math.max(0, totalMs - elapsed);
      const secs = Math.ceil(remaining / 1000);
      setDisplay({
        minutes: Math.floor(secs / 60),
        seconds: secs % 60,
      });
      if (remaining > 0) {
        frameRef.current = requestAnimationFrame(update);
      }
    };

    frameRef.current = requestAnimationFrame(update);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [totalSeconds]);

  const colorClass = MOOD_STYLES[mood].timerColor;

  return (
    <div
      className={`fixed font-mono top-0 right-8 mt-6 text-lg z-10001 tabular-nums ${colorClass}`}
    >
      {display.minutes.toString().padStart(2, "0")}:
      {display.seconds.toString().padStart(2, "0")}
    </div>
  );
};
