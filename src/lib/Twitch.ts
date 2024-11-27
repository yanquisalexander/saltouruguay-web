import { ApiClient } from "@twurple/api";

import { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from "astro:env/server";

import {
    AppTokenAuthProvider,
    RefreshingAuthProvider,
    StaticAuthProvider,
} from "@twurple/auth";
import { TwitchEvents } from "./TwitchEvents";
import { SALTO_BROADCASTER_ID } from "@/config";

const hostName = import.meta.env.TWITCH_EVENTSUB_HOSTNAME ?? "localhost";

export const createStaticAuthProvider = (accessToken: string) => {
    return new StaticAuthProvider(TWITCH_CLIENT_ID, accessToken);
};

export const appAuthProvider = new AppTokenAuthProvider(
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
);

export const refreshingAuthProvider = new RefreshingAuthProvider({
    clientId: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_CLIENT_SECRET,
});

export const apiClient = new ApiClient({
    authProvider: refreshingAuthProvider,
});

export const appApiClient = new ApiClient({
    authProvider: appAuthProvider,
});

export const createUserApiClient = (authProvider: StaticAuthProvider) => {
    return new ApiClient({ authProvider });
};

export const TWITCH_SCOPES = [
    "openid",
    "user:read:email",
    "user:read:subscriptions",
];

/* 
    TODO: Estos scopes solo deberían ser utilizados por la cuenta de SaltoUruguayServer
*/
export const EXTENDED_TWITCH_SCOPES = [
    ...TWITCH_SCOPES,
    'moderator:read:followers',
    'bits:read',
    'channel:read:subscriptions'
];

export const createTwitchEventsInstance = () => {
    return new TwitchEvents(
        TWITCH_CLIENT_SECRET,
        appApiClient,
        hostName,
        '/api/twitch/event-sub/webhooks'
    )
}

export const setupEventSub = async () => {

    const eventSub = createTwitchEventsInstance()
    await eventSub.registerEventSub(SALTO_BROADCASTER_ID)
}