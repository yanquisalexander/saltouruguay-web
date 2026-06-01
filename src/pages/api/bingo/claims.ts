import type { APIRoute } from "astro";
import cacheService from "@/services/cache";
import { BINGO_SECRET } from "@/config";

const cache = cacheService.create();
const ADMIN_SECRET = BINGO_SECRET;

export const GET: APIRoute = async ({ url }) => {
  const session = url.searchParams.get("session");
  const adminSecret = url.searchParams.get("adminSecret");

  if (!session) return json({ error: "session requerida" }, 400);
  if (adminSecret !== ADMIN_SECRET) return json({ error: "No autorizado" }, 403);

  const claims = await cache.get<any[]>(`bingo:${session}:claims`) ?? [];

  return json({ claims }, 200);
};

export const OPTIONS: APIRoute = async () =>
  new Response(null, { status: 204, headers: corsHeaders() });

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