import { prisma } from '../lib/prisma';
import {
  mapPrismaOrcamentoToPdfModel,
  type OrcamentoPdfModel,
  type OrcamentoPdfItem,
} from './pdfOrcamentoHtmlBuilder';
import { formatCurrencyBR } from './pdfOrcamentoHtml.util';
import htmlToPdfmake from 'html-to-pdfmake';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vfsFonts = require('pdfmake/build/vfs_fonts');
const vfs = vfsFonts.pdfMake ? vfsFonts.pdfMake.vfs : vfsFonts;

const pdfmakeFonts = {
  Roboto: {
    normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
  },
};

export interface MarcaDaguaConfig {
  tipo?: 'imagem' | 'texto' | 'template';
  opacidade?: number;
  posicao?: string;
  tamanho?: string;
  logoUrl?: string;
  folhaTimbradaUrl?: string;
}

export class PDFOrcamentoService {
  /**
   * Converte HTML rico (editor WYSIWYG/TipTap) em elementos do pdfmake
   */
  private static parseHtmlToPdfmakeContent(htmlString: string | null | undefined): Content[] {
    if (!htmlString || !htmlString.trim()) return [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(`<!DOCTYPE html><body>${htmlString}</body>`);
      const parsed = htmlToPdfmake(dom.window.document.body.innerHTML, {
        window: dom.window,
        defaultStyles: {
          p: { margin: [0, 2, 0, 4], fontSize: 9, lineHeight: 1.25, color: '#334155' },
          h1: { fontSize: 13, bold: true, margin: [0, 6, 0, 4], color: '#0f172a' },
          h2: { fontSize: 11, bold: true, margin: [0, 5, 0, 3], color: '#0f172a' },
          h3: { fontSize: 10, bold: true, margin: [0, 4, 0, 2], color: '#0f172a' },
          ul: { margin: [0, 2, 0, 4] },
          ol: { margin: [0, 2, 0, 4] },
          li: { margin: [0, 1, 0, 1], fontSize: 9, color: '#334155' },
          table: { margin: [0, 4, 0, 6] },
          th: { bold: true, fontSize: 8.5, fillColor: '#f1f5f9' },
          td: { fontSize: 8.5 },
        },
      });
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
      console.warn('[pdfmake] Erro ao converter HTML, usando texto bruto:', err);
      return [{ text: htmlString.replace(/<[^>]+>/g, ' '), fontSize: 9, color: '#334155' }];
    }
  }

