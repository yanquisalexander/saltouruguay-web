/** Manifiesto de cinemáticas 3D: duración aprox, skip y poster para precarga progresiva. */
export interface Cinematic3DMeta {
  id: string;
  durationSec: number;
  skippable: boolean;
  poster?: string;
  label: string;
}

export const CINEMATIC_3D_MANIFEST: Record<string, Cinematic3DMeta> = {
  "waking-up": { id: "waking-up", durationSec: 45, skippable: true, label: "Despertar" },
  "players-invite": { id: "players-invite", durationSec: 55, skippable: true, label: "Invitación" },
};
