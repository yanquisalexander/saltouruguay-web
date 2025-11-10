import { defineMiddleware } from "astro:middleware";
import { getSession } from "auth-astro/server";
import { getSessionById } from "./utils/user";

const ENABLE_MAINTENANCE = import.meta.env.PROD; // Cambia a true para activar modo mantenimiento

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, redirect } = context;
    const currentPath = new URL(request.url).pathname;

    // Modo mantenimiento
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /googlebot|bingbot|slurp|duckduckbot|yandexbot|baiduspider/i.test(userAgent);

    if (ENABLE_MAINTENANCE && currentPath !== "/500" && !isBot) {
        context.locals.isMaintenanceMode = true;
        return context.rewrite("/500");
    }

    /* 
        Allow any /api/auth* requests to pass through
        Allow any /_actions* requests to pass through
        This is important for any client-side requests
    */

    if (request.url.includes("/api/auth") ||
        request.url.includes("/_actions") ||
        request.url.includes("/_astro") ||
        request.url.includes("/auth") ||
        request.url.includes("/_server-islands")

    ) {
        return next();
    }

    // Check if the cookie exists early
    const hasAuthCookie = request.headers.get('cookie')?.includes('authjs.session');
    if (!hasAuthCookie) return next();

    const session = await getSession(request);

    if (!session || !session.user) return next();

    const { user } = session;
    const isSuspended = user.isSuspended;

    if (currentPath === "/suspended") return next();

    if (isSuspended) {
        return redirect("/suspended", 302);
    }

    /* 
        User has 2fa and is not on the 2fa page
        Redirect to the 2fa page (if they don't unlocked yet)
    */

    const serverSession = await getSessionById(session.user.sessionId!);

    if (session.user.twoFactorEnabled && !session.user.isSuspended && !serverSession?.twoFactorVerified && currentPath !== "/two-factor") {
        return redirect("/two-factor", 302);
    }

    return next();
});