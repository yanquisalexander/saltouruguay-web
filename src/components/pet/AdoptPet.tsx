import { h } from 'preact';
import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideHeart, LucideSparkles, LucideLoader2 } from 'lucide-preact';

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
        <div className="flex items-center justify-center min-h-screen p-6 ">
            <div className="max-w-2xl w-full relative">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-3xl rounded-full opacity-50"></div>

                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
                    <div className="text-center space-y-8">
                        {/* Icon */}
                        <div className="flex justify-center relative">
                            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse"></div>
                            <div className="relative w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20 animate-float">
                                <LucideHeart size={64} className="text-white drop-shadow-md" />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                ¡Adopta tu Mascota!
                            </h2>
                            <p className="text-lg text-gray-400 max-w-lg mx-auto">
                                Tu nuevo compañero virtual te espera. Cuídalo, juega con él y hazlo feliz.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAdopt} className="space-y-6 max-w-md mx-auto">
                            <div className="space-y-2 text-left">
                                <label className="text-sm font-medium text-gray-300 ml-1">
                                    Nombre de tu mascota
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={petName}
                                        onInput={(e) => setPetName((e.target as HTMLInputElement).value)}
                                        maxLength={50}
                                        placeholder="Ej: Saltito"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                        disabled={isAdopting}
                                    />
                                    <LucideSparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isAdopting || !petName.trim()}
                                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-violet-600/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {isAdopting ? (
                                    <>
                                        <LucideLoader2 className="animate-spin" />
                                        Adoptando...
                                    </>
                                ) : (
                                    '¡Adoptar Ahora!'
                                )}
                            </button>
                        </form>

                        {/* Info */}
                        <div className="pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                            <div className="flex items-center justify-center gap-2 bg-white/5 rounded-lg p-3">
                                <span>❤️</span>
                                <span>Requiere cuidado diario</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 bg-white/5 rounded-lg p-3">
                                <span>💰</span>
                                <span>Usa SaltoCoins para comprarle cosas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
