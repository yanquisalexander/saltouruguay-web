import { CDN_PREFIX, playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";


interface ScriptItem {
    text: string;
    audioPath?: string;
    duration: number;
    component?: JSX.Element;
    omitReverb?: boolean;
    execute?: () => void;
}

interface JourneyTransitionProps {
    phase: "start" | "finish";
    executeOnMount?: () => void;
}

const ReverseCountUp = ({ target, initial, duration }: { target: number; initial: number; duration: number }) => {
    const [current, setCurrent] = useState(initial);

    useEffect(() => {
        let startTime = performance.now();
        let frame: number;

        const step = (timestamp: number) => {
            let progress = Math.min((timestamp - startTime) / duration, 1);
            let value = Math.round(initial - progress * (initial - target));

            setCurrent(value);

            if (progress < 1) {
                frame = requestAnimationFrame(step);
            }
        };

        frame = requestAnimationFrame(step);

        return () => cancelAnimationFrame(frame);
    }, [target, initial, duration]);

    return <span class="font-atomic text-lime-500 text-3xl py-2 border-y-4 border-lime-500">{current} Jugadores restantes</span>;
};


//component: <div class="animate-fade-in font-atomic text-lime-500 tracking-widest">¡Comienza la Guerra de Streamers!</div>

// Ejemplos de definición (ajusta texto, audioPath y duration según necesites)
export const JOURNEY_START_SCRIPT: ScriptItem[] = [
    { text: "*[Estática]* Los juegos están listos, mi señor", audioPath: "day2-start-1", duration: 3200, omitReverb: true },
    { text: "50 jugadores comenzaron este juego.", audioPath: "day2-start-2", duration: 3500 },
    { text: "Ahora, solo quedan 32.", audioPath: "day2-start-3", duration: 3500, component: <ReverseCountUp target={32} initial={50} duration={3000} /> },
    { text: "Dieciocho fueron eliminados.", audioPath: "day2-start-4", duration: 4500, component: <span class="font-atomic text-neutral-400 text-3xl py-2 animate-zoom-in animate-duration-800">18 Jugadores eliminados</span> },
    { text: "Algunos lo vieron venir... otros, nunca lo esperaron.", audioPath: "day2-start-5", duration: 5000 },
    { text: "Pero la Guerra apenas comienza.", audioPath: "day2-start-6", duration: 3500 },
    { text: "Las alianzas se rompen, las traiciones se revelan.", audioPath: "day2-start-7", duration: 4500 },
    { text: "¿Quién será el próximo en caer?", audioPath: "day2-start-8", duration: 3000 },
    { text: "Solo el tiempo lo dirá...", audioPath: "day2-start-9", duration: 3200 },


    {
        text: "Atención, jugadores!. Sigan las instrucciones cuidadosamente. Estamos a punto de comenzar. ", audioPath: "day2-start-10", duration: 8000, execute: () => {
            setTimeout(() => {
                playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION, volume: 0.5 });
                toast.warning("¡Comienza la Guerra de Streamers!", {
                    description: "Procura estar atento a Discord y a las notificaciones del juego.",
                    richColors: true,
                    duration: 10000,
                    position: "bottom-center",
                    dismissible: true,

                });

            }, 8200);
        }
    }
];


export const JOURNEY_FINISH_SCRIPT: ScriptItem[] = [
    { text: "Gracias por haber participado de esta jornada", audioPath: "finish-1", duration: 3200 },
    { text: "Tienes suerte de haber sobrevivido", audioPath: "finish-2", duration: 3000 },
    { text: "¡Nos vemos en la siguiente!", audioPath: "finish-3", duration: 3000 },
    { text: "(si es que no te eliminan antes)", audioPath: "finish-4", duration: 3200 },
];

export const CURRENT_DAY = 2;

const START_SCRIPT_FIRST_AUDIO_DELAY = 0;
const FINISH_SCRIPT_FIRST_AUDIO_DELAY = 1000;

const PRELOAD_SOUNDS = () => {
    const allSounds = [...JOURNEY_START_SCRIPT, ...JOURNEY_FINISH_SCRIPT].map((item) => item.audioPath);
    allSounds.forEach((sound) => {
        if (!sound) return;
        console.log("Preloading sound", sound);
        const audio = new Audio(`${CDN_PREFIX}scripts/${sound}.mp3`);
        audio.preload = "auto";
    });

    const bgAudioFile = "day2-bg-start";
    const bgAudio = new Audio(`${CDN_PREFIX}scripts/${bgAudioFile}.mp3`);
    bgAudio.preload = "auto";

}

export const JourneyTransition = ({ phase, executeOnMount }: JourneyTransitionProps) => {
    // Selecciona el script según la fase
    const script: ScriptItem[] = phase === "start" ? JOURNEY_START_SCRIPT : JOURNEY_FINISH_SCRIPT;

    // Precarga los sonidos
    useEffect(() => {
        PRELOAD_SOUNDS();
    }, []);

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
                const bgAudioFile = phase === "start" ? "day2-bg-start" : "day2-bg-finish";
                playSound({ sound: `scripts/${bgAudioFile}`, volume: phase === "start" ? 0.3 : 0.4 });
                const firstDelay =
                    phase === "start" ? START_SCRIPT_FIRST_AUDIO_DELAY : FINISH_SCRIPT_FIRST_AUDIO_DELAY;
                timeoutId = window.setTimeout(() => {
                    // Ahora se procesa el primer ítem
                    setCurrentIndex(index);
                    const item = script[index];
                    if (item.audioPath) {
                        if (item.omitReverb) {
                            playSound({ sound: `scripts/${item.audioPath}`, volume: 1 });
                        } else {
                            playSoundWithReverb({ sound: `scripts/${item.audioPath}`, volume: 1, reverbAmount: phase === "start" ? 0.2 : 0.5 });
                        }
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
                if (item.omitReverb) {
                    playSound({ sound: `scripts/${item.audioPath}`, volume: 1 });
                } else {
                    playSoundWithReverb({ sound: `scripts/${item.audioPath}`, volume: 1 });
                }
            }

            if (item.execute) {
                item.execute();
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
                {script[currentIndex]?.component && (
                    <div className="mt-8">
                        {script[currentIndex].component}
                    </div>
                )}
            </div>
            <div className="absolute bottom-56 w-max max-w-full md:max-w-[60ch] px-4 font-mono text-center bg-neutral-900 text-white text-lg">
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
