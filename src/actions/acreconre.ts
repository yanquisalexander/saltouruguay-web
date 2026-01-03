import { SALTO_DISCORD_GUILD_ID } from "@/config";
import { client } from "@/db/client";
import { AcreconreMembersTable } from "@/db/schema";
import { addRoleToUserWithoutLogging } from "@/services/discord";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";
import { eq } from "drizzle-orm";

const ROLE_ACRECONRE = "1457138932314669068";

export const acreconre = {
    inscribe: defineAction({
        input: z.object({
            discordUsername: z.string().min(1, "El usuario de Discord es requerido"),
            platformType: z.enum(["twitch", "other"]),
            platformName: z.string().optional(),
            canalName: z.string().min(1, "El nombre del canal es requerido"),
            canalLink: z.string().url().optional(),
            acceptedTerms: z.boolean().refine(v => v === true, { message: "Debes aceptar los términos y condiciones" }),
        }),
        handler: async (input, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para inscribirte"
                });
            }

            // Verificar si ya está inscripto
            const existing = await client
                .select()
                .from(AcreconreMembersTable)
                .where(eq(AcreconreMembersTable.userId, session.user.id))
                .execute()
                .then(res => res[0]);

            if (existing) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "Ya estás inscripto en ACRECONRE"
                });
            }

            try {
                await client.insert(AcreconreMembersTable).values({
                    userId: session.user.id as number,
                    email: session.user.email!,
                    discordUsername: input.discordUsername,
                    platformType: input.platformType,
                    platformName: input.platformName || (input.platformType === "twitch" ? "Twitch" : "Other"),
                    canalName: input.canalName,
                    canalLink: input.canalLink,
                    status: "pending"
                }).execute();

                // Agregar rol de Discord si tiene discordId
                if (session.user.discordId) {
                    await addRoleToUserWithoutLogging(SALTO_DISCORD_GUILD_ID, session.user.discordId!, ROLE_ACRECONRE).catch(err => {
                        console.error("Error adding Discord role:", err);
                    });
                }

                return { success: true };
            } catch (error) {
                console.error("Error in ACRECONRE inscription:", error);
                throw new ActionError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error al procesar la inscripción"
                });
            }
        }
    }),
    getMembers: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);
            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para ver los miembros"
                });
            }

            return await client
                .select()
                .from(AcreconreMembersTable)
                .orderBy(AcreconreMembersTable.createdAt)
                .execute();
        }
    }),
    updateStatus: defineAction({
        input: z.object({
            memberId: z.number(),
            status: z.enum(["pending", "approved", "rejected"])
        }),
        handler: async ({ memberId, status }, { request }) => {
            const session = await getSession(request);
            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para realizar esta acción"
                });
            }

            await client
                .update(AcreconreMembersTable)
                .set({ status, updatedAt: new Date() })
                .where(eq(AcreconreMembersTable.id, memberId))
                .execute();

            return { success: true };
        }
    })
};
