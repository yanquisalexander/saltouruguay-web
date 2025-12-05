import { h } from 'preact';
import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideHeart } from 'lucide-preact';

interface AdoptPetProps {
    onPetCreated: () => void;
}

export default function AdoptPet({ onPetCreated }: AdoptPetProps) {
    const [petName, setPetName] = useState('');
    const [isAdopting, setIsAdopting] = useState(false);

    const handleAdopt = async (e: Event) => {
        e.preventDefault();

        if (!petName.trim()) {
            toast.error('Debes darle un nombre a tu mascota');
            return;
        }

        try {
            setIsAdopting(true);
            const result = await actions.pet.createPet({ name: petName.trim() });

            if (result.data?.success) {
                toast.success('¡Felicitaciones! Has adoptado tu Mascota Saltana');
                onPetCreated();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al adoptar la mascota');
        } finally {
            setIsAdopting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-full p-6">
            <div className="max-w-2xl w-full">
                <div className="pixel-inset p-8 bg-gradient-to-b from-purple-900/40 to-blue-900/40">
                    <div className="text-center space-y-6">
                        {/* Icon */}
                        <div className="flex justify-center">
                            <div className="w-32 h-32 bg-yellow-500 border-8 border-yellow-700 rounded-full flex items-center justify-center shadow-lg">
                                <LucideHeart size={64} className="text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="pixel-heading text-4xl text-white drop-shadow-lg">
                            ¡Adopta tu Mascota Saltana!
                        </h2>

                        {/* Description */}
                        <p className="pixel-text text-lg text-gray-300 max-w-lg mx-auto">
                            Cuida, alimenta y juega con tu mascota virtual. 
                            Úsala como un sumidero divertido para tus SaltoCoins.
                        </p>

                        {/* Form */}
                        <form onSubmit={handleAdopt} className="space-y-4 max-w-md mx-auto">
                            <div>
                                <label className="pixel-text text-white block mb-2">
                                    Nombre de tu mascota:
                                </label>
                                <input
                                    type="text"
                                    value={petName}
                                    onInput={(e) => setPetName((e.target as HTMLInputElement).value)}
                                    maxLength={50}
                                    placeholder="Ej: Saltito"
                                    className="w-full pixel-inset p-3 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    disabled={isAdopting}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isAdopting}
                                className="pixel-btn-chunky variant-violet w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAdopting ? 'Adoptando...' : '¡Adoptar Ahora!'}
                            </button>
                        </form>

                        {/* Info */}
                        <div className="mt-8 space-y-2">
                            <p className="pixel-text text-sm text-gray-400">
                                ℹ️ Tu mascota requiere cuidado diario
                            </p>
                            <p className="pixel-text text-sm text-gray-400">
                                💰 Usa SaltoCoins para comprar comida, juguetes y decoraciones
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
