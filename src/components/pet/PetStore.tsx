import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { petToast } from '@/utils/petToast';
import { LucideShoppingCart, LucideCoins, LucideLoader2 } from 'lucide-preact';

import type { InventoryItem } from './PetActions';
import { playSound, STREAMER_WARS_SOUNDS } from "@/consts/Sounds";

interface PetStoreProps {
    onItemPurchased: () => void;
}

interface StoreItem {
    id: number;
    name: string;
    description: string | null;
    category: string;
    rarity: string;
    price: number;
    iconUrl: string | null;
    effectValue: number;
    isConsumable: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
    food: '🍔 Comida',
    toy: '🎮 Juguetes',
    furniture: '🪑 Muebles',
    clothing: '👕 Ropa',
    accessory: '🎩 Accesorios',
    eyes: '👀 Ojos',
    mouth: '👄 Boca',
    skin: '🎨 Piel',
};

const RARITY_COLORS: Record<string, string> = {
    common: 'border-gray-500/30 bg-gray-500/5',
    uncommon: 'border-green-500/30 bg-green-500/5',
    rare: 'border-blue-500/30 bg-blue-500/5',
    epic: 'border-purple-500/30 bg-purple-500/5',
    legendary: 'border-yellow-500/30 bg-yellow-500/5',
};

