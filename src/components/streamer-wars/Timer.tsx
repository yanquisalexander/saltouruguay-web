import { useEffect, useRef, useState } from "preact/hooks";
import { playTick } from "@/consts/Sounds";

interface TimerProps {
    seconds: number;
    onEnd: () => void;
}

export const Timer = ({ seconds, onEnd }: TimerProps) => {
    const [timeLeft, setTimeLeft] = useState(seconds);
    const [isVisible, setIsVisible] = useState(true);
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    useEffect(() => {
        if (timeLeft > 0) return;
        const timeout = setTimeout(() => {
            setIsVisible(false);
            onEndRef.current();
        }, 500);
        return () => clearTimeout(timeout);
    }, [timeLeft]);

    useEffect(() => {
        if (seconds <= 0) return;
        setTimeLeft(seconds);

        let remaining = seconds;

        if (remaining > 0) playTick();

        const interval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                playTick();
                setTimeLeft(remaining);
            } else {
                clearInterval(interval);
                setTimeLeft(0);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [seconds]);

    if (!isVisible) return null;

    const formatTime = (secs: number) => {
        const minutes = Math.floor(secs / 60);
        const remainingSeconds = secs % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="z-8000 transition-opacity duration-500">
            <div className="font-mono select-none text-lg text-gray-300">
                {formatTime(timeLeft)}
            </div>
        </div>
    );
};