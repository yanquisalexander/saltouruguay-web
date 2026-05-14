import { cloneElement, type JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { playSound, playSoundWithReverb, CDN_PREFIX, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
import { toast } from "sonner";
import { $ } from "@/lib/dom-selector";

interface ScriptItem {
    text?: string;
    audioPath?: string;
    duration: number;
    component?: JSX.Element | ((props: any) => JSX.Element);
    omitReverb?: boolean;
    volume?: number;
    execute?: () => void;
}

// ─── Cassette Tape Component ──────────────────────────────────────────────────

function TeaserCassette() {
    const [counter, setCounter] = useState(247);
    const [glitch, setGlitch] = useState(false);

    useEffect(() => {
        const tick = setInterval(() => setCounter(c => c + 1), 80);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        const scheduleGlitch = () => {
            const delay = 3500 + Math.random() * 2000;
            return setTimeout(() => {
                setGlitch(true);
                setTimeout(() => {
                    setGlitch(false);
                    scheduleGlitch();
                }, 120);
            }, delay);
        };
        const id = scheduleGlitch();
        return () => clearTimeout(id);
    }, []);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "'Courier New', monospace",
            userSelect: "none",
            position: "fixed",
            left: "50%", /* CORREGIDO: Antes estaba en 40% y lo descentraba */
            top: "50%",
            transform: "translate(-50%, -50%)", /* CORREGIDO: Centrado absoluto */
        }}>
            <style>{`
                @keyframes gds-spin-reel {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes gds-blink-rec {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
                @keyframes gds-flicker {
                    0%, 100% { opacity: 1; }
                    92% { opacity: 1; }
                    93% { opacity: 0.5; }
                    94% { opacity: 1; }
                    97% { opacity: 0.75; }
                    98% { opacity: 1; }
                }
                @keyframes gds-scanline {
                    0% { top: -60px; }
                    100% { top: 100%; }
                }
                @keyframes gds-noise {
                    0%  { transform: translate(0, 0); }
                    20% { transform: translate(-3px, 0); }
                    40% { transform: translate(3px, 0); }
                    60% { transform: translate(-3px, 0); }
                    80% { transform: translate(3px, 0); }
                    100%{ transform: translate(0, 0); }
                }
                .gds-cassette { animation: gds-flicker 7s infinite; }
                .gds-glitch { position: relative; }
                .gds-glitch::before {
                    content: attr(data-text);
                    position: absolute; inset: 0;
                    color: #ff003c;
                    clip-path: polygon(0 25%, 100% 25%, 100% 45%, 0 45%);
                    animation: gds-noise 0.15s steps(1) infinite;
                }
                .gds-glitch::after {
                    content: attr(data-text);
                    position: absolute; inset: 0;
                    color: #00f0ff;
                    clip-path: polygon(0 60%, 100% 60%, 100% 78%, 0 78%);
                    animation: gds-noise 0.2s steps(1) infinite reverse;
                }
            `}</style>

            {/* Scanline overlay */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)",
            }} />
            <div style={{
                position: "absolute", left: 0, right: 0, height: "60px",
                background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.025), transparent)",
                animation: "gds-scanline 5s linear infinite",
                pointerEvents: "none", zIndex: 2,
            }} />

            {/* Cassette body */}
            <div class="gds-cassette" style={{
                width: "300px",
                background: "#181818",
                border: "2px solid #252525",
                borderRadius: "8px",
                padding: "14px",
                position: "relative",
                zIndex: 3,
            }}>
                {/* Label */}
                <div style={{
                    background: "#0d0d0d",
                    border: "1px solid #1e1e1e",
                    borderRadius: "4px",
                    padding: "7px 11px",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <div>
                        <div style={{ color: "#3a3a3a", fontSize: "9px", letterSpacing: "2px", marginBottom: "2px" }}>
                            ARCHIVO CLASIFICADO
                        </div>
                        <div
                            class={glitch ? "gds-glitch" : ""}
                            data-text="GDS·II"
                            style={{ color: "#d0d0d0", fontSize: "17px", fontWeight: "bold", letterSpacing: "4px" }}
                        >
                            GDS·II
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{
                            color: "#ff2a2a",
                            fontSize: "11px",
                            fontWeight: "bold",
                            letterSpacing: "1px",
                            animation: "gds-blink-rec 1.1s step-end infinite",
                        }}>
                            ● REC
                        </div>
                        <div style={{ color: "#333", fontSize: "9px", marginTop: "3px" }}>T-120</div>
                    </div>
                </div>

                {/* Tape window */}
                <div style={{
                    background: "#0a0a0a",
                    border: "1px solid #1a1a1a",
                    borderRadius: "5px",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                }}>
                    {/* Reel left */}
                    <Reel size={62} speed="1.4s" />

                    {/* Center pin - Modificado a ▲ para vibra Squid Game */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                        <div style={{ width: "52px", height: "1px", background: "#202020" }} />
                        <div style={{ color: "#ff0055", fontSize: "16px", lineHeight: 1, textShadow: "0 0 5px rgba(255,0,85,0.5)" }}>▲</div>
                        <div style={{ width: "52px", height: "1px", background: "#202020" }} />
                    </div>

                    {/* Reel right */}
                    <Reel size={46} speed="1.4s" />
                </div>

                {/* Bottom bar */}
                <div style={{
                    marginTop: "9px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 2px",
                }}>
                    <div style={{ color: "#242424", fontSize: "9px", letterSpacing: "2px" }}>SONY BETAMAX</div>
                    <div style={{
                        background: "#0d0d0d",
                        border: "1px solid #1e1e1e",
                        borderRadius: "3px",
                        padding: "2px 8px",
                        color: "#ff0055", /* Color estilo Squid Game Pink/Red */
                        fontSize: "12px",
                        letterSpacing: "2px",
                    }}>
                        {counter.toString().padStart(4, "0")}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: "1.5rem", color: "#272727", fontSize: "10px", letterSpacing: "6px" }}>
                NO CONFÍES EN NADIE
            </div>
        </div>
    );
}

