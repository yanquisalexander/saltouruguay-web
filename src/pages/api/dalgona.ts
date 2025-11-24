import type { APIRoute } from 'astro';
import { games } from '@/utils/streamer-wars';
import { getSession } from 'auth-astro/server';
import { client } from '@/db/client';
import { StreamerWarsPlayersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * API endpoint for Dalgona minigame operations
 * 
 * POST /api/dalgona?action=start - Start the game (admin only)
 * POST /api/dalgona?action=submit - Submit a trace attempt
 * POST /api/dalgona?action=damage - Handle damage event (lose a life)
 * POST /api/dalgona?action=end - End the game (admin only)
 * GET /api/dalgona?action=state - Get current game state
 * GET /api/dalgona?action=player-state - Get current player's game state
 */
export const POST: APIRoute = async ({ request, url }) => {
    const session = await getSession(request);

    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const action = url.searchParams.get('action');

    try {
        switch (action) {
            case 'start': {
                // Only admins can start the game
                if (!session.user.isAdmin) {
                    return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                const gameState = await games.dalgona.startGame();

                return new Response(JSON.stringify({
                    success: true,
                    gameState,
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            case 'submit': {
                // Get player number from user
                const player = await client.query.StreamerWarsPlayersTable.findFirst({
                    where: eq(StreamerWarsPlayersTable.userId, session.user.id),
                });

                if (!player) {
                    return new Response(JSON.stringify({
                        error: 'Player not found',
                    }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                const body = await request.json();
                const { traceData } = body;

                if (!traceData) {
                    return new Response(JSON.stringify({
                        error: 'Missing trace data',
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                const result = await games.dalgona.submitTrace(player.playerNumber, traceData);

                return new Response(JSON.stringify(result), {
                    status: result.success ? 200 : 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            case 'damage': {
                // Get player number from user
                const player = await client.query.StreamerWarsPlayersTable.findFirst({
                    where: eq(StreamerWarsPlayersTable.userId, session.user.id),
                });

                if (!player) {
                    return new Response(JSON.stringify({
                        error: 'Player not found',
                    }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                const result = await games.dalgona.handleDamage(player.playerNumber);

                return new Response(JSON.stringify(result), {
                    status: result.success ? 200 : 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            case 'end': {
                // Only admins can end the game
                if (!session.user.isAdmin) {
                    return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                const result = await games.dalgona.endGame();

                return new Response(JSON.stringify(result), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            default:
                return new Response(JSON.stringify({
                    error: 'Invalid action',
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
        }
    } catch (error) {
        console.error('Dalgona API error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const GET: APIRoute = async ({ request, url }) => {
    const session = await getSession(request);

    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const action = url.searchParams.get('action');

    try {
        switch (action) {
            case 'state': {
                const gameState = await games.dalgona.getGameState();

                return new Response(JSON.stringify({
                    success: true,
                    gameState,
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            case 'player-state': {
                // Get player number from user
                const player = await client.query.StreamerWarsPlayersTable.findFirst({
                    where: eq(StreamerWarsPlayersTable.userId, session.user.id),
                });

                if (!player) {
                    return new Response(JSON.stringify({
                        error: 'Player not found',
                    }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                const gameState = await games.dalgona.getGameState();
                const playerState = gameState.players[player.playerNumber];

                return new Response(JSON.stringify({
                    success: true,
                    playerState: playerState || null,
                    gameStatus: gameState.status,
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            default:
                return new Response(JSON.stringify({
                    error: 'Invalid action',
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
        }
    } catch (error) {
        console.error('Dalgona API error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
