import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { $ } from "@/lib/dom-selector";
import {
    atcb_action,
    type ATCBActionEventConfig,
} from "add-to-calendar-button";
import { DateTime } from "luxon";
import { LucideCalendar } from "lucide-preact";

interface CountdownProps {
    timestamp: number; // Timestamp en milisegundos
    eventName?: string; // Nombre del evento
    eventDescription?: string; // Descripción del evento
    showCalendarButton?: boolean; // Mostrar botón de calendario
    classNames?: {
        container?: string;
        timeDisplay?: string;
        calendarButton?: string;
        block?: string;
        label?: string;
    };
}

const TimeDisplay = ({ value, label, timeStyles, blockStyles, labelStyles }: { value: number, label: string, timeStyles?: string, blockStyles?: string, labelStyles?: string }) => (
    <div className={`text-center flex flex-col items-center justify-center ${blockStyles || 'space-y-2 aspect-square'}`}>
        <div className={`text-4xl font-medium italic font-anton text-yellow-500 tabular-nums ${timeStyles}`}>
            {value.toString().padStart(2, "0")}
        </div>
        <div className={`text-gray-400 ${labelStyles || ''}`}>{label}</div>
    </div>
);

const LaunchCountdown = ({
    timestamp,
    eventName = "✨ SaltoCraft III",
    eventDescription = "¡Se viene la aventura!",
    showCalendarButton = false,
    classNames,
    ...props
}: CountdownProps & h.JSX.HTMLAttributes<HTMLDivElement>) => {
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

        // @ts-expect-error Bad type
        return () => clearInterval(timer);
    }, [timestamp]);

    const handleAddToCalendar = () => {
        const launchDate = new Date(timestamp);
        const config: ATCBActionEventConfig = {
            name: eventName,
            description: eventDescription + "\n\nEntra a Twitch y no te lo pierdas → [url]https://twitch.tv/SaltoUruguayServer[/url]",
            startDate: DateTime.fromJSDate(launchDate).toFormat("yyyy-LL-dd"),
            startTime: DateTime.fromJSDate(launchDate).toFormat("HH:mm"),
            endDate: DateTime.fromJSDate(launchDate)
                .plus({ hours: 2 })
                .toFormat("yyyy-LL-dd"),
            endTime: DateTime.fromJSDate(launchDate)
                .plus({ hours: 2 })
                .toFormat("HH:mm"),
            location: "Twitch",
            options: ["Google", "Apple"],
            timeZone: "America/Montevideo",
            iCalFileName: `${eventName.replace(/\s+/g, "_")}.ics`,
            hideBranding: true,
        };

        atcb_action?.(config);
    };

    return (
        <div
            className={`flex flex-col items-center space-y-4 mt-8 ${props.class}`}
            {...props}
            data-launch-timestamp={timestamp}
        >
            <div className={`flex space-x-6 justify-center ${classNames?.container || ''}`}>
                <TimeDisplay value={timeLeft.days} label="Días" timeStyles={classNames?.timeDisplay} blockStyles={classNames?.block} labelStyles={classNames?.label} />
                <TimeDisplay value={timeLeft.hours} label="Horas" timeStyles={classNames?.timeDisplay} blockStyles={classNames?.block} labelStyles={classNames?.label} />
                <TimeDisplay value={timeLeft.minutes} label="Minutos" timeStyles={classNames?.timeDisplay} blockStyles={classNames?.block} labelStyles={classNames?.label} />
                <TimeDisplay value={timeLeft.seconds} label="Segundos" timeStyles={classNames?.timeDisplay} blockStyles={classNames?.block} labelStyles={classNames?.label} />
            </div>

            {
                showCalendarButton && (

                    <button
                        className={`
                    px-4 py-2 mt-4 flex items-center transition font-rubik 
                    hover:scale-110 duration-300 hover:bg-white/10 
                    text-neutral-100 rounded-md shadow
                    ${classNames?.calendarButton || ''}
                `}
                        aria-label="Agregar al calendario"
                        title="Agregar al calendario"
                        type="button"
                        onClick={handleAddToCalendar}
                    >
                        <LucideCalendar className="h-5 w-5 mr-2" />
                        <span>Agregar al calendario</span>
                    </button>
                )
            }
        </div>
    );
};

export default LaunchCountdown;