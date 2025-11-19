# Voice Chat System for StreamerWars

## Overview

The Voice Chat system implements real-time peer-to-peer audio communication for teams in StreamerWars using WebRTC with STUN servers and Push-to-Talk (PTT) functionality.

## Architecture

### Components

1. **Global State Store** (`src/stores/voiceChat.ts`)
   - Zustand-based state management
   - Tracks voice enabled status per team
   - Manages WebRTC peer connections
   - Controls PTT state

2. **VoiceChat Component** (`src/components/streamer-wars/VoiceChat.tsx`)
   - Main UI and logic component
   - Handles WebRTC connections
   - Implements PTT with 'V' key
   - Visual indicators for mic state

3. **Voice Actions** (`src/actions/voice.ts`)
   - Server-side orchestration via Astro Actions
   - No HTTP endpoints - uses Actions pattern
   - Pusher event publishing for signaling

### WebRTC Configuration

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};
```

**STUN-first approach**: Uses Google's public STUN servers for NAT traversal. For production, consider adding TURN servers as fallback.

## Features

### Push-to-Talk (PTT)

- **Activation**: Press and hold 'V' key
- **Debounce**: 80ms delay before activation
- **Smart Input Detection**: PTT disabled when typing in input/textarea
- **Visual Feedback**: 
  - 🎤 Green pulsing icon when transmitting
  - 🎤❌ Gray icon when inactive
  - Text prompt: "Mantén V para hablar"

### Admin Spectator Mode

Admins can join voice chat as listen-only spectators:
- No audio transmission (local track not added to peer connections)
- Can receive audio from all team members
- Can issue force-mute commands

### Signaling Events

All signaling happens through Pusher channels: `team-{TEAM_ID}-voice-signal`

**Events:**
- `voice:enabled` - Voice chat activated for team
- `voice:disabled` - Voice chat deactivated for team
- `voice:force-mute` - Admin forces user mute
- `voice:user-joined` - User announces presence (triggers peer connections)
- `signal:offer` - WebRTC offer for peer connection
- `signal:answer` - WebRTC answer for peer connection
- `signal:iceCandidate` - ICE candidate exchange

## Usage

### Admin: Enable Voice for Team

```typescript
import { actions } from "astro:actions";

await actions.voice.enable({ teamId: "red" });
```

### Admin: Disable Voice for Team

```typescript
await actions.voice.disable({ teamId: "red" });
```

### Admin: Force Mute User

```typescript
await actions.voice.forceMute({ 
  teamId: "red", 
  targetUserId: "user123" 
});
```

## Integration

The VoiceChat component is integrated at the StreamerWars app level:

```tsx
<VoiceChat 
  pusher={pusher} 
  userId={session.user.id} 
  teamId={currentTeamId} 
  isAdmin={session.user.isAdmin} 
/>
```

Team tracking is automatic via Pusher events (`player-joined`).

## Cleanup & Lifecycle

Automatic cleanup occurs on:
- Voice disabled event received
- Team change (currentTeamId changes)
- Tab/browser close (`beforeunload`)
- Tab visibility change (`visibilitychange` to hidden)

All peer connections are properly closed and media tracks stopped.

## Future Enhancements

1. **TURN Server Fallback**: Add TURN servers for better connectivity in restrictive networks
2. **Audio Quality Controls**: Add bitrate and codec configuration
3. **Voice Activity Detection (VAD)**: Visual indicator for when others are speaking
4. **Spatial Audio**: Position audio based on player location in virtual space
5. **Recording**: Optional recording for review/highlights

## Testing

### Manual Testing Steps

1. **Basic PTT**:
   - Enable voice for a team
   - Join the team with a player
   - Press and hold 'V' - verify mic indicator turns green
   - Release 'V' - verify indicator turns gray

2. **Multiple Users**:
   - Have 2+ users in same team
   - Enable voice
   - Each user speaks via PTT
   - Verify audio is heard by others

3. **Admin Spectator**:
   - Join as admin (not in team)
   - Enable voice for a team
   - Verify admin sees "Modo espectador" indicator
   - Verify admin can hear but not transmit

4. **Force Mute**:
   - Admin force-mutes a user
   - Verify user's mic is disabled
   - User cannot transmit even with PTT

5. **Cleanup**:
   - Close browser tab
   - Change teams
   - Disable voice
   - Verify no WebRTC connections remain open

## Troubleshooting

### No Audio Heard

1. Check browser permissions for microphone
2. Verify STUN servers are reachable
3. Check browser console for WebRTC errors
4. Ensure voice is enabled for the team

### PTT Not Working

1. Verify not typing in input/textarea
2. Check 'V' key is not remapped
3. Ensure voice enabled for team
4. Check local stream exists in store

### Connection Issues

If peer connections fail to establish, likely causes:
1. Restrictive firewall (TURN server needed)
2. ICE candidate exchange failure
3. Pusher connection issues
4. Browser WebRTC support

## Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

WebRTC and getUserMedia APIs required.
