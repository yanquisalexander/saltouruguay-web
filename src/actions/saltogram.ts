import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { SaltogramPostsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const saltogram = {
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
