import { type JSX } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import { SimonSaysButtons } from "./games/SimonSaysButtons";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import type { Players } from "../admin/streamer-wars/Players";

// Reutilizamos la interfaz ScriptItem (si está exportada, sino redfínela)
export interface ScriptItem {
    text?: string;
    audioPath?: string;
    duration: number;
    component?: JSX.Element | ((props: any) => JSX.Element);
    omitReverb?: boolean;
    volume?: number;
    execute?: () => void;
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
    const [count, setCount] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const intervalRef = useRef<number | null>(null);

    const TOTAL = players?.filter(p => !p.eliminated).length || 50;

    useEffect(() => {
        const startDelay = setTimeout(() => {
            const steps = 60;
            const duration = 1800;
            const interval = duration / steps;

            intervalRef.current = window.setInterval(() => {
                setCount(prev => {
                    const next = Math.min(prev + Math.ceil(TOTAL / steps), TOTAL);
                    if (next >= TOTAL) {
                        clearInterval(intervalRef.current!);
                        setTimeout(() => setShowResult(true), 400);
                    }
                    return next;
                });
            }, interval);
        }, 1000);

        return () => {
            clearTimeout(startDelay);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div style={{
            background: "#0a0a0a",
            minHeight: "480px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2.5rem 1.5rem",
            fontFamily: "'Noto Serif KR', serif",
            position: "relative",
        }}>
            {/* Diamond */}
            <div style={{
                width: 14, height: 14,
                background: "#e31b5a",
                transform: "rotate(45deg)",
                marginBottom: "1.5rem"
            }} />

            {/* Label */}
            <div style={{
                fontSize: 11,
                letterSpacing: "0.35em",
                color: "#e31b5a",
                textTransform: "uppercase",
                marginBottom: "0.6rem",
                fontFamily: "monospace"
            }}>
                <span style={{
                    display: "inline-block",
                    width: 5, height: 5,
                    borderRadius: "50%",
                    background: "#e31b5a",
                    marginRight: 7,
                    verticalAlign: "middle",
                    animation: "blink 1.1s infinite"
                }} />
                Votación en curso
            </div>

            {/* Title */}
            <div style={{
                fontSize: 26,
                fontWeight: 300,
                color: "#f0ece0",
                textAlign: "center",
                letterSpacing: "0.05em",
                marginBottom: "0.4rem",
                lineHeight: 1.4
            }}>
                ¿Desean continuar<br />en el juego?
            </div>

            <div style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: "0.12em",
                marginBottom: "2.5rem",
                fontFamily: "monospace"
            }}>
                Mayoría decide — jugadores: {TOTAL}
            </div>

            <div style={{ width: 60, height: 1, background: "#333", marginBottom: "2rem" }} />

            {/* Buttons */}
            <div style={{ display: "flex", gap: "3.5rem", marginBottom: "2.5rem" }}>
                {/* Circle */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                        width: 80, height: 80,
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid #3a8fd1",
                        background: "rgba(58,143,209,0.06)"
                    }}>
                        <svg width={38} height={38} viewBox="0 0 38 38" fill="none">
                            <circle cx="19" cy="19" r="13" stroke="#3a8fd1" strokeWidth="2.5" />
                        </svg>
                    </div>
                    <span style={{ fontSize: 11, letterSpacing: "0.25em", color: "#555", fontFamily: "monospace", textTransform: "uppercase" }}>
                        Continuar
                    </span>
                </div>

