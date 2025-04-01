import { SALTO_BROADCASTER_ID } from "@/config";
import { client } from "@/db/client";
import { MemberCards, SessionsTable, UserAchievementsTable, UsersTable, UserSuspensionsTable } from "@/db/schema";
import { MemberCardSkins } from "@/consts/MemberCardSkins";
import { createUserApiClient, createStaticAuthProvider } from "@/lib/Twitch";
import { and, count, eq, gt, ilike, lt, or, desc } from "drizzle-orm";
import { unlockAchievement } from "./achievements";
import { ACHIEVEMENTS } from "@/consts/Achievements";
import { experimental_AstroContainer } from "astro/container";
import NewLoginDetected from "@/email/NewLoginDetected.astro";
import { sendNotificationEmail } from "./email";
import TwitchAuthorizationRevoked from "@/email/TwitchAuthorizationRevoked.astro";

/**
 * Obtiene la suscripción de un usuario en Twitch.
 */
export const getUserSubscription = async (twitchUserId: string, token: string) => {
    try {
        const apiClient = createUserApiClient(createStaticAuthProvider(token));
        const subscription = await apiClient.subscriptions.checkUserSubscription(
            twitchUserId,
            SALTO_BROADCASTER_ID
        );

        return subscription?.tier ? parseInt(subscription.tier.charAt(0)) as 1 | 2 | 3 : null;
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return null;
    }
};

/**
 * Actualiza las stickers de una MemberCard.
 */
export const updateStickers = async (memberId: number, stickers: string[]) => {
    await ensureMemberCardExists(memberId);

    try {
        await client
            .insert(MemberCards)
            .values({ userId: memberId.toString(), stickers })
            .onConflictDoUpdate({
                target: [MemberCards.userId],
                set: { stickers, updatedAt: new Date() },
            });
    } catch (error) {
        console.error("Error updating stickers:", error);
    }
};

/**
 * Obtiene la información de una MemberCard específica.
 */
export const getMemberCardData = async (memberId: number) => {
    return await client.query.MemberCards.findFirst({
        where: eq(MemberCards.userId, memberId.toString()),
    });
};

/**
 * Obtiene el total de MemberCards registradas.
 */
export const getTotalOfMemberCards = async () => {
    const result = await client.select({ value: count() }).from(MemberCards).execute();
    return result[0]?.value || 0;
};

/**
 * Actualiza la skin de una MemberCard.
 */
export const updateCardSkin = async (memberId: number, skin: typeof MemberCardSkins[number]['id']) => {
    await ensureMemberCardExists(memberId);

    try {
        await client
            .insert(MemberCards)
            .values({ userId: memberId.toString(), skin, stickers: [] })
            .onConflictDoUpdate({
                target: [MemberCards.userId],
                set: { skin, updatedAt: new Date() },
            });
    } catch (error) {
        console.error("Error updating card skin:", error);
    }
};

/**
 * Asegura que exista un registro para la MemberCard del usuario y desbloquea un logro si es necesario.
 */
const ensureMemberCardExists = async (memberId: number) => {
    const existingCard = await client
        .select()
        .from(MemberCards)
        .where(eq(MemberCards.userId, memberId.toString()))
        .execute();

    if (!existingCard.length) {
        try {
            await unlockAchievement({
                userId: memberId,
                achievementId: ACHIEVEMENTS.CREATED_MEMBER_CARD,
            });
        } catch (error) {
            console.error(
                "Error unlocking achievement: Maybe it was already unlocked?",
                error
            );
        }
    }
};

export const getUserAchievements = async (userId: number) => {
    return await client.query.UserAchievementsTable.findMany({
        where: eq(UserAchievementsTable.userId, userId),
    });
}

export const updateUserTier = async (twitchUserId: string, tier: 1 | 2 | 3 | null) => {
    const user = await client.query.UsersTable.findFirst({
        where: eq(UsersTable.twitchId, twitchUserId),
    });

    if (!user) return;

    await client
        .update(UsersTable)
        .set({ twitchTier: tier })
        .where(eq(UsersTable.twitchId, twitchUserId))
        .execute();

}

export const getDebateMessages = async () => {
    return await client.query.DebateAnonymousMessagesTable.findMany({
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                }
            }
        }
    })
}


export const getUsers = async ({ page = 1, search = "", limit = 15 }) => {
    let query = client.select().from(UsersTable);

    // Initialize base conditions
    let conditions = [];
    let filterSearch = search;

    // Parse out filter expressions
    const filterRegex = /filter:(\w+)/g;
    let match;
    const filters: Record<string, boolean> = {};

    // Extract all filters from the search string
    while ((match = filterRegex.exec(search)) !== null) {
        const filterName = match[1];
        filters[filterName] = true;

        // Remove the filter expression from the search string
        filterSearch = filterSearch.replace(match[0], "").trim();
    }

    // Apply text search if there's any text left after removing filters
    if (filterSearch) {
        conditions.push(
            or(
                ilike(UsersTable.username, `%${filterSearch}%`),
                ilike(UsersTable.email, `%${filterSearch}%`),
                ilike(UsersTable.displayName, `%${filterSearch}%`)
            )
        );
    }

    // Apply filters based on detected filter expressions
    if (filters.admin) {
        conditions.push(eq(UsersTable.admin, true));
    }



    // Apply all conditions to the query
    if (conditions.length > 0) {
        // @ts-ignore
        query = query.where(
            conditions.length > 1
                ? and(...(conditions as Parameters<typeof and>))
                : (conditions[0] as Parameters<typeof query.where>[0])
        );
    }

    // Apply pagination and ordering
    const users = await query
        .orderBy(desc(UsersTable.createdAt))
        .limit(limit + 1)
        .offset((page - 1) * limit);

    const hasMore = users.length > limit;
    return { users: users.slice(0, limit), hasMore };
};

