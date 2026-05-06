import { Request, Response } from 'express';
import * as ConfiguracaoPontoService from '../services/configuracaoPonto.service';
import { prisma } from '../lib/prisma';

function serialize(row: Awaited<ReturnType<typeof ConfiguracaoPontoService.buscarPorFuncionario>>) {
  if (!row) return null;
  return {
    id: row.id,
    funcionarioId: row.funcionarioId,
    workShiftId: row.workShiftId ?? null,
    trabalhaFimDeSemana: row.trabalhaFimDeSemana,
    valorHoraFimDeSemana:
      row.valorHoraFimDeSemana != null ? Number(row.valorHoraFimDeSemana) : null,
    toleranciaMinutos: row.toleranciaMinutos ?? 5,
    inicioNoturno: row.inicioNoturno ?? '18:00',
    workShift: row.workShift
      ? {
          id: row.workShift.id,
          nome: row.workShift.nome,
          entrada1: row.workShift.entrada1,
          saida1: row.workShift.saida1,
          entrada2: row.workShift.entrada2,
          saida2: row.workShift.saida2,
        }
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const ConfiguracaoPontoController = {
  async buscar(req: Request, res: Response): Promise<void> {
    try {
      const { funcionarioId } = req.params;
      const row = await ConfiguracaoPontoService.buscarPorFuncionario(funcionarioId);
      res.json({ success: true, data: serialize(row) });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ success: false, message: e?.message ?? 'Erro ao buscar' });
    }
  },

  async salvar(req: Request, res: Response): Promise<void> {
    try {
      const { funcionarioId } = req.params;
      const { trabalhaFimDeSemana, valorHoraFimDeSemana, workShiftId, toleranciaMinutos, inicioNoturno } =
        req.body ?? {};

      const func = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
      if (!func) {
        res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
        return;
      }

      let v: number | null | undefined;
      if (valorHoraFimDeSemana === null || valorHoraFimDeSemana === '') {
        v = null;
      } else if (valorHoraFimDeSemana !== undefined) {
        v = Number(valorHoraFimDeSemana);
        if (!Number.isFinite(v)) {
          res.status(400).json({ success: false, message: 'valorHoraFimDeSemana inválido' });
          return;
        }
      }

      let tolerancia: number | undefined;
      if (toleranciaMinutos !== undefined) {
        tolerancia = Number(toleranciaMinutos);
        if (!Number.isFinite(tolerancia) || tolerancia < 0 || tolerancia > 30) {
          res.status(400).json({ success: false, message: 'toleranciaMinutos inválida (0-30)' });
          return;
        }
      }

      let inicioNoturnoFmt: string | null | undefined;
      if (inicioNoturno !== undefined) {
        const t = String(inicioNoturno ?? '').trim();
        if (t === '') {
          inicioNoturnoFmt = null;
        } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
          res.status(400).json({ success: false, message: 'inicioNoturno inválido (HH:mm)' });
          return;
        } else {
          inicioNoturnoFmt = t;
        }
      }

      const row = await ConfiguracaoPontoService.upsertPorFuncionario(funcionarioId, {
        trabalhaFimDeSemana: typeof trabalhaFimDeSemana === 'boolean' ? trabalhaFimDeSemana : false,
        valorHoraFimDeSemana: v,
        workShiftId:
          typeof workShiftId === 'string' && workShiftId.trim() !== '' ? workShiftId.trim() : null,
        toleranciaMinutos: tolerancia,
        inicioNoturno: inicioNoturnoFmt,
      });

      res.json({ success: true, data: serialize(row) });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ success: false, message: e?.message ?? 'Erro ao salvar' });
    }
  },
};
