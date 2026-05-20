import { defineMiddleware } from "astro:middleware";
import { getSession } from "auth-astro/server";
import { isTwoFactorVerified } from "./lib/auth/session-flags";

// 1. Mover constantes fuera del handler para evitar recrearlas en cada petición
const ENABLE_MAINTENANCE = import.meta.env.MAINTENANCE_MODE === "true"; // Mejor usar variables de entorno
const BOT_REGEX = /googlebot|bingbot|slurp|duckduckbot|yandexbot|baiduspider/i;
const PUBLIC_FILE_EXTS = /\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|map|json)$/i;

// Rutas que siempre deben saltarse la lógica de Auth y Mantenimiento
const IGNORED_PATHS = [
    "/api/auth",
    "/_actions",
    "/_astro",
    "/auth",
    "/_server-islands",
    "/favicon.ico"
];

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, redirect, url } = context;
    const pathname = url.pathname;

    // 2. FILTRO RÁPIDO DE ARCHIVOS PÚBLICOS
    // Si es una imagen, fuente o CSS, pasa inmediatamente. No gastes CPU en auth.
    if (PUBLIC_FILE_EXTS.test(pathname)) {
        return next();
    }

    // 3. RUTAS IGNORADAS (Starts with es más rápido y seguro que includes)
    // Usar 'includes' en request.url es peligroso porque coincide con query params.
    if (IGNORED_PATHS.some(path => pathname.startsWith(path))) {
        return next();
    }

    // 4. MODO MANTENIMIENTO
    // Solo verifica si está activo para ahorrar procesamiento del UserAgent
    if (ENABLE_MAINTENANCE && pathname !== "/500") {
        const userAgent = request.headers.get('user-agent') || '';
        // Check de bot solo si es necesario
        if (!BOT_REGEX.test(userAgent)) {
            context.locals.isMaintenanceMode = true;
            return context.rewrite("/500");
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
    // Verifica flag de sesión 2FA en Redis
    if (user.twoFactorEnabled && pathname !== "/two-factor") {
        const isVerified = user.sessionId ? await isTwoFactorVerified(user.sessionId) : false;
        if (!isVerified) {
            return redirect("/two-factor", 302);
        }
    }

    // Si tiene 2FA verificado pero intenta entrar al login de 2fa, redirigir
    if (user.twoFactorEnabled && pathname === "/two-factor") {
        const isVerified = user.sessionId ? await isTwoFactorVerified(user.sessionId) : false;
        if (isVerified) return redirect("/", 302);
    }

    return next();
});
