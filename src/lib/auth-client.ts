import type { Session } from "@auth/core/types";

export const getSessionClient: () => Promise<Session> = async () => {
    const sessionResponse = await fetch("/api/auth/session");
    if (!sessionResponse.ok) {
        throw new Error("Failed to fetch session");
    }

    return await sessionResponse.json();
}