# Voice Chat Usage Examples

## For Players

### Joining Voice Chat

1. Join a team in StreamerWars
2. Wait for admin to enable voice for your team
3. You'll see a voice indicator appear in bottom-right corner
4. Press and hold the **V** key to speak
5. Release **V** to stop transmitting

### Using Push-to-Talk (PTT)

**Basic Usage:**
```
1. Press and hold V → Start speaking
2. Release V → Stop transmitting
```

**Tips:**
- PTT is automatically disabled when typing in chat or input fields
- Green pulsing microphone = You're transmitting
- Gray microphone = Ready to transmit (press V)
- Wait ~80ms after pressing V before speaking (debounce)

### Troubleshooting

**"Permiso de micrófono denegado"**
1. Click the 🔒 icon in browser address bar
2. Allow microphone access
3. Refresh the page

**"No se encontró micrófono"**
1. Connect a microphone
2. Check system sound settings
3. Try a different browser
4. Refresh the page

**Can't hear others:**
1. Check browser volume
2. Check system volume
3. Verify voice is enabled for your team
4. Check if others are transmitting (ask in chat)

## For Admins

### Enabling Voice for a Team

**Via UI (Recommended):**
1. Look for "Control de Voice Chat" panel (top-left)
2. Find the team you want to enable
3. Click the **ON** button next to the team name
4. Players will receive a notification

**Via Browser Console:**
```javascript
// Enable voice for red team
await actions.voice.enable({ teamId: "red" });
```

**Via Admin Panel Actions:**
```typescript
import { actions } from "astro:actions";

// Enable voice
const result = await actions.voice.enable({ 
  teamId: "blue" 
});

if (result.data?.success) {
  console.log("Voice enabled for blue team");
}
```

### Disabling Voice for a Team

**Via UI:**
1. Open "Control de Voice Chat" panel
2. Find the team
3. Click the **OFF** button

**Via Console:**
```javascript
await actions.voice.disable({ teamId: "red" });
```

### Force Muting a User

**Use Case:** User is causing disruption or has audio issues

**Via Console:**
```javascript
// Get user ID from player list or session
const userId = "user-id-here";
const teamId = "red";

await actions.voice.forceMute({ 
  teamId, 
  targetUserId: userId 
});
```

**Implementation in Admin Panel:**
```typescript
// Example admin panel component
const handleForceMute = async (playerId: string, teamId: string) => {
  const { error } = await actions.voice.forceMute({
    teamId,
    targetUserId: playerId
  });
  
  if (error) {
    toast.error(`Failed to mute: ${error.message}`);
  } else {
    toast.success("User muted");
  }
};
```

### Spectator Mode (Admin Listen-Only)

As an admin, you can join voice chat in listen-only mode:

1. Don't join any team (or join as spectator)
2. When voice is enabled for a team, you'll automatically hear all participants
3. Your microphone won't transmit (no PTT needed)
4. You'll see "Modo espectador (solo escucha)" indicator

## Developer Examples

### Custom Voice Control UI

```tsx
import { actions } from "astro:actions";
import { useState } from "preact/hooks";

function TeamVoiceToggle({ teamId }: { teamId: string }) {
  const [enabled, setEnabled] = useState(false);
  
  const toggleVoice = async () => {
    if (enabled) {
      await actions.voice.disable({ teamId });
      setEnabled(false);
    } else {
      await actions.voice.enable({ teamId });
      setEnabled(true);
    }
  };
  
  return (
    <button onClick={toggleVoice}>
      {enabled ? "🔊 Voice ON" : "🔇 Voice OFF"}
    </button>
  );
}
```

### Monitoring Connection State

```tsx
import { useVoiceChatStore } from "@/stores/voiceChat";

function VoiceDebugPanel() {
  const { peerConnections, isLocalMicEnabled, currentTeamId } = useVoiceChatStore();
  
  return (
    <div className="debug-panel">
      <p>Team: {currentTeamId || "None"}</p>
      <p>Peers: {Object.keys(peerConnections).length}</p>
      <p>Mic: {isLocalMicEnabled ? "ON" : "OFF"}</p>
    </div>
  );
}
```

