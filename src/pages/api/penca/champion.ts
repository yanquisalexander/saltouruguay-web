import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import { saveChampionPick, getUserChampionPick } from "@/lib/penca";

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }
  const pick = await getUserChampionPick(session.user.email);
  return new Response(JSON.stringify({ champion: pick }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }
  const { teamId } = await request.json();
  if (!teamId) {
    return new Response(JSON.stringify({ error: "Falta teamId" }), { status: 400 });
  }
  const result = await saveChampionPick(session.user.email, teamId);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { "Content-Type": "application/json" },
  });
};
