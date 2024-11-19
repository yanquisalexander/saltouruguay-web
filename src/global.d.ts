import type { Session as AuthSession } from "@auth/core/types";

declare module "@auth/core/types" {
    interface Session extends AuthSession {
        user: {
            id: number;
            tier?: 1 | 2 | 3;
            isAdmin?: boolean;
            twitchId?: string;
            discordId?: string;
        } & DefaultSession["user"]; // Extiende las propiedades originales del tipo `user`
    }
}