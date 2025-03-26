import { defineMiddleware } from "astro:middleware";
import { getSession } from "auth-astro/server";

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, redirect } = context;

    // Check if the cookie exists early
    const hasAuthCookie = request.headers.get('cookie')?.includes('authjs.session');
    if (!hasAuthCookie) return next();

    const session = await getSession(request);

    if (!session || !session.user) return next();

    const { user } = session;
    const isSuspended = user.isSuspended;

    const currentPath = new URL(request.url).pathname;

    if (currentPath === "/suspended") return next();

    if (isSuspended) {
        return redirect("/suspended", 302);
    }

    return next();
});
