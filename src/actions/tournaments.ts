import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { client as db } from '@/db/client';
import { TournamentsTable, TournamentParticipantsTable, TournamentMatchesTable, UsersTable } from '@/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { getSession } from "auth-astro/server";
import { uploadTournamentCover } from '@/services/tournament-storage';

export const tournaments = {
    /**
     * Create a new tournament
     */
    create: defineAction({
        input: z.object({
            name: z.string().min(3).max(100),
            description: z.string().optional(),
            format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'groups']),
            maxParticipants: z.number().min(2).max(128).optional(),
            privacy: z.enum(['public', 'private']).default('public'),
            startDate: z.string().optional(), // ISO string
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión para crear un torneo',
                });
            }

            // Check if user is admin (optional, depending on requirements)
            // const user = await db.query.UsersTable.findFirst({ where: eq(UsersTable.id, session.user.id) });
            // if (!user?.admin) throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores' });

            try {
                const [tournament] = await db.insert(TournamentsTable).values({
                    name: input.name,
                    description: input.description,
                    format: input.format,
                    maxParticipants: input.maxParticipants,
                    privacy: input.privacy,
                    startDate: input.startDate ? new Date(input.startDate) : null,
                    creatorId: session.user.id,
                    status: 'draft',
                }).returning();

                return { success: true, tournament };
            } catch (error: any) {
                console.error('Error creating tournament:', error);
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al crear el torneo',
                });
            }
        },
    }),

    /**
     * Join a tournament
     */
    join: defineAction({
        input: z.object({
            tournamentId: z.number(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) {
                throw new ActionError({
                    code: 'UNAUTHORIZED',
                    message: 'Debes iniciar sesión',
                });
            }

            try {
                const tournament = await db.query.TournamentsTable.findFirst({
                    where: eq(TournamentsTable.id, input.tournamentId),
                });

                if (!tournament) {
                    throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado' });
                }

                if (tournament.status !== 'registration') {
                    throw new ActionError({ code: 'BAD_REQUEST', message: 'Las inscripciones no están abiertas' });
                }

                // Check max participants
                if (tournament.maxParticipants) {
                    const participantsCount = await db
                        .select({ count: count() })
                        .from(TournamentParticipantsTable)
                        .where(eq(TournamentParticipantsTable.tournamentId, input.tournamentId));

                    if (participantsCount[0].count >= tournament.maxParticipants) {
                        throw new ActionError({ code: 'BAD_REQUEST', message: 'Torneo lleno' });
                    }
                }

                // Check if already joined
                const existing = await db.query.TournamentParticipantsTable.findFirst({
                    where: and(
                        eq(TournamentParticipantsTable.tournamentId, input.tournamentId),
                        eq(TournamentParticipantsTable.userId, session.user.id)
                    ),
                });

                if (existing) {
                    throw new ActionError({ code: 'BAD_REQUEST', message: 'Ya estás inscrito' });
                }

                // Get user details for teamName fallback
                const user = await db.query.UsersTable.findFirst({
                    where: eq(UsersTable.id, session.user.id),
                });

                if (!user) throw new ActionError({ code: 'UNAUTHORIZED' });

                // Require Discord linked
                if (!user.discordId) {
                    throw new ActionError({ code: 'BAD_REQUEST', message: 'Debes vincular tu cuenta de Discord para inscribirte' });
                }

                await db.insert(TournamentParticipantsTable).values({
                    tournamentId: input.tournamentId,
                    userId: session.user.id,
                    status: 'confirmed', // Auto-confirm for now
                    teamName: user.displayName,
                });

                return { success: true };
            } catch (error: any) {
                if (error instanceof ActionError) throw error;
                console.error('Error joining tournament:', error);
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al inscribirse',
                });
            }
        },
    }),

    /**
     * Start Tournament (Generate Bracket)
     * NOTE: Currently only supports Single Elimination basic generation
     */
    start: defineAction({
        input: z.object({
            tournamentId: z.number(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            // Get user to check if they're admin
            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });

            if (!user?.admin) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores pueden iniciar torneos' });
            }

            const tournament = await db.query.TournamentsTable.findFirst({
                where: eq(TournamentsTable.id, input.tournamentId),
            });

            if (!tournament) {
                throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado' });
            }

            if (tournament.status !== 'registration' && tournament.status !== 'draft') {
                throw new ActionError({ code: 'BAD_REQUEST', message: 'El torneo ya ha comenzado o finalizado' });
            }

            // Fetch participants
            const participants = await db.query.TournamentParticipantsTable.findMany({
                where: eq(TournamentParticipantsTable.tournamentId, input.tournamentId),
            });

            if (participants.length < 2) {
                throw new ActionError({ code: 'BAD_REQUEST', message: 'Se necesitan al menos 2 participantes' });
            }

            // --- BRACKET GENERATION (Single Elimination) ---
            const shuffled = [...participants].sort(() => Math.random() - 0.5);
            const totalParticipants = shuffled.length;
            const roundsCount = Math.ceil(Math.log2(totalParticipants));
            const bracketSize = Math.pow(2, roundsCount); // Virtual size (e.g., 8 for 5 players)

            // We will generate matches layer by layer, starting from the Final (last round)
            // and working backwards to Round 1.
            // We need to keep track of created matches to link them.

            // Map: Round -> MatchIndex -> MatchId
            const createdMatches: Record<number, Record<number, number>> = {};

            // 1. Create the structure (Empty matches)
            // Loop from Last Round down to 1
            for (let r = roundsCount; r >= 1; r--) {
                const matchesInRound = Math.pow(2, roundsCount - r); // Round 1 has bracketSize/2 matches
                createdMatches[r] = {};

                for (let m = 0; m < matchesInRound; m++) {
                    // Determine next match ID
                    let nextMatchId: number | null = null;
                    if (r < roundsCount) {
                        const nextRound = r + 1;
                        const nextMatchIndex = Math.floor(m / 2);
                        nextMatchId = createdMatches[nextRound][nextMatchIndex];
                    }

                    const [match] = await db.insert(TournamentMatchesTable).values({
                        tournamentId: input.tournamentId,
                        round: r,
                        matchOrder: m,
                        nextMatchId: nextMatchId,
                        status: 'pending',
                    }).returning({ id: TournamentMatchesTable.id });

                    createdMatches[r][m] = match.id;
                }
            }

            // 2. Populate Round 1 with players
            // We have 'bracketSize' slots. 'totalParticipants' are real players.
            // The first (bracketSize - totalParticipants) slots are "Byes" if we want to distribute them?
            // Actually, standard seeding:
            // If we have byes, they usually go to the highest seeds.
            // Since we shuffled, we just fill slots.
            // If slot index < totalParticipants, it's a player. Else it's a Bye.

            // But wait, if we have Byes, the player paired with a Bye should automatically advance to Round 2.
            // This means updating Round 1 match to 'completed' and setting winner, 
            // AND updating Round 2 match to set player.

            // Let's simplify: Just put players in Round 1 matches.
            // If a match has only 1 player (because of odd number), they win automatically.

            const round1Matches = createdMatches[1];
            const matchesInRound1 = Object.keys(round1Matches).length; // Should be bracketSize / 2

            for (let m = 0; m < matchesInRound1; m++) {
                const matchId = round1Matches[m];

                // Player 1 index: m * 2
                // Player 2 index: m * 2 + 1
                const p1 = shuffled[m * 2];
                const p2 = shuffled[m * 2 + 1];

                const updates: any = {
                    player1Id: p1 ? p1.userId : null,
                    player2Id: p2 ? p2.userId : null,
                    status: 'pending'
                };

                // Handle Byes / Auto-win
                if (p1 && !p2) {
                    // Player 1 wins automatically
                    updates.winnerId = p1.userId;
                    updates.status = 'completed';
                    updates.score1 = 1;
                    updates.score2 = 0;

                    // Advance to next match
                    // We need to find the next match and put this winner in the correct slot
                    // This is tricky without reading the match again to get nextMatchId.
                    // But we have the structure in createdMatches.
                    if (roundsCount > 1) {
                        const nextRound = 2;
                        const nextMatchIndex = Math.floor(m / 2);
                        const nextMatchId = createdMatches[nextRound][nextMatchIndex];

                        // Is this player 1 or 2 in the next match?
                        // If m is even (0, 2, 4), they come from the "top" -> Player 1
                        // If m is odd (1, 3, 5), they come from the "bottom" -> Player 2
                        const isPlayer1InNext = (m % 2) === 0;

                        await db.update(TournamentMatchesTable)
                            .set(isPlayer1InNext ? { player1Id: p1.userId } : { player2Id: p1.userId })
                            .where(eq(TournamentMatchesTable.id, nextMatchId));
                    }
                } else if (!p1 && !p2) {
                    // Both empty? Should not happen if logic is correct
                    updates.status = 'completed'; // Bye vs Bye
                } else {
                    updates.status = 'in_progress'; // Ready to play
                }

                await db.update(TournamentMatchesTable)
                    .set(updates)
                    .where(eq(TournamentMatchesTable.id, matchId));
            }

            await db.update(TournamentsTable)
                .set({ status: 'in_progress', startDate: new Date() })
                .where(eq(TournamentsTable.id, input.tournamentId));

            return { success: true };
        }
    }),

    /**
     * Update Match Result
     */
    updateMatch: defineAction({
        input: z.object({
            matchId: z.number(),
            score1: z.number(),
            score2: z.number(),
            winnerId: z.number(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            // Get user to check if they're admin
            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });

            if (!user?.admin) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores pueden actualizar resultados' });
            }

            // Get match and tournament to check permissions
            const match = await db.query.TournamentMatchesTable.findFirst({
                where: eq(TournamentMatchesTable.id, input.matchId),
                with: {
                    tournament: true
                }
            });

            if (!match) throw new ActionError({ code: 'NOT_FOUND', message: 'Partido no encontrado' });

            // Update current match
            await db.update(TournamentMatchesTable).set({
                score1: input.score1,
                score2: input.score2,
                winnerId: input.winnerId,
                status: 'completed'
            }).where(eq(TournamentMatchesTable.id, input.matchId));

            // Advance winner to next match
            if (match.nextMatchId) {
                const nextMatch = await db.query.TournamentMatchesTable.findFirst({
                    where: eq(TournamentMatchesTable.id, match.nextMatchId)
                });

                if (nextMatch) {
                    // Determine if winner goes to player1 or player2 slot
                    // We can infer this from the current match's order or just check which slot is empty?
                    // But both slots might be empty.
                    // We need to know if this match feeds into player1 or player2 of the next match.
                    // In our generation logic:
                    // nextMatchIndex = Math.floor(m / 2);
                    // isPlayer1InNext = (m % 2) === 0;

                    // We can re-derive this if we know the matchOrder of the current match.
                    const isPlayer1InNext = (match.matchOrder % 2) === 0;

                    await db.update(TournamentMatchesTable)
                        .set(isPlayer1InNext ? { player1Id: input.winnerId } : { player2Id: input.winnerId })
                        .where(eq(TournamentMatchesTable.id, match.nextMatchId));

                    // If the next match now has both players, set it to in_progress?
                    // We'd need to check if both are set.
                    // For simplicity, we leave it as pending until both are there.
                    // But we can check:
                    /*
                    const updatedNextMatch = ...
                    if (updatedNextMatch.player1Id && updatedNextMatch.player2Id) {
                        update status to in_progress
                    }
                    */
                }
            } else {
                // Final match! Tournament over?
                await db.update(TournamentsTable)
                    .set({ status: 'completed', endDate: new Date() })
                    .where(eq(TournamentsTable.id, match.tournamentId));
            }

            return { success: true };
        }
    }),

    /**
     * Remove a participant (Kick)
     */
    removeParticipant: defineAction({
        input: z.object({
            tournamentId: z.number(),
            userId: z.number(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            // Get user to check if they're admin
            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });

            const tournament = await db.query.TournamentsTable.findFirst({
                where: eq(TournamentsTable.id, input.tournamentId),
            });

            if (!tournament) throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado' });

            // Allow if user is admin, the creator, or removing themselves
            const isAdmin = user?.admin === true;
            const isCreator = tournament.creatorId === session.user.id;
            const isSelf = input.userId === session.user.id;

            if (!isAdmin && !isCreator && !isSelf) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'No tienes permiso' });
            }

            if (tournament.status !== 'registration' && tournament.status !== 'draft') {
                throw new ActionError({ code: 'BAD_REQUEST', message: 'No se puede salir de un torneo en curso' });
            }

            await db.delete(TournamentParticipantsTable)
                .where(and(
                    eq(TournamentParticipantsTable.tournamentId, input.tournamentId),
                    eq(TournamentParticipantsTable.userId, input.userId)
                ));

            return { success: true };
        }
    }),

    /**
     * Delete Tournament
     */
    delete: defineAction({
        input: z.object({
            tournamentId: z.number(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            // Get user to check if they're admin
            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });

            if (!user?.admin) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores pueden eliminar torneos' });
            }

            const tournament = await db.query.TournamentsTable.findFirst({
                where: eq(TournamentsTable.id, input.tournamentId),
            });

            if (!tournament) throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado' });

            // Cascade delete should handle participants and matches if configured in DB, 
            // but let's be safe or rely on schema constraints.
            // Schema has onDelete: "cascade" for participants and matches.

            await db.delete(TournamentsTable).where(eq(TournamentsTable.id, input.tournamentId));

            return { success: true };
        }
    }),

    /**
     * Update Tournament Details
     */
    update: defineAction({
        input: z.object({
            tournamentId: z.number(),
            name: z.string().min(3).max(100).optional(),
            description: z.string().optional(),
            status: z.enum(['draft', 'registration', 'in_progress', 'completed']).optional(),
            maxParticipants: z.number().nullable().optional(),
            startDate: z.coerce.date().optional(),
            featured: z.boolean().optional(),
            externalChallongeBracketId: z.string().max(255).nullable().optional(),
            config: z.object({
                teamsEnabled: z.boolean().optional(),
                playersPerTeam: z.number().min(2).max(50).optional(),
                teamNamePrefix: z.string().max(30).optional(),
                maxTeams: z.number().min(2).max(256).optional(),
                showParticipants: z.boolean().optional(),
            }).optional(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            // Get user to check if they're admin
            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });

            if (!user?.admin) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores pueden actualizar torneos' });
            }

            const tournament = await db.query.TournamentsTable.findFirst({
                where: eq(TournamentsTable.id, input.tournamentId),
            });

            if (!tournament) {
                throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado' });
            }

            const existingConfig = (tournament.config as Record<string, any>) ?? {};
            const mergedConfig = input.config !== undefined
                ? { ...existingConfig, ...input.config }
                : existingConfig;

            const updatedFeatured = input.featured !== undefined ? input.featured : (tournament as any).featured;
            const updatedExternalChallonge = input.externalChallongeBracketId !== undefined
                ? input.externalChallongeBracketId
                : (tournament as any).externalChallongeBracketId;

            await db.update(TournamentsTable)
                .set({
                    name: input.name,
                    description: input.description,
                    status: input.status,
                    maxParticipants: input.maxParticipants,
                    startDate: input.startDate,
                    featured: updatedFeatured,
                    externalChallongeBracketId: updatedExternalChallonge,
                    config: mergedConfig,
                    updatedAt: new Date(),
                })
                .where(eq(TournamentsTable.id, input.tournamentId));

            return { success: true };
        }
    }),

    /**
     * Assign a player to a team (updates participant teamName)
     */
    assignPlayerToTeam: defineAction({
        input: z.object({
            tournamentId: z.number(),
            userId: z.number(),
            teamName: z.string().nullable(),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });
            if (!user?.admin) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores pueden gestionar equipos' });
            }

            await db.update(TournamentParticipantsTable)
                .set({ teamName: input.teamName })
                .where(and(
                    eq(TournamentParticipantsTable.tournamentId, input.tournamentId),
                    eq(TournamentParticipantsTable.userId, input.userId)
                ));

            return { success: true };
        }
    }),

    /**
     * Update the teams list stored in tournament config
     */
    updateTeamsList: defineAction({
        input: z.object({
            tournamentId: z.number(),
            teams: z.array(z.string().min(1).max(60)),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });
            if (!user?.admin) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores pueden gestionar equipos' });
            }

            const tournament = await db.query.TournamentsTable.findFirst({
                where: eq(TournamentsTable.id, input.tournamentId),
            });
            if (!tournament) throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado' });

            const existingConfig = (tournament.config as Record<string, any>) ?? {};
            await db.update(TournamentsTable)
                .set({ config: { ...existingConfig, teams: input.teams }, updatedAt: new Date() })
                .where(eq(TournamentsTable.id, input.tournamentId));

            return { success: true };
        }
    }),

    /**
     * Upload Tournament Cover Image
     */
    uploadCover: defineAction({
        accept: 'form',
        input: z.object({
            tournamentId: z.number(),
            image: z.instanceof(File),
        }),
        handler: async (input, context) => {
            const session = await getSession(context.request);
            if (!session?.user?.id) throw new ActionError({ code: 'UNAUTHORIZED' });

            // Get user to check if they're admin
            const user = await db.query.UsersTable.findFirst({
                where: eq(UsersTable.id, session.user.id),
            });

            if (!user?.admin) {
                throw new ActionError({ code: 'FORBIDDEN', message: 'Solo administradores pueden subir imágenes' });
            }

            const tournament = await db.query.TournamentsTable.findFirst({
                where: eq(TournamentsTable.id, input.tournamentId),
            });

            if (!tournament) {
                throw new ActionError({ code: 'NOT_FOUND', message: 'Torneo no encontrado' });
            }

            try {
                // Convert File to Buffer
                const arrayBuffer = await input.image.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Upload and optimize image
                const result = await uploadTournamentCover(
                    buffer,
                    input.image.name,
                    input.tournamentId
                );

                // Update tournament with new banner URL
                await db.update(TournamentsTable)
                    .set({
                        bannerUrl: result.url,
                        updatedAt: new Date(),
                    })
                    .where(eq(TournamentsTable.id, input.tournamentId));

                return { success: true, url: result.url };
            } catch (error: any) {
                console.error('Error uploading tournament cover:', error);
                throw new ActionError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error.message || 'Error al subir la imagen',
                });
            }
        }
    }),
};
