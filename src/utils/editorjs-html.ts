import EditorJSHTML from 'editorjs-html';
import type { OutputData, OutputBlockData } from '@editorjs/editorjs';

// --- UTILS ---

// Sanitiza el texto, pero permite <script> si allowScript=true
const sanitize = (str: string, allowScript = true) => {
    if (!str) return '';
    if (allowScript) {
        // Permite <script> pero escapa el resto
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, (m, offset, s) => {
                // Permite <script> y </script>
                if (s.slice(offset, offset + 8).toLowerCase() === '<script>' || s.slice(offset, offset + 9).toLowerCase() === '</script>') return '<';
                return '&lt;';
            })
            .replace(/>/g, (m, offset, s) => {
                // Permite <script> y </script>
                if (s.slice(offset - 7, offset + 1).toLowerCase() === '<script>' || s.slice(offset - 8, offset + 1).toLowerCase() === '</script>') return '>';
                return '&gt;';
            })
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

// --- HELPER PARA RENDERIZAR CHECKLIST ITEMS ---
// Extraemos esto porque se usa tanto en type="checklist" como en type="list" style="checklist"
const renderChecklistItems = (items: any[]) => {
    return items.map((item: any) => {
        // Tu JSON muestra que el texto viene en item.content y el estado en item.meta.checked
        // A veces viene directo como item.text y item.checked. Manejamos ambos.
        const text = item.content || item.text || (typeof item === 'string' ? item : '');
        const isChecked = item.meta?.checked || item.checked === true;

        const safeContent = sanitize(text);

        const icon = isChecked
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#53FC18" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5 text-white/20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect></svg>`;

        const textClass = isChecked ? 'text-white/50 line-through' : 'text-white/80';

        return `
            <div class="flex gap-3 items-start mb-3 group">
                <div class="pt-0.5">${icon}</div>
                <span class="${textClass} text-lg transition-colors font-rubik">${safeContent}</span>
            </div>
        `;
    }).join('');
};

// --- CUSTOM PARSERS ---

const customParsers = {
    header: (block: OutputBlockData) => {
        const { text, level } = block.data;
        const safeText = sanitize(text);
        const slug = slugify(text);

        const sizes: Record<number, string> = {
            1: 'text-4xl md:text-5xl mt-12 mb-6 text-white font-anton uppercase tracking-wide',
            2: 'text-3xl md:text-4xl mt-10 mb-5 text-white/90 font-anton uppercase tracking-wide border-b border-white/10 pb-2',
            3: 'text-2xl md:text-3xl mt-8 mb-4 text-white/90 font-teko uppercase font-bold text-[#53FC18]',
            4: 'text-xl mt-6 mb-3 text-white font-bold',
            5: 'text-lg mt-4 mb-2 text-white font-bold',
            6: 'text-base mt-4 mb-2 text-white font-bold uppercase',
        };

        const className = sizes[level] || sizes[3];
        return `<h${level} id="${slug}" class="${className}">${safeText}</h${level}>`;
    },

    paragraph: (block: OutputBlockData) => {
        return `<p class="text-lg leading-relaxed text-white/70 mb-6 font-rubik">${block.data.text}</p>`;
    },

    // Parser específico para type="checklist"
    checklist: (block: OutputBlockData) => {
        if (!block.data || !Array.isArray(block.data.items)) return '';
        const itemsHtml = renderChecklistItems(block.data.items);
        return `<div class="my-8 p-4 bg-white/5 border border-white/5 rounded-2xl">${itemsHtml}</div>`;
    },

    // Parser POLIMÓRFICO para type="list"
    list: (block: OutputBlockData) => {
        const style = block.data.style; // 'ordered', 'unordered', o 'checklist'
        const items = block.data.items;

        // 1. SI ES UNA CHECKLIST CAMUFLADA DE LISTA (Tu caso específico)
        if (style === 'checklist') {
            const itemsHtml = renderChecklistItems(items);
            return `<div class="my-8 p-4 bg-white/5 border border-white/5 rounded-2xl">${itemsHtml}</div>`;
        }

        // 2. SI ES UNA LISTA NORMAL (Ordered/Unordered)
        const tag = style === 'ordered' ? 'ol' : 'ul';
        const listStyle = style === 'ordered' ? 'list-decimal' : 'list-disc';

        const listItems = items.map((item: any) => {
            // Manejo defensivo: a veces item es string, a veces objeto {content: "..."}
            const content = typeof item === 'string' ? item : (item.content || item.text || '');
            return `<li class="pl-2 mb-2 marker:text-[#53FC18] marker:font-bold">${content}</li>`;
        }).join('');

        return `<${tag} class="${listStyle} list-outside ml-6 mb-8 text-lg text-white/70 space-y-1">${listItems}</${tag}>`;
    },

    image: (block: OutputBlockData) => {
        const { file, caption, withBorder, withBackground, stretched } = block.data;
        let containerClasses = "relative my-10 group";
        if (withBackground) containerClasses += " bg-white/5 p-8 rounded-2xl";
        if (stretched) containerClasses += " w-full";

        let imgClasses = "w-full h-auto rounded-xl shadow-2xl transition-transform duration-500";
        if (withBorder) imgClasses += " border-2 border-white/10";

        const captionHtml = caption
            ? `<figcaption class="mt-3 text-center text-sm text-white/40 font-mono italic">${caption}</figcaption>`
            : '';

        return `
            <figure class="${containerClasses}">
                <img src="${file.url}" alt="${caption || ''}" class="${imgClasses}" loading="lazy" />
                ${captionHtml}
            </figure>
        `;
    },

    quote: (block: OutputBlockData) => {
        const { text, caption, alignment } = block.data;
        const alignClass = alignment === 'center' ? 'text-center' : 'text-left';

        return `
            <blockquote class="my-10 border-l-4 border-[#53FC18] pl-6 py-2 bg-gradient-to-r from-[#53FC18]/10 to-transparent rounded-r-xl">
                <p class="text-xl md:text-2xl italic font-serif text-white/90 mb-2 ${alignClass}">"${text}"</p>
                ${caption ? `<footer class="text-sm font-bold text-[#53FC18] tracking-widest uppercase ${alignClass}">— ${caption}</footer>` : ''}
            </blockquote>
        `;
    },

    code: (block: OutputBlockData) => {
        const codeContent = sanitize(block.data.code);
        return `
            <div class="my-8 rounded-xl bg-[#0F0F12] border border-white/10 overflow-hidden shadow-xl">
                <div class="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
                    <div class="size-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div class="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div class="size-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <pre class="p-5 overflow-x-auto text-sm font-mono text-blue-200 leading-relaxed"><code>${codeContent}</code></pre>
            </div>
        `;
    },

    delimiter: () => {
        return `<div class="my-12 flex items-center justify-center gap-4 opacity-30">
            <div class="h-px w-24 bg-white"></div>
            <div class="size-2 rounded-full bg-[#53FC18]"></div>
            <div class="h-px w-24 bg-white"></div>
        </div>`;
    },

    table: (block: OutputBlockData) => {
        const { content, withHeadings } = block.data;

        let rows = content.map((row: string[], index: number) => {
            const isHeader = withHeadings && index === 0;
            const cellTag = isHeader ? 'th' : 'td';
            const cellClass = isHeader
                ? 'px-4 py-3 text-left font-bold text-white bg-white/10 border-b border-white/10 uppercase tracking-wider text-xs'
                : 'px-4 py-3 text-white/70 border-b border-white/5 font-mono text-sm';

            const cells = row.map((cell) => `<${cellTag} class="${cellClass}">${cell}</${cellTag}>`).join('');
            return `<tr class="${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} hover:bg-white/5 transition-colors">${cells}</tr>`;
        }).join('');

        return `
            <div class="my-10 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse">
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
};

const editorJsParser = EditorJSHTML(customParsers);

/**
 * Renderiza el contenido de EditorJS a HTML.
 * Si allowScript=true, permite <script> en el HTML final (solo recomendable si solo admins pueden publicar).
 */
export function renderEditorJsToHtml(editorData: string | OutputData | null | undefined, allowScript = false): string {
    if (!editorData) return '';
    try {
        const data: OutputData = typeof editorData === 'string'
            ? JSON.parse(editorData) as OutputData
            : editorData;
        if (!data.blocks || data.blocks.length === 0) return '';
        // Renderiza cada bloque, permitiendo <script> solo en bloques de tipo "raw" o similar
        const htmlBlocks = data.blocks.map((block: any) => {
            if (block.type === 'raw' && allowScript) {
                // Permite HTML crudo, incluyendo <script>, sin escape
                return block.data && typeof block.data.html === 'string' ? String(block.data.html) : '';
            }
            // Usa el parser custom para el resto
            if (customParsers[block.type]) {
                return customParsers[block.type](block);
            }
            // Fallback: escapa todo
            return `<pre>${sanitize(JSON.stringify(block.data), allowScript)}</pre>`;
        });
        return htmlBlocks.join('');
    } catch (e) {
        console.error("Error crítico renderizando EditorJS:", e);
        return `
            <div class="p-4 my-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-lg text-sm font-mono">
                Error de formato.
            </div>
        `;
    }
}