function Reel({ size, speed }: { size: number; speed: string }) {
    return (
        <div style={{
            width: `${size + 10}px`,
            height: `${size + 10}px`,
            borderRadius: "50%",
            border: "2px solid #222",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f0f0f",
        }}>
            <div style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: "50%",
                border: "2px solid #2e2e2e",
                background: "#0d0d0d",
                animation: `gds-spin-reel ${speed} linear infinite`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundImage: "repeating-conic-gradient(#181818 0deg 60deg, #0f0f0f 60deg 120deg)",
            }}>
                <div style={{
                    width: `${Math.round(size * 0.26)}px`,
                    height: `${Math.round(size * 0.26)}px`,
                    borderRadius: "50%",
                    background: "#1e1e1e",
                    border: "1px solid #2a2a2a",
                }} />
            </div>
        </div>
    );
}

// ─── Teaser Script (Estilo Squid Game) ────────────────────────────────────────

const GUERRA_TEASER_SCRIPT: ScriptItem[] = [
    { duration: 3000, omitReverb: true, audioPath: "teaser-bg-audio", volume: 0.1 },
    { text: "Has recibido la invitación.", audioPath: "teaser-1", duration: 4000 },
    { text: "El juego está a punto de cambiar.", audioPath: "teaser-2", duration: 4000 },
    { text: "Decenas de creadores.", audioPath: "teaser-3", duration: 3500 },
    { text: "Una sola regla: sobrevivir.", audioPath: "teaser-4", duration: 4500 },
    { text: "Si pierdes... tu transmisión se apaga.", audioPath: "teaser-5", duration: 5500 },
    { text: "¿Aceptarás el riesgo?", audioPath: "teaser-6", duration: 4000 },
    {
        text: "Guerra de Streamers II. El juego comienza pronto.",
        audioPath: "teaser-7",
        duration: 8000,
        execute: () => {
            setTimeout(() => {
                // Usamos un sonido estridente y un toast rojo (error) para dar sensación de peligro
                playSound({ sound: STREAMER_WARS_SOUNDS.DISPARO_COMIENZO, volume: 0.8 });
                toast.error("Estate atento", {
                    description: "Pronto abrirán las inscripciones para la Guerra de Streamers II",
                    richColors: true,
                    duration: 8000,
                    position: "bottom-center",
                    dismissible: false,
                });
            }, 8500);
        }
    }
];

