import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import * as nfseService from '../services/nfse.service';
import { type EnviarLoteRpsEnvioInput, type RpsNfse } from '../services/nfse-publica-xml.service';
import { sendDocumentEmail } from '../services/email.service';
import PDFDocument from 'pdfkit';
import { gerarPdfNfseBuffer } from '../services/pdfNfse.service';
import { gerarPdfNfsePuppeteerBuffer } from '../services/pdfNfsePuppeteer.service';

type RpsNfsePayload = RpsNfse & { dataEmissao?: string | Date };

/**
 * POST /api/nfse/enviar-lote
 * Envia lote de RPS (RecepcionarLoteRps). Retorna protocolo para consulta posterior.
 */
export async function enviarLote(req: Request, res: Response): Promise<void> {
  try {
    const { empresaId, numeroLote, prestador, listaRps, incluirIBSCBS } = req.body as {
      empresaId: string;
      numeroLote: number;
      prestador: { cnpj: string; inscricaoMunicipal: string };
      listaRps: RpsNfsePayload[];
      incluirIBSCBS?: boolean;
    };
    const ambiente = (req.body.ambiente === '1' ? '1' : '2') as '1' | '2';

    if (!empresaId || !numeroLote || !prestador || !listaRps?.length) {
      res.status(400).json({
        success: false,
        message: 'empresaId, numeroLote, prestador e listaRps são obrigatórios'
      });
      return;
    }

    const listaRpsNormalizada = (listaRps || []).map((r: RpsNfsePayload) => ({
      ...r,
      dataEmissao: r.dataEmissao ? new Date(r.dataEmissao as string) : new Date()
    })) as RpsNfse[];

    const input: EnviarLoteRpsEnvioInput = {
      numeroLote,
      prestador: { cnpj: prestador.cnpj, inscricaoMunicipal: prestador.inscricaoMunicipal },
      listaRps: listaRpsNormalizada,
      incluirIBSCBS: !!incluirIBSCBS
    };

    const resultado = await nfseService.enviarLoteRps(empresaId, input, ambiente);

    if (!resultado.sucesso) {
      res.status(400).json({
        success: false,
        message: resultado.erro,
        data: resultado.nfseId ? { nfseId: resultado.nfseId } : undefined
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        protocolo: resultado.protocolo,
        nfseId: resultado.nfseId
      },
      message: 'Lote enviado. Use o protocolo para consultar o resultado.'
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * POST /api/nfse/consultar-protocolo
 * Consulta resultado do processamento do lote pelo protocolo.
 */
export async function consultarProtocolo(req: Request, res: Response): Promise<void> {
  try {
    const { empresaId, protocolo, ambiente = '2' } = req.body as {
      empresaId: string;
      protocolo: string;
      ambiente?: '1' | '2';
    };

    if (!empresaId || !protocolo) {
      res.status(400).json({
        success: false,
        message: 'empresaId e protocolo são obrigatórios'
      });
      return;
    }

    const amb = (ambiente === '1' ? '1' : '2') as '1' | '2';
    const resultado = await nfseService.consultarProtocolo(empresaId, protocolo, amb);

    if (!resultado.sucesso) {
      res.status(400).json({ success: false, message: resultado.erro });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        situacao: resultado.situacao,
        listaNfse: resultado.listaNfse
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * POST /api/nfse/cancelar
 * Cancela NFS-e (CancelarNfse). Justificativa mínima 15 caracteres.
 */
export async function cancelar(req: Request, res: Response): Promise<void> {
  try {
    const { empresaId, numeroNfse, justificativa, ambiente = '2' } = req.body as {
      empresaId: string;
      numeroNfse: string;
      justificativa: string;
      ambiente?: '1' | '2';
    };

    if (!empresaId || !numeroNfse || !justificativa) {
      res.status(400).json({
        success: false,
        message: 'empresaId, numeroNfse e justificativa são obrigatórios'
      });
      return;
    }

    if (justificativa.trim().length < 15) {
      res.status(400).json({
        success: false,
        message: 'Justificativa deve ter no mínimo 15 caracteres'
      });
      return;
    }

    const amb = (ambiente === '1' ? '1' : '2') as '1' | '2';
    const resultado = await nfseService.cancelarNfsePorNumero(
      empresaId,
      numeroNfse,
      justificativa,
      amb
    );

    if (!resultado.sucesso) {
      res.status(400).json({ success: false, message: resultado.erro });
      return;
    }

    res.status(200).json({ success: true, message: 'NFS-e cancelada com sucesso' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * GET /api/nfse
 * Lista NFS-e (por empresa e/ou situação).
 */
export async function listar(req: Request, res: Response): Promise<void> {
  try {
    const empresaId = req.query.empresaId as string | undefined;
    const situacao = req.query.situacao as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const lista = await nfseService.listarNfse(empresaId, situacao, limit);

    res.status(200).json({ success: true, data: lista });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * GET /api/nfse/dados-venda/:vendaId
 * Busca dados da venda (orçamento aprovado) para preencher a emissão de NFS-e.
 * Query: empresaId (obrigatório). Considera apenas itens do orçamento com tipo SERVICO.
 */
export async function dadosVenda(req: Request, res: Response): Promise<void> {
  try {
    const vendaId = req.params.vendaId;
    const empresaId = req.query.empresaId as string;

    if (!vendaId || !empresaId) {
      res.status(400).json({
        success: false,
        message: 'vendaId (params) e empresaId (query) são obrigatórios'
      });
      return;
    }

    const resultado = await nfseService.buscarDadosVendaParaNfse(vendaId, empresaId);

    if ('erro' in resultado) {
      res.status(400).json({ success: false, message: resultado.erro });
      return;
    }

    res.status(200).json({ success: true, data: resultado });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * PATCH /api/nfse/configurar-numeracao
 * Atualiza último RPS enviado e/ou série RPS da empresa (sincronização com site da prefeitura).
 * Body: { empresaId: string; ultimoRpsEnviado?: number; serieRps?: string }
 */
export async function configurarNumeracaoRps(req: Request, res: Response): Promise<void> {
  try {
    const { empresaId, ultimoRpsEnviado, serieRps } = req.body as {
      empresaId: string;
      ultimoRpsEnviado?: number;
      serieRps?: string;
    };
    if (!empresaId) {
      res.status(400).json({ success: false, message: 'empresaId é obrigatório' });
      return;
    }
    const resultado = await nfseService.configurarNumeracaoRps(empresaId, {
      ultimoRpsEnviado,
      serieRps
    });
    if (!resultado.sucesso) {
      res.status(400).json({ success: false, message: resultado.erro });
      return;
    }
    res.status(200).json({ success: true, message: 'Numeração RPS atualizada' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * GET /api/nfse/:id
 * Busca uma NFS-e por ID.
 */
export async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const nfse = await prisma.nfse.findUnique({
      where: { id },
      include: { empresaFiscal: { select: { razaoSocial: true, cnpj: true } } }
    });
    if (!nfse) {
      res.status(404).json({ success: false, message: 'NFS-e não encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: nfse });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * GET /api/nfse/:id/xml
 * Retorna o XML do lote (xmlEnvio) para download.
 */
export async function getXml(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const nfse = await prisma.nfse.findUnique({
      where: { id },
      select: { xmlEnvio: true, numeroNfse: true }
    });
    if (!nfse || !nfse.xmlEnvio) {
      res.status(404).json({ success: false, message: 'NFS-e não encontrada ou sem XML' });
      return;
    }
    const filename = `nfse-${nfse.numeroNfse || id}.xml`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(nfse.xmlEnvio);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * GET /api/nfse/:id/pdf
 * Gera PDF simplificado da NFS-e (número, tomador, valor, data).
 */
export async function getPdf(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const nfse = await prisma.nfse.findUnique({
      where: { id },
      include: { empresaFiscal: { select: { razaoSocial: true } } }
    });
    if (!nfse) {
      res.status(404).json({ success: false, message: 'NFS-e não encontrada' });
      return;
    }
    // Prefer HTML+Puppeteer renderer for pixel-perfect DANFE
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await gerarPdfNfsePuppeteerBuffer(id);
    } catch (e) {
      // fallback to PDFKit renderer
      console.warn('[NFS-e] Puppeteer PDF generation failed, falling back to PDFKit:', e instanceof Error ? e.message : String(e));
      pdfBuffer = await gerarPdfNfseBuffer(id);
    }
    const numero = nfse.numeroNfse || id;
    const filename = `Nota_Fiscl_No_${numero}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * POST /api/nfse/:id/enviar-email
 * Envia NFS-e (PDF e XML) por email ao destinatário. Body: { to: string }.
 */
export async function enviarEmail(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const { to } = req.body as { to: string };
    if (!to || typeof to !== 'string') {
      res.status(400).json({ success: false, message: 'E-mail do destinatário (to) é obrigatório' });
      return;
    }

    const nfse = await prisma.nfse.findUnique({
      where: { id },
      include: { empresaFiscal: { select: { razaoSocial: true } } }
    });
    if (!nfse) {
      res.status(404).json({ success: false, message: 'NFS-e não encontrada' });
      return;
    }

    const attachments: Array<{ filename: string; content: Buffer }> = [];

    if (nfse.xmlEnvio) {
      const numeroXml = nfse.numeroNfse || id;
      attachments.push({
        filename: `Nota_Fiscl_No_${numeroXml}.xml`,
        content: Buffer.from(nfse.xmlEnvio, 'utf-8')
      });
    }

    // Generate PDF (prefer HTML+Puppeteer). Attach file with numeroNfse in filename.
    let pdfBufferResult: Buffer;
    try {
      pdfBufferResult = await gerarPdfNfsePuppeteerBuffer(id);
    } catch (e) {
      console.warn('[NFS-e] Puppeteer PDF generation failed for email attachment, falling back to PDFKit:', e instanceof Error ? e.message : String(e));
      try {
        pdfBufferResult = await gerarPdfNfseBuffer(id);
      } catch (err) {
        console.error('Falha ao gerar PDF da NFS-e para envio por email:', err);
        res.status(500).json({ success: false, message: 'Falha ao gerar anexo do PDF' });
        return;
      }
    }
    const numeroPdf = nfse.numeroNfse || id;
    attachments.push({
      filename: `Nota_Fiscl_No_${numeroPdf}.pdf`,
      content: pdfBufferResult
    });

    const numero = nfse.numeroNfse || id;
    const bodyHtml = `
      <p>Prezado(a),</p>
      <p>Segue em anexo a NFS-e ${numero}.</p>
      <p>Prestador: ${nfse.empresaFiscal?.razaoSocial || '-'}</p>
      <p>Valor: R$ ${nfse.valorTotal != null ? Number(nfse.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</p>
      <p>Att.,<br/>S3E Engenharia - Setor Fiscal | Telefone: (47) 3083-8361</p>
    `;
    await sendDocumentEmail(to, `NFS-e Nº ${numero} - S3E Engenharia`, bodyHtml, attachments);

    res.status(200).json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, message: msg });
  }
}
