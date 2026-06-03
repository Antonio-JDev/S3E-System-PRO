import {
  buildMeasureDescriptionPaginationEvalExpression,
  paginateMeasuredBlockHeights,
} from './pdfOrcamentoDescriptionPagination.util';
import { PDF_CONTENT_HEIGHT_PX } from './pdfOrcamentoPagination.util';
import {
  buildDescriptionCombinedHtml,
  buildOrcamentoPaginatedHtml,
} from './pdfOrcamentoHtmlBuilder';
import type { OrcamentoPdfModel } from './pdfOrcamentoHtmlBuilder';
import { estimateItemsPagination } from './pdfOrcamentoPagination.util';

describe('paginateMeasuredBlockHeights', () => {
  it('mantém blocos na mesma página enquanto couber', () => {
    const pages = paginateMeasuredBlockHeights([100, 100, 100], 400);
    expect(pages).toEqual([[0, 1, 2]]);
  });

  it('quebra página quando a soma excede a altura útil', () => {
    const h = PDF_CONTENT_HEIGHT_PX;
    const pages = paginateMeasuredBlockHeights([h * 0.6, h * 0.6, h * 0.3], h);
    expect(pages.length).toBe(2);
    expect(pages[0]).toEqual([0]);
    expect(pages[1]).toEqual([1, 2]);
  });
});

describe('buildDescriptionCombinedHtml', () => {
  const base: OrcamentoPdfModel = {
    numeroSequencial: 1,
    titulo: 'Orçamento',
    createdAt: new Date(),
    validade: new Date(),
    orcamentistaNome: null,
    cliente: { nome: 'Cliente' },
    items: [],
    precoVenda: 0,
    descontoValor: 0,
    impostoPercentual: 0,
    descricao: null,
    descricaoProjeto: null,
    observacoes: null,
  };

  it('monta seções .section com h2 para medição', () => {
    const html = buildDescriptionCombinedHtml({
      ...base,
      descricaoProjeto:
        '<p>Linha A</p><p><img src="https://example.com/a.jpg" alt="foto" /></p>',
    });
    expect(html).toContain('class="section"');
    expect(html).toContain('Descrição Técnica do Projeto');
    expect(html).toContain('Linha A');
  });
});

describe('buildOrcamentoPaginatedHtml — numeração', () => {
  const base: OrcamentoPdfModel = {
    numeroSequencial: 9,
    titulo: 'Orçamento',
    createdAt: new Date(),
    validade: new Date(),
    orcamentistaNome: null,
    cliente: { nome: 'Cliente' },
    items: [
      { nomeItem: 'Item', unidade: 'UN', quantidade: 1, precoUnit: 10, subtotal: 10 },
    ],
    precoVenda: 10,
    descontoValor: 0,
    impostoPercentual: 0,
    descricaoProjeto: '<p>Texto técnico</p>',
  };

  it('inclui contador centralizado em todas as páginas (igual modal)', () => {
    const pagination = estimateItemsPagination(1, false);
    const html = buildOrcamentoPaginatedHtml(
      base,
      { opacidadeMarcaDagua: 0.05 },
      pagination,
      ['<div class="section"><h2>Técnica</h2><p>A</p></div>']
    );
    const matches = html.match(/class="page-number">/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('1 / ');
    expect(html).toContain('bottom: 30.5px');
  });
});

describe('buildMeasureDescriptionPaginationEvalExpression', () => {
  it('inclui seletores de medição usados no Puppeteer', () => {
    const expr = buildMeasureDescriptionPaginationEvalExpression();
    expect(expr).toContain('description-source');
    expect(expr).toContain('description-measure');
    expect(expr).toContain('resultPages');
  });
});
