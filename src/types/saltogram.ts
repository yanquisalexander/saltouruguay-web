export interface SaltogramUser {
    id: number;
    displayName: string;
    username: string;
    avatar: string | null;
    admin?: boolean;
    twitchTier?: number | null;
}

export interface RecentReaction {
    userId: number;
    displayName: string;
    username: string;
    avatar: string | null;
    emoji: string;
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
    // Optimized fields
    userReaction?: string | null;
    recentReactions?: RecentReaction[];
    reactions?: SaltogramReaction[];
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
    reactionsCount?: number;
    userReaction?: string | null;
}

export interface FriendRequest {
    id: number;
    createdAt: string | Date;
    user: {
        id: number;
        displayName: string;
        username: string;
        avatar: string | null;
    };
}

export interface FriendRequestState {
    id: number;
    createdAt: Date;
    user: {
        id: number;
        displayName: string;
        username: string;
        avatar: string | null;
    };
}

export interface SuggestedUser {
    id: number;
    displayName: string;
    username: string;
    avatar: string | null;
}

export interface TrendingTag {
    tag: string;
    count: number;
}

export interface ProfileUser {
    id: number;
    username: string;
    displayName: string;
    avatar: string | null;
    bio?: string | null;
    friendsCount?: number;
    tier?: number | null;
    admin?: boolean;
}

export interface ConversationPreview {
    user: {
        id: number;
        displayName: string;
        username: string;
        avatar: string | null;
    };
    lastMessage: {
        content: string | null;
        createdAt: string;
        senderId: number;
        reaction?: string | null;
    };
    unreadCount: number;
}
