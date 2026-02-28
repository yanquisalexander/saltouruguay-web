import type { APIRoute } from "astro";
import redis from "@/lib/redis";

const KEY = "tournament:rocket:partidos";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { grupo, local, visitante, golesLocal, golesVisitante } = body;

  let data = JSON.parse((await redis.get(KEY)) || "{}");
  if (!data[grupo]) data[grupo] = [];

  data[grupo].push({ local, visitante, golesLocal, golesVisitante });

  await redis.set(KEY, JSON.stringify(data));

  return new Response(JSON.stringify({ ok: true }));
};

export const GET: APIRoute = async () => {
  const data = JSON.parse((await redis.get(KEY)) || "{}");
  return new Response(JSON.stringify(data));
};
