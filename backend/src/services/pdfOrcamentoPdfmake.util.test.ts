/**
 * Conversão TipTap → pdfmake e timbre/margens do orçamento.
 */

jest.mock('../lib/prisma', () => ({
  prisma: {
    pDFTemplate: { findFirst: jest.fn() },
    orcamento: { findUnique: jest.fn() },
  },
}));

import fs from 'fs';
import path from 'path';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { OrcamentoPdfModel } from './pdfOrcamentoHtmlBuilder';
import {
  CSS_PX_TO_PDF_PT,
  LETTERHEAD_IMAGE_OPACITY,
  ORCAMENTO_PDF_FOOTER_MARGIN,
  ORCAMENTO_PDF_HEADER_MARGIN,
  ORCAMENTO_PDF_PAGE_MARGINS,
  buildOrcamentoDocDefinition,
  cssPxToPdfPt,
  parseOrcamentoHtmlToPdfmake,
  resolvePdfmakeSafeImage,
  splitHtmlIntoPageFragments,
} from './pdfOrcamentoPdfmake.util';
import { PDF_MARGIN_BOTTOM_PX, PDF_MARGIN_LEFT_PX, PDF_MARGIN_TOP_PX } from './pdfOrcamentoPagination.util';

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function walk(node: unknown, visit: (value: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, visit));
    return;
  }
  visit(node as Record<string, unknown>);
  for (const value of Object.values(node as Record<string, unknown>)) {
    walk(value, visit);
  }
}

function collect(content: Content[]): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  walk(content, (node) => found.push(node));
  return found;
}

const model: OrcamentoPdfModel = {
  numeroSequencial: 123,
  titulo: 'Teste Orçamento',
  createdAt: new Date('2025-01-01T12:00:00Z'),
  validade: new Date('2025-12-31T12:00:00Z'),
  orcamentistaNome: 'Ana',
  cliente: { nome: 'EMPRESA TESTE LTDA', cpfCnpj: '123', email: 'a@b.com', telefone: '47' },
  items: [{ nomeItem: 'Material Teste', unidade: 'UN', quantidade: 2, precoUnit: 10, subtotal: 20 }],
  precoVenda: 20,
  descontoValor: 0,
  impostoPercentual: 0,
  condicaoPagamento: '30 dias',
  descricao: '<p>Escopo com <b>negrito</b></p>',
  descricaoProjeto:
    '<p>Antes <b>negrito</b></p><div class="page-break"></div><p>Depois</p><ul><li>Item da lista</li></ul><img src="https://externo.invalid/foto.png" alt="x" /><table><tr><td colspan="2">Celula mesclada</td></tr><tr><td>A</td><td>B</td></tr></table>',
  observacoes: '<p>Obs <i>itálico</i></p>',
};

describe('margens do pdfmake', () => {
  it('converte px do preview (96dpi) para pontos', () => {
    expect(CSS_PX_TO_PDF_PT).toBeCloseTo(0.75, 5);
    expect(cssPxToPdfPt(PDF_MARGIN_LEFT_PX)).toBe(15);
    expect(cssPxToPdfPt(PDF_MARGIN_TOP_PX)).toBe(71.25);
    expect(cssPxToPdfPt(PDF_MARGIN_BOTTOM_PX)).toBe(75);
    expect(ORCAMENTO_PDF_PAGE_MARGINS).toEqual([15, 71.25, 15, 75]);
  });

  it('mantém cabeçalho e rodapé dentro da faixa do timbre, fora do miolo', () => {
    const [, top, , bottom] = ORCAMENTO_PDF_PAGE_MARGINS;
    expect(ORCAMENTO_PDF_HEADER_MARGIN[1]).toBeGreaterThan(40);
    expect(ORCAMENTO_PDF_HEADER_MARGIN[1] + 12).toBeLessThan(top);
    expect(ORCAMENTO_PDF_FOOTER_MARGIN[1]).toBeGreaterThan(20);
    expect(ORCAMENTO_PDF_FOOTER_MARGIN[1] + 16).toBeLessThan(bottom);
  });
});

describe('parseOrcamentoHtmlToPdfmake', () => {
  it('gera pageBreak a partir de div.page-break e preserva negrito, lista e tabela', async () => {
    const content = await parseOrcamentoHtmlToPdfmake(model.descricaoProjeto);
    const nodes = collect(content);
    const serialized = JSON.stringify(content);

    expect(nodes.some((node) => node.pageBreak === 'before')).toBe(true);
    expect(serialized).toContain('negrito');
    expect(serialized).toContain('Antes');
    expect(serialized).toContain('Depois');
    expect(serialized).toContain('Item da lista');
    expect(serialized).toContain('Celula mesclada');
    expect(nodes.some((node) => node.colSpan === 2 || node.colSpan === '2')).toBe(true);
    expect(nodes.some((node) => node.bold === true)).toBe(true);
    expect(serialized).not.toContain('externo.invalid');
    expect(nodes.some((node) => typeof node.image === 'string' && String(node.image).includes('externo.invalid'))).toBe(
      false
    );
  });

  it('omite imagem externa e imagem webp inválida sem lançar erro', async () => {
    const content = await parseOrcamentoHtmlToPdfmake(
      '<p>Texto estável</p><img src="https://cdn.example/foto.webp" /><img src="data:image/webp;base64,AAAA" />'
    );
    const serialized = JSON.stringify(content);
    expect(serialized).toContain('Texto estável');
    expect(serialized).not.toContain('cdn.example');
    expect(serialized).not.toContain('image/webp');
  });

  it('embute PNG em data URL', async () => {
    const content = await parseOrcamentoHtmlToPdfmake(`<p>Foto</p><img src="${PNG_DATA_URL}" alt="" />`);
    const nodes = collect(content);
    expect(nodes.some((node) => typeof node.image === 'string' && String(node.image).startsWith('data:image/png'))).toBe(
      true
    );
  });
});

