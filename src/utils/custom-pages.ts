import { client } from "@/db/client";
import { CustomPagesTable, CustomPageHistoryTable } from "@/db/schema";
import { renderEditorJsToHtml } from "@/utils/editorjs-html";
import { desc, eq } from "drizzle-orm";

export const getCustomPages = async () => {
    const customPages = await client
        .select()
        .from(CustomPagesTable)
        .orderBy(desc(CustomPagesTable.createdAt))

    return customPages;
};

export const getCustomPageBySlug = async (slug: string) => {
    const customPage = await client
        .select()
        .from(CustomPagesTable)
        .where(eq(CustomPagesTable.slug, slug))
        .limit(1)
        .then((res) => res[0]);

    return customPage;
};

export const getCustomPageByPermalink = async (permalink: string) => {
    const customPage = await client
        .select()
        .from(CustomPagesTable)
        .where(eq(CustomPagesTable.permalink, permalink))
        .limit(1)
        .then((res) => res[0]);
    if (!customPage) {
        return null;
    }

    return customPage;
}

export const createCustomPage = async (data: {
    title: string;
    slug: string;
    content: string;
    cookedHtml?: string;
    permalink?: string;
    authorId: number;
    isDraft?: boolean;
    isPublic?: boolean;
}) => {
    const cookedHtml = renderEditorJsToHtml(data.content, true);
    const customPage = await client
        .insert(CustomPagesTable)
        .values({
            title: data.title,
            slug: data.slug,
            content: data.content,
            cookedHtml,
            permalink: data.permalink ?? `${data.slug}-${Date.now()}`,
            authorId: data.authorId,
            lastEditorId: data.authorId,
            isDraft: data.isDraft ?? true,
            isPublic: data.isPublic ?? false,
        })
        .returning()
        .then((res) => res[0]);

    // Guardar historial inicial
    await client.insert(CustomPageHistoryTable).values({
        pageId: customPage.id,
        title: customPage.title,
        slug: customPage.slug,
        permalink: customPage.permalink,
        content: customPage.content,
        cookedHtml: customPage.cookedHtml,
        editorId: customPage.authorId,
    });

    return customPage;
};

export const updateCustomPage = async (data: {
    id: number;
    title: string;
    slug: string;
    content: string;
    cookedHtml?: string;
    permalink?: string;
    editorId: number;
    isDraft?: boolean;
    isPublic?: boolean;
}) => {
    const cookedHtml = renderEditorJsToHtml(data.content, true);
    const customPage = await client
        .update(CustomPagesTable)
        .set({
            title: data.title,
            slug: data.slug,
            content: data.content,
            cookedHtml,
            permalink: data.permalink ?? `${data.slug}-${Date.now()}`,
            lastEditorId: data.editorId,
            isDraft: data.isDraft ?? true,
            isPublic: data.isPublic ?? false,
        })
        .where(eq(CustomPagesTable.id, data.id))
        .returning()
        .then((res) => res[0]);

    // Guardar historial de modificación
    await client.insert(CustomPageHistoryTable).values({
        pageId: customPage.id,
        title: customPage.title,
        slug: customPage.slug,
        permalink: customPage.permalink,
        content: customPage.content,
        cookedHtml: customPage.cookedHtml,
        editorId: data.editorId,
    });

    return customPage;
};
// Obtener historial de una página personalizada
export const getCustomPageHistory = async (pageId: number) => {
    return await client
        .select()
        .from(CustomPageHistoryTable)
        .where(eq(CustomPageHistoryTable.pageId, pageId))
        .orderBy(desc(CustomPageHistoryTable.createdAt));
};

export const deleteCustomPage = async (id: number) => {
    const customPage = await client
        .delete(CustomPagesTable)
        .where(eq(CustomPagesTable.id, id))
        .returning()
        .then((res) => res[0]);

    return customPage;
};

