import type { Session as AuthSession } from "@auth/core/types";
import { JSX } from "preact";

declare module "@auth/core/types" {
    interface Session extends AuthSession {
        user: {
            id: number;
            username: string;
            tier?: 1 | 2 | 3;
            isAdmin?: boolean;
            twitchId?: string;
            discordId?: string;
            coins?: number;
            streamerWarsPlayerNumber?: number;
            isSuspended?: boolean;
        } & DefaultSession["user"]; // Extiende las propiedades originales del tipo `user`
    }
}

// add disabled to AnchorHTMLAttributes<HTMLAnchorElement>

declare module "preact" {
    namespace JSX {
        interface IntrinsicElements {
            a: JSX.IntrinsicElements['a'] & {
                disabled?: boolean;
            }
        }
    }
}