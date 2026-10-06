/** HUD unificado: izquierda / título centro / derecha + barra de progreso. */
export const SWHud = ({
  leftLabel,
  leftValue,
  title,
  rightLabel,
  rightValue,
  progress,
}: {
  leftLabel?: string;
  leftValue?: string;
  title: string;
  rightLabel?: string;
  rightValue?: string;
  progress?: number; // 0..1
}) => (
  <header class="relative z-20 mb-4">
    <div class="flex items-center justify-between gap-4 px-1">
      <div class="min-w-24">
        {leftLabel && <p class="font-anton text-[9px] tracking-[0.25em] uppercase text-white/40">{leftLabel}</p>}
        {leftValue && <p class="font-squids text-xl text-green-400" aria-live="polite">{leftValue}</p>}
      </div>
      <h3 class="font-squids text-lg md:text-xl text-white uppercase text-center flex-1">{title}</h3>
      <div class="min-w-24 text-right">
        {rightLabel && <p class="font-anton text-[9px] tracking-[0.25em] uppercase text-white/40">{rightLabel}</p>}
        {rightValue && <p class="font-squids text-xl text-red-400" aria-live="polite">{rightValue}</p>}
      </div>
    </div>
    {typeof progress === "number" && (
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div class="h-full rounded-full bg-[#b4cd02] transition-all duration-200" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
      </div>
    )}
  </header>
);
