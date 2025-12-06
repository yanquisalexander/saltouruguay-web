import { h } from 'preact';
import { LucideUsers, LucideCalendar, LucideClock, LucideStar, LucideExternalLink, LucideTv } from 'lucide-preact';
import { DateTime } from 'luxon';
import type { getEventById } from "@/lib/events";
import { useEffect, useState } from 'preact/hooks';

export const EventCard = ({ firstFeaturedEvent, event, index }: { firstFeaturedEvent?: boolean, event: Awaited<ReturnType<typeof getEventById>>, index: number }) => {
    if (!event) return null;

    const [status, setStatus] = useState<{ status: number, text: string } | null>(null);
    const [dateFormatted, setDateFormatted] = useState(
        DateTime.fromISO(event.startDate.toISOString()).setLocale('es').toFormat("dd MMM, HH:mm")
    );

    useEffect(() => {
        const getTimeStatus = (startDate: Date, endDate?: Date | null) => {
            const now = DateTime.local();
            const start = DateTime.fromISO(startDate.toISOString()).setZone('local');
            const end = endDate ? DateTime.fromISO(endDate.toISOString()).setZone('local') : null;

            if (now < start) return { status: 0, text: start.toRelative() || "Próximamente" };
            if (end && now > end) return { status: 2, text: `Finalizado` };
            return { status: 1, text: `En curso ahora` };
        };

        setStatus(getTimeStatus(event.startDate, event.endDate));

        // Update date to local
        setDateFormatted(
            DateTime.fromISO(event.startDate.toISOString())
                .setZone('local')
                .setLocale('es')
                .toFormat("dd MMM, HH:mm")
        );
    }, [event.startDate, event.endDate]);

    return (
        <a
            href={`/eventos/${event.id}`}
            className={`
                group relative flex flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] transition-all duration-500 hover:border-white/30 hover:shadow-2xl hover:shadow-purple-900/20
                ${firstFeaturedEvent ? 'min-h-[400px] md:min-h-[500px]' : 'min-h-[350px]'}
                animate-fade-in-up
            `}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* --- IMAGEN DE FONDO --- */}
            <div className="absolute inset-0 z-0">
                <img
                    src={event.cover || "/og.webp"}
                    alt={event.name}
                    className={`
                        w-full h-full object-cover transition-transform duration-700
                        ${firstFeaturedEvent ? 'scale-105 group-hover:scale-100' : 'scale-100 group-hover:scale-110'}
                    `}
                />
                {/* Overlay Gradiente para legibilidad */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent transition-opacity duration-300 ${firstFeaturedEvent ? 'opacity-90' : 'opacity-80 group-hover:opacity-90'}`}></div>
            </div>

            {/* --- BADGES SUPERIORES --- */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
                {event.featured && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold uppercase tracking-wider shadow-lg">
                        <LucideStar size={12} fill="currentColor" /> Destacado
                    </span>
                )}

                {status && (
                    <span className={`
                        flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-md border border-white/10
                        ${status.status === 0 ? 'bg-blue-600/80 text-white' : ''}
                        ${status.status === 1 ? 'bg-red-600 text-white animate-pulse' : ''}
                        ${status.status === 2 ? 'bg-black/60 text-white/50' : ''}
                    `}>
                        {status.status === 1 && <div className="size-2 rounded-full bg-white animate-ping mr-1"></div>}
                        {status.text}
                    </span>
                )}
            </div>

            {/* --- CONTENIDO --- */}
            <div className="relative z-10 p-6 md:p-8 flex flex-col h-full justify-end">

                <div className="space-y-4">
                    {/* Título & Info */}
                    <div>
                        <div className="flex items-center gap-3 text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
                            <span className="flex items-center gap-1.5"><LucideCalendar size={14} /> {dateFormatted}</span>
                            {event.assistants.length > 0 && (
                                <>
                                    <span className="size-1 rounded-full bg-white/20"></span>
                                    <span className="flex items-center gap-1.5"><LucideUsers size={14} /> {event.assistants.length}</span>
                                </>
                            )}
                        </div>

                        <h2 className={`font-anton text-white uppercase leading-none mb-2 ${firstFeaturedEvent ? 'text-4xl md:text-6xl' : 'text-3xl'}`}>
                            {event.name}
                        </h2>

                        <p className={`font-rubik text-white/70 line-clamp-2 ${firstFeaturedEvent ? 'text-lg max-w-2xl' : 'text-sm'}`}>
                            {event.description}
                        </p>
                    </div>

                    {/* Organizador & Action */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-3">
                            <img
                                src={event.mainOrganizer.avatar || `https://ui-avatars.com/api/?name=${event.mainOrganizer.displayName}`}
                                alt={event.mainOrganizer.displayName}
                                className="size-8 rounded-full border border-white/20"
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Organiza</span>
                                <span className="text-sm text-white font-medium leading-none">{event.mainOrganizer.displayName}</span>
                            </div>
                        </div>

                        {event.url ? (
                            <button className="size-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                <LucideExternalLink size={20} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1 text-white/30 text-xs font-bold uppercase">
                                <LucideTv size={14} /> Info
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </a>
    );
};