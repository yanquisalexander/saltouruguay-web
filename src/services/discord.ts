import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import type { RESTGetAPIUserResult, Snowflake } from 'discord-api-types/v10'

export const discord = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN ?? '');

export const MODERATOR_ROLE = "772061051004256277";

export const WEB_NOTIFICATIONS_CHANNEL = "1334693116254355581";

export const DISCORD_ROLES = {
    EQUIPO_AZUL: "1329803075778515017",
    EQUIPO_ROJO: "1329803327596138528",
    EQUIPO_AMARILLO: "1333158112533680128",
    EQUIPO_MORADO: "1329803409519542302",
    EQUIPO_BLANCO: "1329803479992242237",

}

export const ROLE_GUERRA_STREAMERS = "1326980362127020072"

export const sendDiscordEmbed = async (channelId: Snowflake, data: any) => {
    return discord.post(Routes.channelMessages(channelId), data);
}

export const sendErrorToAddRole = async (channelId: Snowflake, userId: Snowflake, roleId: Snowflake) => {
    return sendDiscordEmbed(channelId, {
        content: `<@&${MODERATOR_ROLE}>`,
        embeds: [
            {
                title: "Error al agregar rol",
                color: 2354035,
                description: `Ocurrió un error al agregar el rol <@&${roleId}> al usuario <@${userId}>`,
                fields: [
                    {
                        name: "Usuario",
                        value: `<@${userId}>`,
                        inline: true
                    },
                    {
                        name: "Rol",
                        value: `<@&${roleId}>`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString(),

            }
        ]
    });
}

export const sendErrorToRemoveRole = async (channelId: Snowflake, userId: Snowflake, roleId: Snowflake) => {
    return sendDiscordEmbed(channelId, {
        content: `<@&${MODERATOR_ROLE}>`,
        embeds: [
            {
                title: "Error al remover rol",
                color: 2354035,
                description: `Ocurrió un error al remover el rol <@&${roleId}> al usuario <@${userId}>`,
                fields: [
                    {
                        name: "Usuario",
                        value: `<@${userId}>`,
                        inline: true
                    },
                    {
                        name: "Rol",
                        value: `<@&${roleId}>`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString(),

            }
        ]
    });
}

export const getDiscordUser = async (userId: string) => {
    if (!userId) return null;
    return discord.get(Routes.user(userId)) as Promise<RESTGetAPIUserResult>;
}

export const getGuildMember = async (guildId: Snowflake, userId: Snowflake) => {
    return discord.get(Routes.guildMember(guildId, userId))
}

export const addRoleToUser = async (guildId: Snowflake, userId: Snowflake, roleId: Snowflake) => {
    try {
        return discord.put(Routes.guildMemberRole(guildId, userId, roleId))
    } catch (error) {

        await sendErrorToAddRole(WEB_NOTIFICATIONS_CHANNEL, userId, roleId);
    }
}



export const removeRoleFromUser = async (guildId: Snowflake, userId: Snowflake, roleId: Snowflake) => {
    try {
        return discord.delete(Routes.guildMemberRole(guildId, userId, roleId))
    } catch (error) {
        await sendErrorToRemoveRole(WEB_NOTIFICATIONS_CHANNEL, userId, roleId);
    }
}