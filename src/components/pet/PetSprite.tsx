import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { motion, AnimatePresence } from 'motion/react';
import { getSpriteStyle } from '../../utils/petSprites';

interface PetSpriteProps {
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
    isEating?: boolean;
    isSleeping?: boolean;
}

export default function PetSprite({ appearance, stats, isEating, isSleeping }: PetSpriteProps) {
    const [blink, setBlink] = useState(false);
    const [bounce, setBounce] = useState(0);

    // Blinking animation
    useEffect(() => {
        const interval = setInterval(() => {
            setBlink(true);
            setTimeout(() => setBlink(false), 200);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Idle bounce animation
    useEffect(() => {
        const interval = setInterval(() => {
            setBounce(prev => prev + 1);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const mapColorToSpriteColor = (color: string) => {
        if (!color) return 'blue';
        const lower = color.toLowerCase();
        if (['blue', 'dark', 'green', 'red', 'white', 'yellow'].includes(lower)) return lower;

        // Try to map common hex/names or default to blue
        if (lower.includes('blue')) return 'blue';
        if (lower.includes('red')) return 'red';
        if (lower.includes('green')) return 'green';
        if (lower.includes('yellow')) return 'yellow';
        if (lower.includes('white')) return 'white';
        if (lower.includes('black') || lower.includes('dark')) return 'dark';

        return 'blue';
    };

    const spriteColor = mapColorToSpriteColor(appearance.color);
    const skinType = appearance.skinId || 'A';
    const bodySprite = `body_${spriteColor}${skinType}`;

    // Determine eye sprite based on stats and state
    let eyeType = 'eye_cute_light';
    if (isSleeping) eyeType = 'eye_closed_happy';
    else if (stats.happiness < 30) eyeType = 'eye_closed_sad';
    else if (stats.energy < 30) eyeType = 'eye_dead';
    else if (stats.hunger < 30) eyeType = 'eye_psycho_light';

    // Override with accessory if it's an eye type
    if (appearance.accessoryId && appearance.accessoryId.startsWith('eye_')) {
        eyeType = appearance.accessoryId;
    }

    const eyeSprite = eyeType;

    // Mouth sprite
    let mouthSprite = 'mouth_closed_happy';
    if (isEating) mouthSprite = 'mouthA'; // Open mouth
    else if (stats.happiness < 40) mouthSprite = 'mouth_closed_sad';
    else if (stats.hunger < 40) mouthSprite = 'mouth_closed_teeth';

    // Hat/Detail sprite
    const hatSprite = appearance.hatId ? `detail_${spriteColor}_${appearance.hatId}` : null;

    // Arms and Legs (defaulting to A for now, could be customizable)
    const armSprite = `arm_${spriteColor}A`;
    const legSprite = `leg_${spriteColor}A`;

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            <motion.div
                animate={{
                    y: [0, -10, 0],
                    scale: isEating ? [1, 1.05, 1] : 1
                }}
                transition={{
                    y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 0.3, repeat: isEating ? Infinity : 0 }
                }}
                className="relative"
            >
                {/* Legs (Behind body) */}
                <div className="absolute -bottom-4 -left-4" style={getSpriteStyle(legSprite, 0.8)} />
                <div className="absolute -bottom-4 -right-4 transform scale-x-[-1]" style={getSpriteStyle(legSprite, 0.8)} />

                {/* Arms (Behind body) */}
                <div className="absolute top-10 -left-8 origin-top-right rotate-12" style={getSpriteStyle(armSprite, 0.8)} />
                <div className="absolute top-10 -right-8 origin-top-left -rotate-12 transform scale-x-[-1]" style={getSpriteStyle(armSprite, 0.8)} />

                {/* Body */}
                <div style={getSpriteStyle(bodySprite)} className="relative z-10">
                    {/* Face Container */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        {/* Eyes */}
                        <div className="flex gap-4 mb-2">
                            <div className={`${blink ? 'scale-y-10' : ''} transition-transform duration-100`}>
                                <div style={getSpriteStyle(eyeSprite, 0.8)} />
                            </div>
                            <div className={`${blink ? 'scale-y-10' : ''} transition-transform duration-100 transform scale-x-[-1]`}>
                                <div style={getSpriteStyle(eyeSprite, 0.8)} />
                            </div>
                        </div>

                        {/* Mouth */}
                        <div className="mt-2">
                            <div style={getSpriteStyle(mouthSprite, 0.8)} />
                        </div>
                    </div>

                    {/* Hat/Detail */}
                    {hatSprite && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                            <div style={getSpriteStyle(hatSprite)} />
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
