import type { Cinematic3DDefinition } from "./types";
import { wakingUp } from "./waking-up";
import { playersInvite } from "./players-invite";

export const CINEMATIC_3D_REGISTRY: Record<string, Cinematic3DDefinition> = {
  "waking-up": wakingUp,
  "players-invite": playersInvite,
};
