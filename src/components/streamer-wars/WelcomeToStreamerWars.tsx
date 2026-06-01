import type { Session } from "@auth/core/types";
import { useEffect, useState } from "preact/hooks";

export const WelcomeToStreamerWars = ({ session, bgAudio, isOpen, setIsOpen }: {
    session: Session,
    bgAudio: HTMLAudioElement | null,
    isOpen: boolean,
    setIsOpen: (isOpen: boolean) => void
}) => {

    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            bgAudio && (bgAudio.volume = 0.5);
            bgAudio && bgAudio.play();
        } else {
            if (!bgAudio) return;
            let fadeOut = setInterval(() => {
                if (bgAudio.volume > 0.1) {
                    bgAudio.volume = Math.max(bgAudio.volume - 0.1, 0);
                } else {
                    bgAudio.pause();

                    document.dispatchEvent(new CustomEvent("welcome-dialog-closed"));

                    // @ts-ignore
                    clearInterval(fadeOut);
                }
            }, 100);
            // @ts-ignore
            return () => clearInterval(fadeOut);
        }
    }, [isOpen]);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setClosing(false);
        }, 300); // Duración de la animación
    };

    if (!isOpen) return null;

    return (
        <>
            <div class={`fixed inset-0 z-99999999 flex items-center justify-center transition-opacity duration-300 ${closing ? "opacity-0" : "opacity-100"}`}>
                <div class="absolute inset-0 bg-black/75 backdrop-blur-xs" />

                <div class={`relative max-w-lg w-full mx-4 bg-[#0a0a0a] border border-[#1c1c1e] shadow-[0_0_60px_rgba(0,0,0,0.9)]
                            ${closing ? "animate-fade-out-down animate-duration-400" : "animate-fade-in-up"}`}>
                    {/* Top accent */}
                    <div class="h-[2px] bg-linear-to-r from-transparent via-[#b4cd02]/50 to-transparent" />

                    <div class="p-6 md:p-8">
                        <div class="flex items-start justify-between gap-4">
                            <h1 class="text-xl font-squids tracking-wide text-white">
                                Bienvenido a <span class="font-atomic text-[#b4cd02]">Guerra de Streamers</span>
                            </h1>
                            <img src="/images/pink-soldier.webp"
                                draggable={false}
                                alt=""
                                style={{
                                    maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                                }}
                                class="size-20 object-contain shrink-0 -mr-2" />
                        </div>

                        <div class="mt-6 space-y-3 text-sm text-neutral-300 font-mono leading-relaxed">
                            <p>
                                ¡Hola, <strong class="text-white">{session.user?.name}</strong>! ¿Estás listo para la batalla?
                            </p>
                            <p>
                                Lucharás contra otros streamers en una serie de minijuegos. Demostrá tus habilidades y ganá premios.
                            </p>
                            <p>
                                Seguí las instrucciones y mantenete atento a Discord y las notificaciones en pantalla.
                            </p>
                            <p class="pt-2">¡Buena suerte!</p>
                        </div>

                        <footer class="mt-6 pt-4 border-t border-[#1c1c1e]">
                            <p class="text-[11px] text-neutral-500 font-mono leading-relaxed text-center">
                                <span class="text-[#b4cd02]">Para recordar:</span><br />
                                Durante el evento <strong class="text-neutral-300">no podés estar en directo</strong> en tu canal de Twitch.<br />
                                La organización se reserva el derecho de descalificar a cualquier streamer que no cumpla.<br />
                                Está permitido grabar tu POV para generar contenido posterior.
                            </p>
                        </footer>

                        <div class="flex justify-center mt-6">
                            <button
                                onClick={handleClose}
                                class="px-8 py-2 bg-[#b4cd02] text-black font-anton tracking-[0.15em] uppercase text-sm hover:bg-[#b4cd02]/80 transition-colors"
                            >
                                Vamos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
