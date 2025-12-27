import { slugify } from "@/lib/utils";
import { createCustomPage, getCustomPages, updateCustomPage } from "@/utils/custom-pages";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { getSession } from "auth-astro/server";


export const customPages = {
    fetchPages: defineAction({
        handler: async (_, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para ver las páginas personalizadas",
                });
            }

            const pages = await getCustomPages();

            return pages
        },
    }),
    createPage: defineAction({
        input: z.object({
            title: z.string(),
            slug: z.string().optional(),
            defaultSlug: z.string(),
        }),
        handler: async (data, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para crear páginas personalizadas",
                });
            }

            const userId = session?.user?.id;
            if (!userId) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No se pudo obtener el usuario para crear la página personalizada",
                });
            }
            const page = await createCustomPage({
                title: data.title,
                permalink: data.slug || data.defaultSlug,
                slug: data.slug || data.defaultSlug,
                content: "{}",
                authorId: userId,
                isDraft: true,
            });

            return page;
        },
    }),
    updatePage: defineAction({
        input: z.object({
            id: z.number(),
            title: z.string(),
            permalink: z.string(),
            content: z.string(),
            isDraft: z.boolean().optional(),
        }),
        handler: async (data, { request }) => {
            const session = await getSession(request);

            if (!session?.user.isAdmin) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No tienes permisos para editar páginas personalizadas",
                });
            }

            const userId = session?.user?.id;
            if (!userId) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "No se pudo obtener el usuario para editar la página personalizada",
                });
            }
            await updateCustomPage({
                id: data.id,
                title: data.title,
                slug: slugify(data.title),
                permalink: data.permalink,
                content: data.content,
                editorId: userId,
                isDraft: typeof data.isDraft === 'boolean' ? data.isDraft : undefined,
            });

            return {
                success: true,
            };
        },
    }),
}