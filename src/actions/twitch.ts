import { defineAction } from "astro:actions";
import { SALTO_BROADCASTER_ID } from "@/config";
import { appApiClient } from "@/lib/Twitch";
import { getLiveStream } from "@/utils/twitch-runtime";
import cacheService from "@/services/cache";

const HOME_FEED_CACHE_TTL_SECONDS = 60;
const HOME_FEED_CACHE_KEY = "twitch:home-feed:v1";
const twitchHomeFeedCache = cacheService.create({ ttl: HOME_FEED_CACHE_TTL_SECONDS });

type TwitchHomeFeed = {
  streamStatus: "live" | "offline" | "unknown";
  stream: {
    title: string;
    gameName: string;
    viewerCount: number;
    previewUrl: string;
    startedAt: string;
  } | null;
  clips: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    url: string;
    viewCount: number;
    durationSeconds: number;
  }>;
};

export const twitch = {
  getHomeFeed: defineAction({
    handler: async (): Promise<TwitchHomeFeed> => {
      const cached = await twitchHomeFeedCache.get<TwitchHomeFeed>(HOME_FEED_CACHE_KEY);
      if (cached) return cached;

      const [streamResult, clipsResult] = await Promise.allSettled([
        getLiveStream(SALTO_BROADCASTER_ID),
        appApiClient.clips.getClipsForBroadcaster(SALTO_BROADCASTER_ID, {
          limit: 6,
        }),
      ]);

      const liveStream =
        streamResult.status === "fulfilled" ? streamResult.value : null;
      const data: TwitchHomeFeed = {
        streamStatus:
          streamResult.status === "rejected"
            ? "unknown"
            : liveStream
              ? "live"
              : "offline",
        stream: liveStream
          ? {
              title: liveStream.title,
              gameName: liveStream.gameName,
              viewerCount: liveStream.viewers,
              previewUrl: liveStream.getThumbnailUrl(1280, 720),
              startedAt: liveStream.startDate.toISOString(),
            }
          : null,
        clips:
          clipsResult.status === "fulfilled"
            ? clipsResult.value.data.map((clip) => ({
                id: clip.id,
                title: clip.title,
                thumbnailUrl: clip.thumbnailUrl,
                url: clip.url,
                viewCount: clip.views,
                durationSeconds: clip.duration,
              }))
            : [],
      };

      await twitchHomeFeedCache.set(HOME_FEED_CACHE_KEY, data);
      return data;
    },
  }),
};