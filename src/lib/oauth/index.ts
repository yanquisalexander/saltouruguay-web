import { randomUUID, createHash } from "crypto";
import { and, eq, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { client as db } from "@/db/client";
import {
    SUSOAuthClientsTable,
    SUSOAuthClientRedirectUrisTable,
    SUSOAuthAuthorizationCodesTable,
    SUSOAuthTokensTable,
} from "@/db/schema";
import { signHs256Jwt, verifyHs256Jwt } from "@/lib/jwt";
import { AVAILABLE_SCOPES } from "./scopes";

const AUTH_CODE_EXPIRY = Number(import.meta.env.SUS_OAUTH_AUTH_CODE_EXPIRY ?? 600);
const ACCESS_TOKEN_EXPIRY = Number(import.meta.env.SUS_OAUTH_ACCESS_TOKEN_EXPIRY ?? 3600);
const REFRESH_TOKEN_EXPIRY = Number(import.meta.env.SUS_OAUTH_REFRESH_TOKEN_EXPIRY ?? 2592000);
const SERVICE_TOKEN_EXPIRY = Number(import.meta.env.SUS_OAUTH_SERVICE_TOKEN_EXPIRY ?? 3600);

function getSigningSecret(): string {
    return import.meta.env.AUTH_SECRET as string;
}

// ── Client ──

export async function getClient(clientId: string) {
    return db.query.SUSOAuthClientsTable.findFirst({
        where: eq(SUSOAuthClientsTable.id, clientId),
        with: {
            redirectUris: true,
            owner: {
                columns: { id: true, email: true, displayName: true },
            },
        },
    });
}

export async function getApprovedClient(clientId: string) {
    const client = await getClient(clientId);
    if (!client || client.status !== "approved") return null;
    return client;
}

// ── Redirect URIs ──

export async function getClientRedirectUris(clientId: string): Promise<string[]> {
    const uris = await db.query.SUSOAuthClientRedirectUrisTable.findMany({
        where: eq(SUSOAuthClientRedirectUrisTable.clientId, clientId),
        columns: { redirectUri: true },
    });
    return uris.map(u => u.redirectUri);
}

export function validateRedirectUri(redirectUri: string, allowedUris: string[]): boolean {
    return allowedUris.some(uri => {
        if (uri === redirectUri) return true;
        if (uri.includes("*")) {
            const pattern = uri.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
            return new RegExp(`^${pattern}$`).test(redirectUri);
        }
        return false;
    });
}

// ── Scopes ──

export function validateScopes(scopes: string[]): string[] {
    const invalid = scopes.filter(s => !(AVAILABLE_SCOPES as readonly string[]).includes(s));
    if (invalid.length > 0) {
        throw new Error(`Invalid scopes: ${invalid.join(", ")}`);
    }
    return scopes;
}

// ── Authorization Code ──

export async function generateAuthCode(params: {
    clientId: string;
    userId: number;
    scopes: string[];
    redirectUri: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
}): Promise<string> {
    const code = randomUUID();
    await db.insert(SUSOAuthAuthorizationCodesTable).values({
        clientId: params.clientId,
        userId: params.userId,
        code,
        scopes: params.scopes,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge ?? null,
        codeChallengeMethod: params.codeChallengeMethod ?? null,
        expiresAt: DateTime.now().plus({ seconds: AUTH_CODE_EXPIRY }).toJSDate(),
    });
    return code;
}

export async function consumeAuthCode(params: {
    code: string;
    clientId: string;
    redirectUri: string;
    codeVerifier?: string;
}): Promise<{ userId: number; scopes: string[] }> {
    const authCode = await db.query.SUSOAuthAuthorizationCodesTable.findFirst({
        where: and(
            eq(SUSOAuthAuthorizationCodesTable.code, params.code),
            eq(SUSOAuthAuthorizationCodesTable.clientId, params.clientId),
            eq(SUSOAuthAuthorizationCodesTable.redirectUri, params.redirectUri),
        ),
    });

    if (!authCode) throw new Error("Invalid authorization code");
    if (DateTime.fromJSDate(authCode.expiresAt) < DateTime.now()) {
        throw new Error("Authorization code expired");
    }

    // PKCE verification
    if (authCode.codeChallenge) {
        if (!params.codeVerifier) {
            throw new Error("PKCE code_verifier required");
        }
        if (authCode.codeChallengeMethod === "S256") {
            const hash = createHash("sha256").update(params.codeVerifier).digest();
            const expectedChallenge = hash
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");
            if (expectedChallenge !== authCode.codeChallenge) {
                throw new Error("PKCE verification failed");
            }
        } else {
            throw new Error("Unsupported code_challenge_method");
        }
    }

    // Delete the code (one-time use)
    await db.delete(SUSOAuthAuthorizationCodesTable)
        .where(eq(SUSOAuthAuthorizationCodesTable.code, params.code));

    return { userId: authCode.userId, scopes: authCode.scopes };
}

// ── Tokens ──

export async function generateTokens(params: {
    clientId: string;
    userId: number;
    scopes: string[];
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const secret = getSigningSecret();
    const tokenId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await signHs256Jwt(
        {
            sub: params.userId.toString(),
            client_id: params.clientId,
            scopes: params.scopes,
            type: "access",
            token_id: tokenId,
            jti: tokenId,
            iat: now,
        },
        secret,
        ACCESS_TOKEN_EXPIRY,
    );

    const refreshToken = await signHs256Jwt(
        {
            sub: params.userId.toString(),
            client_id: params.clientId,
            type: "refresh",
            token_id: tokenId,
            jti: tokenId,
            iat: now,
        },
        secret,
        REFRESH_TOKEN_EXPIRY,
    );

    await db.insert(SUSOAuthTokensTable).values({
        clientId: params.clientId,
        userId: params.userId,
        accessToken,
        refreshToken,
        scopes: params.scopes,
        accessTokenExpiresAt: DateTime.now().plus({ seconds: ACCESS_TOKEN_EXPIRY }).toJSDate(),
        refreshTokenExpiresAt: DateTime.now().plus({ seconds: REFRESH_TOKEN_EXPIRY }).toJSDate(),
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_EXPIRY };
}

export async function refreshTokens(
    refreshTokenValue: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const secret = getSigningSecret();
    let payload: { sub: string; client_id: string; type: string; token_id: string };
    try {
        payload = await verifyHs256Jwt<{
            sub: string;
            client_id: string;
            type: string;
            token_id: string;
        }>(refreshTokenValue, secret);
    } catch {
        throw new Error("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
        throw new Error("Invalid token type");
    }

    const tokenRecord = await db.query.SUSOAuthTokensTable.findFirst({
        where: and(
            eq(SUSOAuthTokensTable.refreshToken, refreshTokenValue),
            eq(SUSOAuthTokensTable.revoked, false),
        ),
    });

    if (!tokenRecord) {
        throw new Error("Refresh token not found or revoked");
    }

    // Verify the client still allows all these scopes
    const client = await getClient(payload.client_id);
    if (client) {
        const invalidScopes = tokenRecord.scopes.filter(s => !client.allowedScopes.includes(s));
        if (invalidScopes.length > 0) {
            throw new Error(`Scopes no longer allowed: ${invalidScopes.join(", ")}`);
        }
    }

    // Revoke old tokens for this client+user
    await db.update(SUSOAuthTokensTable)
        .set({ revoked: true })
        .where(
            and(
                eq(SUSOAuthTokensTable.clientId, payload.client_id),
                eq(SUSOAuthTokensTable.userId, parseInt(payload.sub)),
                eq(SUSOAuthTokensTable.revoked, false),
            ),
        );

    return generateTokens({
        clientId: payload.client_id,
        userId: parseInt(payload.sub),
        scopes: tokenRecord.scopes,
    });
}

export async function generateServiceToken(params: {
    clientId: string;
    scopes: string[];
}): Promise<{ accessToken: string; expiresIn: number }> {
    const secret = getSigningSecret();
    const tokenId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await signHs256Jwt(
        {
            sub: params.clientId,
            client_id: params.clientId,
            scopes: params.scopes,
            type: "service",
            token_id: tokenId,
            jti: tokenId,
            iat: now,
        },
        secret,
        SERVICE_TOKEN_EXPIRY,
    );

    return { accessToken, expiresIn: SERVICE_TOKEN_EXPIRY };
}

export async function validateAccessToken(
    accessTokenValue: string,
): Promise<{ userId: number; scopes: string[]; clientId: string; tokenId: string; type: "user" | "service" }> {
    const secret = getSigningSecret();
    let payload: {
        sub: string;
        client_id: string;
        scopes: string[];
        type: string;
        token_id: string;
    };
    try {
        payload = await verifyHs256Jwt<{
            sub: string;
            client_id: string;
            scopes: string[];
            type: string;
            token_id: string;
        }>(accessTokenValue, secret);
    } catch {
        throw new Error("Invalid access token");
    }

    if (payload.type !== "access" && payload.type !== "service") {
        throw new Error("Invalid token type");
    }

    // Service tokens are JWT-only, not persisted to DB
    if (payload.type === "service") {
        return {
            userId: 0,
            scopes: payload.scopes || [],
            clientId: payload.client_id,
            tokenId: payload.token_id || payload.jti,
            type: "service",
        };
    }

    // Verify token exists in DB and is not revoked
    const tokenRecord = await db.query.SUSOAuthTokensTable.findFirst({
        where: and(
            eq(SUSOAuthTokensTable.accessToken, accessTokenValue),
            eq(SUSOAuthTokensTable.revoked, false),
        ),
        columns: { id: true },
    });

    if (!tokenRecord) {
        throw new Error("Access token not found or revoked");
    }

    return {
        userId: parseInt(payload.sub),
        scopes: payload.scopes || [],
        clientId: payload.client_id,
        tokenId: payload.token_id || payload.jti,
        type: "user",
    };
}

export async function introspectToken(
    token: string,
): Promise<{
    active: boolean;
    sub?: string;
    client_id?: string;
    scopes?: string;
    exp?: number;
    iat?: number;
    token_type?: string;
}> {
    const secret = getSigningSecret();
    try {
        const payload = await verifyHs256Jwt<{
            sub: string;
            client_id: string;
            scopes: string[];
            type: string;
            exp: number;
            iat: number;
            token_id: string;
        }>(token, secret);

        // Service tokens are JWT-only, not persisted
        if (payload.type === "service") {
            return {
                active: true,
                sub: payload.sub,
                client_id: payload.client_id,
                scopes: payload.scopes?.join(" "),
                exp: payload.exp,
                iat: payload.iat,
                token_type: "Bearer",
            };
        }

        const tokenRecord = await db.query.SUSOAuthTokensTable.findFirst({
            where: and(
                eq(SUSOAuthTokensTable.accessToken, token),
                eq(SUSOAuthTokensTable.revoked, false),
            ),
            columns: { id: true },
        });

        if (!tokenRecord) {
            return { active: false };
        }

        return {
            active: true,
            sub: payload.sub,
            client_id: payload.client_id,
            scopes: payload.scopes?.join(" "),
            exp: payload.exp,
            iat: payload.iat,
            token_type: "Bearer",
        };
    } catch {
        return { active: false };
    }
}

export async function revokeToken(token: string): Promise<void> {
    await db.update(SUSOAuthTokensTable)
        .set({ revoked: true })
        .where(
            and(
                eq(SUSOAuthTokensTable.accessToken, token),
                eq(SUSOAuthTokensTable.revoked, false),
            ),
        );

    await db.update(SUSOAuthTokensTable)
        .set({ revoked: true })
        .where(
            and(
                eq(SUSOAuthTokensTable.refreshToken, token),
                eq(SUSOAuthTokensTable.revoked, false),
            ),
        );
}

// ── Cleanup expired codes ──

export async function cleanupExpiredCodes(): Promise<void> {
    await db.delete(SUSOAuthAuthorizationCodesTable)
        .where(lt(SUSOAuthAuthorizationCodesTable.expiresAt, new Date()));
}

// ── Client Management ──

async function generateClientSecret(): Promise<string> {
    const secret = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    return `sus_${secret}`;
}

export async function createClient(params: {
    name: string;
    description?: string;
    icon?: string;
    website?: string;
    redirectUris: string[];
    allowedScopes: string[];
    userId: number;
    status?: "pending" | "approved";
}): Promise<{ clientId: string; clientSecret: string }> {
    const clientSecret = await generateClientSecret();

    const [client] = await db
        .insert(SUSOAuthClientsTable)
        .values({
            name: params.name,
            description: params.description ?? null,
            icon: params.icon ?? null,
            website: params.website ?? null,
            clientSecret,
            allowedScopes: params.allowedScopes,
            userId: params.userId,
            status: params.status ?? "pending",
        })
        .returning({ id: SUSOAuthClientsTable.id });

    if (params.redirectUris.length > 0) {
        await db.insert(SUSOAuthClientRedirectUrisTable).values(
            params.redirectUris.map(uri => ({
                clientId: client.id,
                redirectUri: uri,
            })),
        );
    }

    return { clientId: client.id, clientSecret };
}

export async function updateClient(
    clientId: string,
    params: {
        name?: string;
        description?: string | null;
        icon?: string | null;
        website?: string | null;
        redirectUris?: string[];
        allowedScopes?: string[];
    },
): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.icon !== undefined) updateData.icon = params.icon;
    if (params.website !== undefined) updateData.website = params.website;
    if (params.allowedScopes !== undefined) updateData.allowedScopes = params.allowedScopes;

    if (Object.keys(updateData).length > 0) {
        await db.update(SUSOAuthClientsTable)
            .set(updateData as any)
            .where(eq(SUSOAuthClientsTable.id, clientId));
    }

    if (params.redirectUris !== undefined) {
        await db.delete(SUSOAuthClientRedirectUrisTable)
            .where(eq(SUSOAuthClientRedirectUrisTable.clientId, clientId));
        if (params.redirectUris.length > 0) {
            await db.insert(SUSOAuthClientRedirectUrisTable).values(
                params.redirectUris.map(uri => ({
                    clientId,
                    redirectUri: uri,
                })),
            );
        }
    }
}

export async function deleteClient(clientId: string): Promise<void> {
    await db.delete(SUSOAuthClientsTable)
        .where(eq(SUSOAuthClientsTable.id, clientId));
}

export async function regenerateClientSecret(clientId: string): Promise<string> {
    const clientSecret = await generateClientSecret();
    await db.update(SUSOAuthClientsTable)
        .set({ clientSecret })
        .where(eq(SUSOAuthClientsTable.id, clientId));
    return clientSecret;
}

export async function listClients(params?: { status?: string }) {
    const conditions = [];
    if (params?.status) {
        conditions.push(eq(SUSOAuthClientsTable.status, params.status));
    }
    return db.query.SUSOAuthClientsTable.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
            redirectUris: true,
            owner: {
                columns: { id: true, email: true, displayName: true },
            },
            tokens: {
                columns: { id: true },
            },
        },
        orderBy: (clients, { desc }) => [desc(clients.createdAt)],
    });
}

export async function getClientTokens(clientId: string) {
    return db.query.SUSOAuthTokensTable.findMany({
        where: and(
            eq(SUSOAuthTokensTable.clientId, clientId),
            eq(SUSOAuthTokensTable.revoked, false),
        ),
        with: {
            user: {
                columns: { id: true, displayName: true, username: true, avatar: true },
            },
        },
        orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
    });
}
