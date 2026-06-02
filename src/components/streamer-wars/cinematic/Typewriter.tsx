import { useEffect, useRef, useState } from "preact/hooks";
import { playTick } from "@/consts/Sounds";

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export const Typewriter = ({ text, speed = 35, onComplete }: TypewriterProps) => {
  const [displayedCount, setDisplayedCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setDisplayedCount(0);

    // Play tick only at spaces to avoid noise
    intervalRef.current = window.setInterval(() => {
      setDisplayedCount((prev) => {
        if (prev >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onCompleteRef.current?.();
          return prev;
        }
        if (prev > 0 && text[prev] === " ") {
          playTick();
        }
        return prev + 1;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  if (!text) return null;

  const visible = text.slice(0, displayedCount);
  const done = displayedCount >= text.length;

  return (
    <span className="font-mono text-center text-white text-md leading-relaxed">
      {visible}
      {!done && (
        <span className="inline-block w-[2px] h-[1em] bg-white/70 align-middle ml-0.5 animate-pulse" />
      )}
    </span>
  );
};
