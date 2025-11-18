import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import cacheService from "@/services/cache";
import { pusher } from "@/utils/pusher";
import { AVAILABLE_AUDIOS, type AudioState } from "@/types/audio";

const AUDIO_STATE_KEY = "streamer-wars-audio-states";

const getAudioStates = async (): Promise<Record<string, AudioState>> => {
    try {
        const states = await cacheService.create({}).get(AUDIO_STATE_KEY) as Record<string, AudioState> | null;
        return states || {};
    } catch (error) {
        console.error("Error getting audio states:", error);
        return {};
    }
};

const setAudioStates = async (states: Record<string, AudioState>) => {
    try {
        await cacheService.create({}).set(AUDIO_STATE_KEY, states);
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
                ...states[audioId],
                id: audioId,
                playing: true,
                paused: false,
                volume: states[audioId]?.volume ?? 1,
                loop: states[audioId]?.loop ?? false,
            };

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'UPDATE_STATE', { playing: true, paused: false, loop: states[audioId].loop });

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
            states[audioId].paused = true;

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'UPDATE_STATE', { playing: false, paused: true, loop: states[audioId].loop });

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
            states[audioId].paused = false;
            states[audioId].currentTime = 0;

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'UPDATE_STATE', { playing: false, paused: false, loop: states[audioId].loop });

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
            await emitAudioUpdate(audioId, 'SET_VOLUME', { volume });

            return { success: true };
        }
    }),

    seek: defineAction({
        input: z.object({
            audioId: z.string(),
            position: z.number().min(0),
        }),
        handler: async ({ audioId, position }, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Solo administradores pueden controlar audios"
                });
            }

            const states = await getAudioStates();
            if (!states[audioId]) return { success: true };

            states[audioId].currentTime = position;

            await setAudioStates(states);
            await emitAudioUpdate(audioId, 'RESTART', {});

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
            await emitAudioUpdate(audioId, 'UPDATE_STATE', { playing: states[audioId].playing, paused: states[audioId].paused, loop: enabled });

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

            // Emit update for all
            for (const audioId in states) {
                await emitAudioUpdate(audioId, 'SET_VOLUME', { volume: 0 });
            }

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
                states[audioId].paused = false;
                states[audioId].currentTime = 0;
            }

            await setAudioStates(states);

            // Emit update for all
            for (const audioId in states) {
                await emitAudioUpdate(audioId, 'UPDATE_STATE', { playing: false, paused: false, loop: states[audioId].loop });
            }

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