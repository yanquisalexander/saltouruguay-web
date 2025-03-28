import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { client } from "@/db/client";
import { SessionsTable, UsersTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";

export const DATE_ADMINS_REQUIRE_TWO_FACTOR = DateTime.fromObject({
    year: 2025,
    month: 6,
    day: 30
}).toJSDate();

const AUTH_SECRET = import.meta.env.AUTH_SECRET || 'default_secret_for_dev';

// Función para encriptar un texto usando la variable de entorno AUTH_SECRET
export const encrypt = (text: string): string => {
    const encrypted = CryptoJS.AES.encrypt(text, AUTH_SECRET).toString();
    return encrypted;
};

// Función para desencriptar un texto usando AUTH_SECRET
export const decrypt = (encryptedText: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedText, AUTH_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
};

// 1. Generar el secreto TOTP usando speakeasy
export const generateTotpSecret = (): {
    secret: string,
    base32: string,
    encryptedSecret: string,
    otpauth_url: string
} => {
    const secret = speakeasy.generateSecret({
        length: 20,
        name: "SaltoUruguayServer",
        issuer: "SaltoUruguayServer",
    });

    console.log('Secret Generation Debug:', {
        base32: secret.base32,
        hex: secret.hex,
        otpauth_url: secret.otpauth_url
    });

    const encryptedSecret = encrypt(secret.base32);

    return {
        secret: secret.base32,
        base32: secret.base32,
        encryptedSecret,
        otpauth_url: secret.otpauth_url!
    };
};

// 2. Generar el código QR
export const generateTotpQrCode = async (username: string, secret: string): Promise<string> => {
    // Desencriptamos el secreto para obtener el valor en base32.
    const decryptedSecret = decrypt(secret);

    // Construimos la URL otpauth con el formato adecuado.
    const label = `saltoUruguayServer:${username}`;
    const otpauthUrl = speakeasy.otpauthURL({
        secret: decryptedSecret,
        label,
        issuer: 'SaltoUruguayServer',
        encoding: 'base32'
    });

    return await QRCode.toDataURL(otpauthUrl);
};


// 3. Verificar el código TOTP
export const verifyTotp = (secret: string, token: string): boolean => {
    try {
        // Desencriptamos el secreto guardado
        const decryptedSecret = decrypt(secret);

        // Verificamos el token usando la función nativa de speakeasy,
        // que toma el tiempo actual y permite una ventana configurable.
        const isValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token,
            window: import.meta.env.DEV ? 5 : 1
        });

        console.log('TOTP Verification Debug:', {
            decryptedSecret,
            token,
            isValid
        });

        return isValid;
    } catch (error) {
        console.error('TOTP Verification Error:', error);
        return false;
    }
};


// 4. Generar códigos de recuperación
export const generateRecoveryCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // Genera un código de 6 dígitos
        const encryptedCode = encrypt(code); // Encriptamos el código
        codes.push(encryptedCode);
    }
    return codes;
};

// 5. Habilitar 2FA en la base de datos
export const enableTwoFactorAuth = async (userId: number, secret: string, recoveryCodes: string[]): Promise<void> => {
    await client
        .update(UsersTable)
        .set({
            twoFactorEnabled: true,
            twoFactorSecret: secret,
            twoFactorRecoveryCodes: recoveryCodes,
        })
        .where(eq(UsersTable.id, userId));
};

// 6. Deshabilitar 2FA en la base de datos
export const disableTwoFactorAuth = async (userId: number): Promise<void> => {
    await client
        .update(UsersTable)
        .set({
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorRecoveryCodes: [],
        })
        .where(eq(UsersTable.id, userId));
};

// 7. Validar códigos de recuperación (para cuando el usuario pierde el dispositivo 2FA)
export const validateRecoveryCode = async (userId: number, recoveryCode: string): Promise<boolean> => {
    const user = await client.query.UsersTable.findFirst({
        where: eq(UsersTable.id, userId),
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Desencriptar los códigos de recuperación
    const decryptedCodes = user.twoFactorRecoveryCodes?.map(code => decrypt(code));

    const isValid = decryptedCodes?.includes(recoveryCode);
    if (isValid) {
        // Borrar el código de recuperación usado
        const updatedCodes = decryptedCodes?.filter(code => code !== recoveryCode);
        const encryptedUpdatedCodes = updatedCodes?.map(code => encrypt(code)); // Encriptamos los códigos restantes

        await client
            .update(UsersTable)
            .set({
                twoFactorRecoveryCodes: encryptedUpdatedCodes,
            })
            .where(eq(UsersTable.id, userId));

    }

    return isValid ?? false;
};

export const userHasTwoFactorEnabled = async (userId: number): Promise<boolean> => {
    const user = await client.query.UsersTable.findFirst({
        where: eq(UsersTable.id, userId),
    });

    if (!user) {
        throw new Error('User not found');
    }

    return user.twoFactorEnabled ?? false;
}

export const verifyTwoFactor = async (userId: number, token: string, sessionId?: string): Promise<boolean> => {
    const user = await client.query.UsersTable.findFirst({
        where: eq(UsersTable.id, userId),
    });

    if (!user) {
        throw new Error('User not found');
    }

    const secret = user.twoFactorSecret;
    if (!secret) {
        throw new Error('Two-factor authentication is not enabled for this user');
    }

    const isValid = verifyTotp(secret, token);

    console.log("sessionId:", sessionId);
    console.log("userId:", userId);


    if (isValid && sessionId) {
        await client
            .update(SessionsTable)
            .set({
                twoFactorVerified: true,
            })
            .where(and(
                eq(SessionsTable.userId, userId),
                eq(SessionsTable.sessionId, sessionId)
            ));
    }

    return isValid;
}

export const firstVerification = async (userId: number, otp: string, secret: string): Promise<boolean> => {
    const isValid = verifyTotp(secret, otp);

    const generateCurrentTotpToken = (secret: string): string => {
        const decryptedSecret = decrypt(secret);
        const token = speakeasy.totp({
            secret: decryptedSecret,
            encoding: 'base32'
        });
        console.log('Generated TOTP Token:', token);
        return token;
    };

    const currentTotpToken = generateCurrentTotpToken(secret);
    console.log('Current TOTP Token:', currentTotpToken);


    if (isValid) {
        await client
            .update(UsersTable)
            .set({
                twoFactorEnabled: true,
            })
            .where(eq(UsersTable.id, userId));
    }

    return isValid;
}
