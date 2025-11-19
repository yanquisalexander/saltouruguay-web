# TURN Server Setup Guide

## Why TURN Servers?

STUN servers help with NAT traversal in most cases, but in restrictive network environments (corporate firewalls, symmetric NAT, etc.), you may need TURN servers to relay the traffic.

## When to Add TURN

Add TURN servers if you notice:
1. Voice chat works for most users but fails for some
2. Corporate/university networks have issues
3. Mobile networks have connectivity problems
4. ICE connection state stays in "checking" or "failed"

## Configuration

### Option 1: Self-Hosted (Coturn)

Install coturn on your server:

```bash
sudo apt-get install coturn
```

Configure `/etc/turnserver.conf`:

```
listening-port=3478
tls-listening-port=5349
listening-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP
realm=saltouruguay.com
server-name=saltouruguay.com
lt-cred-mech
user=username:password
no-stdout-log
log-file=/var/log/turnserver.log
simple-log
```

Enable and start:

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

### Option 2: Cloud TURN Services

Popular services:
- **Twilio STUN/TURN**: https://www.twilio.com/stun-turn
- **Xirsys**: https://xirsys.com/
- **Metered TURN**: https://www.metered.ca/tools/openrelay/

### Code Update

Update `src/components/streamer-wars/VoiceChat.tsx`:

```typescript
const ICE_SERVERS = {
  iceServers: [
    // STUN servers (free, public)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    
    // TURN server (add your credentials)
    {
      urls: "turn:YOUR_TURN_SERVER:3478",
      username: "your_username",
      credential: "your_password"
    },
    // Optional: TURN over TLS
    {
      urls: "turns:YOUR_TURN_SERVER:5349",
      username: "your_username",
      credential: "your_password"
    }
  ]
};
```

### Environment Variables

For security, store credentials as environment variables:

In `astro.config.mjs`:

```javascript
env: {
  schema: {
    // ... existing config
    TURN_SERVER_URL: envField.string({ context: 'client', access: 'public' }),
    TURN_USERNAME: envField.string({ context: 'client', access: 'public' }),
    TURN_CREDENTIAL: envField.string({ context: 'client', access: 'secret' }),
  }
}
```

In `.env`:

```
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your_username
TURN_CREDENTIAL=your_secure_password
```

Update VoiceChat.tsx:

```typescript
import { TURN_SERVER_URL, TURN_USERNAME, TURN_CREDENTIAL } from "astro:env/client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(TURN_SERVER_URL ? [{
      urls: TURN_SERVER_URL,
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL
    }] : [])
  ]
};
```

## Testing TURN Connectivity

Use https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ to test your TURN server configuration.

## Monitoring

Monitor TURN server usage:
- Connection success rate
- Relay vs direct connections
- Bandwidth usage
- Failed ICE candidates

Add telemetry in VoiceChat.tsx:

```typescript
pc.oniceconnectionstatechange = () => {
  if (pc.iceConnectionState === "connected") {
    pc.getStats().then(stats => {
      stats.forEach(report => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          console.log("Connection type:", report.localCandidateType, "->", report.remoteCandidateType);
          // Send to analytics: relay vs direct
        }
      });
    });
  }
};
```

## Cost Considerations

- STUN: Free (Google's public servers)
- TURN: Costs based on bandwidth
  - Estimate: ~1-2 MB/min per peer connection for voice
  - 10 users, 30 min session ≈ 450 MB
  - Most TURN providers charge $0.01-0.05 per GB

## Recommended Setup

**Development/Testing**: STUN only (current)
**Production**: STUN + TURN fallback with monitoring
