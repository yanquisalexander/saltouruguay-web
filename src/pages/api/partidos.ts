import type { APIRoute } from "astro";
import redis from "@/lib/redis";

const key = "tournament:rocket-league:partidos";

/* ================= GET ================= */
export const GET: APIRoute = async () => {
  try {
    const data = await redis.get(key);
    return new Response(data || JSON.stringify({ A:[],B:[],C:[],D:[] }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "error leyendo partidos" }), { status: 500 });
  }
};

/* ================= POST (crear) ================= */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const stored = await redis.get(key);
    const partidos = stored ? JSON.parse(stored) : { A:[],B:[],C:[],D:[] };

    const match = {
      id: "m_" + Date.now(),
      local: body.local,
      visitante: body.visitante,
      golesLocal: body.golesLocal,
      golesVisitante: body.golesVisitante
    };

    partidos[body.grupo].push(match);

    await redis.set(key, JSON.stringify(partidos));

    return new Response(JSON.stringify(match), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "error guardando partido" }), { status: 500 });
  }
};

/* ================= PUT (editar) ================= */
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const stored = await redis.get(key);
    const partidos = stored ? JSON.parse(stored) : { A:[],B:[],C:[],D:[] };

    for (const grupo of Object.keys(partidos)) {
      partidos[grupo] = partidos[grupo].map((m:any) =>
        m.id === body.id
          ? { ...m, golesLocal: body.golesLocal, golesVisitante: body.golesVisitante }
          : m
      );
    }

    await redis.set(key, JSON.stringify(partidos));

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "error editando partido" }), { status: 500 });
  }
};

/* ================= DELETE (borrar) ================= */
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const stored = await redis.get(key);
    const partidos = stored ? JSON.parse(stored) : { A:[],B:[],C:[],D:[] };

    for (const grupo of Object.keys(partidos)) {
      partidos[grupo] = partidos[grupo].filter((m:any) => m.id !== body.id);
    }

    await redis.set(key, JSON.stringify(partidos));

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "error eliminando partido" }), { status: 500 });
  }
};
