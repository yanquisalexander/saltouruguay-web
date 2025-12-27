import TwitchProvider from "@auth/core/providers/twitch";
import { defineConfig } from "auth-astro";
import { eq } from "drizzle-orm";

// Imports internos
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { createTwitchEventsInstance, TWITCH_SCOPES } from "@/lib/Twitch";
import {
    getUserSubscription,
    saveSession,
    updateSessionActivity,
    destroySession,
    getSessionById
} from "@/utils/user";

export default defineConfig({
    providers: [
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
        signIn: async ({ account, profile }) => {
            if (account?.provider === "twitch" && !profile?.email) {
                throw new Error("Email is required to sign in");
            }
            return true;
        },

        jwt: async ({ token, user, account, profile }) => {
            // Lógica de inicio de sesión / creación de usuario
            if (user && account?.provider === "twitch") {
                const email = profile?.email || null;
                const username = user?.name?.toLowerCase();
                const twitchId = profile?.sub ?? "";

                try {
                    // 1. Obtener Tier de suscripción (API externa)
                    const twitchTier = await getUserSubscription(twitchId, account.access_token);

                    const userValues = {
                        twitchId,
                        email, // Solo se usa al insertar uno nuevo
                        username,
                        displayName: profile?.preferred_username ?? username,
                        avatar: profile?.picture,
                        twitchTier,
                        updatedAt: new Date(),
                    };

                    // 2. OPTIMIZACIÓN POSTGRES: Upsert Atómico
                    // Inserta el usuario, o si el twitchId existe, actualiza los datos.
                    const [upsertedUser] = await client
                        .insert(UsersTable)
                        .values(userValues)
                        .onConflictDoUpdate({
                            target: UsersTable.twitchId, // Requiere .unique() en el schema
                            set: {
                                username: userValues.username,
                                displayName: userValues.displayName,
                                avatar: userValues.avatar,
                                twitchTier: userValues.twitchTier,
                                updatedAt: userValues.updatedAt,
                                // No actualizamos email para evitar conflictos de seguridad
                            },
                        })
                        .returning({ id: UsersTable.id });

                    // Actualizar el token con la ID real de base de datos
                    token.user = {
                        ...profile,
                        twitchTier,
                        id: upsertedUser.id
                    };

                    // Generar ID de sesión
                    const sessionId = crypto.randomUUID();
                    token.sessionId = sessionId;

                    // 3. Tareas en segundo plano (No bloqueantes)
                    // Guardamos la sesión y registramos el webhook en paralelo
                    await Promise.allSettled([
                        saveSession(
                            upsertedUser.id,
                            sessionId,
                            token.userAgent ?? "Unknown",
                            token.user.ip ?? "Unknown"
                        ),
                        (async () => {
                            try {
                                const eventSub = createTwitchEventsInstance();
                                await eventSub.registerUserEventSub(twitchId);
                                console.log(`Registered event sub for user ${twitchId}`);
                            } catch (e) {
                                console.error("Error registering event sub:", e);
                            }
                        })()
                    ]);

                } catch (error) {
                    console.error("Error during user login processing:", error);
                    throw error;
                }
            }
            return token;
        },

        session: async ({ session, token }) => {
            try {
                // Si no hay sessionId en el token, retornamos la sesión tal cual (probablemente inválida)
                if (!token.sessionId) return session;

                // 4. Validación rápida de sesión
                const existingSession = await getSessionById(token.sessionId);

                if (!existingSession) {
                    // Si la sesión no está en Redis/DB, forzamos logout en el cliente
                    session.user = null;
                    return session;
                }

                // 5. OPTIMIZACIÓN: Carga de datos + Actualización de actividad en PARALELO
                const [userRecord] = await Promise.all([
                    // A: Buscar datos completos del usuario
                    client.query.UsersTable.findFirst({
                        where: eq(UsersTable.twitchId, token.user.sub),
                        columns: {
                            id: true,
                            admin: true,
                            twitchId: true,
                            twitchTier: true,
                            discordId: true,
                            coins: true,
                            username: true,
                            twoFactorEnabled: true,
                        },
                        with: {
                            streamerWarsPlayer: {
                                columns: { playerNumber: true }
                            },
                            suspensions: {
                                columns: { startDate: true, endDate: true, status: true },
                            }
                        }
                    }),
                    // B: Actualizar "last_active" (sin esperar respuesta)
                    updateSessionActivity(token.sessionId)
                ]);

                if (userRecord) {
                    const now = new Date();
                    const isSuspended = userRecord.suspensions.some(
                        (s) => s.status === "active" && (s.endDate === null || new Date(s.endDate) > now)
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
                        twoFactorEnabled: userRecord.twoFactorEnabled,
                        sessionId: token.sessionId,
                    };
                }
            } catch (error) {
                console.error("Error retrieving session data:", error);
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
                // Destruir sesión sin detener el proceso de logout del cliente
                destroySession(token.sessionId).catch(error =>
                    console.error("Error destroying session:", error)
                );
            }
        }
    }
});