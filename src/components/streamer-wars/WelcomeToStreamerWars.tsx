import type { Session } from "@auth/core/types";
import { useEffect, useState } from "preact/hooks";

export const WelcomeToStreamerWars = ({ session, bgAudio, isOpen, setIsOpen }: {
    session: Session,
    bgAudio: HTMLAudioElement,
    isOpen: boolean,
    setIsOpen: (isOpen: boolean) => void
}) => {

    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            bgAudio.volume = 0.5;
            bgAudio.play();
        } else {
            let fadeOut = setInterval(() => {
                if (bgAudio.volume > 0.1) {
                    bgAudio.volume = Math.max(bgAudio.volume - 0.1, 0);
                } else {
                    bgAudio.pause();
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
            <dialog
                open={isOpen}
                class={`max-w-4xl w-full fixed inset-0 z-[99999999] bg-black border border-white/40 shadow-2xl text-white 
                        ${closing ? "animate-fade-out-down animate-duration-400" : "animate-fade-in-up"}`}
            >
                <div class="welcome-inner relative p-8">
                    <header class="flex mb-8 justify-between items-center">
                        <h1 class="text-2xl font-squids">
                            ¡Bienvenido a <span class="font-atomic text-lime-500">Guerra de Streamers</span>!
                        </h1>
                    </header>
                    <p class="font-mono max-w-2xl text-left">
                        ¡Hola, <strong>{session.user?.name}</strong>! ¿Estás listo para la batalla?
                    </p>
                    <p class="font-mono max-w-2xl text-left mt-4">
                        En esta guerra, lucharás contra otros streamers en una serie de minijuegos. ¡Demuestra tus habilidades y gana premios!
                    </p>
                    <p class="font-mono max-w-2xl text-left mt-4">
                        Recuerda: <strong>Sigue las instrucciones</strong> y mantente atento a Discord y las notificaciones en pantalla.
                    </p>
                    <p class="font-mono max-w-2xl text-left mt-6">¡Buena suerte!</p>

                    <footer class="mt-8 mb-8 flex justify-center text-center">
                        <p class="max-w-2xl text-xs font-mono">
                            <span class="text-lime-500">Para recordar:</span> <br />Durante el evento, <strong> no puedes estar en directo</strong> en tu canal de Twitch.
                            La organización se reserva el derecho de descalificar a cualquier streamer que no cumpla con esta regla.<br />
                            Se tiene permitido grabar el POV para que puedas generar tu contenido posteriormente.
                        </p>
                    </footer>

                    <div class="flex justify-between mt-8">
                        <button
                            onClick={handleClose}
                            class="flex w-max transform px-2 font-rubik tracking-wider uppercase font-bold text-black mix-blend-screen bg-lime-400 hover:bg-pink-500 transition !skew-x-[-20deg]"
                        >
                            <span class="flex !skew-x-[20deg] transform">Vamos</span>
                        </button>
                    </div>
                    <img src="/images/pink-soldier.webp"
                        draggable={false}
                        alt="Soldier"
                        style={{
                            maskImage: "linear-gradient(to top, transparent 5%, black 60%, black 100%)",
                        }}
                        class="absolute top-4 right-0 size-28 object-contain" />
                </div>
            </dialog>
            <div class={`dialog-background inset-0 w-dvw h-dvh backdrop-blur-sm bg-black/75 z-[9999999] transition-opacity 
                        ${closing ? "opacity-0" : "animate-blurred-fade-in"}`} />
        </>
    );
};
