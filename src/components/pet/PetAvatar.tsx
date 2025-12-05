import { h } from 'preact';

interface PetAvatarProps {
    appearance: {
        color: string;
        skinId: string | null;
        hatId: string | null;
        accessoryId: string | null;
    };
    stats: {
        hunger: number;
        energy: number;
        hygiene: number;
        happiness: number;
    };
}

export default function PetAvatar({ appearance, stats }: PetAvatarProps) {
    // Determine pet expression based on stats
    const getExpression = () => {
        const avgStat = (stats.hunger + stats.energy + stats.hygiene + stats.happiness) / 4;

        if (avgStat < 20) return '😢'; // Very sad
        if (avgStat < 40) return '😟'; // Sad
        if (avgStat < 60) return '😐'; // Neutral
        if (avgStat < 80) return '🙂'; // Happy
        return '😄'; // Very happy
    };

    // Determine animation class
    const getAnimationClass = () => {
        if (stats.energy < 20) return 'animate-pulse-slow';
        if (stats.happiness > 80) return 'animate-bounce-slow';
        return '';
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center min-h-[300px]">
            {/* Pet Body */}
            <div
                className={`relative w-64 h-64 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.3)] transition-all duration-500 ${getAnimationClass()}`}
                style={{
                    backgroundColor: appearance.color,
                    boxShadow: `inset -20px -20px 60px rgba(0,0,0,0.2), inset 20px 20px 60px rgba(255,255,255,0.2), 0 0 30px ${appearance.color}80`
                }}
            >
                {/* Face */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-8xl drop-shadow-lg filter">
                        {getExpression()}
                    </div>
                </div>

                {/* Status indicators - Floating bubbles */}
                {stats.hunger < 20 && (
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg animate-bounce border border-white/20">
                        <span className="text-2xl">🍽️</span>
                    </div>
                )}
                {stats.energy < 20 && (
                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-orange-500/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg animate-pulse border border-white/20">
                        <span className="text-2xl">💤</span>
                    </div>
                )}
                {stats.hygiene < 20 && (
                    <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-yellow-500/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg animate-bounce border border-white/20">
                        <span className="text-2xl">🧼</span>
                    </div>
                )}
            </div>

            {/* Decorative elements - Modern floating shapes */}
            <div className="absolute -z-10 w-full h-full overflow-hidden rounded-3xl">
                <div className="absolute top-10 left-10 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-20 right-10 w-24 h-24 bg-pink-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-5 w-12 h-12 bg-blue-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
            </div>
        </div>
    );
}
