import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import {
    getApprovedClient,
    getClientRedirectUris,
    validateRedirectUri,
    validateScopes,
    generateAuthCode,
} from "@/lib/oauth";

export const oauth = {
    authorize: defineAction({
        input: z.object({
            clientId: z.string(),
            redirectUri: z.string(),
            scopes: z.array(z.string()),
            state: z.string().optional(),
            codeChallenge: z.string().optional(),
            codeChallengeMethod: z.string().optional(),
        }),
        handler: async (input, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Not authenticated" });
            }

            const client = await getApprovedClient(input.clientId);
            if (!client) {
                throw new ActionError({ code: "NOT_FOUND", message: "OAuth client not found or not approved" });
            }

            const redirectUris = await getClientRedirectUris(client.id);
            if (!validateRedirectUri(input.redirectUri, redirectUris)) {
                throw new ActionError({ code: "UNPROCESSABLE_CONTENT", message: "Invalid redirect URI" });
            }

            validateScopes(input.scopes);

            if (input.codeChallenge && input.codeChallengeMethod !== "S256") {
                throw new ActionError({
                    code: "UNPROCESSABLE_CONTENT",
                    message: "Only S256 code_challenge_method is supported",
                });
            }

            const code = await generateAuthCode({
                clientId: client.id,
                userId: session.user.id,
                scopes: input.scopes,
                redirectUri: input.redirectUri,
                codeChallenge: input.codeChallenge,
                codeChallengeMethod: input.codeChallengeMethod,
            });

            const redirectUrl = new URL(input.redirectUri);
            redirectUrl.searchParams.set("code", code);
            if (input.state) {
                redirectUrl.searchParams.set("state", input.state);
            }

            return { redirectUri: redirectUrl.toString() };
        },
    }),
};
