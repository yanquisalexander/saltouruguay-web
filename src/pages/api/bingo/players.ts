import type { APIRoute } from "astro";
import cacheService from "@/services/cache";
import { BINGO_SECRET } from "@/config";

const GAME_TTL = 60 * 60 * 6;
const cache = cacheService.create({ ttl: GAME_TTL });

const ADMIN_SECRET = BINGO_SECRET;

export const GET: APIRoute = async ({ url }) => {
  const session = url.searchParams.get("session");
  const adminSecret = url.searchParams.get("adminSecret");

  if (!session) {
    return json({ error: "session requerida" }, 400);
  }

  if (adminSecret !== ADMIN_SECRET) {
    return json({ error: "No autorizado" }, 403);
  }

  const stateKey = `bingo:${session}:state`;
  const state = await cache.get<{ drawn: number[] }>(stateKey);
  const drawn = state?.drawn ?? [];

  const playersKey = `bingo:${session}:players`;
  const playerNames = (await cache.get<string[]>(playersKey)) ?? [];

  if (playerNames.length === 0) {
    return json({ players: [], total: 0 }, 200);
  }

  const cards = await Promise.all(
    playerNames.map((name) =>
      cache.get<PlayerData>(`bingo:${session}:card:${name}`),
    ),
  );

  const players = playerNames
    .map((name, i) => {
      const data = cards[i];

      if (!data?.card) {
        return null;
      }

      const flat = data.card.flat();
      const total = flat.filter((n) => n !== "FREE").length;

      const marked = flat.filter(
        (n) => n !== "FREE" && drawn.includes(n as number),
      ).length;

      return {
        name,
        marked,
        total,
        joinedAt: data.joinedAt,
      };
    })
    .filter(Boolean);

  players.sort((a: any, b: any) => b.marked - a.marked);

  return json({ players, total: players.length }, 200);
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

type CardCell = number | "FREE";
type CardMatrix = CardCell[][];

interface PlayerData {
  card: CardMatrix;
  username: string;
  joinedAt: number;
}