export const ACHIEVEMENTS = {
    CREATED_MEMBER_CARD: 'created-member-card',
    I_WAS_THERE_III: 'i-was-there-iii',
    LEAGUE_WON: 'league-won',
} as const

export const ACHIEVEMENTS_TEXTS = [
    {
        id: ACHIEVEMENTS.CREATED_MEMBER_CARD,
        title: 'Nuevo Saltano en la ciudad',
        description: 'Has creado y personalizado tu tarjeta de miembro',
    },
    {
        id: ACHIEVEMENTS.I_WAS_THERE_III,
        title: 'Yo estuve ahí III',
        description: 'Fuiste nominado en la tercera edición de #SaltoAwards',
    },
    {
        id: ACHIEVEMENTS.LEAGUE_WON,
        title: 'Campeón de liga',
        description: 'Has participado en una liga y has ganado',
    }
]