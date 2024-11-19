import { SALTO_BROADCASTER_ID } from "@/config";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";

import {
    createUserApiClient,
    createStaticAuthProvider,
    TWITCH_SCOPES,
} from "@/lib/Twitch";
import { eq, QueryPromise } from "drizzle-orm";



export const getUserSubscription = async (twitchUserId: string, token: string) => {
    try {
        console.log("Fetching subscription for user", twitchUserId);
        console.log({ twitchUserId, token });
        const authProvider = createStaticAuthProvider(token);
        const apiClient = createUserApiClient(authProvider);

        const subscription = await apiClient.subscriptions.checkUserSubscription(
            twitchUserId,
            SALTO_BROADCASTER_ID,
        );

        if (!subscription) {
            console.log("User is not subscribed");
            return null;
        }

        return subscription.tier
            ? (parseInt(subscription.tier.charAt(0)) as 1 | 2 | 3)
            : null;
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return null;
    }
};
