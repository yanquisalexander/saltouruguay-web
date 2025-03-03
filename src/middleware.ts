import type { MiddlewareHandler } from "astro";

const middleware: MiddlewareHandler = async (context, next) => {
    const MAINTENANCE_MODE = import.meta.env.PROD

    if (MAINTENANCE_MODE && context.request.url.endsWith('/500') === false) {
        context.locals.isMaintenanceMode = true;
        // Set 503 Not Available
        const page500 = await context.rewrite('/500');
        return new Response(page500.body, { ...page500, status: 503 });
    }

    return next();
};

// Export onRequest. This should NOT be a default export
export const onRequest = middleware;
