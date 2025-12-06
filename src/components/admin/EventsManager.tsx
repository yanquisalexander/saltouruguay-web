import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import {
    Pencil,
    Trash2,
    Plus,
    Loader2,
    Calendar,
    MapPin,
    Image as ImageIcon,
    Upload,
    X,
    RefreshCw,
    Star
} from "lucide-preact";
import type { getPaginatedEvents } from "@/lib/events";
import { DateTime } from 'luxon';

export default function EventsManager() {
    // --- STATE ---
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const initialEventState = {
        name: "",
        startDate: "",
        endDate: "",
        location: "",
        description: "",
        cover: "", // Nuevo campo para la imagen (Base64 o URL)
        featured: false
    };

    const [newEvent, setNewEvent] = useState(initialEventState);
    const [currentEvent, setCurrentEvent] = useState<null | {
        id: number;
        name: string;
        startDate: string | null;
        endDate: string | null;
        location: string;
        description: string;
        cover: string; // Nuevo campo
        featured: boolean;
        originalEvent: any;
    }>(null);

    // --- DATA FETCHING ---
    const fetchEvents = useCallback(async (pageNum = 1, replace = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const { data, error } = await actions.admin.events.getEvents({ page: pageNum, limit });
            if (error) throw new Error("Error loading events");

            const newEvents = data.events || [];
            setHasMore(newEvents.length >= limit);
            setEvents(prev => replace ? newEvents : [...prev, ...newEvents]);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar los eventos");
        } finally {
            setLoading(false);
        }
    }, [limit]); // Removed 'loading' dependency to avoid stale closures if needed, though usually safe with check

    useEffect(() => { fetchEvents(1, true); }, []);

    // --- INFINITE SCROLL ---
    const loadMoreEvents = useCallback(() => {
        if (loading || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchEvents(nextPage);
    }, [loading, hasMore, page, fetchEvents]);

    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !loading && hasMore) loadMoreEvents();
        }, { threshold: 0.1 });

        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        observerRef.current = observer;

        return () => observer.disconnect();
    }, [loading, hasMore, loadMoreEvents]);

    const refreshEvents = () => {
        setPage(1);
        setHasMore(true);
        fetchEvents(1, true);
    };

    // --- IMAGE HANDLING ---
    const handleImageSelect = (e: Event, isNew = true) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];

            // Validar tamaño (ej. 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast.error("La imagen es demasiado pesada (Máx 2MB)");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64String = e.target?.result as string;
                if (isNew) {
                    setNewEvent(prev => ({ ...prev, cover: base64String }));
                } else if (currentEvent) {
                    setCurrentEvent(prev => prev ? { ...prev, cover: base64String } : null);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (isNew = true) => {
        if (isNew) {
            setNewEvent(prev => ({ ...prev, cover: "" }));
        } else if (currentEvent) {
            setCurrentEvent(prev => prev ? { ...prev, cover: "" } : null);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // --- FORM LOGIC ---
    const prepareEventForSubmission = (formEvent: any, originalEvent: any = null) => {
        const preparedEvent = { ...formEvent };

        if (!originalEvent) {
            if (formEvent.startDate) preparedEvent.startDate = DateTime.fromISO(formEvent.startDate).toUTC().toISO();
            if (formEvent.endDate) preparedEvent.endDate = DateTime.fromISO(formEvent.endDate).toUTC().toISO();
            return preparedEvent;
        }

        preparedEvent.id = originalEvent.id;
        if (formEvent.startDate) preparedEvent.startDate = DateTime.fromISO(formEvent.startDate).toUTC().toISO();
        else if (originalEvent.startDate) preparedEvent.startDate = originalEvent.startDate;

        if (formEvent.endDate) preparedEvent.endDate = DateTime.fromISO(formEvent.endDate).toUTC().toISO();
        else if (originalEvent.endDate) preparedEvent.endDate = originalEvent.endDate;

        return preparedEvent;
    };

    const validateEvent = (event: any) => {
        if (!event.name?.trim()) return toast.error("El nombre es obligatorio");
        if (!event.startDate && !event.originalEvent?.startDate) return toast.error("La fecha de inicio es obligatoria");

        if (event.startDate && event.endDate) {
            const start = DateTime.fromISO(event.startDate);
            const end = DateTime.fromISO(event.endDate);
            if (end < start) return toast.error("La fecha final no puede ser antes que la inicial");
        }
        return true;
    };

    // --- CRUD ACTIONS ---
    const createEvent = async () => {
        if (!validateEvent(newEvent)) return;
        try {
            const eventToSubmit = prepareEventForSubmission(newEvent);
            const { error } = await actions.admin.events.createEvent(eventToSubmit);
            if (error) throw new Error(error.message);
            toast.success("Evento creado exitosamente");
            refreshEvents();
            closeDialog();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear el evento");
        }
    };

    const updateEvent = async () => {
        if (!currentEvent || !validateEvent(currentEvent)) return;
        try {
            const eventToSubmit = prepareEventForSubmission(currentEvent, currentEvent.originalEvent);
            const { error } = await actions.admin.events.updateEvent(eventToSubmit);
            if (error) throw new Error(error.message);
            toast.success("Evento actualizado");
            refreshEvents();
            closeEditorDialog();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar");
        }
    };

    const deleteEvent = async (id: number) => {
        if (!confirm("¿Eliminar este evento permanentemente?")) return;
        try {
            const { error } = await actions.admin.events.deleteEvent(id);
            if (error) throw new Error(error.message);
            toast.success("Evento eliminado");
            refreshEvents();
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar");
        }
    };

    // --- DIALOGS ---
    const openDialog = () => dialogRef.current?.showModal();
    const closeDialog = () => { dialogRef.current?.close(); setNewEvent(initialEventState); };

    const openEditorDialog = (event: typeof events[number]) => {
        try {
            setCurrentEvent({
                id: event.id,
                name: event.name,
                startDate: event.startDate ? DateTime.fromJSDate(event.startDate).toFormat("yyyy-MM-dd'T'HH:mm") : "",
                endDate: event.endDate ? DateTime.fromJSDate(event.endDate).toFormat("yyyy-MM-dd'T'HH:mm") : "",
                location: event.location || "",
                description: event.description || "",
                cover: event.cover || "",
                featured: event.featured || false,
                originalEvent: event
            });
            editorDialogRef.current?.showModal();
        } catch (e) { toast.error("Error al abrir editor"); }
    };
    const closeEditorDialog = () => { editorDialogRef.current?.close(); setCurrentEvent(null); };

    // --- FORMATTERS ---
    const getStatusBadge = (event: typeof events[number]) => {
        if (!event.startDate) return <span class="px-2 py-1 rounded text-xs bg-gray-800 text-gray-400">Borrador</span>;

        const start = DateTime.fromJSDate(event.startDate);
        const end = event.endDate ? DateTime.fromJSDate(event.endDate) : null;
        const now = DateTime.local();

        if (end && end < now) return <span class="px-2 py-1 rounded text-xs bg-red-900/30 text-red-400 border border-red-900/50">Finalizado</span>;
        if (start <= now && (!end || end > now)) return <span class="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400 border border-green-900/50 animate-pulse">En curso</span>;
        return <span class="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-900/50">Próximo</span>;
    };

    // --- RENDER FORM ---
    const renderForm = (data: any, isNew: boolean, onChangeInput: (e: any, f: string, n: boolean) => void, onChangeDate: (e: any, f: string, n: boolean) => void) => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Datos */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Evento</label>
                    <input
                        type="text"
                        value={data.name}
                        onInput={(e) => onChangeInput(e, 'name', isNew)}
                        className="w-full p-3 bg-black/40 text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Ej: Torneo de Bedwars"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inicio</label>
                        <input
                            type="datetime-local"
                            value={data.startDate || ""}
                            onInput={(e) => onChangeDate(e, 'startDate', isNew)}
                            className="w-full p-3 bg-black/40 text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fin (Opcional)</label>
                        <input
                            type="datetime-local"
                            value={data.endDate || ""}
                            onInput={(e) => onChangeDate(e, 'endDate', isNew)}
                            className="w-full p-3 bg-black/40 text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ubicación</label>
                    <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-3.5 text-gray-500" />
                        <input
                            type="text"
                            value={data.location || ""}
                            onInput={(e) => onChangeInput(e, 'location', isNew)}
                            className="w-full p-3 pl-10 bg-black/40 text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                            placeholder="Ej: Discord, Twitch, Lobby 1"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                    <textarea
                        value={data.description || ""}
                        onInput={(e) => onChangeInput(e, 'description', isNew)}
                        className="w-full p-3 bg-black/40 text-white border border-white/10 rounded-xl h-32 resize-none focus:border-blue-500 focus:outline-none"
                        placeholder="Detalles del evento..."
                    />
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <input
                        type="checkbox"
                        id={isNew ? "new-featured" : "edit-featured"}
                        checked={data.featured}
                        onChange={(e) => onChangeInput(e, 'featured', isNew)}
                        className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                    />
                    <label htmlFor={isNew ? "new-featured" : "edit-featured"} className="text-sm font-medium text-white cursor-pointer select-none">
                        Destacar evento
                    </label>
                </div>
            </div>

            {/* Columna Derecha: Portada */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Portada del Evento</label>

                <div
                    className={`
                        relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden group
                        ${data.cover ? 'border-blue-500/50 bg-black' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}
                    `}
                >
                    {data.cover ? (
                        <>
                            <img src={data.cover} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500" title="Cambiar"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => removeImage(isNew)}
                                    className="p-2 bg-red-600 rounded-lg text-white hover:bg-red-500" title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center text-gray-500 hover:text-white transition-colors"
                        >
                            <div className="p-3 rounded-full bg-white/5 mb-2">
                                <ImageIcon size={32} />
                            </div>
                            <span className="text-sm font-medium">Subir Portada</span>
                            <span className="text-xs text-gray-600">Recomendado: 1920x1080 (Máx 2MB)</span>
                        </button>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleImageSelect(e, isNew)}
                        className="hidden"
                        accept="image/*"
                    />
                </div>

                <div className="bg-blue-900/10 border border-blue-900/20 p-3 rounded-lg flex gap-3 items-start">
                    <div className="p-1 bg-blue-500/20 rounded text-blue-400 mt-0.5"><Upload size={14} /></div>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                        La imagen se subirá automáticamente al guardar. Asegúrate de tener derechos sobre la imagen utilizada.
                    </p>
                </div>
            </div>
        </div>
    );

    // Helpers para inputs del render
    const handleInp = (e: any, f: string, n: boolean) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.currentTarget.value;
        if (n) setNewEvent(p => ({ ...p, [f]: val }));
        else setCurrentEvent(p => p ? { ...p, [f]: val } : null);
    };
    const handleDate = (e: any, f: string, n: boolean) => {
        const val = e.target.value;
        if (n) setNewEvent(p => ({ ...p, [f]: val }));
        else setCurrentEvent(p => p ? { ...p, [f]: val } : null);
    };

    return (
        <div className="relative w-full space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a0a0a] border border-white/5 p-4 rounded-2xl shadow-lg">
                <div>
                    <h2 className="text-2xl font-anton text-white uppercase tracking-wide">Eventos</h2>
                    <p className="text-sm text-gray-500 font-rubik">Gestiona la agenda de la comunidad</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={refreshEvents}
                        className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
                        title="Recargar lista"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={openDialog}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                    >
                        <Plus size={18} /> Nuevo Evento
                    </button>
                </div>
            </div>

            {/* TABLA / LISTA */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden shadow-xl min-h-[400px] relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-xs uppercase tracking-widest text-gray-400 font-bold">
                            <tr>
                                <th className="p-4 w-24 text-center">Portada</th>
                                <th className="p-4">Evento</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4">Ubicación</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {events.map(event => (
                                <tr key={event.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="size-12 rounded-lg bg-white/5 overflow-hidden border border-white/10">
                                            <img
                                                src={event.cover || "/og.webp"}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white text-base mb-0.5 flex items-center gap-2">
                                            {event.name}
                                            {event.featured && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar size={12} />
                                            {event.startDate
                                                ? DateTime.fromJSDate(event.startDate).toFormat("dd MMM yyyy, HH:mm")
                                                : "Sin fecha"
                                            }
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(event)}
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">
                                        {event.location ? (
                                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.location}</span>
                                        ) : (
                                            <span className="text-gray-600 italic">--</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditorDialog(event)}
                                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => deleteEvent(event.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {events.length === 0 && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                        <Calendar size={48} className="mb-4 opacity-20" />
                        <p>No hay eventos registrados</p>
                    </div>
                )}

                {/* Loading / Infinite Scroll Trigger */}
                {(hasMore || loading) && (
                    <div ref={loadMoreRef} className="p-6 flex justify-center">
                        {loading && <Loader2 size={24} className="animate-spin text-blue-500" />}
                    </div>
                )}
            </div>

            {/* MODAL CREAR */}
            <dialog
                ref={dialogRef}
                className="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-[#111] text-white border border-white/10 rounded-2xl shadow-2xl p-0 w-full max-w-4xl m-auto open:animate-in open:fade-in open:zoom-in-95"
                onClick={(e) => e.target === dialogRef.current && closeDialog()}
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#15151a]">
                    <h3 className="text-xl font-bold font-anton uppercase tracking-wide">Nuevo Evento</h3>
                    <button onClick={closeDialog} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {renderForm(newEvent, true, handleInp, handleDate)}
                </div>
                <div className="p-6 border-t border-white/10 bg-[#15151a] flex justify-end gap-3">
                    <button onClick={closeDialog} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={createEvent} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all">Crear Evento</button>
                </div>
            </dialog>

            {/* MODAL EDITAR */}
            <dialog
                ref={editorDialogRef}
                className="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-[#111] text-white border border-white/10 rounded-2xl shadow-2xl p-0 w-full max-w-4xl m-auto open:animate-in open:fade-in open:zoom-in-95"
                onClick={(e) => e.target === editorDialogRef.current && closeEditorDialog()}
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#15151a]">
                    <h3 className="text-xl font-bold font-anton uppercase tracking-wide">Editar Evento</h3>
                    <button onClick={closeEditorDialog} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {currentEvent && renderForm(currentEvent, false, handleInp, handleDate)}
                </div>
                <div className="p-6 border-t border-white/10 bg-[#15151a] flex justify-end gap-3">
                    <button onClick={closeEditorDialog} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={updateEvent} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all">Guardar Cambios</button>
                </div>
            </dialog>
        </div>
    );
}