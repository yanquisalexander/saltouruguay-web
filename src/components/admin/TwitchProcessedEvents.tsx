import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";

export default function TwitchProcessedEvents() {
    const [events, setEvents] = useState<{ userId: number | null; messageId: string; eventType: string; processedAt: Date; eventData: string | null; }[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef(null);

    useEffect(() => {
        if (!hasMore) return;

        const loadMore = async () => {
            const { data, error } = await actions.admin.serverTools.getTwitchEvents({
                page,
                limit: 10,
            });

            if (error) {
                toast.error("Error al cargar los eventos de Twitch");
                console.error("Error loading Twitch events:", error);
                return;
            }

            if (data) {
                setEvents(prev => [...prev, ...data.events]);
                setHasMore(data.hasMore);
                setPage(prev => prev + 1);
            }
        };

        const observer = new IntersectionObserver(
            ([entry]) => entry.isIntersecting && loadMore(),
            { rootMargin: "100px" }
        );

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [page, hasMore]);

    return (
        <div className="relative w-full overflow-auto rounded-md">
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b bg-[#13131f]">
                    <tr class="border-b transition-colors border-[#1f1f2f] hover:bg-[#13131f]">
                        <th className="h-12 px-4 text-left align-middle font-medium  text-slate-400 w-[180px]">Fecha</th>
                        <th className="h-12 px-4 text-left align-middle font-medium  text-slate-400">ID del Mensaje</th>
                        <th className="h-12 px-4 align-middle font-medium  text-slate-400 text-right w-[120px]">Usuario</th>
                        <th className="h-12 px-4 text-left align-middle font-medium  text-slate-400">
                            Tipo de Evento</th>
                        <th className="h-12 px-4 text-left align-middle font-medium  text-slate-400">Datos del Evento</th>
                    </tr>
                </thead>
                <tbody class="[&_tr:last-child]:border-0">
                    {events.map(event => (
                        <tr key={event.messageId} className="border-b transition-colors  border-[#1f1f2f] hover:bg-[#13131f] bg-[#09090f]">
                            <td className="p-4 align-middle  text-slate-300 font-mono text-xs">
                                <div class="flex items-center gap-2">
                                    {new Date(event.processedAt).toLocaleString()}

                                </div>
                            </td>
                            <td className="p-4 align-middle font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis">{event.messageId}</td>
                            <td className="p-4 align-middle font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis">{event.userId}</td>
                            <td className="p-4 align-middle font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis">{event.eventType}</td>

                            <td className="p-4 align-middle font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis">
                                <pre class="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={event.eventData ? { __html: event.eventData } : { __html: "Sin datos" }}></pre>

                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {hasMore && <div ref={loaderRef} className="text-center py-4">Cargando más eventos...</div>}
        </div>
    );
}
