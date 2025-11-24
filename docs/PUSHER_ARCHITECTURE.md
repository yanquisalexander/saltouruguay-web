# Pusher Socket System Architecture

## Overview

The Pusher socket system has been refactored to use a centralized singleton pattern, eliminating issues with duplicate connections, orphaned listeners, and inconsistent event handling.

## Problem Statement

The previous implementation had several critical issues:

1. **Multiple Pusher Instances**: Components were creating their own Pusher instances, leading to duplicate connections
2. **Improper Cleanup**: Components called `pusher.disconnect()` on unmount, affecting other components
3. **Duplicate Event Bindings**: Same events being bound multiple times when components re-rendered
4. **Memory Leaks**: Orphaned listeners that were never properly cleaned up
5. **Inconsistent Behavior**: Events would stop firing after certain interactions

## Solution Architecture

### 1. Singleton Pusher Service (`/src/services/pusher.client.ts`)

The core of the new architecture is a singleton service that:

- Creates a single Pusher instance for the entire application
- Manages all channel subscriptions
- Tracks all event bindings to prevent duplicates
- Provides proper cleanup methods
- Never disconnects unless explicitly reset (app shutdown)

**Key Features:**

```typescript
// Get the singleton instance
const pusherService = PusherService.getInstance();

// Subscribe to a channel (reuses existing if already subscribed)
const channel = pusherService.subscribe('my-channel');

// Bind an event (automatically prevents duplicates)
pusherService.bind('my-channel', 'my-event', callback);

// Unbind a specific event handler
pusherService.unbind('my-channel', 'my-event', callback);

// Unsubscribe from a channel (cleans up all listeners)
pusherService.unsubscribe('my-channel');
```

### 2. React Hooks

#### `usePusher()` Hook

Provides access to the singleton Pusher instance and connection state:

```typescript
import { usePusher } from '@/hooks/usePusher';

function MyComponent() {
  const { pusher, isConnected, connectionState } = usePusher();
  
  // Use pusher instance
}
```

#### `usePusherChannel()` Hook

Manages channel subscription and event binding with automatic cleanup:

```typescript
import { usePusherChannel } from '@/hooks/usePusherChannel';
import { useMemo } from 'preact/hooks';

function MyComponent({ userId }) {
  // Memoize events object to prevent unnecessary re-binds
  const events = useMemo(() => ({
    'my-event': (data) => {
      console.log('Event received:', data);
    },
    'another-event': (data) => {
      console.log('Another event:', data, userId);
    }
  }), [userId]); // Only recreate when dependencies change

  usePusherChannel({
    channelName: 'my-channel',
    events
  });
}
```

**Features:**
- Automatic subscription on mount
- Event handlers are properly tracked
- Automatic unbinding on unmount
- Updates when event callbacks change
- Does NOT unsubscribe from channel (allows sharing between components)

**Important:** Memoize the `events` object using `useMemo` to prevent unnecessary re-bindings on every render.

## Migration Guide

### Before (Old Pattern)

```typescript
// ❌ Old way - creates new instance
export const MyComponent = ({ userId }: Props) => {
  const [pusher, setPusher] = useState<Pusher | null>(null);

  useEffect(() => {
    const pusherInstance = new Pusher(PUSHER_KEY, {
      cluster: "us2",
      // ... config
    });
    setPusher(pusherInstance);

    const channel = pusherInstance.subscribe('my-channel');
    
    channel.bind('my-event', (data) => {
      // handle event
    });

    return () => {
      channel.unbind('my-event');
      pusherInstance.disconnect(); // ❌ BAD: Disconnects shared instance
    };
  }, []);

  return <div>...</div>;
};
```

### After (New Pattern)

```typescript
// ✅ New way - uses singleton and hooks
import { usePusherChannel } from '@/hooks/usePusherChannel';

export const MyComponent = ({ userId }: Props) => {
  usePusherChannel({
    channelName: 'my-channel',
    events: {
      'my-event': (data) => {
        // handle event
      }
    }
  });

  return <div>...</div>;
};
```

### Advanced Usage - Multiple Dynamic Channels

For components that need to subscribe to multiple dynamic channels (like VoiceChat):

```typescript
import { pusherService } from '@/services/pusher.client';

useEffect(() => {
  const channelHandlers = new Map();
  
  teamIds.forEach(teamId => {
    const channelName = `team-${teamId}-voice`;
    const channel = pusherService.subscribe(channelName);
    
    const handleJoined = (data) => { /* ... */ };
    const handleLeft = (data) => { /* ... */ };
    
    pusherService.bind(channelName, 'user-joined', handleJoined);
    pusherService.bind(channelName, 'user-left', handleLeft);
    
    channelHandlers.set(channelName, {
      'user-joined': handleJoined,
      'user-left': handleLeft
    });
  });
  
  return () => {
    channelHandlers.forEach((handlers, channelName) => {
      Object.entries(handlers).forEach(([eventName, handler]) => {
        pusherService.unbind(channelName, eventName, handler);
      });
    });
  };
}, [teamIds]);
```

## Components Refactored

The following components have been updated to use the new pattern:

- ✅ `CurrentUser.tsx`
- ✅ `CinematicPlayer.tsx`
- ✅ `AchievementsNotifier.tsx`
- ✅ `DebateOverlayPinnedWidget.tsx`
- ✅ `StreamerWarsAdmin.tsx`
- ✅ `StreamerWarsCinematicPlayer.tsx`
- ✅ `VoiceChat.tsx`
- ✅ `useStreamerWarsSocket.tsx` (hook)

## Best Practices

### DO ✅

1. **Use the provided hooks** for most use cases
2. **Store handler references** when you need to unbind specific handlers
3. **Use `pusherService` directly** only for advanced scenarios
4. **Let the service manage** channel lifecycle
5. **Unbind specific handlers** in cleanup, not entire channels

### DON'T ❌

1. **Never create new Pusher instances** with `new Pusher()`
2. **Never call `pusher.disconnect()`** in component cleanup
3. **Never use `channel.unbind_all()`** as it affects other components
4. **Don't unsubscribe from channels** unless you're certain no other component needs it
5. **Don't bind handlers** without tracking them for cleanup

## Connection Management

The singleton service handles connection state automatically:

- **Initialization**: Lazy - created on first access
- **Reconnection**: Pusher library handles automatically
- **Error Handling**: Logs errors but doesn't throw
- **State Tracking**: Monitors connection state changes

## Debugging

To debug Pusher issues:

```typescript
// Check connection state
console.log(pusherService.getConnectionState());
console.log(pusherService.isConnected());

// Get a specific channel
const channel = pusherService.getChannel('my-channel');

// Service logs all operations to console with [Pusher] prefix
```

## Testing Considerations

For testing, you can reset the singleton:

```typescript
import { PusherService } from '@/services/pusher.client';

afterEach(() => {
  PusherService.reset();
});
```

## Performance Improvements

The new architecture provides:

1. **Single Connection**: Only one WebSocket connection to Pusher
2. **Shared Channels**: Multiple components can listen to the same channel
3. **No Duplicate Bindings**: Prevents memory waste from duplicate handlers
4. **Proper Cleanup**: All handlers are properly unbound on unmount
5. **Efficient Re-renders**: Hooks minimize unnecessary re-renders

## Future Improvements

Potential enhancements:

- [ ] Add retry logic for failed bindings
- [ ] Implement connection quality monitoring
- [ ] Add metrics for event frequency
- [ ] Create admin dashboard for connection status
- [ ] Add support for presence channels with hooks
- [ ] Implement event replay for missed messages
