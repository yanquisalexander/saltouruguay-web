import { useState, useEffect, useRef } from "preact/hooks";
import EditorJS from "@editorjs/editorjs";
// @ts-ignore - Algunos plugins de EditorJS no tienen tipos oficiales
import Header from "@editorjs/header";
// @ts-ignore
import List from "@editorjs/list";
// @ts-ignore
import { LayoutBlockTool } from "editorjs-layout";
// @ts-ignore
import RawTool from "@editorjs/raw";
import { toast } from "sonner";
// --- DIALOGO NATIVO <dialog> ---
import { useRef as useDomRef } from "preact/hooks";
const ConfirmDialog = ({ open, onConfirm, onCancel, message }: { open: boolean, onConfirm: () => void, onCancel: () => void, message: string }) => {
    const dialogRef = useDomRef<HTMLDialogElement>(null);
    // Sincroniza apertura/cierre
    useEffect(() => {
        if (!dialogRef.current) return;
        if (open && !dialogRef.current.open) dialogRef.current.showModal();
        if (!open && dialogRef.current.open) dialogRef.current.close();
    }, [open]);
    return (
        <>
            <dialog ref={dialogRef} className="max-w-[420px] w-full fixed inset-0 z-[99999999] p-0 animate-fade-in-up bg-[#18181b] border border-yellow-500/30 rounded-xl shadow-2xl text-white backdrop:backdrop-blur-sm backdrop:bg-black/40">
                <form method="dialog" className="absolute top-4 right-4">
                    <button type="button" onClick={onCancel} className="text-white/60 hover:text-white/90">
                        <svg width="28" height="28" viewBox="0 0 24 24"><path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>
                    </button>
                </form>
                <div className="flex flex-col items-center px-8 py-10">
                    <div className="text-yellow-400 text-3xl font-bold mb-4">⚠️ Advertencia</div>
                    <div className="text-white/80 mb-8 text-center leading-relaxed">{message}</div>
                    <div className="flex flex-col gap-3 w-full">
                        <button type="button" onClick={onConfirm} className="w-full py-3 rounded-lg bg-[#53FC18] hover:bg-[#43db12] text-black font-bold shadow text-lg transition">Publicar de todos modos</button>
                        <button type="button" onClick={onCancel} className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-bold text-lg transition">Cancelar</button>
                    </div>
                </div>
            </dialog>
            {open && (
                <div className="dialog-backdrop fixed inset-0 z-[9999999] backdrop-blur-sm bg-black/40 animate-blurred-fade-in"></div>
            )}
            <style>{`
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(40px);} to { opacity: 1; transform: none; } }
                .animate-fade-in-up { animation: fade-in-up 0.25s cubic-bezier(.4,0,.2,1); }
                @keyframes blurred-fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-blurred-fade-in { animation: blurred-fade-in 0.2s cubic-bezier(.4,0,.2,1); }
            `}</style>
        </>
    );
};
import { actions } from "astro:actions";
import {
    LucideSave,
    LucideGlobe,
    LucideHistory,
    LucideRotateCcw,
    LucideEye,
    LucideEyeOff,
    LucideCalendar,
    LucideUser
} from "lucide-preact";
import type { getCustomPageBySlug } from "@/utils/custom-pages";

