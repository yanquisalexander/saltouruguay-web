import { type JSX } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import { SimonSaysButtons } from "./games/SimonSaysButtons";
import { playSound, playSoundWithMegaphone, playTick, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { Players } from "../admin/streamer-wars/Players";
import type { TextAnimation, Atmosphere } from "./cinematic/types";
import type { TransitionType } from "./cinematic/transitions";
import type { Mood } from "./cinematic/moods";

// Reutilizamos la interfaz ScriptItem (si está exportada, sino redfínela)
export interface ScriptItem {
    text?: string;
    audioPath?: string;
    duration: number;
    component?: JSX.Element | ((props: any) => JSX.Element);
    omitReverb?: boolean;
    volume?: number;
    execute?: () => void;
    fullScreen?: boolean;
    // --- Nuevos campos cinematográficos (opcionales) ---
    textAnimation?: TextAnimation;
    atmosphere?: Atmosphere;
    transitionIn?: TransitionType;
    letterbox?: boolean;
    shake?: boolean;
    mood?: Mood;
    typewriterSpeed?: number;
}

// Componente para mostrar patrón de ejemplo de Simón Dice
const SimonSaysExample = () => {
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const pattern = ["red", "blue", "green", "yellow"];
        let currentIndex = 0;

        const showNextColor = () => {
            if (currentIndex >= pattern.length) {
                // Reiniciar después de un delay
                timeoutRef.current = window.setTimeout(() => {
                    currentIndex = 0;
                    showNextColor();
                }, 1000);
                return;
            }

            setActiveButton(pattern[currentIndex]);
            timeoutRef.current = window.setTimeout(() => {
                setActiveButton(null);
                currentIndex++;
                timeoutRef.current = window.setTimeout(showNextColor, 200);
            }, 800);
        };

        // Iniciar después de un pequeño delay
        timeoutRef.current = window.setTimeout(showNextColor, 500);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []); // Solo ejecutar una vez al montar

    return (
        <div class="scale-75">
            <SimonSaysButtons
                activeButton={activeButton}
                showingPattern={true}
                onColorShowed={(color: string) => { void playSound({ sound: STREAMER_WARS_SOUNDS.CLICK_SIMON_SAYS }); }}
                onClick={() => { }} // No hacer nada en el ejemplo
            />
        </div>
    );
};

