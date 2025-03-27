import { LucideCalendar } from "lucide-preact";
import { h } from "preact";
import { useState, useEffect } from "preact/hooks";

interface CountdownProps {
    timestamp: number; // Timestamp en milisegundos
    eventName?: string; // Nombre del evento
    eventDescription?: string; // Descripción del evento
    classNames?: {
        container?: string;
        timeDisplay?: string;
    };
}

const TimeDisplay = ({ value, label, timeStyles }: { value: number, label: string, timeStyles?: string }) => (
    <div className="text-center space-y-2 aspect-square">
        <div class={`text-4xl font-medium italic font-anton text-yellow-500 tabular-nums ${timeStyles}`}>{value.toString().padStart(2, "0")}</div>
        <div className="text-gray-400">{label}</div>
    </div>
);

const LaunchCountdown = ({ timestamp, classNames, ...props }: CountdownProps & h.JSX.HTMLAttributes<HTMLDivElement>) => {
    const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const difference = timestamp - now;

        if (difference < 0) {
            return {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
            };
        }

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

        // @ts-ignore
        return () => clearInterval(timer);
    }, [timestamp]);

    const addToCalendar = () => {
        const eventDate = new Date(timestamp).toISOString();
        const googleCalendarUrl = new URL("https://www.google.com/calendar/render");
        googleCalendarUrl.searchParams.set("action", "TEMPLATE");
        googleCalendarUrl.searchParams.set("dates", `${eventDate.replace(/[-:]/g, "").split(".")[0]}Z/${eventDate.replace(/[-:]/g, "").split(".")[0]}Z`);
        googleCalendarUrl.searchParams.set("text", props.eventName || "Evento de Salto Uruguay Server");
        googleCalendarUrl.searchParams.set("details", props.eventDescription || "");
        googleCalendarUrl.searchParams.set("sf", "true");
        googleCalendarUrl.searchParams.set("output", "xml");
        googleCalendarUrl.searchParams.set("sprop", "website:saltouruguayserver.com");
        window.open(googleCalendarUrl, "_blank");
    };

    return (
        <div className={`flex flex-col items-center space-y-4 mt-8 ${props.class}`} {...props}>
            <div className="flex space-x-6 justify-center">
                <TimeDisplay value={timeLeft.days} label="Días" timeStyles={classNames?.timeDisplay || ""} />
                <TimeDisplay value={timeLeft.hours} label="Horas" timeStyles={classNames?.timeDisplay || ""} />
                <TimeDisplay value={timeLeft.minutes} label="Minutos" timeStyles={classNames?.timeDisplay || ""} />
                <TimeDisplay value={timeLeft.seconds} label="Segundos" timeStyles={classNames?.timeDisplay || ""} />
            </div>
            <button onClick={addToCalendar} className="px-4 py-2 flex items-center transition font-rubik hover:scale-110 duration-300 hover:bg-white/10 text-neutral-100 rounded-md shadow">
                <LucideCalendar className="w-4 h-4 mr-2" />
                Añadir al calendario
            </button>
        </div>
    );
};

export default LaunchCountdown;
