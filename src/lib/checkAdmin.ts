import type { Session } from "@auth/core/types";

// For Security (Discover secret pages), return 404 in each case
export const checkAdmin = async (session: Session | null): Promise<Response | null> => {
    if (!session) {
        return new Response(null, { status: 404 });
    }

    if (!session?.user?.isAdmin) {
        return new Response(null, { status: 404 });
    }

    return null; // Continue to the next handler

}