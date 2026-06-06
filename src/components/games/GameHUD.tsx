import { h } from 'preact';
import { LucideCoins, LucideTrophy } from 'lucide-preact';

interface GameHUDProps {
    score: number;
    coins?: number;
    showScore?: boolean;
    showCoins?: boolean;
    additionalInfo?: {
        label: string;
        value: string | number;
        icon?: any;
    };
}

export function GameHUD({
    score,
    coins,
    showScore = true,
    showCoins = true,
    additionalInfo,
}: GameHUDProps) {
    return (
        <div class="flex flex-wrap gap-3 items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-4">
            {showScore && (
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                        <LucideTrophy size={20} />
                    </div>
                    <div>
                        <span class="text-[10px] font-rubik text-white/40 uppercase tracking-wider">Puntos</span>
                        <p class="font-teko text-xl text-white font-bold tabular-nums leading-none">{score.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {showCoins && coins !== undefined && (
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                        <LucideCoins size={20} />
                    </div>
                    <div>
                        <span class="text-[10px] font-rubik text-white/40 uppercase tracking-wider">SaltoCoins</span>
                        <p class="font-teko text-xl text-white font-bold tabular-nums leading-none">{coins.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {additionalInfo && (
                <div class="flex items-center gap-3">
                    {additionalInfo.icon && <additionalInfo.icon size={20} class="text-electric-violet-400" />}
                    <div>
                        <span class="text-[10px] font-rubik text-white/40 uppercase tracking-wider">{additionalInfo.label}</span>
                        <p class="font-teko text-xl text-white font-bold tabular-nums leading-none">{additionalInfo.value}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

interface GameRewardProps {
    coins: number;
    visible: boolean;
    onComplete?: () => void;
}

export function GameReward({ coins, visible, onComplete }: GameRewardProps) {
    if (!visible) return null;

    return (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div class="relative rounded-2xl border border-yellow-500/30 bg-linear-to-b from-yellow-900/20 to-black p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center max-w-sm w-full mx-4">
                <div class="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none rounded-2xl" />
                <div class="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                <div class="relative z-10">
                    <div class="p-4 bg-yellow-500 text-black rounded-full w-fit mx-auto mb-4 shadow-lg shadow-yellow-500/20">
                        <LucideCoins size={40} />
                    </div>
                    <h2 class="font-teko text-3xl text-white uppercase tracking-wide mb-1">¡Recompensa!</h2>
                    <p class="font-teko text-5xl text-yellow-400 font-bold mb-2">+{coins.toLocaleString()}</p>
                    <p class="font-rubik text-sm text-white/50 mb-6">SaltoCoins añadidos a tu Banco Saltano</p>
                    {onComplete && (
                        <button
                            onClick={onComplete}
                            class="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-teko text-lg font-bold uppercase tracking-wide transition-all shadow-lg"
                        >
                            Continuar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
