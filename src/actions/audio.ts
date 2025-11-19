import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import cacheService from "@/services/cache";
import { pusher } from "@/utils/pusher";
import { AVAILABLE_AUDIOS, type AudioState } from "@/types/audio";

const AUDIO_STATE_KEY = "streamer-wars-audio-states";

const getAudioStates = async (): Promise<Record<string, AudioState>> => {
    try {
        const cache = cacheService.create({ ttl: 60 * 60 * 24 }); // 24 hours TTL
        const states = await cache.get(AUDIO_STATE_KEY) as Record<string, AudioState> | null;
        return states || {};
    } catch (error) {
        console.error("Error getting audio states:", error);
        return {};
    }
};

const setAudioStates = async (states: Record<string, AudioState>) => {
    try {
        const cache = cacheService.create({ ttl: 60 * 60 * 24 }); // 24 hours TTL
        await cache.set(AUDIO_STATE_KEY, states);
    } catch (error) {
        console.error("Error setting audio states:", error);
    }
};

const emitAudioUpdate = async (audioId: string, action: string, data: any) => {
    await pusher.trigger("streamer-wars", "audio-update", { audioId, action, data });
};

export const audio = {
    play: defineAction({
        input: z.object({
            audioId: z.string(),
        }),
        handler: async ({ audioId }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            const audio = AVAILABLE_AUDIOS.find(a => a.id === audioId);
            if (!audio) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "Audio no encontrado"
                });
            }

            states[audioId] = {
                id: audioId,
                playing: true,
                volume: states[audioId]?.volume ?? 1,
                loop: states[audioId]?.loop ?? false,
            };

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'PLAY', { playing: true, loop: states[audioId].loop, volume: states[audioId].volume });

            return { success: true };
        }
    }),

    pause: defineAction({
        input: z.object({
            audioId: z.string(),
        }),
        handler: async ({ audioId }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            if (!states[audioId]) return { success: true };

            states[audioId].playing = false;

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'PAUSE', { playing: false, loop: states[audioId].loop, volume: states[audioId].volume });

            return { success: true };
        }
    }),

    stop: defineAction({
        input: z.object({
            audioId: z.string(),
        }),
        handler: async ({ audioId }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            if (!states[audioId]) return { success: true };

            states[audioId].playing = false;

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'STOP', { playing: false, loop: states[audioId].loop, volume: states[audioId].volume });

            return { success: true };
        }
    }),

    setVolume: defineAction({
        input: z.object({
            audioId: z.string(),
            volume: z.number().min(0).max(1),
        }),
        handler: async ({ audioId, volume }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            if (!states[audioId]) return { success: true };

            states[audioId].volume = volume;

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'SET_VOLUME', { volume, playing: states[audioId].playing, loop: states[audioId].loop });

            return { success: true };
        }
    }),

    setLoop: defineAction({
        input: z.object({
            audioId: z.string(),
            enabled: z.boolean(),
        }),
        handler: async ({ audioId, enabled }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            if (!states[audioId]) return { success: true };

            states[audioId].loop = enabled;

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'SET_LOOP', { loop: enabled, playing: states[audioId].playing, volume: states[audioId].volume });

            return { success: true };
        }
    }),

    muteAll: defineAction({
        input: z.object({}),
        handler: async ({ }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            for (const audioId in states) {
                states[audioId].volume = 0;
            }

            await setAudioStates(states);

            // Emit single update for all audios
            await pusher.trigger("streamer-wars", "audio-mute-all", {});

            return { success: true };
        }
    }),

    stopAll: defineAction({
        input: z.object({}),
        handler: async ({ }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            for (const audioId in states) {
                states[audioId].playing = false;
            }

            await setAudioStates(states);

            // Emit single update for all audios
            await pusher.trigger("streamer-wars", "audio-stop-all", {});

            return { success: true };
        }
    }),

    getCurrentAudioState: defineAction({
        input: z.object({}),
        handler: async () => {
            const states = await getAudioStates();
            return { states };
        }
    }),
};