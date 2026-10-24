/** Tipos y helpers puros del overlay de torneo (seguros para cliente: no importan ioredis). */

export type TournamentOverlayView = 'auto' | 'bracket' | 'standings';

export interface TournamentOverlayState {
    visible: boolean;
    scale: number;
    view: TournamentOverlayView;
    refresh: number;
    updatedAt: number;
}

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2;
export const DEFAULT_OVERLAY_STATE: TournamentOverlayState = {
    visible: true,
    scale: 1,
    view: 'auto',
    refresh: 0,
    updatedAt: 0,
};

export const overlayStateKey = (tournamentId: number) => `tournament:overlay:${tournamentId}`;
export const overlayVersionKey = (tournamentId: number) => `tournament:overlay:${tournamentId}:version`;

export const clampScale = (value: unknown): number => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return DEFAULT_OVERLAY_STATE.scale;
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));
};

const isView = (v: unknown): v is TournamentOverlayView => v === 'auto' || v === 'bracket' || v === 'standings';

/** Normaliza un estado crudo (JSON de Redis o payload del cliente) a un estado válido. */
export function parseOverlayState(raw: unknown): TournamentOverlayState {
    const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<TournamentOverlayState>;
    return {
        visible: typeof value.visible === 'boolean' ? value.visible : DEFAULT_OVERLAY_STATE.visible,
        scale: clampScale(value.scale),
        view: isView(value.view) ? value.view : DEFAULT_OVERLAY_STATE.view,
        refresh: Number.isFinite(Number(value.refresh)) && Number(value.refresh) >= 0
            ? Math.floor(Number(value.refresh))
            : DEFAULT_OVERLAY_STATE.refresh,
        updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : DEFAULT_OVERLAY_STATE.updatedAt,
    };
}

export interface TournamentOverlayPayload {
    visible?: unknown;
    scale?: unknown;
    view?: unknown;
    refresh?: unknown;
}

/** Mergea un payload parcial (POST desde admin) sobre un estado base. `bumpRefresh` incrementa el contador. */
export function mergeOverlayState(
    base: TournamentOverlayState,
    payload: TournamentOverlayPayload,
    bumpRefresh = false,
): TournamentOverlayState {
    return parseOverlayState({
        ...base,
        visible: typeof payload.visible === 'boolean' ? payload.visible : base.visible,
        scale: payload.scale !== undefined ? clampScale(payload.scale) : base.scale,
        view: isView(payload.view) ? payload.view : base.view,
        refresh: bumpRefresh ? base.refresh + 1 : base.refresh,
        updatedAt: Date.now(),
    });
}
