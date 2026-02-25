import type { APIRoute } from "astro";
import fs from "fs/promises";

const filePath = "./src/data/standings.json";

export const GET: APIRoute = async () => {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return new Response(data);
  } catch {
    return new Response(JSON.stringify({ A: [], B: [], C: [], D: [] }));
  }
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  await fs.writeFile(filePath, JSON.stringify(body, null, 2));
  return new Response(JSON.stringify({ ok: true }));
};
