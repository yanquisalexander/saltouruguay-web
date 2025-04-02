import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Loader } from "lucide-preact";
import type { getPaginatedEvents } from "@/lib/events";
import { DateTime } from 'luxon';

export default function EventsManager() {
    // State management
    const [events, setEvents] = useState<Awaited<ReturnType<typeof getPaginatedEvents>>['events']>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const limit = 10;

    // Refs
    const dialogRef = useRef<HTMLDialogElement>(null);
    const editorDialogRef = useRef<HTMLDialogElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Form states
    const initialEventState = {
        name: "",
        startDate: "",
        endDate: "",
        location: "",
        description: ""
    };

    const [newEvent, setNewEvent] = useState(initialEventState);
    const [currentEvent, setCurrentEvent] = useState<null | {
        id: number;
        name: string;
        startDate: string | null;
        endDate: string | null;
        location: string;
        description: string;
        // Guardar el evento original completo para referencias
        originalEvent: any;
    }>(null);

    // Data fetching
    const fetchEvents = useCallback(async (pageNum = 1, replace = false) => {
        if (loading) return;

        setLoading(true);
        try {
            const { data, error } = await actions.admin.events.getEvents({
                page: pageNum,
                limit
            });

            if (error) {
                toast.error("Error al cargar los eventos");
                console.error("Error loading events:", error);
                return;
            }

            const newEvents = data.events || [];
            setHasMore(newEvents.length >= limit);
            setEvents(prev => replace ? newEvents : [...prev, ...newEvents]);
        } catch (error) {
            console.error("Error fetching events:", error);
            toast.error("Error al cargar los eventos");
        } finally {
            setLoading(false);
        }
    }, [loading, limit]);

    // Initialize data load
    useEffect(() => {
        fetchEvents(1, true);
    }, []);

    // Function to load more events
    const loadMoreEvents = useCallback(() => {
        if (loading || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchEvents(nextPage);
    }, [loading, hasMore, page, fetchEvents]);

    // Infinite scroll setup
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && hasMore) {
                    loadMoreEvents();
                }
            },
            { threshold: 0.1 }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        observerRef.current = observer;

        return () => {
            if (observer) {
                if (currentRef) observer.unobserve(currentRef);
                observer.disconnect();
            }
        };
    }, [loading, hasMore, loadMoreEvents]);

    // Utility functions
    const refreshEvents = () => {
        setPage(1);
        setHasMore(true);
        fetchEvents(1, true);
    };

    // Lógica de fechas completamente rehecha
    const prepareEventForSubmission = (formEvent: any, originalEvent: any = null) => {
        // Crear una copia para no modificar el original
        const preparedEvent = { ...formEvent };

        // CASO 1: Evento nuevo - solo convertir fechas si existen
        if (!originalEvent) {
            if (formEvent.startDate) {
                preparedEvent.startDate = DateTime.fromISO(formEvent.startDate).toUTC().toISO();
            }

            if (formEvent.endDate) {
                preparedEvent.endDate = DateTime.fromISO(formEvent.endDate).toUTC().toISO();
            }

            return preparedEvent;
        }

        // CASO 2: Edición de un evento existente

        // Preservar ID siempre
        preparedEvent.id = originalEvent.id;

        // Si el formulario tiene una fecha de inicio y fue modificada, convertirla
        if (formEvent.startDate) {
            preparedEvent.startDate = DateTime.fromISO(formEvent.startDate).toUTC().toISO();
        }
        // Si el formulario NO tiene fecha de inicio pero el evento original sí, usamos la original
        else if (originalEvent.startDate) {
            // Usamos directamente el objeto Date original
            preparedEvent.startDate = originalEvent.startDate;
        }

        // Mismo proceso para la fecha de fin
        if (formEvent.endDate) {
            preparedEvent.endDate = DateTime.fromISO(formEvent.endDate).toUTC().toISO();
        }
        else if (originalEvent.endDate) {
            preparedEvent.endDate = originalEvent.endDate;
        }

        return preparedEvent;
    };

    const validateEvent = (event: any) => {
        if (!event.name || event.name.trim() === "") {
            toast.error("El nombre es obligatorio");
            return false;
        }

        // Para nuevos eventos, la fecha de inicio es obligatoria
        // Para ediciones, permitimos actualizar solo otros campos
        if (!event.startDate && !event.originalEvent?.startDate) {
            toast.error("La fecha de inicio es obligatoria");
            return false;
        }

        // Si ambas fechas están presentes, validamos que la fecha fin sea posterior
        if (event.startDate && event.endDate) {
            try {
                const startDate = DateTime.fromISO(event.startDate);
                const endDate = DateTime.fromISO(event.endDate);

                if (endDate < startDate) {
                    toast.error("La fecha de finalización no puede ser anterior a la de inicio");
                    return false;
                }
            } catch (e) {
                console.error("Error validando fechas:", e);
                toast.error("Formato de fechas inválido");
                return false;
            }
        }

        return true;
    };

    // Dialog handlers
    const openDialog = () => dialogRef.current?.showModal();

    const closeDialog = () => {
        dialogRef.current?.close();
        setNewEvent(initialEventState);
    };

    const openEditorDialog = (event: typeof events[number]) => {
        try {
            // Formatea las fechas para el formulario si existen
            const startDateFormatted = event.startDate
                ? DateTime.fromJSDate(event.startDate).toFormat("yyyy-MM-dd'T'HH:mm")
                : "";

            const endDateFormatted = event.endDate
                ? DateTime.fromJSDate(event.endDate).toFormat("yyyy-MM-dd'T'HH:mm")
                : "";

            setCurrentEvent({
                id: event.id,
                name: event.name,
                startDate: startDateFormatted,
                endDate: endDateFormatted,
                location: event.location || "",
                description: event.description || "",
                originalEvent: event // Guardar el evento original completo
            });

            editorDialogRef.current?.showModal();
        } catch (error) {
            console.error("Error al abrir el diálogo de edición:", error);
            toast.error("Error al cargar los datos del evento");
        }
    };

    const closeEditorDialog = () => {
        editorDialogRef.current?.close();
        setCurrentEvent(null);
    };

    // Event CRUD operations
    const createEvent = async () => {
        if (!validateEvent(newEvent)) return;

        try {
            const eventToSubmit = prepareEventForSubmission(newEvent);
            const { error } = await actions.admin.events.createEvent(eventToSubmit);

            if (error) {
                toast.error("Error al crear el evento");
                return;
            }

            toast.success("Evento creado exitosamente");
            refreshEvents();
            closeDialog();
        } catch (error) {
            console.error("Error creating event:", error);
            toast.error("Error al crear el evento");
        }
    };

    const updateEvent = async () => {
        if (!currentEvent) return;
        if (!validateEvent(currentEvent)) return;

        try {
            // Usar la función optimizada para preparar el evento
            const eventToSubmit = prepareEventForSubmission(currentEvent, currentEvent.originalEvent);

            // Log para debug
            console.log("Enviando actualización:", eventToSubmit);

            const { error } = await actions.admin.events.updateEvent(eventToSubmit);

            if (error) {
                toast.error("Error al actualizar el evento");
                return;
            }

            toast.success("Evento actualizado exitosamente");
            refreshEvents();
            closeEditorDialog();
        } catch (error) {
            console.error("Error updating event:", error);
            toast.error("Error al actualizar el evento");
        }
    };

    const deleteEvent = async (id: number) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este evento?")) return;

        try {
            const { error } = await actions.admin.events.deleteEvent(id);

            if (error) {
                toast.error("Error al eliminar el evento");
                return;
            }

            toast.success("Evento eliminado exitosamente");
            refreshEvents();
        } catch (error) {
            console.error("Error deleting event:", error);
            toast.error("Error al eliminar el evento");
        }
    };

    // Form event handlers
    const handleDateChange = (e: Event, field: string, isNewEvent = true) => {
        const picker = e.target as HTMLInputElement;
        if (isNewEvent) {
            setNewEvent(prev => ({ ...prev, [field]: picker.value }));
        } else if (currentEvent) {
            setCurrentEvent(prev => prev ? { ...prev, [field]: picker.value } : null);
        }
    };

    const handleInputChange = (e: Event, field: string, isNewEvent = true) => {
        const input = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
        if (isNewEvent) {
            setNewEvent(prev => ({ ...prev, [field]: input.value }));
        } else if (currentEvent) {
            setCurrentEvent(prev => prev ? { ...prev, [field]: input.value } : null);
        }
    };

    // Display formatting
    const formatEventDuration = (event: typeof events[number]) => {
        if (!event.startDate) {
            return <span className="text-amber-400">Fecha no definida</span>;
        }

        const startDate = DateTime.fromJSDate(event.startDate);
        const endDate = event.endDate ? DateTime.fromJSDate(event.endDate) : null;
        const now = DateTime.local();

        if (!endDate) {
            return (
                <span title={startDate.toLocaleString(DateTime.DATETIME_FULL)}>
                    {startDate.toRelative()}
                </span>
            );
        }

        if (endDate < now) {
            return (
                <span title={endDate.toLocaleString(DateTime.DATETIME_FULL)} className="text-gray-400">
                    Finalizado hace {endDate.toRelative()}
                </span>
            );
        }

        if (startDate <= now && endDate > now) {
            const totalDuration = endDate.diff(startDate, 'milliseconds').milliseconds;
            const elapsedDuration = now.diff(startDate, 'milliseconds').milliseconds;
            const percentageElapsed = (elapsedDuration / totalDuration) * 100;

            return (
                <span title={percentageElapsed < 50
                    ? startDate.toLocaleString(DateTime.DATETIME_FULL)
                    : endDate.toLocaleString(DateTime.DATETIME_FULL)}
                    className="text-green-400">
                    {percentageElapsed < 50
                        ? `Comenzado hace ${startDate.toRelative()}`
                        : `Finaliza en ${endDate.toRelative()}`}
                </span>
            );
        }

        if (startDate > now) {
            return (
                <span title={startDate.toLocaleString(DateTime.DATETIME_FULL)} className="text-blue-400">
                    Comienza en {startDate.toRelative()}
                </span>
            );
        }

        return null;
    };

    // UI Components
    const renderEventForm = (event: any, isNew = true) => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm text-gray-300">Nombre</label>
                <input
                    type="text"
                    value={event.name}
                    onInput={(e) => handleInputChange(e, 'name', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                    placeholder="Nombre del evento"
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Fecha de Inicio</label>
                <input
                    type="datetime-local"
                    value={event.startDate || ""}
                    onInput={(e) => handleDateChange(e, 'startDate', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                    style={{ colorScheme: "dark" }}
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Fecha de Fin (opcional)</label>
                <input
                    type="datetime-local"
                    value={event.endDate || ""}
                    onInput={(e) => handleDateChange(e, 'endDate', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                    style={{ colorScheme: "dark" }}
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Ubicación</label>
                <input
                    type="text"
                    value={event.location || ""}
                    onInput={(e) => handleInputChange(e, 'location', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                    placeholder="Ubicación (opcional)"
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Descripción</label>
                <textarea
                    value={event.description || ""}
                    onInput={(e) => handleInputChange(e, 'description', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md h-32"
                    placeholder="Descripción del evento (opcional)"
                />
            </div>
        </div>
    );

    return (
        <div className="relative w-full overflow-auto rounded-md">
            <div className="flex justify-between mb-4 sticky top-0 z-10 py-3">
                <h2 className="text-lg font-semibold text-slate-400">Administrador de Eventos</h2>
                <button
                    onClick={openDialog}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md"
                >
                    <Plus size={16} /> Crear Evento
                </button>
            </div>

            <div className="min-h-[400px]">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b bg-[#13131f] sticky top-14 z-10">
                        <tr className="border-b border-[#1f1f2f]">
                            <th className="h-12 px-4 text-left text-slate-400">

                            </th>
                            <th className="h-12 px-4 text-left text-slate-400">Nombre</th>
                            <th className="h-12 px-4 text-left text-slate-400">Fecha y Hora</th>
                            <th className="h-12 px-4 text-left text-slate-400">Ubicación</th>
                            <th className="h-12 px-4 text-left text-slate-400">Última Modificación</th>
                            <th className="h-12 px-4 text-left text-slate-400">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map(event => (
                            <tr key={event.id} className="border-b border-[#1f1f2f] bg-[#09090f]">
                                <td class="">
                                    <img
                                        src={event.cover || "/og.webp"}
                                        alt="Evento"
                                        draggable={false}
                                        className="aspect-video h-16 object-scale-down rounded-md"
                                    />
                                </td>
                                <td className="p-4 text-slate-300">{event.name}</td>
                                <td className="p-4 text-slate-300">{formatEventDuration(event)}</td>
                                <td className="p-4 text-slate-300">{event.location ?? "No especificada"}</td>
                                <td className="p-4 text-slate-300">
                                    {event.updatedAt ? (
                                        <span title={DateTime.fromJSDate(event.updatedAt).toLocaleString()}>
                                            {DateTime.fromJSDate(event.updatedAt).toRelative()}
                                        </span>
                                    ) : (
                                        "Nunca"
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditorDialog(event)}
                                            title="Editar Evento"
                                            className="text-blue-500 hover:text-blue-400">
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => deleteEvent(event.id)}
                                            title="Eliminar Evento"
                                            className="text-red-500 hover:text-red-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {events.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    No hay eventos disponibles
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {(hasMore || loading) && (
                    <div
                        ref={loadMoreRef}
                        className="w-full py-4 flex justify-center"
                        style={{ minHeight: "50px" }}
                    >
                        {loading && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <Loader size={16} className="animate-spin" />
                                <span>Cargando eventos...</span>
                            </div>
                        )}
                    </div>
                )}

                {!hasMore && events.length > 0 && (
                    <p className="w-full py-4 text-center text-slate-400 text-sm">No hay más eventos para cargar</p>
                )}
            </div>

            {/* Dialogo para crear evento */}
            <dialog ref={dialogRef} className="bg-[#13131f] p-6 rounded-md shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Crear Evento</h3>
                {renderEventForm(newEvent, true)}
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={closeDialog} className="bg-gray-600 hover:bg-gray-500 px-3 py-2 text-white rounded-md">Cancelar</button>
                    <button onClick={createEvent} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md">Crear</button>
                </div>
            </dialog>

            {/* Dialogo para editar evento */}
            <dialog ref={editorDialogRef} className="bg-[#13131f] p-6 rounded-md shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Editar Evento</h3>
                {currentEvent && renderEventForm(currentEvent, false)}
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={closeEditorDialog} className="bg-gray-600 hover:bg-gray-500 px-3 py-2 text-white rounded-md">Cancelar</button>
                    <button onClick={updateEvent} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md">Guardar</button>
                </div>
            </dialog>
        </div>
    );
}