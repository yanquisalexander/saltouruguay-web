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
    const [isEditing, setIsEditing] = useState(false);
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
        startDate: string;
        endDate: string;
        location: string;
        description: string;
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

            // Si no hay eventos nuevos o son menos que el límite, no hay más para cargar
            setHasMore(newEvents.length >= limit);

            // Actualizar la lista de eventos
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
    }, []); // Eliminada la dependencia fetchEvents para evitar cargas iniciales múltiples

    // Function to load more events - separate from the IntersectionObserver
    const loadMoreEvents = useCallback(() => {
        if (loading || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchEvents(nextPage);
    }, [loading, hasMore, page, fetchEvents]);

    // Infinite scroll setup - Corregido para evitar bucle infinito
    useEffect(() => {
        // Limpiar cualquier observer anterior
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        // No crear un nuevo observer si no hay más elementos o estamos cargando
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && hasMore) {
                    loadMoreEvents();
                }
            },
            { threshold: 0.1 } // Reducido el threshold para que sea menos sensible
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        observerRef.current = observer;

        return () => {
            if (currentRef && observer) {
                observer.unobserve(currentRef);
            }
            observer.disconnect();
        };
    }, [loading, hasMore, page]); // Quitado loadMoreEvents de las dependencias

    // Utility functions
    const refreshEvents = () => {
        setPage(1);
        setHasMore(true);
        fetchEvents(1, true);
    };

    const convertToUTC = (event: any) => {
        const startDate = DateTime.fromISO(event.startDate).toUTC().toISO();
        const endDate = event.endDate ? DateTime.fromISO(event.endDate).toUTC().toISO() : null;

        return {
            ...event,
            startDate,
            endDate
        };
    };

    const validateEvent = (event: any) => {
        if (!event.name) {
            toast.error("El nombre es obligatorio");
            return false;
        }
        if (!event.startDate) {
            toast.error("La fecha de inicio es obligatoria");
            return false;
        }

        const startDate = new Date(event.startDate);
        const endDate = event.endDate ? new Date(event.endDate) : null;

        if (endDate && endDate < startDate) {
            toast.error("La fecha de finalización no puede ser anterior a la de inicio");
            return false;
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
        const startDate = DateTime.fromISO(event.startDate.toISOString()).setZone('local');
        const endDate = event.endDate ? DateTime.fromISO(event.endDate.toISOString()).setZone('local') : null;

        setCurrentEvent({
            id: event.id,
            name: event.name,
            startDate: startDate.toFormat('yyyy-LL-dd HH:mm'),
            endDate: endDate ? endDate.toFormat('yyyy-LL-dd HH:mm') : "",
            location: event.location || "",
            description: event.description || ""
        });

        setIsEditing(true);
        editorDialogRef.current?.showModal();
    };

    const closeEditorDialog = () => {
        editorDialogRef.current?.close();
        setCurrentEvent(null);
        setIsEditing(false);
    };

    // Event CRUD operations
    const createEvent = async () => {
        if (!validateEvent(newEvent)) return;

        try {
            const eventWithUTC = convertToUTC(newEvent);
            const { error } = await actions.admin.events.createEvent(eventWithUTC);

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
        if (!currentEvent || !validateEvent(currentEvent)) return;

        try {
            const eventWithUTC = convertToUTC(currentEvent);
            const { error } = await actions.admin.events.updateEvent(eventWithUTC);

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
        const startDate = DateTime.fromISO(event.startDate.toISOString());
        const endDate = event.endDate ? DateTime.fromISO(event.endDate.toISOString()) : null;
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
                <span title={endDate.toLocaleString(DateTime.DATETIME_FULL)}>
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
                    : endDate.toLocaleString(DateTime.DATETIME_FULL)}>
                    {percentageElapsed < 50
                        ? `Comenzado hace ${startDate.toRelative()}`
                        : `Finaliza en ${endDate.toRelative()}`}
                </span>
            );
        }

        if (startDate > now) {
            return (
                <span title={startDate.toLocaleString(DateTime.DATETIME_FULL)}>
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
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Fecha de Inicio</label>
                <input
                    type="datetime-local"
                    value={event.startDate}
                    onInput={(e) => handleDateChange(e, 'startDate', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                    style={{ colorScheme: "dark" }}
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Fecha de Fin (opcional)</label>
                <input
                    type="datetime-local"
                    value={event.endDate}
                    onInput={(e) => handleDateChange(e, 'endDate', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                    style={{ colorScheme: "dark" }}
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Ubicación</label>
                <input
                    type="text"
                    value={event.location}
                    onInput={(e) => handleInputChange(e, 'location', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300">Descripción</label>
                <textarea
                    value={event.description}
                    onInput={(e) => handleInputChange(e, 'description', isNew)}
                    className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md h-32"
                />
            </div>
        </div>
    );

    return (
        <div className="relative w-full overflow-auto rounded-md">
            <div className="flex justify-between mb-4 sticky top-0 z-10 py-3">
                <h2 className="text-lg font-semibold text-slate-400"></h2>
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
                                <td className="p-4 text-slate-300">{event.name}</td>
                                <td className="p-4 text-slate-300">{formatEventDuration(event)}</td>
                                <td className="p-4 text-slate-300">{event.location ?? "No especificada"}</td>
                                <td className="p-4 text-slate-300">
                                    {event.updatedAt ? (
                                        <span title={DateTime.fromISO(event.updatedAt.toISOString()).toLocal().toLocaleString()}>
                                            {DateTime.fromISO(event.updatedAt.toISOString()).toLocal().toRelative()}
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

                {/* Este div debe estar fuera de la vista inicial hasta que se haga scroll */}
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