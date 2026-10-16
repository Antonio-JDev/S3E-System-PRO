import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import htmlToPdfmake from 'html-to-pdfmake';
import sharp from 'sharp';
import {
  PDF_MARGIN_BOTTOM_PX,
  PDF_MARGIN_LEFT_PX,
  PDF_MARGIN_RIGHT_PX,
  PDF_MARGIN_TOP_PX,
} from './pdfOrcamentoPagination.util';
import {
  buildDescriptionCombinedHtml,
  type OrcamentoPdfModel,
} from './pdfOrcamentoHtmlBuilder';
import { formatCurrencyBR } from './pdfOrcamentoHtml.util';
import { resolveUploadPathToDataUrl } from '../utils/orcamentoPdfPersonalization.util';

/** 1px CSS a 96dpi = 0,75pt no pdfmake. */
export const CSS_PX_TO_PDF_PT = 72 / 96;

export function cssPxToPdfPt(px: number): number {
  return Math.round(px * CSS_PX_TO_PDF_PT * 100) / 100;
}

/** [esquerda, topo, direita, base] — equivalente a 20 / 95 / 20 / 100 px do preview. */
export const ORCAMENTO_PDF_PAGE_MARGINS: [number, number, number, number] = [
  cssPxToPdfPt(PDF_MARGIN_LEFT_PX),
  cssPxToPdfPt(PDF_MARGIN_TOP_PX),
  cssPxToPdfPt(PDF_MARGIN_RIGHT_PX),
  cssPxToPdfPt(PDF_MARGIN_BOTTOM_PX),
];

/**
 * Cabeçalho de continuação fica na faixa superior, encostado no miolo.
 * Assim não cobre o conteúdo e não sobe para o meio do timbre.
 */
export const ORCAMENTO_PDF_HEADER_MARGIN: [number, number, number, number] = [
  ORCAMENTO_PDF_PAGE_MARGINS[0],
  Math.round((ORCAMENTO_PDF_PAGE_MARGINS[1] - 18) * 100) / 100,
  ORCAMENTO_PDF_PAGE_MARGINS[2],
  0,
];

/** Rodapé alinhado ao page-number do preview (bottom: 30.5px), ainda dentro da margem inferior. */
export const ORCAMENTO_PDF_FOOTER_MARGIN: [number, number, number, number] = [
  ORCAMENTO_PDF_PAGE_MARGINS[0],
  Math.round((ORCAMENTO_PDF_PAGE_MARGINS[3] - cssPxToPdfPt(30.5) - 14) * 100) / 100,
  ORCAMENTO_PDF_PAGE_MARGINS[2],
  0,
];

/** Folha timbrada no preview é opaca; a opacidade vale só para a marca d'água de texto/logo. */
export const LETTERHEAD_IMAGE_OPACITY = 1;

const PAGE_BREAK_RE =
  /<div\b[^>]*class\s*=\s*["'][^"']*\bpage-break\b[^"']*["'][^>]*>\s*(?:<br\s*\/?>)?\s*<\/div>/gi;

const SAFE_IMAGE_RE = /^data:image\/(?:png|jpeg);base64,/i;
const MAX_INLINE_IMAGE_WIDTH = 480;

export type PdfMakeMarcaDagua = {
  tipo?: 'imagem' | 'texto' | 'template';
  opacidade?: number;
  posicao?: string;
  tamanho?: string;
  logoUrl?: string;
  folhaTimbradaUrl?: string;
};

function clampOpacity(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!match?.[1] || !match[2]) return null;
  try {
    return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
  } catch {
    return null;
  }
}

