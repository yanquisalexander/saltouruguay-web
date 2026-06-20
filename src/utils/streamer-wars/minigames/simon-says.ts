import { pusher } from "@/utils/pusher";
import { LOGS_CHANNEL_WEBHOOK_ID, sendWebhookMessage } from "@/services/discord";
import { DISCORD_LOGS_WEBHOOK_TOKEN } from "astro:env/server";
import { getTranslation } from "@/utils/translate";
import { PUSHER_CHANNELS, PUSHER_EVENTS_SIMON } from "@/consts/pusher";

import type { SimonSaysGameState } from "../types";
import { CACHE_KEY_SIMON_SAYS, COLORS } from "../constants";
import { createCache } from "../cache";
import { getRandomItem } from "../utils";

const LUA_COMPLETE_PATTERN = `
local state = cjson.decode(redis.call('GET', KEYS[1]))
if not state then return cjson.encode({ error = 'no_state' }) end
if state.status ~= 'playing' then return cjson.encode({ error = 'not_playing' }) end

local pn = tonumber(ARGV[1])

for _, cp in ipairs(state.completedPlayers) do
    if cp == pn then return cjson.encode({ error = 'already_completed' }) end
end

table.insert(state.completedPlayers, pn)

local allCompleted = true
for _, player in pairs(state.currentPlayers) do
    if player ~= nil then
        local found = false
        for _, cp in ipairs(state.completedPlayers) do
            if cp == player then found = true; break end
        end
        if not found then allCompleted = false; break end
    end
end

if allCompleted then
    local time = redis.call('TIME')
    math.randomseed(tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000))
    local colors = { 'red', 'blue', 'green', 'yellow' }
    state.currentRound = state.currentRound + 1
    state.pattern[#state.pattern + 1] = colors[math.random(#colors)]
    state.completedPlayers = {}
end

redis.call('SET', KEYS[1], cjson.encode(state))
return cjson.encode({ state = state, allCompleted = allCompleted })
`;

const LUA_PATTERN_FAILED = `
local state = cjson.decode(redis.call('GET', KEYS[1]))
if not state then return cjson.encode({ error = 'no_state' }) end
if state.status ~= 'playing' then return cjson.encode({ error = 'not_playing' }) end

local pn = tonumber(ARGV[1])

local alreadyEliminated = false
for _, ep in ipairs(state.eliminatedPlayers) do
    if ep == pn then alreadyEliminated = true; break end
end
if not alreadyEliminated then
    table.insert(state.eliminatedPlayers, pn)
end

for _, player in pairs(state.currentPlayers) do
    if player ~= nil then
        local found = false
        for _, p in ipairs(state.playerWhoAlreadyPlayed) do
            if p == player then found = true; break end
        end
        if not found then
            table.insert(state.playerWhoAlreadyPlayed, player)
        end
    end
end

state.status = 'waiting'
redis.call('SET', KEYS[1], cjson.encode(state))
return cjson.encode(state)
`;

const LUA_ADVANCE_ROUND = `
local state = cjson.decode(redis.call('GET', KEYS[1]))
if not state then return cjson.encode({ error = 'no_state' }) end

local time = redis.call('TIME')
math.randomseed(tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000))
local colors = { 'red', 'blue', 'green', 'yellow' }
state.pattern[#state.pattern + 1] = colors[math.random(#colors)]
state.currentRound = state.currentRound + 1
state.completedPlayers = {}
state.status = 'playing'

redis.call('SET', KEYS[1], cjson.encode(state))
return cjson.encode(state)
`;

export const getGameState = async (): Promise<SimonSaysGameState> => {
    const cache = createCache();
    return (
        (await cache.get<SimonSaysGameState>(CACHE_KEY_SIMON_SAYS)) ?? {
            teams: {},
            currentRound: 0,
            currentPlayers: {},
            pattern: [],
            eliminatedPlayers: [],
            status: "waiting",
            completedPlayers: [],
            playerWhoAlreadyPlayed: [],
        }
    );
};

