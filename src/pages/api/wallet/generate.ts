import { getSession } from 'auth-astro/server';
import jwt from 'jsonwebtoken';

/**
 * Endpoint para generar un Save URL (Save to Google Wallet) firmado con la Service Account.
 * Requisitos (variables de entorno):
 * - GOOGLE_SERVICE_ACCOUNT_KEY: contenido JSON de la Service Account (como string). Ej: cat key.json | base64 o JSON directo.
 * - WALLET_ISSUER_ID: issuerId provisto por Google Wallet (numero)
 * - WALLET_CLASS_SUFFIX (opcional): sufijo para classId. Default: 'member_card_v1'
 *
 * Dependencias:
 *   pnpm add jsonwebtoken
 *
 * Seguridad: NO almacenar la clave en el repo. Usa secrets del proveedor (Vercel/Cloudflare/etc.).
 */

export async function POST({ request }: { request: Request }) {
    try {
        const session = await getSession(request as any);
        if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

        const body = await request.json();
        const { userId, name, avatar, cardNumber } = body;

        if (!userId || String(userId) !== String(session.user.id)) {
            return new Response(JSON.stringify({ error: 'INVALID_USER' }), { status: 403 });
        }

        const SERVICE_KEY_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        const ISSUER_ID = process.env.WALLET_ISSUER_ID;
        const CLASS_SUFFIX = process.env.WALLET_CLASS_SUFFIX || 'member_card_v1';

        if (!SERVICE_KEY_RAW || !ISSUER_ID) {
            return new Response(
                JSON.stringify({
                    error: 'WALLET_NOT_CONFIGURED',
                    message: 'Configura GOOGLE_SERVICE_ACCOUNT_KEY y WALLET_ISSUER_ID en las variables de entorno.'
                }),
                { status: 500 }
            );
        }

        // Parse service account JSON (puede venir con \n escapados)
        let serviceKey: any;
        try {
            serviceKey = typeof SERVICE_KEY_RAW === 'string' ? JSON.parse(SERVICE_KEY_RAW) : SERVICE_KEY_RAW;
        } catch (e) {
            try {
                serviceKey = JSON.parse(SERVICE_KEY_RAW.replace(/\\n/g, '\n'));
            } catch (err) {
                console.error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY');
                return new Response(JSON.stringify({ error: 'INVALID_SERVICE_KEY' }), { status: 500 });
            }
        }

        const clientEmail = serviceKey.client_email;
        const privateKey = serviceKey.private_key;

        if (!clientEmail || !privateKey) {
            return new Response(JSON.stringify({ error: 'INVALID_SERVICE_KEY' }), { status: 500 });
        }

        // IDs
        const classId = `${ISSUER_ID}.${CLASS_SUFFIX}`;
        const objectId = `${ISSUER_ID}.${userId}-${Date.now()}`;

        // Clase (genericClass) - adapta campos según lo que necesites
        const genericClass = {
            id: classId,
            issuerName: 'Salto Uruguay',
            reviewStatus: 'underReview',
            title: 'Miembro Salto',
            textModulesData: [{ header: 'Miembro', body: 'Tarjeta oficial de la comunidad Salto Uruguay' }],
            hexBackgroundColor: '#0f1724',
            logo: { sourceUri: { uri: 'https://saltouruguay.com/favicon.svg' } }
        };

        // Objeto (genericObject)
        const genericObject: any = {
            id: objectId,
            classId: classId,
            state: 'active',
            barcode: { type: 'qrCode', value: String(cardNumber || userId) },
            textModulesData: [{ header: 'Usuario', body: String(name) }],
            title: `Miembro ${name}`
        };

        if (avatar) genericObject.heroImage = { sourceUri: { uri: avatar } };

        // Payload para JWT
        const jwtBody: any = {
            iss: clientEmail,
            aud: 'google',
            typ: 'savetowallet',
            payload: {
                genericClasses: [genericClass],
                genericObjects: [genericObject]
            }
        };

        // Firmar JWT con RS256
        const token = jwt.sign(jwtBody, privateKey, { algorithm: 'RS256' });

        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return new Response(JSON.stringify({ saveUrl }), { status: 200 });
    } catch (e: any) {
        console.error('wallet generate error', e);
        return new Response(JSON.stringify({ error: e.message || 'error' }), { status: 500 });
    }
}
