import { AVAILABLE_SCOPES, generateAuthorizationCode, getOauthClient } from "@/lib/saltoplay/oauth";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { getSessionById } from "@/utils/user";
import { verifyTwoFactor, disableTwoFactorAuth, enableTwoFactorAuth, generateRecoveryCodes, generateTotpSecret, generateTotpQrCode, firstVerification, encrypt, decrypt } from "@/lib/auth/two-factor";
import { client } from "@/db/client";
import { eq } from "drizzle-orm";
import { UsersTable } from "@/db/schema";

export const twoFactor = {
    verifyTwoFactor: defineAction({
        input: z.object({
            code: z.string(),
        }),
        handler: async ({ code }, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated",
                })
            }

            const serverSession = await getSessionById(session.user.sessionId!);

            if (!serverSession) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "Session not found",
                });
            }
            const encryptedSecret = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
                columns: {
                    twoFactorEnabled: true,
                    twoFactorSecret: true,
                }
            });
            if (!encryptedSecret) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "Secret not found",
                });
            }
            if (!encryptedSecret.twoFactorEnabled) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "Two-factor authentication is not enabled",
                });
            }


            const isValid = await verifyTwoFactor(
                session.user.id,
                code,
                serverSession.sessionId, // Pasar el sessionId para marcarlo como verificado
            );

            if (!isValid) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "El código de verificación no es válido",
                });
            }

            return { success: true };
        }
    }),

    disableTwoFactor: defineAction({
        input: z.object({
            code: z.string(),
        }),
        handler: async ({ code }, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated",
                })
            }

            const serverSession = await getSessionById(session.user.sessionId!);

            if (!serverSession) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "Session not found",
                });
            }

            const encryptedSecret = await client.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
                columns: {
                    twoFactorEnabled: true,
                    twoFactorSecret: true,
                }
            });
            if (!encryptedSecret) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "Secret not found",
                });
            }



            const isValid = await verifyTwoFactor(
                session.user.id,
                code
            );

            if (!isValid) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "El código de verificación no es válido",
                });
            }

            await disableTwoFactorAuth(session.user.id);

            return { success: true };
        }
    }),

    generateTwoFactor: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated"
                });
            }

            // Generar un nuevo secreto TOTP
            const { secret, encryptedSecret } = generateTotpSecret();

            // Guardar el secreto encriptado en la base de datos

            await client
                .update(UsersTable)
                .set({ twoFactorSecret: encryptedSecret })
                .where(eq(UsersTable.id, session.user.id));
            // Guardar el secreto encriptado en la sesión


            // Generar el código QR para el secreto
            const qrCode = await generateTotpQrCode(
                session.user.username,
                encryptedSecret  // Usar el secreto encriptado para generar el QR
            );

            return {
                secret,  // Retornar el secreto original base32
                qrCode,
                encryptedSecret
            };
        }
    }),

    enableTwoFactor: defineAction({
        input: z.object({
            code: z.string(),
            secret: z.string(),  // Ahora el secreto base32 original
        }),
        handler: async ({ code, secret }, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated",
                })
            }

            const serverSession = await getSessionById(session.user.sessionId!);

            if (!serverSession) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "Session not found",
                });
            }

            // Encriptar el secreto base32 para guardarlo
            const encryptedSecret = encrypt(secret);

            const isValid = await firstVerification(
                session.user.id,
                code,
                encryptedSecret  // Usar el secreto encriptado
            );

            if (!isValid) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "El código de verificación no es válido",
                });
            }

            const recoveryCodes = generateRecoveryCodes();

            await enableTwoFactorAuth(session.user.id, encryptedSecret, recoveryCodes);

            return { success: true };
        }
    })
}

