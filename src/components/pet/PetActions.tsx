import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { petToast } from '@/utils/petToast';
import { motion } from 'motion/react';
import { type RefObject } from 'preact';
import {
    LucideUtensils,
    LucideSparkles,
    LucideBed,
    LucideGamepad2,
    LucideX
} from 'lucide-preact';
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";
// import CitrusRainGame from './games/CitrusRainGame';

interface PetActionsProps {
    petId: number;
    stats: {
        hunger: number;
        energy: number;
        hygiene: number;
        happiness: number;
    };
    isSleeping: boolean;
    onActionComplete: () => void;
    petRef?: RefObject<HTMLDivElement>;
    onEatStart?: () => void;
    onEatEnd?: () => void;
    onCleanStart?: () => void;
    onCleanEnd?: () => void;
    onCleanProgress?: (progress: number) => void;
    onOpenStore?: () => void;
    onPlayGame?: (game: 'citrus' | 'jump') => void;
    onOptimisticUpdate?: (stats: Partial<{
        hunger: number;
        energy: number;
        hygiene: number;
        happiness: number;
    }>) => void;
}

export interface InventoryItem {
    id: number;
    itemId: number;
    quantity: number;
    item: {
        id: number;
        name: string;
        category: string;
        effectValue: number;
    };
}