                {/* Cross */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                        width: 80, height: 80,
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid #e31b5a",
                        background: "rgba(227,27,90,0.06)"
                    }}>
                        <svg width={38} height={38} viewBox="0 0 38 38" fill="none">
                            <line x1="11" y1="11" x2="27" y2="27" stroke="#e31b5a" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="27" y1="11" x2="11" y2="27" stroke="#e31b5a" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span style={{ fontSize: 11, letterSpacing: "0.25em", color: "#555", fontFamily: "monospace", textTransform: "uppercase" }}>
                        Abandonar
                    </span>
                </div>
            </div>

            {/* Tally */}
            <div style={{ width: "100%", maxWidth: 320 }}>
                {/* Continue bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                        <circle cx="11" cy="11" r="7" stroke="#3a8fd1" strokeWidth="1.8" />
                    </svg>
                    <div style={{ flex: 1, height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                            height: "100%",
                            borderRadius: 2,
                            background: "#3a8fd1",
                            width: `${(count / TOTAL) * 100}%`,
                            transition: "width 0.05s linear"
                        }} />
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#555", minWidth: 32, textAlign: "right" }}>
                        {count}
                    </span>
                </div>

                {/* Leave bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                        <line x1="6" y1="6" x2="16" y2="16" stroke="#e31b5a" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="16" y1="6" x2="6" y2="16" stroke="#e31b5a" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <div style={{ flex: 1, height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: "#e31b5a", width: "0%" }} />
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#555", minWidth: 32, textAlign: "right" }}>0</span>
                </div>
            </div>

            {/* Result */}
            {showResult && (
                <div style={{ marginTop: "1.8rem", textAlign: "center" }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "#555", fontFamily: "monospace", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                        resultado final
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 400, color: "#f0ece0", letterSpacing: "0.08em" }}>
                        El juego <span style={{ color: "#3a8fd1", fontWeight: 700 }}>continúa</span>
                    </div>
                    <div style={{ marginTop: "0.35rem", fontSize: 11, color: "#444", letterSpacing: "0.2em", fontFamily: "monospace", textTransform: "uppercase" }}>
                        {TOTAL} votos — unánime
                    </div>
                </div>
            )}
        </div>
    );
};

// --- REGISTRO DE INSTRUCCIONES ---
// Aquí defines los scripts que se disparan según el ID recibido por Pusher
export const INSTRUCTIONS_REGISTRY: Record<string, ScriptItem[]> = {
    "dalgona-start": [
        {
            text: "Atención jugadores. El siguiente juego es... El Dalgona.",
            audioPath: "instructions/dalgona-intro", // Asegúrate de tener estos audios o cambia el path
            duration: 5000
        },
        {
            text: "Tienen 10 minutos para recortar la figura perfecta.",
            audioPath: "instructions/dalgona-rules-1",
            duration: 4000,
            component: <div class="font-atomic text-lime-500 text-6xl animate-pulse">10:00</div>
        },
        {
            text: "Si la galleta se rompe... serán eliminados.",
            audioPath: "instructions/dalgona-rules-2",
            duration: 4000,
            omitReverb: true
        },
        {
            text: "¡Comiencen!",
            audioPath: "instructions/begin",
            duration: 2000,
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
            component: <div class="bg-red-600 text-white font-atomic text-4xl px-8 py-4 border-4 border-white animate-bounce">EMERGENCIA</div>
        },
        {
            text: "Todos los jugadores deben dirigirse al centro del mapa.",
            audioPath: "instructions/go-to-center",
            duration: 5000
        }
    ],
    "simon-says": [
        {
            text: "¡Atención! El siguiente minijuego es... ¡Simón Dice!",
            audioPath: "instructions/simon-intro",
            duration: 4000
        },
        {
            text: "Observen el patrón que se mostrará a continuación.",
            audioPath: "instructions/simon-watch",
            duration: 3000
        },
        {
            text: "Memoricen la secuencia de colores.",
            audioPath: "instructions/simon-memorize",
            duration: 5000,
            component: <SimonSaysExample key={'simonsaytutorial'} />
        },
        {
            text: "Repitan la secuencia exactamente como se mostró.",
            audioPath: "instructions/simon-repeat",
            duration: 4000
        },
        {
            text: "Si fallan... serán eliminados.",
            audioPath: "instructions/simon-fail",
            duration: 3000,
            omitReverb: true
        },
        {
            text: "¡Comiencen cuando estén listos!",
            audioPath: "instructions/begin",
            duration: 2000,
            execute: () => {
                // playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION, volume: 0.8 });
            }
        }
    ],
    "vote-continue": [
        {
            text: "El juego continuará sólo si la mayoría lo decide.",
            audioPath: "instructions/vote-intro",
            duration: 4000,
            execute: () => {
                playSound({ sound: STREAMER_WARS_SOUNDS.CUTE_NOTIFICATION, volume: 0.8 });
            }
        },
        {
            text: "Presionen círculo para continuar... o X para abandonar.",
            audioPath: "instructions/vote-choose",
            duration: 5000,
            component: <VoteContinue />  // el widget de abajo
        },
        {
            text: "Los votos han sido contados.",
            audioPath: "instructions/vote-result",
            duration: 3500
        },
        {
            text: "Decisión unánime. El juego continúa.",
            audioPath: "instructions/vote-unanimous",
            duration: 4000,
            omitReverb: true
        }
    ]
};


