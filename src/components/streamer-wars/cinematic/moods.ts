export const MOOD_STYLES = {
  neutral: {
    bg: "bg-black/90",
    accent: "text-neutral-500",
    glow: "",
    timerColor: "text-neutral-400",
    progressActive: "bg-neutral-500",
    progressPast: "bg-neutral-600",
    progressFuture: "bg-neutral-800",
  },
  warning: {
    bg: "bg-black/85",
    accent: "text-yellow-500",
    glow: "shadow-[0_0_60px_rgba(234,179,8,0.08)]",
    timerColor: "text-yellow-500",
    progressActive: "bg-yellow-500",
    progressPast: "bg-yellow-900",
    progressFuture: "bg-neutral-800",
  },
  danger: {
    bg: "bg-[#0a0000]/95",
    accent: "text-red-500",
    glow: "shadow-[0_0_80px_rgba(239,68,68,0.12)]",
    timerColor: "text-red-500",
    progressActive: "bg-red-500",
    progressPast: "bg-red-900",
    progressFuture: "bg-neutral-800",
  },
  triumph: {
    bg: "bg-black/80",
    accent: "text-lime-500",
    glow: "shadow-[0_0_80px_rgba(180,205,2,0.15)]",
    timerColor: "text-lime-500",
    progressActive: "bg-lime-500",
    progressPast: "bg-lime-900",
    progressFuture: "bg-neutral-800",
  },
} as const;

export type Mood = keyof typeof MOOD_STYLES;
