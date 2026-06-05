/**
 * lib/penca.ts
 * Capa de datos para la Penca del Mundial 2026.
 * Usa Upstash Redis (el mismo cliente que ya usás en el bingo).
 *
 * Claves Redis:
 *   penca:matches          → Hash  { matchId: JSON(Match) }
 *   penca:pick:{userId}    → Hash  { matchId: JSON(Pick) }
 *   penca:champion:{userId}→ String  (teamId del campeón elegido)
 *   penca:scores           → ZSet  score=puntos member=userId
 *   penca:meta             → Hash  { champion: teamId, locked: "1"|"0" }
 */

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type MatchPhase = "groups" | "round_of_16" | "quarters" | "semis" | "final";
export type MatchResult = "home" | "away" | "draw" | null;

export interface Match {
  id: string;
  phase: MatchPhase;
  home: string;       // Ej: "URU"
  away: string;       // Ej: "BRA"
  homeFlag: string;   // Emoji bandera
  awayFlag: string;
  kickoff: number;    // Unix timestamp (ms)
  homeScore: number | null;
  awayScore: number | null;
  result: MatchResult;
}

export interface Pick {
  matchId: string;
  prediction: MatchResult;
  homeScore: number | null;  // Opcional para bonus
  awayScore: number | null;
  submittedAt: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

// ─── Puntos ───────────────────────────────────────────────────────────────────

const POINTS = {
  correctResult: 3,
  exactScore: 2,   // Bonus adicional sobre correctResult
  champion: 10,
} as const;

export function calculatePoints(pick: Pick, match: Match): number {
  if (match.result === null) return 0;
  let pts = 0;

  if (pick.prediction === match.result) {
    pts += POINTS.correctResult;
    // Bonus marcador exacto
    if (
      pick.homeScore !== null &&
      pick.awayScore !== null &&
      pick.homeScore === match.homeScore &&
      pick.awayScore === match.awayScore
    ) {
      pts += POINTS.exactScore;
    }
  }
  return pts;
}

// ─── Partidos ─────────────────────────────────────────────────────────────────

export async function getMatches(): Promise<Match[]> {
  const raw = await redis.hgetall("penca:matches");
  if (!raw) return [];
  return Object.values(raw).map((v) => JSON.parse(v as string)) as Match[];
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const raw = await redis.hget("penca:matches", matchId);
  return raw ? (JSON.parse(raw as string) as Match) : null;
}

export async function upsertMatch(match: Match): Promise<void> {
  await redis.hset("penca:matches", { [match.id]: JSON.stringify(match) });
}

/** Llamado desde el panel admin: carga el resultado y recalcula todos los puntajes */
export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Partido no encontrado");

  const result: MatchResult =
    homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";

  const updated: Match = { ...match, homeScore, awayScore, result };
  await upsertMatch(updated);

  // Recalcular puntajes de todos los usuarios que hicieron pick en este partido
  const pattern = "penca:pick:*";
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = Number(nextCursor);
    for (const key of keys) {
      const userId = key.replace("penca:pick:", "");
      const raw = await redis.hget(key, matchId);
      if (!raw) continue;
      const pick = JSON.parse(raw as string) as Pick;
      const pts = calculatePoints(pick, updated);
      if (pts > 0) {
        await redis.zincrby("penca:scores", pts, userId);
      }
    }
  } while (cursor !== 0);
}

// ─── Picks del jugador ────────────────────────────────────────────────────────

export async function getUserPicks(userId: string): Promise<Record<string, Pick>> {
  const raw = await redis.hgetall(`penca:pick:${userId}`);
  if (!raw) return {};
  const result: Record<string, Pick> = {};
  for (const [matchId, val] of Object.entries(raw)) {
    result[matchId] = JSON.parse(val as string) as Pick;
  }
  return result;
}

export async function savePick(userId: string, pick: Pick): Promise<{ ok: boolean; error?: string }> {
  const match = await getMatch(pick.matchId);
  if (!match) return { ok: false, error: "Partido no encontrado" };

  // No se puede predecir si el partido ya empezó
  if (Date.now() >= match.kickoff) {
    return { ok: false, error: "El partido ya comenzó, no podés editar tu predicción" };
  }

  await redis.hset(`penca:pick:${userId}`, {
    [pick.matchId]: JSON.stringify({ ...pick, submittedAt: Date.now() }),
  });
  return { ok: true };
}

// ─── Campeón ──────────────────────────────────────────────────────────────────

export async function saveChampionPick(userId: string, teamId: string): Promise<{ ok: boolean; error?: string }> {
  const meta = await redis.hgetall("penca:meta");
  if (meta?.locked === "1") {
    return { ok: false, error: "Las predicciones de campeón están cerradas" };
  }
  await redis.set(`penca:champion:${userId}`, teamId);
  return { ok: true };
}

export async function getUserChampionPick(userId: string): Promise<string | null> {
  return redis.get(`penca:champion:${userId}`);
}

/** Admin: define el campeón real y suma puntos */
export async function setChampion(teamId: string): Promise<void> {
  await redis.hset("penca:meta", { champion: teamId });

  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: "penca:champion:*", count: 100 });
    cursor = Number(nextCursor);
    for (const key of keys) {
      const userId = key.replace("penca:champion:", "");
      const pick = await redis.get(key);
      if (pick === teamId) {
        await redis.zincrby("penca:scores", POINTS.champion, userId);
      }
    }
  } while (cursor !== 0);
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const entries = await redis.zrange("penca:scores", 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  const result: LeaderboardEntry[] = [];
  // zrange con withScores devuelve [member, score, member, score, ...]
  for (let i = 0; i < entries.length; i += 2) {
    const userId = entries[i] as string;
    const score = Number(entries[i + 1]);
    result.push({
      userId,
      username: userId, // Reemplazá con tu lookup de usuarios si tenés
      score,
      rank: result.length + 1,
    });
  }
  return result;
}

export async function getUserScore(userId: string): Promise<number> {
  const score = await redis.zscore("penca:scores", userId);
  return score ? Number(score) : 0;
}

export async function getUserRank(userId: string): Promise<number> {
  const rank = await redis.zrevrank("penca:scores", userId);
  return rank !== null ? rank + 1 : 0;
}

// ─── Admin utils ──────────────────────────────────────────────────────────────

export async function lockChampionPicks(): Promise<void> {
  await redis.hset("penca:meta", { locked: "1" });
}

/** Poblar los partidos de fase de grupos del Mundial 2026 */
export async function seedGroupMatches(): Promise<void> {
  // Fixture simplificado — completá con las fechas reales
  const BASE = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup";
  const matches: Match[] = [
    // Grupo A (ejemplo)
    {
      id: "GA1",
      phase: "groups",
      home: "MEX",
      away: "USA",
      homeFlag: "🇲🇽",
      awayFlag: "🇺🇸",
      kickoff: new Date("2026-06-11T20:00:00-05:00").getTime(),
      homeScore: null,
      awayScore: null,
      result: null,
    },
    {
      id: "GA2",
      phase: "groups",
      home: "CAN",
      away: "URU",
      homeFlag: "🇨🇦",
      awayFlag: "🇺🇾",
      kickoff: new Date("2026-06-12T17:00:00-05:00").getTime(),
      homeScore: null,
      awayScore: null,
      result: null,
    },
    // Agregá el resto de los 48 partidos de grupos acá...
  ];

  for (const m of matches) {
    await upsertMatch(m);
  }
}
