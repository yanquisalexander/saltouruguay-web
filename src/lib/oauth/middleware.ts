import { getAuthenticatedUser, type AuthResult, type ServiceAuthResult } from "@/lib/auth/session";

export async function requireAuth(request: Request): Promise<AuthResult | ServiceAuthResult> {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
        throw new Error("Unauthorized");
    }
    return auth;
}

export async function requireScope(request: Request, ...requiredScopes: string[]): Promise<AuthResult | ServiceAuthResult> {
    const auth = await requireAuth(request);
    const hasWildcard = auth.scopes?.includes("*");
    const hasAllScopes = requiredScopes.every(s => auth.scopes?.includes(s));
    if (!hasWildcard && !hasAllScopes) {
        throw new Error(`Insufficient scope. Required: ${requiredScopes.join(", ")}`);
    }
    return auth;
}
