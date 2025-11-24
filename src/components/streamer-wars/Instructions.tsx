import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { cn } from "@/lib/utils";


// Definimos la estructura de un control individual
export interface ControlItem {
    keys: (keyof typeof keyToImage)[]; // Ejemplo: ["W", "A", "S", "D"] o ["SPACE"]
    label: string;  // Ejemplo: "Avanzar a la meta"
}

interface InstructionsProps {
    duration?: number;
    children: ComponentChildren;
    customTitle?: string;
    executeOnMount?: () => void;
    customLayout?: boolean;
    customClockClasses?: string;
    controls?: ControlItem[]; // Nueva prop para los controles
}

// Mapeo de teclas a imágenes
const keyToImage: Record<string, string> = {
    "A": "/images/streamerwars-textures/keyboard/a.png",
    "B": "/images/streamerwars-textures/keyboard/b.png",
    "C": "/images/streamerwars-textures/keyboard/c.png",
    "D": "/images/streamerwars-textures/keyboard/d.png",
    "E": "/images/streamerwars-textures/keyboard/e.png",
    "F": "/images/streamerwars-textures/keyboard/f.png",
    "G": "/images/streamerwars-textures/keyboard/g.png",
    "H": "/images/streamerwars-textures/keyboard/h.png",
    "I": "/images/streamerwars-textures/keyboard/i.png",
    "J": "/images/streamerwars-textures/keyboard/j.png",
    "K": "/images/streamerwars-textures/keyboard/k.png",
    "L": "/images/streamerwars-textures/keyboard/l.png",
    "M": "/images/streamerwars-textures/keyboard/m.png",
    "N": "/images/streamerwars-textures/keyboard/n.png",
    "O": "/images/streamerwars-textures/keyboard/o.png",
    "P": "/images/streamerwars-textures/keyboard/p.png",
    "Q": "/images/streamerwars-textures/keyboard/q.png",
    "R": "/images/streamerwars-textures/keyboard/r.png",
    "S": "/images/streamerwars-textures/keyboard/s.png",
    "T": "/images/streamerwars-textures/keyboard/t.png",
    "U": "/images/streamerwars-textures/keyboard/u.png",
    "V": "/images/streamerwars-textures/keyboard/v.png",
    "W": "/images/streamerwars-textures/keyboard/w.png",
    "X": "/images/streamerwars-textures/keyboard/x.png",
    "Y": "/images/streamerwars-textures/keyboard/y.png",
    "Z": "/images/streamerwars-textures/keyboard/z.png",
    "UP": "/images/streamerwars-textures/keyboard/up.png",
    "DOWN": "/images/streamerwars-textures/keyboard/down.png",
    "LEFT": "/images/streamerwars-textures/keyboard/left.png",
    "RIGHT": "/images/streamerwars-textures/keyboard/right.png",
    "SPACE": "/images/streamerwars-textures/keyboard/space.png",
    "LEFT_CLICK": "/images/streamerwars-textures/keyboard/left_click.png",
    "RIGHT_CLICK": "/images/streamerwars-textures/keyboard/right_click.png",
    "MOUSE": "/images/streamerwars-textures/keyboard/mouse.png",
    "CTRL": "/images/streamerwars-textures/keyboard/special/ctrl.png",
    "SHIFT": "/images/streamerwars-textures/keyboard/special/shift.png",
    "ESC": "/images/streamerwars-textures/keyboard/special/esc.png",
    "GENERIC": "/images/streamerwars-textures/keyboard/special/generic.png",
    "KEYBOARD": "/images/streamerwars-textures/keyboard/special/keyboard.png",
    "KEY-ARROW-UP": "/images/streamerwars-textures/keyboard/up.png",
};

