import { Request, Response } from 'express';
import { LancamentoFolhaCategoria } from '@prisma/client';
import * as LancamentoFolhaService from '../services/lancamentoFolha.service';
import { ContasPagarService } from '../services/contasPagar.service';

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
      const row = await LancamentoFolhaService.criar({
        funcionarioId: String(funcionarioId),
        referenciaAno: parseInt(String(referenciaAno), 10),
        referenciaMes: parseInt(String(referenciaMes), 10),
        categoria: categoria as LancamentoFolhaCategoria,
        valor: Number(valor),
        descricao: descricao ?? null,
      });
      try {
        await ContasPagarService.sincronizarValorParcelaRHPelaFolha(
          String(funcionarioId),
          parseInt(String(referenciaAno), 10),
          parseInt(String(referenciaMes), 10),
        );
      } catch (syncErr) {
        console.warn('Sincronizar parcela RH após lançamento:', syncErr);
      }
      res.status(201).json({ success: true, data: row });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ success: false, message: e?.message ?? 'Erro ao criar' });
    }
  },

  async excluir(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const removido = await LancamentoFolhaService.excluir(id);
      try {
        await ContasPagarService.sincronizarValorParcelaRHPelaFolha(
          removido.funcionarioId,
          removido.referenciaAno,
          removido.referenciaMes,
        );
      } catch (syncErr) {
        console.warn('Sincronizar parcela RH após excluir lançamento:', syncErr);
      }
      res.json({ success: true, message: 'Lançamento removido' });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ success: false, message: e?.message ?? 'Erro ao excluir' });
    }
  },
};
