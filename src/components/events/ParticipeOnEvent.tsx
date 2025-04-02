import type { getEventById, getEventAssistants } from "@/lib/events";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideCalendarPlus, LucideLoader2, LucideUserX } from "lucide-preact";
import { useState } from "preact/hooks";
import { toast } from "sonner";

export const ParticipeOnEvent = ({ event, assistants, session }: { event: Awaited<ReturnType<typeof getEventById>>, assistants: Awaited<ReturnType<typeof getEventAssistants>>, session: Session | null }) => {
    if (!event) return null;

    const [loading, setLoading] = useState(false);
    const [isAssistant, setIsAssistant] = useState(assistants.some(assistant => assistant.userId === session?.user.id));

    const isMainOrganizer = event.mainOrganizer.id === session?.user.id;
    const isEventFinished = new Date(event.endDate!) < new Date();
    const isEventStarted = new Date(event.startDate!) < new Date();
    const isEventInProgress = isEventStarted && !isEventFinished;

    const handleClick = async () => {
        if (isMainOrganizer) {
            toast.error("No puedes agendar o cancelar asistencia a tu propio evento", { id: "cancel-assistance" });
            return;
        }

        setLoading(true);

        if (isAssistant) {
            toast.loading("Cancelando asistencia...", { id: "cancel-assistance" });
            const { error } = await actions.userEvents.cancelAssistanceToEvent({ eventId: event.id });

            if (error) {
                toast.error("Error al cancelar asistencia", { id: "cancel-assistance" });
            } else {
                toast.success("Asistencia cancelada", { id: "cancel-assistance" });
                setIsAssistant(false);
            }
        } else {
            toast.loading("Confirmando asistencia...", { id: "confirm-assistance" });
            const { error } = await actions.userEvents.assistToEvent({ eventId: event.id });

            if (error) {
                toast.error("Error al confirmar asistencia", { id: "confirm-assistance" });
            } else {
                toast.success("Asistencia confirmada", { id: "confirm-assistance" });
                setIsAssistant(true);
            }
        }
        setLoading(false);
    };

    return (
        <button
            onClick={handleClick}
            type="button"
            aria-label={isAssistant ? "Cancelar asistencia" : "Asistir al evento"}
            disabled={loading || isEventFinished || isMainOrganizer || isEventInProgress || isEventStarted}
            class="bg-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-100 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            <div class="flex items-center space-x-2">
                {loading ? (
                    <LucideLoader2 class="w-6 h-6 animate-spin text-gray-500" />
                ) : isAssistant ? (
                    <LucideUserX class="w-6 h-6 text-red-500" />
                ) : (
                    <LucideCalendarPlus class="w-6 h-6 text-blue-500" />
                )}
                <span class="text-sm font-medium text-gray-700">
                    {isEventStarted && !isEventFinished
                        ? "El evento ya ha comenzado"
                        : isEventFinished
                            ? "El evento ha finalizado"
                            : isAssistant
                                ? "Cancelar asistencia"
                                : "Asistir al evento"}
                </span>
            </div>
        </button>
    );
};