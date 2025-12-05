import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import PetAvatar from './PetAvatar';
import PetStats from './PetStats';
import PetActions from './PetActions';
import PetStore from './PetStore';
import AdoptPet from './AdoptPet';
import { LucideShoppingBag, LucideHome, LucideLoader2 } from 'lucide-preact';

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
    sleepingSince: Date | null;
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
            <div className="flex items-center justify-center h-96">
                <div className="text-center flex flex-col items-center gap-4">
                    <LucideLoader2 className="animate-spin text-violet-500" size={48} />
                    <div className="text-xl text-white/80 font-medium">Cargando tu mascota...</div>
                </div>
            </div>
        );
    }

    if (!pet) {
        return <AdoptPet onPetCreated={handlePetCreated} />;
    }

    return (
        <div className="h-full flex flex-col min-h-screen">
            {/* Navigation */}
            <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex gap-4 py-4">
                        <button
                            onClick={() => setViewMode('pet')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${viewMode === 'pet'
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 scale-105'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <LucideHome size={20} />
                            <span>Mi Mascota</span>
                        </button>
                        <button
                            onClick={() => setViewMode('store')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${viewMode === 'store'
                                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-105'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <LucideShoppingBag size={20} />
                            <span>Tienda</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'pet' ? (
                    <div className="p-6 md:p-8">
                        <div className="max-w-5xl mx-auto space-y-8">
                            {/* Pet Header */}
                            <div className="text-center space-y-2">
                                <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                                    {pet.name}
                                </h2>
                                <p className="text-white/40 text-sm uppercase tracking-widest">Compañero Virtual</p>
                            </div>

                            {/* Pet Display */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Pet Avatar Area */}
                                <div className="lg:col-span-7 relative group">
                                    <div className="absolute inset-0 bg-gradient-to-b from-violet-500/20 to-fuchsia-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-700"></div>
                                    <div className="relative bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 h-full flex items-center justify-center overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10"></div>
                                        <PetAvatar
                                            appearance={pet.appearance}
                                            stats={pet.currentStats}
                                        />
                                    </div>
                                </div>

                                {/* Stats and Actions */}
                                <div className="lg:col-span-5 space-y-6">
                                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                                        <PetStats stats={pet.currentStats} />
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                                        <PetActions
                                            petId={pet.id}
                                            stats={pet.currentStats}
                                            isSleeping={!!pet.sleepingSince}
                                            onActionComplete={handlePetAction}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Warning messages */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {pet.currentStats.hunger < 20 && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                                        <span className="text-2xl">🍽️</span>
                                        <p className="text-red-200 text-sm font-medium">
                                            ¡Tu mascota tiene mucha hambre!
                                        </p>
                                    </div>
                                )}
                                {pet.currentStats.energy < 20 && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                                        <span className="text-2xl">💤</span>
                                        <p className="text-orange-200 text-sm font-medium">
                                            ¡Tu mascota necesita dormir!
                                        </p>
                                    </div>
                                )}
                                {pet.currentStats.hygiene < 20 && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                                        <span className="text-2xl">🧼</span>
                                        <p className="text-yellow-200 text-sm font-medium">
                                            ¡Tu mascota necesita un baño!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <PetStore onItemPurchased={handlePetAction} />
                )}
            </div>
        </div>
    );
}
