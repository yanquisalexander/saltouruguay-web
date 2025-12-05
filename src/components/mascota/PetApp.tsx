import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';

interface PetStats {
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
}

interface Pet {
    id: number;
    name: string;
    appearance: {
        color: string;
        shape: string;
        accessories: string[];
        clothing: string[];
    };
    stats: PetStats;
    stage: string;
    experience: number;
}

export default function PetApp() {
    const [pet, setPet] = useState<Pet | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        loadPet();
    }, []);

    const loadPet = async () => {
        setLoading(true);
        try {
            const { data, error } = await actions.pets.getPetSummary();
            if (error) {
                setMessage('Error al cargar tu mascota');
                console.error(error);
            } else if (data?.pet) {
                setPet(data.pet);
            }
        } catch (error) {
            console.error('Error loading pet:', error);
            setMessage('Error al cargar tu mascota');
        } finally {
            setLoading(false);
        }
    };

    const performAction = async (action: 'feed' | 'clean' | 'sleep') => {
        setActiveAction(action);
        try {
            let result;
            switch (action) {
                case 'feed':
                    result = await actions.pets.feedPet();
                    setMessage('¡Has alimentado a tu mascota! 🍔');
                    break;
                case 'clean':
                    result = await actions.pets.cleanPet();
                    setMessage('¡Has limpiado a tu mascota! 🛁');
                    break;
                case 'sleep':
                    result = await actions.pets.sleepPet();
                    setMessage('¡Tu mascota está descansando! 😴');
                    break;
            }

            if (result?.data?.pet) {
                setPet(result.data.pet);
            }

            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Error performing action:', error);
            setMessage(error.message || 'Error al realizar la acción');
        } finally {
            setActiveAction(null);
        }
    };

    const getStatColor = (value: number) => {
        if (value >= 70) return 'bg-green-500';
        if (value >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getStatEmoji = (stat: keyof PetStats) => {
        const emojis = {
            hunger: '🍔',
            happiness: '😊',
            energy: '⚡',
            hygiene: '✨'
        };
        return emojis[stat];
    };

    const getPetEmoji = (stage: string) => {
        const emojis = {
            egg: '🥚',
            baby: '🐣',
            child: '🐥',
            teen: '🐤',
            adult: '🦜'
        };
        return emojis[stage as keyof typeof emojis] || '🥚';
    };

    if (loading) {
        return (
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Cargando tu mascota...</p>
                </div>
            </div>
        );
    }

    if (!pet) {
        return (
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <p class="text-red-500">No se pudo cargar tu mascota</p>
                    <button
                        onClick={loadPet}
                        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div class="max-w-4xl mx-auto p-4">
            {/* Message Banner */}
            {message && (
                <div class="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-center animate-fade-in">
                    {message}
                </div>
            )}

            {/* Pet Display */}
            <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
                <div class="text-center">
                    <h2 class="text-3xl font-bold mb-2">{pet.name}</h2>
                    <p class="text-gray-600 mb-4 capitalize">Etapa: {pet.stage}</p>
                    
                    {/* Pet Avatar */}
                    <div 
                        class="w-48 h-48 mx-auto mb-6 flex items-center justify-center rounded-full animate-bounce-slow"
                        style={{ backgroundColor: pet.appearance.color }}
                    >
                        <span class="text-8xl">{getPetEmoji(pet.stage)}</span>
                    </div>

                    <div class="text-sm text-gray-600">
                        Experiencia: {pet.experience} pts
                    </div>
                </div>
            </div>

            {/* Stats Display */}
            <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold mb-4">Estado de tu mascota</h3>
                <div class="space-y-4">
                    {Object.entries(pet.stats).map(([stat, value]) => (
                        <div key={stat}>
                            <div class="flex items-center justify-between mb-2">
                                <span class="flex items-center gap-2 capitalize">
                                    <span>{getStatEmoji(stat as keyof PetStats)}</span>
                                    <span class="font-medium">{stat === 'hunger' ? 'Hambre' : stat === 'happiness' ? 'Felicidad' : stat === 'energy' ? 'Energía' : 'Higiene'}</span>
                                </span>
                                <span class="font-bold">{Math.round(value)}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                    class={`h-full transition-all duration-500 ${getStatColor(value)}`}
                                    style={{ width: `${value}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 class="text-xl font-bold mb-4">Acciones</h3>
                <div class="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => performAction('feed')}
                        disabled={activeAction !== null}
                        class="flex flex-col items-center gap-2 p-6 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <span class="text-4xl">🍔</span>
                        <span class="font-bold">Alimentar</span>
                    </button>
                    <button
                        onClick={() => performAction('clean')}
                        disabled={activeAction !== null}
                        class="flex flex-col items-center gap-2 p-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <span class="text-4xl">🛁</span>
                        <span class="font-bold">Limpiar</span>
                    </button>
                    <button
                        onClick={() => performAction('sleep')}
                        disabled={activeAction !== null}
                        class="flex flex-col items-center gap-2 p-6 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <span class="text-4xl">😴</span>
                        <span class="font-bold">Dormir</span>
                    </button>
                </div>
            </div>

            {/* Navigation Menu */}
            <div class="bg-white rounded-2xl shadow-lg p-4">
                <div class="grid grid-cols-4 gap-2">
                    <a
                        href="/mascota/tienda"
                        class="flex flex-col items-center gap-1 p-3 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <span class="text-2xl">🛒</span>
                        <span class="text-sm font-medium">Tienda</span>
                    </a>
                    <a
                        href="/mascota/inventario"
                        class="flex flex-col items-center gap-1 p-3 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <span class="text-2xl">🎒</span>
                        <span class="text-sm font-medium">Inventario</span>
                    </a>
                    <a
                        href="/mascota/casa"
                        class="flex flex-col items-center gap-1 p-3 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <span class="text-2xl">🏠</span>
                        <span class="text-sm font-medium">Casa</span>
                    </a>
                    <a
                        href="/mascota/juegos"
                        class="flex flex-col items-center gap-1 p-3 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <span class="text-2xl">🎮</span>
                        <span class="text-sm font-medium">Juegos</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
