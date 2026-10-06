import type { ComponentChildren } from "preact";

export type SWAccent = "red" | "amber" | "blue" | "purple" | "lime";

const ACCENTS: Record<SWAccent, { radial: string; border: string; stripe: string; glow: string }> = {
  red: {
    radial: "from-red-900/50 via-neutral-950",
    border: "border-red-900/60",
    stripe: "bg-[repeating-linear-gradient(-45deg,#7f1d1d_0_16px,#050505_16px_32px)]",
    glow: "shadow-[0_0_60px_rgba(220,38,38,0.15)]",
  },
  amber: {
    radial: "from-amber-800/50 via-amber-950",
    border: "border-amber-700/60",
    stripe: "bg-[repeating-linear-gradient(-45deg,#92400e_0_16px,#050505_16px_32px)]",
    glow: "shadow-[0_0_60px_rgba(245,158,11,0.12)]",
  },
  blue: {
    radial: "from-blue-900/50 via-[#05070d]",
    border: "border-cyan-700/50",
    stripe: "bg-[repeating-linear-gradient(-45deg,#0e7490_0_16px,#050505_16px_32px)]",
    glow: "shadow-[0_0_60px_rgba(34,211,238,0.12)]",
  },
  purple: {
    radial: "from-purple-900/40 via-[#0d0518]",
    border: "border-purple-700/60",
    stripe: "bg-[repeating-linear-gradient(-45deg,#6b21a8_0_16px,#050505_16px_32px)]",
    glow: "shadow-[0_0_60px_rgba(168,85,247,0.14)]",
  },
  lime: {
    radial: "from-lime-900/30 via-[#070907]",
    border: "border-[#b4cd02]/40",
    stripe: "bg-[repeating-linear-gradient(-45deg,#3f6212_0_16px,#050505_16px_32px)]",
    glow: "shadow-[0_0_60px_rgba(180,205,2,0.12)]",
  },
};

/** Contenedor canónico de minijuego: reemplaza los 3 clones BaseContainer+shake+stripes. */
export const SWGameShell = ({
  accent = "lime",
  title,
  shaking = false,
  children,
}: {
  accent?: SWAccent;
  title?: string;
  shaking?: boolean;
  children: ComponentChildren;
}) => {
  const a = ACCENTS[accent];
  return (
    <div class={`relative w-full max-w-5xl mx-auto rounded-2xl border-4 ${a.border} bg-linear-to-b ${a.radial} to-neutral-950 overflow-hidden ${a.glow} ${shaking ? "sw-shake" : ""}`}>
      <div class={`h-3 w-full ${a.stripe} opacity-80`} aria-hidden="true" />
      {title && (
        <div class="px-6 pt-5 text-center">
          <p class="font-anton text-[10px] tracking-[0.35em] uppercase text-white/40">Guerra de Streamers</p>
          <h2 class="font-squids text-2xl md:text-3xl text-white uppercase tracking-wide">{title}</h2>
        </div>
      )}
      <div class="relative z-10 px-4 md:px-8 py-6">{children}</div>
      <div class={`h-3 w-full ${a.stripe} opacity-80`} aria-hidden="true" />
      <style>{`.sw-shake{animation:sw-shake .5s ease-in-out infinite}@keyframes sw-shake{0%,100%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(-1px,1px)}75%{transform:translate(1px,1px)}}`}</style>
    </div>
  );
};
