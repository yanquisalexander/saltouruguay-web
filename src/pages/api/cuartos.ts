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

// Obtener bracket
export const GET: APIRoute = async () => {

const data = await readData();

return new Response(JSON.stringify(data), {
headers: { "Content-Type": "application/json" }
});

};

// Editar resultado
export const POST: APIRoute = async ({ request }) => {

const { id, g1, g2 } = await request.json();

const data = await readData();

const partido = data.cuartos.find((p:any) => p.id === id);

if (partido) {
partido.g1 = g1;
partido.g2 = g2;
}

await writeData(data);

return new Response(JSON.stringify({ ok: true }), {
headers: { "Content-Type": "application/json" }
});

};
