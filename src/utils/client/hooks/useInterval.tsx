import { useEffect, useRef } from "preact/hooks";

export function useInterval(callback: () => void, delay: number | null) {
    const savedCallback = useRef<() => void>();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay !== null) {
            const id = setInterval(() => savedCallback.current?.(), delay);
            return () => clearInterval(id as unknown as number);
        }
    }, [delay]);
}