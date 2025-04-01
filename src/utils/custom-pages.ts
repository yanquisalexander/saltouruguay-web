import { client } from "@/db/client";
import { CustomPagesTable } from "@/db/schema";
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
    if (!customPage) {
        throw new Error("Custom page not found");
    }

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
    permalink?: string;
}) => {
    const customPage = await client
        .insert(CustomPagesTable)
        .values({
            title: data.title,
            slug: data.slug,
            content: data.content,
            permalink: data.permalink ?? `${data.slug}-${Date.now()}`,
        })
        .returning()
        .then((res) => res[0]);

    return customPage;
};

export const updateCustomPage = async (data: {
    id: number;
    title: string;
    slug: string;
    content: string;
    permalink?: string;
}) => {
    const customPage = await client
        .update(CustomPagesTable)
        .set({
            title: data.title,
            slug: data.slug,
            content: data.content,
            permalink: data.permalink ?? `${data.slug}-${Date.now()}`,
        })
        .where(eq(CustomPagesTable.id, data.id))
        .returning()
        .then((res) => res[0]);

    return customPage;
};

export const deleteCustomPage = async (id: number) => {
    const customPage = await client
        .delete(CustomPagesTable)
        .where(eq(CustomPagesTable.id, id))
        .returning()
        .then((res) => res[0]);

    return customPage;
};

