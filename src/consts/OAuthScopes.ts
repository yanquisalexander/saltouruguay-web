export const OAUTH_SCOPES = {
    "user:read": "Ver tu información pública (nombre, avatar)",
    "user:email": "Ver tu dirección de correo electrónico",
} as const;

export type OAuthScope = keyof typeof OAUTH_SCOPES;
