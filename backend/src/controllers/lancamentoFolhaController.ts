import { Request, Response } from 'express';
import { LancamentoFolhaCategoria } from '@prisma/client';
import * as LancamentoFolhaService from '../services/lancamentoFolha.service';
import { ContasPagarService } from '../services/contasPagar.service';

function mensagemContaSalario(
  acao: string,
  result:
    | { ok: false }
    | { ok: true; valorFolha: number; motivo: string },
): string {
  if (!result.ok) {
    return `${acao}. Não foi possível recalcular a folha para atualizar Contas a pagar.`;
  }
  const valor = result.valorFolha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (result.motivo === 'atualizado' || result.motivo === 'criado') {
    return `${acao}. Salário em Contas a pagar atualizado para ${valor}.`;
  }
  if (result.motivo === 'conta_nao_pendente') {
    return `${acao}. A conta deste mês já não está pendente, então o salário em Contas a pagar não mudou. Total da folha: ${valor}.`;
  }
  return `${acao}. Total da folha: ${valor}.`;
}

async function sincronizarSalario(funcionarioId: string, ano: number, mes: number) {
  try {
    return await ContasPagarService.sincronizarValorParcelaRHPelaFolha(funcionarioId, ano, mes);
  } catch (syncErr) {
    console.warn('Sincronizar parcela RH após lançamento:', syncErr);
    return { ok: false as const };
  }
}

export const LancamentoFolhaController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const { funcionarioId, ano, mes } = req.query;
      if (!funcionarioId || ano === undefined || mes === undefined) {
        res.status(400).json({
          success: false,
          message: 'Query obrigatória: funcionarioId, ano, mes',
        });
        return;
      }
      const a = parseInt(String(ano), 10);
      const m = parseInt(String(mes), 10);
      if (!Number.isFinite(a) || !Number.isFinite(m)) {
        res.status(400).json({ success: false, message: 'ano e mes devem ser números' });
        return;
      }
      const rows = await LancamentoFolhaService.listarPorMes(
        String(funcionarioId),
        a,
        m,
      );
      res.json({ success: true, data: rows });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ success: false, message: e?.message ?? 'Erro ao listar' });
    }
  },

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const {
        funcionarioId,
        referenciaAno,
        referenciaMes,
        categoria,
        valor,
        descricao,
      } = req.body;
      if (!funcionarioId || referenciaAno === undefined || referenciaMes === undefined) {
        res.status(400).json({
          success: false,
          message: 'funcionarioId, referenciaAno e referenciaMes são obrigatórios',
        });
        return;
      }
      if (!categoria || valor === undefined) {
        res.status(400).json({
          success: false,
          message: 'categoria e valor são obrigatórios',
        });
        return;
      }
      const ano = parseInt(String(referenciaAno), 10);
      const mes = parseInt(String(referenciaMes), 10);
      const row = await LancamentoFolhaService.criar({
        funcionarioId: String(funcionarioId),
        referenciaAno: ano,
        referenciaMes: mes,
        categoria: categoria as LancamentoFolhaCategoria,
        valor: Number(valor),
        descricao: descricao ?? null,
      });
      const sync = await sincronizarSalario(String(funcionarioId), ano, mes);
      res.status(201).json({
        success: true,
        data: row,
        message: mensagemContaSalario('Lançamento incluído', sync),
      });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ success: false, message: e?.message ?? 'Erro ao criar' });
    }
  },

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { valor, descricao, categoria } = req.body ?? {};
      if (valor === undefined && descricao === undefined && categoria === undefined) {
        res.status(400).json({
          success: false,
          message: 'Informe valor, descrição ou categoria para atualizar',
        });
        return;
      }
      const row = await LancamentoFolhaService.atualizar(id, {
        ...(valor !== undefined ? { valor: Number(valor) } : {}),
        ...(descricao !== undefined ? { descricao: descricao ?? null } : {}),
        ...(categoria !== undefined ? { categoria: categoria as LancamentoFolhaCategoria } : {}),
      });
      const sync = await sincronizarSalario(row.funcionarioId, row.referenciaAno, row.referenciaMes);
      res.json({
        success: true,
        data: row,
        message: mensagemContaSalario('Lançamento salvo', sync),
      });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ success: false, message: e?.message ?? 'Erro ao atualizar' });
    }
  },

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const removido = await LancamentoFolhaService.excluir(id);
      const sync = await sincronizarSalario(
        removido.funcionarioId,
        removido.referenciaAno,
        removido.referenciaMes,
      );
      res.json({
        success: true,
        message: mensagemContaSalario('Lançamento removido', sync),
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ success: false, message: e?.message ?? 'Erro ao excluir' });
    }
  },
};
