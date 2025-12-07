import type { APIContext } from "astro";

export const GET = async ({ url }: APIContext) => {
    const id = url.searchParams.get("id");
    if (!id) {
        return new Response(JSON.stringify({ error: "Track ID required" }), { status: 400 });
    }

    try {
        const response = await fetch(`https://api.deezer.com/track/${id}`);
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error fetching from Deezer" }), { status: 500 });
    }
};
