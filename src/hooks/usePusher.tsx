/**
 * usePusher Hook
 * 
 * Provides access to the singleton Pusher instance.
 * This hook ensures that components always get the same Pusher instance.
 */

import { useEffect, useState } from 'preact/hooks';
import type Pusher from 'pusher-js';
import { pusherService } from '@/services/pusher.client';

export function usePusher() {
    const [pusher, setPusher] = useState<Pusher | null>(null);
    const [connectionState, setConnectionState] = useState<string>('uninitialized');

    useEffect(() => {
        // Get the singleton Pusher instance
        const pusherInstance = pusherService.getPusher();
        setPusher(pusherInstance);

        // Monitor connection state
        const updateState = () => {
            setConnectionState(pusherService.getConnectionState());
        };

        pusherInstance.connection.bind('state_change', updateState);

        // Initial state update
        updateState();

        // Cleanup: Don't disconnect, just unbind state listener
        return () => {
            pusherInstance.connection.unbind('state_change', updateState);
        };
    }, []);

    return {
        pusher,
        isConnected: connectionState === 'connected',
        connectionState,
    };
}
