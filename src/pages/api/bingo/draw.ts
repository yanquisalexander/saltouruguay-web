// src/pages/api/bingo/draw.ts
// POST /api/bingo/draw
// Body: { session, adminSecret }
// Saca un número aleatorio y actualiza el estado en Redis.
// Protegido con BINGO_ADMIN_SECRET para que solo el bolillero pueda usarlo.

import type { APIRoute } from "astro";
import cacheService from "@/services/cache"
import { BINGO_SECRET } from "@/config";

const ADMIN_SECRET = BINGO_SECRET
// TTL del juego en Redis: 6 horas (en segundos)
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

  // Obtener estado actual
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

  // Sacar número al azar
  const available: number[] = [];
  for (let i = 1; i <= 75; i++) {
    if (!state.drawn.includes(i)) available.push(i);
  }
  const num = available[Math.floor(Math.random() * available.length)];
  state.drawn.push(num);
  state.timestamp = Date.now();

  // Chequear si algún jugador ganó con este número
  const winnerResult = await checkAllPlayers(session, state.drawn);
  if (winnerResult) {
    state.gameOver = true;
    state.winner = winnerResult.name;
    state.winnerType = winnerResult.type;
  }

  await cache.set(stateKey, state,  GAME_TTL );

  return json({ ok: true, number: num, state }, 200);
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function checkAllPlayers(
  session: string,
  drawn: number[]
): Promise<{ name: string; type: string } | null> {
  const playersKey = `bingo:${session}:players`;
  const playerNames = await cache.get<string[]>(playersKey) ?? [];

  for (const name of playerNames) {
    const cardKey = `bingo:${session}:card:${name}`;
    const playerData = await cache.get<PlayerData>(cardKey);
    if (!playerData?.card) continue;

    const result = checkBingo(playerData.card, drawn);
    if (result) return { name, type: result };
  }
  return null;
}

function checkBingo(card: CardMatrix, drawn: number[]): string | null {
  const has = (n: number | "FREE") => n === "FREE" || drawn.includes(n);

  for (let r = 0; r < 5; r++) {
    if (card[r].every(has)) return `Línea horizontal (fila ${r + 1})`;
  }
  for (let c = 0; c < 5; c++) {
    if (card.every((row) => has(row[c]))) return `Línea vertical (columna ${c + 1})`;
  }
  if ([0, 1, 2, 3, 4].every((i) => has(card[i][i]))) return "Diagonal principal";
  if ([0, 1, 2, 3, 4].every((i) => has(card[i][4 - i]))) return "Diagonal inversa";
  if (card.flat().every(has)) return "¡BINGO COMPLETO!";

  return null;
}

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

// ── tipos ─────────────────────────────────────────────────────────────────────

type CardCell = number | "FREE";
type CardMatrix = CardCell[][];

interface GameState {
  drawn: number[];
  gameOver: boolean;
  winner: string | null;
  winnerType: string | null;
  session: string;
  timestamp: number;
}

interface PlayerData {
  card: CardMatrix;
  username: string;
  joinedAt: number;
}
