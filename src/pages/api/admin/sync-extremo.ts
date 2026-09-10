import { syncExtremoInscriptions, clearExtremoInscriptions } from "@/utils/sync-extremo-inscriptions";
import { seedExtremoPlayers } from "@/utils/seedExtremoPlayers";
import { getSession } from "auth-astro/server";
import { INSCRIPTIONS_API_KEY, INSCRIPTIONS_API_URL } from "astro:env/server";

export async function GET({ request }: { request: Request }) {
    try {
        const session = await getSession(request);

        if (!session?.user.isAdmin) {
            return new Response(JSON.stringify({ error: "No autorizado" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const res = await fetch(
            `${INSCRIPTIONS_API_URL}/api/inscriptions/export?eventId=3`,
            { headers: { "X-API-Key": INSCRIPTIONS_API_KEY } }
        );

        if (!res.ok) {
            throw new Error(`Admin API error: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success || !data.inscriptions) {
            throw new Error("Invalid response from admin API");
        }

        // Map to preview format
        const preview = data.inscriptions.map((insc: any) => {
            const custom = insc.customData || {};
            return {
                adminId: insc.id,
                userId: insc.susId,
                displayName: insc.displayName,
                discordUsername: insc.discordUsername,
                minecraft_username: custom.u || null,
                participated_sc: custom.participaste_de_alguna_edici_n_anterior_de_saltocraft_extremo === "Si" ? "si" : "no",
                instagram: custom.instagram || null,
                createdAt: insc.createdAt,
            };
        });

        return new Response(JSON.stringify({
            success: true,
            total: preview.length,
            inscriptions: preview,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching dry run:", error);
        return new Response(JSON.stringify({ error: "Error al obtener preview" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function POST({ request }: { request: Request }) {
    try {
        const session = await getSession(request);

        if (!session?.user.isAdmin) {
            return new Response(JSON.stringify({ error: "No autorizado" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const body = await request.json().catch(() => ({}));
        const clear = body.clear === true;

        if (clear) {
            await clearExtremoInscriptions();
        }

        const result = await syncExtremoInscriptions();

        // Auto-seed players from new inscriptions
        await seedExtremoPlayers();

        return new Response(JSON.stringify({
            success: true,
            message: clear
                ? `Limpiadas y sincronizadas ${result.synced} inscripciones`
                : `Sincronizadas ${result.synced} inscripciones`,
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
