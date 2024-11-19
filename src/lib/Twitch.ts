import { ApiClient } from "@twurple/api";

import { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } from "astro:env/server";

import {
    AppTokenAuthProvider,
    RefreshingAuthProvider,
    StaticAuthProvider,
} from "@twurple/auth";

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