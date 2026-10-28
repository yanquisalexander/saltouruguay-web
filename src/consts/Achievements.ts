export const ACHIEVEMENTS = {
    CREATED_MEMBER_CARD: 'created-member-card',
    I_WAS_THERE_III: 'i-was-there-iii',
    LEAGUE_WON: 'league-won',
    CONDENADO_IV: 'condenado-iv',
    MALDITO_IV: 'maldito-iv',
    TWITCH_SUB_1: 'twitch-sub-1',
    TWITCH_SUB_3: 'twitch-sub-3',
    TWITCH_SUB_6: 'twitch-sub-6',
    TWITCH_SUB_12: 'twitch-sub-12',
} as const

export const ACHIEVEMENT_RARITIES = {
    bronze: 'Bronce', silver: 'Plata', gold: 'Oro', legendary: 'Legendario',
} as const
export type AchievementId = typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS]
export type AchievementRarity = keyof typeof ACHIEVEMENT_RARITIES
export const ACHIEVEMENT_RARITY_ORDER: Record<AchievementRarity, number> = {
    bronze: 0,
    silver: 1,
    gold: 2,
    legendary: 3,
}
export type AchievementEvent = { type: 'twitch.subscription'; months: number }
export type AchievementCondition = { event: AchievementEvent['type']; minMonths: number }

export interface AchievementText {
    id: AchievementId
    rarity: AchievementRarity
    condition?: AchievementCondition
    icon?: string
    title: string
    description: string
    /** Subtítulo corto estilo carta, ej. "POR PARTICIPAR EN SALTOCRAFT EXTREMO IV" */
    subtitle?: string
    /** Arte full-bleed de la carta (webp). Si no existe, se usa el icono con fallback */
    card?: string
    isSvg?: boolean
}

export const ACHIEVEMENTS_TEXTS: AchievementText[] = [
    {
        id: ACHIEVEMENTS.CREATED_MEMBER_CARD,
        rarity: 'bronze',
        title: 'Nuevo Saltano en la ciudad',
        description: 'Has creado y personalizado tu tarjeta de miembro',
        card: '/images/achievements/created-member-card.webp',
    },
    {
        id: ACHIEVEMENTS.I_WAS_THERE_III,
        rarity: 'silver',
        title: 'Yo estuve ahí III',
        description: 'Fuiste nominado en la tercera edición de #SaltoAwards',
        card: '/images/achievements/yo-estuve-ahi-iii.webp',
    },
    {
        id: ACHIEVEMENTS.LEAGUE_WON,
        rarity: 'gold',
        title: 'Campeón de liga',
        description: 'Has participado en una liga y has ganado',
        isSvg: true,
    },
    {
        id: ACHIEVEMENTS.CONDENADO_IV,
        rarity: 'silver',
        title: 'Condenado IV',
        description: 'Participaste en SaltoCraft Extremo IV y sufriste en carne propia las maldiciones de Extremito.',
        subtitle: 'POR PARTICIPAR EN SALTOCRAFT EXTREMO IV',
        card: '/images/achievements/condenado-iv.webp',
    },
    {
        id: ACHIEVEMENTS.MALDITO_IV,
        rarity: 'legendary',
        title: 'Maldito IV',
        description: 'Sobreviviste a las maldiciones de Extremito y te coronaste ganador de SaltoCraft Extremo IV. Donde otros cayeron, tú reinaste.',
        subtitle: 'POR GANAR SALTOCRAFT EXTREMO IV',
        card: '/images/achievements/maldito-iv.webp',
        isSvg: true,
    },
    {
        id: ACHIEVEMENTS.TWITCH_SUB_1,
        rarity: 'bronze',
        title: 'Un saltano más',
        description: 'Tu primer mes de suscripción en Twitch. Llegaste por un directo y encontraste una comunidad. Hacete un lugar: esta historia también la escribís vos.',
        condition: { event: 'twitch.subscription', minMonths: 1 },
        icon: '/images/achievements/twitch-sub.svg',
    },
    {
        id: ACHIEVEMENTS.TWITCH_SUB_3,
        rarity: 'silver',
        title: 'De la casa',
        description: 'Acumulaste 3 meses de suscripción en Twitch. Ya reconocés los nombres del chat, entendés los chistes y sabés que siempre hay lugar para un directo más. Pasá sin golpear.',
        condition: { event: 'twitch.subscription', minMonths: 3 },
        icon: '/images/achievements/twitch-sub.svg',
    },
    {
        id: ACHIEVEMENTS.TWITCH_SUB_6,
        rarity: 'gold',
        title: 'De los nuestros',
        description: 'Acumulaste 6 meses de suscripción en Twitch. Entre risas, partidas y algún que otro caos, te ganaste un lugar entre los nuestros. Gracias por bancar lo que hacemos juntos.',
        condition: { event: 'twitch.subscription', minMonths: 6 },
        icon: '/images/achievements/twitch-sub.svg',
    },
    {
        id: ACHIEVEMENTS.TWITCH_SUB_12,
        rarity: 'legendary',
        title: 'Toda una vida saltana',
        description: 'Acumulaste 12 meses de suscripción en Twitch. Un año de aguante y de momentos que ya son parte de la historia de Salto. Si alguien pregunta qué hace especial a esta comunidad, vos sos parte de la respuesta.',
        condition: { event: 'twitch.subscription', minMonths: 12 },
        icon: '/images/achievements/twitch-sub.svg',
    },
]

/** Preserve catalog order within each rarity without mutating the catalog. */
export const getAchievementsByRarity = () => [...ACHIEVEMENTS_TEXTS].sort(
    (a, b) => ACHIEVEMENT_RARITY_ORDER[a.rarity] - ACHIEVEMENT_RARITY_ORDER[b.rarity]
)

export const getAchievementIconUrl = (achievementId: string) => {
    const achievement = ACHIEVEMENTS_TEXTS.find((t) => t.id === achievementId)
    if (achievement?.icon) return achievement.icon
    const ext = achievement?.isSvg ? 'svg' : 'webp'
    return `/images/achievements/${achievementId}.${ext}`
}

export const getAchievementCardUrl = (achievementId: string) => {
    const achievement = ACHIEVEMENTS_TEXTS.find((t) => t.id === achievementId)
    return achievement?.card ?? getAchievementIconUrl(achievementId)
}
