import { Request, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import { ModoQuitacaoHorasNegativas, PeriodoCompensacaoHoras } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { RhService } from '../services/rh.service';
import { ContasPagarService } from '../services/contasPagar.service';
import { atualizarRegistroBatidas, criarRegistroBatidasManual, recalcularMetricasFuncionario } from '../services/ponto.service';
import { gerarBufferPdfConferenciaPonto } from '../services/rhConferenciaPdf.service';
import { resolveLetterheadForUser, readLetterheadImageBuffer } from '../services/pdfLetterhead.service';
import {
  type AlocacaoPagamentoBanco,
  converterHorasParaFolga,
  faturarBancoHoras as faturarBancoHorasService,
  incluirPagamentoBancoNaFolha,
  zerarBancoHoras as zerarBancoHorasService,
} from '../services/bancoHorasRh.service';
import {
  aprovarDiaCompensacao,
  criarCompensacaoHoras,
  criarFaltaJustificada,
  atualizarFaltaJustificada,
  criarJustificativaParcial,
  atualizarJustificativaParcial,
  excluirJustificativaParcial,
  excluirFaltaJustificada,
  removerAnexoFaltaJustificada,
  listarCompensacoesCompetencia,
  listarWorkShifts,
  criarWorkShiftPersonalizada,
} from '../services/rhJornada.service';
import { buildContentDisposition } from '../utils/filename.util';
import {
  salvarAvaliacaoRhDia,
  salvarComentarioConferenciaDia,
} from '../services/rhComentarioConferencia.service';
import {
  obterConfigExportacaoFolhaContabil,
  salvarConfigExportacaoFolhaContabil,
  listarEmpresasFiscaisAtivas,
} from '../services/folhaContabilidadeConfig.service';
import {
  gerarExportacaoFolhaContabil,
  previewExportacaoFolhaContabil,
} from '../services/folhaContabilidadeExport.service';
import {
  limparOverrideFeriadoDia,
  salvarOverrideFeriadoDia,
} from '../services/feriadoOverride.service';

export const RhController = {
  /**
   * GET /api/rh/folha/:funcionarioId/:mes
   * mes no formato YYYY-MM ou YYYY-MM-DD
   */
  async folhaMes(req: Request, res: Response) {
    try {
      const { funcionarioId, mes } = req.params;

      if (!funcionarioId || !mes) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros funcionarioId e mes são obrigatórios',
        });
      }

      let dataReferencia: Date;
      if (/^\d{4}-\d{2}$/.test(mes)) {
        const [ano, mesNum] = mes.split('-').map((v) => parseInt(v, 10));
        // Meio-dia UTC no 1º dia do mês: alinha com RhService.getMesReferenciaRange (UTC) e com
        // registros importados (dataReferenciaDiaCivilUtc). Evita bug em TZ ≠ UTC (ex.: SP virando mês errado).
        dataReferencia = new Date(Date.UTC(ano, mesNum - 1, 1, 12, 0, 0, 0));
      } else {
        const parsed = new Date(mes);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Parâmetro mes inválido. Use YYYY-MM ou YYYY-MM-DD.',
          });
        }
        dataReferencia = parsed;
      }

      const folha = await RhService.calcularFolhaMes({
        funcionarioId,
        dataReferencia,
      });

      return res.json({ success: true, data: folha });
    } catch (error: any) {
      console.error('❌ Erro ao calcular folha do mês:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao calcular folha do mês',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/rh/folha/:funcionarioId/:mes/recalcular-ponto
   * Recalcula métricas (atraso/extra) dos registros do mês — sem apagar batidas.
   */
  async recalcularPontoMes(req: Request, res: Response) {
    try {
      const { funcionarioId, mes } = req.params;
      if (!funcionarioId || !mes || !/^\d{4}-\d{2}$/.test(mes)) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId e mes (YYYY-MM) são obrigatórios',
        });
      }
      const [ano, mesNum] = mes.split('-').map((v) => parseInt(v, 10));
      const data = await recalcularMetricasFuncionario(funcionarioId, { ano, mes: mesNum });
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('❌ Erro ao recalcular ponto do mês:', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Erro ao recalcular ponto do mês',
      });
    }
  },

  /**
   * GET /api/rh/folha/:funcionarioId/:mes/comparar-contratos
   * Simula CLT vs Autônomo+banco horas nas mesmas batidas (sem persistir).
   */
  async compararContratos(req: Request, res: Response) {
    try {
      const { funcionarioId, mes } = req.params;
      if (!funcionarioId || !mes) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetros funcionarioId e mes são obrigatórios',
        });
      }

      let dataReferencia: Date;
      if (/^\d{4}-\d{2}$/.test(mes)) {
        const [ano, mesNum] = mes.split('-').map((v) => parseInt(v, 10));
        dataReferencia = new Date(Date.UTC(ano, mesNum - 1, 1, 12, 0, 0, 0));
      } else {
        const parsed = new Date(mes);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Parâmetro mes inválido. Use YYYY-MM ou YYYY-MM-DD.',
          });
        }
        dataReferencia = parsed;
      }

      const data = await RhService.compararContratosFolha({
        funcionarioId,
        dataReferencia,
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('❌ Erro ao comparar contratos:', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Erro ao comparar contratos',
      });
    }
  },

  /**
   * POST /api/rh/sincronizar-parcela
   * body: { funcionarioId, referenciaAno, referenciaMes }
   * Atualiza Contas a pagar (tipo RH, Pendente) com o total a pagar atual da folha.
   */
  async sincronizarParcela(req: Request, res: Response) {
    try {
      const { funcionarioId, referenciaAno, referenciaMes } = req.body ?? {};
      if (!funcionarioId || referenciaAno === undefined || referenciaMes === undefined) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno e referenciaMes são obrigatórios',
        });
      }
      const ano = parseInt(String(referenciaAno), 10);
      const mes = parseInt(String(referenciaMes), 10);
      if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
        return res.status(400).json({ success: false, message: 'referenciaAno/referenciaMes inválidos' });
      }

      const result = await ContasPagarService.sincronizarValorParcelaRHPelaFolha(
        String(funcionarioId),
        ano,
        mes,
      );

      if (!result.ok) {
        return res.status(500).json({
          success: false,
          message: 'Não foi possível calcular a folha para sincronizar a parcela.',
        });
      }

      let message: string;
      switch (result.motivo) {
        case 'atualizado':
          message = `Conta a pagar atualizada para ${result.valorFolha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`;
          break;
        case 'sem_conta':
          message =
            `Folha calculada (${result.valorFolha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) — não há conta RH pendente para este mês. Gere os salários em Financeiro → Contas a pagar.`;
          break;
        case 'conta_nao_pendente':
          message =
            'Existe conta deste mês, mas não está Pendente (ex.: já paga). O valor não foi alterado. Ajuste manualmente no financeiro, se necessário.';
          break;
        default:
          message = 'Operação concluída.';
      }

      return res.json({
        success: true,
        message,
        data: {
          valorFolha: result.valorFolha,
          atualizado: result.atualizado,
          motivo: result.motivo,
          contaId: result.contaId,
        },
      });
    } catch (error: any) {
      console.error('❌ Erro ao sincronizar parcela RH:', error);
      return res.status(500).json({
        success: false,
        message: error?.message ?? 'Erro ao sincronizar parcela',
      });
    }
  },

  /** GET /api/rh/folha/:funcionarioId/:mes/pdf */
  async folhaPdf(req: Request, res: Response) {
    try {
      const { funcionarioId, mes } = req.params;
      if (!funcionarioId || !mes) {
        return res.status(400).json({ success: false, message: 'Parâmetros obrigatórios' });
      }
      let dataReferencia: Date;
      if (/^\d{4}-\d{2}$/.test(mes)) {
        const [ano, mesNum] = mes.split('-').map((v) => parseInt(v, 10));
        dataReferencia = new Date(Date.UTC(ano, mesNum - 1, 1, 12, 0, 0, 0));
      } else {
        const parsed = new Date(mes);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ success: false, message: 'mes inválido' });
        }
        dataReferencia = parsed;
      }
      const folha = await RhService.calcularFolhaMes({ funcionarioId, dataReferencia });
      const userId = (req as AuthRequest).user?.userId;
      const letterheadResolved = await resolveLetterheadForUser(userId);
      const letterheadBuf = readLetterheadImageBuffer(letterheadResolved);
      const letterhead =
        letterheadBuf && letterheadBuf.length > 0
          ? { imageBuffer: letterheadBuf, opacidade: letterheadResolved.opacidade }
          : null;
      const buf = await gerarBufferPdfConferenciaPonto(folha, letterhead);
      const nomeArquivo = `conferencia-ponto-${folha.nome.replace(/\s+/g, '_')}-${mes}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', buildContentDisposition('attachment', nomeArquivo, 'conferencia.pdf'));
      return res.send(buf);
    } catch (error: any) {
      console.error('❌ Erro PDF conferência:', error);
      return res.status(500).json({ success: false, message: error?.message ?? 'Erro ao gerar PDF' });
    }
  },

  /** POST /api/rh/registro-ponto/manual — cria registro em dia sem batidas */
  async criarRegistroPontoManual(req: Request, res: Response) {
    try {
      const { funcionarioId, referenciaAno, referenciaMes, dia, batidas } = req.body ?? {};
      if (!funcionarioId || !referenciaAno || !referenciaMes || !dia) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes e dia são obrigatórios',
        });
      }
      if (!Array.isArray(batidas)) {
        return res.status(400).json({ success: false, message: 'Informe batidas (array de HH:mm)' });
      }
      const strs = batidas.map((b) => String(b).trim()).filter(Boolean);
      const row = await criarRegistroBatidasManual({
        funcionarioId: String(funcionarioId),
        referenciaAno: Number(referenciaAno),
        referenciaMes: Number(referenciaMes),
        dia: Number(dia),
        batidasInput: strs,
      });
      return res.status(201).json({ success: true, data: row });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao criar registro' });
    }
  },

  /** PUT /api/rh/registro-ponto/:id — body: { batidas: string[] } */
  async atualizarRegistroPonto(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const batidas = (req.body as { batidas?: unknown })?.batidas;
      if (!id || !Array.isArray(batidas)) {
        return res.status(400).json({ success: false, message: 'Informe batidas (array de HH:mm)' });
      }
      const strs = batidas.map((b) => String(b).trim()).filter(Boolean);
      const row = await atualizarRegistroBatidas(id, strs);
      return res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('❌ Erro ao atualizar registro de ponto:', error);
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao salvar' });
    }
  },

  /** PUT /api/rh/registro-ponto/:id/intervalo-almoco — body: { inicio: "HH:mm", fim: "HH:mm" } */
  async atualizarIntervaloAlmoco(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const inicio = String((req.body as any)?.inicio ?? '').trim();
      const fim = String((req.body as any)?.fim ?? '').trim();
      if (!id) {
        return res.status(400).json({ success: false, message: 'id é obrigatório' });
      }
      if (!/^\d{1,2}:\d{2}$/.test(inicio) || !/^\d{1,2}:\d{2}$/.test(fim)) {
        return res.status(400).json({ success: false, message: 'Informe inicio/fim no formato HH:mm' });
      }
      const row = await prisma.registroPonto.update({
        where: { id },
        data: {
          intervaloAlmocoInicio: inicio,
          intervaloAlmocoFim: fim,
          intervaloAlmocoOrigem: 'manual_rh',
        },
      });
      return res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('❌ Erro ao atualizar intervalo de almoço:', error);
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao salvar intervalo' });
    }
  },

  /** POST /api/rh/banco-horas/converter-folga */
  async converterFolga(req: Request, res: Response) {
    try {
      const { funcionarioId, horas, origem } = req.body ?? {};
      if (!funcionarioId || horas === undefined) {
        return res.status(400).json({ success: false, message: 'funcionarioId e horas são obrigatórios' });
      }
      const o =
        origem === 'normais' || origem === 'extras100' ? origem : 'automatico';
      const data = await converterHorasParaFolga(String(funcionarioId), Number(horas), o);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro' });
    }
  },

  /** POST /api/rh/banco-horas/incluir-folha */
  async incluirBancoFolha(req: Request, res: Response) {
    try {
      const body = req.body ?? {};
      const { funcionarioId, referenciaAno, referenciaMes, modo, horasParcial, alocacao } = body as {
        funcionarioId?: unknown;
        referenciaAno?: unknown;
        referenciaMes?: unknown;
        modo?: unknown;
        horasParcial?: unknown;
        alocacao?: { tipo?: string; horasNormais?: number; horasExtras100?: number };
      };
      if (!funcionarioId || referenciaAno === undefined || referenciaMes === undefined || !modo) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes e modo são obrigatórios',
        });
      }
      if (modo !== 'total' && modo !== 'parcial') {
        return res.status(400).json({ success: false, message: 'modo deve ser total ou parcial' });
      }

      let alocParsed: AlocacaoPagamentoBanco | undefined;
      if (alocacao && typeof alocacao === 'object' && alocacao.tipo) {
        if (alocacao.tipo === 'misto') {
          alocParsed = {
            tipo: 'misto',
            horasNormais: Number(alocacao.horasNormais),
            horasExtras100: Number(alocacao.horasExtras100),
          };
        } else if (
          alocacao.tipo === 'automatico' ||
          alocacao.tipo === 'so_normais' ||
          alocacao.tipo === 'so_extras100'
        ) {
          alocParsed = { tipo: alocacao.tipo };
        }
      }

      const data = await incluirPagamentoBancoNaFolha({
        funcionarioId: String(funcionarioId),
        referenciaAno: parseInt(String(referenciaAno), 10),
        referenciaMes: parseInt(String(referenciaMes), 10),
        modo,
        horasParcial: modo === 'parcial' ? Number(horasParcial) : undefined,
        alocacao: alocParsed,
      });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro' });
    }
  },

  /** POST /api/rh/banco-horas/faturar — abate positivas × negativas e persiste o líquido */
  async faturarBancoHoras(req: Request, res: Response) {
    try {
      const { funcionarioId } = req.body ?? {};
      if (!funcionarioId) {
        return res.status(400).json({ success: false, message: 'funcionarioId é obrigatório' });
      }
      const data = await faturarBancoHorasService(String(funcionarioId));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao faturar banco' });
    }
  },

  /** POST /api/rh/banco-horas/zerar — zera positivas e negativas do banco */
  async zerarBancoHoras(req: Request, res: Response) {
    try {
      const { funcionarioId } = req.body ?? {};
      if (!funcionarioId) {
        return res.status(400).json({ success: false, message: 'funcionarioId é obrigatório' });
      }
      const data = await zerarBancoHorasService(String(funcionarioId));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao zerar banco' });
    }
  },

  /** GET /api/rh/work-shifts */
  async listarWorkShifts(_req: Request, res: Response) {
    try {
      const data = await listarWorkShifts();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message ?? 'Erro ao listar jornadas' });
    }
  },

  /** POST /api/rh/work-shifts — cria jornada personalizada (entrada/almoço/volta/saída) */
  async criarWorkShift(req: Request, res: Response) {
    try {
      const body = req.body ?? {};
      const entrada1 = String(body.entrada1 ?? '').trim();
      const saida1 = String(body.saida1 ?? '').trim();
      const entrada2 = String(body.entrada2 ?? '').trim();
      const saida2 = String(body.saida2 ?? '').trim();
      const nome = body.nome != null ? String(body.nome).trim() : null;

      if (!entrada1 || !saida1 || !entrada2 || !saida2) {
        return res.status(400).json({
          success: false,
          message: 'Informe entrada, saída almoço, volta almoço e saída (HH:mm)',
        });
      }

      const data = await criarWorkShiftPersonalizada({
        entrada1,
        saida1,
        entrada2,
        saida2,
        nome,
      });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error?.message ?? 'Erro ao criar jornada personalizada',
      });
    }
  },

  /** POST /api/rh/falta-justificada — multipart: documento (opcional) + campos do formulário */
  async registrarFaltaJustificada(req: Request, res: Response) {
    try {
      const body = req.body ?? {};
      const { funcionarioId, referenciaAno, referenciaMes, dia, descricao } = body;
      const desc = String(descricao ?? '').trim();
      if (!funcionarioId || !referenciaAno || !referenciaMes || !dia || !desc) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes, dia e descricao são obrigatórios',
        });
      }

      const file = req.file as Express.Multer.File | undefined;
      let documentoAnexoUrl: string | null = null;
      let documentoAnexoNome: string | null = null;
      if (file) {
        documentoAnexoUrl = `/uploads/rh-faltas/${file.filename}`;
        documentoAnexoNome = file.originalname;
      }

      const data = await criarFaltaJustificada({
        funcionarioId: String(funcionarioId),
        referenciaAno: Number(referenciaAno),
        referenciaMes: Number(referenciaMes),
        dia: Number(dia),
        descricao: desc,
        documentoAnexoUrl,
        documentoAnexoNome,
      });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao registrar falta justificada' });
    }
  },

  /** PUT /api/rh/falta-justificada/:id — atualiza descrição e/ou substitui/remove anexo */
  async atualizarFaltaJustificada(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const desc = String((req.body as { descricao?: string })?.descricao ?? '').trim();
      const removerAnexo =
        (req.body as { removerAnexo?: string })?.removerAnexo === 'true' ||
        (req.body as { removerAnexo?: boolean })?.removerAnexo === true;

      if (!id || !desc) {
        return res.status(400).json({ success: false, message: 'id e descricao são obrigatórios' });
      }

      const file = req.file as Express.Multer.File | undefined;
      let documentoAnexoUrl: string | null | undefined;
      let documentoAnexoNome: string | null | undefined;

      if (file) {
        documentoAnexoUrl = `/uploads/rh-faltas/${file.filename}`;
        documentoAnexoNome = file.originalname;
      }

      const data = await atualizarFaltaJustificada(id, {
        descricao: desc,
        removerAnexo: removerAnexo && !file,
        ...(file
          ? { documentoAnexoUrl, documentoAnexoNome }
          : {}),
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao atualizar falta justificada' });
    }
  },

  /** DELETE /api/rh/falta-justificada/:id — exclui a justificativa de falta */
  async excluirFaltaJustificada(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, message: 'id é obrigatório' });
      const data = await excluirFaltaJustificada(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(400)
        .json({ success: false, message: error?.message ?? 'Erro ao excluir justificativa' });
    }
  },

  /** DELETE /api/rh/falta-justificada/:id/anexo — remove somente o anexo */
  async deletarAnexoFaltaJustificada(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, message: 'id é obrigatório' });
      const data = await removerAnexoFaltaJustificada(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(400)
        .json({ success: false, message: error?.message ?? 'Erro ao remover anexo' });
    }
  },

  /** POST /api/rh/justificativa-parcial */
  async registrarJustificativaParcial(req: Request, res: Response) {
    try {
      const {
        funcionarioId,
        referenciaAno,
        referenciaMes,
        dia,
        descricao,
        justificativaTipo,
        horaInicio,
        horaFim,
        classificacaoJustificativa,
      } = req.body ?? {};
      const desc = String(descricao ?? '').trim();
      const tipo = String(justificativaTipo ?? '').trim();
      const ini = String(horaInicio ?? '').trim();
      const fim = String(horaFim ?? '').trim();

      if (!funcionarioId || !referenciaAno || !referenciaMes || !dia || !desc) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes, dia e descricao são obrigatórios',
        });
      }
      if (tipo !== 'ENTRADA_ATRASADA' && tipo !== 'SAIDA_ANTECIPADA') {
        return res.status(400).json({ success: false, message: 'justificativaTipo inválido' });
      }
      if (!/^\d{1,2}:\d{2}$/.test(ini) || !/^\d{1,2}:\d{2}$/.test(fim)) {
        return res.status(400).json({ success: false, message: 'horaInicio/horaFim devem ser HH:mm' });
      }

      const file = req.file as Express.Multer.File | undefined;
      let documentoAnexoUrl: string | null = null;
      let documentoAnexoNome: string | null = null;
      if (file) {
        documentoAnexoUrl = `/uploads/rh-faltas/${file.filename}`;
        documentoAnexoNome = file.originalname;
      }

      const data = await criarJustificativaParcial({
        funcionarioId: String(funcionarioId),
        referenciaAno: Number(referenciaAno),
        referenciaMes: Number(referenciaMes),
        dia: Number(dia),
        descricao: desc,
        justificativaTipo: tipo as any,
        horaInicio: ini,
        horaFim: fim,
        classificacaoJustificativa: classificacaoJustificativa
          ? String(classificacaoJustificativa)
          : undefined,
        documentoAnexoUrl,
        documentoAnexoNome,
      });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao registrar justificativa' });
    }
  },

  /** PUT /api/rh/justificativa-parcial/:id */
  async atualizarJustificativaParcial(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const body = req.body ?? {};
      const desc = String(body.descricao ?? '').trim();
      const tipo = String(body.justificativaTipo ?? '').trim();
      const ini = String(body.horaInicio ?? '').trim();
      const fim = String(body.horaFim ?? '').trim();
      const classificacaoJustificativa = body.classificacaoJustificativa;
      const removerAnexo =
        body.removerAnexo === 'true' || body.removerAnexo === true;

      if (!id || !desc) {
        return res.status(400).json({ success: false, message: 'id e descricao são obrigatórios' });
      }
      if (tipo !== 'ENTRADA_ATRASADA' && tipo !== 'SAIDA_ANTECIPADA') {
        return res.status(400).json({ success: false, message: 'justificativaTipo inválido' });
      }
      if (!/^\d{1,2}:\d{2}$/.test(ini) || !/^\d{1,2}:\d{2}$/.test(fim)) {
        return res.status(400).json({ success: false, message: 'horaInicio/horaFim devem ser HH:mm' });
      }

      const file = req.file as Express.Multer.File | undefined;
      let documentoAnexoUrl: string | null | undefined;
      let documentoAnexoNome: string | null | undefined;
      if (file) {
        documentoAnexoUrl = `/uploads/rh-faltas/${file.filename}`;
        documentoAnexoNome = file.originalname;
      }

      const data = await atualizarJustificativaParcial(id, {
        descricao: desc,
        justificativaTipo: tipo as any,
        horaInicio: ini,
        horaFim: fim,
        classificacaoJustificativa: classificacaoJustificativa
          ? String(classificacaoJustificativa)
          : undefined,
        removerAnexo: removerAnexo && !file,
        ...(file ? { documentoAnexoUrl, documentoAnexoNome } : {}),
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(400)
        .json({ success: false, message: error?.message ?? 'Erro ao atualizar justificativa' });
    }
  },

  /** DELETE /api/rh/justificativa-parcial/:id — exclui justificativa (falta do dia ou meio período) */
  async excluirJustificativaParcial(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ success: false, message: 'id é obrigatório' });
      const data = await excluirJustificativaParcial(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(400)
        .json({ success: false, message: error?.message ?? 'Erro ao excluir justificativa' });
    }
  },

  /** PUT /api/rh/conferencia-ponto/comentario */
  async salvarComentarioConferencia(req: Request, res: Response) {
    try {
      const body = req.body ?? {};
      const {
        funcionarioId,
        referenciaAno,
        referenciaMes,
        dia,
        comentario,
        decisaoRh,
        justificativaOcorrenciaId,
        faltaJustificadaOcorrenciaId,
      } = body as {
        funcionarioId?: unknown;
        referenciaAno?: unknown;
        referenciaMes?: unknown;
        dia?: unknown;
        comentario?: unknown;
        decisaoRh?: unknown;
        justificativaOcorrenciaId?: unknown;
        faltaJustificadaOcorrenciaId?: unknown;
      };
      if (!funcionarioId || referenciaAno == null || referenciaMes == null || dia == null) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes e dia são obrigatórios',
        });
      }
      const data = await salvarComentarioConferenciaDia({
        funcionarioId: String(funcionarioId),
        referenciaAno: parseInt(String(referenciaAno), 10),
        referenciaMes: parseInt(String(referenciaMes), 10),
        dia: parseInt(String(dia), 10),
        comentario: comentario != null ? String(comentario) : null,
        decisaoRh: decisaoRh != null ? String(decisaoRh) : null,
        justificativaOcorrenciaId:
          justificativaOcorrenciaId != null ? String(justificativaOcorrenciaId) : null,
        faltaJustificadaOcorrenciaId:
          faltaJustificadaOcorrenciaId != null ? String(faltaJustificadaOcorrenciaId) : null,
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(400)
        .json({ success: false, message: error?.message ?? 'Erro ao salvar comentário' });
    }
  },

  /** PUT /api/rh/conferencia-ponto/avaliacao — botões A/B/P/D */
  async salvarAvaliacaoConferencia(req: Request, res: Response) {
    try {
      const body = req.body ?? {};
      const { funcionarioId, referenciaAno, referenciaMes, dia, botao, tratamentoDebito, tratamentoCredito } =
        body as {
          funcionarioId?: unknown;
          referenciaAno?: unknown;
          referenciaMes?: unknown;
          dia?: unknown;
          botao?: unknown;
          tratamentoDebito?: unknown;
          tratamentoCredito?: unknown;
        };

      if (!funcionarioId || referenciaAno == null || referenciaMes == null || dia == null) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes e dia são obrigatórios',
        });
      }

      const botaoNorm = String(botao ?? '').trim().toUpperCase();
      const botaoFlag =
        botaoNorm === 'A' || botaoNorm === 'B' || botaoNorm === 'P' || botaoNorm === 'D'
          ? botaoNorm
          : null;

      if (!botaoFlag && tratamentoDebito === undefined && tratamentoCredito === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Informe botao (A|B|P|D) ou tratamentoDebito/tratamentoCredito',
        });
      }

      const data = await salvarAvaliacaoRhDia({
        funcionarioId: String(funcionarioId),
        referenciaAno: parseInt(String(referenciaAno), 10),
        referenciaMes: parseInt(String(referenciaMes), 10),
        dia: parseInt(String(dia), 10),
        botao: botaoFlag,
        temDebito:
          (body as { temDebito?: unknown }).temDebito === undefined
            ? true
            : Boolean((body as { temDebito?: unknown }).temDebito),
        temCredito:
          (body as { temCredito?: unknown }).temCredito === undefined
            ? true
            : Boolean((body as { temCredito?: unknown }).temCredito),
        tratamentoDebito:
          botaoFlag
            ? undefined
            : tratamentoDebito === null || tratamentoDebito === ''
              ? null
              : (String(tratamentoDebito) as any),
        tratamentoCredito:
          botaoFlag
            ? undefined
            : tratamentoCredito === null || tratamentoCredito === ''
              ? null
              : (String(tratamentoCredito) as any),
      });

      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(400)
        .json({ success: false, message: error?.message ?? 'Erro ao salvar avaliação RH' });
    }
  },

  /** PUT /api/rh/feriado-override — admin marca dia como feriado / não feriado */
  async salvarFeriadoOverride(req: Request, res: Response) {
    try {
      const body = req.body ?? {};
      const { referenciaAno, referenciaMes, dia, ehFeriado, nome, limpar } = body as {
        referenciaAno?: unknown;
        referenciaMes?: unknown;
        dia?: unknown;
        ehFeriado?: unknown;
        nome?: unknown;
        limpar?: unknown;
      };

      if (referenciaAno == null || referenciaMes == null || dia == null) {
        return res.status(400).json({
          success: false,
          message: 'referenciaAno, referenciaMes e dia são obrigatórios',
        });
      }

      if (limpar === true || limpar === 'true') {
        const data = await limparOverrideFeriadoDia({
          referenciaAno: parseInt(String(referenciaAno), 10),
          referenciaMes: parseInt(String(referenciaMes), 10),
          dia: parseInt(String(dia), 10),
        });
        return res.json({ success: true, data });
      }

      if (typeof ehFeriado !== 'boolean' && ehFeriado !== 'true' && ehFeriado !== 'false') {
        return res.status(400).json({
          success: false,
          message: 'ehFeriado (boolean) é obrigatório, ou limpar=true para voltar ao calendário padrão',
        });
      }

      const data = await salvarOverrideFeriadoDia({
        referenciaAno: parseInt(String(referenciaAno), 10),
        referenciaMes: parseInt(String(referenciaMes), 10),
        dia: parseInt(String(dia), 10),
        ehFeriado: ehFeriado === true || ehFeriado === 'true',
        nome: nome != null ? String(nome) : null,
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(400)
        .json({ success: false, message: error?.message ?? 'Erro ao salvar override de feriado' });
    }
  },

  /** POST /api/rh/divida-horas/propor */
  async proporDividaHoras(req: Request, res: Response) {
    try {
      const { funcionarioId, referenciaAno, referenciaMes, horasDivida, modoQuitacao, periodoCompensacao } =
        req.body ?? {};
      if (!funcionarioId || !referenciaAno || !referenciaMes || !horasDivida) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes e horasDivida são obrigatórios',
        });
      }
      const modo =
        modoQuitacao === ModoQuitacaoHorasNegativas.COMPENSAR_BANCO
          ? ModoQuitacaoHorasNegativas.COMPENSAR_BANCO
          : ModoQuitacaoHorasNegativas.DESCONTAR_SALARIO;
      const periodo =
        periodoCompensacao === PeriodoCompensacaoHoras.FINAL_DE_SEMANA
          ? PeriodoCompensacaoHoras.FINAL_DE_SEMANA
          : PeriodoCompensacaoHoras.DIAS_SEMANA;

      const data = await criarCompensacaoHoras({
        funcionarioId: String(funcionarioId),
        referenciaAno: Number(referenciaAno),
        referenciaMes: Number(referenciaMes),
        horasDivida: Number(horasDivida),
        modoQuitacao: modo,
        periodoCompensacao: periodo,
      });

      await prisma.funcionario.update({
        where: { id: String(funcionarioId) },
        data: {
          modoQuitacaoHorasNegativas: modo,
          periodoCompensacaoHoras: periodo,
          saldoHorasNegativas: Number(horasDivida),
        },
      });

      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao propor dívida de horas' });
    }
  },

  /** GET /api/rh/divida-horas/:funcionarioId/:mes */
  async listarDividaHoras(req: Request, res: Response) {
    try {
      const { funcionarioId, mes } = req.params;
      const m = String(mes).match(/^(\d{4})-(\d{2})$/);
      if (!funcionarioId || !m) {
        return res.status(400).json({ success: false, message: 'Parâmetros inválidos' });
      }
      const data = await listarCompensacoesCompetencia({
        funcionarioId: String(funcionarioId),
        referenciaAno: Number(m[1]),
        referenciaMes: Number(m[2]),
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message ?? 'Erro ao listar dívidas' });
    }
  },

  /** POST /api/rh/divida-horas/dia/:diaId/aprovar */
  async aprovarDiaDivida(req: Request, res: Response) {
    try {
      const { diaId } = req.params;
      if (!diaId) {
        return res.status(400).json({ success: false, message: 'diaId é obrigatório' });
      }
      const data = await aprovarDiaCompensacao(diaId);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao aprovar dia' });
    }
  },

  /** GET /api/rh/registro-ponto?funcionarioId=&data=YYYY-MM-DD */
  async buscarRegistroPontoDia(req: Request, res: Response) {
    try {
      const funcionarioId = String(req.query.funcionarioId || '').trim();
      const data = String(req.query.data || '').trim();
      const m = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!funcionarioId || !m) {
        return res.status(400).json({ success: false, message: 'funcionarioId e data (YYYY-MM-DD) são obrigatórios' });
      }
      const { dataReferenciaDiaCivilUtc } = await import('../utils/datetime-sp.util');
      const dataReferencia = dataReferenciaDiaCivilUtc(Number(m[1]), Number(m[2]), Number(m[3]));
      const registro = await prisma.registroPonto.findUnique({
        where: { funcionarioId_dataReferencia: { funcionarioId, dataReferencia } },
      });
      return res.json({ success: true, data: registro });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message ?? 'Erro ao buscar registro de ponto' });
    }
  },

  /** GET /api/rh/folha/:mes/exportar-contabilidade — XLS para contabilidade */
  async exportarFolhaContabilidade(req: Request, res: Response) {
    try {
      const { mes } = req.params;
      if (!mes) {
        return res.status(400).json({ success: false, message: 'Parâmetro mes (YYYY-MM) é obrigatório' });
      }
      if (String(req.query.preview ?? '') === '1') {
        const preview = await previewExportacaoFolhaContabil(mes);
        return res.json({ success: true, data: preview });
      }
      const { buffer, avisos } = await gerarExportacaoFolhaContabil(mes);
      const nomeArquivo = `LANCAMENTOS-FOLHA-${mes}.xls`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', buildContentDisposition('attachment', nomeArquivo, 'lancamentos-folha.xls'));
      if (avisos.length > 0) {
        res.setHeader('X-Avisos-Exportacao', encodeURIComponent(JSON.stringify(avisos)));
      }
      return res.send(buffer);
    } catch (error: any) {
      console.error('❌ Erro ao exportar folha contábil:', error);
      return res.status(500).json({
        success: false,
        message: error?.message ?? 'Erro ao gerar planilha contábil',
      });
    }
  },

  /** GET /api/rh/exportacao-contabilidade/config */
  async obterConfigExportacaoContabilidade(_req: Request, res: Response) {
    try {
      const config = await obterConfigExportacaoFolhaContabil();
      const empresasFiscais = await listarEmpresasFiscaisAtivas();
      return res.json({ success: true, data: { config, empresasFiscais } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message ?? 'Erro ao carregar configuração' });
    }
  },

  /** PUT /api/rh/exportacao-contabilidade/config */
  async salvarConfigExportacaoContabilidade(req: Request, res: Response) {
    try {
      const body = req.body ?? {};
      const config = await salvarConfigExportacaoFolhaContabil({
        codigoEmpresaContabil: body.codigoEmpresaContabil,
        empresaFiscalIdFolha: body.empresaFiscalIdFolha,
        percentualHeFolhaContabil: body.percentualHeFolhaContabil,
        rubricasFolhaContabil: body.rubricasFolhaContabil,
      });
      return res.json({ success: true, data: config });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao salvar configuração' });
    }
  },
};

