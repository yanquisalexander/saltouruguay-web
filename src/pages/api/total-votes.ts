import { getTotalVotes } from "@/utils/awards-vote-system";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
    try {
        const votesAtTheMoment = await getTotalVotes();
        return new Response(`🔥 #SaltoAwards2024 🔥 ${votesAtTheMoment} votos hasta el momento`, {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8", // Aseguramos UTF-8
                "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60",
                /* utf8 */
                "Content-Language": "es",

            },
        });
    } catch (error) {
        return new Response(`Error al obtener los votos en total`, {
            status: 500,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    }
}