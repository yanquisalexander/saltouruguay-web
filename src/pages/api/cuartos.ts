import type { APIRoute } from "astro";
import fs from "fs/promises";

const file = "./src/data/cuartos.json";

async function readData() {
  const data = await fs.readFile(file, "utf-8");
  return JSON.parse(data);
}

async function writeData(data:any) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Obtener partidos
export const GET: APIRoute = async () => {
  const partidos = await readData();
  return new Response(JSON.stringify(partidos));
};

// Editar resultado
export const PUT: APIRoute = async ({ request }) => {

  const { id, goles1, goles2 } = await request.json();

  let partidos = await readData();

  partidos = partidos.map((p:any) =>
    p.id == id
      ? { ...p, goles1, goles2 }
      : p
  );

  await writeData(partidos);

  return new Response(JSON.stringify({ ok: true }));
};
