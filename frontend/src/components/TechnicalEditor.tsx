import React, { useCallback, useMemo } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node, Extension } from '@tiptap/core';
import { Fragment } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Image } from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Indent,
    Outdent,
    Image as ImageIcon,
    Minus,
    Undo,
    Redo,
    Table as TableIcon,
    Type,
    ArrowUpDown,
    TypeOutline,
    Rows3,
    Columns3,
    Plus,
    Trash2,
    Palette
} from 'lucide-react';

interface TechnicalEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: number;
    showPagePreview?: boolean;
    /**
     * Quando usado, força inserção no cursor atual do editor.
     * - externalInsertToken: usado como gatilho (token muda a cada inserção)
     * - externalInsertText: conteúdo a inserir (pode conter HTML, ex: <br/>)
     */
    externalInsertText?: string;
    externalInsertToken?: number;
}

// NodeView para imagem com botões − | + em cima de cada imagem (apenas quando há upload de imagem)
const STEP_PX = 40;
const MIN_WIDTH_PX = 50;
const MAX_WIDTH_PX = 800;

interface ImageResizeViewProps {
    node: { attrs: Record<string, unknown> };
    updateAttributes: (attrs: Record<string, unknown>) => void;
}

const ImageResizeView: React.FC<ImageResizeViewProps> = ({ node, updateAttributes }) => {
    const widthAttr = (node.attrs?.width as string) || '';
    const currentPx = useMemo(() => {
        const m = widthAttr.toString().match(/(\d+)px/);
        return m ? parseInt(m[1], 10) : 300;
    }, [widthAttr]);

    const shrink = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const next = Math.max(MIN_WIDTH_PX, currentPx - STEP_PX);
            updateAttributes({ width: `${next}px`, style: `width:${next}px` });
        },
        [currentPx, updateAttributes]
    );

    const grow = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const next = Math.min(MAX_WIDTH_PX, currentPx + STEP_PX);
            updateAttributes({ width: `${next}px`, style: `width:${next}px` });
        },
        [currentPx, updateAttributes]
    );

    const imgStyle: React.CSSProperties = {};
    if (node.attrs?.width) imgStyle.width = node.attrs.width as string;

    return (
        <NodeViewWrapper as="span" className="technical-editor-image-wrapper">
            <span className="image-resize-controls" contentEditable={false}>
                <button type="button" onClick={shrink} title="Diminuir tamanho" aria-label="Diminuir">−</button>
                <span className="image-resize-sep">|</span>
                <button type="button" onClick={grow} title="Aumentar tamanho" aria-label="Aumentar">+</button>
            </span>
            <img
                src={(node.attrs?.src as string) || ''}
                alt={(node.attrs?.alt as string) || ''}
                className="technical-editor-image"
                style={Object.keys(imgStyle).length ? imgStyle : undefined}
                draggable={false}
            />
        </NodeViewWrapper>
    );
};

// Extensões do TipTap
const extensions = [
    StarterKit,
    Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TextAlign.configure({
        // enable alignment for headings, paragraphs and images
        types: ['heading', 'paragraph', 'image'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
    }),
    Placeholder,
    // Extend image to support width attribute/style e NodeView com botões − | + em cima de cada imagem
    Image.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                width: {
                    default: null,
                    parseHTML: element => element.getAttribute('width') || null,
                    renderHTML: attributes => {
                        if (!attributes.width) return {};
                        return { width: attributes.width };
                    },
                },
                style: {
                    default: null,
                    parseHTML: element => element.getAttribute('style') || null,
                    renderHTML: attributes => {
                        if (!attributes.style) return {};
                        return { style: attributes.style };
                    },
                },
            };
        },
        addNodeView() {
            return ReactNodeViewRenderer(ImageResizeView);
        },
    }).configure({
        inline: true,
        HTMLAttributes: {
            class: 'technical-editor-image',
        },
        // Allow base64 images so pasted images persist when saving
        allowBase64: true,
    }),
    // Small font-size extension using TextStyle mark to avoid external packages
    Extension.create({
        name: 'fontSizeCustom',
        addGlobalAttributes() {
            return [
                {
                    types: ['textStyle'],
                    attributes: {
                        fontSize: {
                            default: null,
                            parseHTML: element => element.style?.fontSize || null,
                            renderHTML: attributes => {
                                if (!attributes.fontSize) return {};
                                return { style: `font-size: ${attributes.fontSize}` };
                            },
                        },
                    },
                },
            ];
        },
    }),
    // PageBreak node (block node handled by schema, not plain HTML)
    Node.create({
        name: 'pageBreak',
        group: 'block',
        atom: true,
        selectable: false,
        isolating: true,
        parseHTML() {
            return [{ tag: 'div.page-break' }];
        },
        renderHTML() {
            return ['div', { class: 'page-break' }];
        },
    }),
    TextStyle,
    Color,
    // listItem com atributo style para recuo (margin-left) manual, compatível com reflowPages
    Extension.create({
        name: 'listItemStyle',
        addGlobalAttributes() {
            return [
                {
                    types: ['listItem'],
                    attributes: {
                        style: {
                            default: null,
                            parseHTML: (el) => (el as HTMLElement).getAttribute('style') || null,
                            renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
                        },
                    },
                },
            ];
        },
    }),
    // paragraph com atributo style para recuo (margin-left, text-indent); persistido no HTML e no PDF
    Extension.create({
        name: 'paragraphStyle',
        addGlobalAttributes() {
            return [
                {
                    types: ['paragraph'],
                    attributes: {
                        style: {
                            default: null,
                            parseHTML: (el) => (el as HTMLElement).getAttribute('style') || null,
                            renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
                        },
                    },
                },
            ];
        },
    }),
    // Tab / Shift+Tab: recuo universal (margin-left +=20px ou text-indent 20px); sincronizado com PDF via estilo inline
    Extension.create({
        name: 'tabIndentOutdent',
        addKeyboardShortcuts() {
            return {
                Tab: () => {
                    const { state } = this.editor;
                    const { $from, from, to } = state.selection;
                    const inList = this.editor.isActive('bulletList') || this.editor.isActive('orderedList');
                    const nodeType = inList ? 'listItem' : 'paragraph';
                    if ($from.parent.type.name !== 'paragraph' && $from.parent.type.name !== 'listItem') return false;
                    const attrs = this.editor.getAttributes(nodeType) || {};
                    const style = String(attrs.style || '').trim();
                    const marginMatch = style.match(/margin-left:\s*([0-9.]+)(px|em)/i);
                    const marginPx = marginMatch ? (marginMatch[2].toLowerCase() === 'em' ? Math.round(parseFloat(marginMatch[1]) * 16) : Math.round(parseFloat(marginMatch[1]))) : 0;
                    const hasSelection = from !== to;
                    if (hasSelection) {
                        const newPx = marginPx + 20;
                        const rest = style.replace(/margin-left:\s*[^;]+;?/gi, '').trim();
                        const newStyle = (rest ? rest + ' ' : '') + `margin-left: ${newPx}px;`;
                        return this.editor.chain().focus().updateAttributes(nodeType, { style: newStyle }).run();
                    }
                    const pAttrs = this.editor.getAttributes('paragraph') || {};
                    const pStyle = String(pAttrs.style || '').trim();
                    const withoutTextIndent = pStyle.replace(/text-indent:\s*[^;]+;?/gi, '').trim();
                    const newStyle = (withoutTextIndent ? withoutTextIndent + ' ' : '') + 'text-indent: 20px;';
                    return this.editor.chain().focus().updateAttributes('paragraph', { style: newStyle }).run();
                },
                'Shift-Tab': () => {
                    const { state } = this.editor;
                    const { $from, from, to } = state.selection;
                    const inList = this.editor.isActive('bulletList') || this.editor.isActive('orderedList');
                    const nodeType = inList ? 'listItem' : 'paragraph';
                    const attrs = this.editor.getAttributes(nodeType) || {};
                    const style = String(attrs.style || '').trim();
                    const marginMatch = style.match(/margin-left:\s*([0-9.]+)(px|em)/i);
                    let marginPx = marginMatch ? (marginMatch[2].toLowerCase() === 'em' ? Math.round(parseFloat(marginMatch[1]) * 16) : Math.round(parseFloat(marginMatch[1]))) : 0;
                    const rest = style.replace(/margin-left:\s*[^;]+;?/gi, '').replace(/text-indent:\s*[^;]+;?/gi, '').trim();
                    if (marginPx > 0) {
                        marginPx = Math.max(0, marginPx - 20);
                        const newStyle = marginPx > 0 ? (rest ? rest + ' ' : '') + `margin-left: ${marginPx}px;` : rest || '';
                        return this.editor.chain().focus().updateAttributes(nodeType, { style: newStyle }).run();
                    }
                    const pAttrs = this.editor.getAttributes('paragraph') || {};
                    const pStyle = String(pAttrs.style || '').trim();
                    const withoutTextIndent = pStyle.replace(/text-indent:\s*[^;]+;?/gi, '').trim();
                    return this.editor.chain().focus().updateAttributes('paragraph', { style: withoutTextIndent || '' }).run();
                },
            };
        },
    }),
    // Herança de recuo ao Enter apenas dentro de lista (parágrafo novo no topo não herda recuo)
    Extension.create({
        name: 'paragraphStyleInherit',
        addProseMirrorPlugins() {
            return [
                new Plugin({
                    appendTransaction(_transactions, _oldState, newState) {
                        const $from = newState.selection.$from;
                        if ($from.depth < 2) return null;
                        const listNode = $from.node(1);
                        if (listNode.type.name !== 'bulletList' && listNode.type.name !== 'orderedList') return null;
                        const blockIndex = $from.index(1);
                        if (blockIndex === 0) return null;
                        const prevNode = listNode.child(blockIndex - 1);
                        const currNode = listNode.child(blockIndex);
                        if (prevNode.type.name === 'listItem' && currNode.type.name === 'listItem' && prevNode.attrs.style && !currNode.attrs.style) {
                            const tr = newState.tr;
                            const startPos = $from.before(2);
                            tr.setNodeMarkup(startPos, null, { ...currNode.attrs, style: prevNode.attrs.style });
                            return tr;
                        }
                        return null;
                    },
                }),
            ];
        },
    }),
];

