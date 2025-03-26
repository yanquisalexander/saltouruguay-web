import crypto from "crypto";
import { ApiClient } from "@twurple/api";
import { TWITCH_CLIENT_ID } from "astro:env/server";

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

    private async verifyTwitchSignature(req: Request, body: string): Promise<boolean> {
        const messageId = req.headers.get("twitch-eventsub-message-id");
        const timestamp = req.headers.get("twitch-eventsub-message-timestamp");
        const signature = req.headers.get("twitch-eventsub-message-signature");

        if (!messageId || !timestamp || !signature) {
            return false;
        }

        const computedSignature = `sha256=${crypto.createHmac("sha256", this.secret).update(messageId + timestamp + body).digest("hex")}`;
        return computedSignature === signature;
    }

    async handleEvent(req: Request): Promise<Response> {
        const body = await req.text();
        const bodyJson: any = JSON.parse(body);

        // Obtener los encabezados usando el método get
        const messageId = req.headers.get("twitch-eventsub-message-id");
        const timestamp = req.headers.get("twitch-eventsub-message-timestamp");
        const messageType = req.headers.get("twitch-eventsub-message-type");

        if (messageType === 'webhook_callback_verification') {
            this.log(`Received webhook callback verification message with ID ${messageId} and timestamp ${timestamp}`);
            return new Response(bodyJson.challenge, { status: 200 });
        }

        // Verifica la firma de Twitch
        if (!await this.verifyTwitchSignature(req, body)) {
            return new Response("Invalid signature", { status: 403 });
        }

        this.log(`Event received: ${bodyJson.subscription.type}`);
        switch (bodyJson.subscription.type) {
            case 'channel.follow':
                this.log(`New follower: ${bodyJson.event.user_name}`);
                break;
            /* 
                User revoked authorization
             */
            case 'user.authorization.revoke':
                this.log(`User revoked authorization: ${bodyJson.event.user_id}`);
                break;
            default:
                this.log(`Unknown event type: ${bodyJson.subscription.type}`);
                break;
        }

        return new Response("Event processed", { status: 200 });
    }


    handleVerification(event: any): string {
        this.log(`Verifying subscription: ${event.subscription}`);
        return event.challenge;
    }

    async registerEventSub(broadcasterId: string): Promise<void> {
        try {
            this.log('Registering EventSub subscriptions...');
            await this.client.eventSub.subscribeToChannelSubscriptionEvents(broadcasterId, {
                callback: `https://${this.hostName}${this.callbackPath}`,
                method: 'webhook',
                secret: this.secret,
            });

            this.log(`Subscribed to channel subscription events for broadcaster ID: ${broadcasterId}`);

            await this.client.eventSub.subscribeToUserAuthorizationRevokeEvents(TWITCH_CLIENT_ID, {
                callback: `https://${this.hostName}${this.callbackPath}`,
                method: 'webhook',
                secret: this.secret,
            });

            this.log(`Subscribed to user authorization revoke events for client ID: ${TWITCH_CLIENT_ID}`);

            this.log('Successfully registered EventSub subscription.');
        } catch (error) {
            this.log(`Error subscribing to events: ${error}`);
        }
    }
}