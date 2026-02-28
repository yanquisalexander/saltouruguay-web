import type { APIRoute } from "astro";
import redis from "@/lib/redis";

const KEY = "tournament:rocket:partidos";

export const POST: APIRoute = async ({ request }) => {
  const { id, grupo } = await request.json();

  const raw = await redis.get(KEY);
  const data = raw ? JSON.parse(raw) : {};

  data[grupo] = (data[grupo] || []).filter((p: any) => p.id !== id);

  await redis.set(KEY, JSON.stringify(data));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
