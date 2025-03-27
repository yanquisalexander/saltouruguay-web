import { client as db } from "@/db/client";
import {
    SaltoPlayGameTokensTable,
    SaltoPlayGamesTable,
    SaltoPlayDevelopersTable,
    SaltoPlayAuthorizationCodesTable
} from "@/db/schema";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import jwt from 'jsonwebtoken';
import { LucideIdCard, type LucideIcon } from "lucide-preact";
import { DateTime } from 'luxon';


export const AVAILABLE_SCOPES = [
    "openid",
    "profile",
    "email",
    "saltotag:read",
    "achievements:read",
    "achievements:write",
    "friends:read",
    "friends:update"
];

export const BEAUTIFUL_SCOPES: Record<string, { name: string; description: string; icon: LucideIcon } | undefined> = {
    "openid": {
        name: "Leer tu perfil",
        description: "OpenID Connect scope",
        icon: LucideIdCard
    },
    "saltotag:read": {
        name: "Leer tu SaltoTag",
        description: "Permite leer tu SaltoTag",
        icon: LucideIdCard
    },
};

export const getBeautifulScopes = (scopes: string[]) => {
    return scopes
        .map(scope => BEAUTIFUL_SCOPES[scope])
        .filter(Boolean) as Array<{ name: string; description: string; icon: LucideIcon }>;
}

// Token lifetimes
export const AUTHORIZATION_CODE_LIFETIME = 10 * 60; // 10 minutes
export const ACCESS_TOKEN_LIFETIME = 60 * 60; // 1 hour
export const REFRESH_TOKEN_LIFETIME = 60 * 60 * 24 * 30; // 30 days

export const getOauthClient = async (clientId: string) => {
    const client = await db.query.SaltoPlayGamesTable.findFirst({
        where: eq(SaltoPlayGamesTable.id, clientId),
        columns: {
            id: true,
            name: true,
            icon: true,
            status: true,
            clientSecret: true,
            redirectUri: true
        },
        with: {
            developer: {
                columns: {
                    id: true,
                    developerName: true,
                },
                with: {
                    user: {
                        columns: {
                            email: true,
                        }
                    }
                }

            }
        }
    });

    return client;
}

