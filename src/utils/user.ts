import { SALTO_BROADCASTER_ID } from "@/config";
import { client } from "@/db/client";
import { MemberCard } from "@/db/entities/MemberCard";
import { Session } from "@/db/entities/Session";
import { UserAchievement } from "@/db/entities/UserAchievement";
import { User } from "@/db/entities/User";
import { UserSuspension } from "@/db/entities/UserSuspension";
import { MemberCardSkins } from "@/consts/MemberCardSkins";
import { createUserApiClient, createStaticAuthProvider } from "@/lib/Twitch";
import { ILike, LessThan, MoreThan } from "typeorm";
import { unlockAchievement } from "./achievements";
import { ACHIEVEMENTS } from "@/consts/Achievements";
import { experimental_AstroContainer } from "astro/container";
import NewLoginDetected from "@/email/NewLoginDetected.astro";
import { sendNotificationEmail } from "./email";
import TwitchAuthorizationRevoked from "@/email/TwitchAuthorizationRevoked.astro";
import { getIpInfo } from "./ipAddress";


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
        const memberCardRepo = client.getRepository(MemberCard);
        await memberCardRepo.save({
            userId: memberId.toString(),
            stickers,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error("Error updating stickers:", error);
    }
};

/**
 * Obtiene la información de una MemberCard específica.
 */
export const getMemberCardData = async (memberId: number) => {
    return await client.getRepository(MemberCard).findOne({
        where: { userId: memberId.toString() },
    });
};

/**
 * Obtiene el total de MemberCards registradas.
 */
export const getTotalOfMemberCards = async () => {
    return await client.getRepository(MemberCard).count();
};

/**
 * Actualiza la skin de una MemberCard.
 */
export const updateCardSkin = async (memberId: number, skin: typeof MemberCardSkins[number]['id']) => {
    await ensureMemberCardExists(memberId);

    try {
        const memberCardRepo = client.getRepository(MemberCard);
        await memberCardRepo.save({
            userId: memberId.toString(),
            skin,
            stickers: [],
            updatedAt: new Date()
        });
    } catch (error) {
        console.error("Error updating card skin:", error);
    }
};

/**
 * Asegura que exista un registro para la MemberCard del usuario y desbloquea un logro si es necesario.
 */
const ensureMemberCardExists = async (memberId: number) => {
    const existingCard = await client.getRepository(MemberCard).findOne({
        where: { userId: memberId.toString() },
    });

    if (!existingCard) {
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
    return await client.getRepository(UserAchievement).find({
        where: { userId },
    });
}

export const updateUserTier = async (twitchUserId: string, tier: 1 | 2 | 3 | null) => {
    const userRepo = client.getRepository(User);
    const user = await userRepo.findOne({
        where: { twitchId: twitchUserId },
    });

    if (!user) return;

    await userRepo.update({ twitchId: twitchUserId }, { twitchTier: tier });
}

export const getDebateMessages = async () => {
    const { DebateAnonymousMessage } = await import("@/db/entities/DebateAnonymousMessage");
    return await client.getRepository(DebateAnonymousMessage).find({
        relations: ["user"],
        select: {
            user: {
                displayName: true,
                avatar: true,
            }
        }
    });
}


export const getUsers = async ({ page = 1, search = "", limit = 15 }) => {
    const userRepo = client.getRepository(User);
    const queryBuilder = userRepo.createQueryBuilder("user");

    // Initialize base conditions
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
        queryBuilder.where(
            "(user.username ILIKE :search OR user.email ILIKE :search OR user.displayName ILIKE :search)",
            { search: `%${filterSearch}%` }
        );
    }

    // Apply filters based on detected filter expressions
    if (filters.admin) {
        queryBuilder.andWhere("user.admin = :admin", { admin: true });
    }

    // Apply pagination and ordering
    const users = await queryBuilder
        .orderBy("user.createdAt", "DESC")
        .skip((page - 1) * limit)
        .take(limit + 1)
        .getMany();

    const hasMore = users.length > limit;
    return { users: users.slice(0, limit), hasMore };
};

export const unlinkDiscord = async (userId: number) => {
    await client.getRepository(User).update(userId, { discordId: null });
}

export const getAllUserEmails = async () => {
    /* 
        Get all emails from the UsersTable (To send emails to all users)
    */
    const users = await client.getRepository(User).find({ select: ["email"] });
    return users.map(user => user.email);
}

export const getUserSuspension = async (userId: number) => {
    const suspension = await client.getRepository(UserSuspension).findOne({
        where: { userId },
        relations: ["user"],
        select: {
            user: {
                displayName: true,
                avatar: true,
            }
        }
    });

    return suspension;
}

