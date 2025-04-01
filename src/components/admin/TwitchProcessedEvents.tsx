import { actions } from "astro:actions";
import { useState, useEffect, useRef } from "preact/hooks";
import { toast } from "sonner";
import { CheckCircle, UserPlus, Gift, MessageCircle, LucidePiggyBank } from "lucide-preact";

export default function TwitchProcessedEvents() {
    const [events, setEvents] = useState<
        { userId: number | null; messageId: string; eventType: string; processedAt: Date; eventData: string | null }[]
    >([]);
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
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400 w-[180px]">Fecha</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Tipo de Evento</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">ID del Mensaje</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Datos del Evento</th>
                    </tr>
                </thead>
                <tbody class="[&_tr:last-child]:border-0">
                    {events.map(event => (
                        <tr key={event.messageId} className="border-b transition-colors border-[#1f1f2f] hover:bg-[#13131f] bg-[#09090f]">
                            <td className="p-4 align-middle text-slate-300 font-mono text-xs">
                                <div className="flex items-center gap-2">
                                    {new Date(event.processedAt).toLocaleString()}
                                </div>
                            </td>

                            {/* Tipo de evento con Chip */}
                            <td className="p-4 align-middle">
                                <EventChip eventType={event.eventType} />
                            </td>



                            <td className="p-4 align-middle font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis">
                                {event.messageId}
                            </td>

                            <td className="p-4 align-middle font-mono text-xs text-indigo-300 overflow-hidden text-ellipsis max-h-[200px]">
                                <pre className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={event.eventData ? { __html: event.eventData } : { __html: "Sin datos" }}>
                                </pre>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {hasMore && <div ref={loaderRef} className="text-center py-4">Cargando más eventos...</div>}
        </div>
    );
}

/**
 * Muestra un chip con icono según el tipo de evento
 */
function EventChip({ eventType }: { eventType: string }) {
    const eventStyles = {
        "channel.subscribe": { icon: <LucidePiggyBank size={14} />, color: "bg-orange-500", text: "Suscripción" },
        "channel.follow": { icon: <UserPlus size={14} />, color: "bg-green-600", text: "Nuevo Seguidor" },
        "channel.subscription": { icon: <CheckCircle size={14} />, color: "bg-blue-600", text: "Suscripción" },
        "channel.cheer": { icon: <Gift size={14} />, color: "bg-yellow-600", text: "Cheers" },
        "chat.message": { icon: <MessageCircle size={14} />, color: "bg-purple-600", text: "Mensaje en Chat" },
    };

    const eventData = eventStyles[eventType as keyof typeof eventStyles] ||
        { icon: <MessageCircle size={14} />, color: "bg-gray-600", text: `Evento desconocido (${eventType})` };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded-md ${eventData.color}`}>
            {eventData.icon} {eventData.text}
        </span>
    );
}
