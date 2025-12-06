import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
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
    const [isEating, setIsEating] = useState(false);
    const petRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadPet();
    }, [refreshTrigger]);

    const loadPet = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const result = await actions.pet.getPet();
            if (result.data) {
                setPet(result.data as Pet);
            } else {
                setPet(null);
            }
        } catch (error: any) {
            console.error('Error loading pet:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handlePetCreated = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    const handlePetAction = async () => {
        // Refresh pet data after any action without showing full screen loader
        await loadPet(false);
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
        <div className="h-full flex flex-col min-h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-gray-950 to-gray-950 pointer-events-none"></div>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#8b5cf6 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            {/* Navigation - Simple top bar */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button
                    onClick={() => setViewMode(viewMode === 'pet' ? 'store' : 'pet')}
                    className="bg-white/10 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/20 hover:bg-white/20 transition-all text-white"
                >
                    {viewMode === 'pet' ? <LucideShoppingBag size={24} /> : <LucideHome size={24} />}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col w-full h-full relative">
                {viewMode === 'pet' ? (
                    <div className="flex-1 flex flex-col max-w-md mx-auto w-full h-full p-4 relative">
                        {/* Header / Stats */}
                        <div className="mt-2 mb-4 z-10 animate-fade-in-down">
                            <div className="text-center mb-4">
                                <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">{pet.name}</h2>
                            </div>
                            <PetStats stats={pet.currentStats} />
                        </div>

                        {/* Pet Area - Flexible space */}
                        <div className="flex-1 relative flex items-center justify-center min-h-[300px]" ref={petRef}>
                            {/* Floor Glow */}
                            <div className="absolute bottom-16 w-48 h-16 bg-violet-500/20 rounded-[100%] blur-xl transform scale-x-150"></div>

                            <div className={`transition-all duration-300 ${isEating ? 'scale-105' : ''}`}>
                                <PetAvatar
                                    appearance={pet.appearance}
                                    stats={pet.currentStats}
                                    isSleeping={!!pet.sleepingSince}
                                    isEating={isEating}
                                />
                            </div>

                            {/* Drop Zone Indicator */}
                            {isEating && (
                                <div className="absolute inset-0 border-4 border-dashed border-violet-400/30 rounded-3xl flex items-center justify-center bg-violet-500/10 backdrop-blur-[1px] pointer-events-none animate-pulse m-4">
                                    <span className="text-2xl font-bold text-white bg-black/50 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border border-white/10">¡Suelta aquí!</span>
                                </div>
                            )}

                            {/* Warning Bubbles */}
                            <div className="absolute top-0 right-0 flex flex-col gap-2">
                                {pet.currentStats.hunger < 20 && (
                                    <div className="bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce border border-white/20">
                                        ¡Hambre!
                                    </div>
                                )}
                                {pet.currentStats.energy < 20 && (
                                    <div className="bg-yellow-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce delay-100 border border-white/20">
                                        ¡Sueño!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions - Bottom */}
                        <div className="mb-4 z-10 bg-black/40 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl animate-fade-in-up">
                            <PetActions
                                petId={pet.id}
                                stats={pet.currentStats}
                                isSleeping={!!pet.sleepingSince}
                                onActionComplete={handlePetAction}
                                petRef={petRef}
                                onEatStart={() => setIsEating(true)}
                                onEatEnd={() => setIsEating(false)}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto bg-black/80 backdrop-blur-xl">
                        <PetStore onItemPurchased={handlePetAction} />
                    </div>
                )}
            </div>
        </div>
    );
}