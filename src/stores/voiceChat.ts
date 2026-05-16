import { create } from 'zustand';

export interface VoiceGlobalState {
  currentTeamId?: string | null;
  voiceEnabledTeams: Record<string, boolean>; // teamId -> enabled
  spectatingTeams: Record<string, boolean>; // teamId -> spectating
  isLocalMicEnabled: boolean; // PTT state
  isPTTActive: boolean; // whether V key is pressed
  isAdminSpectator: boolean;
  currentUserId?: string;
  peerCount: number;
  talkingUsers: string[];
  connectionError: string | null;
}

interface VoiceActions {
  setCurrentTeamId: (teamId: string | null) => void;
  setVoiceEnabled: (teamId: string, enabled: boolean) => void;
  setSpectatingTeam: (teamId: string, spectating: boolean) => void;
  setLocalMicEnabled: (enabled: boolean) => void;
  setIsPTTActive: (active: boolean) => void;
  setIsAdminSpectator: (isSpectator: boolean) => void;
  setCurrentUserId: (userId: string) => void;
  setPeerCount: (count: number) => void;
  addTalkingUser: (userId: string) => void;
  removeTalkingUser: (userId: string) => void;
  setConnectionError: (error: string | null) => void;
  cleanup: () => void;
}

const initialState: VoiceGlobalState = {
  currentTeamId: null,
  voiceEnabledTeams: {},
  spectatingTeams: {},
  isLocalMicEnabled: false,
  isPTTActive: false,
  isAdminSpectator: false,
  currentUserId: undefined,
  peerCount: 0,
  talkingUsers: [],
  connectionError: null,
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

  setLocalMicEnabled: (enabled) => set({ isLocalMicEnabled: enabled }),

  setIsPTTActive: (active) => set({ isPTTActive: active }),

  setIsAdminSpectator: (isSpectator) => set({ isAdminSpectator: isSpectator }),

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  setPeerCount: (count) => set({ peerCount: count }),

  addTalkingUser: (userId) =>
    set((state) => ({ talkingUsers: [...state.talkingUsers.filter(id => id !== userId), userId] })),

  removeTalkingUser: (userId) =>
    set((state) => ({ talkingUsers: state.talkingUsers.filter(id => id !== userId) })),

  setConnectionError: (error) => set({ connectionError: error }),

  cleanup: () => {
    // Keep teams and settings, reset others
    set((state) => ({
      peerCount: 0,
      talkingUsers: [],
      isLocalMicEnabled: false,
      isPTTActive: false,
      connectionError: null
    }));
  },
}));
