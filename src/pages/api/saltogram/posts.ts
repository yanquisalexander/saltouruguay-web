import { client } from "@/db/client";
import { SaltogramPostsTable, UsersTable } from "@/db/schema";
import { uploadImage, validateImage } from "@/services/saltogram-storage";
import { awardCoins, SALTOGRAM_REWARDS } from "@/services/saltogram-rewards";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";
import { desc, eq, sql, and, ilike } from "drizzle-orm";

const MAX_TEXT_LENGTH = 500;

/**
 * GET - Get feed posts with pagination
 */
export const GET = async ({ request, url }: APIContext) => {
    const session = await getSession(request);

    // Allow viewing posts without login, but some features may be limited
    const userId = session?.user?.id;

    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sort = searchParams.get("sort") || "recent"; // recent | popular
    const userFilter = searchParams.get("userId");
    const tag = searchParams.get("tag");

    const offset = (page - 1) * limit;

    try {
        // Build the query
        let query = client
            .select({
                id: SaltogramPostsTable.id,
                userId: SaltogramPostsTable.userId,
                text: SaltogramPostsTable.text,
                imageUrl: SaltogramPostsTable.imageUrl,
                isPinned: SaltogramPostsTable.isPinned,
                isFeatured: SaltogramPostsTable.isFeatured,
                featuredUntil: SaltogramPostsTable.featuredUntil,
                createdAt: SaltogramPostsTable.createdAt,
                user: {
                    id: UsersTable.id,
                    displayName: UsersTable.displayName,
                    username: UsersTable.username,
                    avatar: UsersTable.avatar,
                },
                reactionsCount: sql<number>`
                    (SELECT COUNT(*)::int FROM saltogram_reactions WHERE post_id = ${SaltogramPostsTable.id})
                `,
                commentsCount: sql<number>`
                    (SELECT COUNT(*)::int FROM saltogram_comments WHERE post_id = ${SaltogramPostsTable.id})
                `,
            })
            .from(SaltogramPostsTable)
            .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id));

        // Build where conditions
        const conditions = [eq(SaltogramPostsTable.isHidden, false)];

        if (userFilter) {
            conditions.push(eq(SaltogramPostsTable.userId, parseInt(userFilter)));
        }

        if (tag) {
            conditions.push(ilike(SaltogramPostsTable.text, `%#${tag}%`));
        }

        query = query.where(and(...conditions));

        // Apply sorting
        if (sort === "popular") {
            // Sort by reactions + comments count
            query = query.orderBy(
                desc(sql`
                    (SELECT COUNT(*) FROM saltogram_reactions WHERE post_id = ${SaltogramPostsTable.id}) +
                    (SELECT COUNT(*) FROM saltogram_comments WHERE post_id = ${SaltogramPostsTable.id})
                `)
            );
        } else {
            // Sort by pinned first, then featured, then by creation date
            query = query.orderBy(
                desc(SaltogramPostsTable.isPinned),
                desc(SaltogramPostsTable.isFeatured),
                desc(SaltogramPostsTable.createdAt)
            );
        }

        const posts = await query.limit(limit).offset(offset);

        return new Response(JSON.stringify({ posts }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        return new Response(
            JSON.stringify({ error: "Error al cargar las publicaciones" }),
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
 * POST - Create a new post
 */
export const POST = async ({ request }: APIContext) => {
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

    try {
        const formData = await request.formData();
        const text = formData.get("text") as string | null;
        const image = formData.get("image") as File | null;

        // Validate text length
        if (text && text.length > MAX_TEXT_LENGTH) {
            return new Response(
                JSON.stringify({
                    error: `El texto no puede exceder ${MAX_TEXT_LENGTH} caracteres`,
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // At least one of text or image must be provided
        if (!text && !image) {
            return new Response(
                JSON.stringify({
                    error: "Debes proporcionar texto o una imagen",
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        let imageUrl: string | null = null;

        // Handle image upload if provided
        if (image) {
            const imageBuffer = Buffer.from(await image.arrayBuffer());

            // Validate image
            await validateImage(imageBuffer);

            // Upload image
            const uploadResult = await uploadImage(
                imageBuffer,
                image.name,
                userId
            );
            imageUrl = uploadResult.url;
        }

        // Create post
        const [newPost] = await client
            .insert(SaltogramPostsTable)
            .values({
                userId,
                text,
                imageUrl,
            })
            .returning();

        // Award coins for creating post
        await awardCoins(userId, SALTOGRAM_REWARDS.CREATE_POST);

        // Fetch the complete post with user data
        const [completePost] = await client
            .select({
                id: SaltogramPostsTable.id,
                userId: SaltogramPostsTable.userId,
                text: SaltogramPostsTable.text,
                imageUrl: SaltogramPostsTable.imageUrl,
                isPinned: SaltogramPostsTable.isPinned,
                isFeatured: SaltogramPostsTable.isFeatured,
                createdAt: SaltogramPostsTable.createdAt,
                user: {
                    id: UsersTable.id,
                    displayName: UsersTable.displayName,
                    username: UsersTable.username,
                    avatar: UsersTable.avatar,
                },
            })
            .from(SaltogramPostsTable)
            .innerJoin(UsersTable, eq(SaltogramPostsTable.userId, UsersTable.id))
            .where(eq(SaltogramPostsTable.id, newPost.id));

        return new Response(
            JSON.stringify({
                post: {
                    ...completePost,
                    reactionsCount: 0,
                    commentsCount: 0,
                },
            }),
            {
                status: 201,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Error creating post:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Error al crear la publicación";
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
};
