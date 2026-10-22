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
    Star,
    Search,
    ExternalLink
} from "lucide-preact";
import type { getPaginatedEvents } from "@/lib/events";
import { DateTime } from "luxon";

export default function EventsManager() {
    // --- STATE ---
    const [events, setEvents] = useState<Awaited<ReturnType<typeof getPaginatedEvents>>['events']>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
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
        cover: "",
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
        cover: string;
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
    }, [limit]);

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
        if (!event.name?.trim()) {
            toast.error("El nombre es obligatorio");
            return false;
        }
        if (!event.startDate && !event.originalEvent?.startDate) {
            toast.error("La fecha de inicio es obligatoria");
            return false;
        }

        if (event.startDate && event.endDate) {
            const start = DateTime.fromISO(event.startDate);
            const end = DateTime.fromISO(event.endDate);
            if (end < start) {
                toast.error("La fecha final no puede ser previa a la inicial");
                return false;
            }
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
            toast.success("Evento actualizado correctamente");
            refreshEvents();
            closeEditorDialog();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar");
        }
    };

    const deleteEvent = async (id: number) => {
        if (!confirm("¿Eliminar este evento permanentemente de la agenda?")) return;
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
    const closeDialog = () => {
        dialogRef.current?.close();
        setNewEvent(initialEventState);
    };

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
        } catch (e) {
            toast.error("Error al abrir editor");
        }
    };

    const closeEditorDialog = () => {
        editorDialogRef.current?.close();
        setCurrentEvent(null);
    };

    // --- FORMATTERS ---
    const getStatusBadge = (event: typeof events[number]) => {
        if (!event.startDate) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-rubik font-medium bg-white/[0.04] text-white/50 border border-white/10">
                    Borrador
                </span>
            );
        }

        const start = DateTime.fromJSDate(event.startDate);
        const end = event.endDate ? DateTime.fromJSDate(event.endDate) : null;
        const now = DateTime.local();

        if (end && end < now) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-rubik font-medium bg-white/[0.03] text-white/40 border border-white/[0.08]">
                    Finalizado
                </span>
            );
        }
        if (start <= now && (!end || end > now)) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-rubik font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    En curso
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-rubik font-medium bg-violet-500/15 text-violet-300 border border-violet-400/30">
                <span className="size-1.5 rounded-full bg-violet-400"></span>
                Próximo
            </span>
        );
    };

    // --- RENDER FORM ---
    const renderForm = (
        data: any,
        isNew: boolean,
        onChangeInput: (e: any, f: string, n: boolean) => void,
        onChangeDate: (e: any, f: string, n: boolean) => void
    ) => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-rubik font-medium text-white/60">Nombre del Evento</label>
                    <input
                        type="text"
                        value={data.name}
                        onInput={(e) => onChangeInput(e, 'name', isNew)}
                        className="w-full px-3.5 py-2.5 bg-black/40 text-white placeholder:text-white/25 border border-white/10 rounded-xl focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all font-rubik text-sm"
                        placeholder="Ej: Torneo de Bedwars Nocturno"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-rubik font-medium text-white/60">Inicio</label>
                        <input
                            type="datetime-local"
                            value={data.startDate || ""}
                            onInput={(e) => onChangeDate(e, 'startDate', isNew)}
                            className="w-full px-3 py-2 bg-black/40 text-white border border-white/10 rounded-xl focus:border-violet-500/60 focus:outline-none text-xs"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-rubik font-medium text-white/60">Fin (Opcional)</label>
                        <input
                            type="datetime-local"
                            value={data.endDate || ""}
                            onInput={(e) => onChangeDate(e, 'endDate', isNew)}
                            className="w-full px-3 py-2 bg-black/40 text-white border border-white/10 rounded-xl focus:border-violet-500/60 focus:outline-none text-xs"
                            style={{ colorScheme: "dark" }}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-rubik font-medium text-white/60">Lugar o Canal</label>
                    <div className="relative">
                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            value={data.location || ""}
                            onInput={(e) => onChangeInput(e, 'location', isNew)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-black/40 text-white placeholder:text-white/25 border border-white/10 rounded-xl focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none text-sm"
                            placeholder="Ej: Discord Stage, Twitch, Servidor MC"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-rubik font-medium text-white/60">Descripción</label>
                    <textarea
                        value={data.description || ""}
                        onInput={(e) => onChangeInput(e, 'description', isNew)}
                        className="w-full p-3 bg-black/40 text-white placeholder:text-white/25 border border-white/10 rounded-xl h-28 resize-y focus:border-violet-500/60 focus:outline-none text-sm font-rubik"
                        placeholder="Detalles y requisitos del evento..."
                    />
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                    <input
                        type="checkbox"
                        id={isNew ? "new-featured" : "edit-featured"}
                        checked={data.featured}
                        onChange={(e) => onChangeInput(e, 'featured', isNew)}
                        className="size-4 rounded-md border-white/20 text-violet-600 focus:ring-violet-500 bg-black/40 cursor-pointer"
                    />
                    <label
                        htmlFor={isNew ? "new-featured" : "edit-featured"}
                        className="text-xs font-rubik font-medium text-white cursor-pointer select-none"
                    >
                        Destacar evento en página principal y cartelera
                    </label>
                </div>
            </div>

            {/* Portada */}
            <div className="space-y-4">
                <label className="text-xs font-rubik font-medium text-white/60">Portada del Evento</label>

                <div
                    className={`
                        relative w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden group
                        ${data.cover ? 'border-violet-500/40 bg-black/80' : 'border-white/15 bg-black/30 hover:border-violet-400/30 hover:bg-white/[0.03]'}
                    `}
                >
                    {data.cover ? (
                        <>
                            <img src={data.cover} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 bg-violet-600 rounded-xl text-white hover:bg-violet-500 transition-colors cursor-pointer"
                                    title="Reemplazar portada"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeImage(isNew)}
                                    className="p-2.5 bg-rose-600/80 rounded-xl text-white hover:bg-rose-500 transition-colors cursor-pointer"
                                    title="Quitar portada"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center text-white/40 hover:text-white transition-colors cursor-pointer p-4 text-center"
                        >
                            <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 mb-2.5 text-violet-300">
                                <ImageIcon size={26} />
                            </div>
                            <span className="text-xs font-rubik font-semibold text-white">Subir Portada</span>
                            <span className="text-[11px] text-white/35 mt-0.5">Formato 16:9 · JPG, PNG, WebP (Máx 2MB)</span>
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

                <div className="bg-violet-950/20 border border-violet-500/20 p-3.5 rounded-xl flex gap-2.5 items-start">
                    <div className="p-1 bg-violet-500/20 rounded-lg text-violet-300 mt-0.5 shrink-0">
                        <Upload size={13} />
                    </div>
                    <p className="text-xs text-violet-200/70 font-rubik leading-relaxed">
                        La portada se optimiza y almacena en el CDN al guardar el evento. Aparecerá en la tarjeta de inicio.
                    </p>
                </div>
            </div>
        </div>
    );

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

    const filteredEvents = events.filter(e =>
        !search.trim() ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.location && e.location.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-4">
            {/* Barra de Herramientas y Acciones */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] shadow-xl">
                {/* Buscador */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o lugar..."
                        value={search}
                        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                        className="w-full pl-10 pr-9 py-2 text-sm bg-black/40 text-white placeholder:text-white/30 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all font-rubik"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshEvents}
                        className="p-2.5 text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/10 transition-colors cursor-pointer"
                        title="Actualizar lista"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-violet-400" : ""} />
                    </button>
                    <button
                        onClick={openDialog}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white px-4 py-2 rounded-xl font-rubik font-semibold text-xs uppercase tracking-wider shadow-lg shadow-violet-950/50 border border-violet-400/30 transition-all cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Nuevo Evento</span>
                    </button>
                </div>
            </div>

            {/* Tabla de Eventos */}
            <div className="relative overflow-hidden rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-rubik font-semibold text-white/50 tracking-wider">
                                <th className="py-3.5 px-4 w-16">Portada</th>
                                <th className="py-3.5 px-4">Evento</th>
                                <th className="py-3.5 px-4">Estado</th>
                                <th className="py-3.5 px-4">Lugar</th>
                                <th className="py-3.5 px-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05] text-sm">
                            {filteredEvents.map(event => (
                                <tr key={event.id} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="py-3.5 px-4">
                                        <div className="size-12 rounded-xl bg-black/60 overflow-hidden border border-white/10 shrink-0">
                                            <img
                                                src={event.cover || "/og.webp"}
                                                alt=""
                                                className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="font-rubik font-semibold text-white text-sm mb-1 flex items-center gap-2">
                                            {event.name}
                                            {event.featured && (
                                                <span title="Evento Destacado">
                                                    <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-white/40 font-rubik">
                                            <Calendar size={13} className="text-white/30" />
                                            <span>
                                                {event.startDate
                                                    ? DateTime.fromJSDate(event.startDate).toFormat("dd MMM yyyy, HH:mm")
                                                    : "Sin fecha programada"
                                                }
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        {getStatusBadge(event)}
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-rubik text-white/60">
                                        {event.location ? (
                                            <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                                                <MapPin size={13} className="text-white/30 shrink-0" />
                                                <span className="truncate">{event.location}</span>
                                            </span>
                                        ) : (
                                            <span className="text-white/20 italic">No especificado</span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <button
                                                onClick={() => openEditorDialog(event)}
                                                className="p-2 text-violet-300 hover:text-white hover:bg-violet-600/20 rounded-lg transition-colors cursor-pointer"
                                                title="Editar evento"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => deleteEvent(event.id)}
                                                className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                                title="Eliminar evento"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredEvents.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="size-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/30 mb-3">
                            <Calendar size={22} />
                        </div>
                        <p className="font-rubik font-medium text-white text-sm">
                            No se encontraron eventos
                        </p>
                        <p className="font-rubik text-xs text-white/40 mt-1 max-w-sm">
                            {search
                                ? `No hay coincidencias para "${search}".`
                                : "Aún no hay eventos registrados en la agenda comunitaria."}
                        </p>
                    </div>
                )}

                {/* Infinite Scroll Trigger */}
                {(hasMore || loading) && (
                    <div ref={loadMoreRef} className="p-4 flex justify-center">
                        {loading && (
                            <div className="flex items-center gap-2 text-xs font-rubik text-white/40">
                                <Loader2 size={16} className="animate-spin text-violet-400" />
                                <span>Cargando eventos...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL CREAR EVENTO */}
            <dialog
                ref={dialogRef}
                className="backdrop:bg-black/80 backdrop:backdrop-blur-md bg-[#0f0f16] text-white border border-white/10 rounded-2xl shadow-2xl p-0 w-full max-w-4xl m-auto"
                onClick={(e) => e.target === dialogRef.current && closeDialog()}
            >
                <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#13131c]">
                    <div>
                        <h3 className="text-lg font-anton uppercase tracking-wide text-white leading-none">
                            Nuevo Evento Comunitario
                        </h3>
                        <p className="font-rubik text-xs text-white/40 mt-1">Completa los datos para publicar en cartelera.</p>
                    </div>
                    <button
                        onClick={closeDialog}
                        className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto">
                    {renderForm(newEvent, true, handleInp, handleDate)}
                </div>
                <div className="p-4 border-t border-white/[0.08] bg-[#13131c] flex justify-end gap-2.5">
                    <button
                        onClick={closeDialog}
                        className="px-4 py-2 text-xs font-rubik font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={createEvent}
                        className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-rubik font-semibold uppercase tracking-wider shadow-lg shadow-violet-950/50 border border-violet-400/30 transition-all cursor-pointer"
                    >
                        Crear Evento
                    </button>
                </div>
            </dialog>

            {/* MODAL EDITAR EVENTO */}
            <dialog
                ref={editorDialogRef}
                className="backdrop:bg-black/80 backdrop:backdrop-blur-md bg-[#0f0f16] text-white border border-white/10 rounded-2xl shadow-2xl p-0 w-full max-w-4xl m-auto"
                onClick={(e) => e.target === editorDialogRef.current && closeEditorDialog()}
            >
                <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#13131c]">
                    <div>
                        <h3 className="text-lg font-anton uppercase tracking-wide text-white leading-none">
                            Editar Evento
                        </h3>
                        <p className="font-rubik text-xs text-white/40 mt-1">Modifica los detalles de la agenda.</p>
                    </div>
                    <button
                        onClick={closeEditorDialog}
                        className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto">
                    {currentEvent && renderForm(currentEvent, false, handleInp, handleDate)}
                </div>
                <div className="p-4 border-t border-white/[0.08] bg-[#13131c] flex justify-end gap-2.5">
                    <button
                        onClick={closeEditorDialog}
                        className="px-4 py-2 text-xs font-rubik font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={updateEvent}
                        className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-rubik font-semibold uppercase tracking-wider shadow-lg shadow-violet-950/50 border border-violet-400/30 transition-all cursor-pointer"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </dialog>
        </div>
    );
}
