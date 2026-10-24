import type { APIRoute } from "astro";
import { client as db } from "@/db/client";
import { TournamentsTable, UsersTable } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { readCompetition } from "@/lib/tournament-legacy";

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const GET: APIRoute = async ({ params, request }) => {
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Invalid tournament id" }, 400);

    const url = new URL(request.url);
    const overlay = url.searchParams.get("overlay") === "1";

    const tournament = await db.query.TournamentsTable.findFirst({
        where: eq(TournamentsTable.id, id),
        with: {
            participants: { with: { user: { columns: { displayName: true, username: true } } } },
            matches: true,
        },
    });
    if (!tournament) return json({ error: "Not found" }, 404);

    // Misma regla que la página: privados/borrador solo con ?overlay=1 (o sesión admin que ya valida la página).
    if ((tournament.privacy === "private" || tournament.status === "draft") && !overlay) {
        return json({ error: "Forbidden" }, 403);
    }

    const { competition, format } = readCompetition(tournament);
    const userIds = competition.entrants.flatMap(p => (p.userId ? [p.userId] : []));
    const profiles = userIds.length
        ? await db
              .select({
                  id: UsersTable.id,
                  username: UsersTable.username,
                  displayName: UsersTable.displayName,
                  avatar: UsersTable.avatar,
              })
              .from(UsersTable)
              .where(inArray(UsersTable.id, userIds))
        : [];

    return json({
        tournament: {
            id: tournament.id,
            name: tournament.name,
            description: tournament.description,
            format: tournament.format,
            status: tournament.status,
            privacy: tournament.privacy,
            maxParticipants: tournament.maxParticipants,
            bannerUrl: tournament.bannerUrl,
        },
        format,
        competition,
        profiles,
    });
};
