import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

const useClock = () => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 10000);
        return () => clearInterval(id);
    }, []);
    return now.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
};

/**
 * Pantalla del "tablet" de Guerra de Streamers.
 *
 * El dispositivo en sí ya lo provee `streamerwars-layout-base`
 * (appbar + sidebars + main con borde): acá solo va el cromo de
 * pantalla — status bar con reloj vivo, scanlines y viñeta.
 * Montar UNA sola vez por vista (las ramas de MainContent son excluyentes).
 */
export const TabletFrame = ({
    children,
    decor,
    statusTitle = "SALTO OS // CANAL SEGURO",
    wide = false,
}: {
    children: ComponentChildren;
    /** Capas extra de fondo (p. ej. GeometricBg, GlitchLines) */
    decor?: ComponentChildren;
    /** Etiqueta central de la status bar (nombre de vista/juego) */
    statusTitle?: string;
    /** Reservado (ancho lo da el layout) */
    wide?: boolean;
}) => {
    void wide;
    const clock = useClock();

    return (
        <div class="relative flex h-[calc(100vh-80px)] min-h-[540px] flex-col text-neutral-300">
            {/* STATUS BAR */}
            <div class="sticky top-0 z-30 flex flex-none items-center justify-between px-4 py-1.5 bg-black/60 border-b border-white/5 backdrop-blur-md">
                <span class="font-mono text-[10px] tracking-widest text-white/60 tabular-nums">{clock}</span>
                <span class="font-anton text-[9px] tracking-[0.3em] uppercase text-[#b4cd02]/70 truncate px-2">
                    {statusTitle}
                </span>
                <span class="flex items-center gap-1.5 text-white/50" aria-hidden="true">
                    {/* señal */}
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
                        <rect x="0" y="7" width="2" height="3" rx="0.5" />
                        <rect x="3.5" y="5" width="2" height="5" rx="0.5" />
                        <rect x="7" y="2.5" width="2" height="7.5" rx="0.5" />
                        <rect x="10" y="0" width="2" height="10" rx="0.5" opacity="0.35" />
                    </svg>
                    {/* wifi */}
                    <svg width="12" height="10" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <path d="M2 6c6-5 14-5 20 0" />
                        <path d="M6 10.5c3.5-3 8.5-3 12 0" />
                        <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
                    </svg>
                    {/* batería */}
                    <svg width="18" height="10" viewBox="0 0 22 12" fill="none">
                        <rect x="0.5" y="0.5" width="17" height="11" rx="3" stroke="currentColor" stroke-width="1.2" opacity="0.6" />
                        <rect x="2.5" y="2.5" width="11" height="7" rx="1.5" fill="#b4cd02" opacity="0.85" />
                        <rect x="19" y="3.5" width="2.5" height="5" rx="1" fill="currentColor" opacity="0.6" />
                    </svg>
                </span>
            </div>

            {/* CONTENIDO — scroll único interno, contenido (no propaga afuera) */}
            <div
                class="relative flex-1 min-h-0 overflow-y-auto overscroll-contain tablet-screen-scroll"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(180,205,2,0.35) transparent" }}
            >
                {decor}
                {children}
            </div>

            {/* Scanlines + viñeta */}
            <div class="pointer-events-none absolute inset-0 z-20 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-size-[100%_4px]" aria-hidden="true" />
            <style>{`
                .tablet-screen-scroll::-webkit-scrollbar { width: 6px; }
                .tablet-screen-scroll::-webkit-scrollbar-track { background: transparent; }
                .tablet-screen-scroll::-webkit-scrollbar-thumb { background: rgba(180,205,2,0.35); border-radius: 999px; }
                .tablet-screen-scroll::-webkit-scrollbar-thumb:hover { background: rgba(180,205,2,0.6); }
            `}</style>
        </div>
    );
};