export const generateNextPattern = async (): Promise<string[]> => {
    const gameState = await getGameState();
    const nextColor = getRandomItem(COLORS);
    return [...gameState.pattern, nextColor];
};

export const startGame = async (teams: Record<string, { players: number[] }>) => {
    const cache = createCache();

    const currentPlayers = Object.fromEntries(
        Object.entries(teams)
            .map(([team, data]) => {
                const chosenPlayer = data.players.length > 0 ? getRandomItem(data.players) : null;
                return [team, chosenPlayer];
            })
            .filter(([, chosenPlayer]) => chosenPlayer !== null)
    );

    const patternFirstColor = getRandomItem(COLORS);

    const newGameState: SimonSaysGameState = {
        teams,
        currentRound: 1,
        currentPlayers,
        pattern: [patternFirstColor],
        eliminatedPlayers: [],
        status: "playing",
        completedPlayers: [],
        playerWhoAlreadyPlayed: [],
    };

    await cache.set(CACHE_KEY_SIMON_SAYS, newGameState);
    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.GAME_STATE, newGameState);
    return newGameState;
};

export const completePattern = async (playerNumber: number) => {
    const cache = createCache();

    const result = await cache.eval<{ error?: string; state?: SimonSaysGameState; allCompleted?: boolean }>(
        LUA_COMPLETE_PATTERN,
        [CACHE_KEY_SIMON_SAYS],
        [playerNumber]
    );

    if (result.error) {
        console.error(`completePattern error for player ${playerNumber}: ${result.error}`);
        return;
    }

    const newGameState = result.state!;

    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.COMPLETED_PATTERN, {
        playerNumber,
    });

    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.GAME_STATE, newGameState);

    try {
        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
            content: null,
            embeds: [
                {
                    title: "Patrón completado",
                    description: `El jugador **#${playerNumber}** ha completado el patrón de Simon Says.`,
                    color: 0x00ff00,
                    fields: [
                        {
                            name: "Equipo",
                            value: getTranslation(Object.entries(newGameState.currentPlayers).find(([team, player]) => player === playerNumber)?.[0]!) ?? "Sin equipo",
                            inline: true,
                        },
                        {
                            name: "Ronda",
                            value: newGameState.currentRound.toString(),
                            inline: true,
                        },
                        {
                            name: "Completaron",
                            value: `${newGameState.completedPlayers.length} de ${Object.values(newGameState.currentPlayers).filter(player => player !== null).length}`,
                            inline: true,
                        }
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error sending Discord webhook:", error);
    }
};

export const patternFailed = async (playerNumber: number) => {
    const cache = createCache();

    const result = await cache.eval<{ error?: string; state?: SimonSaysGameState }>(
        LUA_PATTERN_FAILED,
        [CACHE_KEY_SIMON_SAYS],
        [playerNumber]
    );

    if (result.error) {
        console.error(`patternFailed error for player ${playerNumber}: ${result.error}`);
        return;
    }

    const newGameState = result.state!;

    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.PATTERN_FAILED, {
        playerNumber,
    });
    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.GAME_STATE, newGameState);

    try {
        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
            content: null,
            embeds: [
                {
                    title: "Patrón fallado",
                    description: `El jugador ${playerNumber} ha fallado el patrón de Simon Says y ha sido eliminado.`,
                    color: 0xff0000,
                },
            ],
        });
    } catch (error) {
        console.error("Error sending Discord webhook:", error);
    }

    const { eliminatePlayer } = await import('../../streamer-wars');
    await eliminatePlayer(playerNumber);
    return newGameState;
};

