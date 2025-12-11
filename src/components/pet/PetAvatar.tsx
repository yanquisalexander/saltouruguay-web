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
    isCleaning?: boolean;
    cleaningProgress?: number;
}

export default function PetAvatar({ appearance, stats, isSleeping, isEating, isCleaning, cleaningProgress = 0 }: PetAvatarProps) {
    // Calculate dirt opacity based on hygiene (inverse)
    // 100 hygiene = 0 opacity, 0 hygiene = 0.8 opacity
    // If cleaning, reduce opacity based on progress
    const baseHygiene = stats.hygiene;
    const effectiveHygiene = isCleaning
        ? baseHygiene + (100 - baseHygiene) * (cleaningProgress / 100)
        : baseHygiene;

    const dirtOpacity = Math.max(0, (100 - effectiveHygiene) / 100);

    return (
        <div className="relative w-full h-full flex items-center justify-center min-h-[300px]">
            <PetSprite
                appearance={appearance}
                stats={stats}
                isSleeping={isSleeping}
                isEating={isEating}
            />

            {/* Dirt Overlay */}
            {dirtOpacity > 0 && (
                <div
                    className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 flex items-center justify-center"
                    style={{ opacity: dirtOpacity }}
                >
                    {/* General grime filter - centered on pet */}
                    <div className="absolute w-64 h-64 bg-[#3e2723] mix-blend-multiply opacity-20 rounded-full blur-2xl"></div>

                    {/* Random dirt spots - Darker and more visible, clustered around center */}
                    <div className="absolute -translate-x-10 -translate-y-10 w-20 h-20 bg-[#3e2723] rounded-full blur-md opacity-80 mix-blend-multiply"></div>
                    <div className="absolute translate-x-12 translate-y-8 w-24 h-24 bg-[#2d1b18] rounded-full blur-lg opacity-70 mix-blend-multiply"></div>
                    <div className="absolute translate-x-8 -translate-y-12 w-14 h-14 bg-[#4e342e] rounded-full blur-sm opacity-90 mix-blend-multiply"></div>
                    <div className="absolute -translate-x-8 translate-y-16 w-16 h-16 bg-[#3e2723] rounded-full blur-md opacity-80 mix-blend-multiply"></div>
                    <div className="absolute -translate-x-16 translate-y-0 w-12 h-12 bg-[#2d1b18] rounded-full blur-md opacity-60 mix-blend-multiply"></div>

                    {/* Flies animation for very dirty pets */}
                    {stats.hygiene < 30 && (
                        <>
                            <div className="absolute -top-10 left-10 text-xl animate-bounce duration-700">🪰</div>
                            <div className="absolute top-0 -right-10 text-xl animate-bounce delay-300 duration-1000">🪰</div>
                        </>
                    )}
                </div>
            )}

            {/* Cleaning Bubbles */}
            {isCleaning && (
                <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="absolute top-0 left-0 w-full h-full animate-pulse opacity-30 bg-white/10 rounded-full blur-xl"></div>
                </div>
            )}

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

