import { SALTO_BROADCASTER_ID } from "@/config"
import { appApiClient } from "@/lib/Twitch"
import type { HelixStream } from "@twurple/api"


export const getLiveStream = async (broadcasterId: string): Promise<HelixStream | null> => {
    const stream = await appApiClient.streams.getStreamByUserId(broadcasterId)
    return stream
}

export const getLiveStreams = async (broadcasters: string[]) => {
    const streams = await appApiClient.streams.getStreams({ userName: broadcasters })
    return streams
}