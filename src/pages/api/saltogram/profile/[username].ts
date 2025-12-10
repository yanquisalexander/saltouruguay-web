import type { APIContext } from "astro";
import { client } from "@/db/client";
import { UsersTable, SaltogramPostsTable, FriendsTable } from "@/db/schema";
import { count, eq, and, or } from "drizzle-orm";

export const GET = async ({ params }: APIContext) => {
    const usernameParam = params.username;
    if (!usernameParam) {
        return new Response(JSON.stringify({ error: "Username requerido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const username = usernameParam.toLowerCase();

    const [user] = await client
        .select({
            id: UsersTable.id,
            username: UsersTable.username,
            displayName: UsersTable.displayName,
            avatar: UsersTable.avatar,
            tier: UsersTable.twitchTier,
            admin: UsersTable.admin,
        })
        .from(UsersTable)
        .where(eq(UsersTable.username, username))
        .limit(1);

    if (!user) {
        return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }

    const [postsCount] = await client
        .select({ value: count() })
        .from(SaltogramPostsTable)
        .where(eq(SaltogramPostsTable.userId, user.id));

    const [friendsCountResult] = await client
        .select({ value: count() })
        .from(FriendsTable)
        .where(
            and(
                eq(FriendsTable.status, "accepted"),
                or(
                    eq(FriendsTable.userId, user.id),
                    eq(FriendsTable.friendId, user.id)
                )
            )
        );

    return new Response(
        JSON.stringify({
            user: {
                ...user,
                friendsCount: friendsCountResult?.value ?? 0,
                posts: postsCount?.value ?? 0,
            },
        }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }
    );
};
