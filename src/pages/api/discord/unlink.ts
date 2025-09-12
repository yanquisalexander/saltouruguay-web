import type { APIContext } from "astro";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { getSession } from "auth-astro/server";
import { eq } from "drizzle-orm";

export const POST = async ({ request }: APIContext) => {
    try {
        const session = await getSession(request);
        
        if (!session) {
            return new Response(JSON.stringify({ 
                error: "No autenticado" 
            }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Check if user has a Discord account linked
        const user = await client
            .select({ discordId: UsersTable.discordId })
            .from(UsersTable)
            .where(eq(UsersTable.id, session.user.id))
            .limit(1);

        if (!user.length || !user[0].discordId) {
            return new Response(JSON.stringify({ 
                error: "No tienes una cuenta de Discord vinculada" 
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Unlink Discord account
        await client
            .update(UsersTable)
            .set({ discordId: null })
            .where(eq(UsersTable.id, session.user.id));

        return new Response(JSON.stringify({ 
            success: true,
            message: "Cuenta de Discord desvinculada exitosamente"
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error al desvincular cuenta de Discord:", error);
        return new Response(JSON.stringify({ 
            error: "Error interno del servidor" 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};