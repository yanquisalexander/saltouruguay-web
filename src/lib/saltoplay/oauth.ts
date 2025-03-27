import { client as db } from "@/db/client";
import { SaltoPlayGameTokensTable, SaltoPlayGamesTable, SaltoPlayDevelopersTable } from "@/db/schema";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';

class GameCenterOAuth {
    private static secret = process.env.JWT_SECRET || 'your-secret-key';
    private static accessTokenExpiration = '15m';  // Expiración para AccessToken
    private static refreshTokenExpiration = '30d';  // Expiración para RefreshToken
    private static jwtAlgorithm = 'HS256'; // Algoritmo de firma
    private static issuer = 'SALTOURUGUAYSERVER-GAMECENTER'; // Emisor del token

    // Generar Access Token (JWT)
    public static generateAccessToken(userId: number, gameId: string): string {
        const payload = {
            userId: userId,
            gameId: gameId,
            iat: Math.floor(Date.now() / 1000), // Tiempo de emisión
            exp: Math.floor(Date.now() / 1000) + 15 * 60 // Expiración de 15 minutos
        };

        return jwt.sign(payload, this.secret, {
            issuer: this.issuer,
            expiresIn: this.accessTokenExpiration
        });
    }

    // Generar Refresh Token
    public static generateRefreshToken(userId: number, gameId: string): string {
        const payload = {
            userId: userId,
            gameId: gameId,
            iat: Math.floor(Date.now() / 1000), // Tiempo de emisión
            exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // Expiración de 30 días
        };

        const refreshToken = jwt.sign(payload, this.secret, {
            issuer: this.issuer,
            expiresIn: this.refreshTokenExpiration
        });
        // Guardar el refresh token en la base de datos

        db.insert(SaltoPlayGameTokensTable).values({
            userId,
            gameId,
            refreshToken,
        }).onConflictDoNothing();


    }

    // Verificar un Access Token
    public static verifyAccessToken(token: string): any {
        try {
            const decoded = jwt.verify(token, this.secret);
            return decoded;
        } catch (err) {
            return null;  // Token inválido o expirado
        }
    }

    // Validar y obtener el usuario del token
    public static validateAccessToken(token: string): any {
        const decoded = this.verifyAccessToken(token);
        return decoded ? decoded : null;
    }

    // Refrescar un Access Token usando el Refresh Token
    public static async refreshAccessToken(refreshToken: string): Promise<string | null> {
        try {
            const decoded = jwt.verify(refreshToken, this.secret) as any;

            // Verifica si el refresh token está en la DB
            const existingToken = await db.select().from(SaltoPlayGameTokensTable)
                .where(and(
                    eq(SaltoPlayGameTokensTable.userId, decoded.userId),
                    eq(SaltoPlayGameTokensTable.gameId, decoded.gameId),
                    eq(SaltoPlayGameTokensTable.refreshToken, refreshToken)
                ))
                .limit(1)
                .then(result => result[0]);
            if (!existingToken) return null;  // Refresh token no encontrado en la DB

            // Si es válido, genera un nuevo Access Token
            return this.generateAccessToken(decoded.userId, decoded.gameId);
        } catch (err) {
            return null;  // Error al verificar el refresh token
        }
    }

    // Revocar un refresh token (Eliminarlo de la DB)
    public static async revokeRefreshToken(token: string): Promise<boolean> {
        try {
            await db.delete(SaltoPlayGameTokensTable)
                .where(eq(SaltoPlayGameTokensTable.refreshToken, token));
            return true;  // Token eliminado correctamente
        } catch (err) {
            return false;  // Si hay un error al eliminar el token
        }
    }

    // Función para obtener la fecha de expiración de un Access Token (para visualizar)
    public static getAccessTokenExpiration() {
        const expirationDate = DateTime.fromMillis(Date.now()).plus({ minutes: 15 }).toISO();
        return expirationDate;
    }

    // Función para obtener la fecha de expiración de un Refresh Token (para visualizar)
    public static getRefreshTokenExpiration() {
        const expirationDate = DateTime.fromMillis(Date.now()).plus({ days: 30 }).toISO();
        return expirationDate;
    }
}

export default GameCenterOAuth;
