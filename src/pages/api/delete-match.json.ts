import type { APIRoute } from "astro";
import { redis } from "@/lib/redis";

export const POST: APIRoute = async ({ request }) => {
  const { id } = await request.json();

  const matches = await redis.get("matches");
  const parsed = matches ? JSON.parse(matches) : [];

  const updated = parsed.filter((m:any) => m.id !== id);

  await redis.set("matches", JSON.stringify(updated));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
