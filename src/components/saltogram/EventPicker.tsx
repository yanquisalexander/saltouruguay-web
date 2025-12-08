import { useState, useEffect } from "preact/hooks";
import { actions } from "astro:actions";
import { LucideCalendar, LucideX, LucideLoader2 } from "lucide-preact";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Event {
    id: number;
    name: string;
    startDate: string | Date;
    cover: string | null;
}

interface EventPickerProps {
    onSelect: (event: Event) => void;
    onClose: () => void;
}

export default function EventPicker({ onSelect, onClose }: EventPickerProps) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const { data, error } = await actions.events.getUpcoming();
            if (data?.events) {
                setEvents(data.events as any);
            }
        } catch (e) {
            console.error("Error loading events", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-[#18191a] z-20 flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <LucideCalendar size={20} className="text-purple-400" />
                    Seleccionar Evento
                </h3>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                    <LucideX size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <LucideLoader2 className="animate-spin text-purple-500" size={24} />
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-white/30 gap-2">
                        <LucideCalendar size={32} />
                        <p>No hay eventos próximos</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {events.map(event => (
                            <button
                                type="button"
                                key={event.id}
                                onClick={() => onSelect(event)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-white/5">
                                    {event.cover ? (
                                        <img src={event.cover} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <LucideCalendar size={20} className="text-white/30 group-hover:text-purple-400" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-medium truncate">{event.name}</p>
                                    <p className="text-sm text-white/40">
                                        {format(new Date(event.startDate), "d 'de' MMMM • HH:mm", { locale: es })}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
