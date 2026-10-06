export type SWStatus = "waiting" | "loading" | "playing" | "completed" | "failed" | "eliminated" | "ended";

const MAP: Record<SWStatus, { icon: string; title: string; tone: string }> = {
  waiting: { icon: "⏳", title: "Esperando inicio…", tone: "text-white/70" },
  loading: { icon: "⟳", title: "Cargando…", tone: "text-white/70" },
  playing: { icon: "▶", title: "En juego", tone: "text-[#b4cd02]" },
  completed: { icon: "✅", title: "¡Completado!", tone: "text-green-400" },
  failed: { icon: "💥", title: "Fallaste", tone: "text-red-400" },
  eliminated: { icon: "💀", title: "Eliminado", tone: "text-red-400" },
  ended: { icon: "🏁", title: "Juego finalizado", tone: "text-white/80" },
};

/** Pantalla de estado unificada (reemplaza StatusScreen duplicados de Bomb/Dalgona). */
export const SWStatusScreen = ({
  status,
  title,
  subtitle,
}: {
  status: SWStatus;
  title?: string;
  subtitle?: string;
}) => {
  const m = MAP[status];
  return (
    <div class="flex flex-col items-center justify-center gap-3 py-12 text-center" role="status" aria-live="polite">
      <span class="text-5xl" aria-hidden="true">{m.icon}</span>
      <p class={`font-squids text-2xl uppercase ${m.tone}`}>{title ?? m.title}</p>
      {subtitle && <p class="font-rubik text-sm text-white/50 max-w-[50ch]">{subtitle}</p>}
      {(status === "loading" || status === "waiting") && (
        <div class="mt-2 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div class="h-full w-1/2 animate-pulse rounded-full bg-[#b4cd02]" />
        </div>
      )}
    </div>
  );
};
