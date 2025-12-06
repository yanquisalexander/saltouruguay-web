import { h } from 'preact';
import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideHeart, LucideSparkles, LucideLoader2, LucideChevronLeft, LucideChevronRight } from 'lucide-preact';
import PetSprite from './PetSprite';

interface AdoptPetProps {
    onPetCreated: () => void;
}

const COLORS = ['blue', 'green', 'red', 'yellow', 'white', 'dark'];
const SKINS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function AdoptPet({ onPetCreated }: AdoptPetProps) {
    const [petName, setPetName] = useState('');
    const [selectedColor, setSelectedColor] = useState('blue');
    const [selectedSkin, setSelectedSkin] = useState('A');
    const [isAdopting, setIsAdopting] = useState(false);
    const [step, setStep] = useState<'customize' | 'name'>('customize');

    const handleAdopt = async (e: Event) => {
        e.preventDefault();

        if (!petName.trim()) {
            toast.error('Debes darle un nombre a tu mascota');
            return;
        }

        try {
            setIsAdopting(true);
            const result = await actions.pet.createPet({
                name: petName.trim(),
                color: selectedColor,
                skinId: selectedSkin
            });

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

    const nextSkin = () => {
        const currentIndex = SKINS.indexOf(selectedSkin);
        const nextIndex = (currentIndex + 1) % SKINS.length;
        setSelectedSkin(SKINS[nextIndex]);
    };

    const prevSkin = () => {
        const currentIndex = SKINS.indexOf(selectedSkin);
        const prevIndex = (currentIndex - 1 + SKINS.length) % SKINS.length;
        setSelectedSkin(SKINS[prevIndex]);
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-6 ">
            <div className="max-w-2xl w-full relative">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-3xl rounded-full opacity-50"></div>

                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
                    <div className="text-center space-y-8">

                        {/* Title */}
                        <div className="space-y-2">
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                {step === 'customize' ? 'Elige tu compañero' : 'Ponle un nombre'}
                            </h2>
                            <p className="text-lg text-gray-400 max-w-lg mx-auto">
                                {step === 'customize'
                                    ? 'Personaliza como se verá tu mascota.'
                                    : 'Dale un nombre único para comenzar tu aventura.'}
                            </p>
                        </div>

                        {/* Preview Area */}
                        <div className="flex justify-center relative h-64 items-center">
                            <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl transform scale-75"></div>
                            <div className="relative z-10 transform scale-125">
                                <PetSprite
                                    appearance={{
                                        color: selectedColor,
                                        skinId: selectedSkin,
                                        hatId: null,
                                        accessoryId: null
                                    }}
                                    stats={{
                                        hunger: 100,
                                        energy: 100,
                                        hygiene: 100,
                                        happiness: 100
                                    }}
                                />
                            </div>
                        </div>

                        {step === 'customize' ? (
                            <div className="space-y-8 animate-fade-in">
                                {/* Color Selection */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">Color</label>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-10 h-10 rounded-full border-2 transition-all transform hover:scale-110 ${selectedColor === color
                                                        ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]'
                                                        : 'border-transparent opacity-70 hover:opacity-100'
                                                    }`}
                                                style={{ backgroundColor: color === 'dark' ? '#333' : color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Skin Selection */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-300 uppercase tracking-wider">Variante</label>
                                    <div className="flex items-center justify-center gap-4">
                                        <button
                                            onClick={prevSkin}
                                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        >
                                            <LucideChevronLeft />
                                        </button>
                                        <span className="text-2xl font-bold text-white w-12">{selectedSkin}</span>
                                        <button
                                            onClick={nextSkin}
                                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        >
                                            <LucideChevronRight />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep('name')}
                                    className="w-full bg-white text-black font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-gray-100 transition-all hover:scale-[1.02]"
                                >
                                    Continuar
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleAdopt} className="space-y-6 max-w-md mx-auto animate-fade-in">
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
                                            autoFocus
                                        />
                                        <LucideSparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep('customize')}
                                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all"
                                        disabled={isAdopting}
                                    >
                                        Volver
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isAdopting || !petName.trim()}
                                        className="flex-[2] bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-violet-600/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
                                </div>
                            </form>
                        )}

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
