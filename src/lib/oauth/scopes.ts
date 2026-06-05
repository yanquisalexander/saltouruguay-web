import type { LucideIcon } from "lucide-preact";
import { LucideEye, LucideIdCard, LucideMail, LucideServer, LucideUser } from "lucide-preact";

export const AVAILABLE_SCOPES = ["openid", "profile", "email", "saltotag:read", "service:api"] as const;

export type Scope = (typeof AVAILABLE_SCOPES)[number];

export interface ScopeMeta {
    name: string;
    description: string;
    icon: LucideIcon;
}

export const SCOPE_META: Record<Scope, ScopeMeta> = {
    openid: {
        name: "Tu identidad",
        description: "Usar OpenID Connect para autenticación",
        icon: LucideUser,
    },
    profile: {
        name: "Tu perfil",
        description: "Leer tu nombre de usuario, nombre visible y avatar",
        icon: LucideEye,
    },
    email: {
        name: "Tu correo electrónico",
        description: "Leer tu dirección de email",
        icon: LucideMail,
    },
    "saltotag:read": {
        name: "Tu SaltoTag",
        description: "Leer tu SaltoTag y experiencia",
        icon: LucideIdCard,
    },
    "service:api": {
        name: "API de servicio",
        description: "Acceso machine-to-machine a las APIs internas",
        icon: LucideServer,
    },
};
