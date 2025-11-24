/**
 * usePusherChannel Hook
 * 
 * Manages subscription to a Pusher channel and event binding.
 * Automatically handles cleanup when the component unmounts.
 */

import { useEffect, useRef } from 'preact/hooks';
import type { Channel } from 'pusher-js';
import { pusherService } from '@/services/pusher.client';

type EventCallback = (data: any) => void;
type EventBindings = Record<string, EventCallback>;

interface UsePusherChannelOptions {
    /**
     * Channel name to subscribe to
     */
    channelName: string;
    
    /**
     * Event bindings as an object where keys are event names and values are callbacks
     */
    events?: EventBindings;
    
    /**
     * Whether to automatically subscribe to the channel
     * @default true
     */
    enabled?: boolean;
}

export function usePusherChannel({
    channelName,
    events = {},
    enabled = true,
}: UsePusherChannelOptions) {
    const channelRef = useRef<Channel | null>(null);
    const boundEventsRef = useRef<Map<string, EventCallback>>(new Map());

    useEffect(() => {
        if (!enabled || !channelName) {
            return;
        }

        // Subscribe to channel
        channelRef.current = pusherService.subscribe(channelName);

        // Bind all events
        Object.entries(events).forEach(([eventName, callback]) => {
            pusherService.bind(channelName, eventName, callback);
            boundEventsRef.current.set(eventName, callback);
        });

        // Cleanup
        return () => {
            // Unbind all events
            boundEventsRef.current.forEach((callback, eventName) => {
                pusherService.unbind(channelName, eventName, callback);
            });
            boundEventsRef.current.clear();

            // Note: We don't unsubscribe here to allow other components
            // to continue using the same channel. The service manages
            // the channel lifecycle.
        };
    }, [channelName, enabled]);

    // Update event bindings when they change
    useEffect(() => {
        if (!enabled || !channelName) {
            return;
        }

        const currentEvents = boundEventsRef.current;
        const newEventNames = Object.keys(events);
        const currentEventNames = Array.from(currentEvents.keys());

        // Unbind removed events
        currentEventNames.forEach(eventName => {
            if (!newEventNames.includes(eventName)) {
                const callback = currentEvents.get(eventName);
                if (callback) {
                    pusherService.unbind(channelName, eventName, callback);
                    currentEvents.delete(eventName);
                }
            }
        });

        // Bind new or changed events
        Object.entries(events).forEach(([eventName, callback]) => {
            const existingCallback = currentEvents.get(eventName);
            
            // If callback changed, unbind old and bind new
            if (existingCallback && existingCallback !== callback) {
                pusherService.unbind(channelName, eventName, existingCallback);
                pusherService.bind(channelName, eventName, callback);
                currentEvents.set(eventName, callback);
            }
            // If new event, bind it
            else if (!existingCallback) {
                pusherService.bind(channelName, eventName, callback);
                currentEvents.set(eventName, callback);
            }
        });
    }, [channelName, events, enabled]);

    return {
        channel: channelRef.current,
        
        /**
         * Bind an additional event dynamically
         */
        bind: (eventName: string, callback: EventCallback) => {
            if (!channelName) return;
            
            pusherService.bind(channelName, eventName, callback);
            boundEventsRef.current.set(eventName, callback);
        },
        
        /**
         * Unbind a specific event
         */
        unbind: (eventName: string) => {
            if (!channelName) return;
            
            const callback = boundEventsRef.current.get(eventName);
            if (callback) {
                pusherService.unbind(channelName, eventName, callback);
                boundEventsRef.current.delete(eventName);
            }
        },
    };
}
