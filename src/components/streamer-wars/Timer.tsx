import { useEffect, useState } from "preact/hooks";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface TimerProps {
    seconds: number;
    onEnd: () => void;
}

export const Timer = ({ seconds, onEnd }: TimerProps) => {
    const [timeLeft, setTimeLeft] = useState(seconds);
    const [isVisible, setIsVisible] = useState(true);

    // Efecto para verificar cuando llega a cero y limpiar
    useEffect(() => {
        if (timeLeft <= 0) {
            const timeout = setTimeout(() => {
                setIsVisible(false);
                onEnd();
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [timeLeft, onEnd]);

    // Efecto estricto basado en la fecha (Date.now()) para evitar pausas o desincronización
    useEffect(() => {
        const endTime = Date.now() + seconds * 1000;
        let lastSoundSecond = seconds;

        const interval = window.setInterval(() => {
            const left = Math.ceil((endTime - Date.now()) / 1000);

            if (left < lastSoundSecond && left > 0) {
                playSound({ sound: STREAMER_WARS_SOUNDS.TICK, volume: 1 });
                lastSoundSecond = left;
            }

            if (left <= 0) {
                clearInterval(interval);
                setTimeLeft(0);
                document.dispatchEvent(new CustomEvent("timer-ended"));
            } else {
                setTimeLeft(left);
            }
        }, 100); // Chequea cada 100ms para asegurar precisión

        return () => window.clearInterval(interval);
    }, [seconds]);

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