export async function generateAuthorizationCode(
    gameId: string,
    userId: number,
    scopes: string[],
    redirectUri: string
): Promise<string> {
    // Validate scopes
    const invalidScopes = scopes.filter(scope => !AVAILABLE_SCOPES.includes(scope));
    if (invalidScopes.length > 0) {
        throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    // Generate unique code
    const code = randomUUID();

    // Store authorization code
    await db.insert(SaltoPlayAuthorizationCodesTable).values({
        gameId,
        userId,
        code,
        scopes: scopes.join(','),
        redirectUri,
        expiresAt: DateTime.now().plus({ seconds: AUTHORIZATION_CODE_LIFETIME }).toJSDate()
    });

    return code;
}

// Validate and consume authorization code
export async function validateAuthorizationCode(
    code: string,
    gameId: string,
    redirectUri: string
): Promise<{ userId: number; scopes: string[] }> {
    const authCode = await db.query.SaltoPlayAuthorizationCodesTable.findFirst({
        where: and(
            eq(SaltoPlayAuthorizationCodesTable.code, code),
            eq(SaltoPlayAuthorizationCodesTable.gameId, gameId),
            eq(SaltoPlayAuthorizationCodesTable.redirectUri, redirectUri)
        )
    });

    if (!authCode) {
        throw new Error('Invalid authorization code');
    }

    // Check expiration
    if (DateTime.fromJSDate(authCode.expiresAt) < DateTime.now()) {
        throw new Error('Authorization code expired');
    }

    // Delete the used code to prevent reuse
    await db.delete(SaltoPlayAuthorizationCodesTable)
        .where(eq(SaltoPlayAuthorizationCodesTable.code, code));

    return {
        userId: authCode.userId,
        scopes: authCode.scopes.split(',')
    };
}

// Generate access and refresh tokens
export async function generateTokens(
    gameId: string,
    userId: number,
    scopes: string[]
): Promise<{ accessToken: string; refreshToken: string }> {
    const game = await db.query.SaltoPlayGamesTable.findFirst({
        where: eq(SaltoPlayGamesTable.id, gameId)
    });

    if (!game) {
        throw new Error('Game not found');
    }

    // Generate tokens
    const accessToken = jwt.sign(
        {
            sub: userId.toString(),
            game: gameId,
            scopes
        },
        game.clientSecret,
        { expiresIn: ACCESS_TOKEN_LIFETIME }
    );

    const refreshToken = jwt.sign(
        {
            sub: userId.toString(),
            game: gameId
        },
        game.clientSecret,
        { expiresIn: REFRESH_TOKEN_LIFETIME }
    );

    // Store tokens in database
    await db.insert(SaltoPlayGameTokensTable).values({
        gameId,
        userId,
        /* 
            On the future, we should encrypt the tokens before storing them in the database.
            For now, we are storing them as plain text for simplicity.
        */
        accessToken,
        refreshToken,
        scopes: scopes.join(','),
        expiresAt: DateTime.now().plus({ seconds: ACCESS_TOKEN_LIFETIME }).toJSDate()
    });

    return { accessToken, refreshToken };
}

// Refresh access token
export async function refreshAccessToken(
    refreshToken: string,
    gameId: string
): Promise<{ accessToken: string; refreshToken: string }> {
    const game = await db.query.SaltoPlayGamesTable.findFirst({
        where: eq(SaltoPlayGamesTable.id, gameId)
    });

    if (!game) {
        throw new Error('Game not found');
    }

    // Verify refresh token
    let decoded: any;
    try {
        decoded = jwt.verify(refreshToken, game.clientSecret);
    } catch (error) {
        throw new Error('Invalid refresh token');
    }

    // Find existing token record
    const existingToken = await db.query.SaltoPlayGameTokensTable.findFirst({
        where: and(
            eq(SaltoPlayGameTokensTable.gameId, gameId),
            eq(SaltoPlayGameTokensTable.userId, parseInt(decoded.sub))
        )
    });

    if (!existingToken) {
        throw new Error('Token not found');
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
        {
            sub: decoded.sub,
            game: gameId,
            scopes: existingToken.scopes.split(',')
        },
        game.clientSecret,
        { expiresIn: ACCESS_TOKEN_LIFETIME }
    );

    const newRefreshToken = jwt.sign(
        {
            sub: decoded.sub,
            game: gameId
        },
        game.clientSecret,
        { expiresIn: REFRESH_TOKEN_LIFETIME }
    );

    // Update tokens in database
    await db.update(SaltoPlayGameTokensTable)
        .set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresAt: DateTime.now().plus({ seconds: ACCESS_TOKEN_LIFETIME }).toJSDate()
        })
        .where(
            and(
                eq(SaltoPlayGameTokensTable.gameId, gameId),
                eq(SaltoPlayGameTokensTable.userId, parseInt(decoded.sub))
            )
        );

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
}

// Validate access token
export async function validateAccessToken(
    accessToken: string,
    gameId: string
): Promise<{ userId: number; scopes: string[] }> {
    const game = await db.query.SaltoPlayGamesTable.findFirst({
        where: eq(SaltoPlayGamesTable.id, gameId)
    });

    if (!game) {
        throw new Error('Game not found');
    }

    // Verify token
    let decoded: any;
    try {
        decoded = jwt.verify(accessToken, game.clientSecret);
    } catch (error) {
        throw new Error('Invalid access token');
    }

    // Check token in database
    const tokenRecord = await db.query.SaltoPlayGameTokensTable.findFirst({
        where: and(
            eq(SaltoPlayGameTokensTable.gameId, gameId),
            eq(SaltoPlayGameTokensTable.userId, parseInt(decoded.sub))
        )
    });

    if (!tokenRecord) {
        throw new Error('Token not found');
    }

    return {
        userId: parseInt(decoded.sub),
        scopes: decoded.scopes || []
    };
}


// Revoke tokens for a specific game and user
export async function revokeTokens(gameId: string, userId: number): Promise<void> {
    await db.delete(SaltoPlayGameTokensTable)
        .where(
            and(
                eq(SaltoPlayGameTokensTable.gameId, gameId),
                eq(SaltoPlayGameTokensTable.userId, userId)
            )
        );
}