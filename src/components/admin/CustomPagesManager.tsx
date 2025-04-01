import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-preact";
import { slugify } from "@/lib/utils";

export default function CustomPagesManager() {
    const [pages, setPages] = useState<
        { id: number; title: string; slug: string; createdAt: Date; updatedAt: Date }[]
    >([]);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [newPage, setNewPage] = useState({ title: "", slug: "", defaultSlug: "" });

    const fetchPages = useCallback(async () => {
        const { data, error } = await actions.admin.customPages.fetchPages();
        if (error) {
            toast.error("Error al cargar las páginas");
            console.error("Error loading pages:", error);
            return;
        }
        setPages(data || []);
    }, []);

    useEffect(() => {

        fetchPages();
    }, []);

    const openDialog = () => {
        dialogRef.current?.showModal();
    };

    const closeDialog = () => {
        dialogRef.current?.close();
        setNewPage({ title: "", slug: "", defaultSlug: "" });
    };

    const createPage = async () => {
        if (!newPage.title) {
            toast.error("El título es obligatorio");
            return;
        }
        const { error } = await actions.admin.customPages.createPage(newPage);
        if (error) {
            toast.error("Error al crear la página");
            return;
        }
        toast.success("Página creada exitosamente");
        fetchPages();
        closeDialog();
    };

    useEffect(() => {
        if (newPage.title) {
            setNewPage((prev) => ({
                ...prev,
                defaultSlug: slugify(newPage.title),
            }));
        }
    }
        , [newPage.title]);

    return (
        <div className="relative w-full overflow-auto rounded-md">
            <div className="flex justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-400">Páginas Personalizadas</h2>
                <button onClick={openDialog} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md">
                    <Plus size={16} /> Crear Página
                </button>
            </div>
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b bg-[#13131f]">
                    <tr className="border-b border-[#1f1f2f]">
                        <th className="h-12 px-4 text-left text-slate-400">Título</th>
                        <th className="h-12 px-4 text-left text-slate-400">Slug</th>
                        <th className="h-12 px-4 text-left text-slate-400">Fecha de Creación</th>
                        <th className="h-12 px-4 text-left text-slate-400">Última Modificación</th>
                        <th className="h-12 px-4 text-left text-slate-400">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {pages.map(page => (
                        <tr key={page.id} className="border-b border-[#1f1f2f] bg-[#09090f]">
                            <td className="p-4 text-slate-300">{page.title}</td>
                            <td className="p-4 text-indigo-300 font-mono text-xs">{page.slug}</td>
                            <td className="p-4 text-slate-300">{new Date(page.createdAt).toLocaleString()}</td>
                            <td className="p-4 text-slate-300">{new Date(page.updatedAt).toLocaleString()}</td>
                            <td className="p-4">
                                <div className="flex gap-2">
                                    <a
                                        href={`/admin/custom-pages/${page.slug}`}
                                        title="Editar Página"
                                        className="text-blue-500 hover:text-blue-400">
                                        <Pencil size={16} />
                                    </a>
                                    <button className="text-red-500 hover:text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Dialogo para crear página */}
            <dialog ref={dialogRef} className="bg-[#13131f] p-6 rounded-md shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Crear Página</h3>
                <label className="block text-sm text-gray-300">Título</label>
                <input
                    type="text"
                    value={newPage.title}
                    onInput={(e) => setNewPage({ ...newPage, title: e.currentTarget.value })}
                    className="w-full p-2 mb-3 bg-[#09090f] text-white border border-gray-700 rounded-md"
                />
                <label className="block text-sm text-gray-300">Slug</label>
                <input
                    type="text"
                    placeholder={newPage.defaultSlug}
                    value={newPage.slug}
                    onInput={(e) => setNewPage({ ...newPage, slug: e.currentTarget.value })}
                    className="w-full p-2 mb-3 bg-[#09090f] text-white border border-gray-700 rounded-md"
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={closeDialog} className="bg-gray-600 hover:bg-gray-500 px-3 py-2 text-white rounded-md">Cancelar</button>
                    <button onClick={createPage} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 text-white rounded-md">Crear</button>
                </div>
            </dialog>
        </div>
    );
}
