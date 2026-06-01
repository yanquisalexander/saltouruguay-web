import type { AccountProvider } from "./provider";
import { discordProvider } from "./providers/discord";

export { getLinkedAccounts, getLinkedAccount, getLinkedAccountsSummary, getLinkedAccountByProviderId, createLinkedAccount, updateLinkedAccount, deleteLinkedAccount, encrypt, decrypt } from "./db";
export { discordProvider } from "./providers/discord";
export type { AccountProvider, ProviderUserData, LinkedAccountRecord } from "./provider";

const providerRegistry: Record<string, AccountProvider> = {
    discord: discordProvider,
};

export const getProvider = (name: string): AccountProvider | undefined => {
    return providerRegistry[name];
};

export const getRegisteredProviders = (): AccountProvider[] => {
    return Object.values(providerRegistry);
};
