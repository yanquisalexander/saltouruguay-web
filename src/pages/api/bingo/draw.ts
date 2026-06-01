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

  const stateKey = `bingo:${session}:state`;

  let state: GameState = (await cache.get<GameState>(stateKey)) ?? {
    drawn: [],
    gameOver: false,
    winner: null,
    winnerType: null,
    session,
    timestamp: Date.now(),
  };

  if (state.gameOver) {
    return json({ error: "La partida ya terminó", state }, 400);
  }

  if (state.drawn.length >= 75) {
    return json({ error: "Ya salieron todos los números", state }, 400);
  }

  const available: number[] = [];

  for (let i = 1; i <= 75; i++) {
    if (!state.drawn.includes(i)) available.push(i);
  }

  const num = available[Math.floor(Math.random() * available.length)];

  state.drawn.push(num);
  state.timestamp = Date.now();

  await cache.set(stateKey, state, GAME_TTL);

  return json({ ok: true, number: num, state }, 200);
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

interface GameState {
  drawn: number[];
  gameOver: boolean;
  winner: string | null;
  winnerType: string | null;
  session: string;
  timestamp: number;
}