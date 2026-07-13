import { $ } from "@/lib/dom-selector";
import type { Session } from "@auth/core/types";

export const PRELOADED_SESSION_ID = 'preloaded-session';

export const getPreloadedSession = (): Session['user'] | null => {
    const element = $<HTMLScriptElement>(`#${PRELOADED_SESSION_ID}`);
    if (!element || !element.textContent) return null;
    try {
        return JSON.parse(element.dataset.preloadSession || element.textContent) as Session['user'] | null;
    } catch (e) {
        return null;
    }
};
