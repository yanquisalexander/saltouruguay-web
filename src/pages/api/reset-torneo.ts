import type { APIRoute } from "astro";
import cacheService from "@/services/cache";
import { getSession } from "auth-astro/server";

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const isAdmin =
    (session?.user as any)?.admin === true ||
    (session?.user as any)?.isAdmin === true;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  try {
    const cache = cacheService.create();
    await cache.delete("tournament:rocket-league:tabla-posiciones");
    await cache.delete("tournament:rocket-league:partidos");

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
