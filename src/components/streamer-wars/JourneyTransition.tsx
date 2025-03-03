import { CDN_PREFIX, playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { cloneElement, type JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { toast } from "sonner";
import type { Players } from "../admin/streamer-wars/Players";
import { actions } from "astro:actions";

const CreditsRoll = ({ duration, players }: { duration: number, players?: Players[] }) => {
    const MODERATORS = ["TitoLeproso", "BradTerra", "xDiegoUY", "tapitabal"];
    const CONDUCTOR_NAME = "JulianMartinR";
    const PROGRAMMERS = ["Alexitoo_UY"];
    const DIRECTOR_AND_CREATOR = "SaltoUruguayServer";

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            const fullHeight = container.scrollHeight;
            const viewportHeight = window.innerHeight;

            container.animate(
                [
                    { transform: `translateY(${viewportHeight}px)` },
                    { transform: `translateY(-${fullHeight}px)` }
                ],
                {
                    duration: duration,
                    easing: "linear",
                    iterations: 1,
                    fill: "forwards"
                }
            );
        }
    }, [duration]);

    return (
        <div
            class="absolute inset-0 z-[9999] flex justify-center bg-black pointer-events-none animate-fade-in"
            style={{ animationDuration: "2000ms" }}
        >
            {/* El contenedor visible, que actúa como la ventana */}
            <div class="relative overflow-hidden w-full max-w-2xl flex justify-center">
                {/* Contenedor interno que es el que realmente scrollea */}
                <div
                    ref={containerRef}
                    class="flex flex-col items-center space-y-8 text-center text-neutral-300"
                >
                    <h2 class="font-atomic text-lime-500 text-4xl mt-12">Créditos</h2>

                    <div class="flex flex-col items-center space-y-2">
                        <h3 class="font-atomic text-neutral-400 text-2xl">Moderadores</h3>
                        <ul class="flex flex-wrap justify-center gap-x-4">
                            {MODERATORS.map((mod) => (
                                <li class="font-mono text-neutral-300 text-xl">{mod}</li>
                            ))}
                        </ul>
                    </div>

                    <div class="flex flex-col items-center space-y-2">
                        <h3 class="font-atomic text-neutral-400 text-2xl">Conductor</h3>
                        <span class="font-mono text-neutral-300 text-xl">{CONDUCTOR_NAME}</span>
                    </div>

                    <div class="flex flex-col items-center space-y-2">
                        <h3 class="font-atomic text-neutral-400 text-2xl">Programadores</h3>
                        <ul class="flex flex-wrap justify-center gap-x-4">
                            {PROGRAMMERS.map((prog) => (
                                <li class="font-mono text-neutral-300 text-xl">{prog}</li>
                            ))}
                        </ul>
                    </div>

                    <div class="flex flex-col items-center space-y-2">
                        <h3 class="font-atomic text-neutral-400 text-2xl">Director y Creador</h3>
                        <span class="font-mono text-neutral-300 text-xl">{DIRECTOR_AND_CREATOR}</span>
                    </div>

                    {
                        players && (
                            <div class="flex flex-col items-center space-y-2">
                                <h3 class="font-atomic text-neutral-400 text-2xl">Jugadores</h3>
                                <ul class="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {players.map((player) => (
                                        <li class="font-mono text-neutral-300 text-xl">{player.displayName}</li>
                                    ))}
                                </ul>
                            </div>
                        )
                    }

                    {/* Espaciador final para terminar el scroll más suavemente */}
                    <div class="h-64"></div>
                </div>
            </div>
        </div>
    );
}


interface ScriptItem {
    text?: string;
    audioPath?: string;
    duration: number;
    component?: JSX.Element | ((props: any) => JSX.Element);
    omitReverb?: boolean;
    volume?: number;
    execute?: () => void;
}