export const advanceToNextRoundForCurrentPlayers = async () => {
    const cache = createCache();

    const result = await cache.eval<{ error?: string; state?: SimonSaysGameState }>(
        LUA_ADVANCE_ROUND,
        [CACHE_KEY_SIMON_SAYS],
        []
    );

    if (result.error) {
        console.error(`advanceToNextRoundForCurrentPlayers error: ${result.error}`);
        return;
    }

    const newGameState = result.state!;

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.GAME_STATE, newGameState);

    try {
        await sendWebhookMessage(LOGS_CHANNEL_WEBHOOK_ID, DISCORD_LOGS_WEBHOOK_TOKEN, {
            content: null,
            embeds: [
                {
                    title: "Siguiente ronda",
                    description: `Se ha avanzado a la ronda ${newGameState.currentRound} de Simón Dice.`,
                    color: 15267327,
                },
            ],
        });
    } catch (error) {
        console.error("Error sending Discord webhook:", error);
    }
    return newGameState;
};

export const nextRoundWithOtherPlayers = async () => {
    const cache = createCache();

    const result = await cache.eval<{ error?: string; state?: SimonSaysGameState }>(
        LUA_NEXT_ROUND_WITH_OTHER_PLAYERS,
        [CACHE_KEY_SIMON_SAYS],
        []
    );

    if (result.error) {
        console.error(`nextRoundWithOtherPlayers error: ${result.error}`);
        return;
    }

    const newGameState = result.state!;

    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.GAME_STATE, newGameState);
    return newGameState;
};

const LUA_NEXT_ROUND_WITH_OTHER_PLAYERS = `
local state = cjson.decode(redis.call('GET', KEYS[1]))
if not state then return cjson.encode({ error = 'no_state' }) end

local time = redis.call('TIME')
math.randomseed(tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000))

local colors = { 'red', 'blue', 'green', 'yellow' }

local newCurrentPlayers = {}
for team, data in pairs(state.teams) do
    local available = {}
    for _, player in ipairs(data.players) do
        local skip = false
        for _, ap in ipairs(state.playerWhoAlreadyPlayed) do
            if ap == player then skip = true; break end
        end
        if not skip then
            for _, ep in ipairs(state.eliminatedPlayers) do
                if ep == player then skip = true; break end
            end
        end
        if not skip then
            table.insert(available, player)
        end
    end
    if #available > 0 then
        newCurrentPlayers[team] = available[math.random(#available)]
    end
end

state.currentRound = 1
state.currentPlayers = newCurrentPlayers
state.pattern = { colors[math.random(#colors)] }
state.completedPlayers = {}
state.status = 'playing'

redis.call('SET', KEYS[1], cjson.encode(state))
return cjson.encode({ state = state })
`;

const LUA_EXTERNAL_ELIMINATION = `
local state = cjson.decode(redis.call('GET', KEYS[1]))
if not state or state.status ~= 'playing' then
    return cjson.encode({ ok = false })
end

local pn = tonumber(ARGV[1])

local newCurrentPlayers = {}
for team, player in pairs(state.currentPlayers) do
    if player ~= pn then
        newCurrentPlayers[team] = player
    end
end
state.currentPlayers = newCurrentPlayers

local alreadyEliminated = false
for _, ep in ipairs(state.eliminatedPlayers) do
    if ep == pn then alreadyEliminated = true; break end
end
if not alreadyEliminated then
    table.insert(state.eliminatedPlayers, pn)
end

state.status = 'waiting'
redis.call('SET', KEYS[1], cjson.encode(state))
return cjson.encode({ ok = true, state = state })
`;

export const handleExternalElimination = async (playerNumber: number) => {
    const cache = createCache();

    const result = await cache.eval<{ ok: boolean; state?: SimonSaysGameState }>(
        LUA_EXTERNAL_ELIMINATION,
        [CACHE_KEY_SIMON_SAYS],
        [playerNumber]
    );

    if (!result.ok) return;

    await pusher.trigger(PUSHER_CHANNELS.SIMON_SAYS, PUSHER_EVENTS_SIMON.GAME_STATE, result.state!);
};
