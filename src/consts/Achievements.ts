export const ACHIEVEMENTS = {
    CREATED_MEMBER_CARD: 'created-member-card',
    I_WAS_THERE_III: 'i-was-there-iii',
    LEAGUE_WON: 'league-won',
    CONDENADO_IV: 'condenado-iv',
    MALDITO_IV: 'maldito-iv',
} as const

export interface AchievementText {
    id: string
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
        title: 'Nuevo Saltano en la ciudad',
        description: 'Has creado y personalizado tu tarjeta de miembro',
        isSvg: true,
    },
    {
        id: ACHIEVEMENTS.I_WAS_THERE_III,
        title: 'Yo estuve ahí III',
        description: 'Fuiste nominado en la tercera edición de #SaltoAwards',
        isSvg: true,
    },
    {
        id: ACHIEVEMENTS.LEAGUE_WON,
        title: 'Campeón de liga',
        description: 'Has participado en una liga y has ganado',
        isSvg: true,
    },
    {
        id: ACHIEVEMENTS.CONDENADO_IV,
        title: 'Condenado IV',
        description: 'Participaste en SaltoCraft Extremo IV y sufriste en carne propia las maldiciones de Extremito.',
        subtitle: 'POR PARTICIPAR EN SALTOCRAFT EXTREMO IV',
        card: '/images/achievements/condenado-iv.webp',
    },
    {
        id: ACHIEVEMENTS.MALDITO_IV,
        title: 'Maldito IV',
        description: 'Sobreviviste a las maldiciones de Extremito y te coronaste ganador de SaltoCraft Extremo IV. Donde otros cayeron, tú reinaste.',
        subtitle: 'POR GANAR SALTOCRAFT EXTREMO IV',
        card: '/images/achievements/maldito-iv.webp',
        isSvg: true,
    }
]

export const getAchievementIconUrl = (achievementId: string) => {
    const achievement = ACHIEVEMENTS_TEXTS.find((t) => t.id === achievementId)
    const ext = achievement?.isSvg ? 'svg' : 'webp'
    return `/images/achievements/${achievementId}.${ext}`
}

export const getAchievementCardUrl = (achievementId: string) => {
    const achievement = ACHIEVEMENTS_TEXTS.find((t) => t.id === achievementId)
    return achievement?.card ?? getAchievementIconUrl(achievementId)
}