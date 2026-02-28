import type { APIRoute } from "astro";
import redis from "@/lib/redis";
import equipos from "@/data/equipos.json";
import { generarTabla } from "@/lib/generarTabla";

const KEY = "tournament:rocket:partidos";

export const GET: APIRoute = async () => {
  const partidos = JSON.parse((await redis.get(KEY)) || "{}");

  const tabla: any = {};

  Object.keys(equipos).forEach((g) => {
    tabla[g] = generarTabla(equipos[g], partidos[g] || []);
  });

  return new Response(JSON.stringify(tabla));
};
