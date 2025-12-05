export const petItemsSeeds = [
    // Food items
    {
        name: 'Hamburguesa Saltana',
        description: 'Una deliciosa hamburguesa que restaura el hambre',
        type: 'food' as const,
        price: 50,
        icon: '🍔',
        metadata: {
            hungerRestore: 30,
            happinessBoost: 10,
            experienceGain: 10
        },
        isAvailable: true
    },
    {
        name: 'Pizza Especial',
        description: 'Pizza con extra queso, favorita de las mascotas',
        type: 'food' as const,
        price: 75,
        icon: '🍕',
        metadata: {
            hungerRestore: 40,
            happinessBoost: 15,
            experienceGain: 15
        },
        isAvailable: true
    },
    {
        name: 'Helado Premium',
        description: 'Helado refrescante y delicioso',
        type: 'food' as const,
        price: 60,
        icon: '🍦',
        metadata: {
            hungerRestore: 25,
            happinessBoost: 20,
            experienceGain: 12
        },
        isAvailable: true
    },
    {
        name: 'Manzana Fresca',
        description: 'Manzana saludable y nutritiva',
        type: 'food' as const,
        price: 30,
        icon: '🍎',
        metadata: {
            hungerRestore: 20,
            happinessBoost: 5,
            experienceGain: 8
        },
        isAvailable: true
    },
    {
        name: 'Galletas de Chocolate',
        description: 'Galletas crujientes con chips de chocolate',
        type: 'food' as const,
        price: 40,
        icon: '🍪',
        metadata: {
            hungerRestore: 25,
            happinessBoost: 12,
            experienceGain: 10
        },
        isAvailable: true
    },

    // Decorations
    {
        name: 'Sofá Cómodo',
        description: 'Un sofá perfecto para descansar',
        type: 'decoration' as const,
        price: 200,
        icon: '🛋️',
        metadata: {
            category: 'furniture'
        },
        isAvailable: true
    },
    {
        name: 'Planta Decorativa',
        description: 'Una planta que da vida al espacio',
        type: 'decoration' as const,
        price: 100,
        icon: '🪴',
        metadata: {
            category: 'decoration'
        },
        isAvailable: true
    },
    {
        name: 'Lámpara Elegante',
        description: 'Ilumina tu casa con estilo',
        type: 'decoration' as const,
        price: 150,
        icon: '💡',
        metadata: {
            category: 'lighting'
        },
        isAvailable: true
    },
    {
        name: 'Alfombra Suave',
        description: 'Alfombra cómoda y decorativa',
        type: 'decoration' as const,
        price: 120,
        icon: '🔲',
        metadata: {
            category: 'flooring'
        },
        isAvailable: true
    },
    {
        name: 'Cuadro Artístico',
        description: 'Arte para las paredes',
        type: 'decoration' as const,
        price: 180,
        icon: '🖼️',
        metadata: {
            category: 'wall'
        },
        isAvailable: true
    },

    // Clothing
    {
        name: 'Gorra Saltana',
        description: 'Gorra oficial de SaltoUruguay',
        type: 'clothing' as const,
        price: 100,
        icon: '🧢',
        metadata: {
            slot: 'head'
        },
        isAvailable: true
    },
    {
        name: 'Camiseta Streamer',
        description: 'Camiseta de streamer profesional',
        type: 'clothing' as const,
        price: 150,
        icon: '👕',
        metadata: {
            slot: 'body'
        },
        isAvailable: true
    },
    {
        name: 'Zapatillas Gaming',
        description: 'Zapatillas para los verdaderos gamers',
        type: 'clothing' as const,
        price: 120,
        icon: '👟',
        metadata: {
            slot: 'feet'
        },
        isAvailable: true
    },

    // Accessories
    {
        name: 'Gafas de Sol',
        description: 'Gafas para verse cool',
        type: 'accessory' as const,
        price: 80,
        icon: '🕶️',
        metadata: {
            slot: 'face'
        },
        isAvailable: true
    },
    {
        name: 'Auriculares Gaming',
        description: 'Para escuchar con estilo',
        type: 'accessory' as const,
        price: 200,
        icon: '🎧',
        metadata: {
            slot: 'head'
        },
        isAvailable: true
    },
    {
        name: 'Collar Dorado',
        description: 'Un collar brillante y elegante',
        type: 'accessory' as const,
        price: 150,
        icon: '📿',
        metadata: {
            slot: 'neck'
        },
        isAvailable: true
    },

    // Toys
    {
        name: 'Pelota Saltarina',
        description: 'Para jugar y divertirse',
        type: 'toy' as const,
        price: 50,
        icon: '⚽',
        metadata: {
            happinessBoost: 15
        },
        isAvailable: true
    },
    {
        name: 'Consola de Juegos',
        description: 'Para los momentos de entretenimiento',
        type: 'toy' as const,
        price: 300,
        icon: '🎮',
        metadata: {
            happinessBoost: 25
        },
        isAvailable: true
    },
    {
        name: 'Peluche Mascota',
        description: 'Un amigo suave y acogedor',
        type: 'toy' as const,
        price: 100,
        icon: '🧸',
        metadata: {
            happinessBoost: 20
        },
        isAvailable: true
    }
];
