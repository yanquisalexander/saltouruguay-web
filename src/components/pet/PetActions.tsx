import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import {
    LucideUtensils,
    LucideSparkles,
    LucideBed,
    LucideGamepad2,
    LucideX
} from 'lucide-preact';

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

export default function PetActions({ petId, stats, isSleeping, onActionComplete }: PetActionsProps) {
    const [performing, setPerforming] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [selectedFoodItem, setSelectedFoodItem] = useState<number | null>(null);
    const [selectedToyItem, setSelectedToyItem] = useState<number | null>(null);
    const [showFoodSelector, setShowFoodSelector] = useState(false);
    const [showToySelector, setShowToySelector] = useState(false);

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

    const handleFeed = async () => {
        if (!selectedFoodItem) {
            setShowFoodSelector(true);
            return;
        }

        try {
            setPerforming('feed');
            const result = await actions.pet.feedPet({ itemId: selectedFoodItem });

            if (result.data?.success) {
                toast.success('¡Mascota alimentada!');
                await loadInventory();
                onActionComplete();
                setShowFoodSelector(false);
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al alimentar la mascota');
        } finally {
            setPerforming(null);
        }
    };

    const handleClean = async () => {
        try {
            setPerforming('clean');
            const result = await actions.pet.cleanPet();

            if (result.data?.success) {
                toast.success('¡Mascota limpia!');
                onActionComplete();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al limpiar la mascota');
        } finally {
            setPerforming(null);
        }
    };

    const handlePlay = async () => {
        try {
            setPerforming('play');
            const result = await actions.pet.playWithPet({ itemId: selectedToyItem || undefined });

            if (result.data?.success) {
                toast.success('¡Jugaste con tu mascota!');
                if (selectedToyItem) {
                    await loadInventory();
                }
                onActionComplete();
                setShowToySelector(false);
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al jugar con la mascota');
        } finally {
            setPerforming(null);
        }
    };

    const handleSleepToggle = async () => {
        if (isSleeping) {
            try {
                setPerforming('wake');
                const result = await actions.pet.wakePet();

                if (result.data?.success) {
                    toast.success('¡Buenos días!');
                    onActionComplete();
                }
            } catch (error: any) {
                toast.error(error.message || 'Error al despertar la mascota');
            } finally {
                setPerforming(null);
            }
        } else {
            try {
                setPerforming('sleep');
                const result = await actions.pet.putPetToSleep();

                if (result.data?.success) {
                    toast.success('¡A dormir!');
                    onActionComplete();
                }
            } catch (error: any) {
                toast.error(error.message || 'Error al dormir la mascota');
            } finally {
                setPerforming(null);
            }
        }
    };

    const foodItems = inventory.filter(item => item.item.category === 'food');
    const toyItems = inventory.filter(item => item.item.category === 'toy');

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-violet-500 rounded-full"></span>
                Acciones
            </h3>

            {/* Food Selector Modal/Overlay */}
            {showFoodSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold text-white">Selecciona comida</h4>
                            <button
                                onClick={() => setShowFoodSelector(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <LucideX size={20} />
                            </button>
                        </div>

                        {foodItems.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-400 mb-4">No tienes comida en tu inventario.</p>
                                <button
                                    onClick={() => setShowFoodSelector(false)}
                                    className="text-violet-400 hover:text-violet-300 text-sm font-medium"
                                >
                                    Ir a la tienda
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {foodItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedFoodItem(item.itemId);
                                            handleFeed();
                                        }}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/50 transition-all group"
                                    >
                                        <span className="font-medium text-white group-hover:text-violet-300 transition-colors">
                                            {item.item.name}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                                                +{item.item.effectValue}
                                            </span>
                                            <span className="text-sm text-gray-400">
                                                x{item.quantity}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={handleFeed}
                    disabled={performing !== null || stats.hunger >= 100 || isSleeping}
                    className="group relative overflow-hidden bg-gradient-to-br from-green-600/20 to-green-900/20 hover:from-green-600/30 hover:to-green-900/30 border border-green-500/30 hover:border-green-500/50 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    <div className="flex flex-col items-center gap-3 relative z-10">
                        <div className="p-3 bg-green-500/20 rounded-full text-green-400 group-hover:scale-110 transition-transform duration-300">
                            <LucideUtensils size={24} />
                        </div>
                        <span className="font-medium text-green-100">
                            {performing === 'feed' ? 'Alimentando...' : stats.hunger >= 100 ? 'Lleno' : 'Alimentar'}
                        </span>
                    </div>
                </button>

                <button
                    onClick={handleClean}
                    disabled={performing !== null || stats.hygiene >= 100 || isSleeping}
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-900/20 hover:from-blue-600/30 hover:to-blue-900/30 border border-blue-500/30 hover:border-blue-500/50 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    <div className="flex flex-col items-center gap-3 relative z-10">
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400 group-hover:scale-110 transition-transform duration-300">
                            <LucideSparkles size={24} />
                        </div>
                        <span className="font-medium text-blue-100">
                            {performing === 'clean' ? 'Limpiando...' : stats.hygiene >= 100 ? 'Limpio' : 'Limpiar'}
                        </span>
                    </div>
                </button>

                <button
                    onClick={handlePlay}
                    disabled={performing !== null || stats.energy < 10 || isSleeping}
                    className="group relative overflow-hidden bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 hover:from-yellow-600/30 hover:to-yellow-900/30 border border-yellow-500/30 hover:border-yellow-500/50 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    <div className="flex flex-col items-center gap-3 relative z-10">
                        <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-400 group-hover:scale-110 transition-transform duration-300">
                            <LucideGamepad2 size={24} />
                        </div>
                        <span className="font-medium text-yellow-100">
                            {performing === 'play' ? 'Jugando...' : stats.energy < 10 ? 'Cansado' : 'Jugar'}
                        </span>
                    </div>
                </button>

                <button
                    onClick={handleSleepToggle}
                    disabled={performing !== null || (stats.energy >= 100 && !isSleeping)}
                    className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${isSleeping
                        ? 'bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 hover:from-indigo-600/30 hover:to-indigo-900/30 border border-indigo-500/30 hover:border-indigo-500/50'
                        : 'bg-gradient-to-br from-violet-600/20 to-violet-900/20 hover:from-violet-600/30 hover:to-violet-900/30 border border-violet-500/30 hover:border-violet-500/50'
                        }`}
                >
                    <div className="flex flex-col items-center gap-3 relative z-10">
                        <div className={`p-3 rounded-full transition-transform duration-300 group-hover:scale-110 ${isSleeping ? 'bg-indigo-500/20 text-indigo-400' : 'bg-violet-500/20 text-violet-400'}`}>
                            <LucideBed size={24} />
                        </div>
                        <span className={`font-medium ${isSleeping ? 'text-indigo-100' : 'text-violet-100'}`}>
                            {performing === 'sleep' || performing === 'wake'
                                ? 'Procesando...'
                                : isSleeping
                                    ? 'Despertar'
                                    : stats.energy >= 100
                                        ? 'Descansado'
                                        : 'Dormir'}
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
}
