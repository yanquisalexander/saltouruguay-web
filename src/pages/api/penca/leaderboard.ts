import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import { getLeaderboard, getUserScore, getUserRank } from "@/lib/penca";

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const userId = session?.user?.email ?? null;

  const [leaderboard, myScore, myRank] = await Promise.all([
    getLeaderboard(50),
    userId ? getUserScore(userId) : Promise.resolve(0),
    userId ? getUserRank(userId) : Promise.resolve(0),
  ]);

  return new Response(
    JSON.stringify({ leaderboard, myScore, myRank }),
    { headers: { "Content-Type": "application/json" } }
  );
};
