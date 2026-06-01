// src/pages/api/bingo/claim.ts
// POST /api/bingo/claim
// Body: { session }
// Requiere sesión Auth.js válida. Genera y guarda un cartón único por usuario.
// Si el usuario ya tiene cartón para esta sesión, lo devuelve sin crear uno nuevo.

import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import Cache from "@/lib/Cache";

const GAME_TTL = 60 * 60 * 6;
const cache = new Cache({ttl: GAME_TTL})


export const POST: APIRoute = async ({ request }) => {
  // 1. Verificar sesión Auth.js
  const authSession = await getSession(request);
  if (!authSession?.user) {
    return json({ error: "Debes iniciar sesión para jugar" }, 401);
  }

  // Usar el email o name del usuario como identificador único
  const username: string =
    authSession.user.name ?? authSession.user.email ?? "unknown";

  // 2. Leer body
  let body: { session?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { session } = body;
  if (!session) return json({ error: "session requerida" }, 400);

  // 3. Verificar que la partida existe y no terminó
  const stateKey = `bingo:${session}:state`;
  const state = await cache.get<{ gameOver: boolean }>(stateKey);
  if (state?.gameOver) {
    return json({ error: "Esta partida ya terminó" }, 400);
  }

  // 4. Verificar si ya tiene cartón
  const cardKey = `bingo:${session}:card:${username}`;
  const existing = await cache.get<PlayerData>(cardKey);
  if (existing) {
    return json({ ok: true, card: existing.card, username, alreadyHad: true }, 200);
  }

  // 5. Generar cartón nuevo
  const card = generateCard();

  const playerData: PlayerData = {
    card,
    username,
    joinedAt: Date.now(),
  };

  // 6. Guardar cartón y agregar al set de jugadores
  const playersKey = `bingo:${session}:players`;
  await Promise.all([
    cache.set(cardKey, playerData,  GAME_TTL ),
    cache.set(`${playersKey}:${username}`, true, GAME_TTL),
  ]);

  return json({ ok: true, card, username, alreadyHad: false }, 200);
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

// ── Generación del cartón ─────────────────────────────────────────────────────
// B: 1-15 | I: 16-30 | N: 31-45 | G: 46-60 | O: 61-75

function generateCard(): CardMatrix {
  const ranges: [number, number][] = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];

  const card: CardMatrix = Array.from({ length: 5 }, () => new Array(5).fill(0));

  for (let col = 0; col < 5; col++) {
    const [min, max] = ranges[col];
    const nums: number[] = [];
    while (nums.length < 5) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!nums.includes(n)) nums.push(n);
    }
    for (let row = 0; row < 5; row++) {
      card[row][col] = nums[row];
    }
  }

  card[2][2] = "FREE";
  return card;
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

interface PlayerData {
  card: CardMatrix;
  username: string;
  joinedAt: number;
}
