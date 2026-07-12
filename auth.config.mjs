import TwitchProvider from "@auth/core/providers/twitch";
import { defineConfig } from "auth-astro";
import { eq } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";

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
import { getLinkedAccountsSummary } from "@/lib/linked-accounts";

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
    cookies: {
        sessionToken: {
            options: {
                httpOnly: true,
                sameSite: import.meta.env.PROD ? "none" : "lax",
                path: "/",
                secure: import.meta.env.PROD,
            },
        },
    },
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
                // Capturamos el IP antes de reasignar token.user, ya que
                // token.user.ip no existía aún en el punto donde se usaba antes.
                const userIp = token.ip ?? "Unknown";

                try {
                    // 1. Obtener Tier de suscripción (API externa), con timeout
                    // para no dejar el login colgado si Twitch tarda.
                    const twitchTier = await getUserSubscription(
                        twitchId,
                        account.access_token,
                        { signal: AbortSignal.timeout(5000) }
                    );

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

                    // Cacheamos datos livianos en el propio JWT para evitar
                    // golpear la DB en cada callback de session.
                    token.lastSync = Date.now();

                    // Generar ID de sesión
                    const sessionId = crypto.randomUUID();
                    token.sessionId = sessionId;

                    // 3. Guardado de sesión: esto sí debe completarse antes de
                    // responder (si falla, el usuario podría quedar sin sesión válida).
                    await saveSession(
                        upsertedUser.id,
                        sessionId,
                        token.userAgent ?? "Unknown",
                        userIp
                    );

                    // 4. Tarea en segundo plano: registrar el EventSub no debe
                    // bloquear la respuesta del login. waitUntil asegura que
                    // Vercel mantenga viva la función hasta que termine.
                    waitUntil(
                        (async () => {
                            try {
                                const eventSub = createTwitchEventsInstance();
                                await eventSub.registerUserEventSub(twitchId);
                                console.log(`Registered event sub for user ${twitchId}`);
                            } catch (e) {
                                console.error("Error registering event sub:", e);
                            }
                        })()
                    );

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

                // Validación rápida de sesión
                const existingSession = await getSessionById(token.sessionId);

                if (!existingSession) {
                    // Si la sesión no está en Redis/DB, forzamos logout en el cliente
                    session.user = null;
                    return session;
                }

                // Actualizar "last_active" en segundo plano: no es crítico
                // para construir la sesión y no debe bloquear la respuesta.
                waitUntil(updateSessionActivity(token.sessionId));

                // Carga de datos completos del usuario, incluyendo cuentas
                // vinculadas en la misma consulta (evita un round-trip extra).
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
                });

                if (userRecord) {
                    const now = new Date();
                    const isSuspended = userRecord.suspensions.some(
                        (s) => s.status === "active" && (s.endDate === null || new Date(s.endDate) > now)
                    );

                    const linkedAccountsSummary = await getLinkedAccountsSummary(userRecord.id);

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
                        linkedAccounts: linkedAccountsSummary,
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
                // Destruir sesión en segundo plano sin bloquear el logout del cliente
                waitUntil(
                    destroySession(token.sessionId).catch(error =>
                        console.error("Error destroying session:", error)
                    )
                );
            }
        }
    }
});