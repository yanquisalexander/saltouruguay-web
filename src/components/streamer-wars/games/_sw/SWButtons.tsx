import type { ComponentChildren } from "preact";

/** Botón de acción 8-bit canónico. */
export const SWActionButton = ({
  children,
  onClick,
  disabled,
  tone = "lime",
}: {
  children: ComponentChildren;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "lime" | "red" | "ghost";
}) => {
  const tones = {
    lime: "bg-[#b4cd02] text-black border-black shadow-[4px_4px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#000]",
    red: "bg-red-600 text-white border-black shadow-[4px_4px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#000]",
    ghost: "bg-white/5 text-white/70 border-white/15 hover:bg-white/10 hover:text-white",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      class={`font-press-start-2p text-xs uppercase px-6 py-3 border-4 rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

/** Pad de color accesible (reemplaza div onClick de SimonSaysButtons). */
export const SWColorPad = ({
  color,
  label,
  active,
  onPress,
}: {
  color: string; // clase bg-*
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={!!active}
    onClick={onPress}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPress(); } }}
    class={`size-28 md:size-32 rounded-2xl border-4 border-black shadow-[6px_6px_0_#000] transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-[#b4cd02] ${color} ${active ? "brightness-150 scale-105" : "brightness-90 hover:brightness-110"}`}
  />
);