export const getUserSuspensions = async (userId: number) => {
    const suspensions = await client.getRepository(UserSuspension).find({
        where: { userId },
        relations: ["user"],
        select: {
            user: {
                displayName: true,
                avatar: true,
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
        const sessionRepo = client.getRepository(Session);
        const newSession = sessionRepo.create({
            userId,
            sessionId,
            userAgent,
            ip,
            lastActivity: new Date(),
        });
        
        await sessionRepo.save(newSession);

        return newSession;
    } catch (error) {
        console.error("Error saving session:", error);
        throw error;
    }
};

export const updateSession = async (sessionId: string, updates: Partial<Session>) => {
    try {
        const sessionRepo = client.getRepository(Session);
        await sessionRepo.update({ sessionId }, updates);
        
        return await sessionRepo.findOne({ where: { sessionId } });
    } catch (error) {
        console.error("Error updating session:", error);
        throw error;
    }
};

export const sendNewLoginDetectedEmail = async (sessionId: string, request: Request) => {
    // Originalmente, las sesiones no tienen
    // datos como IP, ya que no tenemos
    // acceso a la request durante el jwt en
    // auth-astro
    // Por lo que en el callback, llamamos a
    // este método para actualizar la sesión, y enviar
    // el email

    const session = await getSessionById(sessionId);
    if (!session) return;

    const user = session.user;
    if (!user) return;

    const IP_HEADERS = [
        "x-vercel-forwarded-for",
        "x-forwarded-for",
        "x-real-ip",
        "cf-connecting-ip",
        "true-client-ip",
        "x-cluster-client-ip",
        "forwarded",
    ];

    const clientIp = IP_HEADERS.map(header => request.headers.get(header)).find(ip => ip !== undefined) ?? "unknown";
    const userAgent = request.headers.get("user-agent")!;
    // Actualiza la sesión con la nueva información
    await updateSession(sessionId, { ip: clientIp!, userAgent });

    const ipInfo = await getIpInfo(clientIp!);
    const container = await experimental_AstroContainer.create();
    const emailBody = await container.renderToString(NewLoginDetected, {
        props: {
            date: new Date(),
            location: `${ipInfo?.cityName}, ${ipInfo?.regionName}, ${ipInfo?.countryName}`,
            device: userAgent,
            browser: userAgent,
        }
    });


    const emailSubject = "Nuevo inicio de sesión detectado";

    if (user.email && import.meta.env.PROD) {
        await sendNotificationEmail(
            user.email,
            emailSubject,
            emailBody,
        );
    }
}

export const destroySession = async (sessionId: string) => {
    try {
        const sessionRepo = client.getRepository(Session);
        const session = await sessionRepo.findOne({ where: { sessionId } });
        if (session) {
            await sessionRepo.remove(session);
            return session.sessionId;
        }
        return undefined;
    } catch (error) {
        console.error("Error destroying session:", error);
        throw error;
    }
};

export const getSessionById = async (sessionId: string) => {
    try {
        const sessionRepo = client.getRepository(Session);
        const session = await sessionRepo.findOne({
            where: { sessionId },
            relations: ["user"],
            select: {
                user: {
                    id: true,
                    username: true,
                    email: true,
                    displayName: true,
                    avatar: true,
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
        const sessionRepo = client.getRepository(Session);
        await sessionRepo.update(
            { sessionId },
            {
                lastActivity: new Date(),
                updatedAt: new Date()
            }
        );

        return await sessionRepo.findOne({ where: { sessionId } });
    } catch (error) {
        console.error("Error updating session activity:", error);
        throw error;
    }
};

export const destroyAllSessions = async (userId: number) => {
    try {
        const sessionRepo = client.getRepository(Session);
        const sessions = await sessionRepo.find({ where: { userId } });
        await sessionRepo.remove(sessions);

        return sessions;
    } catch (error) {
        console.error("Error destroying all sessions:", error);
        throw error;
    }
}
export const handleTwitchRevoke = async (twitchId: string) => {
    const userRepo = client.getRepository(User);
    const user = await userRepo.findOne({
        where: { twitchId },
    });

    if (!user) return;

    /* 
     Revoke all sessions for this user
    */

    const sessionRepo = client.getRepository(Session);
    await sessionRepo.delete({ userId: user.id });


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
    return await client.getRepository(User).count();
}

export const getNewSignupsLastWeek = async () => {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    return await client.getRepository(User).count({
        where: {
            createdAt: MoreThan(lastWeek) as any,
        }
    });
}