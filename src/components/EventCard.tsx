import { h } from 'preact';
import { LucideUsers, LucideCalendar, LucideClock, LucideStar, type LucideIcon } from 'lucide-preact';
import { DateTime } from 'luxon';
import type { getEventById } from "@/lib/events";

import { useEffect, useState } from 'preact/hooks';

export const EventCard = ({ firstFeaturedEvent, event }: { firstFeaturedEvent?: boolean, event: Awaited<ReturnType<typeof getEventById>> }) => {
    if (!event) return null;

    const [status, setStatus] = useState<{ status: number, text: string } | null>(null);

    useEffect(() => {
        const getTimeStatus = (startDate: Date, endDate?: Date | null) => {
            const now = DateTime.local();
            const start = DateTime.fromISO(startDate.toISOString()).setZone('local');
            const end = endDate ? DateTime.fromISO(endDate.toISOString()).setZone('local') : null;

            if (now < start) return { status: 0, text: start.toRelative() || "Próximamente" };
            if (end && now > end) return { status: 2, text: `Finalizado ${end.toRelative() || ""}` };
            return { status: 1, text: `En curso desde ${start.toRelative() || ""} hasta ${end?.toRelative() || ""}` };
        };

        setStatus(getTimeStatus(event.startDate, event.endDate));
    }, [event.startDate, event.endDate]);

    return (
        <a
            href={`/eventos/${event.id}`}
            class={`rounded-lg border shadow-sm hover:saturate-150 hover:scale-105 duration-300 cursor-pointer transition 
                ${firstFeaturedEvent
                    ? "col-span-full bg-gradient-to-br border-neutral-600 from-electric-violet-500/10 via-yellow-500/10"
                    : "border-neutral-500/50 bg-neutral-500/5"
                }`}>
            <div class="flex flex-col space-y-1.5 p-4 sm:p-6 pb-4">
                <div class="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
                    <div class="space-y-1 w-full sm:w-auto">
                        <div class="flex flex-wrap items-center gap-2">
                            {event.featured && <Badge icon={LucideStar} text="Destacado" className="bg-primary text-primary-foreground" />}
                            {status?.status === 0 && <Badge text="Próximo" className="bg-blue-500/10 text-blue-500" />}
                            {status?.status === 1 && <Badge text="En curso" className="bg-yellow-500/10 text-yellow-500" />}
                            {status?.status === 2 && <Badge icon={LucideClock} text="Finalizado" className="bg-red-500/10 text-red-500" />}
                            <Badge text="Stream especial" className="bg-purple-500/10 text-purple-500" />
                        </div>
                        <h2 class="text-xl sm:text-2xl font-rubik font-semibold pt-2">{event.name}</h2>
                    </div>
                    <div class="flex flex-col items-start sm:items-end mt-2 sm:mt-0">
                        <InfoRow icon={LucideUsers} text={`${event.assistants.length} confirmados`} />
                        <InfoRow
                            icon={LucideCalendar}
                            text={DateTime.fromISO(event.startDate.toISOString()).setLocale('es').toFormat("EEEE, dd 'de' LLLL 'a las' HH:mm")}
                        />
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row items-start gap-4 mt-4">
                    <img
                        src={event.cover || "/og.webp"}
                        alt={`Portada de ${event.name}`}
                        width={240}
                        height={140}
                        class="rounded-md object-cover w-full aspect-video max-w-[200px] sm:w-60 h-auto"
                    />
                    <div class="flex-1 flex flex-col mt-3 sm:mt-0">
                        <p class="text-sm">{event.description}</p>
                        <div class="mt-4 space-y-2">
                            <div class="flex flex-col gap-1 text-sm">
                                <span class="font-semibold">Organizador</span>
                                <div class="flex items-center gap-2">
                                    <img src={event.mainOrganizer.avatar!} alt="Organizador" class="w-6 h-6 rounded-full" />
                                    <span class="font-semibold">{event.mainOrganizer.displayName}</span>
                                </div>
                            </div>
                            {event.platform && <InfoRow text="Plataforma: Twitch" />}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mt-4">
                    <div class={`flex items-center gap-1 text-sm ${status?.status === 0
                        ? "text-green-500"
                        : status?.status === 1
                            ? "text-yellow-500"
                            : "text-red-500"
                        }`}
                    >
                        <LucideClock class="h-4 w-4" />
                        <span>{status ? status.text : "Calculando..."}</span>
                    </div>
                    {event.url && (
                        <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 text-center"
                        >
                            Unirme al stream
                        </a>
                    )}
                </div>
            </div>
        </a>
    );
};


// **Componente Badge**
const Badge = ({ icon: Icon, text, className }: { icon?: any; text: string; className: string }) => (
    <div class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className || ""}`}>
        {Icon && <Icon class="h-4 w-4 mr-2" />}
        {text}
    </div>

);

// **Componente InfoRow**
const InfoRow = ({ icon: Icon, text }: { icon?: LucideIcon; text: string }) => (
    <div class="flex items-center gap-1 text-sm text-muted-foreground">
        {Icon && <Icon class="h-4 w-4" />}
        <span>{text}</span>
    </div>
);
