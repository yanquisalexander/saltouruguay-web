import { client } from "@/db/client";
import { SaltogramPostsTable, SaltogramCommentsTable, UsersTable } from "@/db/schema";
import { awardCoins, SALTOGRAM_REWARDS } from "@/services/saltogram-rewards";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";
import { eq, desc } from "drizzle-orm";

const MAX_COMMENT_LENGTH = 500;

/**
 * GET - Get comments for a post
 */
export const GET = async ({ params, url }: APIContext) => {
    const postId = parseInt(params.postId || "");

    if (isNaN(postId)) {
        return new Response(
            JSON.stringify({ error: "ID de publicación inválido" }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    try {
        const comments = await client
            .select({
                id: SaltogramCommentsTable.id,
                text: SaltogramCommentsTable.text,
                parentId: SaltogramCommentsTable.parentId,
                createdAt: SaltogramCommentsTable.createdAt,
                user: {
                    id: UsersTable.id,
                    displayName: UsersTable.displayName,
                    username: UsersTable.username,
                    avatar: UsersTable.avatar,
                    admin: UsersTable.admin,
                    twitchTier: UsersTable.twitchTier,
                },
            })
            .from(SaltogramCommentsTable)
            .innerJoin(UsersTable, eq(SaltogramCommentsTable.userId, UsersTable.id))
            .where(eq(SaltogramCommentsTable.postId, postId))
            .orderBy(desc(SaltogramCommentsTable.createdAt))
            .limit(limit)
            .offset(offset);

        return new Response(JSON.stringify({ comments }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        return new Response(
            JSON.stringify({ error: "Error al cargar los comentarios" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};

/**
 * POST - Add a comment to a post
 */
export const POST = async ({ request, params }: APIContext) => {
    const session = await getSession(request);

    if (!session?.user) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
            status: 401,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    const userId = session.user.id;
    const postId = parseInt(params.postId || "");

    if (isNaN(postId)) {
        return new Response(
            JSON.stringify({ error: "ID de publicación inválido" }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

    try {
        const body = await request.json();
        const { text, parentId } = body;

        if (!text || text.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: "El comentario no puede estar vacío" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        if (text.length > MAX_COMMENT_LENGTH) {
            return new Response(
                JSON.stringify({
                    error: `El comentario no puede exceder ${MAX_COMMENT_LENGTH} caracteres`,
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Check if post exists
        const post = await client
            .select()
            .from(SaltogramPostsTable)
            .where(eq(SaltogramPostsTable.id, postId))
            .limit(1);

        if (!post[0]) {
            return new Response(
                JSON.stringify({ error: "Publicación no encontrada" }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // Create comment
        const [newComment] = await client
            .insert(SaltogramCommentsTable)
            .values({
                postId,
                userId,
                text: text.trim(),
                parentId: parentId || null,
            })
            .returning();

        // Award coins to the post author (if not commenting on own post)
        if (post[0].userId !== userId) {
            await awardCoins(post[0].userId, SALTOGRAM_REWARDS.RECEIVE_COMMENT);
        }

        // Award coins to the commenter
        await awardCoins(userId, SALTOGRAM_REWARDS.ADD_COMMENT);

        // Fetch complete comment with user data
        const [completeComment] = await client
            .select({
                id: SaltogramCommentsTable.id,
                text: SaltogramCommentsTable.text,
                parentId: SaltogramCommentsTable.parentId,
                createdAt: SaltogramCommentsTable.createdAt,
                user: {
                    id: UsersTable.id,
                    displayName: UsersTable.displayName,
                    username: UsersTable.username,
                    avatar: UsersTable.avatar,
                    admin: UsersTable.admin,
                    twitchTier: UsersTable.twitchTier,
                },
            })
            .from(SaltogramCommentsTable)
            .innerJoin(UsersTable, eq(SaltogramCommentsTable.userId, UsersTable.id))
            .where(eq(SaltogramCommentsTable.id, newComment.id));

        return new Response(JSON.stringify({ comment: completeComment }), {
            status: 201,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error creating comment:", error);
        return new Response(
            JSON.stringify({ error: "Error al crear el comentario" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};
