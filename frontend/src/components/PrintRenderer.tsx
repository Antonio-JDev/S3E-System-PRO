import React, { useMemo, useRef, useEffect, useState } from 'react';

interface PrintRendererProps {
  content: string;
  folhaTimbradaUrl?: string;
  opacidade?: number;
  className?: string;
  /** Numeração de páginas integrada com o documento completo (ex.: orçamento). */
  pageNumberStartFrom?: number;
  totalPages?: number;
  /** Callback disparado sempre que o número de páginas internas do PrintRenderer muda. */
  onPagesComputed?: (count: number) => void;
}

// === Mesmas constantes do TechnicalEditor ===
const PX_PER_MM = 3.78;
const PAGE_HEIGHT_PX = Math.round(297 * PX_PER_MM);       // ~1123px
const PAGE_WIDTH_PX = Math.round(210 * PX_PER_MM);        // ~794px

// 90px topo para todas as páginas da descrição técnica (1ª página alinhada às demais)
const PRINT_MARGIN_TOP_PX = 90;
const PRINT_MARGIN_BOTTOM_PX = 100;
const PRINT_MARGIN_LEFT_PX = 20;
const PRINT_MARGIN_RIGHT_PX = 20;

const PRINT_CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - PRINT_MARGIN_TOP_PX - PRINT_MARGIN_BOTTOM_PX;

