import { useState } from "preact/hooks";
import type { Session } from "@auth/core/types";
import type { Channel } from "pusher-js";
import {
    LucideVenetianMask,
    LucideSend,
    LucidePartyPopper,
    LucideGamepad2
} from "lucide-preact";
import { ChatRoom } from "./ChatRoom";

// --- ESTILOS MODERNOS ---
const MODERN_BOX = "bg-black border border-neutral-800 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)]";
const MODERN_CARD = "group border border-neutral-800/50 bg-neutral-900/20 hover:border-pink-500/50 transition-all duration-500 backdrop-blur-sm";

const ModernLoader = () => (
    <div className="flex gap-x-2 items-center justify-center">
        {[0, 1, 2].map((i) => (
            <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
            />
        ))}
    </div>
);

const HINTS = [
    {
        title: "NO CHEATS",
        icon: LucideVenetianMask,
        description: "El sistema de vigilancia está activo. Cualquier anomalía resultará en eliminación.",
        color: "text-pink-500"
    },
    {
        title: "OBEY ORDERS",
        icon: LucideSend,
        description: "Sigue las instrucciones del servidor central sin cuestionar los protocolos.",
        color: "text-neutral-400"
    },
    {
        title: "SURVIVE",
        icon: LucidePartyPopper,
        description: "La simulación requiere participantes íntegros. Mantente alerta.",
        color: "text-neutral-400"
    }
];

interface WaitingRoomProps {
    session: Session;
    channel: Channel;
    bgVolume: number;
    setBgVolume: (volume: number) => void;
    bgAudio: HTMLAudioElement | null;
}

export const WaitingRoom = ({ session, channel }: WaitingRoomProps) => {
    return (
        <div class="grid p-4 gap-y-6 md:gap-y-0 md:gap-x-6 grid-cols-1 md:grid-cols-12 h-full bg-[#050505] text-neutral-200">

            {/* COLUMNA IZQUIERDA: CHAT */}
            <div class="flex w-full h-[500px] md:h-full col-span-1 md:col-span-4 rounded-sm overflow-hidden border border-neutral-800/50">
                <ChatRoom session={session} channel={channel} />
            </div>

            {/* COLUMNA DERECHA: LOBBY */}
            <div class={`col-span-1 md:col-span-8 w-full flex flex-col items-center justify-center p-8 rounded-sm ${MODERN_BOX}`}>

                {/* AMBIENTE: Luces difusas fucsia (Squid Game Vibes) */}
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-pink-500/50 to-transparent shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
                <div class="absolute -top-40 -left-40 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />

                {/* CONTENIDO CENTRAL */}
                <div class="flex-1 flex flex-col items-center justify-center gap-y-6 z-10 w-full">
                    <div class="relative mb-4">
                        <LucideGamepad2 size={60} strokeWidth={1} class="text-neutral-500 animate-pulse" />
                    </div>

                    <div class="text-center space-y-4">
                        <div class="space-y-1">
                            <h2 class="text-5xl font-atomic tracking-wider text-white uppercase">
                                Preparando la <span class="text-pink-500">Batalla</span>
                            </h2>
                            <p class="font-anton tracking-widest text-xs text-neutral-500 uppercase">
                                Servidor Central // Protocolo de Espera
                            </p>
                        </div>

                        <div class="flex flex-col items-center pt-4">
                            <div class="flex items-center gap-x-4 px-6 py-2 bg-neutral-900/50 border border-neutral-800 rounded-full">
                                <span class="font-anton text-[10px] tracking-widest text-neutral-400 uppercase">
                                    Sincronizando activos
                                </span>
                                <ModernLoader />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER: HINTS */}
                <footer class="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-auto pt-8 border-t border-neutral-800/50">
                    {HINTS.map(({ title, icon: Icon, description, color }, idx) => (
                        <div key={idx} class={`flex flex-col p-5 gap-y-3 ${MODERN_CARD}`}>
                            <div class="flex items-center gap-x-3">
                                <div class={`p-1.5 border border-neutral-700 bg-black ${color}`}>
                                    <Icon size={16} strokeWidth={2} />
                                </div>
                                <span class={`font-atomic text-lg tracking-wider ${color}`}>
                                    {title}
                                </span>
                            </div>
                            <p class="text-xs leading-relaxed text-neutral-400">
                                {description}
                            </p>
                        </div>
                    ))}
                </footer>

                {/* MARCA DE AGUA / DECORACIÓN */}
                <span class="absolute bottom-6 right-8 font-atomic text-4xl opacity-5 select-none pointer-events-none">
                    GUERRA DE STREAMERS
                </span>

                {/* SCANLINE SUTIL */}
                <div class="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
            </div>
        </div>
    );
};