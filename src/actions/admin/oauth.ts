import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { eq } from "drizzle-orm";
import { client } from "@/db/client";
import { SUSOAuthClientsTable } from "@/db/schema";
import {
    createClient,
    updateClient,
    deleteClient,
    listClients,
    getClient,
    getClientTokens,
    regenerateClientSecret,
    revokeToken,
} from "@/lib/oauth";
import { AVAILABLE_SCOPES } from "@/lib/oauth/scopes";

async function requireAdmin(request: Request) {
    const session = await getSession(request);
    if (!session?.user?.isAdmin) {
        throw new ActionError({ code: "UNAUTHORIZED", message: "Not authorized" });
    }
    return session;
}

export const oauth = {
    list: defineAction({
        handler: async (_, { request }) => {
            await requireAdmin(request);
            return listClients();
        },
    }),

    get: defineAction({
        input: z.object({ clientId: z.string() }),
        handler: async ({ clientId }, { request }) => {
            await requireAdmin(request);
            const client = await getClient(clientId);
            if (!client) throw new ActionError({ code: "NOT_FOUND", message: "Client not found" });
            return client;
        },
    }),

    create: defineAction({
        input: z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
            icon: z.string().optional(),
            website: z.string().optional(),
            redirectUris: z.array(z.string()),
            allowedScopes: z.array(z.enum(AVAILABLE_SCOPES as unknown as [string, ...string[]])),
        }),
        handler: async (input, { request }) => {
            const session = await requireAdmin(request);

            const { clientId, clientSecret } = await createClient({
                name: input.name,
                description: input.description,
                icon: input.icon,
                website: input.website,
                redirectUris: input.redirectUris,
                allowedScopes: input.allowedScopes,
                userId: session.user.id,
                status: "approved",
            });

            return { clientId, clientSecret };
        },
    }),

    update: defineAction({
        input: z.object({
            clientId: z.string(),
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(500).nullable().optional(),
            icon: z.string().nullable().optional(),
            website: z.string().nullable().optional(),
            redirectUris: z.array(z.string()).optional(),
            allowedScopes: z.array(z.enum(AVAILABLE_SCOPES as unknown as [string, ...string[]])).optional(),
        }),
        handler: async (input, { request }) => {
            await requireAdmin(request);
            await updateClient(input.clientId, {
                name: input.name,
                description: input.description,
                icon: input.icon,
                website: input.website,
                redirectUris: input.redirectUris,
                allowedScopes: input.allowedScopes,
            });
            return { success: true };
        },
    }),

    delete: defineAction({
        input: z.object({ clientId: z.string() }),
        handler: async ({ clientId }, { request }) => {
            await requireAdmin(request);
            await deleteClient(clientId);
            return { success: true };
        },
    }),

    approve: defineAction({
        input: z.object({ clientId: z.string() }),
        handler: async ({ clientId }, { request }) => {
            await requireAdmin(request);
            await client.update(SUSOAuthClientsTable)
                .set({ status: "approved" })
                .where(eq(SUSOAuthClientsTable.id, clientId));
            return { success: true };
        },
    }),

    deny: defineAction({
        input: z.object({ clientId: z.string() }),
        handler: async ({ clientId }, { request }) => {
            await requireAdmin(request);
            await client.update(SUSOAuthClientsTable)
                .set({ status: "denied" })
                .where(eq(SUSOAuthClientsTable.id, clientId));
            return { success: true };
        },
    }),

    regenerateSecret: defineAction({
        input: z.object({ clientId: z.string() }),
        handler: async ({ clientId }, { request }) => {
            await requireAdmin(request);
            const secret = await regenerateClientSecret(clientId);
            return { clientSecret: secret };
        },
    }),

    getTokens: defineAction({
        input: z.object({ clientId: z.string() }),
        handler: async ({ clientId }, { request }) => {
            await requireAdmin(request);
            return getClientTokens(clientId);
        },
    }),

    revokeToken: defineAction({
        input: z.object({ tokenId: z.string() }),
        handler: async ({ tokenId }, { request }) => {
            await requireAdmin(request);
            await revokeToken(tokenId);
            return { success: true };
        },
    }),
};


