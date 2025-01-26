import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type { RESTGetAPIUserResult, Snowflake } from 'discord-api-types/v10'


export const discord = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN ?? '');

export const getDiscordUser = async (userId: string) => {
    if (!userId) return null;
    return discord.get(Routes.user(userId)) as Promise<RESTGetAPIUserResult>;
}

export const addRoleToUser = async (guildId: Snowflake, userId: Snowflake, roleId: Snowflake) => {
    return discord.put(Routes.guildMemberRole(guildId, userId, roleId));
}

export const removeRoleFromUser = async (guildId: Snowflake, userId: Snowflake, roleId: Snowflake) => {
    return discord.delete(Routes.guildMemberRole(guildId, userId, roleId));
}