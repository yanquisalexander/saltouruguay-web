import {
    ACHIEVEMENTS_TEXTS,
    getAchievementCardUrl,
    getAchievementIconUrl,
} from "@/consts/Achievements";
import { getAuthenticatedUser, isUserAuth } from "@/lib/auth";
import { getUserAchievements } from "@/utils/user";
import { defineAction } from "astro:actions";
import { z } from "astro:schema";

/** Las rutas de arte son relativas (`/images/...`); el mobile las necesita absolutas. */
const SITE_URL = "https://saltouruguayserver.com";
const toAbsoluteUrl = (path: string) =>
    path.startsWith("http") ? path : `${SITE_URL}${path}`;

export const achievements = {
    /**
     * `users.achievements.list` — PÚBLICA (no requiere sesión).
     * Devuelve el catálogo de logros. Si la request lleva sesión,
     * hidrata `unlocked` / `unlockedAt` por logro + progreso global.
     * Con `{ onlyUnlocked: true }` filtra a desbloqueados
     * (sin sesión devuelve lista vacía).
     */
    list: defineAction({
        input: z
            .object({
                onlyUnlocked: z.boolean().optional(),
            })
            .optional(),
        handler: async (input, { request }) => {
            // Acepta sesión por cookie (web) y Bearer OAuth (mobile).
            // `getSession` de auth-astro solo lee cookies: desde el mobile
            // siempre daba null y todo quedaba como no desbloqueado.
            const auth = await getAuthenticatedUser(request);
            const userId = isUserAuth(auth) ? auth.user.id : null;

            const unlockedById = new Map<string, Date>();
            if (userId !== null) {
                const rows = await getUserAchievements(userId);
                for (const row of rows) {
                    if (row.achievementId && !unlockedById.has(row.achievementId)) {
                        unlockedById.set(row.achievementId, row.unlockedAt);
                    }
                }
            }

            let achievements = ACHIEVEMENTS_TEXTS.map((text) => {
                const unlockedAt = unlockedById.get(text.id) ?? null;
                return {
                    id: text.id,
                    title: text.title,
                    subtitle: text.subtitle ?? null,
                    description: text.description,
                    iconUrl: toAbsoluteUrl(getAchievementIconUrl(text.id)),
                    cardUrl: toAbsoluteUrl(getAchievementCardUrl(text.id)),
                    hasCardArt: !!text.card,
                    unlocked: unlockedAt !== null,
                    unlockedAt,
                };
            });

            if (input?.onlyUnlocked) {
                achievements = achievements.filter((a) => a.unlocked);
            }

            const total = ACHIEVEMENTS_TEXTS.length;
            const unlockedCount = unlockedById.size;

            return {
                achievements,
                total,
                unlockedCount,
                progressPercentage:
                    total > 0 ? Math.round((unlockedCount / total) * 100) : 0,
            };
        },
    }),
};
