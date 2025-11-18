import { useEffect, useState } from "preact/hooks";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface TimerProps {
    seconds: number;
    onEnd: () => void;
}

export const Timer = ({ seconds, onEnd }: TimerProps) => {
    const [timeLeft, setTimeLeft] = useState(seconds);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        setTimeLeft(seconds);
    }, [seconds]);

    useEffect(() => {
        if (timeLeft <= 0) {
            setTimeout(() => {
                setIsVisible(false);
                onEnd();
            }, 500);
            return;
        }

        let interval: number;
        interval = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    document.dispatchEvent(new CustomEvent("timer-ended"));
                    return 0;
                }
                playSound({ sound: STREAMER_WARS_SOUNDS.TICK, volume: 1 });
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(interval);
    }, [timeLeft, onEnd]);

    if (!isVisible) return null;

    const formatTime = (secs: number) => {
        const minutes = Math.floor(secs / 60);
        const remainingSeconds = secs % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={` z-[8000] transition-opacity duration-500`}
        >
            <div className=" font-mono select-none text-lg text-gray-300">
                {formatTime(timeLeft)}
            </div>
        </div>
    );
};