import type { APIRoute } from "astro";
import { setChampion, lockChampionPicks } from "@/lib/penca";

const ADMIN_SECRET = import.meta.env.ADMIN_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }
  const { teamId, action } = await request.json();

  if (action === "lock") {
    await lockChampionPicks();
    return new Response(JSON.stringify({ ok: true, action: "locked" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!teamId) {
    return new Response(JSON.stringify({ error: "Falta teamId" }), { status: 400 });
  }
  await setChampion(teamId);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
