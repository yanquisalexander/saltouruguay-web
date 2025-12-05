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

interface InventoryItem {
    id: number;
    userId: number;
    itemId: number;
    quantity: number;
    purchasedAt: string;
    item: {
        id: number;
        name: string;
        description: string;
        type: string;
        price: number;
        icon: string;
        metadata: ItemMetadata;
    };
}

export default function InventoryApp() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [message, setMessage] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const { data, error } = await actions.pets.getInventory();
            if (error) {
                setMessage('Error al cargar tu inventario');
                console.error(error);
            } else if (data?.inventory) {
                setInventory(data.inventory);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            setMessage('Error al cargar tu inventario');
        } finally {
            setLoading(false);
        }
    };

    const useItem = async (item: InventoryItem) => {
        if (item.item.type === 'food') {
            setMessage('🍔 Usando item...');
            try {
                const { data, error } = await actions.pets.feedPet({ itemId: item.itemId });
                if (error) {
                    setMessage(error.message || 'Error al usar el item');
                } else {
                    setMessage(`✅ ¡Has usado ${item.item.name}!`);
                    // Reload inventory
                    await loadInventory();
                }
            } catch (error: any) {
                setMessage(error.message || 'Error al usar el item');
            }
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage('Este tipo de item no se puede usar directamente');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const filteredInventory = filter === 'all'
        ? inventory
        : inventory.filter(item => item.item.type === filter);

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
                    <p class="mt-4 text-gray-600">Cargando inventario...</p>
                </div>
            </div>
        );
    }

    return (
        <div class="max-w-6xl mx-auto p-4">
            {/* Header */}
            <div class="mb-6">
                <h1 class="text-3xl font-bold mb-2">🎒 Mi Inventario</h1>
                <p class="text-gray-600">Gestiona los items que has comprado</p>
            </div>

            {/* Message */}
            {message && (
                <div class="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-center animate-fade-in">
                    {message}
                </div>
            )}

            {/* Stats */}
            <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-gray-600">Total de items:</span>
                        <span class="ml-2 font-bold text-2xl">{inventory.length}</span>
                    </div>
                    <div>
                        <span class="text-gray-600">Items únicos:</span>
                        <span class="ml-2 font-bold text-2xl">
                            {inventory.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
                    </div>
                </div>
            </div>

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

            {/* Inventory Grid */}
            {filteredInventory.length > 0 ? (
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInventory.map((inventoryItem) => (
                        <div
                            key={inventoryItem.id}
                            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
                        >
                            <div class="text-center mb-4">
                                <div class="text-6xl mb-2">{inventoryItem.item.icon}</div>
                                <h3 class="text-xl font-bold mb-1">{inventoryItem.item.name}</h3>
                                <p class="text-sm text-gray-600 mb-3">{inventoryItem.item.description}</p>
                                <div class="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm mb-2">
                                    {typeEmojis[inventoryItem.item.type]} {typeLabels[inventoryItem.item.type]}
                                </div>
                                <div class="text-lg font-bold text-blue-600">
                                    Cantidad: {inventoryItem.quantity}
                                </div>
                            </div>

                            <div class="border-t pt-4 space-y-2">
                                {inventoryItem.item.type === 'food' && (
                                    <button
                                        onClick={() => useItem(inventoryItem)}
                                        class="w-full py-2 px-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all"
                                    >
                                        Usar
                                    </button>
                                )}
                                {inventoryItem.item.type === 'decoration' && (
                                    <button
                                        onClick={() => setMessage('🏠 Ve a la sección Casa para decorar')}
                                        class="w-full py-2 px-4 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-all"
                                    >
                                        Colocar en casa
                                    </button>
                                )}
                                {(inventoryItem.item.type === 'clothing' || inventoryItem.item.type === 'accessory') && (
                                    <button
                                        onClick={() => setMessage('👕 Personalización disponible próximamente')}
                                        class="w-full py-2 px-4 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-all"
                                    >
                                        Equipar
                                    </button>
                                )}
                                {inventoryItem.item.type === 'toy' && (
                                    <button
                                        onClick={() => setMessage('🎮 Juguetes disponibles próximamente')}
                                        class="w-full py-2 px-4 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-all"
                                    >
                                        Jugar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div class="text-center py-12 bg-white rounded-lg shadow-lg">
                    <div class="text-6xl mb-4">📦</div>
                    <p class="text-gray-600 text-lg mb-4">
                        {filter === 'all' 
                            ? 'Tu inventario está vacío' 
                            : 'No tienes items de esta categoría'}
                    </p>
                    <a
                        href="/mascota/tienda"
                        class="inline-block px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-all"
                    >
                        Ir a la tienda
                    </a>
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
