import { playSound, playSoundWithReverb } from "@/consts/Sounds";
import { useEffect, useState } from "preact/hooks";

interface ScriptItem {
    text: string;
    audioPath: string;
    duration: number;
}

interface JourneyTransitionProps {
    phase: "start" | "finish";
    executeOnMount?: () => void;
}

// Ejemplos de definición (ajusta texto, audioPath y duration según necesites)
export const JOURNEY_START_SCRIPT: ScriptItem[] = [
    { text: "Bienvenidos a la jornada", audioPath: "start-1", duration: 3000 },
    { text: "Prepárense para lo que viene", audioPath: "start-2", duration: 3000 },
];

export const JOURNEY_FINISH_SCRIPT: ScriptItem[] = [
    { text: "Gracias por haber participado de esta jornada", audioPath: "finish-1", duration: 3200 },
    { text: "Tienes suerte de haber sobrevivido", audioPath: "finish-2", duration: 3000 },
    { text: "¡Nos vemos en la siguiente!", audioPath: "finish-3", duration: 3000 },
    { text: "(si es que no te eliminan antes)", audioPath: "finish-4", duration: 3200 },
];

const CURRENT_DAY = 1;

const START_SCRIPT_FIRST_AUDIO_DELAY = 1000;
const FINISH_SCRIPT_FIRST_AUDIO_DELAY = 1000;

export const JourneyTransition = ({ phase, executeOnMount }: JourneyTransitionProps) => {
    // Selecciona el script según la fase
    const script: ScriptItem[] = phase === "start" ? JOURNEY_START_SCRIPT : JOURNEY_FINISH_SCRIPT;

    // Estado para controlar la visibilidad global (para desmontar el componente)
    const [isVisible, setIsVisible] = useState(true);
    // Estado para la clase de fade in/out
    const [fadeClass, setFadeClass] = useState("animate-fade-in");
    // Estado para llevar el índice del item actual (para mostrar el subtítulo)
    const [currentIndex, setCurrentIndex] = useState(0);


    const totalDuration = script.reduce((acc, item) => acc + item.duration, 0);
    const [remainingTime, setRemainingTime] = useState(totalDuration / 1000);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setRemainingTime((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    // @ts-ignore
                    clearInterval(intervalId);
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => {
            // @ts-ignore
            clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (executeOnMount) {
            executeOnMount();
        }

        let timeoutId: number | undefined;

        const playItem = (index: number) => {
            if (index >= script.length) {
                // Cuando se terminan los ítems: inicia el fade out y despacha el evento
                setFadeClass("animate-fade-out opacity-0");
                timeoutId = window.setTimeout(() => {
                    document.dispatchEvent(new CustomEvent("journey-transition-ended"));
                    setIsVisible(false);
                }, 500); // 500 ms para que se vea la animación de fade out
                return;
            }

            // Si es el primer sonido, esperar el retraso definido antes de comenzar
            if (index === 0) {
                const bgAudioFile = phase === "start" ? "start-bg" : "finish-bg";
                playSound({ sound: `scripts/${bgAudioFile}`, volume: 0.4 });
                const firstDelay =
                    phase === "start" ? START_SCRIPT_FIRST_AUDIO_DELAY : FINISH_SCRIPT_FIRST_AUDIO_DELAY;
                timeoutId = window.setTimeout(() => {
                    // Ahora se procesa el primer ítem
                    setCurrentIndex(index);
                    const item = script[index];
                    if (item.audioPath) {
                        playSoundWithReverb({ sound: `scripts/${item.audioPath}`, volume: 1 });
                    }
                    // Después de la duración indicada, pasa al siguiente ítem
                    timeoutId = window.setTimeout(() => {
                        playItem(index + 1);
                    }, item.duration);
                }, firstDelay);
                return;
            }

            // Para los siguientes ítems (índice > 0), se procede normalmente:
            setCurrentIndex(index);
            const item = script[index];
            if (item.audioPath) {
                playSoundWithReverb({ sound: `scripts/${item.audioPath}`, volume: 0.5 });
            }
            timeoutId = window.setTimeout(() => {
                playItem(index + 1);
            }, item.duration);
        };


        playItem(0);

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [phase, script, executeOnMount]);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 bg-black flex flex-col justify-center items-center z-[9000] transition-opacity duration-500 ${fadeClass}`}
        > <div className="fixed font-mono top-0 right-8 mt-6 text-lg text-gray-300">
                00:{Math.round(remainingTime).toString().padStart(2, "0")}
            </div>
            <div className="p-8 backdrop-blur-sm text-white text-center">
                <header>
                    <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                        {phase === "start" ? `Día #0${CURRENT_DAY}` : `Día #0${CURRENT_DAY} finalizado`}
                    </h1>
                </header>
            </div>
            <div className="absolute bottom-56 w-max px-4 font-mono text-center bg-neutral-900 text-white text-lg">
                {script[currentIndex]?.text}
            </div>
            <h2 className="text-2xl fixed bottom-16 font-atomic text-neutral-500 select-none -skew-y-6">
                <span className="tracking-wider">Guerra de Streamers</span>
            </h2>
            <span className="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">
                &#x0055;
            </span>
            <span className="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">
                &#x0050;
            </span>
        </div>
    );
};
