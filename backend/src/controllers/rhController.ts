import { Request, Response } from 'express';
import { ModoQuitacaoHorasNegativas, PeriodoCompensacaoHoras } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { RhService } from '../services/rh.service';
import { ContasPagarService } from '../services/contasPagar.service';
import { atualizarRegistroBatidas } from '../services/ponto.service';
import { gerarBufferPdfConferenciaPonto } from '../services/rhConferenciaPdf.service';
import {
  type AlocacaoPagamentoBanco,
  converterHorasParaFolga,
  incluirPagamentoBancoNaFolha,
} from '../services/bancoHorasRh.service';
import {
  aprovarDiaCompensacao,
  criarCompensacaoHoras,
  criarFaltaJustificada,
  listarCompensacoesCompetencia,
  listarWorkShifts,
} from '../services/rhJornada.service';

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
      const buf = await gerarBufferPdfConferenciaPonto(folha);
      const nomeArquivo = `conferencia-ponto-${folha.nome.replace(/\s+/g, '_')}-${mes}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`);
      return res.send(buf);
    } catch (error: any) {
      console.error('❌ Erro PDF conferência:', error);
      return res.status(500).json({ success: false, message: error?.message ?? 'Erro ao gerar PDF' });
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

  /** GET /api/rh/work-shifts */
  async listarWorkShifts(_req: Request, res: Response) {
    try {
      const data = await listarWorkShifts();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message ?? 'Erro ao listar jornadas' });
    }
  },

  /** POST /api/rh/falta-justificada */
  async registrarFaltaJustificada(req: Request, res: Response) {
    try {
      const { funcionarioId, referenciaAno, referenciaMes, dia, descricao } = req.body ?? {};
      if (!funcionarioId || !referenciaAno || !referenciaMes || !dia || !descricao) {
        return res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno, referenciaMes, dia e descricao são obrigatórios',
        });
      }
      const data = await criarFaltaJustificada({
        funcionarioId: String(funcionarioId),
        referenciaAno: Number(referenciaAno),
        referenciaMes: Number(referenciaMes),
        dia: Number(dia),
        descricao: String(descricao),
      });
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message ?? 'Erro ao registrar falta justificada' });
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
};

