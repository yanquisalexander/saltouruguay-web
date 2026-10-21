import { defineAction } from "astro:actions";
import { SALTO_BROADCASTER_ID } from "@/config";
import { appApiClient } from "@/lib/Twitch";
import { getLiveStream } from "@/utils/twitch-runtime";

const HOME_FEED_CACHE_MS = 60_000;

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

let cachedHomeFeed: { expiresAt: number; data: TwitchHomeFeed } | null = null;

export const twitch = {
  getHomeFeed: defineAction({
    handler: async (): Promise<TwitchHomeFeed> => {
      if (cachedHomeFeed && cachedHomeFeed.expiresAt > Date.now()) {
        return cachedHomeFeed.data;
      }

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

      cachedHomeFeed = {
        expiresAt: Date.now() + HOME_FEED_CACHE_MS,
        data,
      };
      return data;
    },
  }),
};