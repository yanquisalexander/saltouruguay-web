import type { Session } from "@auth/core/types";
import type { Channel } from "pusher-js";
import {
    LucideVenetianMask,
    LucideSend,
    LucidePartyPopper,
    LucideGamepad2
} from "lucide-preact";
import { ChatRoom } from "./ChatRoom";
import { TabletFrame } from "../TabletFrame";

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
    bgVolume?: number;
    setBgVolume?: (volume: number) => void;
    bgAudio?: HTMLAudioElement | null;
    players?: any[];
    expectedPlayers?: number;
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

export const WaitingRoom = ({ session, channel, players = [], expectedPlayers = 0 }: WaitingRoomProps) => {
    return (
        <TabletFrame
            statusTitle="Lobby // Sala de espera"
            decor={<><GeometricBg /><GlitchLines /></>}
        >
            {/* CONTENT: Chat + Lobby (ajuste exacto, sin scroll) */}
            <div class="relative flex h-full w-full min-h-0">

                        {/* LEFT: CHAT PANEL */}
                        <div class="w-[34%] min-w-0 flex-shrink-0 self-stretch border-r border-[#18181a] min-h-0">
                            <ChatRoom session={session} channel={channel} />
                        </div>

                        {/* RIGHT: LOBBY PANEL */}
                        <div class="flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center gap-4 p-4 md:p-6 relative">

                            {/* Watermark */}
                            <span class="absolute bottom-3 right-5 font-atomic text-2xl opacity-[0.04] select-none pointer-events-none text-[#b4cd02]">
                                GUERRA DE STREAMERS
                            </span>

                            {/* Top accent line */}
                            <div class="absolute top-0 left-[15%] right-[15%] h-[2px] bg-linear-to-r from-transparent via-[#b4cd02]/40 to-transparent" />

                            {/* Central content */}
                            <div class="flex flex-col items-center justify-center gap-y-3 w-full max-w-md min-h-0">
                                <LucideGamepad2 size={30} strokeWidth={1} class="text-[#b4cd02]/40 animate-pulse" />

                                {/* Title */}
                                <div class="text-center space-y-1">
                                    <h2 class="text-3xl md:text-4xl font-atomic tracking-wider text-white uppercase leading-tight">
                                        Preparando la <span class="text-[#b4cd02] drop-shadow-[0_0_8px_rgba(180,205,2,0.3)]">Batalla</span>
                                    </h2>
                                    <p class="font-anton tracking-[0.3em] text-[10px] text-neutral-600 uppercase">
                                        Servidor Central // Protocolo de Espera
                                    </p>
                                </div>

                                {/* Loading status + conteo vivo */}
                                <div class="flex flex-col items-center gap-y-2">
                                    <SquidLoader />
                                    <div class="flex items-center gap-x-3 px-5 py-1.5 bg-[#0d0d0f] border border-[#1c1c1e] rounded-full">
                                        <span class="w-1.5 h-1.5 rounded-full bg-[#b4cd02] animate-pulse shadow-[0_0_6px_#b4cd02]" />
                                        <span class="font-anton text-[10px] tracking-[0.2em] text-neutral-400 uppercase" aria-live="polite">
                                            {expectedPlayers > 0 ? `${players.length}/${expectedPlayers} en sala` : "Sincronizando activos"}
                                        </span>
                                    </div>
                                    {expectedPlayers > 0 && (
                                        <div class="h-1.5 w-56 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={players.length} aria-valuemin={0} aria-valuemax={expectedPlayers}>
                                            <div class="h-full rounded-full bg-[#b4cd02] transition-all duration-500" style={{ width: `${Math.min(100, (players.length / Math.max(1, expectedPlayers)) * 100)}%` }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FOOTER: Hints */}
                            <footer class="w-full grid grid-cols-3 gap-2 pt-3 border-t border-[#18181a]">
                                {HINTS.map(({ title, icon: Icon, description, color }, idx) => (
                                    <div key={idx} class="flex flex-col gap-y-1 p-2 bg-[#0d0d0f] border border-[#1c1c1e] hover:border-[#b4cd02]/25 transition-all duration-500 group min-w-0">
                                        <div class="flex items-center gap-x-2">
                                            <div class={`p-1 border border-[#28282a] ${color} group-hover:text-[#b4cd02] transition-colors shrink-0`}>
                                                <Icon size={12} strokeWidth={2} />
                                            </div>
                                            <span class={`font-atomic text-xs tracking-wider truncate ${color}`}>
                                                {title}
                                            </span>
                                        </div>
                                        <p class="text-[10px] leading-snug text-neutral-600 line-clamp-2">
                                            {description}
                                        </p>
                                    </div>
                                ))}
                            </footer>
                        </div>
            </div>
        </TabletFrame>
    );
};
