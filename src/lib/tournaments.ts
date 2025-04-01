import { TournamentType, TournamentMatchStatus, TournamentStatus, TournamentParticipantStatus } from "@/consts/Torneos";
import { client as db } from "@/db/client";
import {
    TournamentsTable,
    TournamentParticipantsTable,
    TournamentStagesTable,
    TournamentRoundsTable,
    TournamentMatchesTable,
    TournamentMatchParticipantsTable,
    TournamentGroupsTable,
    TournamentGroupParticipantsTable,
    TournamentTeamsTable,

} from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";



// Interfaces
export interface CreateTournamentParams {
    name: string;
    description?: string;
    tournamentType: keyof typeof TournamentType;
    maxParticipants?: number;
    organizerId: number;
    isPublic?: boolean;
    signupEndDate?: Date;
    startDate?: Date;
    endDate?: Date;
    config?: Record<string, any>;
}

export interface UpdateTournamentParams {
    id: number;
    name?: string;
    description?: string;
    tournamentType?: keyof typeof TournamentType;
    maxParticipants?: number;
    isPublic?: boolean;
    signupEndDate?: Date;
    startDate?: Date;
    endDate?: Date;
    status?: keyof typeof TournamentStatus;
    config?: Record<string, any>;
}

export interface TournamentParticipantParams {
    tournamentId: number;
    userId?: number;
    teamId?: number;
    displayName: string;
    seed?: number;
}

// Funciones CRUD básicas para torneos
export async function createTournament(params: CreateTournamentParams) {
    try {
        const [tournament] = await db.insert(TournamentsTable).values({
            name: params.name,
            description: params.description,
            tournamentType: TournamentType[params.tournamentType],
            maxParticipants: params.maxParticipants || 100,
            organizerId: params.organizerId,
            isPublic: params.isPublic !== undefined ? params.isPublic : false,
            signupEndDate: params.signupEndDate,
            startDate: params.startDate,
            endDate: params.endDate,
            config: params.config ? JSON.stringify(params.config) : "{}",
        }).returning();

        return tournament;
    } catch (error) {
        console.error("Error creating tournament:", error);
        throw new Error(`Failed to create tournament: ${(error as Error).message}`);
    }
}

export async function getTournament(id: number) {
    try {
        const tournament = await db.query.TournamentsTable.findFirst({
            where: eq(TournamentsTable.id, id),
        });

        return tournament;
    } catch (error) {
        console.error(`Error fetching tournament ${id}:`, error);
        throw new Error(`Failed to fetch tournament: ${error.message}`);
    }
}

export async function updateTournament(params: UpdateTournamentParams) {
    try {
        const [tournament] = await db.update(TournamentsTable)
            .set({
                name: params.name,
                description: params.description,
                tournamentType: params.tournamentType ? TournamentType[params.tournamentType] : undefined,
                maxParticipants: params.maxParticipants,
                isPublic: params.isPublic,
                signupEndDate: params.signupEndDate,
                startDate: params.startDate,
                endDate: params.endDate,
                status: params.status ? TournamentStatus[params.status] : undefined,
                config: params.config ? JSON.stringify(params.config) : undefined,
                updatedAt: new Date(),
            })
            .where(eq(TournamentsTable.id, params.id))
            .returning();

        return tournament;
    } catch (error) {
        console.error(`Error updating tournament ${params.id}:`, error);
        throw new Error(`Failed to update tournament: ${error.message}`);
    }
}

export async function deleteTournament(id: number) {
    try {
        // En un sistema real, probablemente querrás hacer una eliminación "soft" 
        // o verificar dependencias antes de eliminar
        await db.delete(TournamentsTable)
            .where(eq(TournamentsTable.id, id));

        return true;
    } catch (error) {
        console.error(`Error deleting tournament ${id}:`, error);
        throw new Error(`Failed to delete tournament: ${error.message}`);
    }
}

