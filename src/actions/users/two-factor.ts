import { AVAILABLE_SCOPES, generateAuthorizationCode, getOauthClient } from "@/lib/saltoplay/oauth";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { getSessionById } from "@/utils/user";
import { verifyTwoFactor, disableTwoFactorAuth, enableTwoFactorAuth, generateRecoveryCodes, generateTotpSecret, generateTotpQrCode, firstVerification, encrypt } from "@/lib/auth/two-factor";

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

            const isValid = await verifyTwoFactor(
                session.user.id,
                code,
                serverSession.sessionId
            );

            if (!isValid) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "Invalid verification code",
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

            const isValid = await verifyTwoFactor(
                session.user.id,
                code,
            );

            if (!isValid) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "Invalid verification code",
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

            // Generate a new TOTP secret
            const { secret, encryptedSecret } = generateTotpSecret();

            // Generate QR code for the secret
            const qrCode = await generateTotpQrCode(
                session.user.username,
                encryptedSecret  // Use the encrypted secret here
            );

            return {
                secret,  // Return the original base32 secret
                qrCode,
                encryptedSecret
            };
        }
    }),
    enableTwoFactor: defineAction({
        input: z.object({
            code: z.string(),
            secret: z.string(),  // This will now be the original base32 secret
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

            // Encrypt the original base32 secret
            const encryptedSecret = encrypt(secret);

            const isValid = await firstVerification(
                session.user.id,
                code,
                encryptedSecret  // Pass the encrypted secret
            );

            if (!isValid) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "Invalid verification code",
                });
            }

            const recoveryCodes = generateRecoveryCodes();

            await enableTwoFactorAuth(session.user.id, encryptedSecret, recoveryCodes);

            return { success: true };
        }
    })
}


