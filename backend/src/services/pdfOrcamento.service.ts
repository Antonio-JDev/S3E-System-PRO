import { prisma } from '../lib/prisma';
import {
  buildDescriptionCombinedHtml,
  buildOrcamentoPaginatedHtml,
  mapPrismaOrcamentoToPdfModel,
} from './pdfOrcamentoHtmlBuilder';
import { estimateItemsPagination } from './pdfOrcamentoPagination.util';
import {
  buildOrcamentoDocDefinition,
  resolvePdfmakeSafeImage,
  splitHtmlIntoPageFragments,
  type PdfMakeMarcaDagua,
} from './pdfOrcamentoPdfmake.util';

import path from 'path';

// pdfmake 0.3 exporta uma instância (não o construtor PdfPrinter).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfmake = require('pdfmake');

function robotoFontFile(fileName: string): string {
  return path.join(path.dirname(require.resolve('pdfmake/package.json')), 'fonts', 'Roboto', fileName);
}

pdfmake.setFonts({
  Roboto: {
    normal: robotoFontFile('Roboto-Regular.ttf'),
    bold: robotoFontFile('Roboto-Medium.ttf'),
    italics: robotoFontFile('Roboto-Italic.ttf'),
    bolditalics: robotoFontFile('Roboto-MediumItalic.ttf'),
  },
});
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((filePath: string) => {
  const normalized = String(filePath).replace(/\\/g, '/');
  return normalized.includes('/pdfmake/fonts/Roboto/') || normalized.includes('/uploads/');
});

export type MarcaDaguaConfig = PdfMakeMarcaDagua;

export class PDFOrcamentoService {
  /**
   * Gera o Buffer do PDF utilizando pdfmake.
   * A assinatura permanece (id, marca d'água opcional) => Buffer para WhatsApp e download.
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
    const docDefinition = await buildOrcamentoDocDefinition(model, marcaDaguaConfig);

    const pdf = pdfmake.createPdf(docDefinition);
    const buffer = await pdf.getBuffer();
    return Buffer.from(buffer);
  }

  /**
   * HTML de preview com a mesma folha timbrada e a descrição técnica do orçamento.
   */
  static async gerarHTMLOrcamento(
    orcamentoId: string,
    marcaDaguaConfig?: MarcaDaguaConfig
  ): Promise<string> {
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
    const folhaTimbradaUrl = await resolvePdfmakeSafeImage(marcaDaguaConfig?.folhaTimbradaUrl);
    const fragments = splitHtmlIntoPageFragments(buildDescriptionCombinedHtml(model));

    return buildOrcamentoPaginatedHtml(
      model,
      {
        opacidadeMarcaDagua: marcaDaguaConfig?.opacidade ?? 0.05,
        ...(folhaTimbradaUrl ? { folhaTimbradaUrl } : {}),
      },
      pagination,
      fragments
    );
  }
}
