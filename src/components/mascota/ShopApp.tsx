import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { actions } from 'astro:actions';

interface ItemMetadata {
    hungerRestore?: number;
    happinessBoost?: number;
    experienceGain?: number;
    category?: string;
    slot?: string;
    [key: string]: any;
}

interface PetItem {
    id: number;
    name: string;
    description: string;
    type: string;
    price: number;
    icon: string;
    metadata: ItemMetadata;
}

export default function ShopApp() {
    const [items, setItems] = useState<PetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [message, setMessage] = useState<string>('');
    const [purchasing, setPurchasing] = useState<number | null>(null);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await actions.pets.getShopItems();
            if (error) {
                setMessage('Error al cargar la tienda');
                console.error(error);
            } else if (data?.items) {
                setItems(data.items);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            setMessage('Error al cargar la tienda');
        } finally {
            setLoading(false);
        }
    };

    const purchaseItem = async (itemId: number, itemName: string, price: number) => {
        setPurchasing(itemId);
        try {
            const { data, error } = await actions.pets.purchaseItem({ itemId });
            if (error) {
                setMessage(error.message || 'Error al comprar el item');
            } else {
                setMessage(`✅ ¡Compraste ${itemName}!`);
            }
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Error purchasing item:', error);
            setMessage(error.message || 'Error al comprar el item');
        } finally {
            setPurchasing(null);
        }
    };

    const filteredItems = filter === 'all' 
        ? items 
        : items.filter(item => item.type === filter);

    const typeEmojis: Record<string, string> = {
        food: '🍔',
        decoration: '🏠',
        clothing: '👕',
        accessory: '🎩',
        toy: '🎮'
    };

    const typeLabels: Record<string, string> = {
        food: 'Comida',
        decoration: 'Decoración',
        clothing: 'Ropa',
        accessory: 'Accesorios',
        toy: 'Juguetes'
    };

    if (loading) {
        return (
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Cargando tienda...</p>
                </div>
            </div>
        );
    }

    return (
        <div class="max-w-6xl mx-auto p-4">
            {/* Header */}
            <div class="mb-6">
                <h1 class="text-3xl font-bold mb-2">🛒 Tienda Saltana</h1>
                <p class="text-gray-600">Compra items para tu mascota con Saltocoins</p>
            </div>

            {/* Message */}
            {message && (
                <div class="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-center animate-fade-in">
                    {message}
                </div>
            )}

            {/* Filter Buttons */}
            <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
                <div class="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        class={`px-4 py-2 rounded-lg font-medium transition-all ${
                            filter === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        Todos
                    </button>
                    {Object.entries(typeLabels).map(([type, label]) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            class={`px-4 py-2 rounded-lg font-medium transition-all ${
                                filter === type
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                        >
                            {typeEmojis[type]} {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Items Grid */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                    <div
                        key={item.id}
                        class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
                    >
                        <div class="text-center mb-4">
                            <div class="text-6xl mb-2">{item.icon}</div>
                            <h3 class="text-xl font-bold mb-1">{item.name}</h3>
                            <p class="text-sm text-gray-600 mb-3">{item.description}</p>
                            <div class="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm mb-3">
                                {typeEmojis[item.type]} {typeLabels[item.type]}
                            </div>
                        </div>

                        <div class="border-t pt-4">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-lg font-bold text-yellow-600">
                                    {item.price} 🪙
                                </span>
                            </div>
                            <button
                                onClick={() => purchaseItem(item.id, item.name, item.price)}
                                disabled={purchasing !== null}
                                class="w-full py-2 px-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {purchasing === item.id ? 'Comprando...' : 'Comprar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredItems.length === 0 && (
                <div class="text-center py-12">
                    <p class="text-gray-600 text-lg">
                        No hay items disponibles en esta categoría
                    </p>
                </div>
            )}

            {/* Back Button */}
            <div class="mt-6 text-center">
                <a
                    href="/mascota"
                    class="inline-block px-6 py-3 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-all"
                >
                    ← Volver a mi mascota
                </a>
            </div>
        </div>
    );
}
