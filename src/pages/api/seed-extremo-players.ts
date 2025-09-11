import { seedExtremoPlayers } from "@/utils/seedExtremoPlayers";
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

        await seedExtremoPlayers();

        return new Response(JSON.stringify({ success: true, message: "Jugadores sembrados exitosamente" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error al sembrar jugadores:", error);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
