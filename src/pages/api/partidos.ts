import type { APIRoute } from "astro";
import redis from "@/lib/redis";

const key = "tournament:rocket-league:partidos-v2";

const getData = async () => {
  const stored = await redis.get(key);
  return stored ? JSON.parse(stored) : { A: [], B: [], C: [], D: [] };
};

export const GET: APIRoute = async () => {
  const data = await getData();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const partidos = await getData();

  const match = {
    id: "m_" + Date.now(),
    local: body.local,
    visitante: body.visitante,
    golesLocal: body.golesLocal,
    golesVisitante: body.golesVisitante
  };

  partidos[body.grupo].push(match);
  await redis.set(key, JSON.stringify(partidos));

  return new Response(JSON.stringify(match));
};

export const DELETE: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  const partidos = await getData();

  for (const grupo of Object.keys(partidos)) {
    partidos[grupo] = partidos[grupo].filter(p => p.id !== id);
  }

  await redis.set(key, JSON.stringify(partidos));
  return new Response(JSON.stringify({ ok: true }));
};

export const PUT: APIRoute = async ({ request }) => {
  const { id, golesLocal, golesVisitante } = await request.json();
  const partidos = await getData();

  for (const grupo of Object.keys(partidos)) {
    const match = partidos[grupo].find(p => p.id === id);
    if (match) {
      match.golesLocal = golesLocal;
      match.golesVisitante = golesVisitante;
    }
  }

  await redis.set(key, JSON.stringify(partidos));
  return new Response(JSON.stringify({ ok: true }));
};
