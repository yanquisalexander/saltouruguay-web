import { getAuthenticatedUser, isUserAuth, type AnyAuthResult, type AuthResult } from "@/lib/auth/session";

export async function requireAuth(request: Request): Promise<AnyAuthResult> {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
        throw new Error("Unauthorized");
    }
    return auth;
}

export async function requireScope(request: Request, ...requiredScopes: string[]): Promise<AnyAuthResult> {
    const auth = await requireAuth(request);
    const hasWildcard = auth.scopes?.includes("*");
    const hasAllScopes = requiredScopes.every(s => auth.scopes?.includes(s));
    if (!hasWildcard && !hasAllScopes) {
        throw new Error(`Insufficient scope. Required: ${requiredScopes.join(", ")}`);
    }
    return auth;
}

/** Requires a user-backed auth (session or user OAuth token). Service tokens are rejected. */
export async function requireUser(request: Request): Promise<AuthResult> {
    const auth = await getAuthenticatedUser(request);
    if (!isUserAuth(auth)) {
        throw new Error("Unauthorized");
    }
    return auth;
}

/** Like requireScope but rejects service tokens — the caller gets a DB user. */
export async function requireUserScope(request: Request, ...requiredScopes: string[]): Promise<AuthResult> {
    const auth = await requireUser(request);
    const hasWildcard = auth.scopes?.includes("*");
    const hasAllScopes = requiredScopes.every(s => auth.scopes?.includes(s));
    if (!hasWildcard && !hasAllScopes) {
        throw new Error(`Insufficient scope. Required: ${requiredScopes.join(", ")}`);
    }
    return auth;
}