### Custom PTT Key

Currently hardcoded to 'V', but can be modified in `VoiceChat.tsx`:

```typescript
// Find this line:
if (e.key.toLowerCase() === 'v' && !isPTTActive && localStream && teamId && voiceEnabledTeams[teamId]) {

// Change to your preferred key:
if (e.key === ' ' && !isPTTActive && localStream && teamId && voiceEnabledTeams[teamId]) {
// Now uses spacebar instead
```

### Programmatic PTT Control

```typescript
import { useVoiceChatStore } from "@/stores/voiceChat";

function CustomPTTButton() {
  const { localStream, setLocalMicEnabled, isPTTActive, setPTTActive } = useVoiceChatStore();
  
  const startTransmit = () => {
    if (localStream && !isPTTActive) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      setLocalMicEnabled(true);
      setPTTActive(true);
    }
  };
  
  const stopTransmit = () => {
    if (localStream && isPTTActive) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      setLocalMicEnabled(false);
      setPTTActive(false);
    }
  };
  
  return (
    <button 
      onMouseDown={startTransmit}
      onMouseUp={stopTransmit}
      onMouseLeave={stopTransmit}
    >
      Press to Talk
    </button>
  );
}
```

## Testing Scenarios

### Scenario 1: Basic Team Voice

**Setup:**
1. Create 2 test accounts
2. Both join the same team (e.g., "red")
3. Admin enables voice for "red" team

**Test:**
1. User A presses V and speaks
2. User B should hear audio
3. User B presses V and speaks
4. User A should hear audio

**Expected:**
- Both users see voice indicator
- Microphone turns green when V is pressed
- Audio is clear and low-latency

### Scenario 2: Multiple Teams

**Setup:**
1. 4 users: 2 in "red" team, 2 in "blue" team
2. Enable voice for both teams

**Test:**
1. Red team users talk (V key)
2. Verify red team users hear each other
3. Verify blue team users DON'T hear red team
4. Blue team users talk
5. Verify blue team users hear each other
6. Verify red team users DON'T hear blue team

**Expected:**
- Voice isolation between teams
- No cross-team audio leakage

### Scenario 3: Admin Force Mute

**Setup:**
1. Voice enabled for team
2. User is transmitting
3. Admin issues force mute

**Test:**
```javascript
await actions.voice.forceMute({ 
  teamId: "red", 
  targetUserId: "user123" 
});
```

**Expected:**
- User's mic immediately disabled
- User cannot transmit even with V key
- Other users stop hearing them
- User sees error/notification

### Scenario 4: Connection Recovery

**Setup:**
1. Voice chat active
2. User loses internet briefly

**Test:**
1. Disconnect network
2. Wait 5 seconds
3. Reconnect network

**Expected:**
- Connection automatically recovers
- Peer connections re-establish
- No manual intervention needed

## Common Integration Points

### Game Event: Team Formation

```typescript
// When teams are formed
globalChannel.bind("teams-formed", async ({ teams }) => {
  // Auto-enable voice for all teams
  for (const team of teams) {
    await actions.voice.enable({ teamId: team.id });
  }
});
```

### Game Event: Round Start

```typescript
globalChannel.bind("round-start", async () => {
  // Disable all voice at round start
  const teams = ["red", "blue", "green", "yellow"];
  for (const team of teams) {
    await actions.voice.disable({ teamId: team });
  }
  
  // Re-enable after 10 seconds
  setTimeout(async () => {
    for (const team of teams) {
      await actions.voice.enable({ teamId: team });
    }
  }, 10000);
});
```

### Game Event: Player Elimination

```typescript
globalChannel.bind("player-eliminated", ({ playerNumber }) => {
  // Get player's team and remove from voice
  const player = players.find(p => p.playerNumber === playerNumber);
  if (player?.teamId) {
    // Voice chat will auto-cleanup when player changes team
    // or manually trigger cleanup
    useVoiceChatStore.getState().cleanup();
  }
});
```
