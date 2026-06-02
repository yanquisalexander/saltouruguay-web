import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { client } from "@/db/client";
import { SaltogramNotesTable, FriendsTable, SaltogramVipListTable } from "@/db/schema";
import { eq, and, or, gt, desc, sql, inArray } from "drizzle-orm";

export const notes = {
    create: defineAction({
        input: z.object({
            text: z.string().max(60).optional(),
            musicUrl: z.string().optional(),
            musicTrackId: z.string().optional(),
            musicTitle: z.string().optional(),
            musicArtist: z.string().optional(),
            musicCover: z.string().optional(),
            visibility: z.enum(["public", "friends", "vip"]).default("public"),
        }),
        handler: async ({ text, musicUrl, musicTrackId, musicTitle, musicArtist, musicCover, visibility }, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = auth.user.id;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

            // Delete existing notes for this user
            await client.delete(SaltogramNotesTable)
                .where(eq(SaltogramNotesTable.userId, userId));

            const [note] = await client.insert(SaltogramNotesTable)
                .values({
                    userId,
                    text,
                    musicUrl,
                    musicTrackId,
                    musicTitle,
                    musicArtist,
                    musicCover,
                    visibility,
                    expiresAt
                })
                .returning();

            return { success: true, note };
        }
    }),

    delete: defineAction({
        handler: async (_, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = auth.user.id;

            await client.delete(SaltogramNotesTable)
                .where(eq(SaltogramNotesTable.userId, userId));

            return { success: true };
        }
    }),

    getFeed: defineAction({
        handler: async (_, { request }) => {
            const auth = await getAuthenticatedUser(request);
            if (!auth) {
                return { notes: [] };
            }

            const userId = auth.user.id;
            const now = new Date();

            // Get friends IDs (needed for "friends" visibility in SQL WHERE)
            const friends = await client.query.FriendsTable.findMany({
                where: and(
                    or(eq(FriendsTable.userId, userId), eq(FriendsTable.friendId, userId)),
                    eq(FriendsTable.status, "accepted")
                )
            });

            const friendIds = friends.map(f => f.userId === userId ? f.friendId : f.userId);

            // WHERE conditions con visibilidad en SQL (no en JS)
            const visibilityConditions: any[] = [
                eq(SaltogramNotesTable.userId, userId),               // Propias
                eq(SaltogramNotesTable.visibility, 'public'),         // Públicas
                sql`(${eq(SaltogramNotesTable.visibility, 'vip')} AND EXISTS (
                    SELECT 1 FROM saltogram_vip_list
                    WHERE user_id = ${SaltogramNotesTable.userId} AND friend_id = ${userId}
                ))`,                                                  // VIP donde el user está en la lista
            ];

            if (friendIds.length > 0) {
                visibilityConditions.push(
                    and(
                        eq(SaltogramNotesTable.visibility, 'friends'),
                        inArray(SaltogramNotesTable.userId, friendIds)
                    )
                );
            }

            const notes = await client.query.SaltogramNotesTable.findMany({
                where: and(
                    or(...visibilityConditions),
                    gt(SaltogramNotesTable.expiresAt, now)
                ),
                with: {
                    user: true
                },
                orderBy: [desc(SaltogramNotesTable.createdAt)]
            });

            return { notes };
        }
    })
};
