import { useEffect, useState } from "preact/hooks";

// Hook para parchear fetch
const patchFetch = (log: (entry: FetchLog) => void) => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
        const [resource, init] = args;
        const startTime = performance.now();

        try {
            const response = await originalFetch(...args);
            const duration = performance.now() - startTime;

            log({
                path: resource.toString(),
                duration: duration.toFixed(2) + "ms",
                init: init || null,
                status: response.status,
                statusText: response.statusText,
                headers: [...response.headers.entries()],
            });

            return response;
        } catch (error) {
            const duration = performance.now() - startTime;

            log({
                path: resource.toString(),
                duration: duration.toFixed(2) + "ms",
                init: init || null,
                status: "Error",
                statusText: (error as Error).message,
                headers: [],
            });

            throw error;
        }
    };

    return () => {
        window.fetch = originalFetch; // Restaurar fetch original
    };
};

type FetchLog = {
    path: string;
    duration: string;
    init: RequestInit | null;
    status: string | number;
    statusText: string;
    headers: [string, string][];
};

// Componente DebugInfo
export const DebugInfo = () => {
    const [enabled, setEnabled] = useState(false);
    const [logs, setLogs] = useState<FetchLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<FetchLog | null>(null);

    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            if (event.key === "d" && event.ctrlKey) {
                event.preventDefault();
                setEnabled(!enabled);
            }
        };

        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;

        const unpatch = patchFetch((entry) =>
            setLogs((prevLogs) => [entry, ...prevLogs].slice(0, 10))
        );

        return () => unpatch();
    }, [enabled]);

    return enabled ? (
        <div class="fixed inset-0 flex">
            {/* Panel principal */}
            <div class="fixed bottom-0 left-3 bg-white rounded-t-md border-t-2 border-blue-500 border-opacity-50 p-2 max-w-sm shadow-lg">
                <div class="text-xs text-gray-500">Debug mode enabled</div>
                <div class="text-xs text-gray-500">Press Ctrl+D to toggle</div>
                <ul class="mt-2 text-xs text-gray-700 max-h-48 overflow-y-auto">
                    {logs.map((log, index) => (
                        <li
                            key={index}
                            class="flex justify-between cursor-pointer hover:bg-gray-100 px-2 py-1"
                            onClick={() => setSelectedLog(log)}
                        >
                            <span class="truncate">{log.path}</span>
                            <span class="ml-2 text-gray-600">{log.duration}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Panel de detalles */}
            {selectedLog && (
                <div class="fixed bottom-0 right-0 w-80 bg-gray-900 z-[1002] shadow-lg rounded-tl-md border-l border-t overflow-y-auto p-4 h-[calc(100%-8rem)]">
                    <h3 class="text-sm font-bold">Request Details</h3>
                    <div class="mt-2 text-sm">
                        <p><strong>Path:</strong> {selectedLog.path}</p>
                        <p><strong>Duration:</strong> {selectedLog.duration}</p>
                        <p><strong>Status:</strong> {selectedLog.status} {selectedLog.statusText}</p>
                        {selectedLog.init && (
                            <>
                                <h4 class="mt-2 font-bold">Init:</h4>
                                <pre class="text-xs bg-black p-2 rounded">{JSON.stringify(selectedLog.init, null, 2)}</pre>
                            </>
                        )}
                        <h4 class="mt-2 font-bold">Headers:</h4>
                        <ul class="text-xs bg-black p-2 rounded">
                            {selectedLog.headers.map(([key, value], index) => (
                                <li key={index}>
                                    <strong>{key}:</strong> {value}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button
                        class="mt-4 text-blue-500 underline"
                        onClick={() => setSelectedLog(null)}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    ) : null;
};
