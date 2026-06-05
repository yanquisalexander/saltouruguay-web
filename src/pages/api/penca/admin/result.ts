import type { APIRoute } from "astro";
import { setMatchResult } from "@/lib/penca";

const ADMIN_SECRET = import.meta.env.ADMIN_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }
  const { matchId, homeScore, awayScore } = await request.json();
  if (!matchId || homeScore === undefined || awayScore === undefined) {
    return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400 });
  }
  try {
    await setMatchResult(matchId, Number(homeScore), Number(awayScore));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
};
