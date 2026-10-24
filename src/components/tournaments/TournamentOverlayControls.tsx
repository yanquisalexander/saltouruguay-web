import { useEffect, useRef, useState } from 'preact/hooks';
import { LucideExternalLink, LucideCopy, LucideRefreshCw, LucideEye, LucideEyeOff } from 'lucide-preact';
import { toast } from 'sonner';
import {
  DEFAULT_OVERLAY_STATE,
  MIN_SCALE,
  MAX_SCALE,
  type TournamentOverlayState,
  type TournamentOverlayView,
} from '@/lib/tournament-overlay';

interface Props {
  tournamentId: number;
  tournamentName: string;
}

const VIEW_OPTIONS: { value: TournamentOverlayView; label: string }[] = [
  { value: 'auto', label: 'Automático (según formato)' },
  { value: 'bracket', label: 'Cuadro / bracket' },
  { value: 'standings', label: 'Tabla de posiciones' },
];

export default function TournamentOverlayControls({ tournamentId, tournamentName }: Props) {
  const [state, setState] = useState<TournamentOverlayState | null>(null);
  const [busy, setBusy] = useState(false);
  const scaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const overlayUrl = `/torneos/${tournamentId}?overlay=1`;

  useEffect(() => () => {
    if (scaleTimer.current) clearTimeout(scaleTimer.current);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/torneos/${tournamentId}/overlay/state`);
        if (res.ok && mounted) setState(await res.json().then(d => d.state));
      } catch {
        if (mounted) setState(DEFAULT_OVERLAY_STATE);
      }
    })();
    return () => { mounted = false; };
  }, [tournamentId]);

  function send(payload: Record<string, unknown>, optimistic?: Partial<TournamentOverlayState>) {
    const previous = state;
    if (optimistic && previous) setState({ ...previous, ...optimistic });
    pending.current += 1;
    setBusy(true);
    const settled = () => { if (--pending.current <= 0) setBusy(false); };
    queue.current = queue.current.then(async () => {
      try {
        const res = await fetch(`/api/torneos/${tournamentId}/overlay/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setState(data.state);
      } catch {
        if (previous) setState(previous);
        toast.error('No se pudo actualizar el overlay');
      } finally {
        settled();
      }
    });
  }

  const openOverlay = () => window.open(overlayUrl, '_blank', 'noopener');
  const copyOverlay = async () => {
    try {
      await navigator.clipboard.writeText(new URL(overlayUrl, window.location.origin).href);
      toast.success('URL del overlay copiada');
    } catch {
      toast.error('No se pudo copiar la URL');
    }
  };

  if (!state) {
    return <div class="tw-panel tw-muted">Cargando controles del overlay…</div>;
  }

  return (
    <div class="tw-overlay-controls">
      <section class="tw-panel">
        <h3>Overlay de transmisión</h3>
        <p>
          Abrí esta página como fuente de navegador en OBS. Muestra solo el cuadro o la tabla de posiciones
          con animaciones de entrada, en fondo transparente. Los controles de abajo se aplican al instante.
        </p>
        <div class="tw-actions">
          <button type="button" onClick={openOverlay}>
            <LucideExternalLink size={13} /> Abrir overlay
          </button>
          <button type="button" onClick={copyOverlay}>
            <LucideCopy size={13} /> Copiar URL
          </button>
        </div>
      </section>

      <section class="tw-panel">
        <div class="tw-overlay-row">
          <span class="tw-overlay-label">Estado</span>
          <button
            type="button"
            class={state.visible ? 'tw-primary' : ''}
            disabled={busy}
            onClick={() => send({ visible: !state.visible }, { visible: !state.visible })}
          >
            {state.visible ? <><LucideEyeOff size={13} /> Ocultar overlay</> : <><LucideEye size={13} /> Mostrar overlay</>}
          </button>
        </div>

        <div class="tw-overlay-row">
          <span class="tw-overlay-label">Escala <strong>{state.scale.toFixed(2)}×</strong></span>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.05}
            value={state.scale}
            aria-label="Escala del overlay"
            onInput={e => {
              const value = Number(e.currentTarget.value);
              setState(prev => (prev ? { ...prev, scale: value } : prev));
              if (scaleTimer.current) clearTimeout(scaleTimer.current);
              scaleTimer.current = setTimeout(() => void send({ scale: value }), 400);
            }}
          />
        </div>

        <div class="tw-overlay-row">
          <span class="tw-overlay-label">Vista</span>
          <select
            aria-label="Vista del overlay"
            value={state.view}
            onChange={e => void send({ view: e.currentTarget.value as TournamentOverlayView }, { view: e.currentTarget.value as TournamentOverlayView })}
          >
            {VIEW_OPTIONS.map(opt => <option value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div class="tw-overlay-row">
          <span class="tw-overlay-label">Datos del torneo</span>
          <button type="button" disabled={busy} onClick={() => send({ refresh: true })}>
            <LucideRefreshCw size={13} /> Actualizar datos ahora
          </button>
        </div>

        <p class="tw-muted tw-overlay-note">
          El overlay también refresca los resultados solo cada 60 segundos. «Actualizar datos» fuerza el refresco al instante.
        </p>
      </section>

      <section class="tw-panel">
        <h3>Resumen</h3>
        <dl class="tw-overlay-summary">
          <dt>Torneo</dt><dd>{tournamentName}</dd>
          <dt>Visible</dt><dd>{state.visible ? 'Sí' : 'No'}</dd>
          <dt>Escala</dt><dd>{state.scale.toFixed(2)}×</dd>
          <dt>Vista</dt><dd>{VIEW_OPTIONS.find(v => v.value === state.view)?.label ?? state.view}</dd>
          <dt>Actualización de datos</dt><dd>Manual + auto 60s (refresh #{state.refresh})</dd>
        </dl>
      </section>
    </div>
  );
}
