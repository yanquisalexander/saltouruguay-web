import { client } from "@/db/client";
import { SaltogramPostsTable, SaltogramReactionsTable } from "@/db/schema";
import { count, desc } from "drizzle-orm";

export const getSaltogramStats = async () => {
    const [postsCount] = await client.select({ count: count() }).from(SaltogramPostsTable);
    const [likesCount] = await client.select({ count: count() }).from(SaltogramReactionsTable);

    return {
        posts: postsCount?.count ?? 0,
        likes: likesCount?.count ?? 0
    };
}

export const getTrendingTags = async () => {
    // Fetch recent posts (e.g. last 100) to extract tags
    const posts = await client.query.SaltogramPostsTable.findMany({
        limit: 100,
        orderBy: [desc(SaltogramPostsTable.createdAt)],
        columns: {
            text: true
        }
    });

    const tagCounts: Record<string, number> = {};

    posts.forEach(post => {
        if (!post.text) return;
        const tags = post.text.match(/#[a-zA-Z0-9_]+/g);
        if (tags) {
            tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    // Sort by count
    const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

    return sortedTags;
}