export const Instructions = ({
    duration = 10000,
    children,
    customTitle,
    executeOnMount,
    customLayout = false,
    customClockClasses,
    controls
}: InstructionsProps) => {
    const [isVisible, setIsVisible] = useState(true);
    const [fadeClass, setFadeClass] = useState("animate-fade-in");
    const [timeLeft, setTimeLeft] = useState(duration / 1000);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeClass("animate-fade-out opacity-0");
            setTimeout(() => {
                setIsVisible(false);
            }, 500);
        }, duration);

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // @ts-ignore
                    clearInterval(interval);
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

    const formatTime = (secs: number) => {
        const minutes = Math.floor(secs / 60);
        const remainingSeconds = Math.max(secs % 60, 0);
        return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;
    };

    if (!isVisible) return null;

    const customClockClassName = cn(
        "fixed font-mono text-sm white text-gray-300",
        customClockClasses ?? "top-0 right-8 mt-6"
    );

    return (
        <div
            className={`fixed inset-0 bg-black z-[8000] transition-opacity duration-500 flex flex-col ${fadeClass}`}
        >
            {customLayout ? (
                <div className="flex flex-col justify-center items-center h-full w-full relative">
                    {children}
                    <div className={customClockClassName}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
            ) : (
                /* Layout Estilo Squid Game / Retro */
                <div className="flex flex-col h-full w-full p-4 md:p-8 font-mono text-white relative">

                    {/* HEADER: Título y Timer limpio */}
                    <header className="flex flex-col items-center justify-center mb-4 border-b-4 border-white pb-4 shrink-0 z-10 bg-black">
                        <h3 class="with-glyph flex top-4 left-4 fixed w-max text-xl transform px-2 font-atomic tracking-wider font-bold text-neutral-500"> <span class="flex  transform" >
                            Guerra de Streamers
                        </span> </h3>
                        <div className="text-sm font-mono text-gray-300 mb-2">
                            {formatTime(timeLeft)}
                        </div>
                        <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-white to-gray-200 text-transparent bg-clip-text">
                            {customTitle ?? "Instrucciones"}
                        </h1>
                    </header>

                    {/* CONTENIDO PRINCIPAL: Grid si hay controles, Bloque si no */}
                    <main className={`flex-1 w-full border-4 border-white relative overflow-hidden bg-black z-10 ${controls ? 'grid grid-cols-1 md:grid-cols-[40%_60%] divide-y-4 md:divide-y-0 md:divide-x-4 divide-white' : ''}`}>

                        {/* SECCIÓN CONTROLES (Izquierda) */}
                        {controls && (
                            <div className="p-6 flex flex-col gap-8 overflow-y-auto bg-black">
                                <h2 className="text-2xl md:text-3xl font-bold mb-2 inline-block w-full">
                                    Controles Especiales
                                </h2>
                                <ul className="space-y-6">
                                    {controls.map((ctrl, idx) => (
                                        <li key={idx} className="flex items-start gap-4">
                                            <div className="w-4 h-4 rounded-full bg-white mt-2 shrink-0" />
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                <span className="text-lg text-gray-300 font-semibold uppercase">
                                                    {ctrl.label}
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {ctrl.keys.map((k, kIdx) => {
                                                        const upperK = k.toUpperCase();
                                                        const imageSrc = keyToImage[upperK];
                                                        return (
                                                            <div
                                                                key={kIdx}
                                                                className={cn(
                                                                    "flex items-center justify-center select-none",
                                                                    !imageSrc && "bg-white text-black font-black text-xl px-3 py-1 rounded min-w-[40px] text-center border-b-4 border-gray-400 active:border-b-0 active:translate-y-1"
                                                                )}
                                                            >
                                                                {imageSrc ? (
                                                                    <img
                                                                        draggable={false}
                                                                        src={imageSrc}
                                                                        alt={k}
                                                                        className="h-12 object-contain drop-shadow-md"
                                                                    />
                                                                ) : (
                                                                    k === "key-arrow-up" ? "↑" : k
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* SECCIÓN CHILDREN (Derecha o Full) */}
                        <div className="h-full w-full overflow-y-auto relative">
                            {/* Capa extra para asegurar contraste si pasas texto directo */}
                            <div className="p-6 h-full">
                                {children}
                            </div>
                        </div>
                    </main>


                    <span
                        style={{
                            "--spin-duration": "6s"
                        }}
                        className="fixed with-360-y-spin bottom-32 text-5xl opacity-70 rotate-[32deg] select-none right-16 font-atomic-extras z-[9000] pointer-events-none text-white">
                        &#x0055;
                    </span>
                    <span className="fixed bottom-48 text-5xl opacity-70 rotate-[-16deg] select-none left-16 font-atomic-extras z-[9000] pointer-events-none text-white">
                        &#x0050;
                    </span>
                </div>
            )}
        </div>
    );
};