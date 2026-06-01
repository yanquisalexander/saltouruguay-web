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
    return json(
      {
        players: [],
        total: 0,
        nearLineCount: 0,
        nearBingoCount: 0,
      },
      200,
    );
  }

  const cards = await Promise.all(
    playerNames.map((name) =>
      cache.get<PlayerData>(`bingo:${session}:card:${name}`),
    ),
  );

  let nearLineCount = 0;
  let nearBingoCount = 0;

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

      const near = analyzeNearWins(data.card, drawn);

      if (near.line) nearLineCount++;
      if (near.bingo) nearBingoCount++;

      return {
        name,
        marked,
        total,
        joinedAt: data.joinedAt,
      };
    })
    .filter(Boolean);

  players.sort((a: any, b: any) => b.marked - a.marked);

  return json(
    {
      players,
      total: players.length,
      nearLineCount,
      nearBingoCount,
    },
    200,
  );
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

function analyzeNearWins(card: CardMatrix, drawn: number[]) {
  const has = (n: CardCell) => n === "FREE" || drawn.includes(n as number);

  let nearLine = false;

  for (let r = 0; r < 5; r++) {
    const missing = card[r].filter((n) => !has(n));

    if (missing.length === 1) {
      nearLine = true;
      break;
    }
  }

  if (!nearLine) {
    for (let c = 0; c < 5; c++) {
      const column = card.map((row) => row[c]);
      const missing = column.filter((n) => !has(n));

      if (missing.length === 1) {
        nearLine = true;
        break;
      }
    }
  }

  if (!nearLine) {
    const diagonalPrincipal = [0, 1, 2, 3, 4].map((i) => card[i][i]);
    const missingDiagonalPrincipal = diagonalPrincipal.filter((n) => !has(n));

    if (missingDiagonalPrincipal.length === 1) {
      nearLine = true;
    }
  }

  if (!nearLine) {
    const diagonalInversa = [0, 1, 2, 3, 4].map((i) => card[i][4 - i]);
    const missingDiagonalInversa = diagonalInversa.filter((n) => !has(n));

    if (missingDiagonalInversa.length === 1) {
      nearLine = true;
    }
  }

  const missingFullCard = card.flat().filter((n) => !has(n));

  return {
    line: nearLine,
    bingo: missingFullCard.length === 1,
  };
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