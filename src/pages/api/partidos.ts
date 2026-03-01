import type { APIRoute } from "astro";
import cacheService from "@/services/cache";
import { getSession } from "auth-astro/server";

const key = "tournament:rocket-league:partidos";

// create a cache client once
const cache = cacheService.create();

// Helper para obtener datos almacenados (usa cacheService)
const getData = async () => {
  const stored = await cache.get<Record<string, any[]>>(key);
  if (!stored) return { A: [], B: [], C: [], D: [] };
  return stored;
};

// --- GET: Obtener partidos ---
export const GET: APIRoute = async () => {
  const data = await getData();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
};

// --- POST: Crear partido (con ID automático) ---
export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const isAdmin = (session?.user as any)?.admin || (session?.user as any)?.isAdmin;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const body = await request.json();
  const partidos = await getData();

  const match = {
    id: "m_" + Date.now(), // Tu lógica de ID original
    local: body.local,
    visitante: body.visitante,
    golesLocal: Number(body.golesLocal),
    golesVisitante: Number(body.golesVisitante)
  };

  // Validar que el grupo existe
  if (!partidos[body.grupo]) partidos[body.grupo] = [];

  partidos[body.grupo].push(match);
  await cache.set(key, partidos);

  return new Response(JSON.stringify(match), { status: 201 });
};

// --- DELETE: Borrar partido por ID ---
export const DELETE: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const isAdmin = (session?.user as any)?.admin || (session?.user as any)?.isAdmin;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  try {
    const { id } = await request.json();
    const partidos = await getData();

    // Recorremos todos los grupos y filtramos el partido que coincida con el ID
    Object.keys(partidos).forEach(grupo => {
      partidos[grupo] = partidos[grupo].filter((p: any) => p.id !== id);
    });

    await cache.set(key, partidos);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al eliminar" }), { status: 500 });
  }
};

// --- PUT: Editar partido existente ---
export const PUT: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const isAdmin = (session?.user as any)?.admin || (session?.user as any)?.isAdmin;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  try {
    const { id, golesLocal, golesVisitante } = await request.json();
    const partidos = await getData();

    let encontrado = false;
    Object.keys(partidos).forEach(grupo => {
      const match = partidos[grupo].find((p: any) => p.id === id);
      if (match) {
        match.golesLocal = Number(golesLocal);
        match.golesVisitante = Number(golesVisitante);
        encontrado = true;
      }
    });

    if (!encontrado) {
      return new Response(JSON.stringify({ error: "Partido no encontrado" }), { status: 404 });
    }

    await cache.set(key, partidos);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error al actualizar" }), { status: 500 });
  }
};
