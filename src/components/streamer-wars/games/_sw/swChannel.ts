import { useEffect } from "preact/hooks";
import type { Channel } from "pusher-js";

/**
 * Hook único de Pusher para minijuegos.
 * Garantiza bind/unbind simétrico (fix Tug resuscribe, Fishing sin unsubscribe, Auto mixto).
 */
export const useSWChannel = (
  channel: Channel | null | undefined,
  eventsMap: Record<string, (data: any) => void>,
) => {
  useEffect(() => {
    if (!channel) return;
    const entries = Object.entries(eventsMap);
    entries.forEach(([event, handler]) => channel.bind(event, handler));
    return () => {
      entries.forEach(([event, handler]) => {
        try { channel.unbind(event, handler); } catch {}
      });
    };
    // Intencionalmente solo re-suscribe si cambia el canal, no por handlers inline.
    // Los handlers deben ser estables (useCallback) o usar refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);
};
