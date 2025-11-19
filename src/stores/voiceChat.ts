import { create } from 'zustand';

export interface VoiceGlobalState {
  currentTeamId?: string | null;
  voiceEnabledTeams: Record<string, boolean>; // teamId -> enabled
  peerConnections: Record<string, RTCPeerConnection>; // userId -> connection
  localStream: MediaStream | null;
  isLocalMicEnabled: boolean; // PTT state
  isPTTActive: boolean; // whether V key is pressed
  isAdminSpectator: boolean;
  currentUserId?: string;
}

interface VoiceActions {
  setCurrentTeamId: (teamId: string | null) => void;
  setVoiceEnabled: (teamId: string, enabled: boolean) => void;
  addPeerConnection: (userId: string, connection: RTCPeerConnection) => void;
  removePeerConnection: (userId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setLocalMicEnabled: (enabled: boolean) => void;
  setPTTActive: (active: boolean) => void;
  setIsAdminSpectator: (isSpectator: boolean) => void;
  setCurrentUserId: (userId: string) => void;
  cleanup: () => void;
}

const initialState: VoiceGlobalState = {
  currentTeamId: null,
  voiceEnabledTeams: {},
  peerConnections: {},
  localStream: null,
  isLocalMicEnabled: false,
  isPTTActive: false,
  isAdminSpectator: false,
  currentUserId: undefined,
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

  addPeerConnection: (userId, connection) =>
    set((state) => ({
      peerConnections: {
        ...state.peerConnections,
        [userId]: connection,
      },
    })),

  removePeerConnection: (userId) =>
    set((state) => {
      const { [userId]: removed, ...rest } = state.peerConnections;
      removed?.close();
      return { peerConnections: rest };
    }),

  setLocalStream: (stream) => set({ localStream: stream }),

  setLocalMicEnabled: (enabled) => set({ isLocalMicEnabled: enabled }),

  setPTTActive: (active) => set({ isPTTActive: active }),

  setIsAdminSpectator: (isSpectator) => set({ isAdminSpectator: isSpectator }),

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  cleanup: () => {
    const state = get();
    
    // Close all peer connections
    Object.values(state.peerConnections).forEach((pc) => pc.close());
    
    // Stop local stream tracks
    state.localStream?.getTracks().forEach((track) => track.stop());
    
    // Reset to initial state
    set(initialState);
  },
}));
