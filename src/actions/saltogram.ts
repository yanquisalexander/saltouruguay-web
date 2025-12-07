import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { SaltogramPostsTable, UsersTable } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";

export const saltogram = {
    searchUsers: defineAction({
        input: z.object({ query: z.string().min(1) }),
        handler: async ({ query }, { request }) => {
            const session = await getSession(request);
            if (!session?.user) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            const users = await client
                .select({
                    id: UsersTable.id,
                    username: UsersTable.username,
                    displayName: UsersTable.displayName,
                    avatar: UsersTable.avatar,
                })
                .from(UsersTable)
                .where(
                    or(
                        ilike(UsersTable.username, `%${query}%`),
                        ilike(UsersTable.displayName, `%${query}%`)
                    )
                )
                .limit(5);

            return { users };
        }
    }),
    togglePin: defineAction({
        input: z.object({ postId: z.number() }),
        handler: async ({ postId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.isAdmin) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            const post = await client.query.SaltogramPostsTable.findFirst({
                where: eq(SaltogramPostsTable.id, postId)
            });

            if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Post no encontrado" });

            const newStatus = !post.isPinned;

            await client.update(SaltogramPostsTable)
                .set({ isPinned: newStatus })
                .where(eq(SaltogramPostsTable.id, postId));

            return { success: true, isPinned: newStatus };
        }
    }),
    toggleFeature: defineAction({
        input: z.object({ postId: z.number() }),
        handler: async ({ postId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.isAdmin) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            const post = await client.query.SaltogramPostsTable.findFirst({
                where: eq(SaltogramPostsTable.id, postId)
            });

            if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Post no encontrado" });

            const newStatus = !post.isFeatured;

            await client.update(SaltogramPostsTable)
                .set({ isFeatured: newStatus })
                .where(eq(SaltogramPostsTable.id, postId));

            return { success: true, isFeatured: newStatus };
        }
    }),
    deletePost: defineAction({
        input: z.object({ postId: z.number() }),
        handler: async ({ postId }, { request }) => {
            const session = await getSession(request);

            const post = await client.query.SaltogramPostsTable.findFirst({
                where: eq(SaltogramPostsTable.id, postId)
            });

            if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Post no encontrado" });

            if (!session?.user?.isAdmin && Number(session?.user?.id) !== post.userId) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "No autorizado" });
            }

            await client.delete(SaltogramPostsTable)
                .where(eq(SaltogramPostsTable.id, postId));

            return { success: true };
        }
    })
}
