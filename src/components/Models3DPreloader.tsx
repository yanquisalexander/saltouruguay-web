import { useEffect, useState } from "preact/hooks";
import { CDN_3D_MODELS_PREFIX, MODELS_3D } from "@/consts/3d-models";

interface ModelState {
  name: string;
  status: "pending" | "loading" | "done" | "error";
}

export const Models3DPreloader = ({ onComplete }: { onComplete?: () => void }) => {
  const [models, setModels] = useState<ModelState[]>(
    () => MODELS_3D.map((name) => ({ name, status: "pending" })),
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadNext = async (index: number) => {
      if (cancelled || index >= MODELS_3D.length) return;

      const name = MODELS_3D[index];

      setModels((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: "loading" };
        return next;
      });

      try {
        const url = `${CDN_3D_MODELS_PREFIX}${name}`;
        const r = await fetch(url, { mode: "cors" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await r.blob();
        if (cancelled) return;
        setModels((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status: "done" };
          return next;
        });
      } catch {
        if (cancelled) return;
        setModels((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], status: "error" };
          return next;
        });
      }

      if (index + 1 >= MODELS_3D.length) {
        setTimeout(() => {
          if (!cancelled) {
            setVisible(false);
            onComplete?.();
          }
        }, 600);
      } else {
        loadNext(index + 1);
      }
    };

    loadNext(0);

    return () => { cancelled = true; };
  }, [onComplete]);

  if (!visible) return null;

  const done = models.filter((m) => m.status === "done" || m.status === "error").length;
  const total = models.length;
  const activeName = models.find((m) => m.status === "loading")?.name;

  return (
    <div class="fixed top-4 left-4 z-[9999] min-w-[260px]">
      <div class="relative overflow-hidden rounded border border-neutral-800 bg-[#0a0a0a]/95 px-5 py-3">
        <div class="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(circle_at_center,#b4cd02_0%,transparent_70%)]" />

        <div class="relative z-10">
          <div class="flex items-center justify-between mb-2">
            <span class="font-anton text-[10px] tracking-[0.25em] text-neutral-500 uppercase">
              Precargando modelos 3d
            </span>
            <span class="font-anton text-[11px] tracking-wider text-[#b4cd02]">
              {done}/{total}
            </span>
          </div>

          <div class="space-y-1">
            {models.map((m) => (
              <div key={m.name} class="flex items-center gap-2">
                {m.status === "loading" && (
                  <span class="inline-block h-3 w-3 rounded-full border-2 border-[#b4cd02] border-t-transparent" style="animation:spin3d 0.7s linear infinite" />
                )}
                {m.status === "done" && (
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-[#b4cd02]" />
                )}
                {m.status === "error" && (
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
                {m.status === "pending" && (
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-neutral-700" />
                )}
                <span
                  class={`font-teko text-sm tracking-wider ${
                    m.name === activeName ? "text-[#b4cd02]" : "text-neutral-500"
                  }`}
                >
                  {m.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div class="absolute inset-x-0 bottom-0 h-[2px] bg-neutral-900">
          <div
            class="h-full bg-[#b4cd02] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(180,205,2,0.35)]"
            style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <style>{`@keyframes spin3d{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};
