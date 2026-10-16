/**
 * Romaneio de transporte (OS Quadros e Painéis) em pdfmake,
 * com a mesma folha timbrada e margens do PDF de orçamento.
 */
import path from 'path';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { prisma } from '../lib/prisma';
import { resolveLetterheadForUser } from './pdfLetterhead.service';
import {
  buildBackground,
  ORCAMENTO_PDF_PAGE_MARGINS,
  resolvePdfmakeSafeImage,
  type PdfMakeMarcaDagua,
} from './pdfOrcamentoPdfmake.util';
import { extrairEntregaQuadro, isOsTipoQuadrosPainels } from '../utils/osEntregaQuadro.util';
import {
  conteudoRomaneio,
  montarModeloRomaneio,
  nomeArquivoRomaneioOs,
  type RomaneioQuadroModel,
} from './pdfRomaneioQuadro.layout';

export {
  conteudoRomaneio,
  formatarCep,
  formatarDocumento,
  montarModeloRomaneio,
  montarParteCliente,
  montarParteEmpresa,
  nomeArquivoRomaneioOs,
} from './pdfRomaneioQuadro.layout';
export type {
  ClienteRomaneioFonte,
  EmpresaRomaneioFonte,
  ParteRomaneio,
  RomaneioQuadroModel,
} from './pdfRomaneioQuadro.layout';

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

export async function buildRomaneioDocDefinition(
  model: RomaneioQuadroModel,
  marcaDagua?: PdfMakeMarcaDagua,
): Promise<TDocumentDefinitions> {
  const letterhead = await resolvePdfmakeSafeImage(marcaDagua?.folhaTimbradaUrl);
  const logo = letterhead ? null : await resolvePdfmakeSafeImage(marcaDagua?.logoUrl);
  const opacidade =
    typeof marcaDagua?.opacidade === 'number' && Number.isFinite(marcaDagua.opacidade)
      ? Math.min(1, Math.max(0, marcaDagua.opacidade))
      : 0.05;

  return {
    pageSize: 'A4',
    pageMargins: ORCAMENTO_PDF_PAGE_MARGINS,
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
    background: ((_currentPage: number, pageSize: { width: number; height: number }) =>
      buildBackground(pageSize, letterhead, logo, opacidade)) as TDocumentDefinitions['background'],
    content: conteudoRomaneio(model) as Content[],
  };
}

export async function gerarPdfRomaneioQuadro(
  projetoId: string,
  userId?: string | null,
): Promise<{ buffer: Buffer; filename: string; empresaFiscalInformada: boolean }> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      entregaQuadro: true,
      cliente: {
        select: {
          nome: true,
          endereco: true,
          numero: true,
          bairro: true,
          cidade: true,
          estado: true,
          cep: true,
          cpfCnpj: true,
          inscricaoEstadual: true,
          telefone: true,
        },
      },
      orcamento: {
        select: {
          numeroSequencial: true,
          empresaFiscal: {
            select: {
              razaoSocial: true,
              endereco: true,
              numero: true,
              complemento: true,
              bairro: true,
              cidade: true,
              estado: true,
              cep: true,
              cnpj: true,
              inscricaoEstadual: true,
              telefone: true,
            },
          },
        },
      },
    },
  });

  if (!projeto) throw new Error('Projeto não encontrado');
  if (!isOsTipoQuadrosPainels(projeto.tipo)) {
    throw new Error('Romaneio só se aplica a OS do tipo Quadros e Painéis');
  }

  const entrega = extrairEntregaQuadro(projeto.entregaQuadro);
  let responsavelNome = entrega?.responsavelEntregaNome;
  if (!responsavelNome && entrega?.responsavelEntregaId) {
    const user = await prisma.user.findUnique({
      where: { id: entrega.responsavelEntregaId },
      select: { name: true },
    });
    responsavelNome = user?.name;
  }

  const model = montarModeloRomaneio({
    numeroOs: projeto.orcamento?.numeroSequencial,
    tituloOs: projeto.titulo,
    entrega,
    empresa: projeto.orcamento?.empresaFiscal,
    cliente: projeto.cliente,
    responsavelNome,
  });

  const letterhead = await resolveLetterheadForUser(userId);
  const doc = await buildRomaneioDocDefinition(model, {
    tipo: 'template',
    opacidade: letterhead.opacidade,
    ...(letterhead.folhaTimbradaDataUrl ? { folhaTimbradaUrl: letterhead.folhaTimbradaDataUrl } : {}),
  });

  const pdf = pdfmake.createPdf(doc);
  const raw = await pdf.getBuffer();
  return {
    buffer: Buffer.from(raw),
    filename: nomeArquivoRomaneioOs(projeto.orcamento?.numeroSequencial),
    empresaFiscalInformada: Boolean(projeto.orcamento?.empresaFiscal),
  };
}
