import type { Session } from "@auth/core/types";
import type { Channel } from "pusher-js";
import {
    LucideVenetianMask,
    LucideSend,
    LucidePartyPopper,
    LucideGamepad2
} from "lucide-preact";
import { ChatRoom } from "./ChatRoom";

const HINTS = [
    {
        title: "NO CHEATS",
        icon: LucideVenetianMask,
        description: "El sistema de vigilancia está activo. Cualquier anomalía resultará en eliminación.",
        color: "text-[#b4cd02]"
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

const SquidLoader = () => (
    <div class="relative flex items-center justify-center">
        <div class="w-12 h-12 border-2 border-[#b4cd02]/30 rounded-full animate-[spin_3s_linear_infinite] flex items-center justify-center">
            <svg viewBox="0 0 60 60" class="w-7 h-7">
                <polygon points="30,8 52,52 8,52" fill="none" stroke="#b4cd02" stroke-width="1.5" opacity="0.8" />
            </svg>
        </div>
        <div class="absolute w-14 h-14 border border-[#b4cd02]/10 rounded-full animate-[spin_5s_linear_infinite]" style={{ animationDirection: 'reverse' }} />
    </div>
);

const GeometricBg = () => (
    <div class="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <svg class="absolute top-[10%] left-[8%] w-24 h-24 opacity-[0.04]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#b4cd02" stroke-width="1" />
            <polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="#b4cd02" stroke-width="1" />
            <rect x="22" y="22" width="56" height="56" fill="none" stroke="#b4cd02" stroke-width="1" />
        </svg>
        <svg class="absolute bottom-[15%] right-[10%] w-32 h-32 opacity-[0.03]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#b4cd02" stroke-width="1" />
            <polygon points="50,10 90,90 10,90" fill="none" stroke="#b4cd02" stroke-width="1" />
        </svg>
        <svg class="absolute top-[45%] right-[20%] w-16 h-16 opacity-[0.02]" viewBox="0 0 100 100">
            <rect x="15" y="15" width="70" height="70" fill="none" stroke="#b4cd02" stroke-width="1" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="#b4cd02" stroke-width="1" />
        </svg>
        <svg class="absolute bottom-[25%] left-[18%] w-14 h-14 opacity-[0.025]" viewBox="0 0 100 100">
            <polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="#b4cd02" stroke-width="1" />
        </svg>
    </div>
);

const GlitchLines = () => (
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[12%] left-0 w-full h-[1px] bg-[#b4cd02] opacity-0 animate-glitch" />
        <div class="absolute top-[38%] left-0 w-full h-[1px] bg-[#b4cd02] opacity-0 animate-glitch" style={{ animationDelay: '3.5s' }} />
        <div class="absolute top-[63%] left-0 w-full h-[1px] bg-[#b4cd02] opacity-0 animate-glitch" style={{ animationDelay: '7s' }} />
        <div class="absolute top-[86%] left-0 w-full h-[1px] bg-[#b4cd02] opacity-0 animate-glitch" style={{ animationDelay: '12s' }} />
    </div>
);

export const WaitingRoom = ({ session, channel }: WaitingRoomProps) => {
    return (
        <div class="h-full w-full flex items-center justify-center p-2 md:p-4 bg-[#050505] text-neutral-300">

            {/* TABLET DEVICE FRAME */}
            <div class="relative w-full h-full max-h-[calc(100vh-8rem)] min-h-[450px] bg-linear-to-br from-[#1c1c1e] to-[#26262a] rounded-2xl p-[6px] shadow-[0_0_60px_rgba(0,0,0,0.95),inset_0_0_0_1px_rgba(255,255,255,0.06)]">

                {/* Camera notch */}
                <div class="absolute top-[-2px] left-1/2 -translate-x-1/2 z-20">
                    <div class="w-1 h-2 bg-[#0d0d0f] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.6)]" />
                </div>

                {/* SCREEN */}
                <div class="relative w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.6),inset_0_0_1px_rgba(180,205,2,0.03)]">

                    {/* Geometric background decorations */}
                    <GeometricBg />

                    {/* Scanline overlay */}
                    <div class="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-size-[100%_4px] z-20" />

                    {/* Glitch lines */}
                    <GlitchLines />

                    {/* Inner screen glow border */}
                    <div class="absolute inset-0 rounded-xl pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] z-10" />

                    {/* CONTENT: Chat + Lobby */}
                    <div class="relative flex h-full w-full z-5">

                        {/* LEFT: CHAT PANEL */}
                        <div class="w-[34%] min-w-0 flex-shrink-0 border-r border-[#18181a]">
                            <ChatRoom session={session} channel={channel} />
                        </div>

                        {/* RIGHT: LOBBY PANEL */}
                        <div class="flex-1 min-w-0 flex flex-col items-center justify-center p-6 md:p-8 relative">

                            {/* Watermark */}
                            <span class="absolute bottom-4 right-6 font-atomic text-3xl md:text-4xl opacity-[0.04] select-none pointer-events-none text-[#b4cd02]">
                                GUERRA DE STREAMERS
                            </span>

                            {/* Top accent line */}
                            <div class="absolute top-0 left-[15%] right-[15%] h-[2px] bg-linear-to-r from-transparent via-[#b4cd02]/40 to-transparent" />

                            {/* Central content */}
                            <div class="flex flex-col items-center justify-center gap-y-6 w-full max-w-md">

                                {/* Icon */}
                                <div class="mb-1">
                                    <LucideGamepad2 size={42} strokeWidth={1} class="text-[#b4cd02]/40 animate-pulse" />
                                </div>

                                {/* Title */}
                                <div class="text-center space-y-2">
                                    <h2 class="text-4xl md:text-5xl font-atomic tracking-wider text-white uppercase leading-tight">
                                        Preparando la <span class="text-[#b4cd02] drop-shadow-[0_0_8px_rgba(180,205,2,0.3)]">Batalla</span>
                                    </h2>
                                    <p class="font-anton tracking-[0.3em] text-[10px] text-neutral-600 uppercase">
                                        Servidor Central // Protocolo de Espera
                                    </p>
                                </div>

                                {/* Loading status */}
                                <div class="flex flex-col items-center gap-y-4 pt-3">
                                    <SquidLoader />
                                    <div class="flex items-center gap-x-3 px-5 py-2 bg-[#0d0d0f] border border-[#1c1c1e] rounded-full">
                                        <span class="w-1.5 h-1.5 rounded-full bg-[#b4cd02] animate-pulse shadow-[0_0_6px_#b4cd02]" />
                                        <span class="font-anton text-[10px] tracking-[0.2em] text-neutral-600 uppercase">
                                            Sincronizando activos
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER: Hints */}
                            <footer class="w-full grid grid-cols-1 md:grid-cols-3 gap-3 mt-auto pt-5 border-t border-[#18181a]">
                                {HINTS.map(({ title, icon: Icon, description, color }, idx) => (
                                    <div key={idx} class="flex flex-col gap-y-2 p-3.5 bg-[#0d0d0f] border border-[#1c1c1e] hover:border-[#b4cd02]/25 transition-all duration-500 group">
                                        <div class="flex items-center gap-x-2.5">
                                            <div class={`p-1 border border-[#28282a] ${color} group-hover:text-[#b4cd02] transition-colors`}>
                                                <Icon size={14} strokeWidth={2} />
                                            </div>
                                            <span class={`font-atomic text-sm tracking-wider ${color}`}>
                                                {title}
                                            </span>
                                        </div>
                                        <p class="text-[11px] leading-relaxed text-neutral-600">
                                            {description}
                                        </p>
                                    </div>
                                ))}
                            </footer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
