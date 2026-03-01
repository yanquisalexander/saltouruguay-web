import type { APIRoute } from "astro";
import cacheService from "@/services/cache";
import equipos from "@/data/equipos.json";
import { generarTabla } from "@/lib/generarTabla";

const KEY = "tournament:rocket:partidos";
const cache = cacheService.create();

export const GET: APIRoute = async () => {
  const partidos = (await cache.get<Record<string, any>>(KEY)) || {};

  const tabla: any = {};

  Object.keys(equipos).forEach((g) => {
    tabla[g] = generarTabla(equipos[g], partidos[g] || []);
  });

  return new Response(JSON.stringify(tabla));
};