export default function PetStore({ onItemPurchased }: PetStoreProps) {
    const [items, setItems] = useState<StoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [viewMode, setViewMode] = useState<'store' | 'inventory'>('store');
    const [equipping, setEquipping] = useState<number | null>(null);

    useEffect(() => {
        loadStoreItems();
        loadInventory();
    }, [selectedCategory]);

    const loadStoreItems = async () => {
        try {
            setLoading(true);
            const result = await actions.pet.getStoreItems({
                category: selectedCategory !== 'all' ? selectedCategory : undefined,
            });
            if (result.data) {
                setItems(result.data as StoreItem[]);
            }
        } catch (error: any) {
            toast.error('Error al cargar la tienda');
        } finally {
            setLoading(false);
        }
    };

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

    const handlePurchase = async (itemId: number, price: number, itemName: string) => {
        try {
            setPurchasing(itemId);
            const result = await actions.pet.purchaseItem({ itemId, quantity: 1 });

            if (result.data?.success) {
                petToast.success(`¡Compraste ${itemName}!`, '🛍️');
                await loadInventory();
                onItemPurchased();
                playSound({ sound: STREAMER_WARS_SOUNDS.PET_ITEM_PURCHASE, volume: 0.5 });
            }
        } catch (error: any) {
            petToast.error(error.message || 'Error al comprar el item');
        } finally {
            setPurchasing(null);
        }
    };

    const handleEquip = async (itemId: number, itemName: string) => {
        try {
            setEquipping(itemId);
            const result = await actions.pet.equipItem({ itemId });

            if (result.data?.success) {
                petToast.success(`¡Equipaste ${itemName}!`, '✨');
                onItemPurchased(); // Refresh pet
            }
        } catch (error: any) {
            petToast.error(error.message || 'Error al equipar el item');
        } finally {
            setEquipping(null);
        }
    };

    const getItemQuantity = (itemId: number) => {
        const item = inventory.find(inv => inv.itemId === itemId);
        return item ? item.quantity : 0;
    };

    const categories = ['all', 'food', 'toy', 'furniture', 'clothing', 'accessory', 'eyes', 'mouth', 'skin'];

    return (
        <div className="p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-bold text-white">
                        Tienda de Mascotas
                    </h2>
                    <p className="text-gray-400 max-w-lg mx-auto">
                        Mejora la vida de tu compañero virtual con los mejores productos.
                    </p>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 justify-center">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${selectedCategory === 'all'
                            ? 'bg-white text-black shadow-lg scale-105'
                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        Todo
                    </button>
                    {categories.slice(1).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${selectedCategory === cat
                                ? 'bg-white text-black shadow-lg scale-105'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {CATEGORY_LABELS[cat]}
                        </button>
                    ))}
                </div>

                {/* Inventory Summary */}
                {inventory.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4 overflow-x-auto custom-scrollbar">
                        <div className="flex-shrink-0 font-bold text-blue-200 text-sm uppercase tracking-wider">
                            Tu Inventario:
                        </div>
                        <div className="flex gap-2">
                            {inventory.slice(0, 5).map(item => (
                                <span key={item.id} className="bg-blue-500/20 text-blue-100 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/30 whitespace-nowrap">
                                    {item.item.name} <span className="opacity-60 ml-1">x{item.quantity}</span>
                                </span>
                            ))}
                            {inventory.length > 5 && (
                                <span className="text-xs text-blue-300/60 self-center whitespace-nowrap">
                                    +{inventory.length - 5} más
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Items Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <LucideLoader2 className="animate-spin text-violet-500" size={40} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                        <p className="text-gray-400">No hay items disponibles en esta categoría.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {items.map(item => {
                            const quantity = getItemQuantity(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`group relative bg-black/40 backdrop-blur-md border rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${RARITY_COLORS[item.rarity]}`}
                                >
                                    {/* Item Icon/Preview */}
                                    <div className="w-full aspect-square bg-gradient-to-br from-white/5 to-white/0 rounded-2xl flex items-center justify-center text-6xl mb-4 group-hover:scale-105 transition-transform duration-500">
                                        {item.category === 'food' && (
                                            item.name.toLowerCase().includes('manzana') ? '🍎' :
                                                item.name.toLowerCase().includes('sandwich') ? '🥪' :
                                                    item.name.toLowerCase().includes('pizza') ? '🍕' :
                                                        item.name.toLowerCase().includes('asado') ? '🍖' :
                                                            item.name.toLowerCase().includes('chivito') ? '🍔' : '🍔'
                                        )}
                                        {item.category === 'toy' && (
                                            item.name.toLowerCase().includes('pelota') ? '⚽' :
                                                item.name.toLowerCase().includes('frisbee') ? '🥏' :
                                                    item.name.toLowerCase().includes('consola') ? '🎮' : '🎮'
                                        )}
                                        {item.category === 'furniture' && (
                                            item.name.toLowerCase().includes('silla') ? '🪑' :
                                                item.name.toLowerCase().includes('mesa') ? '🪵' :
                                                    item.name.toLowerCase().includes('sofá') ? '🛋️' :
                                                        item.name.toLowerCase().includes('tv') ? '📺' : '🪑'
                                        )}
                                        {item.category === 'clothing' && (
                                            item.name.toLowerCase().includes('camiseta') ? '👕' :
                                                item.name.toLowerCase().includes('traje') ? '🕴️' : '👕'
                                        )}
                                        {item.category === 'accessory' && (
                                            item.name.toLowerCase().includes('gorra') ? '🧢' :
                                                item.name.toLowerCase().includes('lentes') ? '🕶️' :
                                                    item.name.toLowerCase().includes('corona') ? '👑' : '🎩'
                                        )}
                                        {item.category === 'eyes' && '👀'}
                                        {item.category === 'mouth' && '👄'}
                                        {item.category === 'skin' && '🎨'}
                                    </div>

                                    {/* Item Info */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-white text-lg leading-tight">
                                                {item.name}
                                            </h4>
                                            {quantity > 0 && (
                                                <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2 py-1 rounded-full border border-yellow-500/30">
                                                    {item.isConsumable ? `x${quantity}` : 'En posesión'}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-gray-400 line-clamp-2 h-10">
                                            {item.description || 'Sin descripción'}
                                        </p>

                                        {item.effectValue > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Efecto: +{item.effectValue}
                                            </div>
                                        )}
                                    </div>

                                    {/* Price and Buy/Equip Button */}
                                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-1.5">
                                            <LucideCoins size={18} className="text-yellow-400" />
                                            <span className="font-bold text-yellow-400 text-lg">
                                                {item.price}
                                            </span>
                                        </div>

                                        {!item.isConsumable && quantity > 0 ? (
                                            <button
                                                onClick={() => handleEquip(item.id, item.name)}
                                                disabled={equipping !== null}
                                                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                {equipping === item.id ? (
                                                    <LucideLoader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <span className="text-lg">✨</span>
                                                        Equipar
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handlePurchase(item.id, item.price, item.name)}
                                                disabled={purchasing !== null}
                                                className="flex-1 bg-white text-black hover:bg-gray-200 disabled:bg-gray-500 disabled:cursor-not-allowed font-bold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                {purchasing === item.id ? (
                                                    <LucideLoader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <LucideShoppingCart size={16} />
                                                        Comprar
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