const VoteContinue = ({ players }: { players?: Players[] }) => {
    const TOTAL = players?.filter(p => !p.eliminated).length || 50;
    const [votes, setVotes] = useState(0);
    const [phase, setPhase] = useState<"waiting" | "voting" | "result">("waiting");
    const intervalRef = useRef<number | null>(null);
    const startRef = useRef<number | null>(null);

    useEffect(() => {
        startRef.current = window.setTimeout(() => {
            setPhase("voting");
            let count = 0;
            intervalRef.current = window.setInterval(() => {
                count++;
                setVotes(count);
                if (count === TOTAL || count % 5 === 0) {
                    playTick();
                }
                if (count >= TOTAL) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    window.setTimeout(() => setPhase("result"), 800);
                }
            }, 65);
        }, 1500);

        return () => {
            if (startRef.current) clearTimeout(startRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [TOTAL]);

    return (
        <div class="fixed inset-0 h-dvh w-dvw bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden select-none">
            {/* Large background shapes at very low opacity */}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="grid grid-cols-3 gap-48 opacity-[0.015]">
                    <span class="text-[200px] text-neutral-500 font-atomic-extras">O</span>
                    <span class="text-[200px] text-neutral-500 font-atomic-extras">△</span>
                    <span class="text-[200px] text-neutral-500 font-atomic-extras">□</span>
                </div>
            </div>

            {/* Inner content */}
            <div class="relative flex flex-col items-center">

                {/* Status */}
                <div class="flex items-center gap-2 mb-5">
                    <span class={`size-2 rounded-full ${phase === "waiting" ? "bg-neutral-600" : "bg-[#b4cd02]"} ${phase === "voting" ? "animate-pulse" : ""}`} />
                    <span class="text-xs font-mono tracking-[0.3em] uppercase">
                        {phase === "waiting" && <span class="text-neutral-600">Iniciando votación</span>}
                        {phase === "voting" && <span class="text-[#b4cd02]">Votación en curso</span>}
                        {phase === "result" && <span class="text-[#b4cd02]">Votación finalizada</span>}
                    </span>
                </div>

                {/* Question */}
                <h2 class="text-3xl md:text-4xl font-anton tracking-wider text-white text-center leading-[1.3] mb-2">
                    ¿Desean continuar<br />en el juego?
                </h2>
                <p class="text-xs md:text-sm font-mono text-neutral-600 tracking-wider mb-8">
                    Mayoría decide — jugadores: {TOTAL}
                </p>

                {/* Divider */}
                <div class="w-16 h-px bg-neutral-800 mb-8" />

                {/* Choice buttons — large O and X */}
                <div class="flex gap-16 md:gap-24 mb-10">
                    {/* O — Continue */}
                    <div class="flex flex-col items-center gap-3">
                        <div class={`size-24 md:size-28 rounded-full flex items-center justify-center border-[2.5px] transition-all duration-700
                            ${phase === "waiting"
                                ? "border-neutral-700 bg-neutral-900/30"
                                : "border-[#b4cd02] bg-[#b4cd02]/[0.06] shadow-[0_0_40px_rgba(180,205,2,0.15)]"
                            }`}>
                            <span class={`text-3xl md:text-4xl font-bold transition-colors duration-700
                                ${phase === "waiting" ? "text-neutral-600" : "text-[#b4cd02]"}`}>O</span>
                        </div>
                        <span class="text-[11px] font-mono tracking-[0.25em] text-neutral-500 uppercase">Continuar</span>
                    </div>

                    {/* X — Abandon */}
                    <div class="flex flex-col items-center gap-3">
                        <div class="size-24 md:size-28 rounded-full flex items-center justify-center border-[2.5px] border-neutral-700 bg-neutral-900/30">
                            <span class="text-3xl md:text-4xl font-bold text-neutral-600">X</span>
                        </div>
                        <span class="text-[11px] font-mono tracking-[0.25em] text-neutral-500 uppercase">Abandonar</span>
                    </div>
                </div>

                {/* Tally bars */}
                <div class="w-full max-w-sm space-y-3">
                    {/* O bar */}
                    <div class="flex items-center gap-3">
                        <span class="size-5 rounded-full border-2 border-[#b4cd02] flex items-center justify-center shrink-0">
                            <span class={`size-2 rounded-full bg-[#b4cd02] transition-opacity duration-300 ${votes > 0 ? "opacity-100" : "opacity-0"}`} />
                        </span>
                        <div class="flex-1 h-3 bg-neutral-900 rounded-full overflow-hidden">
                            <div
                                class="h-full rounded-full bg-[#b4cd02] transition-all duration-[50ms] ease-linear"
                                style={{ width: `${(votes / TOTAL) * 100}%` }}
                            />
                        </div>
                        <span class="font-mono text-sm text-neutral-400 w-10 text-right tabular-nums">{votes}</span>
                    </div>

                    {/* X bar */}
                    <div class="flex items-center gap-3">
                        <span class="size-5 rounded-full border-2 border-neutral-700 flex items-center justify-center shrink-0">
                            <span class="text-xs text-neutral-600">✕</span>
                        </span>
                        <div class="flex-1 h-3 bg-neutral-900 rounded-full overflow-hidden">
                            <div class="h-full rounded-full bg-neutral-700 w-0" />
                        </div>
                        <span class="font-mono text-sm text-neutral-600 w-10 text-right tabular-nums">0</span>
                    </div>
                </div>

                {/* Result */}
                {phase === "result" && (
                    <div class="mt-8 text-center animate-fade-in-up">
                        <div class="w-12 h-px bg-neutral-800 mx-auto mb-4" />
                        <p class="text-[11px] font-mono tracking-[0.3em] text-neutral-500 uppercase mb-2">Resultado final</p>
                        <p class="text-2xl md:text-3xl font-anton tracking-wider text-[#b4cd02] drop-shadow-[0_0_12px_rgba(180,205,2,0.3)]">EL JUEGO CONTINÚA</p>
                        <p class="text-[11px] font-mono tracking-[0.2em] text-neutral-600 uppercase mt-2">{TOTAL} votos — unánime</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- REGISTRO DE INSTRUCCIONES ---
// Aquí defines los scripts que se disparan según el ID recibido por Pusher
export const INSTRUCTIONS_REGISTRY: Record<string, ScriptItem[]> = {
    "dalgona-start": [
        {
            text: "Atención jugadores. El siguiente juego es... El Dalgona.",
            audioPath: "instructions/dalgona-intro",
            duration: 5000,
            mood: "warning",
            atmosphere: "scanlines",
            textAnimation: "typewriter",
            transitionIn: "slide-up"
        },
        {
            text: "Tienen 10 minutos para recortar la figura perfecta.",
            audioPath: "instructions/dalgona-rules-1",
            duration: 4000,
            component: <div class="font-atomic text-lime-500 text-6xl animate-pulse">10:00</div>,
            letterbox: true
        },
        {
            text: "Si la galleta se rompe... serán eliminados.",
            audioPath: "instructions/dalgona-rules-2",
            duration: 4000,
            omitReverb: true,
            mood: "danger",
            shake: true,
            atmosphere: "vignette",
            textAnimation: "typewriter"
        },
        {
            text: "¡Comiencen!",
            audioPath: "instructions/begin",
            duration: 2000,
            mood: "triumph",
            transitionIn: "zoom",
            execute: () => {
                // playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION, volume: 0.8 });
            }
        }
    ],
    "emergency-meeting": [
        {
            text: "Reunión de emergencia convocada.",
            audioPath: "instructions/emergency-siren",
            duration: 4000,
            component: <div class="bg-red-600 text-white font-atomic text-4xl px-8 py-4 border-4 border-white animate-bounce">EMERGENCIA</div>,
            mood: "danger",
            atmosphere: "noise",
            shake: true,
            transitionIn: "glitch"
        },
        {
            text: "Todos los jugadores deben dirigirse al centro del mapa.",
            audioPath: "instructions/go-to-center",
            duration: 5000,
            mood: "warning",
            textAnimation: "typewriter"
        }
    ],
    "simon-says": [
        {
            text: "¡Atención! El siguiente minijuego es... ¡Simón Dice!",
            audioPath: "instructions/simon-intro",
            duration: 4000,
            mood: "warning",
            textAnimation: "typewriter",
            transitionIn: "slide-up"
        },
        {
            text: "Observen el patrón que se mostrará a continuación.",
            audioPath: "instructions/simon-watch",
            duration: 3000,
            textAnimation: "typewriter"
        },
        {
            text: "Memoricen la secuencia de colores.",
            audioPath: "instructions/simon-memorize",
            duration: 5000,
            component: <SimonSaysExample key={'simonsaytutorial'} />,
            letterbox: true
        },
        {
            text: "Repitan la secuencia exactamente como se mostró.",
            audioPath: "instructions/simon-repeat",
            duration: 4000,
            transitionIn: "zoom"
        },
        {
            text: "Si fallan... serán eliminados.",
            audioPath: "instructions/simon-fail",
            duration: 3000,
            omitReverb: true,
            mood: "danger",
            shake: true,
            atmosphere: "vignette",
            textAnimation: "typewriter"
        },
        {
            text: "¡Comiencen cuando estén listos!",
            audioPath: "instructions/begin",
            duration: 2000,
            mood: "triumph",
            transitionIn: "zoom",
            execute: () => {
                // playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION, volume: 0.8 });
            }
        }
    ],
    "vote-continue": [
        {
            audioPath: "inmersive-bg-audio/vote-continue",
            duration: 500, // Música de fondo que dura toda la secuencia
            volume: 0.3,
        },
        {
            text: "El juego continuará sólo si la mayoría lo decide.",
            audioPath: "instructions/vote-intro",
            duration: 4000,
            atmosphere: "scanlines",
            textAnimation: "typewriter",
            transitionIn: "slide-up",
            execute: () => {
                playSoundWithMegaphone({ sound: STREAMER_WARS_SOUNDS.PROBLEMAS_TECNICOS, volume: 0.8 });
            }
        },
        {
            text: "Presionen círculo para continuar... o X para abandonar.",
            audioPath: "instructions/vote-choose",
            duration: 8000,
            fullScreen: true,
            mood: "danger",
            atmosphere: "vignette",
            component: <VoteContinue />
        },
        {
            text: "Los votos han sido contados.",
            audioPath: "instructions/vote-result",
            duration: 3500,
            transitionIn: "flash"
        },
        {
            text: "Decisión unánime. El juego continúa.",
            audioPath: "instructions/vote-unanimous",
            duration: 4000,
            omitReverb: true,
            mood: "triumph",
            textAnimation: "typewriter"
        }
    ]
};


