import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import { savePick, getUserPicks, getMatches } from "@/lib/penca";

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }
  const userId = session.user.email;
  const [picks, matches] = await Promise.all([getUserPicks(userId), getMatches()]);
  return new Response(JSON.stringify({ picks, matches }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }
  const userId = session.user.email;
  const { matchId, prediction, homeScore, awayScore } = await request.json();
  if (!matchId || !prediction) {
    return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
  }
  const result = await savePick(userId, {
    matchId, prediction,
    homeScore: homeScore ?? null,
    awayScore: awayScore ?? null,
    submittedAt: Date.now(),
  });
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { "Content-Type": "application/json" },
  });
};