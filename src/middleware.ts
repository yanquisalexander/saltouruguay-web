import type { MiddlewareHandler } from "astro";

const middleware: MiddlewareHandler = async (context, next) => {
    const MAINTENANCE_MODE = true;

    if (MAINTENANCE_MODE && context.request.url.endsWith('/500') === false) {
        context.locals.isMaintenanceMode = true;
        return context.rewrite('/500');
    }

    return next();
};

// Export onRequest. This should NOT be a default export
export const onRequest = middleware;
