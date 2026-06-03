import {
  PDF_CONTENT_HEIGHT_PX,
  PDF_CONTENT_WIDTH_PX,
} from './pdfOrcamentoPagination.util';

export type DescriptionPaginationResult = {
  pages: string[];
};

/** Distribui alturas de blocos em páginas (mesma regra do PrintRenderer). */
export function paginateMeasuredBlockHeights(
  blockHeights: number[],
  contentHeightPx: number = PDF_CONTENT_HEIGHT_PX
): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let cumHeight = 0;

  for (let i = 0; i < blockHeights.length; i++) {
    const blockHeight = blockHeights[i] || 0;
    if (cumHeight + blockHeight > contentHeightPx && current.length > 0) {
      pages.push(current);
      current = [];
      cumHeight = 0;
    }
    current.push(i);
    cumHeight += blockHeight;
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

/**
 * Mede blocos HTML (.section > blocos) e distribui em páginas A4 — mesma lógica do PrintRenderer (modal).
 * Retorna array de fragmentos HTML por página.
 */
export function buildMeasureDescriptionPaginationEvalExpression(
  contentHeightPx: number = PDF_CONTENT_HEIGHT_PX,
  contentWidthPx: number = PDF_CONTENT_WIDTH_PX
): string {
  return `(() => {
    var contentHeightPx = ${contentHeightPx};
    var contentWidthPx = ${contentWidthPx};
    var measureOuterHeight = function(el) {
      var rect = el.getBoundingClientRect();
      var cs = window.getComputedStyle(el);
      var mt = parseFloat(cs.marginTop || '0') || 0;
      var mb = parseFloat(cs.marginBottom || '0') || 0;
      return rect.height + mt + mb;
    };
    var blockTag = /^(P|DIV|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|HR)$/i;
    var getBlockElements = function(container) {
      var result = [];
      var children = container.children;
      for (var i = 0; i < children.length; i++) {
        var el = children[i];
        if (!blockTag.test(el.tagName)) continue;
        if (el.tagName === 'DIV' && el.classList && el.classList.contains('section')) {
          result.push(el);
        } else if (el.tagName === 'DIV' && el.children.length > 0) {
          var nested = getBlockElements(el);
          for (var j = 0; j < nested.length; j++) result.push(nested[j]);
        } else {
          result.push(el);
        }
      }
      return result;
    };
    var source = document.querySelector('[data-measure="description-source"]');
    var measureRoot = document.querySelector('[data-measure="description-measure"]');
    if (!source || !measureRoot) return { pages: [] };
    measureRoot.style.width = contentWidthPx + 'px';
    var blocks = [];
    var sections = source.querySelectorAll('.section');
    if (sections.length > 0) {
      for (var s = 0; s < sections.length; s++) {
        var sectionBlocks = getBlockElements(sections[s]);
        for (var b = 0; b < sectionBlocks.length; b++) {
          blocks.push(sectionBlocks[b].outerHTML);
        }
      }
    } else {
      var topBlocks = getBlockElements(source);
      for (var t = 0; t < topBlocks.length; t++) blocks.push(topBlocks[t].outerHTML);
      if (blocks.length === 0 && source.innerHTML.trim()) {
        blocks.push(source.innerHTML);
      }
    }
    if (blocks.length === 0) return { pages: [] };
    var pageBreakRe = /<div[^>]*class="[^"]*page-break[^"]*"[^>]*>\\s*(?:<br\\s*\\/?>)?\\s*<\\/div>/gi;
    var resultPages = [];
    var currentPageHTML = '';
    var cumHeight = 0;
    for (var bi = 0; bi < blocks.length; bi++) {
      var blockHTML = blocks[bi];
      if (pageBreakRe.test(blockHTML.trim())) {
        if (currentPageHTML.length > 0) {
          resultPages.push(currentPageHTML);
          currentPageHTML = '';
          cumHeight = 0;
        }
        continue;
      }
      measureRoot.innerHTML = blockHTML;
      var node = measureRoot.firstElementChild;
      if (!node) continue;
      var blockHeight = measureOuterHeight(node);
      if (cumHeight + blockHeight > contentHeightPx && currentPageHTML.length > 0) {
        resultPages.push(currentPageHTML);
        currentPageHTML = '';
        cumHeight = 0;
      }
      currentPageHTML += blockHTML;
      cumHeight += blockHeight;
    }
    if (currentPageHTML.length > 0) resultPages.push(currentPageHTML);
    return { pages: resultPages };
  })()`;
}
