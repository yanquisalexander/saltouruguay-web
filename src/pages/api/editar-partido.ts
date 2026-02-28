import type { APIRoute } from "astro";
import redis from "@/lib/redis";

const KEY = "tournament:rocket:partidos";

export const POST: APIRoute = async ({ request }) => {
  const { id, grupo, golesLocal, golesVisitante } = await request.json();

  const raw = await redis.get(KEY);
  const data = raw ? JSON.parse(raw) : {};

  const lista = data[grupo] || [];
  const idx = lista.findIndex((p: any) => p.id === id);

  if (idx === -1) {
    return new Response("Partido no encontrado", { status: 404 });
  }

  lista[idx].golesLocal = golesLocal;
  lista[idx].golesVisitante = golesVisitante;

  data[grupo] = lista;
  await redis.set(KEY, JSON.stringify(data));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
