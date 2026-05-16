const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type JwtHeader = {
    alg: 'HS256' | 'RS256';
    typ: 'JWT';
};

export type JwtPayload = Record<string, any> & {
    iat?: number;
    exp?: number;
};

const subtle = globalThis.crypto?.subtle;

function assertSubtleCrypto() {
    if (!subtle) {
        throw new Error('Web Crypto is not available in this runtime');
    }
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
}

function base64ToBytes(value: string) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function base64UrlEncode(bytes: Uint8Array) {
    return bytesToBase64(bytes)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return base64ToBytes(padded);
}

function encodeSegment(value: unknown) {
    return base64UrlEncode(textEncoder.encode(JSON.stringify(value)));
}

function decodeSegment<T>(value: string): T {
    return JSON.parse(textDecoder.decode(base64UrlDecode(value))) as T;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
    if (left.length !== right.length) {
        return false;
    }

    let result = 0;
    for (let index = 0; index < left.length; index += 1) {
        result |= left[index] ^ right[index];
    }

    return result === 0;
}

async function importHmacKey(secret: string) {
    assertSubtleCrypto();
    return subtle.importKey(
        'raw',
        textEncoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
}

async function importRsaPrivateKey(privateKeyPem: string) {
    assertSubtleCrypto();
    const pemBody = privateKeyPem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');

    return subtle.importKey(
        'pkcs8',
        base64ToBytes(pemBody),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );
}

export async function signHs256Jwt<T extends JwtPayload>(payload: T, secret: string, expiresInSeconds?: number) {
    assertSubtleCrypto();

    const issuedAt = Math.floor(Date.now() / 1000);
    const body: JwtPayload = { ...payload, iat: issuedAt };

    if (typeof expiresInSeconds === 'number') {
        body.exp = issuedAt + expiresInSeconds;
    }

    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const signingInput = `${encodeSegment(header)}.${encodeSegment(body)}`;
    const signatureKey = await importHmacKey(secret);
    const signature = new Uint8Array(await subtle.sign('HMAC', signatureKey, textEncoder.encode(signingInput)));

    return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function verifyHs256Jwt<T extends JwtPayload>(token: string, secret: string) {
    assertSubtleCrypto();

    const [headerPart, payloadPart, signaturePart] = token.split('.');
    if (!headerPart || !payloadPart || !signaturePart) {
        throw new Error('Invalid token');
    }

    const header = decodeSegment<JwtHeader>(headerPart);
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
        throw new Error('Invalid token');
    }

    const signingInput = `${headerPart}.${payloadPart}`;
    const signatureKey = await importHmacKey(secret);
    const expectedSignature = new Uint8Array(await subtle.sign('HMAC', signatureKey, textEncoder.encode(signingInput)));
    const providedSignature = base64UrlDecode(signaturePart);

    if (!timingSafeEqual(expectedSignature, providedSignature)) {
        throw new Error('Invalid token');
    }

    const payload = decodeSegment<T>(payloadPart);
    if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) >= payload.exp) {
        throw new Error('Token expired');
    }

    return payload;
}

export async function signRs256Jwt<T extends JwtPayload>(payload: T, privateKeyPem: string) {
    assertSubtleCrypto();

    const header: JwtHeader = { alg: 'RS256', typ: 'JWT' };
    const body = { ...payload, iat: Math.floor(Date.now() / 1000) };
    const signingInput = `${encodeSegment(header)}.${encodeSegment(body)}`;
    const privateKey = await importRsaPrivateKey(privateKeyPem);
    const signature = new Uint8Array(await subtle.sign('RSASSA-PKCS1-v1_5', privateKey, textEncoder.encode(signingInput)));

    return `${signingInput}.${base64UrlEncode(signature)}`;
}