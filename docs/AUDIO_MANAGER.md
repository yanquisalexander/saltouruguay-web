# 🎧 Streamer Wars Audio Manager

## Overview

The Audio Manager is a centralized system for controlling audio playback during Streamer Wars events. It provides real-time synchronization across all connected clients, ensuring that all participants hear the same audio at the same time.

## Architecture

### Backend (Server-Side)

**Location:** `/src/actions/audio.ts`

The backend manages the global audio state using:
- **Redis** for state persistence (24-hour TTL)
- **Pusher** for real-time event broadcasting
- **Admin-only actions** for security

#### Available Actions

```typescript
// Play an audio file
audio.play({ audioId: string })

// Pause an audio file (preserves current position)
audio.pause({ audioId: string })

// Stop an audio file (resets to beginning)
audio.stop({ audioId: string })

// Set volume for an audio file (0-1)
audio.setVolume({ audioId: string, volume: number })

// Toggle loop on/off
audio.setLoop({ audioId: string, enabled: boolean })

// Mute all audio files
audio.muteAll({})

// Stop all audio files
audio.stopAll({})

// Get current state of all audio
audio.getCurrentAudioState({})
```

#### State Structure

```typescript
interface AudioState {
  id: string;
  playing: boolean;
  volume: number; // 0 to 1
  loop: boolean;
}
```

State is stored in Redis under the key `streamer-wars-audio-states`.

### Frontend (Client-Side)

#### Admin UI Component

**Location:** `/src/components/streamer-wars/StreamerWarsAudioManager.tsx`

Features:
- **Keyboard shortcuts:**
  - Press `A` to open/close the audio manager
  - Press `ESC` to close
- **Controls per audio:**
  - Play/Pause toggle button
  - Stop button
  - Loop toggle (shows ON/OFF state)
  - Volume slider (0-100%)
- **Status indicators:**
  - Green pulse when playing
  - 🔁 icon when looping
- **Global controls:**
  - Mute All button
  - Stop All button

#### Client-Side Playback

**Location:** `/src/components/streamer-wars/hooks/useStreamerWarsSocket.tsx`

The hook manages:
- **Audio preloading** - All audio files are preloaded on mount
- **Real-time sync** - Listens to Pusher events and updates playback
- **Audio instances** - Maintains a registry of HTMLAudioElement instances
- **Cleanup** - Properly disposes of audio on unmount

## Real-Time Events

The system uses Pusher for real-time synchronization:

### `audio-update`
Broadcast when any audio state changes.

```typescript
{
  audioId: string;
  action: 'PLAY' | 'PAUSE' | 'STOP' | 'SET_VOLUME' | 'SET_LOOP';
  data: {
    playing: boolean;
    volume: number;
    loop: boolean;
  }
}
```

### `audio-mute-all`
Broadcast when all audio should be muted.

### `audio-stop-all`
Broadcast when all audio should be stopped.

## Available Audio Files

**Location:** `/src/types/audio.ts`

The system manages 25 audio files including:
- Game events (eliminations, announcements)
- UI sounds (clicks, notifications)
- Emotional reactions (emojis)
- Background music (waiting room loop)
- Game-specific sounds (Simon Says, Tug of War)

## Usage

### Admin Usage

1. Open the Streamer Wars admin panel
2. Press `A` to open the audio manager
3. Select the audio you want to control
4. Use the controls to play, pause, stop, adjust volume, or toggle loop
5. All connected clients will hear the changes immediately

### Client Experience

Clients automatically:
- Preload all audio files when joining
- Listen for real-time audio events
- Play/pause/stop audio in sync with admin controls
- Adjust volume and loop settings as commanded

## Security

- All audio control actions require **admin authentication**
- Non-admin users can only listen to audio
- State is centrally managed on the server
- No client-side audio control (except for admin UI)

## Technical Details

### No Seeking
The system does **not** support seeking (jumping to a specific time in audio). Audio always:
- Plays from the beginning when triggered
- Stops at the beginning when stopped
- Maintains position when paused

### State Initialization
Audio state is lazily initialized:
- When `play()` is called, state is created with default values
- When `setVolume()` or `setLoop()` are called, state is created if needed
- Default values: `{ playing: false, volume: 1, loop: false }`

### Error Handling
- Invalid audio IDs throw `BAD_REQUEST` errors
- Unauthorized access throws `UNAUTHORIZED` errors
- Redis errors are logged but don't crash the system
- Audio playback errors are caught and logged to console

## Troubleshooting

### Audio not playing
1. Check browser console for errors
2. Ensure audio files are accessible at CDN
3. Verify admin has proper permissions
4. Check Pusher connection status

### Desync issues
1. Refresh the page to reload audio state
2. Check network connectivity
3. Verify Redis is running and accessible
4. Check Pusher events in browser DevTools

### Performance
- Audio files are preloaded for instant playback
- State is cached in Redis for 24 hours
- Multiple audio files can play simultaneously
- No seeking prevents complex state management

## Future Improvements

Potential enhancements:
- Audio playlists
- Fade in/out transitions
- Audio visualization
- Per-user volume control
- Audio history/logs