async function bufferToPngDataUrl(input: Buffer): Promise<string | null> {
  try {
    const png = await sharp(input, { failOn: 'none', animated: false }).png().toBuffer();
    if (!png.length) return null;
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (err) {
    console.warn('[pdfmake] imagem ignorada (não foi possível converter para PNG):', err);
    return null;
  }
}

/**
 * Aceita data URL, caminho /uploads/ ou URL http(s) cujo path seja /uploads/.
 * PNG e JPEG seguem direto. WebP, SVG e outros formatos viram PNG ou são omitidos.
 */
export async function resolvePdfmakeSafeImage(raw: string | null | undefined): Promise<string | null> {
  const value = (raw || '').trim();
  if (!value) return null;

  try {
    let dataUrl: string | null = null;
    if (value.startsWith('data:')) {
      dataUrl = value;
    } else {
      dataUrl = resolveUploadPathToDataUrl(value);
    }
    if (!dataUrl) return null;

    const parsed = parseDataUrl(dataUrl);
    if (!parsed || !parsed.buffer.length) return null;

    if (parsed.mime === 'image/png' || parsed.mime === 'image/jpeg' || parsed.mime === 'image/jpg') {
      try {
        const meta = await sharp(parsed.buffer, { failOn: 'none' }).metadata();
        if (!meta.width || !meta.height) return null;
      } catch {
        return null;
      }
      if (parsed.mime === 'image/jpg') {
        return `data:image/jpeg;base64,${parsed.buffer.toString('base64')}`;
      }
      return dataUrl.startsWith('data:image/jpg')
        ? `data:image/jpeg;base64,${parsed.buffer.toString('base64')}`
        : dataUrl;
    }

    return bufferToPngDataUrl(parsed.buffer);
  } catch (err) {
    console.warn('[pdfmake] falha ao resolver imagem, seguindo sem ela:', err);
    return null;
  }
}

export function splitHtmlIntoPageFragments(html: string | null | undefined): string[] {
  const trimmed = (html || '').trim();
  if (!trimmed) return [];
  const parts = trimmed.split(new RegExp(PAGE_BREAK_RE.source, 'gi')).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
}

async function loadJsdom(): Promise<typeof import('jsdom').JSDOM> {
  const mod = await import('jsdom');
  return mod.JSDOM;
}

async function embedLocalImages(html: string): Promise<string> {
  const JSDOM = await loadJsdom();
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`);
  const images = Array.from(dom.window.document.querySelectorAll('img')) as Array<{
    getAttribute: (name: string) => string | null;
    setAttribute: (name: string, value: string) => void;
    remove: () => void;
  }>;

  for (const img of images) {
    const src = img.getAttribute('src') || '';
    const safe = await resolvePdfmakeSafeImage(src);
    if (!safe) {
      img.remove();
      continue;
    }
    img.setAttribute('src', safe);
  }

  return dom.window.document.body.innerHTML as string;
}

async function sanitizePdfNode(node: unknown): Promise<unknown> {
  if (node == null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return node;
  }
  if (Array.isArray(node)) {
    const next: unknown[] = [];
    for (const item of node) next.push(await sanitizePdfNode(item));
    return next;
  }
  if (typeof node !== 'object') return node;

  const record = { ...(node as Record<string, unknown>) };
  if (typeof record.font === 'string' && record.font !== 'Roboto') {
    delete record.font;
  }

  if (typeof record.image === 'string') {
    const safe = SAFE_IMAGE_RE.test(record.image)
      ? record.image
      : await resolvePdfmakeSafeImage(record.image);
    if (!safe) return { text: '' };
    record.image = safe;
    if (record.width == null && record.fit == null) {
      record.width = 200;
    } else if (typeof record.width === 'number' && record.width > MAX_INLINE_IMAGE_WIDTH) {
      record.width = MAX_INLINE_IMAGE_WIDTH;
    }
    return record;
  }

  for (const key of ['text', 'stack', 'ul', 'ol', 'columns'] as const) {
    if (record[key] != null) {
      record[key] = await sanitizePdfNode(record[key]);
    }
  }

  const table = record.table as { body?: unknown } | undefined;
  if (table?.body) {
    table.body = await sanitizePdfNode(table.body);
    record.table = table;
  }

  return record;
}

async function parseHtmlChunk(html: string): Promise<Content[]> {
  const withImages = await embedLocalImages(html);
  if (!withImages.trim()) return [];

  const JSDOM = await loadJsdom();
  const dom = new JSDOM(`<!DOCTYPE html><body>${withImages}</body>`);
  const parsed = htmlToPdfmake(dom.window.document.body.innerHTML, {
    window: dom.window,
    removeExtraBlanks: false,
    ignoreStyles: ['font', 'font-family'],
    defaultStyles: {
      p: { margin: [0, 2, 0, 4], fontSize: 9, lineHeight: 1.25, color: '#334155' },
      h1: { fontSize: 13, bold: true, margin: [0, 6, 0, 4], color: '#0f172a' },
      h2: { fontSize: 11, bold: true, margin: [0, 5, 0, 3], color: '#0f172a' },
      h3: { fontSize: 10, bold: true, margin: [0, 4, 0, 2], color: '#0f172a' },
      h4: { fontSize: 10, bold: true, margin: [0, 4, 0, 2], color: '#0f172a' },
      ul: { margin: [0, 2, 0, 4] },
      ol: { margin: [0, 2, 0, 4] },
      li: { margin: [0, 1, 0, 1], fontSize: 9, color: '#334155' },
      table: { margin: [0, 4, 0, 6] },
      th: { bold: true, fontSize: 8.5, fillColor: '#f1f5f9' },
      td: { fontSize: 8.5 },
      b: { bold: true },
      strong: { bold: true },
      i: { italics: true },
      em: { italics: true },
    },
  });

  const list = (Array.isArray(parsed) ? parsed : [parsed]) as Content[];
  return (await sanitizePdfNode(list)) as Content[];
}

/** Converte HTML do TipTap em conteúdo pdfmake, com pageBreak e imagens locais. */
export async function parseOrcamentoHtmlToPdfmake(htmlString: string | null | undefined): Promise<Content[]> {
  if (!htmlString?.trim()) return [];

  try {
    const parts = htmlString.split(new RegExp(PAGE_BREAK_RE.source, 'gi'));
    const content: Content[] = [];

    for (let index = 0; index < parts.length; index += 1) {
      if (index > 0) {
        content.push({ text: '', pageBreak: 'before' });
      }
      const chunk = parts[index]?.trim();
      if (!chunk) continue;
      try {
        content.push(...(await parseHtmlChunk(chunk)));
      } catch (err) {
        console.warn('[pdfmake] trecho HTML ignorado na conversão rica:', err);
        content.push({
          text: chunk.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          fontSize: 9,
          color: '#334155',
        });
      }
    }

    return content;
  } catch (err) {
    console.warn('[pdfmake] Erro ao converter HTML, usando texto bruto:', err);
    return [{ text: htmlString.replace(/<[^>]+>/g, ' '), fontSize: 9, color: '#334155' }];
  }
}

export function buildBackground(
  pageSize: { width: number; height: number },
  letterhead: string | null,
  logo: string | null,
  opacidade: number
): Content[] {
  if (letterhead) {
    return [
      {
        image: letterhead,
        width: pageSize.width,
        height: pageSize.height,
        opacity: LETTERHEAD_IMAGE_OPACITY,
        absolutePosition: { x: 0, y: 0 },
      },
    ];
  }

  if (logo) {
    const width = Math.min(240, pageSize.width * 0.42);
    return [
      {
        image: logo,
        width,
        opacity: opacidade,
        absolutePosition: {
          x: (pageSize.width - width) / 2,
          y: pageSize.height * 0.38,
        },
      },
    ];
  }

  return [
    {
      text: 'S3E ENGENHARIA',
      color: '#1e40af',
      opacity: opacidade,
      fontSize: 60,
      bold: true,
      alignment: 'center',
      margin: [0, 350, 0, 0],
    },
  ];
}

/** Largura útil A4 (595.28pt) menos margens L/R de 15pt. */
const CONTENT_WIDTH_PT =
  Math.round((595.28 - ORCAMENTO_PDF_PAGE_MARGINS[0] - ORCAMENTO_PDF_PAGE_MARGINS[2]) * 100) / 100;

const COLOR_TEXT = '#1e293b';
const COLOR_MUTED = '#64748b';
const COLOR_LINE = '#000000';
const COLOR_ROW_LINE = '#cbd5e1';

function blackRule(marginBottom = 8): Content {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: CONTENT_WIDTH_PT,
        y2: 0,
        lineWidth: 1,
        lineColor: COLOR_LINE,
      },
    ],
    margin: [0, 0, 0, marginBottom],
  };
}

function sectionTitle(text: string): Content {
  return {
    text: text.toUpperCase(),
    fontSize: 8.5,
    bold: true,
    color: COLOR_TEXT,
    characterSpacing: 0.3,
    margin: [0, 0, 0, 4],
  };
}

/** Tabela só com linhas horizontais leves (padrão aprovado). */
function horizontalOnlyLayout(headerBottom = true) {
  return {
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) => {
      if (i === 0) return 0;
      if (headerBottom && i === 1) return 0.75;
      if (i === node.table.body.length) return 0.5;
      return 0.4;
    },
    vLineWidth: () => 0,
    hLineColor: () => COLOR_ROW_LINE,
    paddingLeft: () => 2,
    paddingRight: () => 2,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  };
}

export async function buildOrcamentoDocDefinition(
  model: OrcamentoPdfModel,
  marcaDaguaConfig?: PdfMakeMarcaDagua
): Promise<TDocumentDefinitions> {
  const opacidade = clampOpacity(marcaDaguaConfig?.opacidade, 0.05);
  const letterhead = await resolvePdfmakeSafeImage(marcaDaguaConfig?.folhaTimbradaUrl);
  const logo = letterhead ? null : await resolvePdfmakeSafeImage(marcaDaguaConfig?.logoUrl);

  const background = (_currentPage: number, pageSize: { width: number; height: number }) =>
    buildBackground(pageSize, letterhead, logo, opacidade);

  // Sem header textual: logo/cantos vêm só da folha timbrada (evita overlap nas págs. ≥2).
  const header = () => null;

  const footer = (currentPage: number, pageCount: number) => ({
    margin: ORCAMENTO_PDF_FOOTER_MARGIN,
    text: `${currentPage} / ${pageCount}`,
    alignment: 'center' as const,
    fontSize: 9,
    bold: true,
    color: '#000000',
  });

  const content: Content[] = [];
  const cliente = model.cliente;
  const emissaoStr = model.createdAt.toLocaleDateString('pt-BR');
  const validadeStr = model.validade.toLocaleDateString('pt-BR');
  const orcamentista = model.orcamentistaNome || 'Não identificado';

  const enderecoCobranca = cliente.endereco
    ? `${cliente.endereco}${cliente.numero ? `, ${cliente.numero}` : ''}`
    : null;
  const enderecoObra = model.enderecoObra
    ? `${model.enderecoObra}${model.numeroObra ? `, ${model.numeroObra}` : ''}${model.bairro ? ` - ${model.bairro}` : ''}${model.cidade ? ` - ${model.cidade}` : ''}${model.cep ? ` - CEP: ${model.cep}` : ''}`
    : null;

  // Título + ORÇAMENTO: N
  content.push({
    columns: [
      {
        text: model.titulo.toUpperCase(),
        fontSize: 12,
        bold: true,
        color: COLOR_TEXT,
        width: '*',
      },
      {
        text: `ORÇAMENTO: ${model.numeroSequencial}`,
        fontSize: 11,
        bold: true,
        color: COLOR_TEXT,
        alignment: 'right',
        width: 'auto',
      },
    ],
    margin: [0, 0, 0, 6],
  });

  // Meta: Cliente | Emissão | Validade | Orçamentista
  content.push({
    columns: [
      {
        stack: [
          { text: 'Cliente:', fontSize: 7.5, color: COLOR_MUTED },
          { text: cliente.nome, fontSize: 8, bold: true, color: COLOR_TEXT, margin: [0, 1, 0, 0] },
        ],
        width: '*',
      },
      {
        stack: [
          { text: 'Emissão:', fontSize: 7.5, color: COLOR_MUTED },
          { text: emissaoStr, fontSize: 8, bold: true, color: COLOR_TEXT, margin: [0, 1, 0, 0] },
        ],
        width: 'auto',
      },
      {
        stack: [
          { text: 'Validade:', fontSize: 7.5, color: COLOR_MUTED },
          { text: validadeStr, fontSize: 8, bold: true, color: COLOR_TEXT, margin: [0, 1, 0, 0] },
        ],
        width: 'auto',
      },
      {
        stack: [
          { text: 'Orçamentista:', fontSize: 7.5, color: COLOR_MUTED },
          { text: orcamentista, fontSize: 8, bold: true, color: COLOR_TEXT, margin: [0, 1, 0, 0] },
        ],
        width: 'auto',
      },
    ],
    columnGap: 12,
    margin: [0, 0, 0, 6],
  });

  content.push(blackRule(10));

  // Dados do cliente
  content.push(sectionTitle('Dados do Cliente'));
  content.push({
    columns: [
      {
        stack: [
          { text: 'NOME', fontSize: 7, bold: true, color: COLOR_MUTED },
          { text: cliente.nome, fontSize: 8.5, color: COLOR_TEXT, margin: [0, 1, 0, 6] },
          { text: 'EMAIL', fontSize: 7, bold: true, color: COLOR_MUTED },
          { text: cliente.email || 'Não informado', fontSize: 8.5, color: COLOR_TEXT, margin: [0, 1, 0, 0] },
        ],
        width: '*',
      },
      {
        stack: [
          { text: 'CPF/CNPJ', fontSize: 7, bold: true, color: COLOR_MUTED },
          { text: cliente.cpfCnpj || 'Não informado', fontSize: 8.5, color: COLOR_TEXT, margin: [0, 1, 0, 6] },
          { text: 'TELEFONE', fontSize: 7, bold: true, color: COLOR_MUTED },
          { text: cliente.telefone || 'Não informado', fontSize: 8.5, color: COLOR_TEXT, margin: [0, 1, 0, 0] },
        ],
        width: '*',
      },
    ],
    columnGap: 16,
    margin: [0, 0, 0, 8],
  });

  if (enderecoCobranca || enderecoObra) {
    content.push({
      columns: [
        {
          stack: [
            { text: 'ENDEREÇO DE COBRANÇA', fontSize: 7.5, bold: true, color: COLOR_TEXT, margin: [0, 0, 0, 2] },
            { text: enderecoCobranca || 'Não informado', fontSize: 8, color: COLOR_TEXT, lineHeight: 1.3 },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'ENDEREÇO DA OBRA', fontSize: 7.5, bold: true, color: COLOR_TEXT, margin: [0, 0, 0, 2] },
            { text: enderecoObra || 'Não informado', fontSize: 8, color: COLOR_TEXT, lineHeight: 1.3 },
          ],
          width: '*',
        },
      ],
      columnGap: 16,
      margin: [0, 0, 0, 6],
    });
  }

  content.push(blackRule(10));

  // Itens
  content.push(sectionTitle('Itens do Orçamento'));

  const itensHeader: TableCell[] = [
    { text: 'DESCRIÇÃO', bold: true, fontSize: 8, color: COLOR_TEXT },
    { text: 'UNID.', bold: true, fontSize: 8, color: COLOR_TEXT, alignment: 'right' },
    { text: 'QTD', bold: true, fontSize: 8, color: COLOR_TEXT, alignment: 'right' },
    { text: 'VALOR UNIT.', bold: true, fontSize: 8, color: COLOR_TEXT, alignment: 'right' },
    { text: 'TOTAL', bold: true, fontSize: 8, color: COLOR_TEXT, alignment: 'right' },
  ];

  const itensRows: TableCell[][] = model.items.map((item) => [
    { text: item.nomeItem, fontSize: 8, color: COLOR_TEXT },
    { text: item.unidade || 'UN', fontSize: 8, color: COLOR_TEXT, alignment: 'right' },
    {
      text: Number(item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      fontSize: 8,
      color: COLOR_TEXT,
      alignment: 'right',
    },
    { text: formatCurrencyBR(item.precoUnit), fontSize: 8, color: COLOR_TEXT, alignment: 'right' },
    { text: formatCurrencyBR(item.subtotal), bold: true, fontSize: 8, color: COLOR_TEXT, alignment: 'right' },
  ]);

  content.push({
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: ['*', 40, 40, 70, 70],
      body: [itensHeader, ...itensRows],
    },
    layout: horizontalOnlyLayout(true),
    margin: [0, 0, 0, 6],
  });

  const valorItens = model.items.reduce((acc, it) => acc + it.subtotal, 0);
  const impostosValor =
    model.impostoPercentual > 0 ? model.precoVenda - (valorItens - model.descontoValor) : 0;
  const qtdItens = model.items.length;

  content.push({
    columns: [
      {
        text: `Quantidade: ${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}`,
        fontSize: 8.5,
        color: COLOR_TEXT,
      },
      {
        text: `Valor total dos itens ${formatCurrencyBR(valorItens)}`,
        fontSize: 8.5,
        color: COLOR_TEXT,
        alignment: 'right',
      },
    ],
    margin: [0, 2, 0, 4],
  });

  if (model.descontoValor > 0) {
    content.push({
      columns: [
        { text: 'Desconto:', fontSize: 8.5, color: COLOR_TEXT },
        {
          text: `- ${formatCurrencyBR(model.descontoValor)}`,
          fontSize: 8.5,
          bold: true,
          color: '#dc2626',
          alignment: 'right',
        },
      ],
      margin: [0, 0, 0, 2],
    });
  }

  if (model.impostoPercentual > 0) {
    content.push({
      columns: [
        { text: 'Impostos:', fontSize: 8.5, color: COLOR_TEXT },
        {
          text: formatCurrencyBR(impostosValor),
          fontSize: 8.5,
          bold: true,
          color: COLOR_TEXT,
          alignment: 'right',
        },
      ],
      margin: [0, 0, 0, 2],
    });
  }

  // Total final com regra superior (equivalente a border-top: 2px #1e293b)
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: CONTENT_WIDTH_PT,
        y2: 0,
        lineWidth: 1.5,
        lineColor: COLOR_TEXT,
      },
    ],
    margin: [0, 4, 0, 4],
  });

  content.push({
    columns: [
      {
        text: 'VALOR TOTAL DO ORÇAMENTO:',
        fontSize: 10,
        bold: true,
        color: COLOR_TEXT,
      },
      {
        text: formatCurrencyBR(model.precoVenda),
        fontSize: 11,
        bold: true,
        color: COLOR_TEXT,
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 10],
  });

  if (model.condicaoPagamento) {
    content.push(sectionTitle('Forma / Condições de Pagamento'));
    content.push({
      table: {
        widths: ['*', '*'],
        body: [
          [
            { text: 'CONDIÇÃO', bold: true, fontSize: 8, color: COLOR_TEXT },
            { text: 'OBSERVAÇÃO', bold: true, fontSize: 8, color: COLOR_TEXT },
          ],
          [
            { text: model.condicaoPagamento, bold: true, fontSize: 8.5, color: COLOR_TEXT },
            { text: 'Pagamentos conforme condições a serem acordadas.', fontSize: 8.5, color: COLOR_TEXT },
          ],
        ],
      },
      layout: horizontalOnlyLayout(true),
      margin: [0, 0, 0, 10],
    });
  }

  const descricao = await parseOrcamentoHtmlToPdfmake(buildDescriptionCombinedHtml(model));
  if (descricao.length > 0) {
    const first = descricao[0];
    if (first && typeof first === 'object' && !Array.isArray(first) && !(first as { pageBreak?: string }).pageBreak) {
      (first as { pageBreak?: string }).pageBreak = 'before';
    }
    content.push(...descricao);
  }

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: ORCAMENTO_PDF_PAGE_MARGINS,
    background: background as TDocumentDefinitions['background'],
    header: header as TDocumentDefinitions['header'],
    footer: footer as TDocumentDefinitions['footer'],
    content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 8.5,
      color: COLOR_TEXT,
    },
  };
}
