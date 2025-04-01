import crypto from "crypto";
import { ApiClient } from "@twurple/api";
import { TWITCH_CLIENT_ID } from "astro:env/server";
import { client as db } from "@/db/client";
import { eq } from "drizzle-orm";
import { TwitchProcessedEventsTable, UsersTable } from "@/db/schema";
import { handleTwitchRevoke } from "@/utils/user";




export class TwitchEvents {
    private readonly secret: string;
    private readonly client: ApiClient;
    private readonly hostName: string;
    private readonly callbackPath: string;

    constructor(secret: string, client: ApiClient, hostName: string, callbackPath: string = '/twitch/eventsub') {
        this.secret = secret;
        this.client = client;
        this.hostName = hostName;
        this.callbackPath = callbackPath;
    }

    private log(message: string) {
        console.log(`[TwitchEvents] ${message}`);
    }

    private createSignature(messageId: string, timestamp: string, body: string): string {
        return `sha256=${crypto.createHmac("sha256", this.secret)
            .update(messageId + timestamp + body)
            .digest("hex")}`;
    }

    private async verifyTwitchSignature(req: Request, body: string): Promise<boolean> {
        const messageId = req.headers.get("twitch-eventsub-message-id");
        const timestamp = req.headers.get("twitch-eventsub-message-timestamp");
        const signature = req.headers.get("twitch-eventsub-message-signature");

        if (!messageId || !timestamp || !signature) {
            this.log("Missing required headers for signature verification");
            return false;
        }

        const computedSignature = this.createSignature(messageId, timestamp, body);
        return computedSignature === signature;
    }

    private async isEventProcessed(messageId: string): Promise<boolean> {
        const result = await db
            .select()
            .from(TwitchProcessedEventsTable)
            .where(eq(TwitchProcessedEventsTable.messageId, messageId))
            .limit(1);

        return result.length > 0;
    }

    private async storeProcessedEvent(messageId: string, eventType: string, userId?: string, eventData?: any): Promise<void> {
        try {
            await db.insert(TwitchProcessedEventsTable).values({
                messageId,
                eventType,
                processedAt: new Date(),
                userId: userId ? parseInt(userId, 10) || null : null,
                eventData: eventData ? JSON.stringify(eventData) : null,
            });
            this.log(`Stored event ${messageId} in database`);
        } catch (error) {
            this.log(`Error storing event in database: ${error}`);
        }
    }

    async handleEvent(req: Request): Promise<Response> {
        try {
            const body = await req.text();
            const bodyJson = JSON.parse(body);

            const messageId = req.headers.get("twitch-eventsub-message-id");
            const timestamp = req.headers.get("twitch-eventsub-message-timestamp");
            const messageType = req.headers.get("twitch-eventsub-message-type");

            if (!messageId || !timestamp || !messageType) {
                return new Response("Missing required headers", { status: 400 });
            }

            // Handle webhook verification challenge
            if (messageType === 'webhook_callback_verification') {
                this.log(`Received verification challenge: ${messageId}`);
                return new Response(bodyJson.challenge, { status: 200 });
            }

            // Verify Twitch signature
            if (!await this.verifyTwitchSignature(req, body)) {
                this.log(`Invalid signature for message: ${messageId}`);
                return new Response("Invalid signature", { status: 403 });
            }

            // Check if event was already processed
            if (await this.isEventProcessed(messageId)) {
                this.log(`Event ${messageId} already processed, skipping`);
                return new Response("Event already processed", { status: 200 });
            }

            const eventType = bodyJson.subscription.type;
            const userId = bodyJson.event.user_id || bodyJson.event.broadcaster_user_id;

            this.log(`Processing new event: ${eventType}, ID: ${messageId}`);

            // Process the event based on type
            await this.processEvent(eventType, bodyJson.event);

            // Store the event to prevent reprocessing
            await this.storeProcessedEvent(messageId, eventType, userId, bodyJson.event);

            return new Response("Event processed", { status: 200 });
        } catch (error) {
            this.log(`Error handling event: ${error}`);
            return new Response(`Error processing event: ${error}`, { status: 500 });
        }
    }

    private async processEvent(eventType: string, eventData: any): Promise<void> {
        switch (eventType) {
            case 'channel.follow':
                this.log(`New follower: ${eventData.user_name}`);
                // Implementar lógica para seguidores
                break;

            case 'channel.subscribe':
                this.log(`New subscriber: ${eventData.user_name}`);
                // Implementar lógica para suscripciones
                break;

            case 'channel.subscription.end':
                this.log(`Subscription ended: ${eventData.user_name}`);
                // Implementar lógica para fin de suscripciones
                break;
            case 'user.update':
                this.log(`User updated: ${eventData.user_id}`);
                this.log(`New display name: ${eventData.user_name}`);

                break;


            case 'user.authorization.revoke':
                this.log(`User revoked authorization: ${eventData.user_id}`);
                try {
                    await handleTwitchRevoke(eventData.user_id);
                } catch (error) {
                    this.log(`Error handling authorization revoke: ${error}`);
                    throw error; // Re-lanzar para manejo de errores consistente
                }
                break;

            default:
                this.log(`Unhandled event type: ${eventType}`);
                break;
        }
    }

    async registerEventSub(broadcasterId: string): Promise<void> {
        this.log('Registering EventSub subscriptions...');

        // Función auxiliar para manejar cada suscripción individualmente
        const handleSubscription = async (subscriptionFn: Promise<any>, name: string) => {
            try {
                await subscriptionFn;
                this.log(`Successfully registered ${name} subscription`);
                return true;
            } catch (error: any) {
                // Si es error 409 (conflicto/ya existe), lo ignoramos
                if (error.status === 409 || (error.body && error.body.status === 409)) {
                    this.log(`Subscription ${name} already exists, skipping`);
                    return true;
                }
                // Cualquier otro error lo registramos pero continuamos
                this.log(`Error registering ${name} subscription: ${error}`);
                return false;
            }
        };

        try {
            // Definir las suscripciones con nombres descriptivos
            const subscriptions = [
                {
                    name: "channel.subscription",
                    fn: this.client.eventSub.subscribeToChannelSubscriptionEvents(broadcasterId, {
                        callback: `https://${this.hostName}${this.callbackPath}`,
                        method: 'webhook',
                        secret: this.secret,
                    })
                },
                {
                    name: "user.authorization.revoke",
                    fn: this.client.eventSub.subscribeToUserAuthorizationRevokeEvents(TWITCH_CLIENT_ID, {
                        callback: `https://${this.hostName}${this.callbackPath}`,
                        method: 'webhook',
                        secret: this.secret,
                    })
                },
                {
                    name: "channel.follow",
                    fn: this.client.eventSub.subscribeToChannelFollowEvents(broadcasterId, {
                        callback: `https://${this.hostName}${this.callbackPath}`,
                        method: 'webhook',
                        secret: this.secret,
                    })
                }
            ];

            // Procesar todas las suscripciones en paralelo
            const results = await Promise.all(
                subscriptions.map(sub => handleSubscription(sub.fn, sub.name))
            );

            // Verificar si al menos una suscripción tuvo éxito
            const successCount = results.filter(Boolean).length;
            this.log(`Registered ${successCount}/${subscriptions.length} EventSub subscriptions`);

            if (successCount === 0) {
                this.log('Warning: No subscriptions were registered successfully');
            }
        } catch (error) {
            this.log(`Unexpected error during subscription registration: ${error}`);
            // No relanzamos el error para evitar que falle todo el proceso
        }
    }


}