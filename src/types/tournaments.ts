export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'groups';
export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'completed';
export type MatchStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'disputed';

export interface Tournament {
    id: number;
    name: string;
    description: string | null;
    bannerUrl: string | null;
    format: TournamentFormat;
    status: TournamentStatus;
    privacy: 'public' | 'private';
    maxParticipants: number | null;
    startDate: Date | null;
    endDate: Date | null;
    config: any;
    featured?: boolean;
    externalChallongeBracketId?: string | null;
    showTeamsFeatured?: boolean;
    creatorId: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface TournamentParticipant {
    id: number;
    tournamentId: number;
    userId: number;
    seed: number | null;
    status: 'pending' | 'confirmed' | 'disqualified';
    teamName: string | null;
    user?: {
        id: number;
        displayName: string;
        username: string;
        avatar: string | null;
        discordId?: string | null;
    };
}

export interface TournamentMatch {
    id: number;
    tournamentId: number;
    round: number;
    matchOrder: number;
    player1Id: number | null;
    player2Id: number | null;
    score1: number | null;
    score2: number | null;
    winnerId: number | null;
    nextMatchId: number | null;
    status: MatchStatus;
    startTime: Date | null;
    player1?: {
        id: number;
        displayName: string;
        username: string;
        avatar: string | null;
    };
    player2?: {
        id: number;
        displayName: string;
        username: string;
        avatar: string | null;
    };
}
