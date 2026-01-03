import type { Session } from "@auth/core/types";
import { Container3D } from "./Container3D";
import { MemberCard } from "./MemberCard";
import { useEffect, useState, useRef } from "preact/hooks";
import { Download, Loader2, Palette, Sticker, Sparkles } from "lucide-preact";
import { toPng } from "html-to-image";
import { $ } from "@/lib/dom-selector";
import { STICKERS } from "@/consts/Stickers";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { MemberCardSkins } from "@/consts/MemberCardSkins";

export const MyMemberCard = ({ session, stickers = [], tier, initialSkin = 'classic' }: { session: Session, stickers: string[], tier: number | null, initialSkin: typeof MemberCardSkins[number]['id'] }) => {

    // --- STATE & LOGIC ---
    const [selectedStickers, setSelectedStickers] = useState(() => {
        const stickersList = new Array(3).fill(null);
        stickers.forEach((sticker, index) => { stickersList[index] = sticker });
        return { limit: tier === null ? 0 : tier, list: stickersList };
    });

    const [generating, setGenerating] = useState(false);
    const [skin, setSkin] = useState(initialSkin);
    const username = session?.user?.name as string;
    const avatar = session?.user?.image as string;

    // --- HELPERS ---
    async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], fileName, { type: 'image/png' });
    }

    async function generateImage() {
        const $saveButton = $('.save-button');
        const $memberCard = $('#member-card-hidden'); // ID específico para el elemento oculto

        if ($memberCard) {
            setGenerating(true);
            try {
                // Pequeño delay para asegurar renderizado
                await new Promise(r => setTimeout(r, 100));

                const dataUrl = await toPng($memberCard, {
                    quality: 1.0,
                    pixelRatio: 2, // Mejor calidad
                    cacheBust: true
                });

                const file = await dataUrlToFile(dataUrl, `SaltoCard-${username}.png`);
                const url = URL.createObjectURL(file);

                $saveButton?.setAttribute('href', url);
                $saveButton?.setAttribute('download', `SaltoCard-${username}.png`);
            } catch (e) {
                console.error("Error generando imagen", e);
            } finally {
                setGenerating(false);
            }
        }
    }

    const updateStickers = async (newStickers: string[]) => {
        const stickersList = new Array(3).fill(null);
        newStickers.forEach((sticker, index) => { stickersList[index] = sticker });

        // Optimistic update
        const { error } = await actions.updateStickers({ stickers: stickersList });
        if (error) {
            toast.error('Error al guardar stickers');
            return;
        }
        // Regenerar imagen tras guardar
        setTimeout(generateImage, 500);
    };

    const handleSelectSticker = async (selectedSticker: string) => {
        const newStickers = [...selectedStickers.list];

        // Si ya está, no hacer nada
        if (newStickers.includes(selectedSticker)) return;

        // Buscar slot vacío
        const emptyIndex = newStickers.indexOf(null);

        // Si no hay espacio o supera el límite del tier
        if (emptyIndex === -1 || selectedStickers.limit <= newStickers.filter(Boolean).length) {
            toast.warning(`Límite de stickers alcanzado (Tier ${selectedStickers.limit})`);
            return;
        }

        newStickers[emptyIndex] = selectedSticker;

        setSelectedStickers(prev => ({ ...prev, list: newStickers }));
        await updateStickers(newStickers);
    };

    const handleRemoveSticker = async (index: number) => {
        // 1. IMPORTANTE: Creamos una copia del array usando el spread operator [...]
        // Si no hacemos esto, Preact no detecta el cambio.
        const newStickers = [...selectedStickers.list];

        // 2. Modificamos la copia
        newStickers[index] = null;

        // 3. Lógica para corregir bugs de tiers (opcional, mantenido de tu código)
        if (selectedStickers.limit < newStickers.filter(Boolean).length) {
            for (let i = newStickers.length - 1; i >= 0; i--) {
                if (newStickers[i] !== null) {
                    newStickers[i] = null;
                    break;
                }
            }
        }

        // 4. Actualizamos el estado con la copia
        setSelectedStickers(prev => ({
            ...prev, // Mantenemos el límite
            list: newStickers, // Guardamos la nueva lista
        }));

        // 5. Guardamos en el servidor (asegúrate que updateStickers acepte (string|null)[])
        await updateStickers(newStickers as string[]);
    }

    const handleSkinChange = async (newSkin: string) => {
        setSkin(newSkin);
        const { error } = await actions.updateMemberCardSkin({ skin: newSkin });
        if (error) toast.error('Error guardando skin');
        else setTimeout(generateImage, 500);
    };

    // Generar imagen inicial
    useEffect(() => { generateImage(); }, []);


    // --- RENDER ---
    return (
        <div className="relative w-full max-w-7xl mx-auto px-4 py-8 lg:py-12">

            <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-start">

                {/* COLUMNA IZQUIERDA: PREVIEW 3D */}
                <div className="relative flex flex-col items-center">

                    {/* Elemento oculto para generación de imagen (Alta Calidad) */}
                    <div className="absolute -left-[9999px] top-0 pointer-events-none">
                        <div id="member-card-hidden" className="w-[800px] h-[400px] p-4 bg-transparent">
                            <MemberCard
                                number={parseInt(session?.user?.id as string)}
                                selectedStickers={selectedStickers}
                                skin={skin}
                                user={{ avatar, username, playerNumber: session?.user?.streamerWarsPlayerNumber }}
                                className="shadow-none border-none"
                            />
                        </div>
                    </div>

                    {/* Spotlight de fondo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-purple-500/20 to-transparent blur-[100px] rounded-full pointer-events-none"></div>

                    {/* Contenedor 3D Interactivo */}
                    <div className="relative z-10 w-full max-w-2xl aspect-[2/1] perspective-1000 group">
                        <Container3D>
                            <MemberCard
                                number={parseInt(session?.user?.id as string)}
                                selectedStickers={selectedStickers}
                                handleRemoveSticker={handleRemoveSticker}
                                skin={skin}
                                user={{ avatar, username, playerNumber: session?.user?.streamerWarsPlayerNumber }}
                            />
                        </Container3D>

                        {/* Hint de interacción */}
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-xs font-rubik uppercase tracking-widest flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Sparkles size={12} /> Mueve el cursor para interactuar
                        </div>
                    </div>

                    {/* Botón de Descarga */}
                    <div className="mt-16">
                        <a
                            download={`SaltoCard-${username}.png`}
                            className={`
                                save-button group relative flex items-center gap-3 px-8 py-4 rounded-xl font-bold uppercase tracking-wide transition-all
                                ${generating
                                    ? 'bg-white/5 text-white/50 cursor-wait'
                                    : 'bg-white text-black hover:bg-yellow-400 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                }
                            `}
                        >
                            {generating ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                            <span>{generating ? 'Renderizando...' : 'Descargar Tarjeta'}</span>
                        </a>
                    </div>
                    <div className="mt-4">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/wallet/generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            userId: session.user.id,
                                            name: session.user.name,
                                            avatar,
                                            cardNumber: session.user.id
                                        })
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || 'Error generando pass');
                                    window.open(data.saveUrl, '_blank');
                                } catch (e) {
                                    console.error(e);
                                    toast.error(e.message || 'No se pudo generar la pass');
                                }
                            }}
                            className="relative flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:opacity-95 shadow-lg"
                        >
                            <Sparkles size={16} />
                            <span>Añadir a Google Wallet</span>
                        </button>
                    </div>
                </div>

                {/* COLUMNA DERECHA: CONTROLES (WORKSHOP) */}
                <div className="space-y-8 relative z-20">

                    {/* Selector de Skins */}
                    <div className="bg-[#0f0f11]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-white font-anton text-lg uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Palette size={18} className="text-purple-400" /> Skins Disponibles
                        </h3>

                        <div className="grid grid-cols-4 gap-3">
                            {MemberCardSkins.map(({ id, description }) => (
                                <button
                                    key={id}
                                    onClick={() => handleSkinChange(id)}
                                    className={`
                                        group relative aspect-square rounded-xl border-2 transition-all overflow-hidden
                                        ${skin === id
                                            ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-105 z-10'
                                            : 'border-white/10 hover:border-white/40 hover:bg-white/5'
                                        }
                                    `}
                                    title={description}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center p-2">
                                        <img
                                            src={`/images/member-card-skins/${id}-icon.webp`}
                                            alt={id}
                                            className={`w-full h-full object-contain transition-transform ${skin === id ? 'scale-110' : 'group-hover:scale-110'}`}
                                        />
                                    </div>
                                    {/* Indicador Activo */}
                                    {skin === id && (
                                        <div className="absolute inset-0 bg-yellow-400/10 mix-blend-overlay"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selector de Stickers */}
                    <div className="bg-[#0f0f11]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-anton text-lg uppercase tracking-wide flex items-center gap-2">
                                <Sticker size={18} className="text-green-400" /> Stickers
                            </h3>
                            <span className="text-xs font-rubik text-white/40 bg-white/5 px-2 py-1 rounded">
                                {selectedStickers.list.filter(Boolean).length} / {selectedStickers.limit} Usados
                            </span>
                        </div>

                        <div className="grid grid-cols-5 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {STICKERS.map(({ id }) => {
                                const isSelected = selectedStickers.list.includes(id);
                                return (
                                    <button
                                        key={id}
                                        onClick={() => handleSelectSticker(id)}
                                        disabled={isSelected}
                                        className={`
                                            relative aspect-square rounded-lg flex items-center justify-center bg-white/5 transition-all
                                            ${isSelected
                                                ? 'opacity-30 cursor-not-allowed grayscale'
                                                : 'hover:bg-white/10 hover:scale-110 cursor-pointer'
                                            }
                                        `}
                                    >
                                        <img
                                            src={`/images/stickers/${id}.webp`}
                                            alt={id}
                                            className="w-8 h-8 object-contain"
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="size-2 bg-green-500 rounded-full shadow-lg"></div>
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-xs text-white/30 mt-4 text-center">
                            Mejora tu Tier en Twitch para desbloquear más espacios.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};