import type { APIRoute } from "astro";
import cacheService from "@/services/cache";

export const POST: APIRoute = async () => {
  try {
    await redis.del("tournament:rocket-league:tabla-posiciones");
    await redis.del("tournament:rocket-league:partidos");

    return new Response(
      JSON.stringify({ ok: true, message: "Torneo reseteado" }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Error reseteando torneo" }),
      { status: 500 }
    );
  }
};
