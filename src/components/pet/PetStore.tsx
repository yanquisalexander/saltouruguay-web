import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideShoppingCart, LucideCoins } from 'lucide-preact';

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
};

const RARITY_COLORS: Record<string, string> = {
    common: 'border-gray-500 bg-gray-800/50',
    uncommon: 'border-green-500 bg-green-900/30',
    rare: 'border-blue-500 bg-blue-900/30',
    epic: 'border-purple-500 bg-purple-900/30',
    legendary: 'border-yellow-500 bg-yellow-900/30',
};

export default function PetStore({ onItemPurchased }: PetStoreProps) {
    const [items, setItems] = useState<StoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [inventory, setInventory] = useState<any[]>([]);

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
                setInventory(result.data as any[]);
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
                toast.success(`¡Compraste ${itemName}!`);
                await loadInventory();
                onItemPurchased();
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al comprar el item');
        } finally {
            setPurchasing(null);
        }
    };

    const getItemQuantity = (itemId: number) => {
        const item = inventory.find(inv => inv.itemId === itemId);
        return item ? item.quantity : 0;
    };

    const categories = ['all', 'food', 'toy', 'furniture', 'clothing', 'accessory'];

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h2 className="pixel-heading text-3xl text-white drop-shadow-lg">
                        Tienda de Mascotas
                    </h2>
                    <p className="pixel-text text-gray-400 mt-2">
                        Compra comida, juguetes y decoraciones con SaltoCoins
                    </p>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 justify-center">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`pixel-btn-chunky ${
                            selectedCategory === 'all' ? 'variant-violet' : 'variant-gray'
                        }`}
                    >
                        Todo
                    </button>
                    {categories.slice(1).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`pixel-btn-chunky ${
                                selectedCategory === cat ? 'variant-violet' : 'variant-gray'
                            }`}
                        >
                            {CATEGORY_LABELS[cat]}
                        </button>
                    ))}
                </div>

                {/* Inventory Summary */}
                {inventory.length > 0 && (
                    <div className="pixel-inset p-4 bg-blue-900/30">
                        <h3 className="pixel-text text-white mb-2">Tu Inventario:</h3>
                        <div className="flex flex-wrap gap-2">
                            {inventory.slice(0, 5).map(item => (
                                <span key={item.id} className="pixel-text text-sm bg-gray-800 px-3 py-1 border-2 border-gray-600">
                                    {item.item.name} ({item.quantity})
                                </span>
                            ))}
                            {inventory.length > 5 && (
                                <span className="pixel-text text-sm text-gray-400">
                                    +{inventory.length - 5} más
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Items Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="pixel-text text-white">Cargando tienda...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="pixel-text text-gray-400">No hay items disponibles</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map(item => {
                            const quantity = getItemQuantity(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`pixel-inset p-4 border-4 ${RARITY_COLORS[item.rarity]} space-y-3`}
                                >
                                    {/* Item Icon/Preview */}
                                    <div className="w-full aspect-square bg-gray-900 border-4 border-gray-700 flex items-center justify-center text-4xl">
                                        {item.category === 'food' && '🍔'}
                                        {item.category === 'toy' && '🎮'}
                                        {item.category === 'furniture' && '🪑'}
                                        {item.category === 'clothing' && '👕'}
                                        {item.category === 'accessory' && '🎩'}
                                    </div>

                                    {/* Item Info */}
                                    <div>
                                        <h4 className="pixel-text text-white font-bold">
                                            {item.name}
                                        </h4>
                                        <p className="pixel-text text-xs text-gray-400 mt-1">
                                            {item.description || 'Sin descripción'}
                                        </p>
                                        {item.effectValue > 0 && (
                                            <p className="pixel-text text-xs text-green-400 mt-1">
                                                Efecto: +{item.effectValue}
                                            </p>
                                        )}
                                        {quantity > 0 && (
                                            <p className="pixel-text text-xs text-yellow-400 mt-1">
                                                Tienes: {quantity}
                                            </p>
                                        )}
                                    </div>

                                    {/* Price and Buy Button */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                            <LucideCoins size={16} className="text-yellow-400" />
                                            <span className="pixel-text text-yellow-400 font-bold">
                                                {item.price}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handlePurchase(item.id, item.price, item.name)}
                                            disabled={purchasing !== null}
                                            className="pixel-btn-chunky variant-yellow text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            <LucideShoppingCart size={14} />
                                            {purchasing === item.id ? 'Comprando...' : 'Comprar'}
                                        </button>
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
