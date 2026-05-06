import { generateHTML, generateJSON } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Image } from '@tiptap/extension-image';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { TextStyle } from '@tiptap/extension-text-style';

// Mesmas extensões usadas no TechnicalEditor
const extensions = [
    StarterKit.configure({
        history: false,
    }),
    Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
    }),
    Placeholder,
    Image.configure({
        HTMLAttributes: {
            class: 'technical-editor-image',
        },
    }),
    HorizontalRule.configure({
        HTMLAttributes: {
            class: 'technical-editor-hr',
        },
    }),
    TextStyle,
];

/**
 * Converte JSON do TipTap para HTML limpo
 */
export const tipTapJsonToHtml = (json: any): string => {
    try {
        if (!json) return '';
        
        // Se já é uma string HTML, retorna como está
        if (typeof json === 'string') {
            return json;
        }

        // Se é um objeto JSON do TipTap, converte para HTML
        return generateHTML(json, extensions);
    } catch (error) {
        console.error('Erro ao converter JSON do TipTap para HTML:', error);
        return '';
    }
};

/**
 * Converte HTML para JSON do TipTap
 */
export const htmlToTipTapJson = (html: string): any => {
    try {
        if (!html) return null;
        
        return generateJSON(html, extensions);
    } catch (error) {
        console.error('Erro ao converter HTML para JSON do TipTap:', error);
        return null;
    }
};

/**
 * Verifica se o conteúdo é JSON do TipTap ou HTML
 */
export const isTipTapJson = (content: any): boolean => {
    if (!content) return false;
    
    // Se é string, não é JSON do TipTap
    if (typeof content === 'string') return false;
    
    // Se é objeto e tem as propriedades do TipTap
    if (typeof content === 'object' && content.type && content.content) {
        return true;
    }
    
    return false;
};

/**
 * Converte conteúdo para HTML, independente do formato de entrada
 */
export const ensureHtml = (content: any): string => {
    if (!content) return '';
    
    if (typeof content === 'string') {
        return content;
    }
    
    if (isTipTapJson(content)) {
        return tipTapJsonToHtml(content);
    }
    
    return '';
};

/**
 * Converte conteúdo para JSON do TipTap, independente do formato de entrada
 */
export const ensureTipTapJson = (content: any): any => {
    if (!content) return null;
    
    if (typeof content === 'string') {
        return htmlToTipTapJson(content);
    }
    
    if (isTipTapJson(content)) {
        return content;
    }
    
    return null;
};

/**
 * Remove parágrafos dentro de itens de lista (Tiptap gera <li><p>...</p></li>).
 * Preserva atributos do <li> (ex.: style="margin-left: 20px" do botão aumentar recuo).
 * Isso evita que no PDF o bullet/número fique numa linha e o texto na seguinte.
 */
export const normalizeListItemsForPdf = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<li([^>]*)>\s*<p[^>]*>/gi, '<li$1>')
        .replace(/<\/p>\s*<\/li>/gi, '</li>');
};

/**
 * Normaliza "linhas em branco" do TipTap para que o PDF respeite ENTERs extras.
 *
 * Problema comum: TipTap representa ENTER ENTER como parágrafos vazios
 * (`<p></p>` ou `<p><br></p>`). Em renderizadores de PDF/print, parágrafos
 * vazios podem colapsar e virar altura ~0, fazendo o espaçamento desaparecer.
 *
 * Estratégia: converter parágrafos vazios em `<p class="tiptap-empty-paragraph">&nbsp;</p>`,
 * preservando o "1 line-height" mesmo sem texto.
 */
export const normalizeEmptyParagraphsForPdf = (html: string): string => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const paragraphs = Array.from(doc.querySelectorAll('p'));
        for (const p of paragraphs) {
            const inner = (p.innerHTML || '').trim().toLowerCase();
            const text = (p.textContent || '').replace(/\u00a0/g, '').trim();

            // Vazio real: <p></p> ou <p>&nbsp;</p>
            const isEmptyText = text.length === 0;
            // Vazio por quebra: <p><br></p> / <p><br/></p> / <p><br /></p>
            const isOnlyBr = inner === '<br>' || inner === '<br/>' || inner === '<br />' || inner === '<br></br>';

            if (isEmptyText && (inner === '' || isOnlyBr || inner === '&nbsp;')) {
                p.classList.add('tiptap-empty-paragraph');
                // NBSP garante altura consistente na impressão
                p.innerHTML = '&nbsp;';
            }
        }

        return doc.body.innerHTML;
    } catch {
        return html;
    }
};

/**
 * Limpa HTML removendo tags desnecessárias e mantendo apenas o essencial
 */
export const cleanHtmlForPdf = (html: string): string => {
    if (!html) return '';
    
    // Remove comentários HTML
    let cleaned = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove atributos desnecessários, mantendo apenas os essenciais
    cleaned = cleaned.replace(/\s(id|class|style)="[^"]*"/g, (match, attr) => {
        // Manter apenas classes específicas do editor
        if (attr === 'class' && (match.includes('technical-editor') || match.includes('table'))) {
            return match;
        }
        // Manter estilos de alinhamento
        if (attr === 'style' && match.includes('text-align')) {
            return match;
        }
        return '';
    });
    
    // Remove espaços extras
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
};

