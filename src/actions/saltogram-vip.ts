import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { SaltogramVipListTable, UsersTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const vip = {
    add: defineAction({
        input: z.object({ friendId: z.number() }),
        handler: async ({ friendId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            await client.insert(SaltogramVipListTable)
                .values({ userId, friendId })
                .onConflictDoNothing();

            return { success: true };
        }
    }),

    remove: defineAction({
        input: z.object({ friendId: z.number() }),
        handler: async ({ friendId }, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                throw new ActionError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
            }

            const userId = Number(session.user.id);

            await client.delete(SaltogramVipListTable)
                .where(and(
                    eq(SaltogramVipListTable.userId, userId),
                    eq(SaltogramVipListTable.friendId, friendId)
                ));

            return { success: true };
        }
    }),

    getList: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session?.user?.id) {
                return { vipList: [] };
            }

            const userId = Number(session.user.id);

            const list = await client.query.SaltogramVipListTable.findMany({
                where: eq(SaltogramVipListTable.userId, userId),
                with: {
                    friend: true
                }
            });

            return { vipList: list.map(item => item.friend) };
        }
    })
};