// Funciones para participantes
export async function addParticipant(params: TournamentParticipantParams) {
    try {
        // Verificar que se proporcione userId o teamId
        if (!params.userId && !params.teamId) {
            throw new Error("Either userId or teamId must be provided");
        }

        // Verificar que el torneo existe y tiene espacios disponibles
        const tournament = await getTournament(params.tournamentId);
        if (!tournament) {
            throw new Error("Tournament not found");
        }

        const participantCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(TournamentParticipantsTable)
            .where(eq(TournamentParticipantsTable.tournamentId, params.tournamentId));

        if (participantCount[0].count >= (tournament?.maxParticipants ?? 0)) {
            throw new Error("Tournament is full");
        }

        // Insertar participante
        const [participant] = await db.insert(TournamentParticipantsTable).values({
            tournamentId: params.tournamentId,
            userId: params.userId,
            teamId: params.teamId,
            displayName: params.displayName,
            seed: params.seed,
        }).returning();

        return participant;
    } catch (error) {
        console.error("Error adding participant:", error);
        throw new Error(`Failed to add participant: ${error.message}`);
    }
}

export async function removeParticipant(tournamentId: number, participantId: number) {
    try {
        await db.delete(TournamentParticipantsTable)
            .where(
                and(
                    eq(TournamentParticipantsTable.id, participantId),
                    eq(TournamentParticipantsTable.tournamentId, tournamentId)
                )
            );

        return true;
    } catch (error) {
        console.error(`Error removing participant ${participantId}:`, error);
        throw new Error(`Failed to remove participant: ${error.message}`);
    }
}

export async function getParticipants(tournamentId: number) {
    try {
        const participants = await db.query.TournamentParticipantsTable.findMany({
            where: eq(TournamentParticipantsTable.tournamentId, tournamentId),
        });

        return participants;
    } catch (error) {
        console.error(`Error fetching participants for tournament ${tournamentId}:`, error);
        throw new Error(`Failed to fetch participants: ${error.message}`);
    }
}

// Funciones para generar brackets
export async function generateSingleEliminationBracket(tournamentId: number) {
    try {
        // 1. Obtener los participantes
        const participants = await getParticipants(tournamentId);
        if (participants.length < 2) {
            throw new Error("Need at least 2 participants to generate a bracket");
        }

        // 2. Crear etapa de eliminación
        const [stage] = await db.insert(TournamentStagesTable).values({
            tournamentId,
            name: "Single Elimination",
            stageType: TournamentType.SINGLE_ELIMINATION,
            order: 1,
        }).returning();

        // 3. Determinar el número de rondas necesarias
        const numParticipants = participants.length;
        const numRounds = Math.ceil(Math.log2(numParticipants));
        const totalMatches = Math.pow(2, numRounds) - 1;

        // 4. Crear rondas
        const rounds = [];
        for (let i = 1; i <= numRounds; i++) {
            const [round] = await db.insert(TournamentRoundsTable).values({
                tournamentId,
                stageId: stage.id,
                number: i,
                name: i === numRounds ? "Final" : i === numRounds - 1 ? "Semifinal" : `Round ${i}`,
            }).returning();
            rounds.push(round);
        }

        // 5. Crear partidas
        const matches: any[] = [];
        let matchCounter = 0;

        // Comenzar desde la ronda final y trabajar hacia atrás
        for (let roundIdx = numRounds - 1; roundIdx >= 0; roundIdx--) {
            const roundId = rounds[roundIdx].id;
            const matchesInRound = Math.pow(2, roundIdx);

            for (let i = 0; i < matchesInRound; i++) {
                matchCounter++;
                const [match] = await db.insert(TournamentMatchesTable).values({
                    tournamentId,
                    stageId: stage.id,
                    roundId,
                    matchNumber: matchCounter,
                    // Si no es la primera ronda, establecer el nextMatchId
                    nextMatchId: roundIdx < numRounds - 1 ? matches[Math.floor(i / 2)].id : null,
                }).returning();

                matches.unshift(match); // Agregar al principio para que coincida con el orden de creación
            }
        }

        // 6. Sembrar a los participantes en la primera ronda
        const seededParticipants = [...participants].sort((a, b) => (a.seed || 9999) - (b.seed || 9999));

        // Aplicar un algoritmo de seeding para evitar que los mejores jugadores se enfrenten pronto
        const bracketPositions = getBracketSeeding(numParticipants);

        // Asignar participantes a los partidos de la primera ronda
        const firstRoundMatches = matches.slice(0, Math.pow(2, numRounds - 1));

        for (let i = 0; i < bracketPositions.length; i++) {
            if (i < seededParticipants.length) {
                const seedPosition = bracketPositions[i] - 1; // Convertir a base 0
                const matchIndex = Math.floor(seedPosition / 2);
                const position = seedPosition % 2; // 0 = izquierda, 1 = derecha

                if (matchIndex < firstRoundMatches.length) {
                    await db.insert(TournamentMatchParticipantsTable).values({
                        matchId: firstRoundMatches[matchIndex].id,
                        participantId: seededParticipants[i].id,
                        position,
                    });
                }
            }
        }

        // 7. Actualizar el estado del torneo
        await db.update(TournamentsTable)
            .set({ status: TournamentStatus.ACTIVE })
            .where(eq(TournamentsTable.id, tournamentId));

        return {
            stageId: stage.id,
            rounds: rounds.length,
            matches: matches.length,
        };
    } catch (error) {
        console.error(`Error generating bracket for tournament ${tournamentId}:`, error);
        throw new Error(`Failed to generate bracket: ${error.message}`);
    }
}