interface JourneyTransitionProps {
    phase: "start" | "finish";
    executeOnMount?: () => void;
    players?: Players[]
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

let TODAY_ELIMINATEDS: number[] = []
//component: <div class="animate-fade-in font-atomic text-lime-500 tracking-widest">¡Comienza la Guerra de Streamers!</div>

// Ejemplos de definición (ajusta texto, audioPath y duration según necesites)
export const JOURNEY_START_SCRIPT: ScriptItem[] = [
    { duration: 3200, omitReverb: true },
    { text: "Bienvenidos, jugadores finalistas.", audioPath: "day3-start-1", duration: 4000 },
    { text: "En el comienzo, ustedes eran 50 jugadores.", audioPath: "day3-start-2", duration: 4000 },
    { text: "Streamers, llenos de deudas, con muchas horas frente a la pantalla, y con sueños de grandeza.", audioPath: "day3-start-3", duration: 7000 },
    {
        text: "Hoy, solo quedan 16 de ustedes.", audioPath: "day3-start-4", duration: 4000,
        component: <ReverseCountUp target={16} initial={50} duration={3000} />
    },
    { text: "34 jugadores fueron eliminados.", audioPath: "day3-start-5", duration: 4500, component: <span class="font-atomic text-neutral-400 text-3xl py-2 animate-zoom-in animate-duration-800">34 Jugadores eliminados</span> },
    { text: "Vosotros tenéis suerte de haber llegado hasta aquí.", audioPath: "day3-start-6", duration: 4000 },
    {
        text: "Pero solo uno de ustedes será el vencedor.", audioPath: "day3-start-7", duration: 3800,
        /* 
            List of players
        */
        component: ({ players }: { players: Players[] }) => {
            return (
                /* 
                    Gradient on laterals from transparent to black
                */
                <ul class="flex w-full max-w-4xl mb-12 overflow-scroll gap-x-4 flex-wrap justify-center mt-4" style={
                    {
                        scrollbarWidth: "none",
                        scrollbarColor: "transparent transparent",
                        scrollbarTrackColor: "transparent",
                        scrollSnapType: "x mandatory",
                        background: "linear-gradient(to right, transparent, black), linear-gradient(to left, transparent, black)",
                        padding: "0 1rem",
                        borderRadius: "0.5rem"
                    }}>
                    {players?.filter(player => !player.eliminated).map((player: Players) => (
                        <li class="flex flex-col items-center space-y-2">
                            <img src={player.avatar} alt="" class="grayscale-[20%] size-7 rounded-md" />
                            <span class="font-mono text-neutral-400 text-lg">#{player.playerNumber.toString().padStart(3, "0")}</span>
                        </li>
                    ))}
                </ul>
            );
        }
    },


    { text: "Mucha suerte, jugadores, la necesitarán.", audioPath: "day3-start-8", duration: 4600 },


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
    {
        duration: 3000, execute: () => actions.streamerWars.getTodayEliminatedPlayers().then(({ data }) => {
            TODAY_ELIMINATEDS = data?.todayEliminatedPlayers || [];
            console.log("Today eliminated players", TODAY_ELIMINATEDS);
        })
    },
    {
        text: "Después de días de batallas, traiciones y estrategias...",
        audioPath: "day3-finish-1", duration: 5000,
    },
    {
        text: "Hoy, hemos llegado al final de esta guerra.",
        audioPath: "day3-finish-2", duration: 4000,
    },
    {
        text: "Cincuenta streamers comenzaros este viaje, cada uno con un sueño... y con miedo a perderlo todo.",
        audioPath: "day3-finish-3", duration: 8200
    },
    {
        text: "Hoy, solo uno de ustedes es coronado como el campeón de la Guerra de Streamers: Edición Extrema.",
        audioPath: "day3-finish-4", duration: 7000
    },
    {
        text: "¡Felicidades al ganador! ¡Y gracias a todos los participantes por ser parte de esta experiencia!",
        audioPath: "day3-finish-5", duration: 8000,
        /* 
        */

        component: ({ players }: { players: Players[] }) => {
            const winner = players.filter(player => !player.eliminated && player.playerNumber < 50 && !TODAY_ELIMINATEDS.includes(player.playerNumber))[0];
            return (
                <div class="flex flex-col items-center space-y-4 pb-28">
                    <img src={winner?.avatar} alt="" class="size-20 rounded-md" />
                    <span class="font-mono text-neutral-400 text-lg">#{winner?.playerNumber.toString().padStart(3, "0")}</span>
                    <span class="font-atomic text-lime-500 text-3xl">¡{winner?.displayName}!</span>
                </div>
            );
        }
    },

    { duration: 28000, omitReverb: true, audioPath: "credit-roll-2", volume: 0.7, component: ({ players }: { players: Players[] }) => <CreditsRoll duration={32000} players={players} /> },


    /* component: ({ players }: { players: Players[] }) => (
         
 
                <ul class="grid grid-cols-5 gap-4 mb-32">
                {players?.filter(player => TODAY_ELIMINATEDS.includes(player.playerNumber)).map((player: Players, index) => (
                    <li class="flex flex-col items-center justify-center relative size-20 animate-fade-in-up duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <img src={player.avatar} alt="" class="grayscale size-12" />
                        <span class="font-mono text-neutral-400 text-lg">#{player.playerNumber.toString().padStart(3, "0")}</span>
                        <span class="absolute inset-0 bg-black bg-opacity-50 font-atomic text-red-500 text-3xl aspect-square flex items-center justify-center">
                            X
                        </span>
                    </li>
                ))}
            </ul>
        ) */
];

export const CURRENT_DAY = 3;

const START_SCRIPT_FIRST_AUDIO_DELAY = 0;
const FINISH_SCRIPT_FIRST_AUDIO_DELAY = 0;

const PRELOAD_SOUNDS = () => {
    const allSounds = [...JOURNEY_START_SCRIPT, ...JOURNEY_FINISH_SCRIPT].map((item) => item.audioPath);
    allSounds.forEach((sound) => {
        if (!sound) return;
        console.log("Preloading sound", sound);
        const audio = new Audio(`${CDN_PREFIX}scripts/${sound}.mp3`);
        audio.preload = "auto";
    });

    const bgAudioFile = "day3-bg-start";
    const bgAudio = new Audio(`${CDN_PREFIX}scripts/${bgAudioFile}.mp3`);
    bgAudio.preload = "auto";

}

export const JourneyTransition = ({ phase, executeOnMount, players }: JourneyTransitionProps) => {
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

    const isCreditsRoll = phase === "finish" && currentIndex === script.length - 1;

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
                const bgAudioFile = phase === "start" ? "day3-bg-start" : "day3-bg-finish";
                playSound({ sound: `scripts/${bgAudioFile}`, volume: 0.28 });
                const firstDelay =
                    phase === "start" ? START_SCRIPT_FIRST_AUDIO_DELAY : FINISH_SCRIPT_FIRST_AUDIO_DELAY;
                timeoutId = window.setTimeout(() => {
                    setCurrentIndex(index);
                    const item = script[index];
                    if (item.audioPath) {
                        if (item.omitReverb) {
                            playSound({ sound: `scripts/${item.audioPath}`, volume: item.volume || 1 });
                        } else {
                            playSoundWithReverb({ sound: `scripts/${item.audioPath}`, volume: item.volume || 1, reverbAmount: phase === "start" ? 0.2 : 0.5 });
                        }
                    }
                    // Agregar la ejecución si existe
                    if (item.execute) {
                        item.execute();
                    }
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

    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);




    return (
        <div
            className={`fixed inset-0 bg-black ${isCreditsRoll ? "" : "flex"} min-h-screen h-full flex-col justify-center items-center z-[9000] transition-opacity duration-500 ${fadeClass}`}
        > <div className="fixed font-mono top-0 right-8 mt-6 text-lg text-gray-300 z-[10001]">
                {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>
            <div className="p-8 backdrop-blur-sm text-white text-center">
                <header>
                    <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                        {phase === "start" ? `Día #0${CURRENT_DAY}` : `Día #0${CURRENT_DAY} finalizado`}
                    </h1>
                </header>
                {script[currentIndex]?.component && (() => {
                    return (
                        <div className={`mt-8 ${isCreditsRoll ? "fixed inset-0 z-[9999] h-screen w-full" : ""}`}>
                            {/* 
                            Pass props to the component here
                            */}
                            {typeof script[currentIndex].component === "function"
                                ? cloneElement(script[currentIndex].component({ players }), { key: currentIndex })
                                : cloneElement(script[currentIndex].component as JSX.Element, { key: currentIndex })}
                        </div>
                    );
                })()}
            </div>
            {
                script[currentIndex]?.text && (
                    <div className="absolute bottom-56 w-max max-w-full md:max-w-[60ch] px-4 font-mono text-center bg-neutral-900 text-white text-lg">
                        {script[currentIndex]?.text}
                    </div>
                )
            }

            {
                !isCreditsRoll && (
                    <h2 className="z-[9998!important] text-2xl fixed bottom-16 inset-x-0 font-atomic text-center mx-auto text-neutral-500 select-none -skew-y-6">
                        <span className="tracking-wider">Guerra de Streamers</span>
                    </h2>
                )
            }


            <span className="fixed bottom-32 text-5xl opacity-30 rotate-[32deg] select-none right-16 font-atomic-extras">
                &#x0055;
            </span>
            <span className="fixed bottom-48 text-5xl opacity-30 rotate-[-16deg] select-none left-16 font-atomic-extras">
                &#x0050;
            </span>
        </div>
    );
};
