import { client } from "@/db/client";
import { SaltoCraftExtremo3Inscription } from "@/db/entities/SaltoCraftExtremo3Inscription";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
    try {
        const inscriptosAtTheMoment = await client.getRepository(SaltoCraftExtremo3Inscription).count();

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