import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Loader } from "lucide-preact";
import type { getPaginatedEvents } from "@/lib/events";
import { DateTime } from 'luxon';


export default function EventsManager() {
    const [events, setEvents] = useState<Awaited<ReturnType<typeof getPaginatedEvents>>['events']>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const limit = 10; // Number of items per page

    const dialogRef = useRef<HTMLDialogElement>(null);
    const editorDialogRef = useRef<HTMLDialogElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const [newEvent, setNewEvent] = useState({
        name: "",
        startDate: "",
        endDate: "",
        location: "",
        description: ""
    });

    const [currentEvent, setCurrentEvent] = useState<null | {
        id: number;
        name: string;
        startDate: string;
        endDate: string;
        location: string;
        description: string;
    }>(null);

    const [isEditing, setIsEditing] = useState(false);

    const fetchEvents = useCallback(async (pageNum = 1, replace = false) => {
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

            if (newEvents.length < limit) {
                setHasMore(false);
            }

            setEvents(prev => replace ? newEvents : [...prev, ...newEvents]);
        } catch (error) {
            console.error("Error fetching events:", error);
            toast.error("Error al cargar los eventos");
        } finally {
            setLoading(false);
        }
    }, [limit]);

    // Initial load of events
    useEffect(() => {
        fetchEvents(1, true);
    }, [fetchEvents]);

    // Setup intersection observer for infinite scrolling
    useEffect(() => {
        if (loading || !hasMore) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMoreEvents();
                }
            },
            { threshold: 0.5 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loading, hasMore]);

    const loadMoreEvents = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchEvents(nextPage);
    };

    const refreshEvents = () => {
        setPage(1);
        setHasMore(true);
        fetchEvents(1, true);
    };

    const openDialog = () => {
        dialogRef.current?.showModal();
    };

    const closeDialog = () => {
        dialogRef.current?.close();
        setNewEvent({
            name: "",
            startDate: "",
            endDate: "",
            location: "",
            description: ""
        });
    };

    const openEditorDialog = (event: typeof events[number]) => {
        // Usar Luxon para convertir las fechas a hora local
        const startDate = DateTime.fromISO(event.startDate.toISOString()).setZone('local');
        const endDate = event.endDate ? DateTime.fromISO(event.endDate.toISOString()).setZone('local') : null;

        // Formatear las fechas para el campo 'datetime-local'
        const localStartDate = startDate.toFormat('yyyy-LL-dd HH:mm');
        const localEndDate = endDate ? endDate.toFormat('yyyy-LL-dd HH:mm') : "";

        setCurrentEvent({
            id: event.id,
            name: event.name,
            startDate: localStartDate,
            endDate: localEndDate,
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

    const createEvent = async () => {
        if (!newEvent.name) {
            toast.error("El nombre es obligatorio");
            return;
        }
        if (!newEvent.startDate) {
            toast.error("La fecha de inicio es obligatoria");
            return;
        }

        try {
            const { error } = await actions.admin.events.createEvent(newEvent);
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

        if (!currentEvent.name) {
            toast.error("El nombre es obligatorio");
            return;
        }
        if (!currentEvent.startDate) {
            toast.error("La fecha de inicio es obligatoria");
            return;
        }

        // Validación para asegurarse de que la fecha de fin no sea antes de la fecha de inicio
        const startDate = new Date(currentEvent.startDate);
        const endDate = currentEvent.endDate ? new Date(currentEvent.endDate) : null;

        if (endDate && endDate < startDate) {
            toast.error("La fecha de finalización no puede ser anterior a la de inicio");
            return;
        }

        try {
            const { error } = await actions.admin.events.updateEvent(currentEvent);
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
        if (!confirm("¿Estás seguro de que quieres eliminar este evento?")) {
            return;
        }

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

    const handleDateChange = (e: Event, field: string, isNewEvent = true) => {
        const picker = e.target as HTMLInputElement;
        if (isNewEvent) {
            setNewEvent({ ...newEvent, [field]: picker.value });
        } else if (currentEvent) {
            setCurrentEvent({ ...currentEvent, [field]: picker.value });
        }
    };

    const formatEventDuration = (event: typeof events[number]) => {
        const startDate = DateTime.fromISO(event.startDate.toISOString());
        const endDate = event.endDate ? DateTime.fromISO(event.endDate.toISOString()) : null;
        const now = DateTime.local(); // Fecha y hora actual

        // Caso 1: Si no hay fecha de cierre, solo mostrar la fecha de inicio
        if (!endDate) {
            return (
                <span title={startDate.toLocaleString(DateTime.DATETIME_FULL)}>
                    {startDate.toRelative()}
                </span>
            );
        }

        // Caso 2: Evento ya finalizado
        if (endDate < now) {
            return (
                <span title={endDate.toLocaleString(DateTime.DATETIME_FULL)}>
                    Finalizado hace {endDate.toRelative()}
                </span>
            );
        }

        // Caso 3: Evento en curso
        if (startDate <= now && endDate > now) {
            const totalDuration = endDate.diff(startDate, 'milliseconds').milliseconds;
            const elapsedDuration = now.diff(startDate, 'milliseconds').milliseconds;
            const percentageElapsed = (elapsedDuration / totalDuration) * 100;

            if (percentageElapsed < 50) {
                return (
                    <span title={startDate.toLocaleString(DateTime.DATETIME_FULL)}>
                        Comenzado hace {startDate.toRelative()}
                    </span>
                );
            } else {
                return (
                    <span title={endDate.toLocaleString(DateTime.DATETIME_FULL)}>
                        Finaliza en {endDate.toRelative()}
                    </span>
                );
            }
        }

        // Caso 4: Evento no ha comenzado
        if (startDate > now) {
            return (
                <span title={startDate.toLocaleString(DateTime.DATETIME_FULL)}>
                    Comienza en {startDate.toRelative()}
                </span>
            );
        }

        return null; // Fallback en caso de que no encaje en ningún caso
    };

    return (
        <div className="relative w-full overflow-auto rounded-md">
            <div className="flex justify-between mb-4 sticky top-0 z-10 py-3">
                <h2 className="text-lg font-semibold text-slate-400"></h2>
                <button onClick={openDialog} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md">
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
                                <td className="p-4 text-slate-300">{new Date(event.updatedAt).toLocaleString()}</td>
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
                    </tbody>
                </table>

                {/* Infinite scroll loader */}
                <div
                    ref={loadMoreRef}
                    className="w-full py-4 flex justify-center"
                >
                    {loading && (
                        <div className="flex items-center gap-2 text-slate-400">
                            <Loader size={16} className="animate-spin" />
                            <span>Cargando eventos...</span>
                        </div>
                    )}
                    {!hasMore && events.length > 0 && (
                        <p className="text-slate-400 text-sm">No hay más eventos para cargar</p>
                    )}
                    {!hasMore && events.length === 0 && (
                        <p className="text-slate-400 text-sm">No hay eventos disponibles</p>
                    )}
                </div>
            </div>

            {/* Dialogo para crear evento */}
            <dialog ref={dialogRef} className="bg-[#13131f] p-6 rounded-md shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Crear Evento</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300">Nombre</label>
                        <input
                            type="text"
                            value={newEvent.name}
                            onInput={(e) => setNewEvent({ ...newEvent, name: e.currentTarget.value })}
                            className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300">Fecha de Inicio</label>
                        <input
                            type="datetime-local"
                            value={newEvent.startDate}
                            onInput={(e) => handleDateChange(e, 'startDate')}
                            className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300">Fecha de Fin (opcional)</label>
                        <input
                            type="datetime-local"
                            value={newEvent.endDate}
                            onInput={(e) => handleDateChange(e, 'endDate')}
                            className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300">Ubicación</label>
                        <input
                            type="text"
                            value={newEvent.location}
                            onInput={(e) => setNewEvent({ ...newEvent, location: e.currentTarget.value })}
                            className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300">Descripción</label>
                        <textarea
                            value={newEvent.description}
                            onInput={(e) => setNewEvent({ ...newEvent, description: e.currentTarget.value })}
                            className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md h-32"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={closeDialog} className="bg-gray-600 hover:bg-gray-500 px-3 py-2 text-white rounded-md">Cancelar</button>
                    <button onClick={createEvent} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md">Crear</button>
                </div>
            </dialog>

            {/* Dialogo para editar evento */}
            <dialog ref={editorDialogRef} className="bg-[#13131f] p-6 rounded-md shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Editar Evento</h3>
                {currentEvent && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300">Nombre</label>
                            <input
                                type="text"
                                value={currentEvent.name}
                                onInput={(e) => setCurrentEvent({ ...currentEvent, name: e.currentTarget.value })}
                                className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-300">Fecha de Inicio</label>
                            <input
                                type="datetime-local"
                                value={currentEvent.startDate}
                                onInput={(e) => handleDateChange(e, 'startDate', false)}
                                className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                                style={{ colorScheme: "dark" }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-300">Fecha de Fin (opcional)</label>
                            <input
                                type="datetime-local"
                                value={currentEvent.endDate}
                                onInput={(e) => handleDateChange(e, 'endDate', false)}
                                className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                                style={{ colorScheme: "dark" }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-300">Ubicación</label>
                            <input
                                type="text"
                                value={currentEvent.location}
                                onInput={(e) => setCurrentEvent({ ...currentEvent, location: e.currentTarget.value })}
                                className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-300">Descripción</label>
                            <textarea
                                value={currentEvent.description}
                                onInput={(e) => setCurrentEvent({ ...currentEvent, description: e.currentTarget.value })}
                                className="w-full p-2 bg-[#09090f] text-white border border-gray-700 rounded-md h-32"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={closeEditorDialog} className="bg-gray-600 hover:bg-gray-500 px-3 py-2 text-white rounded-md">Cancelar</button>
                    <button onClick={updateEvent} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md">Guardar</button>
                </div>
            </dialog>
        </div>
    );
}