// Función auxiliar para calcular posiciones de seeding
function getBracketSeeding(numParticipants: number): number[] {
    // Encontrar la potencia de 2 más cercana
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(numParticipants)));
    const seeds = [];

    function fillSeeds(start: number, end: number, pos: number) {
        if (start === end) {
            seeds[pos - 1] = start;
            return;
        }

        const mid = Math.floor((start + end) / 2);
        fillSeeds(start, mid, pos * 2 - 1);
        fillSeeds(mid + 1, end, pos * 2);
    }

    fillSeeds(1, bracketSize, 1);
    return seeds.slice(0, numParticipants);
}

// Función para reportar resultados de partida
export async function reportMatchResult(
    matchId: number,
    winnerParticipantId: number,
    scores: { participantId: number, score: number }[]
) {
    try {
        // 1. Verificar que el partido existe
        const match = await db.query.TournamentMatchesTable.findFirst({
            where: eq(TournamentMatchesTable.id, matchId),
        });

        if (!match) {
            throw new Error("Match not found");
        }

        // 2. Verificar que el ganador es un participante del partido
        const matchParticipants = await db.query.TournamentMatchParticipantsTable.findMany({
            where: eq(TournamentMatchParticipantsTable.matchId, matchId),
        });

        const participantIds = matchParticipants.map(p => p.participantId);
        if (!participantIds.includes(winnerParticipantId)) {
            throw new Error("Winner is not a participant in this match");
        }

        // 3. Actualizar resultados de los participantes
        await db.transaction(async (tx) => {
            // Actualizar cada puntuación
            for (const score of scores) {
                await tx.update(TournamentMatchParticipantsTable)
                    .set({
                        score: score.score,
                        isWinner: score.participantId === winnerParticipantId,
                        status: 'completed'
                    })
                    .where(
                        and(
                            eq(TournamentMatchParticipantsTable.matchId, matchId),
                            eq(TournamentMatchParticipantsTable.participantId, score.participantId)
                        )
                    );
            }

            // Marcar el partido como completado
            await tx.update(TournamentMatchesTable)
                .set({
                    status: TournamentMatchStatus.COMPLETED,
                    updatedAt: new Date()
                })
                .where(eq(TournamentMatchesTable.id, matchId));

            // Si hay un siguiente partido, agregar al ganador
            if (match.nextMatchId) {
                const nextMatch = await tx.query.TournamentMatchesTable.findFirst({
                    where: eq(TournamentMatchesTable.id, match.nextMatchId),
                });

                if (nextMatch) {
                    // Determinar la posición en el siguiente partido (izquierda o derecha)
                    // Convencionalmente, los ganadores de partidos con números impares van a la izquierda
                    // y los ganadores de partidos con números pares van a la derecha
                    const position = match.matchNumber % 2 === 1 ? 0 : 1;

                    // Verificar si ya existe un participante en esa posición
                    const existingParticipant = await tx.query.TournamentMatchParticipantsTable.findFirst({
                        where: and(
                            eq(TournamentMatchParticipantsTable.matchId, match.nextMatchId),
                            eq(TournamentMatchParticipantsTable.position, position)
                        ),
                    });

                    if (existingParticipant) {
                        // Actualizar el participante existente
                        await tx.update(TournamentMatchParticipantsTable)
                            .set({ participantId: winnerParticipantId })
                            .where(eq(TournamentMatchParticipantsTable.id, existingParticipant.id));
                    } else {
                        // Crear un nuevo participante
                        await tx.insert(TournamentMatchParticipantsTable).values({
                            matchId: match.nextMatchId,
                            participantId: winnerParticipantId,
                            position,
                        });
                    }
                }
            }
        });

        return true;
    } catch (error) {
        console.error(`Error reporting result for match ${matchId}:`, error);
        throw new Error(`Failed to report match result: ${error.message}`);
    }
}

