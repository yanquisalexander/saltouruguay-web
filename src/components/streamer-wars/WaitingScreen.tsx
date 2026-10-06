import type { Players } from "../admin/streamer-wars/Players";
import type { Session } from "@auth/core/types";

interface WaitingScreenProps {
    players: Players[];
    expectedPlayers: number;
    session?: Session;
}

export const WaitingScreen = ({ players, expectedPlayers = 50 }: WaitingScreenProps) => {
    const nonAdminPlayers = players.filter((p) => !p.admin);
    const onlineCount = nonAdminPlayers.filter((p: any) => typeof p.online === 'boolean' ? p.online : true).length;
    const pct = Math.min(100, (onlineCount / Math.max(1, expectedPlayers)) * 100);

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Scanlines sutiles */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-size-[100%_4px]" />
                <div class="relative flex flex-col items-center justify-center gap-12 px-6 text-center">
                    {/* Título */}
                    <div class="relative">
                        <h3 class="font-atomic italic text-4xl text-neutral-600 tracking-tighter select-none">
                            Guerra de Streamers
                        </h3>
                        <span class="absolute -top-6 -right-8 font-atomic-extras text-2xl text-[#b4cd02] opacity-20" aria-hidden="true">
                            &#x0055;
                        </span>
                    </div>

                    {/* Contador */}
                    <div class="flex items-center gap-6">
                        <span class="font-atomic-extras text-3xl text-neutral-800" aria-hidden="true">
                            &#x005B;
                        </span>
                        <div class="flex flex-col items-center">
                            <span class="font-anton text-6xl text-white tracking-widest tabular-nums" aria-live="polite" aria-label={`${onlineCount} de ${expectedPlayers} jugadores`}>
                                {onlineCount.toString().padStart(2, '0')}
                            </span>
                            <div class="h-[2px] w-full bg-neutral-800 mt-1" role="progressbar" aria-valuenow={onlineCount} aria-valuemin={0} aria-valuemax={expectedPlayers}>
                                <div
                                    class="h-full bg-[#b4cd02] transition-all duration-500 ease-out shadow-[0_0_8px_rgba(180,205,2,0.6)]"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span class="font-teko text-xl text-neutral-500 tracking-[0.3em] mt-2 uppercase">
                                / {expectedPlayers}
                            </span>
                        </div>
                        <span class="font-atomic-extras text-3xl text-neutral-800" aria-hidden="true">
                            &#x005D;
                        </span>
                    </div>

                    {/* Estado */}
                    <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 rounded-full bg-[#b4cd02] animate-pulse shadow-[0_0_8px_#b4cd02]" />
                        <h2 class="font-teko text-2xl text-neutral-400 tracking-[0.4em] uppercase">
                            Esperando jugadores
                        </h2>
                    </div>
                </div>

                {/* Glifo decorativo esquina */}
                <div class="absolute bottom-10 left-10 opacity-10" aria-hidden="true">
                    <span class="font-atomic-extras text-5xl text-white">&#x0050;</span>
                </div>
        </div>
    );
};

export default WaitingScreen;
