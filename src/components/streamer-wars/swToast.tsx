import { toast } from 'sonner';

const LINK_REGEX = /(https?:\/\/[^\s<]+)/;

function renderWithLinks(text: string) {
  const parts = text.split(LINK_REGEX);
  return parts.map((part, i) =>
    part.startsWith('http://') || part.startsWith('https://')
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
           className="text-[#b4cd02] hover:text-[#b4cd02]/80 transition-colors underline decoration-dashed decoration-1">{part}</a>
      : part
  );
}

type SwToastOptions = {
  description?: string;
  duration?: number;
  position?: 'top-center' | 'top-right' | 'top-left' | 'bottom-center' | 'bottom-right' | 'bottom-left';
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
};

const COLORS = {
  success: { bar: '#b4cd02', glow: 'rgba(180,205,2,0.25)' },
  error: { bar: '#ff0055', glow: 'rgba(255,0,85,0.25)' },
  warning: { bar: '#ffaa00', glow: 'rgba(255,170,0,0.25)' },
  info: { bar: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
};

const ICONS = {
  success: '◉',
  error: '⊗',
  warning: '△',
  info: '◇',
};

const TITLES = {
  success: 'ÉXITO',
  error: 'ERROR',
  warning: 'ALERTA',
  info: 'AVISO',
};

function SwToast({
  type,
  message,
  description,
  action,
  dismiss,
  icon,
}: {
  type: keyof typeof COLORS;
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  dismiss: () => void;
  icon?: string;
}) {
  const c = COLORS[type];

  return (
    <div
      className="bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-2xl flex overflow-hidden min-w-[300px] max-w-[420px] animate-fade-in-up"
      style={{ boxShadow: `0 0 30px rgba(0,0,0,0.9), 0 0 15px ${c.glow}` }}
    >
      <div className="w-[3px] shrink-0" style={{ backgroundColor: c.bar, boxShadow: `0 0 8px ${c.bar}` }} />

      <div className="flex-1 p-3.5">
        <div className="flex items-start gap-3">
          <span className="font-atomic-extras text-lg mt-1 select-none" style={{ color: c.bar }}>
            {icon || ICONS[type]}
          </span>

          <div className="flex-1 min-w-0">
            <h4 className="font-anton text-xs tracking-[0.25em] uppercase" style={{ color: c.bar }}>
              {TITLES[type]}
            </h4>
            <p className="font-mono text-sm text-white mt-0.5 leading-snug">{renderWithLinks(message)}</p>
            {description && (
              <p className="font-teko text-xs text-neutral-500 tracking-wide mt-0.5 uppercase">{renderWithLinks(description)}</p>
            )}
          </div>

          <button
            onClick={dismiss}
            className="text-neutral-700 hover:text-white transition-colors text-xs font-mono mt-0.5 shrink-0"
          >
            ✕
          </button>
        </div>

        {action && (
          <button
            onClick={() => { action.onClick(); dismiss(); }}
            className="mt-2.5 w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-anton text-xs tracking-[0.2em] uppercase py-2 rounded transition-all"
          >
            {action.label}
          </button>
        )}

        <div className="mt-2 h-[1px] w-full overflow-hidden opacity-20">
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${c.bar} 50%, transparent 100%)`,
            }}
          />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg opacity-[0.03]">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_3px]" />
      </div>
    </div>
  );
}

function makeToast(type: keyof typeof COLORS, message: string, options?: SwToastOptions) {
  toast.custom(
    (t) => (
      <SwToast
        type={type}
        message={message}
        description={options?.description}
        action={options?.action}
        dismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: options?.duration ?? 5000,
      position: options?.position ?? 'top-center',
      unstyled: true,
    },
  );
}

export const swToast = {
  success: (message: string, options?: SwToastOptions) => makeToast('success', message, options),
  error: (message: string, options?: SwToastOptions) => makeToast('error', message, options),
  warning: (message: string, options?: SwToastOptions) => makeToast('warning', message, options),
  info: (message: string, options?: SwToastOptions) => makeToast('info', message, options),
};
