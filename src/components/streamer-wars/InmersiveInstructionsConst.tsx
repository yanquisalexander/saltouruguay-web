import { type JSX } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import { SimonSaysButtons } from "./games/SimonSaysButtons";

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
                onClick={() => { }} // No hacer nada en el ejemplo
            />
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
    ]
};