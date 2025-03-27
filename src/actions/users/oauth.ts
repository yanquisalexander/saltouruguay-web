import { AVAILABLE_SCOPES, generateAuthorizationCode, getOauthClient } from "@/lib/saltoplay/oauth";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const oauth = {
    authorize: defineAction({
        input: z.object({
            clientId: z.string(),
            redirectUri: z.string(),
            scopes: z.array(z.string()),


        }),
        handler: async ({
            clientId,
            redirectUri,
            scopes
        }, { request }) => {

            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated",
                })
            }
            // Validate clientId and redirectUri

            const client = await getOauthClient(clientId);
            if (!client) {
                throw new ActionError({
                    code: "NOT_FOUND",
                    message: "El cliente no existe",
                });
            }

            if (client.redirectUri !== redirectUri) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "Invalid redirect URI",
                });
            }

            // Validate scopes

            const invalidScopes = scopes.filter(scope => !AVAILABLE_SCOPES.includes(scope));

            if (invalidScopes.length > 0) {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: `Invalid scopes: ${invalidScopes.join(', ')}`,
                });
            }

            // Generate authorization code
            const code = await generateAuthorizationCode(
                clientId,
                session.user.id,
                scopes,
                redirectUri
            );

            const finalRedirectUri = new URL(redirectUri);
            finalRedirectUri.searchParams.set("code", code);

            return {
                success: true,
                redirectUri: finalRedirectUri.toString(),
            }
        }
    }),
}
