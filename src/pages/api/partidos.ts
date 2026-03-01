import type { APIRoute } from "astro";
import redis from "@/lib/redis";
import { getSession } from "auth-astro/server";

const REDIS_KEY = "tournament:rocket-league:partidos";

// --- GET: Obtener todos los partidos ---
export const GET: APIRoute = async () => {
  try {
    const data = await redis.get(REDIS_KEY);
    const partidos = data ? (typeof data === "string" ? JSON.parse(data) : data) : { A: [], B: [], C: [], D: [] };
    
    return new Response(JSON.stringify(partidos), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al obtener partidos" }), { status: 500 });
  }
};

// --- DELETE: Borrar un partido por ID ---
export const DELETE: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const isAdmin = (session?.user as any)?.admin || (session?.user as any)?.isAdmin;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  try {
    const { id } = await request.json();
    const data = await redis.get(REDIS_KEY);
    let partidos = data ? (typeof data === "string" ? JSON.parse(data) : data) : { A: [], B: [], C: [], D: [] };

    // Filtrar el partido en todos los grupos
    for (const grupo in partidos) {
      partidos[grupo] = partidos[grupo].filter((p: any) => p.id !== id);
    }

    await redis.set(REDIS_KEY, JSON.stringify(partidos));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al borrar el partido" }), { status: 500 });
  }
};

// --- PUT: Editar goles de un partido ---
export const PUT: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const isAdmin = (session?.user as any)?.admin || (session?.user as any)?.isAdmin;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  try {
    const { id, golesLocal, golesVisitante } = await request.json();
    const data = await redis.get(REDIS_KEY);
    let partidos = data ? (typeof data === "string" ? JSON.parse(data) : data) : { A: [], B: [], C: [], D: [] };

    let modificado = false;

    // Buscar y actualizar el partido en los grupos
    for (const grupo in partidos) {
      const partido = partidos[grupo].find((p: any) => p.id === id);
      if (partido) {
        partido.golesLocal = Number(golesLocal);
        partido.golesVisitante = Number(golesVisitante);
        modificado = true;
        break;
      }
    }

    if (!modificado) {
      return new Response(JSON.stringify({ error: "Partido no encontrado" }), { status: 404 });
    }

    await redis.set(REDIS_KEY, JSON.stringify(partidos));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al actualizar el partido" }), { status: 500 });
  }
};
