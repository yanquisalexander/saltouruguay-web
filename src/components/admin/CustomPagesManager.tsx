import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import {
    Pencil,
    Trash2,
    Plus,
    FileText,
    Search,
    MoreVertical,
    ExternalLink,
    Loader2
} from "lucide-preact";
import { slugify } from "@/lib/utils";

// --- COMPONENTES UI SIMPLES ---
const Badge = ({ children, variant = "default" }: { children: any, variant?: "success" | "warning" | "default" }) => {
    const styles = {
        default: "bg-white/5 text-white/60 border-white/10",
        success: "bg-[#53FC18]/10 text-[#53FC18] border-[#53FC18]/20",
        warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[variant]}`}>
            {children}
        </span>
    );
};

export default function CustomPagesManager() {
    // --- ESTADOS ---
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Estados para Modales
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [newPage, setNewPage] = useState({ title: "", slug: "", defaultSlug: "" });

    // --- CARGA DE DATOS ---
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

    useEffect(() => { fetchPages(); }, []);

    // --- MANEJADORES ---
    const handleCreatePage = async (e: Event) => {
        e.preventDefault();
        if (!newPage.title) return toast.error("El título es obligatorio");

        const { error } = await actions.admin.customPages.createPage({
            title: newPage.title,
            slug: newPage.slug || newPage.defaultSlug
        });

        if (error) return toast.error(error.message || "Error al crear");

        toast.success("Página creada exitosamente");
        fetchPages();
        setIsCreateOpen(false);
        setNewPage({ title: "", slug: "", defaultSlug: "" });
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await actions.admin.customPages.deletePage({ id: deleteId });

        if (error) toast.error("Error al eliminar");
        else {
            toast.success("Página eliminada");
            fetchPages();
        }
        setDeleteId(null);
    };

    // Auto-generar slug
    useEffect(() => {
        if (newPage.title) {
            setNewPage(prev => ({ ...prev, defaultSlug: slugify(newPage.title) }));
        }
    }, [newPage.title]);

    // Filtrado local
    const filteredPages = pages.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-full max-w-7xl mx-auto pb-20">

            {/* --- HEADER ACCIONES --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-anton text-white uppercase tracking-wide">CMS Páginas</h2>
                    <p className="text-white/40 text-sm mt-1">Gestiona el contenido estático de tu sitio.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Buscador */}
                    <div className="relative group flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/60 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar páginas..."
                            value={search}
                            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                            className="w-full md:w-64 bg-[#09090b] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                        />
                    </div>

                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 bg-[#53FC18] hover:bg-[#43db12] text-black px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-[0_0_15px_rgba(83,252,24,0.3)]"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nueva Página</span>
                    </button>
                </div>
            </div>

            {/* --- LISTA / TABLA --- */}
            <div className="bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">

                {/* Header Tabla */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-white/[0.02] text-xs font-bold text-white/30 uppercase tracking-widest">
                    <div className="col-span-6 md:col-span-4">Título / Slug</div>
                    <div className="hidden md:block col-span-2">Estado</div>
                    <div className="hidden md:block col-span-2">Autor</div>
                    <div className="hidden md:block col-span-2">Actualizado</div>
                    <div className="col-span-6 md:col-span-2 text-right">Acciones</div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="p-12 flex flex-col items-center justify-center text-white/20 gap-3">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="text-sm">Cargando contenido...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredPages.length === 0 && (
                    <div className="p-16 text-center text-white/30">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No se encontraron páginas.</p>
                        {search && <button onClick={() => setSearch("")} className="text-[#53FC18] hover:underline mt-2 text-sm">Limpiar búsqueda</button>}
                    </div>
                )}

                {/* Rows */}
                {!loading && filteredPages.map(page => (
                    <div key={page.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors group">

                        {/* Title & Slug */}
                        <div className="col-span-6 md:col-span-4 min-w-0">
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:flex size-10 rounded-lg bg-white/5 items-center justify-center text-white/30 group-hover:text-white group-hover:bg-white/10 transition-colors shrink-0">
                                    <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white font-medium text-sm truncate pr-4">{page.title}</h3>
                                    <div className="flex items-center gap-1 text-xs text-white/40 font-mono mt-0.5">
                                        <span className="truncate">/p/{page.slug}</span>
                                        <a href={`/p/${page.slug}`} target="_blank" className="hover:text-[#53FC18]" title="Ver página">
                                            <ExternalLink size={10} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Estado */}
                        <div className="hidden md:flex col-span-2 items-center">
                            {page.isDraft ? (
                                <Badge variant="warning">Borrador</Badge>
                            ) : (
                                <Badge variant="success">Publicado</Badge>
                            )}
                        </div>

                        {/* Autor */}
                        <div className="hidden md:block col-span-2 text-sm text-white/60">
                            ID: {page.authorId || "-"}
                        </div>

                        {/* Fecha */}
                        <div className="hidden md:block col-span-2 text-xs text-white/40 font-mono">
                            {new Date(page.updatedAt).toLocaleDateString()}
                        </div>

                        {/* Acciones */}
                        <div className="col-span-6 md:col-span-2 flex justify-end gap-2">
                            <a
                                href={`/admin/custom-pages/${page.slug}`}
                                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                title="Editar"
                            >
                                <Pencil size={18} />
                            </a>
                            <button
                                onClick={() => setDeleteId(page.id)}
                                className="p-2 rounded-lg text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL CREAR --- */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
                    <div className="relative w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-anton text-white uppercase mb-6">Nueva Página</h3>

                        <form onSubmit={handleCreatePage} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1.5 ml-1">Título</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#53FC18]/50 focus:ring-1 focus:ring-[#53FC18]/20 transition-all"
                                    placeholder="Ej: Reglas del Servidor"
                                    value={newPage.title}
                                    onInput={(e) => setNewPage({ ...newPage, title: (e.target as HTMLInputElement).value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-1.5 ml-1">Slug (URL)</label>
                                <div className="flex items-center bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-white/50">
                                    <span className="text-xs mr-1">/p/</span>
                                    <input
                                        type="text"
                                        className="bg-transparent border-none w-full text-white placeholder:text-white/20 focus:outline-none p-0 text-sm font-mono"
                                        placeholder={newPage.defaultSlug || "reglas-del-servidor"}
                                        value={newPage.slug}
                                        onInput={(e) => setNewPage({ ...newPage, slug: (e.target as HTMLInputElement).value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-[#53FC18] text-black font-bold hover:bg-[#43db12] transition-colors text-sm"
                                >
                                    Crear Borrador
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL BORRAR --- */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
                    <div className="relative w-full max-w-sm bg-[#0c0c0e] border border-red-500/20 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mx-auto">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-2">¿Eliminar página?</h3>
                        <p className="text-white/50 text-center text-sm mb-6">
                            Esta acción es irreversible. La página dejará de ser accesible inmediatamente.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-bold shadow-lg shadow-red-900/20"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}