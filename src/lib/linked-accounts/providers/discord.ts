import type { AccountProvider, ProviderUserData } from "../provider";
import type { LinkedAccountRecord } from "../provider";
import { SALTO_DISCORD_GUILD_ID } from "@/config";

const CLIENT_ID = import.meta.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.DISCORD_CLIENT_SECRET;
const SCOPES = ["identify", "guilds", "openid"];

export const discordProvider: AccountProvider = {
    name: "discord",
    label: "Discord",

    getAuthorizationUrl(state: string, callbackUrl: string): URL {
        const url = new URL("https://discord.com/api/oauth2/authorize");
        url.searchParams.set("client_id", CLIENT_ID);
        url.searchParams.set("redirect_uri", callbackUrl);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", SCOPES.join(" "));
        url.searchParams.set("state", state);
        return url;
    },

    async handleCallback(code: string, callbackUrl: string): Promise<ProviderUserData> {
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: callbackUrl,
            }).toString(),
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            throw new Error(`Discord token exchange failed: ${err}`);
        }

        const tokenData = await tokenResponse.json() as {
            access_token: string;
            refresh_token?: string;
            expires_in: number;
            scope: string;
        };

        const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userResponse.ok) {
            throw new Error("Failed to fetch Discord user");
        }

        const userData = await userResponse.json() as {
            id: string;
            username: string;
            discriminator: string;
            avatar: string | null;
        };

        const guildResponse = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!guildResponse.ok) {
            throw new Error("Failed to fetch Discord guilds");
        }

        const guilds = await guildResponse.json() as { id: string }[];
        const isMember = guilds.some((g: { id: string }) => g.id === SALTO_DISCORD_GUILD_ID);

        if (!isMember) {
            throw new Error("USER_IS_NOT_MEMBER");
        }

        const avatar = userData.avatar
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${userData.avatar.startsWith("a_") ? "gif" : "png"}`
            : null;

        const username = userData.discriminator && userData.discriminator !== "0"
            ? `${userData.username}#${userData.discriminator}`
            : userData.username;

        return {
            providerUserId: userData.id,
            username,
            avatar,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token ?? null,
            expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            scopes: tokenData.scope.split(" "),
        };
    },

    async onUnlink(account: LinkedAccountRecord): Promise<void> {
        try {
            await fetch("https://discord.com/api/oauth2/token/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    token: account.accessToken ?? "",
                }).toString(),
            });
        } catch {
            // Revocation failure is non-fatal
        }
    },
};
