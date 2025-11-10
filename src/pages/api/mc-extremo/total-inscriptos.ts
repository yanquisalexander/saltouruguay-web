import { client } from "@/db/client";
import { SaltoCraftExtremo3InscriptionsTable } from "@/db/schema";
import type { APIRoute } from "astro";
import { count } from "drizzle-orm";

export const GET: APIRoute = async ({ request }) => {
    try {
        const result = await client.select({
            inscriptosAtTheMoment: count()
        }).from(SaltoCraftExtremo3InscriptionsTable);
        const inscriptosAtTheMoment = result[0]?.inscriptosAtTheMoment ?? 0;

        return new Response(`🔥 #SaltoCraft EXTREMO 3 🔥 ${inscriptosAtTheMoment} inscritos hasta el momento ☠️`, {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8", // Aseguramos UTF-8
                "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60",
                /* utf8 */
                "Content-Language": "es",

            },
        });
    } catch (error) {
        return new Response(`Error al obtener los inscritos en total`, {
            status: 500,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    }
}