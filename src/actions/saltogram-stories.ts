import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { SaltogramStoriesTable, SaltogramStoryViewsTable, SaltogramStoryLikesTable, FriendsTable, UsersTable } from "@/db/schema";
import { eq, and, or, gt, desc, sql } from "drizzle-orm";

export const stories = {
    create: defineAction({
        input: z.object({
            mediaUrl: z.string().url(),
            mediaType: z.enum(["image", "video"]),
            duration: z.number().min(1).max(60).default(5),
        }),
        handler: async ({ mediaUrl, mediaType, duration }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

            const [story] = await client.insert(SaltogramStoriesTable)
                .values({
                    userId,
                    mediaUrl,
                    mediaType,
                    duration,
                    expiresAt
                })
                .returning();

            return { success: true, story };
        }
    }),

    getFeed: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                return { stories: [] };
            }

            const userId = Number(session.user.id);
            const now = new Date();

            // Get friends IDs
            const friends = await client.query.FriendsTable.findMany({
                where: and(
                    or(eq(FriendsTable.userId, userId), eq(FriendsTable.friendId, userId)),
                    eq(FriendsTable.status, "accepted")
                )
            });

            const friendIds = friends.map(f => f.userId === userId ? f.friendId : f.userId);
            const userIdsToFetch = [userId, ...friendIds];

            // Fetch active stories
            const stories = await client.query.SaltogramStoriesTable.findMany({
                where: and(
                    or(...userIdsToFetch.map(id => eq(SaltogramStoriesTable.userId, id))),
                    gt(SaltogramStoriesTable.expiresAt, now)
                ),
                with: {
                    user: true,
                    views: {
                        where: eq(SaltogramStoryViewsTable.userId, userId)
                    },
                    likes: true
                },
                orderBy: [desc(SaltogramStoriesTable.createdAt)]
            });

            // Group by user
            const storiesByUser = stories.reduce((acc, story) => {
                const storyUserId = story.userId;
                if (!acc[storyUserId]) {
                    acc[storyUserId] = {
                        user: story.user,
                        stories: [],
                        hasUnseen: false
                    };
                }

                const isSeen = story.views.length > 0;
                if (!isSeen) acc[storyUserId].hasUnseen = true;

                acc[storyUserId].stories.push({
                    ...story,
                    isSeen,
                    isLiked: story.likes.some(l => l.userId === userId),
                    likesCount: story.likes.length
                });
                return acc;
            }, {} as Record<number, any>);

            // Sort: Users with unseen stories first, then by latest story
            const sortedFeed = Object.values(storiesByUser).sort((a: any, b: any) => {
                if (a.hasUnseen && !b.hasUnseen) return -1;
                if (!a.hasUnseen && b.hasUnseen) return 1;
                return 0;
            });

            // Put current user first if they have stories
            const myStoriesIndex = sortedFeed.findIndex((s: any) => s.user.id === userId);
            if (myStoriesIndex > 0) {
                const myStories = sortedFeed.splice(myStoriesIndex, 1)[0];
                sortedFeed.unshift(myStories);
            }

            return { feed: sortedFeed };
        }
    }),

    view: defineAction({
        input: z.object({ storyId: z.number() }),
        handler: async ({ storyId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) return;

            const userId = Number(session.user.id);

            await client.insert(SaltogramStoryViewsTable)
                .values({ storyId, userId })
                .onConflictDoNothing()
                .execute();

            return { success: true };
        }
    }),

    toggleLike: defineAction({
        input: z.object({ storyId: z.number() }),
        handler: async ({ storyId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            const existing = await client.query.SaltogramStoryLikesTable.findFirst({
                where: and(
                    eq(SaltogramStoryLikesTable.storyId, storyId),
                    eq(SaltogramStoryLikesTable.userId, userId)
                )
            });

            if (existing) {
                await client.delete(SaltogramStoryLikesTable)
                    .where(eq(SaltogramStoryLikesTable.id, existing.id));
                return { liked: false };
            } else {
                await client.insert(SaltogramStoryLikesTable)
                    .values({ storyId, userId });
                return { liked: true };
            }
        }
    }),

    delete: defineAction({
        input: z.object({ storyId: z.number() }),
        handler: async ({ storyId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            const story = await client.query.SaltogramStoriesTable.findFirst({
                where: eq(SaltogramStoriesTable.id, storyId)
            });

            if (!story) throw new ActionError({ code: "NOT_FOUND", message: "Historia no encontrada" });
            if (story.userId !== userId && !session.user.isAdmin) {
                throw new ActionError({ code: "FORBIDDEN", message: "No tienes permiso" });
            }

            await client.delete(SaltogramStoriesTable)
                .where(eq(SaltogramStoriesTable.id, storyId));

            return { success: true };
        }
    })
};
