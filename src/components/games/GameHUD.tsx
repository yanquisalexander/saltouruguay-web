import { h } from 'preact';
import { LucideCoins, LucideTrophy, LucideZap } from 'lucide-preact';

interface GameHUDProps {
    score: number;
    coins?: number;
    energy?: number;
    maxEnergy?: number;
    showScore?: boolean;
    showCoins?: boolean;
    showEnergy?: boolean;
    additionalInfo?: {
        label: string;
        value: string | number;
        icon?: any;
    };
}

export function GameHUD({
    score,
    coins,
    energy,
    maxEnergy = 100,
    showScore = true,
    showCoins = true,
    showEnergy = false,
    additionalInfo,
}: GameHUDProps) {
    return (
        <div className="pixel-panel p-4 flex flex-wrap gap-4 items-center justify-between">
            {/* Score Display */}
            {showScore && (
                <div className="pixel-coin-display">
                    <LucideTrophy size={24} className="text-yellow-400" />
                    <div className="flex flex-col">
                        <span className="text-xs text-white/60 uppercase font-rubik">Puntos</span>
                        <span className="text-lg font-bold pixel-text-secondary font-rubik">
                            {score.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {/* Coins Display */}
            {showCoins && coins !== undefined && (
                <div className="pixel-coin-display">
                    <LucideCoins size={24} className="text-yellow-400 pixel-coin-icon" />
                    <div className="flex flex-col">
                        <span className="text-xs text-white/60 uppercase font-rubik">SaltoCoins</span>
                        <span className="text-lg font-bold pixel-text-secondary font-rubik">
                            {coins.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {/* Energy Display */}
            {showEnergy && energy !== undefined && (
                <div className="pixel-coin-display flex-col items-start min-w-[150px]">
                    <div className="flex items-center gap-2 w-full mb-1">
                        <LucideZap size={20} className="text-blue-400" />
                        <span className="text-xs text-white/60 uppercase font-rubik">Energía</span>
                        <span className="text-sm font-bold pixel-text ml-auto font-rubik">
                            {energy}/{maxEnergy}
                        </span>
                    </div>
                    <div className="pixel-progress w-full">
                        <div 
                            className="pixel-progress-bar"
                            style={{ width: `${(energy / maxEnergy) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Additional Info */}
            {additionalInfo && (
                <div className="pixel-coin-display">
                    {additionalInfo.icon && <additionalInfo.icon size={24} className="text-electric-violet-400" />}
                    <div className="flex flex-col">
                        <span className="text-xs text-white/60 uppercase font-rubik">{additionalInfo.label}</span>
                        <span className="text-lg font-bold pixel-text font-rubik">
                            {additionalInfo.value}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

interface GameFeedbackProps {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    visible: boolean;
    onDismiss?: () => void;
}

export function GameFeedback({ type, message, visible, onDismiss }: GameFeedbackProps) {
    if (!visible) return null;

    const typeClasses = {
        success: 'pixel-btn-success pixel-glow',
        error: 'pixel-btn-danger pixel-shake',
        warning: 'pixel-btn-secondary',
        info: 'pixel-btn-primary',
    };

    return (
        <div className={`pixel-modal fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${typeClasses[type]} animate-fade-in-up`}>
            <p className="pixel-text font-bold">{message}</p>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="ml-4 text-white/70 hover:text-white"
                >
                    ✕
                </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-blurred-fade-in">
            <div className="pixel-modal p-8 animate-fade-in-up pixel-glow">
                <div className="text-center">
                    <LucideCoins size={64} className="text-yellow-400 mx-auto mb-4 pixel-coin-icon" />
                    <h2 className="pixel-heading text-2xl pixel-text-secondary mb-2">
                        ¡Recompensa!
                    </h2>
                    <p className="pixel-text text-3xl font-bold text-white mb-4">
                        +{coins.toLocaleString()}
                    </p>
                    <p className="pixel-text text-sm text-white/70 mb-6">
                        SaltoCoins añadidos a tu Banco Saltano
                    </p>
                    {onComplete && (
                        <button
                            onClick={onComplete}
                            className="pixel-btn-success w-full"
                        >
                            Continuar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
