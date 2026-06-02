import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import cacheService from "@/services/cache";

const GAME_TTL = 60 * 60 * 6;
const cache = cacheService.create({ ttl: GAME_TTL });

export const POST: APIRoute = async ({ request }) => {
  const authSession = await getSession(request);

  if (!authSession?.user) {
    return json({ error: "Debes iniciar sesión para jugar" }, 401);
  }

  const username: string =
    authSession.user.name ?? authSession.user.email ?? "unknown";

  let body: { session?: string };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { session } = body;

  if (!session) {
    return json({ error: "session requerida" }, 400);
  }

  const stateKey = `bingo:${session}:state`;
  const state = await cache.get<{ gameOver: boolean }>(stateKey);

  if (state?.gameOver) {
    return json({ error: "Esta partida ya terminó" }, 400);
  }

  const cardKey = `bingo:${session}:card:${username}`;
  const existing = await cache.get<PlayerData>(cardKey);

  if (existing) {
    await addPlayerToList(session, username);

    return json(
      {
        ok: true,
        card: existing.card,
        username,
        alreadyHad: true,
      },
      200,
    );
  }

  const card = generateCard();

  const playerData: PlayerData = {
    card,
    username,
    joinedAt: Date.now(),
  };

  await cache.set(cardKey, playerData, GAME_TTL);
  await addPlayerToList(session, username);

  return json(
    {
      ok: true,
      card,
      username,
      alreadyHad: false,
    },
    200,
  );
};

async function addPlayerToList(session: string, username: string) {
  const playersKey = `bingo:${session}:players`;
  const players = (await cache.get<string[]>(playersKey)) ?? [];

  if (!players.includes(username)) {
    players.push(username);
    await cache.set(playersKey, players, GAME_TTL);
  }
}

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
};

function generateCard(): CardMatrix {
  const ranges: [number, number][] = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];

  const card: CardMatrix = Array.from({ length: 5 }, () =>
    new Array(5).fill(0),
  );

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

type CardCell = number | "FREE";
type CardMatrix = CardCell[][];

interface PlayerData {
  card: CardMatrix;
  username: string;
  joinedAt: number;
}