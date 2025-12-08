import { h } from 'preact';
import PetSprite from './PetSprite';

interface PetAvatarProps {
    appearance: {
        color: string;
        skinId: string | null;
        hatId: string | null;
        accessoryId: string | null;
        eyesId: string | null;
        mouthId: string | null;
    };
    stats: {
        hunger: number;
        energy: number;
        hygiene: number;
        happiness: number;
    };
    isSleeping?: boolean;
    isEating?: boolean;
}

export default function PetAvatar({ appearance, stats, isSleeping, isEating }: PetAvatarProps) {
    return (
        <div className="relative w-full h-full flex items-center justify-center min-h-[300px]">
            <PetSprite
                appearance={appearance}
                stats={stats}
                isSleeping={isSleeping}
                isEating={isEating}
            />

            {/* Status indicators - Floating bubbles */}
            {stats.hunger < 20 && (
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg animate-bounce border border-white/20 z-20">
                    <span className="text-2xl">🍽️</span>
                </div>
            )}
            {stats.energy < 20 && (
                <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-orange-500/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg animate-pulse border border-white/20 z-20">
                    <span className="text-2xl">💤</span>
                </div>
            )}
            {stats.hygiene < 20 && (
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-yellow-500/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg animate-bounce border border-white/20 z-20">
                    <span className="text-2xl">🧼</span>
                </div>
            )}

            {/* Decorative elements - Modern floating shapes */}
            <div className="absolute -z-10 w-full h-full overflow-hidden rounded-3xl pointer-events-none">
                <div className="absolute top-10 left-10 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-20 right-10 w-24 h-24 bg-pink-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-5 w-12 h-12 bg-blue-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
            </div>
        </div>
    );
}

