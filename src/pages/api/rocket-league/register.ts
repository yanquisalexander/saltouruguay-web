import type { APIRoute } from "astro";
import { db } from "@/db/client";
import { RocketLeagueRegistrationsTable } from "@/db/schema";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const {
      discordUsername,
      rocketId,
      platform,
      teamName,
      acceptedTerms,
    } = body;

    // Validación básica
    if (!discordUsername || !rocketId || !platform || !acceptedTerms) {
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios" }),
        { status: 400 }
      );
    }

    // Insertar en DB
    await db.insert(RocketLeagueRegistrationsTable).values({
      discordUsername,
      rocketId,
      platform,
      teamName: teamName || null,
      createdAt: new Date(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Error en inscripción:", error);

    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500 }
    );
  }
};

