/**
 * Redis-backed store for the `twoFactorVerified` flag.
 *
 * Each auth session that passes 2FA gets a Redis key
 * `2fa_verified:{sessionId}` set to "1". The key expires automatically so
 * lingering flags are cleaned up even if sign-out is missed.
 *
 * `sessionId` here is the UUID that lives in the auth-astro JWT
 * (`session.user.sessionId`).  It's still generated in `auth.config.mjs` — we
 * just no longer persist it in the database.
 */
import redis from "@/lib/redis";

const KEY_PREFIX = "2fa_verified:";
/** 30 days — should comfortably outlive any session cookie */
const TTL_SECONDS = 30 * 24 * 60 * 60;

export const setTwoFactorVerified = (sessionId: string): Promise<"OK"> =>
    redis.set(`${KEY_PREFIX}${sessionId}`, "1", "EX", TTL_SECONDS);

export const isTwoFactorVerified = async (sessionId: string): Promise<boolean> => {
    const val = await redis.get(`${KEY_PREFIX}${sessionId}`);
    return val === "1";
};

export const clearTwoFactorVerified = (sessionId: string): Promise<number> =>
    redis.del(`${KEY_PREFIX}${sessionId}`);