describe('resolvePdfmakeSafeImage', () => {
  const uploadDir = path.join(process.cwd(), 'uploads', 'pdf-customization');
  const fileName = 'pdfmake-unit-letterhead.png';
  const abs = path.join(uploadDir, fileName);

  afterAll(() => {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  });

  it('resolve arquivo local em /uploads e recusa webp/svg inválidos', async () => {
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(abs, Buffer.from(PNG_DATA_URL.split(',')[1], 'base64'));

    const fromUpload = await resolvePdfmakeSafeImage(`/uploads/pdf-customization/${fileName}`);
    expect(fromUpload).toMatch(/^data:image\/png;base64,/);

    const fromHttp = await resolvePdfmakeSafeImage(`https://app.local/uploads/pdf-customization/${fileName}`);
    expect(fromHttp).toMatch(/^data:image\/png;base64,/);

    await expect(resolvePdfmakeSafeImage('data:image/webp;base64,AAAA')).resolves.toBeNull();
    const svg = await resolvePdfmakeSafeImage(
      'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64')
    );
    expect(svg === null || (typeof svg === 'string' && svg.startsWith('data:image/png'))).toBe(true);
    await expect(resolvePdfmakeSafeImage('https://externo.invalid/folha.png')).resolves.toBeNull();
  });
});

describe('splitHtmlIntoPageFragments', () => {
  it('separa a descrição técnica nas quebras do editor', () => {
    const parts = splitHtmlIntoPageFragments('<p>A</p><div class="page-break"></div><p>B</p>');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('A');
    expect(parts[1]).toContain('B');
  });
});

describe('buildOrcamentoDocDefinition', () => {
  it('coloca a folha timbrada no fundo com opacidade total e as margens do preview', async () => {
    const doc: TDocumentDefinitions = await buildOrcamentoDocDefinition(model, {
      folhaTimbradaUrl: PNG_DATA_URL,
      logoUrl: PNG_DATA_URL,
      opacidade: 0.2,
    });

    expect(doc.pageMargins).toEqual(ORCAMENTO_PDF_PAGE_MARGINS);
    expect(doc.defaultStyle).toMatchObject({ font: 'Roboto' });

    const background = doc.background as (
      page: number,
      size: { width: number; height: number }
    ) => Array<{ image?: string; opacity?: number }>;
    const bg = background(1, { width: 595.28, height: 841.89 });
    expect(bg[0].image).toMatch(/^data:image\/png/);
    expect(bg[0].opacity).toBe(LETTERHEAD_IMAGE_OPACITY);

    const header = doc.header as (page: number) => unknown;
    expect(header(1)).toBeNull();
    expect(header(2)).toBeNull();

    const footer = doc.footer as unknown as (
      page: number,
      count: number
    ) => { margin: number[]; text: string; alignment: string };
    const footerPage = footer(1, 2);
    expect(footerPage.margin).toEqual(ORCAMENTO_PDF_FOOTER_MARGIN);
    expect(footerPage.text).toBe('1 / 2');
    expect(footerPage.alignment).toBe('center');
    expect(JSON.stringify(footerPage)).not.toContain('Emitido em');

    const serialized = JSON.stringify(doc.content);
    expect(serialized).toContain('Material Teste');
    expect(serialized).not.toContain('Descrição Técnica do Projeto');
    expect(serialized).not.toContain('Descrição Geral');
    expect(serialized).not.toContain('Escopo com');
    expect(serialized).toContain('Antes');
    expect(serialized).toContain('pageBreak');
    expect(serialized).toContain('30 dias');
    expect(serialized).toContain('VALOR TOTAL DO ORÇAMENTO');
    expect(serialized).not.toContain('VALOR TOTAL DA PROPOSTA');
    expect(serialized).not.toContain('#1e3a8a');
    expect(serialized).not.toContain('#f1f5f9');
    expect(serialized).toContain('DADOS DO CLIENTE');
    expect(serialized).toContain('FORMA / CONDIÇÕES DE PAGAMENTO');
    expect(serialized).toContain('Quantidade:');
  });

  it('usa a marca d\'água de texto quando a folha não pode ser embutida', async () => {
    const doc = await buildOrcamentoDocDefinition(model, {
      folhaTimbradaUrl: 'data:image/webp;base64,AAAA',
      opacidade: 0.15,
    });
    const background = doc.background as (
      page: number,
      size: { width: number; height: number }
    ) => Array<{ text?: string; opacity?: number }>;
    const bg = background(1, { width: 595.28, height: 841.89 });
    expect(bg[0].text).toContain('S3E');
    expect(bg[0].opacity).toBe(0.15);
  });
});
