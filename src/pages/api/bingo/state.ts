// src/pages/api/bingo/state.ts
// GET /api/bingo/state?session=XXXX
// Devuelve el estado actual del juego (números sacados, ganador, etc.)

import type { APIRoute } from "astro";
import cacheService from "@/services/cache"
const cache = cacheService.create()

export const GET: APIRoute = async ({ request, url }) => {
  const session = url.searchParams.get("session");
  if (!session) {
    return new Response(JSON.stringify({ error: "session requerida" }), {
      status: 400,
      headers: corsHeaders(),
    });
  }

  const stateKey = `bingo:${session}:state`;
  const state = await cache.get<GameState>(stateKey);

  if (!state) {
    // Juego no iniciado aún — devolver estado vacío
    return new Response(
      JSON.stringify({
        drawn: [],
        gameOver: false,
        winner: null,
        winnerType: null,
        session,
        timestamp: Date.now(),
      }),
      { status: 200, headers: corsHeaders() }
    );
  }

  return new Response(JSON.stringify(state), {
    status: 200,
    headers: corsHeaders(),
  });
};

// OPTIONS para CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