export const CustomPageEditor = ({ customPage }: { customPage: Awaited<ReturnType<typeof getCustomPageBySlug>> }) => {
    const [title, setTitle] = useState(customPage.title);
    const [permalink, setPermalink] = useState(customPage.permalink);
    const [isDraft, setIsDraft] = useState(customPage.isDraft ?? true);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showScriptWarning, setShowScriptWarning] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingPublish, setPendingPublish] = useState<null | (() => void)>(null);

    const editorRef = useRef<EditorJS | null>(null);
    const editorContainerId = "editorjs-container";
    const [hasScript, setHasScript] = useState(false);

    // Inicialización del Editor
    useEffect(() => {
        let parsedData;
        try {
            parsedData = customPage.content ? JSON.parse(customPage.content) : {};
        } catch (error) {
            toast.error("Error al cargar contenido JSON. Se iniciará en blanco/texto plano.");
            parsedData = {
                blocks: [{ type: "paragraph", data: { text: customPage.content ?? "" } }],
            };
        }

        if (!editorRef.current) {
            editorRef.current = new EditorJS({
                holder: editorContainerId,
                placeholder: 'Escribe tu historia aquí...',
                tools: {
                    raw: RawTool,
                    header: {
                        class: Header,
                        config: { placeholder: 'Encabezado', levels: [2, 3, 4], defaultLevel: 2 }
                    },
                    list: {
                        class: List,
                        inlineToolbar: true,
                        config: { defaultStyle: 'unordered' }
                    },
                    layout: {
                        class: LayoutBlockTool,
                        config: {
                            EditorJS,
                            enableLayoutEditing: false,
                            enableLayoutSaving: true,
                        }
                    },
                },
                data: parsedData,
                onChange: async () => {
                    // Detectar <script> en bloques raw
                    if (editorRef.current) {
                        const data = await editorRef.current.save();
                        const found = data.blocks?.some(
                            (b: any) => b.type === 'raw' && typeof b.data?.html === 'string' && /<script[\s>]/i.test(b.data.html)
                        );
                        setHasScript(!!found);
                    }
                },
                // Ajustes visuales para modo oscuro
                onReady: () => {
                    // Fix para el contraste en modo oscuro si es necesario
                    // Detectar script al cargar
                    if (editorRef.current) {
                        editorRef.current.save().then((data) => {
                            const found = data.blocks?.some(
                                (b: any) => b.type === 'raw' && typeof b.data?.html === 'string' && /<script[\s>]/i.test(b.data.html)
                            );
                            setHasScript(!!found);
                        });
                    }
                }
            });
        }

        // Cargar historial
        loadHistory();

        return () => {
            if (editorRef.current && typeof editorRef.current.destroy === 'function') {
                // editorRef.current.destroy(); // A veces causa problemas con Hot Reload en Preact/React strict mode
                editorRef.current = null;
            }
        };
    }, []);

    const loadHistory = () => {
        setLoadingHistory(true);
        actions.admin.customPages.getPageHistory({ id: customPage.id }).then(({ data, error }) => {
            if (!error) setHistory(data || []);
            setLoadingHistory(false);
        });
    };


    // --- GUARDAR/PUBLICAR CON CONFIRMACIÓN SI HAY SCRIPT ---
    const handleSave = async (publish = false) => {
        if (!editorRef.current) return;

        // Si se va a publicar y hay <script>, mostrar confirmación
        if (publish && hasScript) {
            setShowConfirmDialog(true);
            setPendingPublish(() => () => doSave(true));
            return;
        }
        doSave(publish);
    };

    const doSave = async (publish = false) => {
        setIsSaving(true);
        try {
            if (!editorRef.current) return;
            const savedData = await editorRef.current.save();
            const newIsDraftState = publish ? false : true;
            const { error } = await actions.admin.customPages.updatePage({
                id: customPage.id,
                title,
                permalink,
                content: JSON.stringify(savedData),
                isDraft: newIsDraftState,
            });
            if (error) throw new Error(error.message);
            setIsDraft(newIsDraftState);
            toast.success(publish ? "¡Página Publicada!" : "Borrador guardado correctamente");
            loadHistory();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar la página.");
        } finally {
            setIsSaving(false);
            setShowConfirmDialog(false);
            setPendingPublish(null);
        }
    };

    const handleRestore = async (version: any) => {
        if (!editorRef.current) return;
        if (!confirm("¿Estás seguro? Esto reemplazará el contenido actual del editor.")) return;

        try {
            const content = JSON.parse(version.content);
            await editorRef.current.render(content);
            setTitle(version.title);
            setPermalink(version.permalink);
            // No cambiamos el estado isDraft hasta que guarde
            toast.info("Versión cargada. Recuerda guardar para aplicar cambios.");
        } catch (e) {
            toast.error("Error al restaurar versión.");
        }
    };

    // --- BANNER DE ADVERTENCIA SI HAY <script> ---
    useEffect(() => {
        setShowScriptWarning(hasScript);
    }, [hasScript]);

    return (
        <div className="max-w-5xl w-full mx-auto pb-20">

            {/* --- BANNER DE ADVERTENCIA DE SCRIPT --- */}
            {showScriptWarning && (
                <div className="mb-6 p-4 rounded-xl bg-yellow-900/30 border border-yellow-500/30 text-yellow-200 font-bold flex items-center gap-3 animate-pulse">
                    <span className="text-2xl">⚠️</span>
                    <span>
                        Esta página contiene <b>&lt;script&gt;</b> en bloques Raw. El código JavaScript se ejecutará para todos los usuarios.<br />
                        <span className="font-normal text-yellow-100">Asegúrate de que el contenido es seguro y no contiene código malicioso.</span>
                    </span>
                </div>
            )}

            {/* --- TOP BAR (Sticky) --- */}
            <div className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 py-4 mb-8 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-b-xl flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                    <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border
                        ${isDraft
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            : "bg-[#53FC18]/10 text-[#53FC18] border-[#53FC18]/20 shadow-[0_0_10px_rgba(83,252,24,0.1)]"
                        }
                    `}>
                        {isDraft ? <LucideEyeOff size={14} /> : <LucideEye size={14} />}
                        {isDraft ? "Borrador" : "Publicado"}
                    </div>
                    {isSaving && <span className="text-xs text-white/40 animate-pulse">Guardando...</span>}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        <LucideSave size={16} />
                        <span className="hidden sm:inline">Guardar Borrador</span>
                    </button>

                    <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="group flex items-center gap-2 px-5 py-2 rounded-lg bg-[#53FC18] hover:bg-[#43db12] text-black transition-all text-sm font-bold shadow-[0_0_15px_rgba(83,252,24,0.3)] hover:shadow-[0_0_25px_rgba(83,252,24,0.5)] disabled:opacity-50"
                    >
                        <LucideGlobe size={16} className="group-hover:scale-110 transition-transform" />
                        <span>Publicar</span>
                    </button>
                    {/* --- DIALOGO DE CONFIRMACIÓN SI HAY SCRIPT --- */}
                    <ConfirmDialog
                        open={showConfirmDialog}
                        onConfirm={() => {
                            if (pendingPublish) pendingPublish();
                        }}
                        onCancel={() => {
                            setShowConfirmDialog(false);
                            setPendingPublish(null);
                        }}
                        message={"Esta página contiene uno o más bloques <script> (JavaScript) que se ejecutarán para todos los usuarios. ¿Estás seguro de que deseas PUBLICAR?"}
                    />
                </div>
            </div>

            {/* --- METADATA INPUTS --- */}
            <div className="space-y-6 mb-10 px-2">
                {/* Título Masivo */}
                <input
                    type="text"
                    value={title}
                    onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                    placeholder="Título de la página..."
                    className="w-full bg-transparent border-none text-4xl md:text-5xl font-anton uppercase text-white placeholder:text-white/20 focus:ring-0 focus:outline-none p-0"
                />

                {/* Slug / Permalink */}
                <div className="flex items-center gap-0 text-white/40 font-mono text-sm bg-white/5 w-fit rounded-lg px-3 py-2 border border-white/5 focus-within:border-white/20 focus-within:bg-white/10 transition-colors">
                    <span className="select-none">/p/</span>
                    <input
                        type="text"
                        value={permalink}
                        onInput={(e) => setPermalink((e.target as HTMLInputElement).value)}
                        placeholder="slug-de-la-pagina"
                        className="bg-transparent border-none text-white/80 focus:ring-0 focus:outline-none p-0 w-48 sm:w-64 placeholder:text-white/20"
                    />
                </div>

                {/* Info Rápida */}
                <div className="flex items-center gap-6 text-xs text-white/30 font-rubik">
                    <div className="flex items-center gap-1.5">
                        <LucideUser size={12} />
                        <span>ID Autor: {customPage.authorId ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <LucideCalendar size={12} />
                        <span>Actualizado: {new Date(customPage.updatedAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* --- EDITOR CANVAS --- */}
            <div className="relative group">
                {/* Decoración de borde */}
                <div className="absolute -inset-px bg-gradient-to-b from-white/10 to-transparent rounded-2xl opacity-50 pointer-events-none"></div>

                <div className="bg-[#0c0c0e] rounded-2xl min-h-[500px] p-8 md:p-12 shadow-2xl relative">
                    <div id={editorContainerId} className="dark-editor-js prose prose-invert max-w-none"></div>
                </div>
            </div>

            {/* --- HISTORIAL (Timeline) --- */}
            <div className="mt-20 border-t border-white/5 pt-10">
                <h3 className="flex items-center gap-2 text-xl font-anton text-white mb-6">
                    <LucideHistory className="text-[#53FC18]" />
                    Historial de Versiones
                </h3>

                {loadingHistory ? (
                    <div className="text-white/30 text-sm animate-pulse">Cargando línea de tiempo...</div>
                ) : (
                    <div className="relative border-l border-white/10 ml-3 space-y-8">
                        {history.map((h, i) => (
                            <div key={h.id} className="relative pl-8 group">
                                {/* Dot */}
                                <div className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-white/20 border border-[#09090b] group-hover:bg-[#53FC18] group-hover:shadow-[0_0_10px_rgba(83,252,24,0.5)] transition-all"></div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div>
                                        <p className="text-white font-medium text-sm">
                                            Editado por ID: {h.editorId}
                                        </p>
                                        <p className="text-white/40 text-xs mt-0.5">
                                            {new Date(h.createdAt).toLocaleString()}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleRestore(h)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        <LucideRotateCcw size={14} />
                                        Restaurar
                                    </button>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <p className="pl-8 text-white/30 text-sm italic">No hay historial previo.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Styles Inyectados para EditorJS Dark Mode */}
            <style>{`
                /* Ajustes de colores para EditorJS en fondo oscuro */
                .dark-editor-js .ce-block__content {
                    color: rgba(255,255,255,0.8);
                }
                .dark-editor-js h1, .dark-editor-js h2, .dark-editor-js h3 {
                    color: white;
                }
                .dark-editor-js .ce-toolbar__content, .dark-editor-js .ce-block--selected .ce-block__content {
                    background: transparent;
                }
                .dark-editor-js .ce-inline-toolbar {
                    background-color: #1a1a1a;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                }
                .dark-editor-js .ce-inline-tool:hover {
                    background-color: rgba(255,255,255,0.1);
                }
                .dark-editor-js .ce-inline-tool--active {
                    color: #53FC18;
                }
                /* Input settings de los bloques */
                .dark-editor-js .ce-settings {
                    background-color: #1a1a1a;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .dark-editor-js .ce-settings__button {
                    color: white;
                }
                .dark-editor-js .ce-settings__button:hover {
                    background-color: rgba(255,255,255,0.1);
                }
            `}</style>
        </div>
    );
};