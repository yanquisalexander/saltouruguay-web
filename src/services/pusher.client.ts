/**
 * Singleton Pusher Client Service
 * 
 * This service provides a single, centralized Pusher instance that can be
 * shared across the entire application. It manages connections, channels,
 * and event listeners to prevent duplicate bindings and memory leaks.
 */

import Pusher, { type Channel } from 'pusher-js';
import { PUSHER_KEY } from '@/config';

type EventCallback = (data: any) => void;
type ChannelEventMap = Map<string, Set<EventCallback>>;

class PusherService {
    private static instance: PusherService | null = null;
    private pusher: Pusher | null = null;
    private channels: Map<string, Channel> = new Map();
    private eventListeners: Map<string, ChannelEventMap> = new Map();
    private isConnecting: boolean = false;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    /**
     * Get the singleton instance of PusherService
     */
    public static getInstance(): PusherService {
        if (!PusherService.instance) {
            PusherService.instance = new PusherService();
        }
        return PusherService.instance;
    }

    /**
     * Initialize the Pusher connection if not already initialized
     */
    private initializePusher(): void {
        if (this.pusher || this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        try {
            this.pusher = new Pusher(PUSHER_KEY, {
                wsHost: import.meta.env.DEV ? 'localhost' : 'soketi.saltouruguayserver.com',
                wsPort: import.meta.env.DEV ? 6001 : 443,
                cluster: 'us2',
                enabledTransports: ['ws', 'wss'],
                forceTLS: !import.meta.env.DEV,
                activityTimeout: 60000,
                pongTimeout: 30000,
                disableStats: true,
            });

            // Log connection state changes
            this.pusher.connection.bind('state_change', (states: any) => {
                console.log('[Pusher] State change:', states.current);
            });

            this.pusher.connection.bind('error', (err: any) => {
                console.error('[Pusher] Connection error:', err);
            });

            this.pusher.connection.bind('connected', () => {
                console.log('[Pusher] Connected successfully');
            });

            this.pusher.connection.bind('disconnected', () => {
                console.log('[Pusher] Disconnected');
            });
        } catch (error) {
            console.error('[Pusher] Failed to initialize:', error);
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Get the Pusher instance, initializing if necessary
     */
    public getPusher(): Pusher {
        if (!this.pusher) {
            this.initializePusher();
        }
        return this.pusher!;
    }

    /**
     * Subscribe to a channel and return it
     * If already subscribed, returns the existing channel
     */
    public subscribe(channelName: string): Channel {
        if (!this.pusher) {
            this.initializePusher();
        }

        // Return existing channel if already subscribed
        if (this.channels.has(channelName)) {
            return this.channels.get(channelName)!;
        }

        // Subscribe to new channel
        const channel = this.pusher!.subscribe(channelName);
        this.channels.set(channelName, channel);
        this.eventListeners.set(channelName, new Map());

        console.log(`[Pusher] Subscribed to channel: ${channelName}`);
        
        return channel;
    }

    /**
     * Unsubscribe from a channel and clean up all its event listeners
     */
    public unsubscribe(channelName: string): void {
        const channel = this.channels.get(channelName);
        if (!channel) {
            return;
        }

        // Clean up all event listeners for this channel
        const channelEvents = this.eventListeners.get(channelName);
        if (channelEvents) {
            channelEvents.forEach((callbacks, eventName) => {
                callbacks.forEach(callback => {
                    channel.unbind(eventName, callback);
                });
            });
            channelEvents.clear();
        }

        // Unsubscribe from the channel
        this.pusher?.unsubscribe(channelName);
        this.channels.delete(channelName);
        this.eventListeners.delete(channelName);

        console.log(`[Pusher] Unsubscribed from channel: ${channelName}`);
    }

    /**
     * Bind an event listener to a channel
     * Prevents duplicate bindings of the same callback
     */
    public bind(channelName: string, eventName: string, callback: EventCallback): void {
        const channel = this.subscribe(channelName);
        
        // Get or create event map for this channel
        let channelEvents = this.eventListeners.get(channelName);
        if (!channelEvents) {
            channelEvents = new Map();
            this.eventListeners.set(channelName, channelEvents);
        }

        // Get or create callback set for this event
        let callbacks = channelEvents.get(eventName);
        if (!callbacks) {
            callbacks = new Set();
            channelEvents.set(eventName, callbacks);
        }

        // Only bind if this exact callback isn't already bound
        if (!callbacks.has(callback)) {
            channel.bind(eventName, callback);
            callbacks.add(callback);
            console.log(`[Pusher] Bound event: ${eventName} on channel: ${channelName}`);
        }
    }

    /**
     * Unbind a specific event listener from a channel
     */
    public unbind(channelName: string, eventName: string, callback: EventCallback): void {
        const channel = this.channels.get(channelName);
        const channelEvents = this.eventListeners.get(channelName);

        if (!channel || !channelEvents) {
            return;
        }

        const callbacks = channelEvents.get(eventName);
        if (callbacks && callbacks.has(callback)) {
            channel.unbind(eventName, callback);
            callbacks.delete(callback);

            // Clean up empty sets
            if (callbacks.size === 0) {
                channelEvents.delete(eventName);
            }

            console.log(`[Pusher] Unbound event: ${eventName} on channel: ${channelName}`);
        }
    }

    /**
     * Unbind all listeners for a specific event on a channel
     */
    public unbindEvent(channelName: string, eventName: string): void {
        const channel = this.channels.get(channelName);
        const channelEvents = this.eventListeners.get(channelName);

        if (!channel || !channelEvents) {
            return;
        }

        const callbacks = channelEvents.get(eventName);
        if (callbacks) {
            callbacks.forEach(callback => {
                channel.unbind(eventName, callback);
            });
            channelEvents.delete(eventName);
            console.log(`[Pusher] Unbound all listeners for event: ${eventName} on channel: ${channelName}`);
        }
    }

    /**
     * Get a specific channel if it exists
     */
    public getChannel(channelName: string): Channel | undefined {
        return this.channels.get(channelName);
    }

    /**
     * Check if connected to Pusher
     */
    public isConnected(): boolean {
        return this.pusher?.connection.state === 'connected';
    }

    /**
     * Get connection state
     */
    public getConnectionState(): string {
        return this.pusher?.connection.state || 'uninitialized';
    }

    /**
     * Disconnect from Pusher
     * WARNING: This will disconnect ALL channels. Use with caution.
     * Typically, you should unsubscribe from specific channels instead.
     */
    public disconnect(): void {
        if (!this.pusher) {
            return;
        }

        // Clean up all channels and listeners
        this.channels.forEach((_, channelName) => {
            this.unsubscribe(channelName);
        });

        this.pusher.disconnect();
        console.log('[Pusher] Disconnected');
    }

    /**
     * Reset the service (mainly for testing or complete app teardown)
     */
    public static reset(): void {
        if (PusherService.instance) {
            PusherService.instance.disconnect();
            PusherService.instance = null;
        }
    }
}

// Export singleton instance
export const pusherService = PusherService.getInstance();
export default pusherService;
