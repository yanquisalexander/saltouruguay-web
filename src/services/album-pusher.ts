import { pusher } from "@/utils/pusher";
import { PUSHER_CHANNELS_ALBUM, PUSHER_EVENTS_ALBUM } from "@/consts/pusher";
import type { PackTier } from "@/consts/Figuritas";

export const AlbumPusher = {
    packReceived(userId: number, packId: number, tier: PackTier, source: string) {
        return pusher.trigger(PUSHER_CHANNELS_ALBUM.USER(userId), PUSHER_EVENTS_ALBUM.PACK_RECEIVED, {
            packId,
            tier,
            source,
        });
    },

    packOpened(userId: number, packId: number, cards: number[]) {
        return pusher.trigger(PUSHER_CHANNELS_ALBUM.USER(userId), PUSHER_EVENTS_ALBUM.PACK_OPENED, {
            packId,
            cards,
        });
    },
};
