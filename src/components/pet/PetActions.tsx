import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
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
    onOpenStore?: () => void;
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

export default function PetActions({ petId, stats, isSleeping, onActionComplete, petRef, onEatStart, onEatEnd, onOpenStore }: PetActionsProps) {
    const [performing, setPerforming] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [selectedFoodItem, setSelectedFoodItem] = useState<number | null>(null);
    const [selectedToyItem, setSelectedToyItem] = useState<number | null>(null);
    const [showFoodSelector, setShowFoodSelector] = useState(false);
    const [showToySelector, setShowToySelector] = useState(false);

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

        try {
            setPerforming('feed');
            const { error, data } = await actions.pet.feedPet({ itemId: idToUse });

            if (data?.success) {
                petToast.success('¡Mascota alimentada!', '🍎');
                playSound({ sound: STREAMER_WARS_SOUNDS.PET_EAT, volume: 0.5 });
                await loadInventory();
                onActionComplete();
                // Don't close selector immediately to allow feeding more
                // setShowFoodSelector(false); 
            }

            if (error) {
                petToast.error(error.message || 'Error al alimentar la mascota');
                if (error.message?.includes('fallecido')) {
                    onActionComplete();
                }
            }
        } catch (error: any) {
            petToast.error(error.message || 'Error al alimentar la mascota');
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

    const handleClean = async () => {
        try {
            setPerforming('clean');
            const { data, error } = await actions.pet.cleanPet();

            if (data?.success) {
                petToast.success('¡Mascota limpia!', '🧼');
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

    const handlePlay = async () => {
        try {
            setPerforming('play');
            const { data, error } = await actions.pet.playWithPet({ itemId: selectedToyItem || undefined });

            if (data?.success) {
                petToast.success('¡Jugaste con tu mascota!', '🎮');
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
        <div className="w-full">
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
                                        onDragStart={() => onEatStart?.()}
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
                    onClick={handleClean}
                    disabled={performing !== null || stats.hygiene >= 100 || isSleeping}
                    icon={LucideSparkles}
                    label="Limpiar"
                    bgClass="bg-blue-500/10"
                    colorClass="text-blue-400"
                    borderClass="border-blue-500/20"
                />

                <ActionButton
                    onClick={handlePlay}
                    disabled={performing !== null || stats.energy < 10 || isSleeping}
                    icon={LucideGamepad2}
                    label="Jugar"
                    bgClass="bg-yellow-500/10"
                    colorClass="text-yellow-400"
                    borderClass="border-yellow-500/20"
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