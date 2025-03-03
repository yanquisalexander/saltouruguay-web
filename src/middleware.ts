import type { MiddlewareHandler } from "astro";

const middleware: MiddlewareHandler = async (context, next) => {
    const MAINTENANCE_MODE = import.meta.env.MAINTENANCE_MODE === 'true';

    // Leer el query param de la URL
    const url = new URL(context.request.url);
    const bypassMaintenance = url.searchParams.get('bypassMaintenanceMode') === 'true';

    // Si está en mantenimiento y no es /500 y no tiene el bypass, muestra la página de mantenimiento
    if (MAINTENANCE_MODE && !bypassMaintenance && !url.pathname.endsWith('/500')) {
        context.locals.isMaintenanceMode = true;

        // Mostrar página de mantenimiento (503) y retornar el contenido
        const maintenancePage = await context.rewrite('/500');
        return new Response(maintenancePage.body, { ...maintenancePage, status: 503 });
    }

    // Si tiene el query `bypassMaintenanceMode`, deja seguir como si no estuviera en mantenimiento
    return next();
};

// Export onRequest correctamente
export const onRequest = middleware;