// Función para obtener el estado actual del bracket
export async function getTournamentBracket(tournamentId: number) {
    try {
        // Obtener etapas
        const stages = await db.query.TournamentStagesTable.findMany({
            where: eq(TournamentStagesTable.tournamentId, tournamentId),
            orderBy: (stages) => [stages.order],
        });

        const result = [];

        for (const stage of stages) {
            // Obtener rondas
            const rounds = await db.query.TournamentRoundsTable.findMany({
                where: eq(TournamentRoundsTable.stageId, stage.id),
                orderBy: (rounds) => [rounds.number],
            });

            const roundsData = [];

            for (const round of rounds) {
                // Obtener partidos
                const matches = await db.query.TournamentMatchesTable.findMany({
                    where: eq(TournamentMatchesTable.roundId, round.id),
                    orderBy: (matches) => [matches.matchNumber],
                });

                const matchesData = [];

                for (const match of matches) {
                    // Obtener participantes del partido
                    const participants = await db.query.TournamentMatchParticipantsTable.findMany({
                        where: eq(TournamentMatchParticipantsTable.matchId, match.id),
                        orderBy: (p) => [p.position],
                    });

                    // Obtener detalles de los participantes
                    const fullParticipants = await Promise.all(participants.map(async (p) => {
                        const details = await db.query.TournamentParticipantsTable.findFirst({
                            where: eq(TournamentParticipantsTable.id, p.participantId),
                        });
                        return {
                            ...p,
                            details,
                        };
                    }));

                    matchesData.push({
                        ...match,
                        participants: fullParticipants,
                    });
                }

                roundsData.push({
                    ...round,
                    matches: matchesData,
                });
            }

            result.push({
                ...stage,
                rounds: roundsData,
            });
        }

        return result;
    } catch (error) {
        console.error(`Error fetching bracket for tournament ${tournamentId}:`, error);
        throw new Error(`Failed to fetch tournament bracket: ${error.message}`);
    }
}

// Función para listar torneos con filtros
export async function listTournaments({
    page = 1,
    limit = 10,
    status,
    type,
    search,
    organizerId
}: {
    page?: number;
    limit?: number;
    status?: keyof typeof TournamentStatus;
    type?: keyof typeof TournamentType;
    search?: string;
    organizerId?: number;
}) {
    try {
        const offset = (page - 1) * limit;

        // Construir condiciones de filtro
        const conditions = [];

        if (status) {
            conditions.push(eq(TournamentsTable.status, TournamentStatus[status]));
        }

        if (type) {
            conditions.push(eq(TournamentsTable.tournamentType, TournamentType[type]));
        }

        if (organizerId) {
            conditions.push(eq(TournamentsTable.organizerId, organizerId));
        }

        // Búsqueda básica (esto se puede mejorar con índices de búsqueda de texto completo)
        if (search) {
            conditions.push(sql`${TournamentsTable.name} ILIKE ${`%${search}%`}`);
        }

        // Contar total para la paginación
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(TournamentsTable)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        // Obtener los resultados
        const tournaments = await db
            .select()
            .from(TournamentsTable)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .limit(limit)
            .offset(offset)
            .orderBy(TournamentsTable.createdAt);

        return {
            data: tournaments,
            meta: {
                total: Number(count),
                page,
                limit,
                totalPages: Math.ceil(Number(count) / limit),
            }
        };
    } catch (error) {
        console.error("Error listing tournaments:", error);
        throw new Error(`Failed to list tournaments: ${(error as Error).message}`);
    }
}