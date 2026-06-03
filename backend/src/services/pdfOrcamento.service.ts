import { prisma } from '../lib/prisma';
import puppeteer from 'puppeteer';
import {
  buildDescriptionCombinedHtml,
  buildDescriptionMeasureHtml,
  buildOrcamentoMeasureHtml,
  buildOrcamentoPaginatedHtml,
  mapPrismaOrcamentoToPdfModel,
  type OrcamentoPdfHtmlOptions,
} from './pdfOrcamentoHtmlBuilder';
import {
  buildMeasureDescriptionPaginationEvalExpression,
} from './pdfOrcamentoDescriptionPagination.util';
import {
  buildMeasurePaginationEvalExpression,
  estimateItemsPagination,
  PDF_CONTENT_HEIGHT_PX,
  PDF_RESERVE_PADDING_PX,
  type OrcamentoItemsPagination,
} from './pdfOrcamentoPagination.util';
import type { Page } from 'puppeteer';

export { normalizeEmptyParagraphsForPdf, normalizeListItemsForPdf } from './pdfOrcamentoHtml.util';

async function waitForPageImages(page: Page, timeoutMs = 12_000): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const imgs = Array.from(document.images);
        if (imgs.length === 0) return true;
        return imgs.every((img) => img.complete);
      },
      { timeout: timeoutMs }
    );
  } catch {
    // Segue com o que carregou (URLs quebradas não travam o PDF).
  }
  await new Promise((resolve) => setTimeout(resolve, 350));
}

export class PDFOrcamentoService {
  private static htmlOptions(marcaDaguaConfig?: {
    opacidade?: number;
    folhaTimbradaUrl?: string;
  }): OrcamentoPdfHtmlOptions {
    return {
      folhaTimbradaUrl: marcaDaguaConfig?.folhaTimbradaUrl,
      opacidadeMarcaDagua: marcaDaguaConfig?.opacidade ?? 0.05,
    };
  }

  /**
   * Gera PDF com paginação página a página (igual OrcamentoPrintable no modal).
   */
  static async gerarPDF(
    orcamentoId: string,
    marcaDaguaConfig?: {
      tipo: 'imagem' | 'texto' | 'template';
      opacidade?: number;
      posicao?: string;
      tamanho?: string;
      logoUrl?: string;
      folhaTimbradaUrl?: string;
    }
  ): Promise<Buffer> {
    const { model, opts } = await this.loadOrcamentoModel(orcamentoId, marcaDaguaConfig);

    const launchOpts: Parameters<typeof puppeteer.launch>[0] = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
    if (execPath) {
      launchOpts.executablePath = execPath;
    }

    const browser = await puppeteer.launch(launchOpts);

    try {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (['document', 'stylesheet', 'font', 'image'].includes(request.resourceType())) {
          request.continue();
        } else {
          request.abort();
        }
      });

      const measureHtml = buildOrcamentoMeasureHtml(model, opts);
      await page.setContent(measureHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForPageImages(page);

      const pagination = (await page.evaluate(
        buildMeasurePaginationEvalExpression(PDF_CONTENT_HEIGHT_PX, PDF_RESERVE_PADDING_PX)
      )) as OrcamentoItemsPagination;

      const combinedDescription = buildDescriptionCombinedHtml(model);
      let descriptionPageFragments: string[] = [];
      if (combinedDescription) {
        const descMeasureHtml = buildDescriptionMeasureHtml(combinedDescription, opts);
        await page.setContent(descMeasureHtml, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        await waitForPageImages(page, 20_000);
        const descResult = (await page.evaluate(
          buildMeasureDescriptionPaginationEvalExpression()
        )) as { pages: string[] };
        descriptionPageFragments = Array.isArray(descResult?.pages) ? descResult.pages : [];
        if (descriptionPageFragments.length === 0 && combinedDescription) {
          descriptionPageFragments = [combinedDescription];
        }
      }

      const finalHtml = buildOrcamentoPaginatedHtml(
        model,
        opts,
        pagination,
        descriptionPageFragments
      );
      await page.setContent(finalHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForPageImages(page, 20_000);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * HTML paginado para preview (estimativa de alturas; PDF usa medição real no Puppeteer).
   */
  static async gerarHTMLOrcamento(
    orcamentoId: string,
    marcaDaguaConfig?: {
      tipo: 'imagem' | 'texto' | 'template';
      opacidade?: number;
      posicao?: string;
      tamanho?: string;
      logoUrl?: string;
      folhaTimbradaUrl?: string;
    }
  ) {
    const { model, opts } = await this.loadOrcamentoModel(orcamentoId, marcaDaguaConfig);
    const pagination = estimateItemsPagination(
      model.items.length,
      Boolean(model.condicaoPagamento)
    );
    const combinedDescription = buildDescriptionCombinedHtml(model);
    const descriptionPageFragments = combinedDescription ? [combinedDescription] : [];
    const html = buildOrcamentoPaginatedHtml(
      model,
      opts,
      pagination,
      descriptionPageFragments
    );
    console.log(
      '✅ HTML do orçamento gerado (estrutura pdf-page por página, alinhado ao OrcamentoPrintable)'
    );
    return html;
  }

  private static async loadOrcamentoModel(
    orcamentoId: string,
    marcaDaguaConfig?: { opacidade?: number; folhaTimbradaUrl?: string }
  ) {
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
    const opts = this.htmlOptions(marcaDaguaConfig);
    return { model, opts };
  }

  static gerarMarcaDaguaS3E(opacidade: number = 0.05) {
    return {
      tipo: 'template' as const,
      opacidade,
      template: 'S3E_ENGENHARIA',
    };
  }
}