const PRELOAD_SOUNDS = () => {
    const allSounds = GUERRA_TEASER_SCRIPT.map((item) => item.audioPath);
    allSounds.forEach((sound) => {
        if (!sound) return;
        const audio = new Audio(`${CDN_PREFIX}scripts/${sound}.mp3`);
        audio.crossOrigin = "anonymous"; // Evita que se cachee una respuesta opaca (sin CORS)
        audio.preload = "auto";
    });
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const GuerraJourneyTeaser = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [key, setKey] = useState(0);
    const [fadeClass, setFadeClass] = useState("animate-fade-in");
    const [currentIndex, setCurrentIndex] = useState(0);

    const script = GUERRA_TEASER_SCRIPT;
    const totalDuration = script.reduce((acc, item) => acc + item.duration, 0);
    const [remainingTime, setRemainingTime] = useState(totalDuration / 1000);

    useEffect(() => { PRELOAD_SOUNDS(); }, []);

    useEffect(() => {
        if (!isVisible) return;
        setRemainingTime(totalDuration / 1000);
        const intervalId = setInterval(() => {
            setRemainingTime((prev) => {
                const next = prev - 1;
                if (next <= 0) { clearInterval(intervalId); return 0; }
                return next;
            });
        }, 1000);
        return () => clearInterval(intervalId);
    }, [isVisible]);

    const handleStart = () => {
        setKey(prev => prev + 1);
        setIsVisible(true);
        setCurrentIndex(0);
        setFadeClass("animate-fade-in");
        $('body')?.classList.add('overflow-hidden');
    };

    const handleTransitionEnd = () => {
        setFadeClass("animate-fade-out opacity-0");
        setTimeout(() => {
            setIsVisible(false);
            $('body')?.classList.remove('overflow-hidden');
        }, 500);
    };

    useEffect(() => {
        if (!isVisible) return;
        let timeoutId: number | undefined;

        const playItem = (index: number) => {
            if (index >= script.length) { handleTransitionEnd(); return; }
            setCurrentIndex(index);
            const item = script[index];

            if (item.audioPath) {
                if (item.omitReverb) {
                    playSound({ sound: `scripts/${item.audioPath}`, volume: item.volume || 1 });
                } else {
                    playSoundWithReverb({ sound: `scripts/${item.audioPath}`, volume: item.volume || 1, reverbAmount: 0.3 });
                }
            }

            if (item.execute) item.execute();
            timeoutId = window.setTimeout(() => playItem(index + 1), item.duration);
        };

        playItem(0);
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [isVisible, key]);

    if (!isVisible) {
        return (
            <button
                onClick={handleStart}
                class="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-6 py-2 font-rubik text-sm font-bold uppercase tracking-[0.2em] text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
                Reproducir Cinta Clasificada
            </button>
        );
    }

    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);

    return (
        <div
            className={`fixed inset-0 bg-[#050505] flex min-h-screen h-full flex-col justify-center items-center z-[99999] transition-opacity duration-500 ${fadeClass}`}
        >
            {/* Timer Ominoso */}
            <div className="fixed font-mono top-0 right-8 mt-6 text-xl text-red-600/70 z-[10001] animate-pulse">
                {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>

            {/* Cassette — siempre visible */}
            <TeaserCassette />

            {/* Per-item component */}
            {script[currentIndex]?.component && (() => (
                <div className="mt-6">
                    {typeof script[currentIndex].component === "function"
                        ? cloneElement(script[currentIndex].component({}), { key: currentIndex })
                        : cloneElement(script[currentIndex].component as JSX.Element, { key: currentIndex })}
                </div>
            ))()}

            {/* Subtítulo estilo Cine */}
            {script[currentIndex]?.text && (
                <div className="absolute bottom-32 w-max max-w-full md:max-w-[60ch] px-4 font-mono text-center text-white text-xl tracking-widest" style={{ textShadow: "0px 2px 10px rgba(0,0,0,0.8)" }}>
                    {script[currentIndex].text}
                </div>
            )}

            {/* Watermarks */}
            <h2 className="z-[9998!important] text-2xl fixed bottom-16 inset-x-0 font-atomic text-center mx-auto text-neutral-800 select-none -skew-y-6 opacity-50">
                <span className="tracking-widest uppercase">Guerra de Streamers II</span>
            </h2>
            <span className="fixed bottom-32 text-5xl opacity-10 rotate-[32deg] select-none right-16 font-atomic-extras text-red-500">
                &#x0055;
            </span>
            <span className="fixed bottom-48 text-5xl opacity-10 rotate-[-16deg] select-none left-16 font-atomic-extras text-red-500">
                &#x0050;
            </span>
        </div>
    );
};