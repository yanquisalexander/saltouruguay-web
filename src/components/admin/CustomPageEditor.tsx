import { useState, useEffect, useRef } from "preact/hooks";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import { toast } from "sonner";
import type { getCustomPageBySlug } from "@/utils/custom-pages";
import { actions } from "astro:actions";
import { LayoutBlockTool } from "editorjs-layout";

export const CustomPageEditor = ({ customPage }: { customPage: Awaited<ReturnType<typeof getCustomPageBySlug>> }) => {
    const [title, setTitle] = useState(customPage.title);
    const [permalink, setPermalink] = useState(customPage.permalink);
    const editorRef = useRef<EditorJS | null>(null);

    useEffect(() => {
        let parsedData;

        try {
            parsedData = customPage.content ? JSON.parse(customPage.content) : {};
        } catch (error) {
            toast.error("Error al cargar el contenido. Se mostrará como texto plano.");
            parsedData = {
                blocks: [
                    {
                        type: "paragraph",
                        data: {
                            text: customPage.content ?? "Contenido no disponible",
                        },
                    },
                ],
            };
        }

        editorRef.current = new EditorJS({
            holder: "editorjs-container",
            tools: {
                header: Header,
                list: List,
                layout: {
                    class: LayoutBlockTool,
                    config: {
                        EditorJS,
                        enableLayoutEditing: false,
                        enableLayoutSaving: true,
                        initialData: {
                            itemContent: {
                                1: {
                                    blocks: [],
                                },
                            },
                            layout: {
                                type: "container",
                                id: "",
                                className: "",
                                style: "border: 1px solid #000000; ",
                                children: [
                                    {
                                        type: "item",
                                        id: "",
                                        className: "",
                                        style: "border: 1px solid #000000; display: inline-block; ",
                                        itemContentId: "1",
                                    },
                                ],
                            },
                        },
                    },

                }
            },
            data: parsedData,
        });

        return () => {
            editorRef.current?.destroy();
            editorRef.current = null;
        };
    }, []);

    const handleSave = async () => {
        const savedData = await editorRef.current?.save();

        const { error } = await actions.admin.customPages.updatePage({
            id: customPage.id,
            title,
            permalink,
            content: JSON.stringify(savedData),
        });

        if (error) {
            toast.error("Error al guardar la página personalizada");
            console.error("Error saving custom page:", error);
            return;
        }
        toast.success("Página personalizada guardada exitosamente");
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Editor de Página Personalizada</h2>
            <input
                type="text"
                value={title}
                onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                placeholder="Título"
                className="border p-2 rounded"
            />
            <input
                type="text"
                value={permalink}
                onInput={(e) => setPermalink((e.target as HTMLInputElement).value)}
                placeholder="Slug"
                className="border p-2 rounded"
            />
            <div id="editorjs-container" className="prose prose-invert prose-indigo max-w-none border-neutral-700 border p-4 rounded bg-neutral-950"></div>
            <button onClick={handleSave} className="bg-blue-600 rounded-full px-4 text-white p-2 max-w-fit hover:bg-neutral-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                Guardar
            </button>
        </div>
    );
};
