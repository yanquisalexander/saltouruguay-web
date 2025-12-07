import type { APIContext } from "astro";

export const GET = async ({ url }: APIContext) => {
    const query = url.searchParams.get("q");
    if (!query) {
        return new Response(JSON.stringify({ error: "Query required" }), { status: 400 });
    }

    try {
        const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Error fetching from Deezer" }), { status: 500 });
    }
};
