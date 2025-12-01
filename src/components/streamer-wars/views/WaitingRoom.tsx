import { useState } from "preact/hooks";
import { memo } from "preact/compat";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import type { Channel } from "pusher-js";
import {
    LucideMegaphone,
    LucidePartyPopper,
    LucideSend,
    LucideVenetianMask,
    LucideVolume2,
    LucideVolumeOff,
    LucideGamepad2
} from "lucide-preact";
import { ChatRoom } from "./ChatRoom";

// --- ESTILOS CONSTANTES ---
const RETRO_BOX = "border-2 border-white bg-neutral-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]";
const RETRO_CARD = "border-2 border-neutral-700 bg-black/40 hover:bg-neutral-800 transition-colors shadow-[2px_2px_0px_0px_#000]";

// --- COMPONENTES UI ---

// Reemplazo de ThreeDots por cubos pixelados
const PixelLoader = () => (
    <div className="flex gap-x-2 items-end h-4">
        <div className="w-3 h-3 bg-lime-500 animate-bouncing shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
        <div className="w-3 h-3 bg-lime-500 animate-bouncing [animation-delay:150ms] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
        <div className="w-3 h-3 bg-lime-500 animate-bouncing [animation-delay:300ms] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
    </div>
);

const HINTS = [
    {
        title: "NO CHEATS",
        icon: LucideVenetianMask,
        description: "El sistema anti-trampas está activo. Serás eliminado.",
        color: "text-red-400"
    },
    {
        title: "OBEY ORDERS",
        icon: LucideSend,
        description: "Sigue las instrucciones del servidor central.",
        color: "text-yellow-400"
    },
    {
        title: "HAVE FUN",
        icon: LucidePartyPopper,
        description: "Sobrevive y disfruta la simulación.",
        color: "text-cyan-400"
    }
];

interface WaitingRoomProps {
    session: Session;
    channel: Channel;
    bgVolume: number;
    setBgVolume: (volume: number) => void;
    bgAudio: HTMLAudioElement | null;
}

export const WaitingRoom = ({ session, channel, bgVolume, setBgVolume, bgAudio }: WaitingRoomProps) => {



    return (
        <div class="grid p-4 gap-y-6 md:gap-y-0 md:gap-x-4 grid-cols-1 md:grid-cols-12 h-full">
            {/* COLUMNA IZQUIERDA: CHAT */}
            <div class="flex w-full h-[500px] md:h-full col-span-1 md:col-span-4">
                <ChatRoom session={session} channel={channel} />
            </div>

            {/* COLUMNA DERECHA: LOBBY */}
            <div class={`col-span-1 md:col-span-8 w-full relative flex flex-col items-center justify-center overflow-hidden p-6 ${RETRO_BOX}`}>

                {/* RIBBON ESTILO PIXEL */}
                {/* <div class="absolute top-8 -right-10 rotate-45 z-20">
                    <span class="bg-yellow-400 text-black text-[10px] font-mono font-bold py-1 px-12 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black tracking-widest uppercase">
                        Last Day
                    </span>
                </div> */}



                {/* CONTENIDO CENTRAL */}
                <div class="flex-1 flex flex-col items-center justify-center gap-y-6 z-10">
                    <LucideGamepad2 size={64} class="text-neutral-600 mb-4 animate-pulse" />

                    <div class="text-center space-y-4">
                        <h2 class="text-xl font-mono font-bold text-white tracking-tighter uppercase drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                            Preparándo la siguiente batalla...
                        </h2>

                        <div class="flex items-center justify-center gap-x-4 text-lime-400 font-mono text-sm uppercase tracking-widest">
                            <span>Loading Assets</span>
                            <PixelLoader />
                        </div>
                    </div>
                </div>

                {/* FOOTER: HINTS */}
                <footer class="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-auto pt-8 border-t-2 border-dashed border-neutral-700/50">
                    {HINTS.map(({ title, icon: Icon, description, color }, idx) => (
                        <div key={idx} class={`flex flex-col items-center text-center p-3 gap-y-2 ${RETRO_CARD}`}>
                            <div class={`p-2 border-2 border-black bg-neutral-900 shadow-[2px_2px_0px_0px_#333] ${color}`}>
                                <Icon size={24} strokeWidth={2.5} />
                            </div>
                            <span class={`text-sm font-bold font-mono tracking-wider ${color}`}>{title}</span>
                            <p class="text-neutral-400 text-[10px] font-mono leading-tight px-2">
                                {description}
                            </p>
                        </div>
                    ))}
                </footer>

                {/* FONDO DECORATIVO (GRID) */}
                <div
                    class="absolute inset-0 pointer-events-none opacity-5"
                    style={{
                        backgroundImage: "linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)",
                        backgroundSize: "20px 20px"
                    }}
                ></div>
            </div>
        </div>
    );
};