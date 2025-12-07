export interface SaltogramUser {
    id: number;
    displayName: string;
    username: string;
    avatar: string | null;
    admin?: boolean;
    twitchTier?: number | null;
}

export interface SaltogramPost {
    id: number;
    userId: number;
    text: string | null;
    imageUrl: string | null;
    isPinned: boolean;
    isFeatured: boolean;
    featuredUntil: string | null;
    metadata?: any;
    createdAt: string;
    user: SaltogramUser;
    reactionsCount: number;
    commentsCount: number;
    latestComments?: SaltogramComment[];
}

export interface SaltogramReaction {
    emoji: string;
    count: number;
}

export interface SaltogramComment {
    id: number;
    text: string;
    parentId?: number | null;
    createdAt: string;
    user: SaltogramUser;
}