export default function PetActions({ petId, stats, isSleeping, onActionComplete, petRef, onEatStart, onEatEnd, onCleanStart, onCleanEnd, onCleanProgress, onOpenStore, onPlayGame, onOptimisticUpdate }: PetActionsProps) {
    const [performing, setPerforming] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [selectedFoodItem, setSelectedFoodItem] = useState<number | null>(null);
    const [selectedToyItem, setSelectedToyItem] = useState<number | null>(null);
    const [showFoodSelector, setShowFoodSelector] = useState(false);
    const [showToySelector, setShowToySelector] = useState(false);
    const [showGameSelector, setShowGameSelector] = useState(false);

    // Cleaning state
    const [isCleaningMode, setIsCleaningMode] = useState(false);
    const [cleanliness, setCleanliness] = useState(0);
    const soapRef = useRef<HTMLDivElement>(null);

    // Feeding state
    const [mouthSoundPlayed, setMouthSoundPlayed] = useState(false);

    // const [activeGame, setActiveGame] = useState<'citrus' | null>(null); // Moved to parent

    const [foodPage, setFoodPage] = useState(0);
    const ITEMS_PER_PAGE = 8;

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            const result = await actions.pet.getUserInventory();
            if (result.data) {
                setInventory(result.data as InventoryItem[]);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    };

    const handleFeed = async (arg?: number | unknown) => {
        const itemId = typeof arg === 'number' ? arg : undefined;
        const idToUse = itemId || selectedFoodItem;

        if (!idToUse) {
            setShowFoodSelector(true);
            return;
        }

        // Optimistic update setup
        const itemIndex = inventory.findIndex(i => i.itemId === idToUse);
        const item = inventory[itemIndex];
        const previousInventory = [...inventory];
        const previousStats = { ...stats };

        if (item) {
            // 1. Optimistic Inventory
            const newInventory = [...inventory];
            if (item.quantity > 1) {
                newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
            } else {
                newInventory.splice(itemIndex, 1);
            }
            setInventory(newInventory);

            // 2. Optimistic Stats
            if (onOptimisticUpdate) {
                const newHunger = Math.min(100, stats.hunger + item.item.effectValue);
                onOptimisticUpdate({ hunger: newHunger });
            }

            // 3. Immediate Feedback
            playSound({ sound: STREAMER_WARS_SOUNDS.PET_EAT, volume: 0.5 });
        }

        try {
            setPerforming('feed');
            const { error, data } = await actions.pet.feedPet({ itemId: idToUse });

            if (data?.success) {
                await loadInventory();
                petToast.success('¡Mascota alimentada!', '🍎');
                onActionComplete();
                // Don't close selector immediately to allow feeding more
                // setShowFoodSelector(false); 
            }

            if (error) {
                throw new Error(error.message || 'Error al alimentar la mascota');
            }
        } catch (error: any) {
            // Rollback
            setInventory(previousInventory);
            if (onOptimisticUpdate) {
                onOptimisticUpdate(previousStats);
            }

            petToast.error(error.message || 'Error al alimentar la mascota');
            if (error.message?.includes('fallecido')) {
                onActionComplete();
            }
        } finally {
            setPerforming(null);
        }
    };

    const handleDragEnd = (event: any, info: any, item: InventoryItem) => {
        onEatEnd?.();

        if (!petRef?.current) {
            console.warn("Pet reference not found for drop target");
            return;
        }

        const petRect = petRef.current.getBoundingClientRect();
        const point = info.point;

        // Increase padding to make dropping much easier
        // Effectively covers most of the central screen area
        const padding = 100;

        // Check if dropped within pet bounds (with generous padding)
        if (
            point.x >= (petRect.left - padding) &&
            point.x <= (petRect.right + padding) &&
            point.y >= (petRect.top - padding) &&
            point.y <= (petRect.bottom + padding)
        ) {
            handleFeed(item.itemId);
        }
    };

    const handleFoodDrag = (event: any, info: any) => {
        if (!petRef?.current || mouthSoundPlayed) return;

        const petRect = petRef.current.getBoundingClientRect();
        const point = info.point;

        // Calculate mouth position (center-top of pet area, roughly where the face is)
        const mouthX = petRect.left + petRect.width / 2;
        const mouthY = petRect.top + petRect.height * 0.3; // About 30% down from top

        // Calculate distance from food to mouth
        const distance = Math.sqrt(
            Math.pow(point.x - mouthX, 2) + Math.pow(point.y - mouthY, 2)
        );

        // If food is within 80px of mouth, play mouth opening sound
        if (distance < 80) {
            playSound({ sound: STREAMER_WARS_SOUNDS.PET_MOUTH_OPEN });
            setMouthSoundPlayed(true);
        }
    };

    const handleCleanToggle = () => {
        if (isCleaningMode) {
            setIsCleaningMode(false);
            onCleanEnd?.();
            setCleanliness(0);
        } else {
            setIsCleaningMode(true);
            onCleanStart?.();
            setCleanliness(0);
            petToast.info('¡Frota el jabón sobre tu mascota!', '🧼');
        }
    };

    const handleSoapDrag = (event: any, info: any) => {
        if (!petRef?.current) return;

        const petRect = petRef.current.getBoundingClientRect();
        const point = info.point;
        const padding = 50;

        // Check if soap is over pet
        if (
            point.x >= (petRect.left - padding) &&
            point.x <= (petRect.right + padding) &&
            point.y >= (petRect.top - padding) &&
            point.y <= (petRect.bottom + padding)
        ) {
            // Calculate movement distance to determine cleaning amount
            // Use delta to ensure we only clean when moving
            const distance = Math.sqrt(info.delta.x ** 2 + info.delta.y ** 2);

            // Ignore very small movements or no movement
            if (distance < 0.5) return;

            // Increase cleanliness based on movement intensity
            // Slower increment to make it feel like "rubbing"
            // Multiplier 0.1 means you need to move ~1000 pixels total to clean (100 / 0.1)
            const increment = Math.min(distance * 0.15, 1.5);

            setCleanliness(prev => {
                // If already done, don't do anything
                if (prev >= 100) return 100;

                const newVal = Math.min(100, prev + increment);

                // Notify parent for visual feedback
                onCleanProgress?.(newVal);

                // Play sound occasionally
                if (Math.floor(newVal / 20) > Math.floor(prev / 20) && newVal < 100) {
                    playSound({ sound: STREAMER_WARS_SOUNDS.PET_SHOWER, volume: 0.2 });
                }

                if (newVal >= 100 && prev < 100) {
                    // Execute completion outside of the state update
                    setTimeout(() => handleCleanComplete(), 100);
                }
                return newVal;
            });
        }
    };

    const handleCleanComplete = async () => {
        setIsCleaningMode(false);
        onCleanEnd?.();
        setCleanliness(0);

        // Optimistic update
        if (onOptimisticUpdate) {
            onOptimisticUpdate({ hygiene: 100 });
        }

        try {
            setPerforming('clean');
            const { data, error } = await actions.pet.cleanPet();

            if (data?.success) {
                petToast.success('¡Mascota reluciente!', '✨');
                playSound({ sound: STREAMER_WARS_SOUNDS.PET_SHOWER, volume: 0.5 });
                onActionComplete();
            }

            if (error) {
                petToast.error(error.message || 'Error al limpiar la mascota');
                if (error.message?.includes('fallecido')) {
                    onActionComplete();
                }
            }
        } catch (error: any) {
            petToast.error(error.message || 'Error al limpiar la mascota');
        } finally {
            setPerforming(null);
        }
    };

    const handlePlay = async (scoreBonus: number = 0) => {
        // If onPlayGame is provided, show selector
        if (onPlayGame && scoreBonus === 0) {
            setShowGameSelector(true);
            return;
        }

        try {
            setPerforming('play');
            // If scoreBonus is provided, it means it comes from a game
            // We could pass this to the backend if the action supported it
            // For now we just play the standard action but maybe we can assume
            // the game was successful if score > 0

            const { data, error } = await actions.pet.playWithPet({ itemId: selectedToyItem || undefined });

            if (data?.success) {
                if (scoreBonus > 0) {
                    petToast.success(`¡Juego terminado! +${scoreBonus} pts`, '🏆');
                    playSound({ sound: STREAMER_WARS_SOUNDS.SIMON_SAYS_CORRECT });
                } else {
                    petToast.success('¡Jugaste con tu mascota!', '🎮');
                }

                if (selectedToyItem) {
                    await loadInventory();
                }
                onActionComplete();
                setShowToySelector(false);
            }

            if (error) {
                petToast.error(error.message || 'Error al jugar con la mascota');
                if (error.message?.includes('fallecido')) {
                    onActionComplete();
                }
            }
        } catch (error: any) {
            petToast.error(error.message || 'Error al jugar con la mascota');
        } finally {
            setPerforming(null);
            // setActiveGame(null);
        }
    };

    const handleSleepToggle = async () => {
        if (isSleeping) {
            try {
                setPerforming('wake');
                const { data, error } = await actions.pet.wakePet();

                if (data?.success) {
                    playSound({ sound: STREAMER_WARS_SOUNDS.PET_AWAKE, volume: 0.5 });
                    petToast.success('¡Buenos días!', '☀️');
                    onActionComplete();
                }

                if (error) {
                    petToast.error(error.message || 'Error al despertar la mascota');
                    if (error.message?.includes('fallecido')) {
                        onActionComplete();
                    }
                }
            } catch (error: any) {
                petToast.error(error.message || 'Error al despertar la mascota');
            } finally {
                setPerforming(null);
            }
        } else {
            try {
                setPerforming('sleep');
                const { data, error } = await actions.pet.putPetToSleep();

                if (data?.success) {
                    petToast.success('¡A dormir!', '💤');
                    onActionComplete();
                }

                if (error) {
                    petToast.error(error.message || 'Error al dormir la mascota');
                    if (error.message?.includes('fallecido')) {
                        onActionComplete();
                    }
                }
            } catch (error: any) {
                petToast.error(error.message || 'Error al dormir la mascota');
            } finally {
                setPerforming(null);
            }
        }
    };

    const foodItems = inventory.filter(item => item.item.category === 'food');
    const toyItems = inventory.filter(item => item.item.category === 'toy');

    const paginatedFoodItems = foodItems.slice(foodPage * ITEMS_PER_PAGE, (foodPage + 1) * ITEMS_PER_PAGE);
    const totalFoodPages = Math.ceil(foodItems.length / ITEMS_PER_PAGE);

    const ActionButton = ({ onClick, disabled, icon: Icon, label, colorClass, bgClass, borderClass }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center gap-2 group w-full disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4 disabled:grayscale-[0.5]`}
        >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl ${bgClass} ${colorClass} flex items-center justify-center shadow-lg ${borderClass} border border-b-4 active:border-b active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4 backdrop-blur-sm`}>
                <Icon size={28} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">{label}</span>
        </button>
    );

    return (
        <div className="w-full relative">
            {/* {activeGame === 'citrus' && (
                <CitrusRainGame 
                    onClose={() => setActiveGame(null)}
                    onComplete={(score) => handlePlay(score)}
                />
            )} */}

            {/* Game Selector */}
            {showGameSelector && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-white/10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl"
                >
                    <div className="max-w-md mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white">Elige un juego</h3>
                            <button
                                onClick={() => setShowGameSelector(false)}
                                className="bg-white/10 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                            >
                                <LucideX size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-4">
                            <button
                                onClick={() => {
                                    setShowGameSelector(false);
                                    onPlayGame?.('citrus');
                                }}
                                className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-2xl p-4 flex flex-col items-center gap-3 transition-all hover:scale-105 active:scale-95 group"
                            >
                                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/20">🍊</div>
                                <span className="font-bold text-orange-200">Lluvia Cítrica</span>
                            </button>

                            <button
                                onClick={() => {
                                    setShowGameSelector(false);
                                    onPlayGame?.('jump');
                                }}
                                className="bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-2xl p-4 flex flex-col items-center gap-3 transition-all hover:scale-105 active:scale-95 group"
                            >
                                <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-lg shadow-violet-900/20">🏃</div>
                                <span className="font-bold text-violet-200">Salto Jump</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Soap for Cleaning Mode */}
            {isCleaningMode && (
                <div className="fixed inset-0 z-50 pointer-events-none">
                    <motion.div
                        drag
                        dragConstraints={petRef}
                        dragElastic={0.1}
                        dragMomentum={false}
                        onDrag={handleSoapDrag}
                        className="absolute bottom-32 left-1/2 -translate-x-1/2 w-24 h-16 bg-pink-200 rounded-3xl shadow-xl border-4 border-white/50 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto z-50"
                        style={{ touchAction: 'none' }}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        <span className="text-3xl select-none">🧼</span>
                        {/* Bubbles effect when dragging */}
                        <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl animate-pulse -z-10"></div>
                    </motion.div>
                </div>
            )}

            {/* Cleaning Status Indicator */}
            {isCleaningMode && (
                <div className="absolute bottom-full left-0 right-0 mb-4 px-2 animate-fade-in z-20">
                    <div className="bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-xl">
                        <div className="flex justify-between w-full mb-1 px-1">
                            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Limpieza</span>
                            <span className="text-xs font-bold text-white">{Math.round(cleanliness)}%</span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden border border-white/10">
                            <div
                                className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-100 ease-out"
                                style={{ width: `${cleanliness}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-blue-300/70 mt-1 text-center animate-pulse">¡Frota el jabón!</p>
                    </div>
                </div>
            )}

            {/* Food Selector Bar (Bottom Sheet style) */}
            {showFoodSelector && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-white/10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl"
                >
                    <div className="max-w-md mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold text-white">Arrastra la comida</h4>
                            <div className="flex gap-2">
                                {totalFoodPages > 1 && (
                                    <div className="flex gap-1 mr-2">
                                        <button
                                            onClick={() => setFoodPage(p => Math.max(0, p - 1))}
                                            disabled={foodPage === 0}
                                            className="p-1 rounded-full hover:bg-white/10 disabled:opacity-30 text-white"
                                        >
                                            ←
                                        </button>
                                        <span className="text-white text-sm self-center">{foodPage + 1}/{totalFoodPages}</span>
                                        <button
                                            onClick={() => setFoodPage(p => Math.min(totalFoodPages - 1, p + 1))}
                                            disabled={foodPage === totalFoodPages - 1}
                                            className="p-1 rounded-full hover:bg-white/10 disabled:opacity-30 text-white"
                                        >
                                            →
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowFoodSelector(false)}
                                    className="bg-white/10 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                                >
                                    <LucideX size={20} />
                                </button>
                            </div>
                        </div>

                        {foodItems.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-400 mb-4">No tienes comida.</p>
                                <button
                                    onClick={() => {
                                        setShowFoodSelector(false);
                                        onOpenStore?.();
                                    }}
                                    className="text-violet-400 font-bold text-sm hover:text-violet-300"
                                >
                                    Ir a la tienda
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4 justify-center p-2 min-h-[100px]">
                                {paginatedFoodItems.map(item => (
                                    <motion.div
                                        key={item.id}
                                        drag
                                        dragSnapToOrigin
                                        whileDrag={{ scale: 1.2, zIndex: 1000 }}
                                        onDragStart={() => {
                                            onEatStart?.();
                                            setMouthSoundPlayed(false);
                                        }}
                                        onDrag={(e: any, info: any) => handleFoodDrag(e, info)}
                                        onDragEnd={(e: any, info: any) => handleDragEnd(e, info, item)}
                                        className="flex-shrink-0 w-20 h-20 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing hover:border-violet-500/50 hover:bg-white/10 transition-colors relative shadow-lg touch-none"
                                    >
                                        <span className="text-3xl drop-shadow-md">🍎</span>
                                        <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center px-1">{item.item.name}</span>
                                        <div className="absolute -top-2 -right-2 bg-violet-600 rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white border border-white/20 shadow-lg">
                                            {item.quantity}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
                <ActionButton
                    onClick={handleFeed}
                    disabled={performing !== null || stats.hunger >= 100 || isSleeping}
                    icon={LucideUtensils}
                    label="Comer"
                    bgClass="bg-red-500/10"
                    colorClass="text-red-400"
                    borderClass="border-red-500/20"
                />

                <ActionButton
                    onClick={handleCleanToggle}
                    disabled={performing !== null || stats.hygiene >= 100 || isSleeping}
                    icon={LucideSparkles}
                    label={isCleaningMode ? "Limpiando..." : "Limpiar"}
                    bgClass={isCleaningMode ? "bg-blue-500 text-white" : "bg-blue-500/10"}
                    colorClass={isCleaningMode ? "text-white" : "text-blue-400"}
                    borderClass="border-blue-500/20"
                />

                <ActionButton
                    onClick={() => handlePlay()}
                    disabled={performing !== null || stats.energy < 10 || isSleeping}
                    icon={LucideGamepad2}
                    label="Jugar"
                    bgClass="bg-orange-500/10"
                    colorClass="text-orange-400"
                    borderClass="border-orange-500/20"
                />

                <ActionButton
                    onClick={handleSleepToggle}
                    disabled={performing !== null || (stats.energy >= 100 && !isSleeping)}
                    icon={LucideBed}
                    label={isSleeping ? "Despertar" : "Dormir"}
                    bgClass={isSleeping ? "bg-indigo-500/10" : "bg-violet-500/10"}
                    colorClass={isSleeping ? "text-indigo-400" : "text-violet-400"}
                    borderClass={isSleeping ? "border-indigo-500/20" : "border-violet-500/20"}
                />
            </div>
        </div>
    );
}