export const PUSHER_CHANNELS = {
  GLOBAL: 'streamer-wars',
  PRESENCE: 'presence-streamer-wars',
  SIMON_SAYS: 'streamer-wars.simon-says',
  CINEMATIC: 'streamer-wars-cinematic',
  AUTO_ELIMINATION: 'auto-elimination',
} as const;

export const PUSHER_EVENTS = {
  // Day flow
  DAY_AVAILABLE: 'day-available',
  DAY_FINISHED: 'day-finished',
  SEND_TO_WAITING_ROOM: 'send-to-waiting-room',
  SHOW_WAITING_SCREEN: 'show-waiting-screen',
  HIDE_WAITING_SCREEN: 'hide-waiting-screen',

  // Game launch
  LAUNCH_GAME: 'launch-game',

  // Players
  PLAYER_ELIMINATED: 'player-eliminated',
  PLAYERS_ELIMINATED: 'players-eliminated',
  PLAYER_REVIVED: 'player-revived',
  PLAYER_AISLATED: 'player-aislated',
  PLAYER_UNAISLATED: 'player-unaislated',
  PLAYERS_AISLATED: 'players-aislated',
  PLAYERS_UNAISLATED: 'players-unaislated',
  RELOAD_FOR_USER: 'reload-for-user',

  // Chat
  NEW_MESSAGE: 'new-message',
  MESSAGE_DELETED: 'message-deleted',
  NEW_ANNOUNCEMENT: 'new-announcement',
  CLEAR_CHAT: 'clear-chat',
  LOCK_CHAT: 'lock-chat',
  UNLOCK_CHAT: 'unlock-chat',
  CLIENT_TYPING: 'client-typing',

  // Timer
  SHOW_TIMER: 'show-timer',

  // Audio
  AUDIO_UPDATE: 'audio-update',
  AUDIO_MUTE_ALL: 'audio-mute-all',
  AUDIO_STOP_ALL: 'audio-stop-all',

  // Megaphony (TTS)
  MEGAPHONY: 'megaphony',

  // System
  TECH_DIFFICULTIES: 'tech-difficulties',
  NEW_VERSION: 'new-version',
  RELOAD_OVERLAY: 'reload-overlay',

  // Episodic
  EPISODE_TITLE: 'episode-title',

  // Teams
  CAPTAIN_ASSIGNED: 'captain-assigned',
  PLAYER_JOINED: 'player-joined',
  PLAYER_REMOVED: 'player-removed',
  BRIBE_ACCEPTED: 'bribe-accepted',

  // Instructions
  INMERSIVE_INSTRUCTIONS: 'inmersive-instructions',
  INMERSIVE_3D_CINEMATIC: 'inmersive-3d-cinematic',

  // Presence events
  MEMBER_ADDED: 'pusher:member_added',
  MEMBER_REMOVED: 'pusher:member_removed',
  SUBSCRIPTION_SUCCEEDED: 'pusher:subscription_succeeded',
} as const;

export const PUSHER_EVENTS_SIMON = {
  GAME_STATE: 'game-state',
  COMPLETED_PATTERN: 'completed-pattern',
  PATTERN_FAILED: 'pattern-failed',
  CLIENT_PLAYER_INPUT: 'client-player-input',
} as const;

export const PUSHER_EVENTS_DALGONA = {
  GAME_STARTED: 'dalgona:game-started',
  START: 'dalgona:start',
  SUCCESS: 'dalgona:success',
  DAMAGE: 'dalgona:damage',
  ATTEMPT_FAILED: 'dalgona:attempt-failed',
  PLAYER_COMPLETED: 'dalgona:player-completed',
  GAME_ENDED: 'dalgona:game-ended',
} as const;

export const PUSHER_EVENTS_BOMB = {
  GAME_STARTED: 'bomb:game-started',
  START: 'bomb:start',
  SUCCESS: 'bomb:success',
  FAILED: 'bomb:failed',
  ERROR: 'bomb:error',
  NEXT_CHALLENGE: 'bomb:next-challenge',
  PLAYER_COMPLETED: 'bomb:player-completed',
  GAME_ENDED: 'bomb:game-ended',
} as const;

export const PUSHER_EVENTS_TUG_OF_WAR = {
  GAME_STARTED: 'tug-of-war:game-started',
  STATE_UPDATE: 'tug-of-war:state-update',
  GAME_ENDED: 'tug-of-war:game-ended',
  GAME_CLEARED: 'tug-of-war:game-cleared',
} as const;

export const PUSHER_EVENTS_FISHING = {
  GAME_STARTED: 'fishing:game-started',
  PLAYER_ELIMINATED: 'fishing:player-eliminated',
  GAME_ENDED: 'fishing:game-ended',
  GAME_RESET: 'fishing:game-reset',
} as const;

export const PUSHER_EVENTS_CINEMATIC = {
  NEW_EVENT: 'new-event',
} as const;

export const PUSHER_EVENTS_AUTO_ELIM = {
  PLAYER_AUTOELIMINATED: 'player-autoeliminated',
} as const;

export const PUSHER_EVENTS_ANDI = {
  GAME_STARTED: 'andi:game-started',
  NEXT_PLAYER: 'andi:next-player',
  CLIENT_TAP: 'client-andi:tap',
  AUDIO_START: 'andi:audio-start',
  RESULT: 'andi:result',
  GAME_ENDED: 'andi:game-ended',
  GAME_RESET: 'andi:game-reset',
} as const;

export const CACHE_KEYS = {
  GAME_STATE: 'streamer-wars-gamestate',
  TIMER: 'streamer-wars-timer',
  CHAT_LOCKED: 'streamer-wars-chat-locked',
  TODAY_ELIMINATED: 'streamer-wars-today-eliminateds',
  AUTO_ELIMINATED: 'streamer-wars-auto-eliminateds',
  SELF_ELIMINATED: 'streamer-wars-self-eliminateds',
  EXPECTED_PLAYERS: 'streamer-wars-expected-players',
  WAITING_SCREEN_VISIBLE: 'streamer-wars-waiting-screen-visible',
  AUDIO_STATES: 'streamer-wars-audio-states',
  SIMON_SAYS: 'streamer-wars.simon-says',
  DALGONA: 'streamer-wars.dalgona:game-state',
  TUG_OF_WAR: 'streamer-wars.tug-of-war:game-state',
  BOMB: 'streamer-wars.bomb:game-state',
  FISHING: 'streamer-wars.fishing:game-state',
  FISHING_ELIMINATED: 'fishing:eliminated-players',
  ANDI_CHALLENGE: 'streamer-wars.andi-challenge',
} as const;
