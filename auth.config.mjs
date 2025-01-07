import TwitchProvider from "@auth/core/providers/twitch";
import { defineConfig } from "auth-astro";
import { EXTENDED_TWITCH_SCOPES, TWITCH_SCOPES } from "@/lib/Twitch";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { getUserSubscription } from "@/utils/user";
import { eq, or } from "drizzle-orm";

export default defineConfig({
    providers: [
        // Proveedor de Twitch
        TwitchProvider({
            clientId: import.meta.env.TWITCH_CLIENT_ID,
            clientSecret: import.meta.env.TWITCH_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: TWITCH_SCOPES.join(" "),
                    force_verify: true,
                },
            },

        }),
    ],
    callbacks: {
        signIn: async ({ user, account, profile }) => {
            console.log("signIn", user, account, profile);
            if (account.provider === "twitch") {
                if (!user.email) {
                    throw new Error("Email is required to sign in");
                }
            }
            return true;
        },
        jwt: async ({ token, user, account, profile }) => {
            if (user && account?.provider === "twitch") {
                token.user = profile;
                const email = profile?.email || null;
                const username = user?.name?.toLowerCase();
                console.log({ token, profile, account, user });



                try {
                    // Buscar si existe un usuario con el email o twitchId
                    const existingUser = await client
                        .select()
                        .from(UsersTable)
                        .where(or(
                            eq(UsersTable.twitchId, profile?.sub ?? ""),
                            email ? eq(UsersTable.email, email) : undefined
                        ))
                        .limit(1);

                    if (existingUser.length > 0) {
                        // Si existe un usuario, vincular cuentas si es necesario
                        const userId = existingUser[0].id;
                        const twitchId = profile?.sub;
                        const twitchTier = await getUserSubscription(twitchId, account.access_token);

                        // Actualizar la cuenta existente con los detalles de Twitch
                        await client
                            .update(UsersTable)
                            .set({
                                twitchId,
                                avatar: profile?.picture,
                                username,
                                displayName: profile?.preferred_username ?? username,
                                twitchTier,
                                updatedAt: new Date(),
                            })
                            .where(eq(UsersTable.id, userId));

                        // @ts-ignore
                        token.user.twitchTier = twitchTier;

                    } else {
                        // Si no existe un usuario, crear uno nuevo
                        await client
                            .insert(UsersTable)
                            .values({
                                email,
                                displayName: profile?.preferred_username ?? username,
                                avatar: profile?.picture,
                                username,
                                twitchId: profile?.sub,
                                twitchTier: await getUserSubscription(profile?.sub, account.access_token),
                            });
                    }
                } catch (error) {
                    console.error("Error managing user:", error);
                }
            }
            return token;
        },
        session: async ({ session, token }) => {
            try {
                const userRecord = await client.query.UsersTable.findFirst({
                    where: eq(UsersTable.twitchId, token.user.sub),
                    columns: {
                        id: true,
                        admin: true,
                        twitchId: true,
                        twitchTier: true,
                        discordId: true,
                        coins: true,
                    },
                });

                if (userRecord) {
                    session.user.id = userRecord.id;
                    session.user.isAdmin = userRecord.admin;
                    session.user.twitchId = userRecord.twitchId;
                    session.user.tier = userRecord.twitchTier;
                    session.user.discordId = userRecord.discordId;
                    session.user.coins = userRecord.coins;
                }
            } catch (error) {
                console.error("Error fetching user admin status:", error);
            }

            return {
                ...session,
                user: {
                    ...session.user,
                },
            };
        },
    },
    pages: {
        error: "/",
        signIn: "/",

    },
});
