import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import cacheService from "@/services/cache";

const GAME_TTL = 60 * 60 * 6;
const cache = cacheService.create({ ttl: GAME_TTL });

type ClaimType = "LINEA_HORIZONTAL" | "LINEA_VERTICAL" | "DIAGONAL" | "BINGO";
type CardCell = number | "FREE";
type CardMatrix = CardCell[][];

interface ClaimResult {
  ok: boolean;
  label?: string;
  numbers?: CardCell[];
  numbersText?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const authSession = await getSession(request);

  if (!authSession?.user) {
    return json({ error: "Debes iniciar sesión" }, 401);
  }

  const username = authSession.user.name ?? authSession.user.email ?? "Jugador";

  let body: { session?: string; type?: ClaimType };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { session, type } = body;

  if (!session) return json({ error: "session requerida" }, 400);
  if (!type) return json({ error: "type requerido" }, 400);

  const stateKey = `bingo:${session}:state`;

  const state = (await cache.get<GameState>(stateKey)) ?? {
    drawn: [],
    gameOver: false,
    winner: null,
    winnerType: null,
    session,
    timestamp: Date.now(),
  };

  if (state.gameOver) {
    return json({ error: "La partida ya terminó" }, 400);
  }

  const playerData = await cache.get<{ card: CardMatrix; username: string }>(
    `bingo:${session}:card:${username}`,
  );

  if (!playerData?.card) {
    return json({ error: "No tenés cartón en esta partida" }, 404);
  }

  const claimKey = `bingo:${session}:claims`;
  const claims = (await cache.get<any[]>(claimKey)) ?? [];

  if (type !== "BINGO") {
    const alreadyClaimed = claims.some((c) => c.type === type);

    if (alreadyClaimed) {
      return json({ error: "Ese tipo de línea ya fue reclamado" }, 400);
    }
  }

  const result = checkClaim(playerData.card, state.drawn, type);

  if (!result.ok) {
    return json({ error: "Todavía no tenés esa jugada completa" }, 400);
  }

  const newClaim = {
    player: username,
    type,
    label: result.label,
    numbers: result.numbers ?? [],
    numbersText: result.numbersText ?? "",
    timestamp: Date.now(),
  };

  claims.unshift(newClaim);
  await cache.set(claimKey, claims.slice(0, 20), GAME_TTL);

  if (type === "BINGO") {
    state.gameOver = true;
    state.winner = username;
    state.winnerType = result.label ?? "🏆 BINGO COMPLETO";
    state.timestamp = Date.now();

    await cache.set(stateKey, state, GAME_TTL);
  }

  return json({ ok: true, claim: newClaim }, 200);
};

function checkClaim(
  card: CardMatrix,
  drawn: number[],
  type: ClaimType,
): ClaimResult {
  const has = (n: CardCell) => n === "FREE" || drawn.includes(n as number);

  if (type === "BINGO") {
    if (card.flat().every(has)) {
      return {
        ok: true,
        label: "🏆 BINGO COMPLETO",
        numbers: card.flat(),
        numbersText: formatNumbers(card.flat()),
      };
    }

    return { ok: false };
  }

  if (type === "LINEA_HORIZONTAL") {
    for (let r = 0; r < 5; r++) {
      const row = card[r];

      if (row.every(has)) {
        return {
          ok: true,
          label: `➖ Línea horizontal fila ${r + 1}`,
          numbers: row,
          numbersText: formatNumbers(row),
        };
      }
    }
  }

  if (type === "LINEA_VERTICAL") {
    for (let c = 0; c < 5; c++) {
      const column = card.map((row) => row[c]);

      if (column.every(has)) {
        return {
          ok: true,
          label: `│ Línea vertical columna ${c + 1}`,
          numbers: column,
          numbersText: formatNumbers(column),
        };
      }
    }
  }

  if (type === "DIAGONAL") {
    const diagonalPrincipal = [0, 1, 2, 3, 4].map((i) => card[i][i]);

    if (diagonalPrincipal.every(has)) {
      return {
        ok: true,
        label: "✖ Diagonal principal",
        numbers: diagonalPrincipal,
        numbersText: formatNumbers(diagonalPrincipal),
      };
    }

    const diagonalInversa = [0, 1, 2, 3, 4].map((i) => card[i][4 - i]);

    if (diagonalInversa.every(has)) {
      return {
        ok: true,
        label: "✖ Diagonal inversa",
        numbers: diagonalInversa,
        numbersText: formatNumbers(diagonalInversa),
      };
    }
  }

  return { ok: false };
}

function formatNumbers(numbers: CardCell[]) {
  return numbers.join(" - ");
}

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