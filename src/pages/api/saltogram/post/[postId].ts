import type { APIContext } from "astro";
import { client } from "@/db/client";
import { SaltogramPostsTable, UsersTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const GET = async ({ params }: APIContext) => {
    const postIdParam = params.postId;
    const postId = Number(postIdParam);

    if (!postIdParam || Number.isNaN(postId)) {
        return new Response(JSON.stringify({ error: "ID inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const posts = await client
        .select({
            id: SaltogramPostsTable.id,
            userId: SaltogramPostsTable.userId,
            text: SaltogramPostsTable.text,
            imageUrl: SaltogramPostsTable.imageUrl,
            isPinned: SaltogramPostsTable.isPinned,
            isFeatured: SaltogramPostsTable.isFeatured,
            featuredUntil: SaltogramPostsTable.featuredUntil,
            metadata: SaltogramPostsTable.metadata,
            createdAt: SaltogramPostsTable.createdAt,
            user: {
                id: UsersTable.id,
                displayName: UsersTable.displayName,
                username: UsersTable.username,
                avatar: UsersTable.avatar,
                admin: UsersTable.admin,
                twitchTier: UsersTable.twitchTier,
            },
            reactionsCount: sql<number>`
                (SELECT COUNT(*)::int FROM saltogram_reactions WHERE post_id = ${SaltogramPostsTable.id})
            `,
            commentsCount: sql<number>`
                (SELECT COUNT(*)::int FROM saltogram_comments WHERE post_id = ${SaltogramPostsTable.id})
            `,
            latestComments: sql<any[]>`
                (
                    SELECT COALESCE(json_agg(c), '[]'::json)
                    FROM (
                        SELECT 
                            sc.id, 
                            sc.text, 
                            sc.created_at as "createdAt",
                            sc.parent_id as "parentId",
                            json_build_object(
                                'id', u.id,
                                'displayName', u.display_name,
                                'username', u.username,
                                'avatar', u.avatar,
                                'admin', u.admin,
                                'twitchTier', u.twitch_tier
                            ) as user
                        FROM saltogram_comments sc
                        JOIN users u ON sc.user_id = u.id
                        WHERE sc.post_id = ${SaltogramPostsTable.id} AND sc.parent_id IS NULL
                        ORDER BY sc.created_at DESC
                        LIMIT 2
                    ) c
                )
            `,
        })
        .from(SaltogramPostsTable)
        .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id))
        .where(eq(SaltogramPostsTable.id, postId))
        .limit(1);

    const post = posts[0];

    if (!post) {
        return new Response(JSON.stringify({ error: "Publicación no encontrada" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ post }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
