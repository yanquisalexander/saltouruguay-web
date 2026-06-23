import { defineMiddleware } from "astro:middleware";
import { getSession } from "auth-astro/server";
import { getSessionById } from "./utils/user";
import { createHash, randomUUID } from "crypto";

const ENABLE_MAINTENANCE = import.meta.env.MAINTENANCE_MODE === "true";
const BOT_REGEX = /googlebot|bingbot|slurp|duckduckbot|yandexbot|baiduspider/i;
const PUBLIC_FILE_EXTS = /\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|map|json)$/i;

const IGNORED_PATHS = [
    "/api/auth",
    "/_actions",
    "/_astro",
    "/auth",
    "/_server-islands",
    "/favicon.ico"
];

const MAINT_BYPASS_COOKIE = "sus_maint_bypass";
const MAINT_BYPASS_DURATION = 3600; // 1 hora

function signBypassToken(): string {
    const expiry = Math.floor(Date.now() / 1000) + MAINT_BYPASS_DURATION;
    const nonce = randomUUID().slice(0, 8);
    const payload = `${expiry}.${nonce}`;
    const sig = createHash("sha256")
        .update(payload + (import.meta.env.AUTH_SECRET || ""))
        .digest("hex")
        .slice(0, 16);
    return `${payload}.${sig}`;
}

function verifyBypassToken(token: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [expiryStr, nonce, sig] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry)) return false;
    const payload = `${expiry}.${nonce}`;
    const expected = createHash("sha256")
        .update(payload + (import.meta.env.AUTH_SECRET || ""))
        .digest("hex")
        .slice(0, 16);
    if (sig !== expected) return false;
    return Math.floor(Date.now() / 1000) < expiry;
}

function getBypassCookie(request: Request): string | null {
    const cookies = request.headers.get("cookie") || "";
    const match = cookies.match(new RegExp(`(?:^|;)\\s*${MAINT_BYPASS_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1].trim()) : null;
}

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, redirect, url } = context;
    const pathname = url.pathname;

    // CORS para AuthJS session (soporta preflight)
    if (pathname === "/api/auth/session") {
        if (request.method === "OPTIONS") {
            const headers = new Headers();
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
            headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
            return new Response(null, { status: 204, headers });
        }
        const response = await next();
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return response;
    }

    // 2. FILTRO RÁPIDO DE ARCHIVOS PÚBLICOS
    if (PUBLIC_FILE_EXTS.test(pathname)) {
        return next();
    }

    // 3. RUTAS IGNORADAS
    if (IGNORED_PATHS.some(path => pathname.startsWith(path))) {
        return next();
    }

    // 4. MODO MANTENIMIENTO
    if (ENABLE_MAINTENANCE && pathname !== "/500" && !context.isPrerendered) {
        // Check bypass cookie first
        const existingBypass = getBypassCookie(request);
        const bypassValid = existingBypass && verifyBypassToken(existingBypass);

        // If query param `maint_bypass` is present and user is admin, set bypass cookie
        if (url.searchParams.has("maint_bypass")) {
            const session = await getSession(request);
            if (session?.user?.isAdmin) {
                const token = signBypassToken();
                context.cookies.set(MAINT_BYPASS_COOKIE, token, {
                    path: "/",
                    maxAge: MAINT_BYPASS_DURATION,
                    httpOnly: true,
                    sameSite: "lax",
                });
                // Redirect to strip the query param
                const cleanUrl = url.pathname + url.search.replace(/[?&]maint_bypass[^&]*/g, "").replace(/^&/, "?").replace(/^\?$/, "");
                return redirect(cleanUrl, 302);
            }
        }

        if (!bypassValid) {
            const userAgent = request.headers.get('user-agent') || '';
            if (!BOT_REGEX.test(userAgent)) {
                context.locals.isMaintenanceMode = true;
                return context.rewrite("/500");
            }
        }
    }

    // 5. VERIFICACIÓN DE COOKIE (Pre-Auth)
    // Si no hay cookie de sesión, no intentes cargar la sesión (ahorra tiempo y DB)
    const hasAuthCookie = request.headers.get('cookie')?.includes('authjs.session-token') ||
        request.headers.get('cookie')?.includes('__Secure-authjs.session-token');

    if (!hasAuthCookie) return next();

    // 6. CARGA DE SESIÓN
    const session = await getSession(request);
    if (!session || !session.user) return next();

    const { user } = session;

    // 7. LÓGICA DE SUSPENSIÓN
    // Evita bucles infinitos comprobando si ya estamos en /suspended
    if (user.isSuspended) {
        if (pathname === "/suspended") return next();
        return redirect("/suspended", 302);
    }
    // Si el usuario no está suspendido pero intenta entrar a /suspended, sácalo de ahí
    if (!user.isSuspended && pathname === "/suspended") {
        return redirect("/", 302);
    }

    // 8. LÓGICA DE 2FA (Optimizada)
    // Solo verifica DB extra si tiene 2FA activado y no estamos ya en la página de 2FA
    if (user.twoFactorEnabled && pathname !== "/two-factor") {
        /* CRÍTICO: getSessionById hace una llamada a DB extra. 
           Si es posible, intenta meter el flag 'twoFactorVerified' dentro del 
           objeto `session` original (en el callback de Auth.js/NextAuth jwt/session)
           para evitar esta segunda consulta a base de datos.
        */
        const serverSession = await getSessionById(user.sessionId!);

        if (!serverSession?.twoFactorVerified) {
            return redirect("/two-factor", 302);
        }
    }

    // Si tiene 2FA verificado pero intenta entrar al login de 2fa, redirigir
    if (user.twoFactorEnabled && pathname === "/two-factor") {
        const serverSession = await getSessionById(user.sessionId!);
        if (serverSession?.twoFactorVerified) return redirect("/", 302);
    }

    return next();
});