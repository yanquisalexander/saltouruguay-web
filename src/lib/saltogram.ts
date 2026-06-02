import { client } from "@/db/client";
import { SaltogramPostsTable, SaltogramReactionsTable } from "@/db/schema";
import { count, desc } from "drizzle-orm";
import cacheService from "@/services/cache";

const CACHE_TTL = 300; // 5 minutos

export const getSaltogramStats = async () => {
    const cache = cacheService.create({ ttl: CACHE_TTL });

    const cached = await cache.get<{ posts: number; likes: number }>("saltogram:stats");
    if (cached) return cached;

    const [postsCount] = await client.select({ count: count() }).from(SaltogramPostsTable);
    const [likesCount] = await client.select({ count: count() }).from(SaltogramReactionsTable);

    const stats = {
        posts: postsCount?.count ?? 0,
        likes: likesCount?.count ?? 0
    };

    await cache.set("saltogram:stats", stats);
    return stats;
}

export const getTrendingTags = async () => {
    const cache = cacheService.create({ ttl: CACHE_TTL });

    const cached = await cache.get<{ tag: string; count: number }[]>("saltogram:trending");
    if (cached) return cached;

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

    const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

    await cache.set("saltogram:trending", sortedTags);
    return sortedTags;
}

/** Invalida los caches de saltogram (stats + trending) */
export const invalidateSaltogramCache = async () => {
    const cache = cacheService.create();
    await Promise.all([
        cache.delete("saltogram:stats"),
        cache.delete("saltogram:trending"),
    ]);
}
