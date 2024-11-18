import { h } from "preact";
import { useState, useEffect } from "preact/hooks";

interface CountdownProps {
    timestamp: number; // Timestamp en milisegundos
}

const TimeDisplay = ({ value, label }: { value: number, label: string }) => (
    <div className="text-center space-y-2 aspect-square">
        <div className="text-4xl font-medium italic font-anton text-yellow-500 tabular-nums">{value.toString().padStart(2, "0")}</div>
        <div className="text-gray-400">{label}</div>
    </div>
);

const LaunchCountdown = ({ timestamp }: CountdownProps & h.JSX.HTMLAttributes<HTMLDivElement>) => {
    const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const difference = timestamp - now;

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000),
        };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [timestamp]);

    return (
        <div className="flex space-x-6 justify-center mt-8">
            <TimeDisplay value={timeLeft.days} label="Días" />
            <TimeDisplay value={timeLeft.hours} label="Horas" />
            <TimeDisplay value={timeLeft.minutes} label="Minutos" />
            <TimeDisplay value={timeLeft.seconds} label="Segundos" />
        </div>
    );
};

export default LaunchCountdown;