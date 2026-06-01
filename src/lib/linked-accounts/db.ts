import { client } from "@/db/client";
import { LinkedAccountsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import CryptoJS from "crypto-js";

const AUTH_SECRET = import.meta.env.AUTH_SECRET;

export const encrypt = (text: string): string => {
    if (!AUTH_SECRET) throw new Error("AUTH_SECRET is required");
    return CryptoJS.AES.encrypt(text, AUTH_SECRET).toString();
};

export const decrypt = (encryptedText: string): string => {
    if (!AUTH_SECRET) throw new Error("AUTH_SECRET is required");
    const bytes = CryptoJS.AES.decrypt(encryptedText, AUTH_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
};

export const getLinkedAccounts = async (userId: number): Promise<(typeof LinkedAccountsTable.$inferSelect)[]> => {
    return await client
        .select()
        .from(LinkedAccountsTable)
        .where(eq(LinkedAccountsTable.userId, userId));
};

export const getLinkedAccount = async (userId: number, provider: string) => {
    const accounts = await client
        .select()
        .from(LinkedAccountsTable)
        .where(and(
            eq(LinkedAccountsTable.userId, userId),
            eq(LinkedAccountsTable.provider, provider),
        ))
        .limit(1);

    return accounts[0] ?? null;
};

export const getLinkedAccountByProviderId = async (provider: string, providerUserId: string) => {
    const accounts = await client
        .select()
        .from(LinkedAccountsTable)
        .where(and(
            eq(LinkedAccountsTable.provider, provider),
            eq(LinkedAccountsTable.providerUserId, providerUserId),
        ))
        .limit(1);

    return accounts[0] ?? null;
};

export const createLinkedAccount = async (data: typeof LinkedAccountsTable.$inferInsert) => {
    const [account] = await client
        .insert(LinkedAccountsTable)
        .values(data)
        .returning();

    return account;
};

export const updateLinkedAccount = async (id: string, data: Partial<typeof LinkedAccountsTable.$inferInsert>) => {
    const [account] = await client
        .update(LinkedAccountsTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(LinkedAccountsTable.id, id))
        .returning();

    return account;
};

export const deleteLinkedAccount = async (id: string) => {
    await client
        .delete(LinkedAccountsTable)
        .where(eq(LinkedAccountsTable.id, id));
};

export type LinkedAccountsSummary = Record<string, {
    providerUserId: string;
    username: string | null;
    avatar: string | null;
}>;

export const getLinkedAccountsSummary = async (userId: number): Promise<LinkedAccountsSummary> => {
    const accounts = await getLinkedAccounts(userId);
    const summary: LinkedAccountsSummary = {};

    for (const account of accounts) {
        summary[account.provider] = {
            providerUserId: account.providerUserId,
            username: account.username,
            avatar: account.avatar,
        };
    }

    return summary;
};
