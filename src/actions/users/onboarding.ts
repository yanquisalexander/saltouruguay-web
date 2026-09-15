import { ActionError, defineAction } from "astro:actions";
import { getSession } from "auth-astro/server";
import { client } from "@/db/client";
import { UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const onboarding = {
    completeOnboarding: defineAction({
        handler: async (_input, { request }) => {
            const session = await getSession(request);
            if (!session) {
                throw new ActionError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated",
                });
            }

            await client
                .update(UsersTable)
                .set({ onboardingComplete: true, updatedAt: new Date() })
                .where(eq(UsersTable.id, session.user.id));

            return { success: true };
        },
    }),
};
