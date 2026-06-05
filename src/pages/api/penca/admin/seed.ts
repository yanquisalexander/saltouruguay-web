import type { APIRoute } from "astro";
import { seedGroupMatches } from "@/lib/penca";

const ADMIN_SECRET = import.meta.env.ADMIN_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }
  await seedGroupMatches();
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
