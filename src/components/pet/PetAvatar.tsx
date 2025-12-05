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
        <div className="relative w-full aspect-square flex items-center justify-center">
            {/* Pet Body */}
            <div
                className={`relative w-48 h-48 rounded-full border-8 shadow-2xl ${getAnimationClass()}`}
                style={{
                    backgroundColor: appearance.color,
                    borderColor: '#FFD700',
                }}
            >
                {/* Face */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl">
                        {getExpression()}
                    </div>
                </div>

                {/* Status indicators */}
                {stats.hunger < 20 && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-600 border-4 border-red-800 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-xl">🍽️</span>
                    </div>
                )}
                {stats.energy < 20 && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-600 border-4 border-orange-800 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-xl">💤</span>
                    </div>
                )}
                {stats.hygiene < 20 && (
                    <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-yellow-600 border-4 border-yellow-800 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-xl">🧼</span>
                    </div>
                )}
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 w-full h-full">
                <div className="absolute top-10 left-10 w-8 h-8 bg-yellow-300 rounded-full opacity-50 animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-20 right-10 w-6 h-6 bg-pink-300 rounded-full opacity-50 animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-5 w-5 h-5 bg-blue-300 rounded-full opacity-50 animate-float" style={{ animationDelay: '2s' }}></div>
            </div>
        </div>
    );
}