// Tamanhos de fonte disponíveis (1:1 editor ↔ PDF), até 80px
const FONT_SIZES = ['10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt', '40pt', '48pt', '56pt', '64pt', '72pt', '80px'] as const;
const DEFAULT_FONT_SIZE = '12pt';

// === 90px topo, 20px laterais, 100px inferior (alinhado ao PDF da descrição técnica) ===
const PX_PER_MM = 3.78; // 96 DPI / 25.4 mm (só para PAGE_HEIGHT_PX / largura A4)
const PAGE_HEIGHT_PX = Math.round(297 * PX_PER_MM); // ~1123px (altura total da folha A4)
const EDITOR_MARGIN_TOP_PX = 90;
const EDITOR_MARGIN_BOTTOM_PX = 100;
const EDITOR_MARGIN_LR_PX = 20;
const CONTENT_MAX_HEIGHT = PAGE_HEIGHT_PX - EDITOR_MARGIN_TOP_PX - EDITOR_MARGIN_BOTTOM_PX; // área útil em px
const MAX_PAGES = 50; // trava: evita loop infinito e divs em excesso

const TechnicalEditor: React.FC<TechnicalEditorProps> = ({
    value,
    onChange,
    placeholder = 'Digite a descrição técnica completa do projeto...',
    height = 500,
    showPagePreview = true,
    externalInsertText,
    externalInsertToken
}) => {
    // Limpar alturas fixas no colar (Word/Web) para evitar loop de criação de páginas infinitas
    const transformPastedHTML = useCallback((html: string) => {
        return html
            .replace(/\s*(?:min-height|max-height)\s*:\s*[^;]+;?/gi, '')
            .replace(/\s+height\s*:\s*[^;]+;?/gi, '') // não remove line-height (tem hífen)
            .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '');
    }, []);

    const editor = useEditor({
        extensions,
        content: value,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: 'technical-editor-content',
            },
            transformPastedHTML,
        },
    });

    // Guarda a última posição do cursor/seleção enquanto o editor está focado,
    // para inserir após clique em elementos externos (ex: "Tags Rápidas").
    const lastSelectionFromRef = React.useRef<number>(0);
    React.useEffect(() => {
        if (!editor) return;
        const update = () => {
            if (!editor?.isFocused) return;
            lastSelectionFromRef.current = editor.state.selection.from;
        };
        update();
        editor.on('selectionUpdate', update);
        return () => {
            editor.off('selectionUpdate', update);
        };
    }, [editor]);

    // Inserção externa baseada no último cursor capturado.
    const lastProcessedInsertTokenRef = React.useRef<number | null>(null);
    React.useEffect(() => {
        if (!editor) return;
        if (typeof externalInsertToken !== 'number') return;

        // Evita "reaplicar" a última tag ao remontar o editor (troca de aba Design/Preview).
        if (lastProcessedInsertTokenRef.current === null) {
            lastProcessedInsertTokenRef.current = externalInsertToken;
            return;
        }
        if (externalInsertToken === lastProcessedInsertTokenRef.current) return;

        lastProcessedInsertTokenRef.current = externalInsertToken;
        if (!externalInsertText) return;

        const pos = Math.max(0, lastSelectionFromRef.current ?? editor.state.selection.from);
        editor.chain().focus().insertContentAt(pos, externalInsertText).run();
    }, [editor, externalInsertToken, externalInsertText]);

    // Funções da toolbar
    const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
    const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
    const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
    const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
    const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
    
    const setTextAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
        editor?.chain().focus().setTextAlign(alignment).run();
    }, [editor]);

    // Recuo universal: margin-left +=20px no nó atual (Paragraph ou ListItem); preserva resto do style; PDF renderiza inline fielmente.
    const getStyleAndMarginLeft = useCallback((nodeType: 'paragraph' | 'listItem'): { style: string; marginLeftPx: number } => {
        if (!editor) return { style: '', marginLeftPx: 0 };
        const attrs = editor.getAttributes(nodeType) || {};
        const style = String(attrs.style || '').trim();
        const m = style.match(/margin-left:\s*([0-9.]+)(px|em)/i);
        const marginLeftPx = m ? (m[2].toLowerCase() === 'em' ? Math.round(parseFloat(m[1]) * 16) : Math.round(parseFloat(m[1]))) : 0;
        return { style, marginLeftPx };
    }, [editor]);

    const indent = useCallback(() => {
        if (!editor) return;
        const inList = editor.isActive('bulletList') || editor.isActive('orderedList');
        const nodeType = inList ? 'listItem' : 'paragraph';
        const { style, marginLeftPx } = getStyleAndMarginLeft(nodeType);
        const newPx = marginLeftPx + 20;
        const rest = style.replace(/margin-left:\s*[^;]+;?/gi, '').trim();
        const newStyle = (rest ? rest + ' ' : '') + `margin-left: ${newPx}px;`;
        editor.chain().focus().updateAttributes(nodeType, { style: newStyle }).run();
    }, [editor, getStyleAndMarginLeft]);

    const outdent = useCallback(() => {
        if (!editor) return;
        const inList = editor.isActive('bulletList') || editor.isActive('orderedList');
        const nodeType = inList ? 'listItem' : 'paragraph';
        const { style, marginLeftPx } = getStyleAndMarginLeft(nodeType);
        const newPx = Math.max(0, marginLeftPx - 20);
        const rest = style.replace(/margin-left:\s*[^;]+;?/gi, '').trim();
        const newStyle = newPx > 0 ? (rest ? rest + ' ' : '') + `margin-left: ${newPx}px;` : rest || '';
        editor.chain().focus().updateAttributes(nodeType, { style: newStyle }).run();
    }, [editor, getStyleAndMarginLeft]);

    // Controles de tamanho de fonte (1:1 com PDF)
    const getCurrentFontSize = useCallback((): string => {
        if (!editor) return DEFAULT_FONT_SIZE;
        const attrs = editor.getAttributes('textStyle');
        const size = attrs?.fontSize;
        if (size && FONT_SIZES.includes(size as typeof FONT_SIZES[number])) return size;
        return DEFAULT_FONT_SIZE;
    }, [editor]);

    const setFontSize = useCallback((size: string) => {
        if (!editor) return;
        const textStyle = editor.state.schema.marks.textStyle;
        const current = editor.state.selection.$from.marks().find(m => m.type === textStyle)?.attrs ?? {};
        editor.chain().focus().setMark('textStyle', { ...current, fontSize: size }).run();
    }, [editor]);

    const increaseFontSize = useCallback(() => {
        if (!editor) return;
        const current = getCurrentFontSize();
        const idx = FONT_SIZES.indexOf(current as typeof FONT_SIZES[number]);
        const next = idx < FONT_SIZES.length - 1 ? FONT_SIZES[idx + 1] : FONT_SIZES[FONT_SIZES.length - 1];
        setFontSize(next);
    }, [editor, getCurrentFontSize, setFontSize]);

    const decreaseFontSize = useCallback(() => {
        if (!editor) return;
        const current = getCurrentFontSize();
        const idx = FONT_SIZES.indexOf(current as typeof FONT_SIZES[number]);
        const next = idx > 0 ? FONT_SIZES[idx - 1] : FONT_SIZES[0];
        setFontSize(next);
    }, [editor, getCurrentFontSize, setFontSize]);

    const insertImage = useCallback(() => {
        const url = window.prompt('URL da imagem:');
        if (url) {
            editor?.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    // File upload insertion (convert to base64 and insert)
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const onSelectFile = useCallback(async (file?: File) => {
        const f = file || fileInputRef.current?.files?.[0];
        if (!f) return;
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(f);
            });
            editor?.chain().focus().setImage({ src: base64 }).run();
            // clear input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Erro ao inserir imagem:', err);
        }
    }, [editor]);

    // Adjust selected image size by delta pixels
    const adjustImageSize = useCallback((delta: number) => {
        if (!editor) return;
        const { state } = editor;
        const { from } = state.selection;
        const node = state.doc.nodeAt(from);
        if (!node || node.type.name !== 'image') return;
        const currentWidthAttr = node.attrs.width || '';
        let currentPx = 300;
        const pxMatch = (currentWidthAttr || '').toString().match(/(\d+)px/);
        if (pxMatch) currentPx = parseInt(pxMatch[1], 10);
        const newPx = Math.max(50, currentPx + delta);
        editor.chain().focus().updateAttributes('image', { width: `${newPx}px` }).run();
    }, [editor]);
    
    // --- Drag handles for live image resize ---
    const [selectedImagePos, setSelectedImagePos] = React.useState<number | null>(null);
    const [handleRect, setHandleRect] = React.useState<DOMRect | null>(null);
    const draggingRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

    // update selected image info on selection change
    React.useEffect(() => {
        if (!editor) return;
        const onUpdate = () => {
            const { state, view } = editor;
            const { from } = state.selection;
            const node = state.doc.nodeAt(from);
            if (node && node.type.name === 'image') {
                setSelectedImagePos(from);
                // try to locate DOM element
                try {
                    const dom = view.nodeDOM(from) as HTMLElement | null;
                    if (dom) {
                        const rect = dom.getBoundingClientRect();
                        setHandleRect(rect);
                    } else {
                        setHandleRect(null);
                    }
                } catch (e) {
                    setHandleRect(null);
                }
            } else {
                setSelectedImagePos(null);
                setHandleRect(null);
            }
        };

        const observer = editor.on('transaction', onUpdate);
        // initial
        onUpdate();
        return () => {
            if (observer && typeof observer === 'function') editor.off('transaction', onUpdate);
        };
    }, [editor]);

    // pointer handlers for drag
    React.useEffect(() => {
        const onPointerMove = (e: PointerEvent) => {
            if (!draggingRef.current || !selectedImagePos || !editor) return;
            const deltaX = e.clientX - draggingRef.current.startX;
            const newWidth = Math.max(50, draggingRef.current.startWidth + deltaX);
            editor.chain().focus().updateAttributes('image', { width: `${newWidth}px`, style: `width:${newWidth}px` }).run();
            // refresh rect
            try {
                const dom = editor.view.nodeDOM(selectedImagePos) as HTMLElement | null;
                if (dom) setHandleRect(dom.getBoundingClientRect());
            } catch (err) {}
        };
        const onPointerUp = () => {
            draggingRef.current = null;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [selectedImagePos, editor]);

    // --- Automatic pagination / fragmentation ---
    const reflowTimerRef = React.useRef<number | null>(null);
    const isApplyingRef = React.useRef(false);
    const pastingRef = React.useRef(false);
    const reflowScheduledRef = React.useRef(false);

    const reflowPages = React.useCallback(() => {
        if (!editor) return;
        if (isApplyingRef.current) return;
        const contentEl = contentRef.current || document.querySelector('.technical-editor-content') as HTMLElement | null;
        if (!contentEl) return;
        const pm = contentEl.querySelector('.ProseMirror') as HTMLElement | null;
        if (!pm) return;

        const children = Array.from(pm.children);
        const existingBreaks = children.filter((el) => (el as HTMLElement).classList?.contains('page-break')).length;
        if (existingBreaks >= MAX_PAGES - 1) return; // já há páginas suficientes; evita loop

        isApplyingRef.current = true;
        reflowScheduledRef.current = false;
        try {
            const contentHeightPx = CONTENT_MAX_HEIGHT;
            const minFillBeforeBreak = contentHeightPx * 0.5; // evita 3ª folha com metade vazia: só quebra se página já tem ≥50% preenchida
            let cumulative = 0;
            for (let i = 0; i < children.length; i++) {
                const el = children[i] as HTMLElement;
                if (el.classList.contains('page-break')) {
                    cumulative = 0;
                    continue;
                }
                const h = el.offsetHeight;
                const mustBreak = cumulative + h > contentHeightPx && (cumulative >= minFillBeforeBreak || h > contentHeightPx);
                if (mustBreak) {
                    const prev = el.previousElementSibling as HTMLElement | null;
                    if (!(prev && prev.classList.contains('page-break'))) {
                        // Regra: elemento cabe na próxima página? → mover inteiro (inserir quebra antes).
                        // Só quebrar parágrafo longo quando não couber inteiro.
                        const fitsNextPage = h <= contentHeightPx;
                        if (fitsNextPage) {
                            // Mover elemento inteiro para a próxima página (sem perda de dados)
                            try {
                                const pos = editor.view.posAtDOM(el, 0);
                                editor.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
                            } catch (err) {
                                const pos = editor.view.posAtDOM(el, 0);
                                editor.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
                            }
                            break;
                        }
                        // Elemento maior que uma página: só então tentar quebrar
                        if (el.tagName.toLowerCase() === 'table' || (el.querySelector && el.querySelector('tr'))) {
                            const tableEl = el.tagName.toLowerCase() === 'table' ? el as HTMLTableElement : el.querySelector('table') as HTMLTableElement | null;
                            if (tableEl) {
                                const rows = Array.from(tableEl.querySelectorAll('tr'));
                                let rowCum = 0;
                                let splitIndex = -1;
                                const headerEl = tableEl.querySelector('thead');
                                for (let r = 0; r < rows.length; r++) {
                                    const rowH = (rows[r] as HTMLElement).offsetHeight;
                                    if (rowCum + rowH > contentHeightPx) {
                                        splitIndex = r;
                                        break;
                                    }
                                    rowCum += rowH;
                                }
                                if (splitIndex > 0) {
                                    const splitRow = rows[splitIndex] as HTMLElement;
                                    const posRow = editor.view.posAtDOM(splitRow, 0);
                                    editor.chain().focus().insertContentAt(posRow, { type: 'pageBreak' }).run();
                                    if (headerEl) {
                                        const headerHTML = headerEl.outerHTML;
                                        editor.chain().focus().insertContentAt(posRow + 1, headerHTML).run();
                                    }
                                    break;
                                }
                            }
                            const pos = editor.view.posAtDOM(el, 0);
                            editor.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
                            break;
                        }
                        if (el.tagName.toLowerCase() === 'p' || el.nodeType === 1) {
                            const text = el.innerText || el.textContent || '';
                            const attrs = editor.state.doc.nodeAt(editor.view.posAtDOM(el, 0))?.attrs ?? {};
                            const paraStyle = attrs.style || null;
                            if (text.length > 10) {
                                const offscreen = document.createElement('div');
                                const cs = window.getComputedStyle(el);
                                offscreen.style.cssText = `position:absolute;left:-99999px;top:0;width:${el.clientWidth}px;font:${cs.font};font-size:${cs.fontSize};line-height:${cs.lineHeight};white-space:normal;padding:0;`;
                                document.body.appendChild(offscreen);
                                // Quebra preferencial em fim de frase (.;!?) para continuidade exata
                                const sentenceEnd = text.search(/[.!?]\s+/);
                                let best = Math.min(
                                    sentenceEnd >= 0 ? sentenceEnd + 1 : text.length,
                                    Math.floor(text.length / 2)
                                );
                                let low = 0;
                                let high = text.length;
                                while (low <= high) {
                                    const mid = Math.floor((low + high) / 2);
                                    offscreen.textContent = text.slice(0, mid);
                                    const hh = offscreen.offsetHeight;
                                    if (hh <= contentHeightPx - cumulative) {
                                        best = mid;
                                        low = mid + 1;
                                    } else {
                                        high = mid - 1;
                                    }
                                }
                                document.body.removeChild(offscreen);
                                if (best > 0 && best < text.length) {
                                    try {
                                        const startPos = editor.view.posAtDOM(el, 0);
                                        const node = editor.state.doc.nodeAt(startPos);
                                        if (node) {
                                            const part1 = text.slice(0, best).trimEnd();
                                            const part2 = text.slice(best).replace(/^\s+/, '');
                                            const { schema } = editor.state;
                                            const attrs = paraStyle ? { style: paraStyle } : {};
                                            const p1 = part1 ? schema.nodes.paragraph.create(attrs, schema.text(part1)) : schema.nodes.paragraph.create(attrs);
                                            const p2 = part2 ? schema.nodes.paragraph.create(attrs, schema.text(part2)) : schema.nodes.paragraph.create(attrs);
                                            const pageBreakNode = schema.nodes.pageBreak.create();
                                            const tr = editor.state.tr;
                                            const endPos = startPos + node.nodeSize;
                                            tr.replaceWith(startPos, endPos, Fragment.fromArray([p1, pageBreakNode, p2]));
                                            editor.view.dispatch(tr);
                                        } else {
                                            const pos = editor.view.posAtDOM(el, 0);
                                            editor.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
                                        }
                                    } catch (err) {
                                        const pos = editor.view.posAtDOM(el, 0);
                                        editor.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
                                    }
                                    break;
                                }
                            }
                            const pos = editor.view.posAtDOM(el, 0);
                            editor.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
                            break;
                        }
                        try {
                            const pos = editor.view.posAtDOM(el, 0);
                            editor.chain().focus().insertContentAt(pos, { type: 'pageBreak' }).run();
                        } catch (err) {
                            editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
                        }
                        break;
                    } else {
                        cumulative += h;
                    }
                } else {
                    cumulative += h;
                }
            }
        } finally {
            isApplyingRef.current = false;
        }
    }, [editor]);

    React.useEffect(() => {
        if (!editor) return;
        let off: (() => void) | undefined;
        let dom: HTMLElement | null = null;
        const handlePaste = () => {
            pastingRef.current = true;
            window.setTimeout(() => {
                pastingRef.current = false;
            }, 800);
        };
        const handleTx = ({ transaction }: { transaction: { getMeta: (key: string) => unknown } }) => {
            if (isApplyingRef.current || pastingRef.current) return;
            if (transaction.getMeta('pageBreakReflow')) return;
            if (reflowTimerRef.current) {
                window.clearTimeout(reflowTimerRef.current);
            }
            reflowTimerRef.current = window.setTimeout(() => {
                reflowScheduledRef.current = false;
                reflowPages();
            }, 350);
        };
        const t = window.setTimeout(() => {
            try {
                const view = editor.view;
                dom = view?.dom ?? null;
                if (!dom) return;
                dom.addEventListener('paste', handlePaste);
                off = (editor.on('transaction', handleTx) as unknown) as () => void;
            } catch {
                // view not mounted yet (e.g. Strict Mode or unmounted)
            }
        }, 0);
        return () => {
            window.clearTimeout(t);
            try {
                if (dom) dom.removeEventListener('paste', handlePaste);
            } catch {}
            if (reflowTimerRef.current) {
                window.clearTimeout(reflowTimerRef.current);
                reflowTimerRef.current = null;
            }
            if (off && typeof off === 'function') off();
        };
    }, [editor, reflowPages]);

    const startDrag = (e: React.PointerEvent) => {
        if (!editor || !selectedImagePos) return;
        e.preventDefault();
        try {
            const node = editor.state.doc.nodeAt(selectedImagePos);
            let currentPx = 300;
            const widthAttr = node?.attrs?.width || '';
            const pxMatch = (widthAttr || '').toString().match(/(\d+)px/);
            if (pxMatch) currentPx = parseInt(pxMatch[1], 10);
            draggingRef.current = { startX: e.clientX, startWidth: currentPx };
            window.addEventListener('pointermove', (window as any).__tiptap_image_pointermove__);
        } catch (err) {}
        // Attach listeners
        const onPointerMove = (ev: PointerEvent) => {
            if (!draggingRef.current) return;
            const deltaX = ev.clientX - draggingRef.current.startX;
            const newWidth = Math.max(50, draggingRef.current.startWidth + deltaX);
            editor.chain().focus().updateAttributes('image', { width: `${newWidth}px`, style: `width:${newWidth}px` }).run();
            try {
                const dom = editor.view.nodeDOM(selectedImagePos) as HTMLElement | null;
                if (dom) setHandleRect(dom.getBoundingClientRect());
            } catch (err) {}
        };
        const onPointerUp = () => {
            draggingRef.current = null;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const insertHorizontalRule = useCallback(() => {
        editor?.chain().focus().setHorizontalRule().run();
    }, [editor]);

    const insertPageBreak = useCallback(() => {
        if (!editor) return;
        editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
    }, [editor]);

    const insertTable = useCallback(() => {
        editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }, [editor]);

    // Comandos de tabela (ativos apenas com cursor dentro da tabela)
    const addRowBefore = useCallback(() => editor?.chain().focus().addRowBefore().run(), [editor]);
    const addRowAfter = useCallback(() => editor?.chain().focus().addRowAfter().run(), [editor]);
    const deleteRow = useCallback(() => editor?.chain().focus().deleteRow().run(), [editor]);
    const addColumnBefore = useCallback(() => editor?.chain().focus().addColumnBefore().run(), [editor]);
    const addColumnAfter = useCallback(() => editor?.chain().focus().addColumnAfter().run(), [editor]);
    const deleteColumn = useCallback(() => editor?.chain().focus().deleteColumn().run(), [editor]);

    const setColor = useCallback((color: string) => {
        if (!editor) return;
        const textStyle = editor.state.schema.marks.textStyle;
        const current = editor.state.selection.$from.marks().find(m => m.type === textStyle)?.attrs ?? {};
        editor.chain().focus().setColor(color).run();
    }, [editor]);

    const undo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
    const redo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);

    // Transformações de texto
    const transformText = useCallback((type: 'uppercase' | 'lowercase' | 'capitalize' | 'sentence' | 'toggle') => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to);
        
        if (!selectedText) return;

        let transformedText = '';
        
        switch (type) {
            case 'uppercase':
                transformedText = selectedText.toUpperCase();
                break;
            case 'lowercase':
                transformedText = selectedText.toLowerCase();
                break;
            case 'capitalize':
                transformedText = selectedText.replace(/\b\w/g, l => l.toUpperCase());
                break;
            case 'sentence':
                transformedText = selectedText.charAt(0).toUpperCase() + selectedText.slice(1).toLowerCase();
                break;
            case 'toggle':
                // Alternar entre maiúscula e minúscula
                transformedText = selectedText === selectedText.toUpperCase() 
                    ? selectedText.toLowerCase() 
                    : selectedText.toUpperCase();
                break;
        }

        editor.chain().focus().deleteSelection().insertContent(transformedText).run();
    }, [editor]);

    // Classificação alfabética/numérica
    const sortSelection = useCallback((type: 'alphabetic' | 'numeric') => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to);
        
        if (!selectedText) return;

        const lines = selectedText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) return;

        let sortedLines: string[];
        
        if (type === 'alphabetic') {
            sortedLines = lines.sort((a, b) => a.localeCompare(b, 'pt-BR'));
        } else {
            sortedLines = lines.sort((a, b) => {
                const numA = parseFloat(a.replace(/[^\d.-]/g, ''));
                const numB = parseFloat(b.replace(/[^\d.-]/g, ''));
                return numA - numB;
            });
        }

        const sortedText = sortedLines.join('\n');
        editor.chain().focus().deleteSelection().insertContent(sortedText).run();
    }, [editor]);

    // Estados dos botões (table = ativo quando cursor está dentro de tabela)
    const isActive = useMemo(() => {
        if (!editor) return {};
        return {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            table: editor.isActive('table'),
            alignLeft: editor.isActive({ textAlign: 'left' }),
            alignCenter: editor.isActive({ textAlign: 'center' }),
            alignRight: editor.isActive({ textAlign: 'right' }),
            alignJustify: editor.isActive({ textAlign: 'justify' }),
        };
    }, [editor?.state]);

    if (!editor) {
        return <div>Carregando editor...</div>;
    }

    // Refs e estado para simulação de páginas A4
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const viewportRef = React.useRef<HTMLDivElement | null>(null);
    const [pagesCount, setPagesCount] = React.useState(1);

    const GAP_PX = 6; // gap entre páginas (visual limpo)

    React.useEffect(() => {
        const el = contentRef.current || document.querySelector('.technical-editor-content') as HTMLElement | null;
        if (!el) return;

        const compute = () => {
            const h = el.scrollHeight || el.offsetHeight || el.clientHeight;
            const estimated = Math.min(MAX_PAGES, Math.max(1, Math.ceil(h / PAGE_HEIGHT_PX)));
            setPagesCount(estimated);
            if (viewportRef.current) {
                viewportRef.current.style.setProperty('--page-h', `${PAGE_HEIGHT_PX}px`);
                viewportRef.current.style.setProperty('--gap-px', `${GAP_PX}px`);
                const total = estimated * PAGE_HEIGHT_PX + (estimated - 1) * GAP_PX;
                viewportRef.current.style.setProperty('--total-h', `${total}px`);
            }
        };

        compute();
        const ro = new ResizeObserver(() => {
            compute();
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [editor, PAGE_HEIGHT_PX]);

    return (
        <div
            className={`technical-editor-container${!showPagePreview ? ' technical-editor-container-simple' : ''}`}
            style={!showPagePreview ? { height: `${height}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : undefined}
        >
            {/* Toolbar */}
            <div className="technical-editor-toolbar">
                {/* Grupo: Formatação básica */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        onClick={toggleBold}
                        className={`toolbar-btn ${isActive.bold ? 'active' : ''}`}
                        title="Negrito (Ctrl+B)"
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={toggleItalic}
                        className={`toolbar-btn ${isActive.italic ? 'active' : ''}`}
                        title="Itálico (Ctrl+I)"
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={toggleUnderline}
                        className={`toolbar-btn ${isActive.underline ? 'active' : ''}`}
                        title="Sublinhado (Ctrl+U)"
                    >
                        <Underline size={16} />
                    </button>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Tamanho da fonte */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        onClick={decreaseFontSize}
                        className="toolbar-btn"
                        title="Diminuir fonte"
                    >
                        <TypeOutline size={16} style={{ transform: 'scale(0.85)' }} />
                    </button>
                    <button
                        type="button"
                        onClick={increaseFontSize}
                        className="toolbar-btn"
                        title="Aumentar fonte"
                    >
                        <TypeOutline size={18} />
                    </button>
                    <select
                        value={getCurrentFontSize()}
                        onChange={(e) => setFontSize(e.target.value)}
                        className="toolbar-select"
                        title="Tamanho da fonte"
                    >
                        {FONT_SIZES.map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Cor do texto (@tiptap/extension-color + text-style) */}
                <div className="toolbar-group">
                    <div className="dropdown">
                        <button
                            type="button"
                            className="toolbar-btn dropdown-toggle"
                            title="Cor do texto"
                        >
                            <Palette size={16} />
                        </button>
                        <div className="dropdown-menu dropdown-menu-colors">
                            <div className="color-presets">
                                {['#000000', '#374151', '#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map((hex) => (
                                    <button
                                        key={hex}
                                        type="button"
                                        className="color-swatch"
                                        style={{ backgroundColor: hex }}
                                        title={hex}
                                        onClick={() => setColor(hex)}
                                    />
                                ))}
                            </div>
                            <label className="color-input-label">
                                <span>Personalizado:</span>
                                <input
                                    type="color"
                                    className="toolbar-color-input"
                                    defaultValue="#000000"
                                    onChange={(e) => setColor(e.target.value)}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Listas */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        onClick={toggleBulletList}
                        className={`toolbar-btn ${isActive.bulletList ? 'active' : ''}`}
                        title="Lista com marcadores"
                    >
                        <List size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={toggleOrderedList}
                        className={`toolbar-btn ${isActive.orderedList ? 'active' : ''}`}
                        title="Lista numerada"
                    >
                        <ListOrdered size={16} />
                    </button>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Alinhamento */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        onClick={() => setTextAlign('left')}
                        className={`toolbar-btn ${isActive.alignLeft ? 'active' : ''}`}
                        title="Alinhar à esquerda"
                    >
                        <AlignLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setTextAlign('center')}
                        className={`toolbar-btn ${isActive.alignCenter ? 'active' : ''}`}
                        title="Centralizar"
                    >
                        <AlignCenter size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setTextAlign('right')}
                        className={`toolbar-btn ${isActive.alignRight ? 'active' : ''}`}
                        title="Alinhar à direita"
                    >
                        <AlignRight size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setTextAlign('justify')}
                        className={`toolbar-btn ${isActive.alignJustify ? 'active' : ''}`}
                        title="Justificar"
                    >
                        <AlignJustify size={16} />
                    </button>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Recuo */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        onClick={outdent}
                        className="toolbar-btn"
                        title="Diminuir recuo"
                    >
                        <Outdent size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={indent}
                        className="toolbar-btn"
                        title="Aumentar recuo"
                    >
                        <Indent size={16} />
                    </button>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Inserir */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="toolbar-btn"
                        title="Inserir imagem (upload)"
                    >
                        <ImageIcon size={16} />
                    </button>
                    {/* Hidden file input for image upload */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onSelectFile(file);
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="toolbar-btn"
                        title="Upload de imagem"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => adjustImageSize(-50)}
                        className="toolbar-btn"
                        title="Diminuir imagem"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 12H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => adjustImageSize(50)}
                        className="toolbar-btn"
                        title="Aumentar imagem"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 4v16M4 12h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                        type="button"
                        onClick={insertTable}
                        className="toolbar-btn"
                        title="Inserir tabela (3x3)"
                    >
                        <TableIcon size={16} />
                    </button>
                    {isActive.table && (
                        <>
                            <div className="toolbar-separator" />
                            <button type="button" onClick={addRowBefore} className="toolbar-btn" title="Adicionar linha acima">
                                <Rows3 size={16} /><Plus size={12} style={{ marginLeft: 2 }} />
                            </button>
                            <button type="button" onClick={addRowAfter} className="toolbar-btn" title="Adicionar linha abaixo">
                                <Plus size={12} style={{ marginRight: 2 }} /><Rows3 size={16} />
                            </button>
                            <button type="button" onClick={deleteRow} className="toolbar-btn" title="Excluir linha">
                                <Trash2 size={16} />
                            </button>
                            <div className="toolbar-separator" />
                            <button type="button" onClick={addColumnBefore} className="toolbar-btn" title="Adicionar coluna antes">
                                <Columns3 size={16} /><Plus size={12} style={{ marginLeft: 2 }} />
                            </button>
                            <button type="button" onClick={addColumnAfter} className="toolbar-btn" title="Adicionar coluna depois">
                                <Plus size={12} style={{ marginRight: 2 }} /><Columns3 size={16} />
                            </button>
                            <button type="button" onClick={deleteColumn} className="toolbar-btn" title="Excluir coluna">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={insertHorizontalRule}
                        className="toolbar-btn"
                        title="Inserir linha horizontal"
                    >
                        <Minus size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={insertPageBreak}
                        className="toolbar-btn"
                        title="Inserir quebra de página"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 3v18h14V3H5zm2 6h10M7 13h10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Transformação de texto */}
                <div className="toolbar-group">
                    <div className="dropdown">
                        <button
                            type="button"
                            className="toolbar-btn dropdown-toggle"
                            title="Transformar texto"
                        >
                            <Type size={16} />
                        </button>
                        <div className="dropdown-menu">
                            <button
                                type="button"
                                onClick={() => transformText('sentence')}
                                className="dropdown-item"
                            >
                                Caso de sentença
                            </button>
                            <button
                                type="button"
                                onClick={() => transformText('lowercase')}
                                className="dropdown-item"
                            >
                                minúsculas
                            </button>
                            <button
                                type="button"
                                onClick={() => transformText('uppercase')}
                                className="dropdown-item"
                            >
                                MAIÚSCULAS
                            </button>
                            <button
                                type="button"
                                onClick={() => transformText('capitalize')}
                                className="dropdown-item"
                            >
                                Capitalizar Cada Palavra
                            </button>
                            <button
                                type="button"
                                onClick={() => transformText('toggle')}
                                className="dropdown-item"
                            >
                                tOGGLE cASE
                            </button>
                        </div>
                    </div>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Classificação */}
                <div className="toolbar-group">
                    <div className="dropdown">
                        <button
                            type="button"
                            className="toolbar-btn dropdown-toggle"
                            title="Classificar seleção"
                        >
                            <ArrowUpDown size={16} />
                        </button>
                        <div className="dropdown-menu">
                            <button
                                type="button"
                                onClick={() => sortSelection('alphabetic')}
                                className="dropdown-item"
                            >
                                Ordem Alfabética
                            </button>
                            <button
                                type="button"
                                onClick={() => sortSelection('numeric')}
                                className="dropdown-item"
                            >
                                Ordem Numérica
                            </button>
                        </div>
                    </div>
                </div>

                <div className="toolbar-separator" />

                {/* Grupo: Histórico */}
                <div className="toolbar-group">
                    <button
                        type="button"
                        onClick={undo}
                        className="toolbar-btn"
                        title="Desfazer (Ctrl+Z)"
                        disabled={!editor.can().undo()}
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={redo}
                        className="toolbar-btn"
                        title="Refazer (Ctrl+Y)"
                        disabled={!editor.can().redo()}
                    >
                        <Redo size={16} />
                    </button>
                </div>
            </div>

            {/* Editor: com ou sem simulação de folhas A4 (orçamento usa showPagePreview=false para editor contínuo) */}
            <div className={`technical-editor-wrapper${!showPagePreview ? ' technical-editor-wrapper-simple' : ''}`}>
                {showPagePreview ? (
                    <div className="editor-viewport" ref={viewportRef}>
                        <div className="a4-simulation" style={{ position: 'relative' }}>
                            {/* Pilha de páginas A4 (só folhas brancas com sombra) */}
                            {Array.from({ length: pagesCount }).map((_, i) => (
                                <div
                                    key={`bg-${i}`}
                                    className="a4-page-bg"
                                    style={{
                                        width: '210mm',
                                        height: `${PAGE_HEIGHT_PX}px`,
                                        marginBottom: '0',
                                        boxSizing: 'border-box'
                                    }}
                                    aria-hidden="true"
                                />
                            ))}

                            {/* Conteúdo do editor sobre as páginas; altura exata = páginas */}
                            <div
                                ref={contentRef}
                                className="a4-content-overlay"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '210mm',
                                    minHeight: `${pagesCount * PAGE_HEIGHT_PX + (pagesCount - 1) * GAP_PX}px`,
                                    zIndex: 2,
                                }}
                            >
                                <EditorContent editor={editor} />
                            </div>
                            {/* Image resize handle (rendered relative to viewport) */}
                            {handleRect && viewportRef.current && (
                                (() => {
                                    const vpRect = viewportRef.current.getBoundingClientRect();
                                    const top = handleRect.top - vpRect.top + viewportRef.current.scrollTop;
                                    const left = handleRect.right - vpRect.left + 6; // place handle to right of image
                                    return (
                                        <div
                                            onPointerDown={startDrag}
                                            style={{
                                                position: 'absolute',
                                                top: `${top}px`,
                                                left: `${left}px`,
                                                width: '12px',
                                                height: '24px',
                                                background: '#fff',
                                                border: '2px solid #6b7280',
                                                borderRadius: '3px',
                                                cursor: 'ew-resize',
                                                zIndex: 9999,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                            }}
                                            title="Arraste para redimensionar"
                                        >
                                            <div style={{ width: '6px', height: '2px', background: '#6b7280' }} />
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="technical-editor-document-simple">
                        <EditorContent editor={editor} />
                    </div>
                )}
            </div>

            {/* Estilos CSS */}
            <style>{`
                .technical-editor-container {
                    border: 2px solid #e5e7eb;
                    border-radius: 0.75rem;
                    overflow: hidden;
                    background: #f3f4f6;
                    transition: all 0.3s;
                }

                .technical-editor-container:focus-within {
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }

                /* Modo editor contínuo estilo Word: fundo cinza, área centralizada branca; toolbar fixa e área de texto com scroll */
                .technical-editor-container-simple {
                    background: #e5e7eb;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                }
                .technical-editor-container-simple .technical-editor-toolbar {
                    flex-shrink: 0;
                }
                .technical-editor-container-simple:focus-within {
                    border-color: #9ca3af;
                    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
                }
                .technical-editor-wrapper-simple {
                    background: #e5e7eb;
                    padding: 1.5rem;
                    min-height: 0;
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    overflow-y: auto;
                    overflow-x: hidden;
                }
                .technical-editor-document-simple {
                    width: 100%;
                    max-width: 210mm;
                    min-height: 180px;
                    margin: 0 auto;
                    background: #fff;
                    border-radius: 2px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                    padding: 3px 2rem 1.5rem 2rem;
                    box-sizing: border-box;
                }
                .technical-editor-document-simple .ProseMirror {
                    outline: none;
                    min-height: 140px;
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                    font-size: 11pt;
                    line-height: 1.6;
                    color: #1f2937;
                    box-sizing: border-box;
                }
                .technical-editor-document-simple .ProseMirror p {
                    margin: 0 0 0.5em 0;
                }
                .technical-editor-document-simple .ProseMirror p.is-editor-empty:first-child::before {
                    color: #9ca3af;
                    content: attr(data-placeholder);
                }
                .technical-editor-document-simple .ProseMirror h1,
                .technical-editor-document-simple .ProseMirror h2,
                .technical-editor-document-simple .ProseMirror h3,
                .technical-editor-document-simple .ProseMirror h4,
                .technical-editor-document-simple .ProseMirror h5,
                .technical-editor-document-simple .ProseMirror h6 {
                    margin: 1em 0 0.35em 0;
                    font-weight: 600;
                }
                .technical-editor-document-simple .ProseMirror ul,
                .technical-editor-document-simple .ProseMirror ol {
                    margin: 0.5em 0;
                    padding-left: 1.5rem;
                }
                .technical-editor-document-simple .ProseMirror li {
                    margin: 0.2em 0;
                }
                .technical-editor-document-simple .ProseMirror table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 0.75em 0;
                    border: 1px solid #e5e7eb;
                }
                .technical-editor-document-simple .ProseMirror table td,
                .technical-editor-document-simple .ProseMirror table th {
                    border: 1px solid #e5e7eb;
                    padding: 0.4rem 0.6rem;
                }
                .technical-editor-document-simple .ProseMirror table th {
                    background: #f9fafb;
                    font-weight: 600;
                }
                .technical-editor-document-simple .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.25rem;
                }

                /* Wrapper da imagem com botões − | + em cima de cada imagem */
                .technical-editor-image-wrapper {
                    display: inline-block;
                    position: relative;
                    vertical-align: middle;
                    margin: 0.25rem 0;
                }
                .technical-editor-image-wrapper .image-resize-controls {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 5;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    padding: 2px 4px;
                    background: rgba(0, 0, 0, 0.65);
                    border-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .technical-editor-image-wrapper .image-resize-controls button {
                    width: 24px;
                    height: 22px;
                    border: none;
                    background: rgba(255, 255, 255, 0.9);
                    color: #374151;
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1;
                    cursor: pointer;
                    border-radius: 3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                }
                .technical-editor-image-wrapper .image-resize-controls button:hover {
                    background: #fff;
                    color: #111;
                }
                .technical-editor-image-wrapper .image-resize-controls .image-resize-sep {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 12px;
                    user-select: none;
                }
                .technical-editor-image-wrapper .technical-editor-image {
                    display: block;
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.375rem;
                }

                .technical-editor-toolbar {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    background: linear-gradient(to right, #f9fafb, #f3f4f6);
                    border-bottom: 1px solid #e5e7eb;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .toolbar-group {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .toolbar-separator {
                    width: 1px;
                    height: 24px;
                    background: #d1d5db;
                    margin: 0 0.25rem;
                }

                .toolbar-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: transparent;
                    border-radius: 0.375rem;
                    color: #4b5563;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .toolbar-btn:hover {
                    background: #e5e7eb;
                    color: #1f2937;
                }

                .toolbar-btn.active {
                    background: #8b5cf6;
                    color: white;
                }

                .toolbar-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .toolbar-select {
                    height: 32px;
                    padding: 0 0.5rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    background: white;
                    color: #4b5563;
                    font-size: 0.8125rem;
                    cursor: pointer;
                    min-width: 4rem;
                }

                .toolbar-select:hover {
                    border-color: #d1d5db;
                }

                .dropdown {
                    position: relative;
                }

                .dropdown-toggle::after {
                    content: '';
                    width: 0;
                    height: 0;
                    border-left: 3px solid transparent;
                    border-right: 3px solid transparent;
                    border-top: 3px solid currentColor;
                    margin-left: 4px;
                }

                .dropdown-menu {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    z-index: 1000;
                    min-width: 180px;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    padding: 0.25rem 0;
                }

                .dropdown:hover .dropdown-menu {
                    display: block;
                }

                .dropdown-item {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: none;
                    background: transparent;
                    text-align: left;
                    color: #374151;
                    cursor: pointer;
                    font-size: 0.875rem;
                }

                .dropdown-item:hover {
                    background: #f3f4f6;
                    color: #1f2937;
                }

                .dropdown-menu-colors {
                    padding: 0.5rem;
                    min-width: 200px;
                }
                .color-presets {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-bottom: 0.5rem;
                }
                .color-swatch {
                    width: 24px;
                    height: 24px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    cursor: pointer;
                    padding: 0;
                }
                .color-swatch:hover {
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
                }
                .color-input-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: #6b7280;
                }
                .toolbar-color-input {
                    width: 32px;
                    height: 24px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    cursor: pointer;
                    padding: 0;
                }

                .technical-editor-wrapper {
                    position: relative;
                    background: #f3f4f6;
                }

                /* Viewport: scroll suave; padding direito afasta scrollbar da folha branca */
                .editor-viewport {
                    background: #f3f4f6;
                    padding: 1.5rem 2rem 1.5rem 1.5rem;
                    overflow-y: auto;
                    overflow-x: hidden;
                    height: calc(100vh - 200px);
                    max-width: calc(210mm + 3rem);
                    margin: 0 auto;
                    box-sizing: border-box;
                    scroll-behavior: smooth;
                }

                .a4-simulation {
                    position: relative;
                    width: 210mm;
                    margin: 0 auto;
                    padding: 0;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                /* Páginas A4: folhas brancas com sombra; gap 6px entre páginas */
                .a4-page-bg {
                    width: 210mm;
                    background: white;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                    margin: 0 auto;
                    box-sizing: border-box;
                    flex-shrink: 0;
                }

                .a4-content-overlay {
                    background: transparent;
                    margin: 0 auto;
                    box-sizing: border-box;
                }

                /* Page break: sem linha tracejada; 6px de espaço entre folhas */
                .page-break {
                    display: block;
                    height: 6px;
                    min-height: 6px;
                    margin: 0;
                    padding: 0;
                    border: none !important;
                    background: transparent;
                    page-break-after: always;
                    break-after: page;
                }

                .a4-page {
                    position: relative;
                    width: 210mm;
                    min-height: 297mm;
                    background: white;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    margin: 0 auto;
                    padding: ${EDITOR_MARGIN_TOP_PX}px ${EDITOR_MARGIN_LR_PX}px ${EDITOR_MARGIN_BOTTOM_PX}px ${EDITOR_MARGIN_LR_PX}px;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    box-sizing: border-box;
                }

                .a4-page .page-break {
                    position: absolute;
                    left: ${EDITOR_MARGIN_LR_PX}px;
                    width: calc(100% - ${EDITOR_MARGIN_LR_PX * 2}px);
                    bottom: ${EDITOR_MARGIN_BOTTOM_PX}px;
                    z-index: 5;
                }

                .technical-editor-content {
                    width: 100%;
                    max-width: 210mm;
                    padding: ${EDITOR_MARGIN_TOP_PX}px 0 ${EDITOR_MARGIN_BOTTOM_PX}px 0;
                    margin: 0;
                    background: transparent !important;
                    outline: none;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    box-sizing: border-box;
                }
                .editor-viewport .a4-content-overlay .technical-editor-content {
                    min-height: 0;
                    padding: ${EDITOR_MARGIN_TOP_PX}px ${EDITOR_MARGIN_LR_PX}px ${EDITOR_MARGIN_BOTTOM_PX}px ${EDITOR_MARGIN_LR_PX}px !important;
                }

                .technical-editor-content .ProseMirror {
                    padding: 0;
                    box-sizing: border-box;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }

                .technical-editor-content p {
                    margin: 0 0 8pt 0;
                    line-height: 1.5;
                }

                /* Indentation support: prefer inline margin-left set by extension.
                   Provide fallback classes mapping for visual consistency (20px steps). */
                .ProseMirror [style*="margin-left"] {
                    /* browser will apply inline margin-left set by the indent extension */
                }
                .ProseMirror .indent-level-1 { margin-left: 20px; }
                .ProseMirror .indent-level-2 { margin-left: 40px; }
                .ProseMirror .indent-level-3 { margin-left: 60px; }

                /* Bullets/números visíveis no editor (fidelidade 1:1 com PDF) */
                .ProseMirror ul { list-style-type: disc !important; padding-left: 1.5rem !important; }
                .ProseMirror ol { list-style-type: decimal !important; padding-left: 1.5rem !important; }
                .ProseMirror li { display: list-item !important; }

                .technical-editor-content h1,
                .technical-editor-content h2,
                .technical-editor-content h3,
                .technical-editor-content h4,
                .technical-editor-content h5,
                .technical-editor-content h6 {
                    margin: 1.5rem 0 0.75rem 0;
                    font-weight: 600;
                }

                .technical-editor-content ul,
                .technical-editor-content ol {
                    margin: 1rem 0;
                    padding-left: 1.5rem;
                }

                .technical-editor-content li {
                    margin: 0.25rem 0;
                    display: list-item;
                }

                .technical-editor-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1rem 0;
                    border: 1px solid #d1d5db;
                }

                .technical-editor-content table td,
                .technical-editor-content table th {
                    border: 1px solid #d1d5db;
                    padding: 0.5rem;
                    text-align: left;
                }

                .technical-editor-content table th {
                    background: #f9fafb;
                    font-weight: 600;
                }

                .technical-editor-image {
                    display: inline-block;
                    margin: 5px;
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.375rem;
                    /* Allow manual CSS resize as fallback for missing community extension */
                    resize: both;
                    overflow: auto;
                }

                .technical-editor-hr {
                    border: none;
                    border-top: 2px solid #e5e7eb;
                    margin: 2rem 0;
                }

                /* Dark mode */
                .dark .technical-editor-container {
                    background: #1f2937;
                    border-color: #374151;
                }
                .dark .technical-editor-container-simple {
                    background: #374151;
                    border-color: #4b5563;
                }
                .dark .technical-editor-wrapper-simple {
                    background: #374151;
                }
                .dark .technical-editor-document-simple {
                    background: #1f2937;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }
                .dark .technical-editor-document-simple .ProseMirror {
                    color: #e5e7eb;
                }
                .dark .technical-editor-document-simple .ProseMirror p.is-editor-empty:first-child::before {
                    color: #6b7280;
                }
                .dark .technical-editor-document-simple .ProseMirror table th {
                    background: #374151;
                    border-color: #4b5563;
                }
                .dark .technical-editor-document-simple .ProseMirror table td,
                .dark .technical-editor-document-simple .ProseMirror table th {
                    border-color: #4b5563;
                }

                .dark .technical-editor-toolbar {
                    background: linear-gradient(to right, #1f2937, #111827);
                    border-bottom-color: #374151;
                }

                .dark .toolbar-btn {
                    color: #d1d5db;
                }

                .dark .toolbar-btn:hover {
                    background: #374151;
                    color: #f9fafb;
                }

                .dark .toolbar-separator {
                    background: #4b5563;
                }

                .dark .dropdown-menu {
                    background: #1f2937;
                    border-color: #374151;
                }

                .dark .dropdown-item {
                    color: #d1d5db;
                }

                .dark .dropdown-item:hover {
                    background: #374151;
                    color: #f9fafb;
                }

                /* Tema escuro: área de conteúdo como folha branca para texto sempre visível */
                .dark .technical-editor-content {
                    background: #ffffff !important;
                    color: #1f2937 !important;
                }
                .dark .technical-editor-content .ProseMirror {
                    background: #ffffff !important;
                    color: #1f2937 !important;
                }
                .dark .technical-editor-content .ProseMirror p,
                .dark .technical-editor-content .ProseMirror li,
                .dark .technical-editor-content .ProseMirror td,
                .dark .technical-editor-content .ProseMirror th {
                    color: #1f2937 !important;
                }
                .dark .technical-editor-content .ProseMirror h1,
                .dark .technical-editor-content .ProseMirror h2,
                .dark .technical-editor-content .ProseMirror h3,
                .dark .technical-editor-content .ProseMirror h4,
                .dark .technical-editor-content .ProseMirror h5,
                .dark .technical-editor-content .ProseMirror h6 {
                    color: #1f2937 !important;
                }
                .dark .technical-editor-content .ProseMirror p.is-editor-empty:first-child::before {
                    color: #9ca3af !important;
                }

                .dark .page-preview-container {
                    background: #111827;
                }

                .dark .technical-editor-content table th {
                    background: #f3f4f6 !important;
                    color: #1f2937 !important;
                }

                .dark .technical-editor-content table td,
                .dark .technical-editor-content table th {
                    border-color: #d1d5db;
                    color: #1f2937 !important;
                }

                .dark .technical-editor-hr {
                    border-top-color: #4b5563;
                }

                /* Responsivo */
                @media (max-width: 768px) {
                    .technical-editor-toolbar {
                        padding: 0.5rem;
                    }

                    .toolbar-btn {
                        width: 28px;
                        height: 28px;
                    }

                    .technical-editor-wrapper-simple {
                        padding: 1rem;
                    }
                    .technical-editor-document-simple {
                        padding: 3px 1.25rem 1rem 1.25rem;
                    }

                    .a4-page {
                        width: 100%;
                        padding: 1rem;
                        margin: 0;
                        box-shadow: none;
                    }

                    .page-preview-container {
                        padding: 1rem;
                    }
                }
                @media (max-width: 480px) {
                    .technical-editor-document-simple {
                        padding: 3px 1rem 0.75rem 1rem;
                    }
                }

                /* Print styles */
                @media print {
                    .technical-editor-toolbar {
                        display: none;
                    }

                    .technical-editor-container {
                        border: none;
                        border-radius: 0;
                    }

                    .page-preview-container {
                        background: white;
                        padding: 0;
                    }

                    .a4-page {
                        box-shadow: none;
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default TechnicalEditor;