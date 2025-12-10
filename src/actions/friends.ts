import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { FriendsTable, UsersTable } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export const friends = {
    sendRequest: defineAction({
        input: z.object({ friendId: z.number() }),
        handler: async ({ friendId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);
            if (userId === friendId) {
                throw new ActionError({ code: "BAD_REQUEST", message: "No puedes enviarte solicitud a ti mismo" });
            }

            // Check if request already exists
            const existing = await client.query.FriendsTable.findFirst({
                where: or(
                    and(eq(FriendsTable.userId, userId), eq(FriendsTable.friendId, friendId)),
                    and(eq(FriendsTable.userId, friendId), eq(FriendsTable.friendId, userId))
                )
            });

            if (existing) {
                if (existing.status === 'accepted') {
                    throw new ActionError({ code: "CONFLICT", message: "Ya son amigos" });
                }
                if (existing.status === 'pending') {
                    throw new ActionError({ code: "CONFLICT", message: "Ya existe una solicitud pendiente" });
                }
                // If blocked or rejected, handle accordingly (omitted for simplicity)
            }

            await client.insert(FriendsTable).values({
                userId,
                friendId,
                status: 'pending'
            });

            return { success: true };
        }
    }),

    acceptRequest: defineAction({
        input: z.object({ requestId: z.number() }),
        handler: async ({ requestId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            const friendRequest = await client.query.FriendsTable.findFirst({
                where: eq(FriendsTable.id, requestId)
            });

            if (!friendRequest) {
                throw new ActionError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });
            }

            if (friendRequest.friendId !== userId) {
                throw new ActionError({ code: "FORBIDDEN", message: "No puedes aceptar esta solicitud" });
            }

            await client.update(FriendsTable)
                .set({ status: 'accepted' })
                .where(eq(FriendsTable.id, requestId));

            return { success: true };
        }
    }),

    rejectRequest: defineAction({
        input: z.object({ requestId: z.number() }),
        handler: async ({ requestId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            const friendRequest = await client.query.FriendsTable.findFirst({
                where: eq(FriendsTable.id, requestId)
            });

            if (!friendRequest) {
                throw new ActionError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });
            }

            if (friendRequest.friendId !== userId) {
                throw new ActionError({ code: "FORBIDDEN", message: "No puedes rechazar esta solicitud" });
            }

            await client.delete(FriendsTable)
                .where(eq(FriendsTable.id, requestId));

            return { success: true };
        }
    }),

    removeFriend: defineAction({
        input: z.object({ friendId: z.number() }),
        handler: async ({ friendId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            await client.delete(FriendsTable)
                .where(or(
                    and(eq(FriendsTable.userId, userId), eq(FriendsTable.friendId, friendId)),
                    and(eq(FriendsTable.userId, friendId), eq(FriendsTable.friendId, userId))
                ));

            return { success: true };
        }
    }),

    getRequests: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                return { requests: [] };
            }

            const userId = Number(session.user.id);

            const requests = await client
                .select({
                    id: FriendsTable.id,
                    createdAt: FriendsTable.createdAt,
                    user: {
                        id: UsersTable.id,
                        displayName: UsersTable.displayName,
                        username: UsersTable.username,
                        avatar: UsersTable.avatar,
                    }
                })
                .from(FriendsTable)
                .innerJoin(UsersTable, eq(FriendsTable.userId, UsersTable.id))
                .where(
                    and(
                        eq(FriendsTable.friendId, userId),
                        eq(FriendsTable.status, "pending")
                    )
                );

            return { requests };
        }
    }),
}
