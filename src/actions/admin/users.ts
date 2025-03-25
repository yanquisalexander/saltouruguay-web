import { broadcastToAudience, sendNotificationEmail } from "@/utils/email";
import { getAllUserEmails, getUsers } from "@/utils/user";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";

export const users = {
    getUsers: defineAction({
        input: z.object({
            page: z.number().optional(),
            search: z.string().optional(),
            limit: z.number().optional().default(15)
        }),
        handler: async ({ page, search, limit }, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver los usuarios"
                })
            }

            if (!session.user.isAdmin) {
                throw new ActionError({
                    code: "FORBIDDEN",
                    message: "No tienes permisos para ver los usuarios"
                })
            }

            const users = await getUsers({ page, search, limit });
            console.log("Users: ", users);
            return users;
        }
    }),
    sendEmails: defineAction({
        input: z.object({
            emails: z.union([z.string(), z.array(z.string())]),
            template: z.string().optional(),
            title: z.string().optional(),
            body: z.string().optional(),
            forAllUsers: z.boolean().optional().default(false)
        }),
        handler: async ({ emails, template, title, body, forAllUsers }, { request }) => {

            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para enviar correos electrónicos"
                })
            }
            if (!title || !body) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "El título y el cuerpo del correo electrónico son obligatorios"
                });
            }

            if (forAllUsers) {
                emails = await getAllUserEmails();
                if (!emails || emails.length === 0) {
                    throw new ActionError({
                        code: "NOT_FOUND",
                        message: "No se encontraron correos electrónicos"
                    });
                }
            } else if (!emails || emails.length === 0) {
                throw new ActionError({
                    code: "BAD_REQUEST",
                    message: "Debes proporcionar al menos un correo electrónico"
                });
            }

            if (forAllUsers) {
                await broadcastToAudience(title, body);
                return { success: true };
            }

            await sendNotificationEmail(emails, title, body);
            return { success: true };
        }
    }),
    getAllUserEmails: defineAction({
        handler: async (__dirname, { request }) => {
            const session = await getSession(request);
            if (!session || !session.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "Debes iniciar sesión para ver los correos electrónicos"
                })
            }
            const emails = await getAllUserEmails();
            return emails;
        }
    })
}