/** Constantes alinhadas ao OrcamentoPrintable (preview modal). */
export const PDF_PAGE_WIDTH_PX = Math.round(210 * 3.78);
export const PDF_PAGE_HEIGHT_PX = Math.round(297 * 3.78);
export const PDF_MARGIN_TOP_PX = 95;
export const PDF_MARGIN_BOTTOM_PX = 100;
export const PDF_MARGIN_LEFT_PX = 20;
export const PDF_MARGIN_RIGHT_PX = 20;
export const PDF_CONTENT_HEIGHT_PX =
  PDF_PAGE_HEIGHT_PX - PDF_MARGIN_TOP_PX - PDF_MARGIN_BOTTOM_PX;
export const PDF_CONTENT_WIDTH_PX =
  PDF_PAGE_WIDTH_PX - PDF_MARGIN_LEFT_PX - PDF_MARGIN_RIGHT_PX;
export const PDF_RESERVE_PADDING_PX = 16;

export type OrcamentoItemsPagination = {
  pages: number[][];
  totalsFitOnLast: boolean;
};

export function paginateOrcamentoItemsByHeights(params: {
  rowHeights: number[];
  headerPg1Height: number;
  headerPgNHeight: number;
  totalsHeight: number;
  pagamentoHeight: number;
  contentHeightPx?: number;
}): OrcamentoItemsPagination {
  const CONTENT_HEIGHT_PX = params.contentHeightPx ?? PDF_CONTENT_HEIGHT_PX;
  const H_HEADER_PG1 = params.headerPg1Height || 0;
  const H_HEADER_PGN = params.headerPgNHeight || 0;
  const H_TOTAIS = params.totalsHeight || 0;
  const H_PAGAMENTO = params.pagamentoHeight || 0;
  const RESERVE_END = H_TOTAIS + H_PAGAMENTO + PDF_RESERVE_PADDING_PX;

  const newPages: number[][] = [[]];
  let cur = H_HEADER_PG1;

  for (let i = 0; i < params.rowHeights.length; i++) {
    const trH = params.rowHeights[i] || 24;
    const currentArr = newPages[newPages.length - 1];
    if (cur + trH > CONTENT_HEIGHT_PX && currentArr.length > 0) {
      newPages.push([]);
      cur = H_HEADER_PGN;
    }
    newPages[newPages.length - 1].push(i);
    cur += trH;
  }

  const totalsFitOnLast = cur + RESERVE_END <= CONTENT_HEIGHT_PX;
  return { pages: newPages, totalsFitOnLast };
}

/** Estimativa quando não há Puppeteer (preview HTML). */
export function estimateItemsPagination(itemCount: number, hasPagamento: boolean): OrcamentoItemsPagination {
  const rowHeights = Array.from({ length: itemCount }, () => 30);
  return paginateOrcamentoItemsByHeights({
    rowHeights,
    headerPg1Height: 300,
    headerPgNHeight: 52,
    totalsHeight: 88,
    pagamentoHeight: hasPagamento ? 72 : 0,
  });
}

/** Expressão JS pura para page.evaluate (string) — evita __name do esbuild no callback serializado. */
export function buildMeasurePaginationEvalExpression(
  contentHeightPx: number,
  reservePaddingPx: number
): string {
  return `(() => {
    var measure = function(sel) {
      var el = document.querySelector(sel);
      return el ? el.getBoundingClientRect().height : 0;
    };
    var trHeights = Array.prototype.slice.call(
      document.querySelectorAll('tr[data-measure="item-row"]')
    ).map(function(tr) {
      return tr.getBoundingClientRect().height || 24;
    });
    var headerPg1 = measure('[data-measure="header-pg1"]');
    var headerPgN = measure('[data-measure="header-pgn"]');
    var totalsH = measure('[data-measure="totais"]');
    var pagamentoH = measure('[data-measure="pagamento"]');
    var reserveEnd = totalsH + pagamentoH + ${reservePaddingPx};
    var contentHeightPx = ${contentHeightPx};
    var pages = [[]];
    var cur = headerPg1;
    for (var i = 0; i < trHeights.length; i++) {
      var trH = trHeights[i] || 24;
      var currentArr = pages[pages.length - 1];
      if (cur + trH > contentHeightPx && currentArr.length > 0) {
        pages.push([]);
        cur = headerPgN;
      }
      pages[pages.length - 1].push(i);
      cur += trH;
    }
    return { pages: pages, totalsFitOnLast: cur + reserveEnd <= contentHeightPx };
  })()`;
}

/** @deprecated Use buildMeasurePaginationEvalExpression + page.evaluate(string) */
export function measureItemsPaginationInDom(): OrcamentoItemsPagination {
  const measure = (sel: string) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().height : 0;
  };

  const trHeights = Array.from(document.querySelectorAll<HTMLTableRowElement>('tr[data-measure="item-row"]')).map(
    (tr) => tr.getBoundingClientRect().height || 24
  );

  return paginateOrcamentoItemsByHeights({
    rowHeights: trHeights,
    headerPg1Height: measure('[data-measure="header-pg1"]'),
    headerPgNHeight: measure('[data-measure="header-pgn"]'),
    totalsHeight: measure('[data-measure="totais"]'),
    pagamentoHeight: measure('[data-measure="pagamento"]'),
  });
}
