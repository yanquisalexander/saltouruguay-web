import TwitchProvider from "@auth/core/providers/twitch";
import { defineConfig } from "auth-astro";
import { EXTENDED_TWITCH_SCOPES, TWITCH_SCOPES } from "@/lib/Twitch";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { getUserSubscription } from "@/utils/user";
import { eq, or } from "drizzle-orm";
import { saveSession, updateSessionActivity, destroySession, getSessionById } from "@/utils/user";

export default defineConfig({
    providers: [
        TwitchProvider({
            clientId: import.meta.env.TWITCH_CLIENT_ID,
            clientSecret: import.meta.env.TWITCH_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: TWITCH_SCOPES.join(" "), // Usar scopes extendidos
                    force_verify: true,
                },
            },
        }),
    ],
    callbacks: {
        signIn: async ({ account, profile, credentials }) => {
            if (account?.provider === "twitch" && !profile?.email) {
                throw new Error("Email is required to sign in");
            }
            return true;
        },
        jwt: async ({ token, user, account, profile }) => {

            if (user && account?.provider === "twitch") {
                const email = profile?.email || null;
                const username = user?.name?.toLowerCase();
                const twitchId = profile?.sub ?? "";

                try {
                    const [existingUser] = await client
                        .select()
                        .from(UsersTable)
                        .where(or(
                            eq(UsersTable.twitchId, twitchId),
                            email ? eq(UsersTable.email, email) : undefined
                        ))
                        .limit(1);

                    const twitchTier = await getUserSubscription(twitchId, account.access_token);

                    if (existingUser) {
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
                            .where(eq(UsersTable.id, existingUser.id));

                        token.user = {
                            ...profile,
                            twitchTier,
                            id: existingUser.id
                        };
                    } else {
                        const [newUser] = await client
                            .insert(UsersTable)
                            .values({
                                email,
                                displayName: profile?.preferred_username ?? username,
                                avatar: profile?.picture,
                                username,
                                twitchId,
                                twitchTier,
                            })
                            .returning({ id: UsersTable.id });

                        token.user = {
                            ...profile,
                            twitchTier,
                            id: newUser.id
                        };
                    }



                } catch (error) {
                    console.error("Error managing user:", error);
                    throw error;
                }

                // Generar sessionId y guardar la sesión
                const sessionId = crypto.randomUUID();
                token.sessionId = sessionId;
                await saveSession(token.user.id, sessionId, token.userAgent ?? "Unknown", token.user.ip ?? "Unknown");
            }
            return token;
        },
        session: async ({ session, token }) => {
            try {
                let existingSession = await getSessionById(token.sessionId);

                if (!existingSession) {
                    /* 
                        Assume logged out if session not found (Remotely maybe)
                        This is useful when the session is destroyed on the server
                        but the client is still logged in.
                    */
                    session.user = null;
                    return session;
                }



                if (token.sessionId) {
                    await updateSessionActivity(token.sessionId);
                }

                const userRecord = await client.query.UsersTable.findFirst({
                    where: eq(UsersTable.twitchId, token.user.sub),
                    columns: {
                        id: true,
                        admin: true,
                        twitchId: true,
                        twitchTier: true,
                        discordId: true,
                        coins: true,
                        username: true,
                    },
                    with: {
                        streamerWarsPlayer: {
                            columns: {
                                playerNumber: true,
                            }
                        },
                        suspensions: {
                            columns: {
                                startDate: true,
                                endDate: true,
                                status: true,
                            },
                        }
                    }
                });

                if (userRecord) {
                    const isSuspended = userRecord.suspensions.some(
                        (suspension) =>
                            suspension.status === "active" &&
                            (suspension.endDate === null || new Date(suspension.endDate) > new Date())
                    );
                    session.user = {
                        ...session.user,
                        id: userRecord.id,
                        username: userRecord.username,
                        isAdmin: userRecord.admin,
                        twitchId: userRecord.twitchId,
                        tier: userRecord.twitchTier,
                        discordId: userRecord.discordId,
                        coins: userRecord.coins,
                        streamerWarsPlayerNumber: userRecord.streamerWarsPlayer?.playerNumber,
                        isSuspended,
                        sessionId: token.sessionId,
                    };
                }
            } catch (error) {
                console.error("Error retrieving user data:", error);
                throw error;
            }

            return session;
        },
    },
    pages: {
        error: "/auth/twitch/callback",
        signIn: "/",
    },
    events: {
        signOut: async ({ token }) => {
            if (token.sessionId) {
                try {
                    await destroySession(token.sessionId);
                } catch (error) {
                    console.error("Error destroying session:", error);
                }
            }
        }
    }
});
