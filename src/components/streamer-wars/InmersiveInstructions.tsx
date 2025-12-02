import { CDN_PREFIX, playSound, playSoundWithReverb, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import pusherClient from "@/services/pusher.client";
import { cloneElement, type JSX } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import { INSTRUCTIONS_REGISTRY, type ScriptItem } from "./InmersiveInstructionsConst";

export const InmersiveInstructions = () => {
    // Estado para el script activo actual
    const [activeScript, setActiveScript] = useState<ScriptItem[] | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Estados visuales y de lógica
    const [isVisible, setIsVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fadeClass, setFadeClass] = useState("animate-fade-in");
    const [remainingTime, setRemainingTime] = useState(0);

    // Referencia para controlar timeouts y evitar fugas de memoria si se desmonta o cambia
    const timeoutRef = useRef<number | null>(null);

    // 1. ESCUCHAR PUSHER
    useEffect(() => {
        const channel = pusherClient.subscribe("streamer-wars");

        channel.bind("inmersive-instructions", (data: { id: string }) => {
            console.log("Instrucción inmersiva recibida:", data.id);
            const script = INSTRUCTIONS_REGISTRY[data.id];

            if (script) {
                // Si ya hay algo reproduciéndose, forzamos el reset
                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                // Precargar sonidos de este script específico
                script.forEach(item => {
                    if (item.audioPath) {
                        const audio = new Audio(`${CDN_PREFIX}scripts/${item.audioPath}.mp3`);
                        audio.preload = "auto";
                    }
                });

                setActiveScript(script);
                setActiveId(data.id);
                setRemainingTime(script.reduce((acc, item) => acc + item.duration, 0) / 1000);
                setCurrentIndex(0);
                setFadeClass("animate-fade-in");
                setIsVisible(true);
            } else {
                console.warn(`No se encontró script para el ID: ${data.id}`);
            }
        });

        return () => {
            channel.unbind("inmersive-instructions");
            pusherClient.unsubscribe("streamer-wars"); // Opcional si usas el canal en otros lados
        };
    }, []);

    // 2. LOGICA DE REPRODUCCIÓN (Effect que reacciona cuando cambia activeScript)
    useEffect(() => {
        if (!activeScript || !isVisible) return;

        const playItem = (index: number) => {
            if (index >= activeScript.length) {
                // Fin del script
                setFadeClass("animate-fade-out opacity-0");
                timeoutRef.current = window.setTimeout(() => {
                    setIsVisible(false);
                    setActiveScript(null);
                    setActiveId(null);
                    document.dispatchEvent(new CustomEvent("inmersive-instructions-ended", { detail: { id: activeId } }));
                }, 500);
                return;
            }

            setCurrentIndex(index);
            const item = activeScript[index];

            // Reproducir audio
            if (item.audioPath) {
                const path = `scripts/${item.audioPath}`; // Ajusta si tus paths en el registro ya incluyen 'scripts/'
                if (item.omitReverb) {
                    playSound({ sound: path, volume: item.volume || 1 });
                } else {
                    playSoundWithReverb({ sound: path, volume: item.volume || 1 });
                }
            }

            // Ejecutar función arbitraria
            if (item.execute) {
                item.execute();
            }

            // Programar siguiente item
            timeoutRef.current = window.setTimeout(() => {
                playItem(index + 1);
            }, item.duration);
        };

        // Iniciar la secuencia
        // Opcional: Sonido de "incoming transmission" antes de empezar
        playSound({ sound: STREAMER_WARS_SOUNDS.NOTIFICATION, volume: 0.3 }); // O un sonido estático

        playItem(0);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [activeScript]); // Se ejecuta cuando seteamos un nuevo script desde el evento Pusher

    // 3. TIMER DESCENDENTE (Visual)
    useEffect(() => {
        if (!isVisible || remainingTime <= 0) return;

        const intervalId = setInterval(() => {
            setRemainingTime((prev) => Math.max(0, prev - 1));
        }, 1000);

        // @ts-ignore
        return () => clearInterval(intervalId);
    }, [isVisible, remainingTime]);


    if (!isVisible || !activeScript) return null;

    const currentItem = activeScript[currentIndex];
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);

    return (
        <div
            className={`fixed inset-0 bg-black/90 flex min-h-dvh h-full w-full flex-col justify-center items-center z-[9000] transition-opacity duration-500 ${fadeClass}`}
        >
            {/* Timer en la esquina superior derecha */}
            <div className="fixed font-mono top-0 right-8 mt-6 text-lg text-gray-500 z-[10001]">
                {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>

            {/* Decoración de fondo */}
            <span className="fixed top-32 text-5xl opacity-10 rotate-[12deg] select-none left-16 font-atomic-extras text-lime-900">
                INSTRUCTION
            </span>

            <div className="p-8 backdrop-blur-sm text-white text-center w-full max-w-4xl flex flex-col items-center">

                {/* Header dinámico */}
                <header className="mb-12">
                    <h1 className="text-2xl font-mono font-bold text-lime-500 uppercase tracking-[0.2em] border-b border-lime-900 pb-2">
                        {activeId?.replace("-", " ")}
                    </h1>
                </header>

                {/* Componente visual del paso actual */}
                <div className="min-h-[200px] flex items-center justify-center">
                    {currentItem?.component && (
                        <div className="animate-fade-in-up">
                            {typeof currentItem.component === "function"
                                ? cloneElement(currentItem.component({}), { key: currentIndex })
                                : cloneElement(currentItem.component as JSX.Element, { key: currentIndex })}
                        </div>
                    )}
                </div>

            </div>
            {/* Texto de subtítulo/instrucción */}
            {currentItem?.text && (
                <div className="mt-12 fixed bottom-16 bg-neutral-900/40 px-2 py-1 max-w-2xl w-full mx-auto">
                    <p className="font-mono text-center text-white text-md leading-relaxed">
                        {currentItem.text}
                    </p>
                </div>
            )}


        </div>
    );
};