/**
 * Extrai texto puro do conteúdo (sem HTML)
 */
export const extractPlainText = (content: any): string => {
    const html = ensureHtml(content);
    if (!html) return '';
    
    // Remove tags HTML
    const textOnly = html.replace(/<[^>]*>/g, '');
    
    // Decodifica entidades HTML
    const textarea = document.createElement('textarea');
    textarea.innerHTML = textOnly;
    
    return textarea.value.trim();
};

/**
 * Conta palavras no conteúdo
 */
export const countWords = (content: any): number => {
    const text = extractPlainText(content);
    if (!text) return 0;
    
    return text.split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Conta caracteres no conteúdo
 */
export const countCharacters = (content: any): number => {
    const text = extractPlainText(content);
    return text.length;
};

/**
 * Verifica se o conteúdo está vazio
 */
export const isEmpty = (content: any): boolean => {
    if (!content) return true;
    
    const text = extractPlainText(content);
    return text.length === 0;
};

/**
 * Migra conteúdo do Jodit (HTML) para TipTap (JSON)
 */
export const migrateJoditToTipTap = (joditHtml: string): any => {
    if (!joditHtml) return null;
    
    try {
        // Limpa HTML do Jodit removendo classes específicas
        let cleanedHtml = joditHtml
            .replace(/class="[^"]*jodit[^"]*"/gi, '')
            .replace(/\s+class=""/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Converte para JSON do TipTap
        return htmlToTipTapJson(cleanedHtml);
    } catch (error) {
        console.error('Erro ao migrar conteúdo do Jodit para TipTap:', error);
        return null;
    }
};

/**
 * Formata HTML para impressão com estilos otimizados
 */
export const formatHtmlForPrint = (content: any): string => {
    const html = ensureHtml(content);
    if (!html) return '';
    
    // Adiciona estilos inline para garantir formatação na impressão
    let formatted = html;
    
    // Estilos para tabelas
    formatted = formatted.replace(/<table/g, '<table style="border-collapse: collapse; width: 100%; margin: 1rem 0; border: 1px solid #d1d5db;"');
    formatted = formatted.replace(/<td/g, '<td style="border: 1px solid #d1d5db; padding: 0.5rem; text-align: left;"');
    formatted = formatted.replace(/<th/g, '<th style="border: 1px solid #d1d5db; padding: 0.5rem; background: #f9fafb; font-weight: 600; text-align: left;"');
    
    // Estilos para imagens
    formatted = formatted.replace(/<img/g, '<img style="max-width: 100%; height: auto; margin: 1rem 0;"');
    
    // Estilos para listas
    formatted = formatted.replace(/<ul/g, '<ul style="margin: 1rem 0; padding-left: 2rem;"');
    formatted = formatted.replace(/<ol/g, '<ol style="margin: 1rem 0; padding-left: 2rem;"');
    formatted = formatted.replace(/<li/g, '<li style="margin: 0.25rem 0;"');
    
    // Estilos para parágrafos
    formatted = formatted.replace(/<p(?![^>]*style)/g, '<p style="margin: 0 0 1rem 0; line-height: 1.6;"');
    
    // Estilos para títulos
    formatted = formatted.replace(/<h([1-6])(?![^>]*style)/g, '<h$1 style="margin: 1.5rem 0 0.75rem 0; font-weight: 600;"');
    
    // Estilos para linha horizontal
    formatted = formatted.replace(/<hr/g, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 2rem 0;"');
    
    return formatted;
};

/**
 * Valida se o conteúdo é válido para o TipTap
 */
export const validateTipTapContent = (content: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!content) {
        return { isValid: true, errors: [] }; // Conteúdo vazio é válido
    }
    
    if (typeof content === 'string') {
        // HTML válido
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const parserErrors = doc.querySelector('parsererror');
            if (parserErrors) {
                errors.push('HTML inválido');
            }
        } catch (error) {
            errors.push('Erro ao validar HTML');
        }
    } else if (typeof content === 'object') {
        // JSON do TipTap
        if (!content.type) {
            errors.push('JSON do TipTap deve ter propriedade "type"');
        }
        
        if (content.type === 'doc' && !Array.isArray(content.content)) {
            errors.push('Documento TipTap deve ter array "content"');
        }
    } else {
        errors.push('Conteúdo deve ser string (HTML) ou objeto (JSON do TipTap)');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export default {
    tipTapJsonToHtml,
    htmlToTipTapJson,
    isTipTapJson,
    ensureHtml,
    ensureTipTapJson,
    normalizeListItemsForPdf,
    normalizeEmptyParagraphsForPdf,
    cleanHtmlForPdf,
    extractPlainText,
    countWords,
    countCharacters,
    isEmpty,
    migrateJoditToTipTap,
    formatHtmlForPrint,
    validateTipTapContent,
};