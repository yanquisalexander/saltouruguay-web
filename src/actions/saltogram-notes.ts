import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { SaltogramNotesTable, FriendsTable, SaltogramVipListTable } from "@/db/schema";
import { eq, and, or, gt, desc } from "drizzle-orm";

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
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);
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
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            await client.delete(SaltogramNotesTable)
                .where(eq(SaltogramNotesTable.userId, userId));

            return { success: true };
        }
    }),

    getFeed: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                return { notes: [] };
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

            // Get VIP lists where current user is a member
            const vipLists = await client.query.SaltogramVipListTable.findMany({
                where: eq(SaltogramVipListTable.friendId, userId)
            });
            const vipCreatorIds = vipLists.map(v => v.userId);

            // Fetch active notes
            const notes = await client.query.SaltogramNotesTable.findMany({
                where: and(
                    or(
                        ...userIdsToFetch.map(id => eq(SaltogramNotesTable.userId, id)),
                        eq(SaltogramNotesTable.visibility, 'public')
                    ),
                    gt(SaltogramNotesTable.expiresAt, now)
                ),
                with: {
                    user: true
                },
                orderBy: [desc(SaltogramNotesTable.createdAt)]
            });

            // Filter by visibility
            const filteredNotes = notes.filter(note => {
                const noteUserId = note.userId;

                // Always show own notes
                if (noteUserId === userId) return true;

                if (note.visibility === 'vip') {
                    return vipCreatorIds.includes(noteUserId);
                }

                if (note.visibility === 'friends') {
                    return friendIds.includes(noteUserId);
                }

                return true; // Public
            });

            return { notes: filteredNotes };
        }
    })
};
