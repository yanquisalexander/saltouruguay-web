import type { APIRoute } from "astro";
import { redis } from "@/lib/redis";

export const POST: APIRoute = async ({ request }) => {
  const { id, scoreA, scoreB } = await request.json();

  const matches = await redis.get("matches");
  const parsed = matches ? JSON.parse(matches) : [];

  const updated = parsed.map((m:any) =>
    m.id === id ? { ...m, scoreA, scoreB } : m
  );

  await redis.set("matches", JSON.stringify(updated));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
