import * as fs from 'fs';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import nfeService from '../services/nfe.service';
import NFeDanfeService from '../services/nfe-danfe.service';
import { CryptoUtil } from '../utils/crypto.util';
import { resolveCertificadoPath } from '../utils/certificadoPath.util';
import { NFeSignatureService } from '../services/nfe-signature.service';
import { NFeSoapService } from '../services/nfe-soap.service';
import { sendDocumentEmail } from '../services/email.service';

export class NFeController {
  /**
   * GET /api/nfe
   * Listar todas as notas fiscais (mock)
   */
  static async listarNotasFiscais(req: Request, res: Response): Promise<void> {
    try {
      const notas = await prisma.notaFiscal.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      res.status(200).json({
        success: true,
        data: notas,
        message: 'Lista de NF-es'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao listar notas fiscais'
      });
    }
  }

  /**
   * GET /api/nfe/:id
   * Buscar nota fiscal específica (mock)
   */
  static async buscarNotaFiscal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const nota = await prisma.notaFiscal.findUnique({
        where: { id }
      });

      if (!nota) {
        res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: nota,
        message: 'Nota fiscal encontrada'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar nota fiscal'
      });
    }
  }

  /**
   * POST /api/nfe
   * Criar nota fiscal (mock - usar /api/nfe/emitir para emissão SEFAZ)
   */
  static async criarNotaFiscal(req: Request, res: Response): Promise<void> {
    try {
      res.status(501).json({
        success: false,
        message: 'Use POST /api/nfe/emitir para emissão via SEFAZ'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao criar nota fiscal'
      });
    }
  }

  /**
   * PUT /api/nfe/:id
   * Atualizar nota fiscal (mock)
   */
  static async atualizarNotaFiscal(req: Request, res: Response): Promise<void> {
    try {
      res.status(501).json({
        success: false,
        message: 'Método não implementado'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar nota fiscal'
      });
    }
  }

  /**
   * DELETE /api/nfe/:id
   * Cancelar nota fiscal (mock - usar /api/nfe/cancelar para cancelamento SEFAZ)
   */
  static async cancelarNotaFiscal(req: Request, res: Response): Promise<void> {
    try {
      res.status(501).json({
        success: false,
        message: 'Use POST /api/nfe/cancelar para cancelamento via SEFAZ'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao cancelar nota fiscal'
      });
    }
  }

  /**
   * POST /api/nfe/validar
   * Validar dados de nota fiscal (mock)
   */
  static async validarNotaFiscal(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        valido: true,
        message: 'Validação mock - sempre válido'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro ao validar nota fiscal'
      });
    }
  }

  /**
   * POST /api/nfe/emitir
   * Emitir NF-e a partir de um pedido
   */
  static async emitirNFe(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoId, empresaId, ambiente, cfop, naturezaOperacao, serie } = req.body;

      if (!pedidoId || !empresaId) {
        res.status(400).json({
          success: false,
          message: 'Pedido ID e Empresa ID são obrigatórios'
        });
        return;
      }

      console.log(`\n📋 Solicitação de emissão de NF-e`);
      console.log(`   Pedido: ${pedidoId}`);
      console.log(`   Empresa: ${empresaId}`);
      if (ambiente) {
        console.log(`   Ambiente (frontend): ${ambiente === '1' ? 'Produção' : 'Homologação'}`);
      }
      if (cfop) {
        console.log(`   CFOP: ${cfop}`);
      }
      if (naturezaOperacao) {
        console.log(`   Natureza: ${naturezaOperacao}`);
      }
      if (serie) {
        console.log(`   Série: ${serie}`);
      }

      const resultado = await nfeService.processarEmissao(
        pedidoId,
        empresaId,
        ambiente === '1' ? '1' : ambiente === '2' ? '2' : undefined,
        cfop,
        naturezaOperacao,
        serie
      );

      res.status(200).json({
        success: true,
        data: resultado,
        message: 'NF-e emitida com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro ao emitir NF-e:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao emitir NF-e',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/emitir-fracionado
   * Emitir N NF-es (uma por fração) para um pedido de venda, com clientes e valores distintos.
   */
  static async emitirFracionado(req: Request, res: Response): Promise<void> {
    try {
      const { vendaId, empresaId, ambiente, cfop, naturezaOperacao, serie, fracoes } = req.body;

      if (!vendaId || !empresaId || !Array.isArray(fracoes) || fracoes.length === 0) {
        res.status(400).json({
          success: false,
          message: 'vendaId, empresaId e fracoes (array de { clienteId, valor, dataVencimento }) são obrigatórios'
        });
        return;
      }

      const ambienteNorm = ambiente === '1' ? '1' : '2';
      const resultado = await nfeService.processarEmissaoFracionada(
        vendaId,
        empresaId,
        ambienteNorm,
        cfop || '5101',
        naturezaOperacao || 'Venda de Mercadoria',
        serie || '1',
        fracoes
      );

      res.status(200).json({
        success: true,
        data: resultado,
        message: `Faturamento fracionado concluído: ${resultado.notas.length} NF-e(s) emitida(s). Valor faturado: R$ ${resultado.valorFaturado.toFixed(2)}`
      });
    } catch (error: any) {
      console.error('❌ Erro ao emitir NF-e fracionado:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao emitir faturamento fracionado',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/cancelar
   * Cancelar NF-e autorizada
   */
  static async cancelarNFe(req: Request, res: Response): Promise<void> {
    try {
      const { chaveAcesso, justificativa, empresaId, ambiente = '2' } = req.body;

      if (!chaveAcesso || !justificativa || !empresaId) {
        res.status(400).json({
          success: false,
          message: 'Chave de acesso, justificativa e Empresa ID são obrigatórios'
        });
        return;
      }

      if (justificativa.length < 15) {
        res.status(400).json({
          success: false,
          message: 'Justificativa deve ter no mínimo 15 caracteres'
        });
        return;
      }

      console.log(`\n🚫 Solicitação de cancelamento de NF-e`);
      console.log(`   Chave: ${chaveAcesso}`);
      console.log(`   Justificativa: ${justificativa}`);

      const resultado = await nfeService.cancelarNFe(
        chaveAcesso,
        justificativa,
        empresaId,
        ambiente === '1' || ambiente === '2' ? ambiente : '2'
      );

      res.status(200).json({
        success: true,
        data: resultado,
        message: 'NF-e cancelada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro ao cancelar NF-e:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao cancelar NF-e',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/corrigir
   * Enviar Carta de Correção (CC-e)
   */
  static async corrigirNFe(req: Request, res: Response): Promise<void> {
    try {
      const { chaveAcesso, textoCorrecao, sequencia = 1, empresaId, ambiente = '2' } = req.body;

      if (!chaveAcesso || !textoCorrecao || !empresaId) {
        res.status(400).json({
          success: false,
          message: 'Chave de acesso, texto de correção e Empresa ID são obrigatórios'
        });
        return;
      }

      if (textoCorrecao.length < 15) {
        res.status(400).json({
          success: false,
          message: 'Texto da correção deve ter no mínimo 15 caracteres'
        });
        return;
      }

      console.log(`\n📝 Solicitação de Carta de Correção`);
      console.log(`   Chave: ${chaveAcesso}`);
      console.log(`   Correção: ${textoCorrecao}`);
      console.log(`   Sequência: ${sequencia}`);

      const resultado = await nfeService.corrigirNFe(
        chaveAcesso,
        textoCorrecao,
        sequencia,
        empresaId,
        ambiente === '1' || ambiente === '2' ? ambiente : '2'
      );

      res.status(200).json({
        success: true,
        data: resultado,
        message: 'Carta de Correção registrada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro ao enviar CC-e:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao enviar Carta de Correção',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/inutilizar
   * Inutilizar faixa de numeração de NF-e
   */
  static async inutilizarNumeracao(req: Request, res: Response): Promise<void> {
    try {
      const {
        empresaId,
        ano,
        modelo = '55',
        serie,
        numeroInicial,
        numeroFinal,
        justificativa,
        ambiente = '2'
      } = req.body;

      if (!empresaId || !ano || !serie || !numeroInicial || !numeroFinal || !justificativa) {
        res.status(400).json({
          success: false,
          message:
            'empresaId, ano, série, número inicial, número final e justificativa são obrigatórios'
        });
        return;
      }

      if (justificativa.length < 15) {
        res.status(400).json({
          success: false,
          message: 'Justificativa deve ter no mínimo 15 caracteres'
        });
        return;
      }

      console.log('\n🧾 Solicitação de inutilização de numeração de NF-e');
      console.log(`   Empresa: ${empresaId}`);
      console.log(`   Ano: ${ano} Modelo: ${modelo} Série: ${serie}`);
      console.log(`   Faixa: ${numeroInicial} até ${numeroFinal}`);

      const ambienteFinal: '1' | '2' =
        ambiente === '1' || ambiente === '2' ? ambiente : '2';

      const resultado = await nfeService.inutilizarNumeracao(empresaId, {
        ano: String(ano),
        modelo: String(modelo),
        serie: String(serie),
        numeroInicial: String(numeroInicial),
        numeroFinal: String(numeroFinal),
        justificativa,
        ambiente: ambienteFinal
      });

      res.status(200).json({
        success: true,
        data: resultado,
        message: 'Inutilização de numeração processada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro ao inutilizar numeração de NF-e:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao inutilizar numeração de NF-e',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/manifestar
   * Manifestação do destinatário para uma NF-e
   */
  static async manifestarDestinatario(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId, chaveAcesso, tipoEvento, justificativa, ambiente = '2' } = req.body;

      if (!empresaId || !chaveAcesso || !tipoEvento) {
        res.status(400).json({
          success: false,
          message: 'empresaId, chaveAcesso e tipoEvento são obrigatórios'
        });
        return;
      }

      if (chaveAcesso.length !== 44) {
        res.status(400).json({
          success: false,
          message: 'Chave de acesso inválida (deve ter 44 dígitos)'
        });
        return;
      }

      const tiposPermitidos = ['210200', '210210', '210220', '210240'];
      if (!tiposPermitidos.includes(String(tipoEvento))) {
        res.status(400).json({
          success: false,
          message:
            'tipoEvento inválido. Use: 210200 (Confirmação), 210210 (Ciência), 210220 (Desconhecimento) ou 210240 (Operação não realizada)'
        });
        return;
      }

      if (String(tipoEvento) === '210240' && (!justificativa || justificativa.length < 15)) {
        res.status(400).json({
          success: false,
          message:
            'Justificativa é obrigatória e deve ter no mínimo 15 caracteres para Operação não realizada (210240)'
        });
        return;
      }

      console.log('\n📩 Solicitação de manifestação do destinatário');
      console.log(`   Empresa: ${empresaId}`);
      console.log(`   Chave: ${chaveAcesso}`);
      console.log(`   Tipo de evento: ${tipoEvento}`);

      const ambienteFinal: '1' | '2' =
        ambiente === '1' || ambiente === '2' ? ambiente : '2';

      const resultado = await nfeService.manifestarDestinatario(empresaId, {
        chaveAcesso,
        tipoEvento: tipoEvento as any,
        justificativa,
        ambiente: ambienteFinal
      });

      res.status(200).json({
        success: true,
        data: resultado,
        message: 'Manifestação registrada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro na manifestação do destinatário:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro na manifestação do destinatário',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/danfe-preview
   * Gera um DANFE em PDF a partir de um XML procNFe enviado no body
   * Útil para visualização após a emissão (usando o procNFe retornado pelo serviço).
   */
  static async gerarDanfe(req: Request, res: Response): Promise<void> {
    try {
      const { procNFe } = req.body;

      if (!procNFe || typeof procNFe !== 'string') {
        res.status(400).json({
          success: false,
          message: 'XML procNFe é obrigatório para geração de DANFE'
        });
        return;
      }

      console.log('\n🧾 Solicitação de geração de DANFE (preview)');

      const pdfBuffer = await NFeDanfeService.gerarDanfe(procNFe);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.setHeader('Content-Disposition', 'inline; filename="Nota_Fiscl_Preview.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('❌ Erro ao gerar DANFE:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao gerar DANFE',
        error: error.message
      });
    }
  }

  /**
   * GET /api/nfe/:id/danfe
   * Gera DANFE em PDF a partir da nota fiscal salva (usa xmlNFe)
   */
  static async gerarDanfePorNota(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const nota = await prisma.notaFiscal.findUnique({
        where: { id }
      });

      if (!nota || !nota.xmlNFe) {
        res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada ou sem XML associado'
        });
        return;
      }

      console.log(`\n🧾 Gerando DANFE para NotaFiscal: ${id}`);

      const numero = nota.numero || id;
      const pdfBuffer = await NFeDanfeService.gerarDanfe(nota.xmlNFe, String(numero));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="NF-e_${numero}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('❌ Erro ao gerar DANFE por nota:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao gerar DANFE da nota fiscal',
        error: error.message
      });
    }
  }

  /**
   * GET /api/nfe/notas/:id/xml
   * Retorna o XML da NF-e para download.
   */
  static async getXmlNota(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const nota = await prisma.notaFiscal.findUnique({
        where: { id },
        select: { xmlNFe: true, numero: true, chaveAcesso: true }
      });
      if (!nota || !nota.xmlNFe) {
        res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada ou sem XML associado'
        });
        return;
      }
      // Nome do arquivo: NFe-{chave_de_acesso}.xml (padrão SEFAZ)
      let chave = nota.chaveAcesso ?? null;
      if (!chave && nota.xmlNFe) {
        const match = nota.xmlNFe.match(/Id="NFe(\d{44})"/) ?? nota.xmlNFe.match(/<chNFe>(\d{44})<\/chNFe>/);
        if (match) chave = match[1];
      }
      const filename = chave ? `NFe-${chave}.xml` : `NFe-${nota.numero ?? id}.xml`;
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(nota.xmlNFe);
    } catch (error: any) {
      console.error('❌ Erro ao obter XML da nota:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao obter XML da NF-e',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/notas/:id/enviar-email
   * Envia NF-e (DANFE PDF e XML) por email ao destinatário. Body: { to: string }.
   */
  static async enviarEmailNota(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { to } = req.body as { to?: string };
      if (!to || typeof to !== 'string') {
        res.status(400).json({
          success: false,
          message: 'E-mail do destinatário (to) é obrigatório'
        });
        return;
      }

      const nota = await prisma.notaFiscal.findUnique({
        where: { id },
        select: { xmlNFe: true, numero: true, valorTotal: true, chaveAcesso: true }
      });
      if (!nota || !nota.xmlNFe) {
        res.status(404).json({
          success: false,
          message: 'Nota fiscal não encontrada ou sem XML associado'
        });
        return;
      }

      const numero = nota.numero || id;
      let chaveAcesso = nota.chaveAcesso ?? null;
      if (!chaveAcesso && nota.xmlNFe) {
        const m = nota.xmlNFe.match(/Id="NFe(\d{44})"/) ?? nota.xmlNFe.match(/<chNFe>(\d{44})<\/chNFe>/);
        if (m) chaveAcesso = m[1];
      }
      const nomeXml = chaveAcesso ? `NFe-${chaveAcesso}.xml` : `Nota_Fiscl_No_${numero}.xml`;

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await NFeDanfeService.gerarDanfe(nota.xmlNFe, String(numero));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Falha ao gerar DANFE (PDFKit):', errMsg, err);
        res.status(500).json({ success: false, message: `Falha ao gerar DANFE: ${errMsg}` });
        return;
      }
      const attachments: Array<{ filename: string; content: Buffer }> = [
        { filename: `Nota_Fiscl_No_${numero}.pdf`, content: pdfBuffer },
        { filename: nomeXml, content: Buffer.from(nota.xmlNFe, 'utf-8') }
      ];

      const bodyHtml = `
        <p>Prezado(a),</p>
        <p>Segue em anexo a NF-e ${numero}.</p>
        <p>Valor: R$ ${nota.valorTotal != null ? Number(nota.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</p>
        <p>Att.,<br/>S3E Engenharia - Setor Fiscal | Telefone: (47) 3083-8361</p>
      `;
      await sendDocumentEmail(
        to,
        `NF-e Nº ${numero} - S3E Engenharia`,
        bodyHtml,
        attachments
      );

      res.status(200).json({ success: true, message: 'E-mail enviado com sucesso' });
    } catch (error: any) {
      console.error('❌ Erro ao enviar NF-e por email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao enviar NF-e por email',
        error: error.message
      });
    }
  }

  /**
   * GET /api/nfe/notas/:id/eventos
   * Listar eventos (logs) vinculados a uma nota fiscal
   */
  static async listarEventosNota(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Verificar existência da nota
      const nota = await prisma.notaFiscal.findUnique({ where: { id } });
      if (!nota) {
        res.status(404).json({ success: false, message: 'Nota fiscal não encontrada' });
        return;
      }

      const eventos = await prisma.nfeEvento.findMany({
        where: { notaFiscalId: id },
        orderBy: { createdAt: 'asc' }
      });
      res.status(200).json({ success: true, data: eventos });
    } catch (error: any) {
      console.error('❌ Erro ao listar eventos da nota:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro ao listar eventos' });
    }
  }

  /**
   * POST /api/nfe/notas/:id/reprocessar
   * Enfileira e tenta reprocessar imediatamente a nota indicada
   */
  static async reprocessarNota(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Buscar nota
      const nota = await prisma.notaFiscal.findUnique({ where: { id } });
      if (!nota) {
        res.status(404).json({ success: false, message: 'Nota fiscal não encontrada' });
        return;
      }

      // Enfileirar usando xmlNFe (assumindo que o XML assinado esteja disponível)
      const xmlAssinado = nota.xmlNFe || null;
      if (!xmlAssinado) {
        res.status(400).json({ success: false, message: 'XML assinado da nota não disponível para reenvio' });
        return;
      }

      // Enfileirar item para reenvio (modo NORMAL)
      const filaRegistro = await (await import('../services/nfe-fila.service')).default.enfileirar({
        notaFiscalId: nota.id,
        empresaFiscalId: nota.empresaFiscalId || undefined,
        ambiente: nota.ambiente === 'PRODUCAO' || nota.ambiente === '1' ? '1' : '2',
        modo: 'NORMAL',
        xmlAssinado,
        motivo: 'Reenvio manual solicitado pelo usuário'
      });

      // Registrar evento de reenvio manual
      try {
        await prisma.nfeEvento.create({
          data: {
            notaFiscalId: nota.id,
            tipo: 'INFO',
            descricao: 'Reenvio manual solicitado pelo usuário'
          }
        });
      } catch (logErr) {
        console.warn('⚠️ Falha ao registrar evento NFe (reenvio manual):', logErr);
      }

      // Tentar processar imediatamente (rodar worker para 1 item)
      try {
        const worker = await import('../workers/nfe-fila.worker');
        // executar em background (não bloquear)
        worker.processarFilaNFe(1).catch((e) => {
          console.warn('⚠️ Erro ao processar fila imediatamente após reenvio manual:', e);
        });
      } catch (e) {
        console.warn('⚠️ Não foi possível acionar worker para reprocessar imediatamente:', e);
      }

      res.status(200).json({ success: true, message: 'Reenvio agendado e tentativa iniciada', data: { filaId: filaRegistro?.id } });
    } catch (error: any) {
      console.error('❌ Erro ao solicitar reprocessamento manual da nota:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro ao reprocessar nota' });
    }
  }

  /**
   * POST /api/nfe/config
   * Salvar configurações de certificado (mock)
   */
  static async salvarConfig(req: Request, res: Response): Promise<void> {
    try {
      const { certificadoPFX, senhaCertificado, ambienteFiscal } = req.body;

      if (!certificadoPFX || !senhaCertificado || !ambienteFiscal) {
        res.status(400).json({
          success: false,
          message: 'Todos os campos de configuração são obrigatórios'
        });
        return;
      }

      console.log('\n🔧 Salvando configurações fiscais:');
      console.log(`   Ambiente: ${ambienteFiscal === '1' ? 'Produção' : 'Homologação'}`);
      console.log(`   Certificado: ${certificadoPFX.substring(0, 50)}...`);

      // Mock: Em produção, salvar de forma segura
      // Por exemplo: criptografar e salvar no banco ou usar secret manager

      res.status(200).json({
        success: true,
        message: 'Configurações fiscais salvas com sucesso',
        data: {
          ambienteFiscal,
          certificadoConfigurado: true
        }
      });
    } catch (error: any) {
      console.error('❌ Erro ao salvar configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao salvar configurações fiscais',
        error: error.message
      });
    }
  }

  /**
   * GET /api/nfe/consultar/:chaveAcesso
   * Consultar status de uma NF-e na SEFAZ
   */
  static async consultarNFe(req: Request, res: Response): Promise<void> {
    try {
      const { chaveAcesso } = req.params;
      const { empresaId, ambiente = '2' } = req.query as {
        empresaId?: string;
        ambiente?: '1' | '2' | string;
      };

      if (!chaveAcesso || chaveAcesso.length !== 44) {
        res.status(400).json({
          success: false,
          message: 'Chave de acesso inválida (deve ter 44 dígitos)'
        });
        return;
      }

      if (!empresaId) {
        res.status(400).json({
          success: false,
          message: 'Empresa ID é obrigatório para consulta na SEFAZ'
        });
        return;
      }

      console.log(`\n🔍 Consultando NF-e na SEFAZ: ${chaveAcesso}`);

      // Buscar empresa e certificado
      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: empresaId as string }
      });

      if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
        res.status(400).json({
          success: false,
          message: 'Empresa fiscal não encontrada ou sem certificado configurado'
        });
        return;
      }

      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        res.status(400).json({
          success: false,
          message: 'Arquivo de certificado não encontrado. Reenvie o certificado pela interface.'
        });
        return;
      }

      // Descriptografar senha
      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado para consulta:', error);
        res.status(400).json({
          success: false,
          message: 'Senha do certificado inválida para consulta de NF-e'
        });
        return;
      }

      const { key, cert } = NFeSignatureService.carregarCertificado(
        pfxPathResolvido,
        senhaDescriptografada
      );

      const ambienteFinal: '1' | '2' =
        ambiente === '1' || ambiente === '2' ? ambiente : '2';

      const resultado = await NFeSoapService.consultarNFe(
        chaveAcesso,
        ambienteFinal,
        cert,
        key
      );

      if (!resultado.sucesso) {
        res.status(500).json({
          success: false,
          message: resultado.erro || 'Erro ao consultar NF-e na SEFAZ',
          data: resultado
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          chaveAcesso,
          situacao: resultado.situacao,
          protocolo: resultado.protocolo,
          codigoStatus: resultado.codigoStatus,
          mensagem: resultado.mensagem
        },
        message: 'Consulta realizada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro ao consultar NF-e:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao consultar NF-e',
        error: error.message
      });
    }
  }

  /**
   * POST /api/nfe/preview-xml
   * Gerar XML da NF-e para pré-visualização (sem enviar à SEFAZ)
   */
  static async previewXmlNFe(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoId, empresaId, ambiente, cfop, naturezaOperacao, serie } = req.body;

      if (!pedidoId || !empresaId) {
        res.status(400).json({
          success: false,
          message: 'Pedido ID e Empresa ID são obrigatórios'
        });
        return;
      }

      console.log(`\n👀 Solicitação de pré-visualização de XML da NF-e`);
      console.log(`   Pedido: ${pedidoId}`);
      console.log(`   Empresa: ${empresaId}`);
      if (ambiente) {
        console.log(`   Ambiente (frontend): ${ambiente === '1' ? 'Produção' : 'Homologação'}`);
      }

      const resultado = await nfeService.gerarXmlPreview(
        pedidoId,
        empresaId,
        ambiente === '1' ? '1' : ambiente === '2' ? '2' : undefined,
        cfop,
        naturezaOperacao,
        serie
      );

      res.status(200).json({
        success: true,
        data: resultado,
        message: 'XML de NF-e gerado para pré-visualização'
      });
    } catch (error: any) {
      console.error('❌ Erro ao gerar XML de pré-visualização:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao gerar XML de pré-visualização da NF-e',
        error: error.message
      });
    }
  }
}

export default new NFeController();