const PrintRenderer: React.FC<PrintRendererProps> = ({
  content,
  folhaTimbradaUrl,
  opacidade = 0.05,
  className = '',
  pageNumberStartFrom,
  totalPages,
  onPagesComputed,
}) => {
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  }, [content]);

  const selectedTimbreUrl = folhaTimbradaUrl || '';

  const measureOuterHeight = (el: HTMLElement): number => {
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const mt = parseFloat(cs.marginTop || '0') || 0;
    const mb = parseFloat(cs.marginBottom || '0') || 0;
    return rect.height + mt + mb;
  };

  // Medir e dividir conteúdo em páginas
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);

  useEffect(() => {
    if (!sanitizedContent) {
      setPages([]);
      return;
    }

    // Se contém page-break markers, dividimos por eles (aceita div vazio ou com espaço/br)
    const pageBreakRegex = /<div[^>]*class="[^"]*page-break[^"]*"[^>]*>\s*(?:<br\s*\/?>)?\s*<\/div>/gi;
    const fragments = sanitizedContent.split(pageBreakRegex);
    if (fragments.length > 1) {
      const trimmed = fragments.map((f) => f.trim()).filter((f) => f.length > 0);
      setPages(trimmed);
      return;
    }

    // Fallback: flatten em blocos (por .section ou top-level), medir cada bloco e distribuir em páginas A4
    const contentWidth = PAGE_WIDTH_PX - PRINT_MARGIN_LEFT_PX - PRINT_MARGIN_RIGHT_PX;
    const offscreen = document.createElement('div');
    offscreen.style.cssText = `
      position: absolute;
      top: -99999px;
      left: -99999px;
      width: ${contentWidth}px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      box-sizing: border-box;
    `;
    // CSS mínimo para que a medição fique alinhada com o render final (margens importam!)
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      * { box-sizing: border-box; }
      .section { margin: 0; padding: 0; }
      h1,h2,h3,h4,h5,h6 { margin: 0 0 0.35em 0; font-weight: 600; }
      p { margin: 0 0 8pt 0; line-height: 1.5; }
      p.tiptap-empty-paragraph { min-height: 1em; }
      ul,ol { margin: 8px 0 8px 20px; padding-left: 1.5em; }
      li { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      td,th { border: 1px solid #cbd5e1; padding: 6px; }
      hr { margin: 12px 0; }
    `;
    offscreen.appendChild(styleEl);
    offscreen.innerHTML = sanitizedContent;
    document.body.appendChild(offscreen);

    try {
      // Flatten: extrair blocos reais (p, h2, ul, ol, table); divs são achatados para pegar os filhos
      // IMPORTANTE: NÃO incluir LI/TR/THEAD/TBODY como blocos isolados, senão listas/tabelas quebram em HTML inválido e a paginação fica errada.
      const blockTag = /^(P|DIV|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|HR)$/i;
      const getBlockElements = (container: Element): HTMLElement[] => {
        const result: HTMLElement[] = [];
        for (const el of container.children) {
          if (blockTag.test(el.tagName)) {
            // Preservar "seções" como unidade quando possível (título + conteúdo juntos).
            if (el.tagName === 'DIV' && (el as HTMLElement).classList?.contains('section')) {
              result.push(el as HTMLElement);
            } else if (el.tagName === 'DIV' && el.children.length > 0) {
              result.push(...getBlockElements(el));
            } else {
              result.push(el as HTMLElement);
            }
          }
        }
        return result;
      };

      const sections = offscreen.querySelectorAll('.section');
      let blocks: string[] = [];
      if (sections.length > 0) {
        sections.forEach((section) => {
          getBlockElements(section).forEach((el) => blocks.push(el.outerHTML));
        });
      } else {
        getBlockElements(offscreen).forEach((el) => blocks.push(el.outerHTML));
        if (blocks.length === 0) {
          blocks = Array.from(offscreen.children).map((c) => (c as HTMLElement).outerHTML);
        }
      }

      if (blocks.length === 0) {
        setPages([sanitizedContent]);
        return;
      }

      // Medir altura de cada bloco (mesma largura) e distribuir em páginas
      const resultPages: string[] = [];
      let currentPageHTML = '';
      let cumHeight = 0;
      const isPageBreakBlock = (html: string) => /<div[^>]*class="[^"]*page-break[^"]*"[^>]*>\s*<\/div>/i.test(html.trim());

      for (const blockHTML of blocks) {
        if (isPageBreakBlock(blockHTML)) {
          if (currentPageHTML.length > 0) {
            resultPages.push(currentPageHTML);
            currentPageHTML = '';
            cumHeight = 0;
          }
          continue;
        }
        // Reutiliza o mesmo offscreen e mede altura real do bloco (incluindo margens).
        // Importante: offsetHeight não inclui margin, por isso usamos getBoundingClientRect + margins.
        offscreen.innerHTML = '';
        offscreen.appendChild(styleEl);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = blockHTML;
        const node = wrapper.firstElementChild as HTMLElement | null;
        if (!node) continue;
        offscreen.appendChild(node);
        const blockHeight = measureOuterHeight(node);

        if (cumHeight + blockHeight > PRINT_CONTENT_HEIGHT_PX && currentPageHTML.length > 0) {
          resultPages.push(currentPageHTML);
          currentPageHTML = '';
          cumHeight = 0;
        }
        currentPageHTML += blockHTML;
        cumHeight += blockHeight;
      }
      if (currentPageHTML.length > 0) {
        resultPages.push(currentPageHTML);
      }
      setPages(resultPages.length > 0 ? resultPages : [sanitizedContent]);
    } catch (err) {
      setPages([sanitizedContent]);
    } finally {
      document.body.removeChild(offscreen);
    }
  }, [sanitizedContent]);

  // Notificar o container sempre que a contagem de paginas internas mudar (para totalizacao no documento).
  const lastReportedRef = useRef<number>(-1);
  useEffect(() => {
    if (!onPagesComputed) return;
    if (lastReportedRef.current === pages.length) return;
    lastReportedRef.current = pages.length;
    onPagesComputed(pages.length);
  }, [pages.length, onPagesComputed]);

  if (!sanitizedContent) {
    return (
      <div className={`print-renderer-empty ${className}`}>
        <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Nenhum conteúdo para exibir</p>
      </div>
    );
  }

  const timbreStyle: React.CSSProperties = selectedTimbreUrl ? {
    backgroundImage: `url('${selectedTimbreUrl}')`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    WebkitPrintColorAdjust: 'exact',
    // @ts-ignore
    printColorAdjust: 'exact',
  } : {};

  return (
    <div className={`print-renderer ${className}`}>
      <style>{`
        /* ===== Print CSS ===== */
        @media print {
          @page {
            size: A4;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-renderer {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          .printable-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .printable-page p, .printable-page li, .printable-page tr, .printable-page img {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-page ul,
          .printable-page-content ul {
            list-style-type: disc !important;
            list-style-position: inside !important;
            margin-left: 1.5rem !important;
            padding-left: 1em !important;
            display: block !important;
          }
          .printable-page ol,
          .printable-page-content ol {
            list-style-type: decimal !important;
            list-style-position: inside !important;
            margin-left: 1.5rem !important;
            padding-left: 1.5em !important;
            display: block !important;
          }
          .printable-page li,
          .printable-page-content li {
            display: list-item !important;
          }
          .printable-page-content p {
            margin: 0 0 8pt 0 !important;
            line-height: 1.5 !important;
          }
          /* Preservar ENTER ENTER: parágrafo vazio precisa ter altura */
          .printable-page-content p.tiptap-empty-paragraph {
            min-height: 1em !important;
          }
          .printable-page-content p.tiptap-empty-paragraph::before {
            content: "\\00a0" !important;
          }
          .printable-page-content > *:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .printable-page-content .section {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .printable-page-content .section:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .print-renderer .printable-page.technical-first-page .printable-page-content {
            padding-top: 0 !important;
          }
          .printable-page-content h2 {
            margin-top: 0 !important;
          }
          .printable-page table,
          .printable-page-content table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #374151 !important;
          }
          .printable-page td,
          .printable-page th,
          .printable-page-content td,
          .printable-page-content th {
            border: 1px solid #374151 !important;
            padding: 6px 8px !important;
          }
          .page-break {
            display: none !important;
          }
        }

        /* ===== Preview CSS (in-screen) ===== */
        .print-renderer {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 16px 0;
          box-sizing: border-box;
        }
        .printable-page {
          width: 210mm;
          height: 297mm;
          background: white;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* 90px topo, 20px laterais, 100px inferior (todas as páginas) */
        .printable-page-content {
          position: absolute;
          top: ${PRINT_MARGIN_TOP_PX}px !important;
          left: ${PRINT_MARGIN_LEFT_PX}px !important;
          right: ${PRINT_MARGIN_RIGHT_PX}px !important;
          bottom: ${PRINT_MARGIN_BOTTOM_PX}px !important;
          overflow: hidden;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          box-sizing: border-box;
          width: calc(100% - ${PRINT_MARGIN_LEFT_PX + PRINT_MARGIN_RIGHT_PX}px) !important;
          max-width: 100%;
          padding: 0 !important;
          margin: 0 !important;
          justify-content: flex-start !important;
          align-items: flex-start !important;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .printable-page-content > *:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        /* Zerar margens do wrapper .section e do h2 para 1ª página não começar abaixo do topo */
        .printable-page-content .section {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .printable-page-content .section:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .printable-page-content h2 {
          margin-top: 0 !important;
          margin-bottom: 0.35em !important;
        }
        /* Primeira página da descrição técnica: sem margem extra no topo (evita “super margem” ao usar quebra de página) */
        .print-renderer .printable-page.technical-first-page .printable-page-content {
          padding-top: 0 !important;
        }
        .print-renderer .printable-page.technical-first-page .printable-page-content > *:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .printable-page-content p {
          margin: 0 0 8pt 0;
          line-height: 1.5;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        /* Preservar ENTER ENTER no preview/PDF */
        .printable-page-content p.tiptap-empty-paragraph {
          min-height: 1em;
        }
        .printable-page-content p.tiptap-empty-paragraph::before {
          content: "\\00a0";
        }
        .printable-page-content img {
          page-break-inside: avoid;
          break-inside: avoid;
          display: inline-block;
          margin: 5px;
          max-width: 100%;
          height: auto;
        }
        /* Fidelidade 1:1 listas (bullets e números) no PDF – mesmo com recuo/centralização */
        .printable-page ul,
        .printable-page-content ul {
          list-style-type: disc !important;
          list-style-position: inside !important;
          display: block !important;
          margin-left: 1.5rem !important;
          padding-left: 1em !important;
        }
        .printable-page ul[style*="margin-left"],
        .printable-page-content ul[style*="margin-left"] {
          list-style-type: disc !important;
          list-style-position: inside !important;
        }
        .printable-page ol,
        .printable-page-content ol {
          list-style-type: decimal !important;
          list-style-position: inside !important;
          display: block !important;
          margin-left: 1.5rem !important;
          padding-left: 1.5em !important;
        }
        .printable-page ol[style*="margin-left"],
        .printable-page-content ol[style*="margin-left"] {
          list-style-type: decimal !important;
          list-style-position: inside !important;
        }
        .printable-page li,
        .printable-page-content li {
          display: list-item !important;
          margin-bottom: 2px;
        }
        /* Bullet/número e texto na mesma linha (Tiptap gera <li><p>...</p></li>) */
        .printable-page ul li p, .printable-page-content ul li p,
        .printable-page ol li p, .printable-page-content ol li p {
          display: inline !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .printable-page li[style*="margin-left"],
        .printable-page-content li[style*="margin-left"] {
          display: list-item !important;
          list-style: inherit !important;
        }
        .printable-page p[style*='margin-left'],
        .printable-page-content p[style*='margin-left'] {
          display: block !important;
        }
        /* Quebra de página: não ocupa espaço nem gera margem na folha seguinte */
        .printable-page-content .page-break {
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
          height: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
          line-height: 0 !important;
        }
        /* Fidelidade de tabelas no PDF: bordas visíveis, 100% largura */
        .printable-page table,
        .printable-page-content table {
          width: 100% !important;
          border-collapse: collapse !important;
          border: 1px solid #374151 !important;
          table-layout: auto;
        }
        .printable-page td,
        .printable-page th,
        .printable-page-content td,
        .printable-page-content th {
          border: 1px solid #374151 !important;
          padding: 6px 8px !important;
        }
        .printable-page th,
        .printable-page-content th {
          background: #f3f4f6 !important;
          font-weight: 600;
        }

        /* Numeração de páginas centralizada na parte inferior de cada folha A4 */
        .print-renderer .printable-page > .page-number {
          position: absolute;
          bottom: 30.5px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          font-weight: 700;
          color: #000000;
          z-index: 2;
          background: transparent;
          font-family: Arial, Helvetica, sans-serif;
        }
        .dark .print-renderer .printable-page > .page-number {
          color: #000000 !important;
          opacity: 1 !important;
        }

        /* Dark mode: preview do PDF sempre como documento legível (fundo branco, texto opaco) */
        .dark .print-renderer .printable-page {
          background: #fff !important;
        }
        .dark .print-renderer .printable-page *,
        .dark .print-renderer .printable-page-content * {
          color: #1e293b !important;
          opacity: 1 !important;
        }
        .dark .print-renderer .printable-page th,
        .dark .print-renderer .printable-page-content th {
          background: #f3f4f6 !important;
          color: #1e293b !important;
        }
      `}</style>

      {pages.map((pageHTML, idx) => {
        const showPageNumber = totalPages != null && totalPages > 0 && pageNumberStartFrom != null;
        return (
          <div
            key={`page-${idx}`}
            className={`printable-page${idx === 0 ? ' technical-first-page' : ''}`}
            style={timbreStyle}
          >
            <div
              className="printable-page-content"
              dangerouslySetInnerHTML={{ __html: pageHTML }}
            />
            {showPageNumber && (
              <div className="page-number">
                {pageNumberStartFrom! + idx} / {totalPages}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PrintRenderer;
