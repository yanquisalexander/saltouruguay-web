import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import {
    Pencil,
    Trash2,
    Plus,
    FileText,
    Search,
    ExternalLink,
    Loader2,
    X,
    Globe,
    Calendar,
    User,
    CheckCircle2,
    Clock
} from "lucide-preact";
import { slugify } from "@/lib/utils";

export default function CustomPagesManager() {
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Estados para Modales
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [newPage, setNewPage] = useState({ title: "", slug: "", defaultSlug: "" });

    // CARGA DE DATOS
    const fetchPages = useCallback(async () => {
        setLoading(true);
        const { data, error } = await actions.admin.customPages.fetchPages();
        if (error) {
            toast.error("Error al cargar las páginas");
        } else {
            setPages(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    // MANEJADORES
    const handleCreatePage = async (e: Event) => {
        e.preventDefault();
        if (!newPage.title.trim()) return toast.error("El título es obligatorio");

        const finalSlug = (newPage.slug || newPage.defaultSlug || slugify(newPage.title)).trim();

        const { error } = await actions.admin.customPages.createPage({
            title: newPage.title.trim(),
            slug: finalSlug,
            defaultSlug: newPage.defaultSlug
        });

        if (error) return toast.error(error.message || "Error al crear la página");

        toast.success("Página creada exitosamente");
        fetchPages();
        setIsCreateOpen(false);
        setNewPage({ title: "", slug: "", defaultSlug: "" });
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await actions.admin.customPages.deletePage({ id: deleteId });

        if (error) {
            toast.error("Error al eliminar la página");
        } else {
            toast.success("Página eliminada correctamente");
            fetchPages();
        }
        setDeleteId(null);
    };

    // Auto-generar slug sugerido
    useEffect(() => {
        if (newPage.title) {
            setNewPage((prev) => ({ ...prev, defaultSlug: slugify(newPage.title) }));
        }
    }, [newPage.title]);

    // Filtrado local
    const filteredPages = pages.filter(
        (p) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.slug.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Barra de Filtros y Acción Nueva Página */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] shadow-xl">
                {/* Buscador */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                        type="text"
                        placeholder="Buscar por título o slug..."
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

                {/* Botón Nueva Página */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white px-4 py-2 rounded-xl font-rubik font-semibold text-xs uppercase tracking-wider shadow-lg shadow-violet-950/50 border border-violet-400/30 transition-all cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Nueva Página CMS</span>
                    </button>
                </div>
            </div>

            {/* Tabla de Páginas */}
            <div className="relative overflow-hidden rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-rubik font-semibold text-white/50 tracking-wider">
                                <th className="py-3.5 px-5">Página</th>
                                <th className="py-3.5 px-5">Estado</th>
                                <th className="py-3.5 px-5 hidden sm:table-cell">Última Edición</th>
                                <th className="py-3.5 px-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05] text-sm">
                            {filteredPages.map((page) => (
                                <tr key={page.id} className="group hover:bg-white/[0.03] transition-colors">
                                    {/* Título y Enlace */}
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-xl bg-violet-500/10 border border-violet-400/20 text-violet-300 flex items-center justify-center shrink-0">
                                                <FileText size={17} />
                                            </div>
                                            <div className="min-w-0">
                                                <a
                                                    href={`/admin/custom-pages/${page.slug}`}
                                                    className="font-rubik font-semibold text-white group-hover:text-violet-200 transition-colors truncate block"
                                                >
                                                    {page.title}
                                                </a>
                                                <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono mt-0.5">
                                                    <span className="truncate">/p/{page.slug}</span>
                                                    <a
                                                        href={`/p/${page.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-violet-400 hover:text-violet-200 transition-colors"
                                                        title="Ver en pestaña nueva"
                                                    >
                                                        <ExternalLink size={11} />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="py-3.5 px-5">
                                        {page.isDraft ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-rubik font-medium bg-amber-500/15 text-amber-300 border border-amber-400/30">
                                                <Clock size={12} className="text-amber-400" />
                                                Borrador
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-rubik font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                                                <CheckCircle2 size={12} className="text-emerald-400" />
                                                Publicado
                                            </span>
                                        )}
                                    </td>

                                    {/* Fecha */}
                                    <td className="py-3.5 px-5 text-xs text-white/50 font-rubik hidden sm:table-cell">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={13} className="text-white/30" />
                                            <span>
                                                {new Date(page.updatedAt).toLocaleDateString("es-UY", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Acciones */}
                                    <td className="py-3.5 px-5 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <a
                                                href={`/admin/custom-pages/${page.slug}`}
                                                className="p-2 text-violet-300 hover:text-white hover:bg-violet-600/20 rounded-lg transition-colors"
                                                title="Editar contenido"
                                            >
                                                <Pencil size={15} />
                                            </a>
                                            <button
                                                onClick={() => setDeleteId(page.id)}
                                                className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                                title="Eliminar página"
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

                {/* Loading State */}
                {loading && (
                    <div className="py-16 flex flex-col items-center justify-center text-white/40 gap-3">
                        <Loader2 className="animate-spin text-violet-400" size={26} />
                        <span className="text-xs font-rubik">Cargando páginas CMS...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredPages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="size-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/30 mb-3">
                            <FileText size={22} />
                        </div>
                        <p className="font-rubik font-medium text-white text-sm">
                            No se encontraron páginas
                        </p>
                        <p className="font-rubik text-xs text-white/40 mt-1 max-w-sm">
                            {search
                                ? `No hay resultados para "${search}".`
                                : "Aún no has creado páginas estáticas. Haz clic en 'Nueva Página CMS'."}
                        </p>
                    </div>
                )}
            </div>

            {/* MODAL CREAR PÁGINA */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={() => setIsCreateOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-[#0f0f16] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                            <div>
                                <h3 className="text-lg font-anton uppercase text-white leading-none">
                                    Nueva Página
                                </h3>
                                <p className="font-rubik text-xs text-white/40 mt-1">Crea una nueva URL con editor en bloque.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePage} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-rubik font-medium text-white/60">
                                    Título de la Página
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 text-sm font-rubik"
                                    placeholder="Ej: Reglamento Oficial 2026"
                                    value={newPage.title}
                                    onInput={(e) =>
                                        setNewPage({ ...newPage, title: (e.target as HTMLInputElement).value })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-rubik font-medium text-white/60">
                                    Ruta URL (Slug)
                                </label>
                                <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-white/40">
                                    <span className="text-xs mr-1 font-mono">/p/</span>
                                    <input
                                        type="text"
                                        className="bg-transparent border-none w-full text-white placeholder:text-white/20 focus:outline-none p-0 text-sm font-mono"
                                        placeholder={newPage.defaultSlug || "reglamento-oficial-2026"}
                                        value={newPage.slug}
                                        onInput={(e) =>
                                            setNewPage({ ...newPage, slug: (e.target as HTMLInputElement).value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 text-xs font-rubik font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-rubik font-semibold uppercase tracking-wider shadow-lg shadow-violet-950/50 border border-violet-400/30 transition-all cursor-pointer"
                                >
                                    Crear y Abrir Editor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR ELIMINACIÓN */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={() => setDeleteId(null)}
                    />
                    <div className="relative w-full max-w-sm bg-[#0f0f16] border border-rose-500/30 rounded-2xl shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="size-12 rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center justify-center mx-auto">
                            <Trash2 size={22} />
                        </div>
                        <div>
                            <h3 className="font-anton text-lg uppercase text-white tracking-wide">
                                ¿Eliminar esta página?
                            </h3>
                            <p className="font-rubik text-xs text-white/50 mt-1">
                                Esta acción es permanente. La URL dejará de ser accesible para el público.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2.5 pt-2">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-xs font-rubik font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-rubik font-semibold uppercase tracking-wider transition-colors shadow-lg shadow-rose-950/50 cursor-pointer"
                            >
                                Confirmar y Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
