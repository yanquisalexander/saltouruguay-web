import { getTotalVotes } from "@/utils/awards-vote-system";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
    try {
        const votesAtTheMoment = await getTotalVotes();
        return new Response(votesAtTheMoment.toString(), {
            status: 200,
            headers: {
                "Content-Type": "text/plain",
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