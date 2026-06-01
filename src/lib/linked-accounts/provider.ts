import type { LinkedAccountsTable } from "@/db/schema";

export type LinkedAccountRecord = typeof LinkedAccountsTable.$inferSelect;
export type NewLinkedAccount = typeof LinkedAccountsTable.$inferInsert;

export type ProviderUserData = {
    providerUserId: string;
    username: string;
    avatar: string | null;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
    scopes: string[];
};

export interface AccountProvider {
    name: string;
    label: string;

    getAuthorizationUrl(state: string, callbackUrl: string): URL;

    handleCallback(code: string, callbackUrl: string): Promise<ProviderUserData>;

    onUnlink(account: LinkedAccountRecord): Promise<void>;

    refreshToken?(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string | null;
        expiresAt: Date | null;
    }>;
}