export const unlinkDiscord = async (userId: number) => {
    await client
        .update(UsersTable)
        .set({ discordId: null })
        .where(eq(UsersTable.id, userId))
        .execute();
}

export const getAllUserEmails = async () => {
    /* 
        Get all emails from the UsersTable (To send emails to all users)
    */
    const result = await client.select({ value: UsersTable.email }).from(UsersTable).execute();
    return result.map(row => row.value);
}

export const getUserSuspension = async (userId: number) => {
    const suspension = await client.query.UserSuspensionsTable.findFirst({
        where: eq(UserSuspensionsTable.userId, userId),
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                }
            }
        }
    });

    return suspension;
}

export const getUserSuspensions = async (userId: number) => {
    const suspensions = await client.query.UserSuspensionsTable.findMany({
        where: eq(UserSuspensionsTable.userId, userId),
        with: {
            user: {
                columns: {
                    displayName: true,
                    avatar: true,
                }
            }
        }
    });

    return suspensions;
}


export const saveSession = async (
    userId: number,
    sessionId: string,
    userAgent: string,
    ip: string
) => {
    try {
        console.log("Saving session for user:", userId, "Session ID:", sessionId);
        const [newSession] = await client
            .insert(SessionsTable)
            .values({
                userId,
                sessionId,
                userAgent,
                ip,
                lastActivity: new Date(),
            })
            .returning();

        try {
            const container = await experimental_AstroContainer.create()
            const emailBody = await container.renderToString(NewLoginDetected, {
                props: {
                    date: new Date(),

                }
            });

            const emailSubject = "Nuevo inicio de sesión detectado";
            const user = await client
                .query.UsersTable.findFirst({
                    where: eq(UsersTable.id, userId),
                    columns: {
                        email: true,
                    }
                });

            const email = user?.email;

            if (email && import.meta.env.PROD) {
                await sendNotificationEmail(
                    email,
                    emailSubject,
                    emailBody,
                )
            }

        } catch (error) {
            console.error("Error sending email:", error);
        }

        return newSession;
    } catch (error) {
        console.error("Error saving session:", error);
        throw error;
    }
};

export const destroySession = async (sessionId: string) => {
    try {
        const deletedSession = await client
            .delete(SessionsTable)
            .where(eq(SessionsTable.sessionId, sessionId))
            .returning({ deletedSessionId: SessionsTable.sessionId });

        return deletedSession[0]?.deletedSessionId;
    } catch (error) {
        console.error("Error destroying session:", error);
        throw error;
    }
};

export const getSessionById = async (sessionId: string) => {
    try {
        const session = await client.query.SessionsTable.findFirst({
            where: eq(SessionsTable.sessionId, sessionId),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                        email: true,
                    }
                }
            }
        });

        return session;
    } catch (error) {
        console.error("Error fetching session:", error);
        throw error;
    }
};

export const updateSessionActivity = async (sessionId: string) => {
    try {
        const updatedSession = await client
            .update(SessionsTable)
            .set({
                lastActivity: new Date(),
                updatedAt: new Date()
            })
            .where(eq(SessionsTable.sessionId, sessionId))
            .returning();

        return updatedSession[0];
    } catch (error) {
        console.error("Error updating session activity:", error);
        throw error;
    }
};

export const destroyAllSessions = async (userId: number) => {
    try {
        const deletedSessions = await client
            .delete(SessionsTable)
            .where(eq(SessionsTable.userId, userId))
            .returning({ deletedSessionId: SessionsTable.sessionId });

        return deletedSessions;
    } catch (error) {
        console.error("Error destroying all sessions:", error);
        throw error;
    }
}
export const handleTwitchRevoke = async (twitchId: string) => {
    const user = await client.query.UsersTable.findFirst({
        where: eq(UsersTable.twitchId, twitchId),
    });

    if (!user) return;

    /* 
     Revoke all sessions for this user
    */

    await client
        .delete(SessionsTable)
        .where(eq(SessionsTable.userId, user.id))
        .execute();


    // Send an email to the user informing them that their Twitch account has been revoked

    const container = await experimental_AstroContainer.create()
    const emailBody = await container.renderToString(TwitchAuthorizationRevoked, {
        props: {
            displayName: user.displayName || user.username,
        }
    });

    const emailSubject = `Tu cuenta de Twitch "${user.displayName || user.username}" ha sido desvinculada`;
    const email = user.email;

    if (email) {
        await sendNotificationEmail(
            email,
            emailSubject,
            emailBody,
        )
    }

}

export const getTotalOfUsers = async () => {
    const result = await client.select({ value: count() }).from(UsersTable).execute();
    return result[0]?.value || 0;
}

export const getNewSignupsLastWeek = async () => {
    const result = await client
        .select({ value: count() })
        .from(UsersTable)
        .where(
            and(
                gt(UsersTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
                lt(UsersTable.createdAt, new Date())
            )
        )
        .execute();

    return result[0]?.value || 0;
}