  /**
   * Monta o DocumentDefinition completo para o pdfmake
   */
  private static buildDocDefinition(
    model: OrcamentoPdfModel,
    marcaDaguaConfig?: MarcaDaguaConfig
  ): TDocumentDefinitions {
    const folhaTimbradaDataUrl = marcaDaguaConfig?.folhaTimbradaUrl?.startsWith('data:image/')
      ? marcaDaguaConfig.folhaTimbradaUrl
      : undefined;

    const opacidade = marcaDaguaConfig?.opacidade ?? 0.05;

    // Background: Folha timbrada se fornecida, senão marca d'água de texto sutil
    const background = (currentPage: number, pageSize: { width: number; height: number }) => {
      if (folhaTimbradaDataUrl) {
        return [
          {
            image: folhaTimbradaDataUrl,
            width: pageSize.width,
            height: pageSize.height,
            absolutePosition: { x: 0, y: 0 },
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
    };

    // Header dinâmico no topo
    const header = (currentPage: number) => {
      if (currentPage === 1) return null;
      return {
        margin: [40, 15, 40, 0],
        columns: [
          {
            text: `ORÇAMENTO Nº ${model.numeroSequencial} - ${model.cliente.nome}`,
            fontSize: 7.5,
            color: '#64748b',
          },
          {
            text: `S3E ENGENHARIA ELÉTRICA`,
            fontSize: 7.5,
            color: '#64748b',
            alignment: 'right',
          },
        ],
      };
    };

    // Footer dinâmico com numeração de páginas
    const footer = (currentPage: number, pageCount: number) => {
      return {
        margin: [40, 10, 40, 0],
        columns: [
          {
            text: `Emitido em ${model.createdAt.toLocaleDateString('pt-BR')} | Validade: ${model.validade.toLocaleDateString('pt-BR')}`,
            fontSize: 7.5,
            color: '#94a3b8',
          },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            fontSize: 7.5,
            color: '#94a3b8',
            alignment: 'right',
          },
        ],
      };
    };

    // Construção dos blocos de conteúdo
    const content: Content[] = [];

    // 1. Cabeçalho / Título do Orçamento
    content.push({
      columns: [
        {
          stack: [
            { text: model.titulo.toUpperCase(), fontSize: 13, bold: true, color: '#0f172a' },
            { text: `Proposta Comercial de Serviços e Materiais`, fontSize: 8.5, color: '#64748b', margin: [0, 2, 0, 0] },
          ],
          width: '*',
        },
        {
          stack: [
            { text: `ORÇAMENTO: ${model.numeroSequencial}`, fontSize: 13, bold: true, color: '#1e3a8a', alignment: 'right' },
            { text: `Emissão: ${model.createdAt.toLocaleDateString('pt-BR')}`, fontSize: 8.5, color: '#475569', alignment: 'right', margin: [0, 2, 0, 0] },
            { text: `Validade: ${model.validade.toLocaleDateString('pt-BR')}`, fontSize: 8.5, color: '#475569', alignment: 'right' },
          ],
          width: 'auto',
        },
      ],
      margin: [0, 0, 0, 10],
    });

    // 2. Quadro de Dados do Cliente e Obra
    const cliente = model.cliente;
    const enderecoCobranca = cliente.endereco
      ? `${cliente.endereco}${cliente.numero ? `, ${cliente.numero}` : ''}`
      : 'Não informado';
    const enderecoObra = model.enderecoObra
      ? `${model.enderecoObra}${model.numeroObra ? `, ${model.numeroObra}` : ''}${model.bairro ? ` - ${model.bairro}` : ''}${model.cidade ? ` - ${model.cidade}` : ''}${model.cep ? ` - CEP: ${model.cep}` : ''}`
      : null;

    const clienteTableBody: TableCell[][] = [
      [
        { text: 'DADOS DO CLIENTE', colSpan: 2, bold: true, fontSize: 8.5, color: '#1e3a8a', fillColor: '#f1f5f9', margin: [0, 2, 0, 2] },
        {},
      ],
      [
        {
          stack: [
            { text: [{ text: 'Razão Social / Nome: ', bold: true, color: '#475569' }, { text: cliente.nome, color: '#0f172a' }] },
            { text: [{ text: 'CPF / CNPJ: ', bold: true, color: '#475569' }, { text: cliente.cpfCnpj || 'Não informado', color: '#0f172a' }] },
            { text: [{ text: 'E-mail: ', bold: true, color: '#475569' }, { text: cliente.email || 'Não informado', color: '#0f172a' }] },
            { text: [{ text: 'Telefone: ', bold: true, color: '#475569' }, { text: cliente.telefone || 'Não informado', color: '#0f172a' }] },
          ],
          fontSize: 8,
          lineHeight: 1.25,
        },
        {
          stack: [
            { text: [{ text: 'Orçamentista: ', bold: true, color: '#475569' }, { text: model.orcamentistaNome || 'Departamento Técnico', color: '#0f172a' }] },
            { text: [{ text: 'Endereço Cobrança: ', bold: true, color: '#475569' }, { text: enderecoCobranca, color: '#0f172a' }] },
            ...(enderecoObra ? [{ text: [{ text: 'Endereço da Obra: ', bold: true, color: '#475569' }, { text: enderecoObra, color: '#0f172a' }] }] : []),
            ...(model.previsaoTermino ? [{ text: [{ text: 'Previsão de Entrega: ', bold: true, color: '#475569' }, { text: model.previsaoTermino.toLocaleDateString('pt-BR'), color: '#0f172a' }] }] : []),
          ],
          fontSize: 8,
          lineHeight: 1.25,
        },
      ],
    ];

    content.push({
      table: {
        widths: ['*', '*'],
        body: clienteTableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cbd5e1',
        vLineColor: () => '#cbd5e1',
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 10],
    });

    // 3. Descrição do Escopo / Descrição Técnica (se houver)
    const descricaoGeral = this.parseHtmlToPdfmakeContent(model.descricao);
    const descricaoTecnica = this.parseHtmlToPdfmakeContent(model.descricaoProjeto);

    if (descricaoGeral.length > 0 || descricaoTecnica.length > 0) {
      content.push({
        text: 'ESCOPO DOS SERVIÇOS E ESPECIFICAÇÕES',
        fontSize: 9,
        bold: true,
        color: '#1e3a8a',
        margin: [0, 4, 0, 4],
      });

      if (descricaoGeral.length > 0) {
        content.push({ stack: descricaoGeral, margin: [0, 0, 0, 6] });
      }
      if (descricaoTecnica.length > 0) {
        content.push({ stack: descricaoTecnica, margin: [0, 0, 0, 8] });
      }
    }

    // 4. Tabela de Itens do Orçamento
    content.push({
      text: 'ITENS DO ORÇAMENTO',
      fontSize: 9,
      bold: true,
      color: '#1e3a8a',
      margin: [0, 6, 0, 4],
    });

    const itensHeader: TableCell[] = [
      { text: 'DESCRIÇÃO DO ITEM / MATERIAL / SERVIÇO', bold: true, fontSize: 8, color: '#1e293b', fillColor: '#e2e8f0' },
      { text: 'UNID.', bold: true, fontSize: 8, color: '#1e293b', fillColor: '#e2e8f0', alignment: 'center' },
      { text: 'QTD', bold: true, fontSize: 8, color: '#1e293b', fillColor: '#e2e8f0', alignment: 'center' },
      { text: 'UNITÁRIO', bold: true, fontSize: 8, color: '#1e293b', fillColor: '#e2e8f0', alignment: 'right' },
      { text: 'TOTAL', bold: true, fontSize: 8, color: '#1e293b', fillColor: '#e2e8f0', alignment: 'right' },
    ];

    const itensRows: TableCell[][] = model.items.map((item, idx) => {
      const isZebra = idx % 2 === 1;
      const bg = isZebra ? '#f8fafc' : '#ffffff';
      return [
        { text: item.nomeItem, fontSize: 8, color: '#1e293b', fillColor: bg },
        { text: item.unidade || 'UN', fontSize: 8, color: '#475569', alignment: 'center', fillColor: bg },
        { text: Number(item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), fontSize: 8, color: '#475569', alignment: 'center', fillColor: bg },
        { text: formatCurrencyBR(item.precoUnit), fontSize: 8, color: '#475569', alignment: 'right', fillColor: bg },
        { text: formatCurrencyBR(item.subtotal), bold: true, fontSize: 8, color: '#0f172a', alignment: 'right', fillColor: bg },
      ];
    });

    content.push({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['*', 35, 45, 75, 80],
        body: [itensHeader, ...itensRows],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cbd5e1',
        vLineColor: () => '#cbd5e1',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 10],
    });

    // 5. Bloco de Totais
    const valorItens = model.items.reduce((acc, it) => acc + it.subtotal, 0);
    const impostosValor =
      model.impostoPercentual > 0
        ? model.precoVenda - (valorItens - model.descontoValor)
        : 0;

    const totaisStack: Content[] = [
      {
        columns: [
          { text: `Total de itens: ${model.items.length}`, fontSize: 8, color: '#64748b' },
          { text: `Subtotal dos Itens: ${formatCurrencyBR(valorItens)}`, fontSize: 8.5, color: '#334155', alignment: 'right' },
        ],
      },
    ];

    if (model.descontoValor > 0) {
      totaisStack.push({
        columns: [
          { text: '' },
          { text: `Desconto Aplicado: - ${formatCurrencyBR(model.descontoValor)}`, fontSize: 8.5, color: '#dc2626', alignment: 'right', bold: true },
        ],
        margin: [0, 2, 0, 0],
      });
    }

    if (model.impostoPercentual > 0) {
      totaisStack.push({
        columns: [
          { text: '' },
          { text: `Impostos (${model.impostoPercentual}%): ${formatCurrencyBR(impostosValor)}`, fontSize: 8.5, color: '#475569', alignment: 'right' },
        ],
        margin: [0, 2, 0, 0],
      });
    }

    totaisStack.push({
      columns: [
        { text: '' },
        {
          text: [
            { text: 'VALOR TOTAL DA PROPOSTA: ', fontSize: 10, bold: true, color: '#1e3a8a' },
            { text: formatCurrencyBR(model.precoVenda), fontSize: 12, bold: true, color: '#1e3a8a' },
          ],
          alignment: 'right',
        },
      ],
      margin: [0, 4, 0, 0],
    });

    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: totaisStack,
              fillColor: '#f8fafc',
              margin: [4, 4, 4, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cbd5e1',
        vLineColor: () => '#cbd5e1',
      },
      margin: [0, 0, 0, 10],
    });

