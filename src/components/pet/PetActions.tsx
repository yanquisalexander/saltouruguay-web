import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import {
    LucideUtensils,
    LucideSparkles,
    LucideBed,
    LucideGamepad2,
} from 'lucide-preact';

interface PetActionsProps {
    petId: number;
    onActionComplete: () => void;
}

interface InventoryItem {
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

export default function PetActions({ petId, onActionComplete }: PetActionsProps) {
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

    const handleSleep = async () => {
        try {
            setPerforming('sleep');
            const result = await actions.pet.putPetToSleep();
            
            if (result.data?.success) {
                toast.success('¡Mascota descansando!');
                onActionComplete();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al dormir la mascota');
        } finally {
            setPerforming(null);
        }
    };

    const foodItems = inventory.filter(item => item.item.category === 'food');
    const toyItems = inventory.filter(item => item.item.category === 'toy');

    return (
        <div className="pixel-inset p-4 bg-gray-900/50 space-y-4">
            <h3 className="pixel-heading text-xl text-white text-center mb-4">
                Acciones
            </h3>

            {/* Food Selector */}
            {showFoodSelector && (
                <div className="mb-4 p-3 bg-gray-800 border-4 border-gray-700">
                    <p className="pixel-text text-white mb-2">Selecciona comida:</p>
                    {foodItems.length === 0 ? (
                        <p className="pixel-text text-gray-400 text-sm">
                            No tienes comida. ¡Compra en la tienda!
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {foodItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedFoodItem(item.itemId);
                                        handleFeed();
                                    }}
                                    className="w-full pixel-btn-chunky variant-green text-left"
                                >
                                    {item.item.name} ({item.quantity}) +{item.item.effectValue}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={handleFeed}
                    disabled={performing !== null}
                    className="pixel-btn-chunky variant-green disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 py-4"
                >
                    <LucideUtensils size={24} />
                    <span>{performing === 'feed' ? 'Alimentando...' : 'Alimentar'}</span>
                </button>

                <button
                    onClick={handleClean}
                    disabled={performing !== null}
                    className="pixel-btn-chunky variant-blue disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 py-4"
                >
                    <LucideSparkles size={24} />
                    <span>{performing === 'clean' ? 'Limpiando...' : 'Limpiar'}</span>
                </button>

                <button
                    onClick={handlePlay}
                    disabled={performing !== null}
                    className="pixel-btn-chunky variant-yellow disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 py-4"
                >
                    <LucideGamepad2 size={24} />
                    <span>{performing === 'play' ? 'Jugando...' : 'Jugar'}</span>
                </button>

                <button
                    onClick={handleSleep}
                    disabled={performing !== null}
                    className="pixel-btn-chunky variant-violet disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2 py-4"
                >
                    <LucideBed size={24} />
                    <span>{performing === 'sleep' ? 'Durmiendo...' : 'Dormir'}</span>
                </button>
            </div>
        </div>
    );
}
