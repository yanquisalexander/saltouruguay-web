import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type { RESTGetAPIUserResult, Snowflake } from 'discord-api-types/v10'

export const discord = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN ?? '');

export const DISCORD_ROLES = {
    EQUIPO_AZUL: "1329803075778515017",
    EQUIPO_ROJO: "1329803327596138528",
    EQUIPO_AMARILLO: "1333158112533680128",
    EQUIPO_MORADO: "1329803409519542302",
    EQUIPO_BLANCO: "1329803479992242237",

}

export const ROLE_GUERRA_STREAMERS = "1326980362127020072"

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