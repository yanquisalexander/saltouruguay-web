import type { APIRoute } from "astro";
import cacheService from "@/services/cache";
import { BINGO_SECRET } from "@/config";

const ADMIN_SECRET = BINGO_SECRET;
const GAME_TTL = 60 * 60 * 6;
const cache = cacheService.create({ ttl: GAME_TTL });

export const POST: APIRoute = async ({ request }) => {
  let body: { session?: string; adminSecret?: string };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { session, adminSecret } = body;

  if (!session) return json({ error: "session requerida" }, 400);
  if (adminSecret !== ADMIN_SECRET) return json({ error: "No autorizado" }, 403);

  const playersKey = `bingo:${session}:players`;
  const playerNames = (await cache.get<string[]>(playersKey)) ?? [];

  await Promise.all([
    cache.delete(`bingo:${session}:state`),
    cache.delete(`bingo:${session}:claims`),
    cache.delete(playersKey),
    ...playerNames.map((name) => cache.delete(`bingo:${session}:card:${name}`)),
  ]);

  return json({ ok: true, message: `Partida ${session} reiniciada` }, 200);
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

function json(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}