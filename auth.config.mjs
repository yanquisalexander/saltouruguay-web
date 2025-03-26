import TwitchProvider from "@auth/core/providers/twitch";
import { defineConfig } from "auth-astro";
import { EXTENDED_TWITCH_SCOPES, TWITCH_SCOPES } from "@/lib/Twitch";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { getUserSubscription } from "@/utils/user";
import { eq, or } from "drizzle-orm";

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
        signIn: async ({ account, profile }) => {
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
                    // Buscar usuario existente de manera más eficiente
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
                        // Actualizar usuario existente
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
                        // Crear nuevo usuario
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

                    console.log(userRecord.suspensions)
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
                    };

                }
            } catch (error) {
                console.error("Error fetching user admin status:", error);
            }

            return session;
        },
    },
    pages: {
        error: "/",
        signIn: "/",
    },
});