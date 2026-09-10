import { syncExtremoInscriptions } from "@/utils/sync-extremo-inscriptions";
import { getSession } from "auth-astro/server";

export async function POST({ request }: { request: Request }) {
    try {
        const session = await getSession(request);

        if (!session?.user.isAdmin) {
            return new Response(JSON.stringify({ error: "No autorizado" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const result = await syncExtremoInscriptions();

        return new Response(JSON.stringify({
            success: true,
            message: `Sincronizadas ${result.synced} inscripciones`,
            synced: result.synced,
            errors: result.errors,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error syncing extremo inscriptions:", error);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