    // 6. Condições de Pagamento e Observações
    if (model.condicaoPagamento || model.observacoes) {
      const notasBody: TableCell[][] = [
        [
          { text: 'CONDIÇÕES COMERCIAIS E OBSERVAÇÕES', bold: true, fontSize: 8.5, color: '#1e3a8a', fillColor: '#f1f5f9' },
        ],
      ];

      const notasItens: Content[] = [];
      if (model.condicaoPagamento) {
        notasItens.push({
          text: [
            { text: 'Forma / Condição de Pagamento: ', bold: true, color: '#0f172a' },
            { text: model.condicaoPagamento, color: '#334155' },
          ],
          fontSize: 8.5,
          margin: [0, 0, 0, 3],
        });
      }

      if (model.observacoes?.trim()) {
        const obsParsed = this.parseHtmlToPdfmakeContent(model.observacoes);
        notasItens.push({
          stack: [
            { text: 'Observações:', bold: true, color: '#0f172a', fontSize: 8.5, margin: [0, 2, 0, 2] },
            ...obsParsed,
          ],
        });
      }

      notasBody.push([
        {
          stack: notasItens,
          margin: [4, 4, 4, 4],
        },
      ]);

      content.push({
        table: {
          widths: ['*'],
          body: notasBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
        },
        margin: [0, 0, 0, 10],
      });
    }

    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [35, 45, 35, 35],
      background: background as any,
      header: header as any,
      footer: footer as any,
      content,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 8.5,
        color: '#1e293b',
      },
    };
  }

  /**
   * Gera o Buffer do PDF utilizando pdfmake
   */
  static async gerarPDF(
    orcamentoId: string,
    marcaDaguaConfig?: MarcaDaguaConfig
  ): Promise<Buffer> {
    const orcamento = await prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      include: {
        cliente: true,
        items: {
          include: {
            material: true,
            kit: true,
          },
        },
      },
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    const model = mapPrismaOrcamentoToPdfModel(orcamento);
    const docDefinition = this.buildDocDefinition(model, marcaDaguaConfig);

    const printer = new PdfPrinter(pdfmakeFonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: Error) => reject(err));
      pdfDoc.end();
    });
  }

  /**
   * Compatibilidade para visualização HTML se solicitada pela rota /pdf/html
   */
  static async gerarHTMLOrcamento(
    orcamentoId: string,
    marcaDaguaConfig?: MarcaDaguaConfig
  ): Promise<string> {
    const { buildOrcamentoPaginatedHtml } = await import('./pdfOrcamentoHtmlBuilder');
    const { estimateItemsPagination } = await import('./pdfOrcamentoPagination.util');

    const orcamento = await prisma.orcamento.findUnique({
      where: { id: orcamentoId },
      include: {
        cliente: true,
        items: {
          include: {
            material: true,
            kit: true,
          },
        },
      },
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    const model = mapPrismaOrcamentoToPdfModel(orcamento);
    const pagination = estimateItemsPagination(model.items.length, Boolean(model.condicaoPagamento));
    return buildOrcamentoPaginatedHtml(model, { opacidadeMarcaDagua: marcaDaguaConfig?.opacidade ?? 0.05 }, pagination, []);
  }
}
