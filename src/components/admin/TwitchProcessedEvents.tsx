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
        <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-neutral-700">
                <thead className="bg-neutral-800">
                    <tr>
                        <th className="border border-neutral-700 px-4 py-2">Fecha</th>
                        <th className="border border-neutral-700 px-4 py-2">Mensaje</th>
                        <th className="border border-neutral-700 px-4 py-2">Usuario</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map(event => (
                        <tr key={event.messageId} className="hover:bg-gray-100">
                            <td className="border border-gray-300 px-4 py-2">
                                {new Date(event.processedAt).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">{event.messageId}</td>
                            <td className="border border-gray-300 px-4 py-2">{event.userId}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {hasMore && <div ref={loaderRef} className="text-center py-4">Cargando más eventos...</div>}
        </div>
    );
}
