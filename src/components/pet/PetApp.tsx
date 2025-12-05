import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import PetAvatar from './PetAvatar';
import PetStats from './PetStats';
import PetActions from './PetActions';
import PetStore from './PetStore';
import AdoptPet from './AdoptPet';
import { LucideShoppingBag, LucideHome } from 'lucide-preact';

interface Pet {
    id: number;
    name: string;
    appearance: {
        color: string;
        skinId: string | null;
        hatId: string | null;
        accessoryId: string | null;
    };
    currentStats: {
        hunger: number;
        energy: number;
        hygiene: number;
        happiness: number;
    };
    savedStats: {
        hunger: number;
        energy: number;
        hygiene: number;
        happiness: number;
    };
    lastInteraction: Date;
    createdAt: Date;
}

type ViewMode = 'pet' | 'store';

export default function PetApp() {
    const [pet, setPet] = useState<Pet | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('pet');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        loadPet();
    }, [refreshTrigger]);

    const loadPet = async () => {
        try {
            setLoading(true);
            const result = await actions.pet.getPet();
            if (result.data) {
                setPet(result.data as Pet);
            } else {
                setPet(null);
            }
        } catch (error: any) {
            console.error('Error loading pet:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePetCreated = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    const handlePetAction = async () => {
        // Refresh pet data after any action
        await loadPet();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="pixel-text text-2xl text-white">Cargando...</div>
                </div>
            </div>
        );
    }

    if (!pet) {
        return <AdoptPet onPetCreated={handlePetCreated} />;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Navigation */}
            <div className="flex gap-2 p-4 bg-gray-800/50 border-b-4 border-gray-900">
                <button
                    onClick={() => setViewMode('pet')}
                    className={`pixel-btn-chunky ${
                        viewMode === 'pet' ? 'variant-violet' : 'variant-gray'
                    } flex items-center gap-2`}
                >
                    <LucideHome size={20} />
                    <span>Mi Mascota</span>
                </button>
                <button
                    onClick={() => setViewMode('store')}
                    className={`pixel-btn-chunky ${
                        viewMode === 'store' ? 'variant-yellow' : 'variant-gray'
                    } flex items-center gap-2`}
                >
                    <LucideShoppingBag size={20} />
                    <span>Tienda</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'pet' ? (
                    <div className="p-6">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Pet Name */}
                            <div className="text-center">
                                <h2 className="pixel-heading text-3xl text-white drop-shadow-lg">
                                    {pet.name}
                                </h2>
                            </div>

                            {/* Pet Display */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Pet Avatar */}
                                <div className="pixel-inset p-6 bg-gradient-to-b from-blue-900/30 to-purple-900/30">
                                    <PetAvatar
                                        appearance={pet.appearance}
                                        stats={pet.currentStats}
                                    />
                                </div>

                                {/* Stats and Actions */}
                                <div className="space-y-4">
                                    <PetStats stats={pet.currentStats} />
                                    <PetActions
                                        petId={pet.id}
                                        onActionComplete={handlePetAction}
                                    />
                                </div>
                            </div>

                            {/* Warning messages */}
                            {pet.currentStats.hunger < 20 && (
                                <div className="pixel-inset p-4 bg-red-900/50 border-4 border-red-700">
                                    <p className="pixel-text text-white text-center">
                                        ⚠️ ¡Tu mascota tiene mucha hambre! Aliméntala pronto.
                                    </p>
                                </div>
                            )}
                            {pet.currentStats.energy < 20 && (
                                <div className="pixel-inset p-4 bg-orange-900/50 border-4 border-orange-700">
                                    <p className="pixel-text text-white text-center">
                                        ⚠️ ¡Tu mascota está muy cansada! Déjala dormir.
                                    </p>
                                </div>
                            )}
                            {pet.currentStats.hygiene < 20 && (
                                <div className="pixel-inset p-4 bg-yellow-900/50 border-4 border-yellow-700">
                                    <p className="pixel-text text-white text-center">
                                        ⚠️ ¡Tu mascota está muy sucia! Límpiala.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <PetStore onItemPurchased={handlePetAction} />
                )}
            </div>
        </div>
    );
}
