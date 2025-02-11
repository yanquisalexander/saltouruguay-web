import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface InstructionsProps {
    duration?: number;
    children: ComponentChildren;
    customTitle?: string;
    executeOnMount?: () => void;
}

export const Instructions = ({
    duration = 10000,
    children,
    customTitle,
    executeOnMount,
}: InstructionsProps) => {
    // Estado que controla si el componente se sigue mostrando
    const [isVisible, setIsVisible] = useState(true);
    // Estado para manejar la clase de animación: fade in o fade out
    const [fadeClass, setFadeClass] = useState("animate-fade-in");
    const [timeLeft, setTimeLeft] = useState(duration / 1000);

    useEffect(() => {
        // Inicia un timer que, al cumplirse "duration", aplica la animación de fade out
        const timer = setTimeout(() => {
            setFadeClass("animate-fade-out opacity-0");
            // Después de 500ms (duración de la animación), desmonta el componente
            setTimeout(() => {
                setIsVisible(false);
            }, 500);
        }, duration);

        // Intervalo para el contador y sonido cada segundo
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // @ts-ignore
                    clearInterval(interval);
                    // Se emite un evento cuando las instrucciones terminan
                    document.dispatchEvent(new CustomEvent("instructions-ended"));
                    return 0;
                }
                playSound({ sound: STREAMER_WARS_SOUNDS.TICK, volume: 1 });
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearTimeout(timer);
            // @ts-ignore
            clearInterval(interval);
        };
    }, [duration]);

    useEffect(() => {
        if (executeOnMount) {
            executeOnMount();
        }
    }, []);

    // Si no está visible, no renderizamos nada
    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 bg-black flex flex-col justify-center items-center z-[8000] transition-opacity duration-500 ${fadeClass}`}
        >
            <div className="fixed font-mono top-0 right-8 mt-6 text-lg text-gray-300">
                00:{timeLeft.toString().padStart(2, "0")}
            </div>
            <div className="p-8 backdrop-blur-sm text-white text-center">
                <header>
                    <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-white to-gray-300 text-transparent bg-clip-text">
                        {customTitle ?? "Instrucciones"}
                    </h1>
                </header>
                <div className="mt-6 space-y-4">{children}</div>
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
