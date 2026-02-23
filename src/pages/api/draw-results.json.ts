import type { APIRoute } from "astro";

let results = {
  A: ["team1","team2"],
  B: ["team3","team4"],
  C: ["team5","team6"],
  D: ["team7","team8"]
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(results), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  });
};
