import type { APIRoute } from "astro";
import redis from "@/lib/redis";

const key = "tournament:rocket-league:partidos";

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;
    const body = await request.json();

    const stored = await redis.get(key);
    if (!stored) return new Response("not found", { status: 404 });

    const partidos = JSON.parse(stored);

    for (const grupo of Object.keys(partidos)) {
      const index = partidos[grupo].findIndex(p => p.id === id);
      if (index !== -1) {
        partidos[grupo][index] = { ...partidos[grupo][index], ...body };
        await redis.set(key, JSON.stringify(partidos));
        return new Response(JSON.stringify(partidos[grupo][index]));
      }
    }

    return new Response("not found", { status: 404 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "error editando" }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;

    const stored = await redis.get(key);
    if (!stored) return new Response("not found", { status: 404 });

    const partidos = JSON.parse(stored);

    for (const grupo of Object.keys(partidos)) {
      partidos[grupo] = partidos[grupo].filter(p => p.id !== id);
    }

    await redis.set(key, JSON.stringify(partidos));

    return new Response(JSON.stringify({ ok: true }));

  } catch (err) {
    return new Response(JSON.stringify({ error: "error borrando" }), { status: 500 });
  }
};
