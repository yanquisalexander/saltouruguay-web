import { create } from 'zustand';

export interface SpectatorInfo {
    id: string;
    name: string;
}

export interface VoiceGlobalState {
    currentTeamId?: string | null;
    voiceEnabledTeams: Record<string, boolean>;
    spectatingTeams: Record<string, boolean>;
    spectatingUsers: Record<string, SpectatorInfo[]>;
    isLocalMicEnabled: boolean;
    isPTTActive: boolean;
    isAdminSpectator: boolean;
    currentUserId?: string;
    peerCount: number;
    peerConnectionStates: Record<string, string>;
    talkingUsers: string[];
    pttActiveUsers: string[];
    forcedMuteTargets: string[];
    connectionError: string | null;
    isReconnecting: boolean;
    availableMics: MediaDeviceInfo[];
    selectedMicId: string | null;
}

interface VoiceActions {
    setCurrentTeamId: (teamId: string | null) => void;
    setVoiceEnabled: (teamId: string, enabled: boolean) => void;
    setSpectatingTeam: (teamId: string, spectating: boolean) => void;
    addSpectator: (teamId: string, spectator: SpectatorInfo) => void;
    removeSpectator: (teamId: string, spectatorId: string) => void;
    setLocalMicEnabled: (enabled: boolean) => void;
    setIsPTTActive: (active: boolean) => void;
    setIsAdminSpectator: (isSpectator: boolean) => void;
    setCurrentUserId: (userId: string) => void;
    setPeerCount: (count: number) => void;
    setPeerConnectionState: (userId: string, state: string) => void;
    addTalkingUser: (userId: string) => void;
    removeTalkingUser: (userId: string) => void;
    addPttUser: (userId: string) => void;
    removePttUser: (userId: string) => void;
    setForcedMute: (userId: string, muted: boolean) => void;
    setConnectionError: (error: string | null) => void;
    setReconnecting: (reconnecting: boolean) => void;
    setAvailableMics: (mics: MediaDeviceInfo[]) => void;
    setSelectedMicId: (deviceId: string | null) => void;
    cleanup: () => void;
}

const initialState: VoiceGlobalState = {
    currentTeamId: null,
    voiceEnabledTeams: {},
    spectatingTeams: {},
    spectatingUsers: {},
    isLocalMicEnabled: false,
    isPTTActive: false,
    isAdminSpectator: false,
    currentUserId: undefined,
    peerCount: 0,
    peerConnectionStates: {},
    talkingUsers: [],
    pttActiveUsers: [],
    forcedMuteTargets: [],
    connectionError: null,
    isReconnecting: false,
    availableMics: [],
    selectedMicId: null,
};

export const useVoiceChatStore = create<VoiceGlobalState & VoiceActions>((set, get) => ({
    ...initialState,

    setCurrentTeamId: (teamId) => set({ currentTeamId: teamId }),

    setVoiceEnabled: (teamId, enabled) =>
        set((state) => ({
            voiceEnabledTeams: {
                ...state.voiceEnabledTeams,
                [teamId]: enabled,
            },
        })),

    setSpectatingTeam: (teamId, spectating) =>
        set((state) => ({
            spectatingTeams: {
                ...state.spectatingTeams,
                [teamId]: spectating,
            },
        })),

    addSpectator: (teamId, spectator) =>
        set((state) => {
            const current = state.spectatingUsers[teamId] || [];
            if (current.some((s) => s.id === spectator.id)) return state;
            return {
                spectatingUsers: {
                    ...state.spectatingUsers,
                    [teamId]: [...current, spectator],
                },
            };
        }),

    removeSpectator: (teamId, spectatorId) =>
        set((state) => {
            const current = state.spectatingUsers[teamId] || [];
            return {
                spectatingUsers: {
                    ...state.spectatingUsers,
                    [teamId]: current.filter((s) => s.id !== spectatorId),
                },
            };
        }),

    setLocalMicEnabled: (enabled) => set({ isLocalMicEnabled: enabled }),

    setIsPTTActive: (active) => set({ isPTTActive: active }),

    setIsAdminSpectator: (isSpectator) => set({ isAdminSpectator: isSpectator }),

    setCurrentUserId: (userId) => set({ currentUserId: userId }),

    setPeerCount: (count) => set({ peerCount: count }),

    setPeerConnectionState: (userId, state) =>
        set((prev) => ({
            peerConnectionStates: {
                ...prev.peerConnectionStates,
                [userId]: state,
            },
        })),

    addTalkingUser: (userId) =>
        set((state) => ({
            talkingUsers: [...state.talkingUsers.filter((id) => id !== userId), userId],
        })),

    removeTalkingUser: (userId) =>
        set((state) => ({
            talkingUsers: state.talkingUsers.filter((id) => id !== userId),
        })),

    addPttUser: (userId) =>
        set((state) => ({
            pttActiveUsers: [...state.pttActiveUsers.filter((id) => id !== userId), userId],
        })),

    removePttUser: (userId) =>
        set((state) => ({
            pttActiveUsers: state.pttActiveUsers.filter((id) => id !== userId),
        })),

    setForcedMute: (userId, muted) =>
        set((state) => {
            if (muted) {
                if (state.forcedMuteTargets.includes(userId)) return state;
                return { forcedMuteTargets: [...state.forcedMuteTargets, userId] };
            }
            return { forcedMuteTargets: state.forcedMuteTargets.filter((id) => id !== userId) };
        }),

    setConnectionError: (error) => set({ connectionError: error }),

    setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),

    setAvailableMics: (mics) => set({ availableMics: mics }),

    setSelectedMicId: (deviceId) => set({ selectedMicId: deviceId }),

    cleanup: () => {
        set((state) => ({
            peerCount: 0,
            peerConnectionStates: {},
            talkingUsers: [],
            pttActiveUsers: [],
            isLocalMicEnabled: false,
            isPTTActive: false,
            isReconnecting: false,
            connectionError: null,
        }));
    },
}));
