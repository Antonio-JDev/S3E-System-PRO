jest.mock('../lib/prisma', () => ({
  prisma: {
    registroPonto: { findFirst: jest.fn() },
    funcionario: { findUnique: jest.fn() },
    ocorrenciaPontoRh: { findFirst: jest.fn() },
    comentarioConferenciaPontoRh: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('./feriadoOverride.service', () => ({
  listarOverridesFeriadoMes: jest.fn().mockResolvedValue(new Map()),
}));

jest.mock('./bancoHorasRh.service', () => ({
  aplicarDeltasAvaliacaoBancoHoras: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../lib/prisma';
import { salvarAvaliacaoRhDiaLote } from './rhComentarioConferencia.service';

const registroFindFirst = prisma.registroPonto.findFirst as jest.Mock;
const funcionarioFindUnique = prisma.funcionario.findUnique as jest.Mock;
const ocorrenciaFindFirst = prisma.ocorrenciaPontoRh.findFirst as jest.Mock;
const comentarioFindUnique = prisma.comentarioConferenciaPontoRh.findUnique as jest.Mock;
const comentarioCreate = prisma.comentarioConferenciaPontoRh.create as jest.Mock;

const workShiftPadrao = {
  entrada1: '08:00',
  saida1: '12:00',
  entrada2: '13:00',
  saida2: '17:30',
  toleranciaMinutos: 5,
};

const funcionarioPadrao = {
  cargaHorariaMensal: 220,
  dataAdmissao: new Date('2020-01-01'),
  configuracaoPonto: { workShift: workShiftPadrao },
};

function registroComAtraso(minutosAtraso: number) {
  return {
    minutosAtraso,
    minutosHorasDevidas: 0,
    minutosExtra20: 0,
    minutosExtra50: 0,
    minutosExtra100: 0,
    horasNormais: 8,
    horasExtras50: 0,
    horasExtras100: 0,
  };
}

function registroNeutro() {
  return registroComAtraso(0);
}

function mockPersistenciaPadrao() {
  funcionarioFindUnique.mockResolvedValue(funcionarioPadrao);
  ocorrenciaFindFirst.mockResolvedValue(null);
  comentarioFindUnique.mockResolvedValue(null);
  comentarioCreate.mockResolvedValue({ id: 'avaliacao-1' });
}

describe('salvarAvaliacaoRhDiaLote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPersistenciaPadrao();
  });

  it('aplica botão A nos dias elegíveis e ignora dias neutros', async () => {
    registroFindFirst
      .mockResolvedValueOnce(registroComAtraso(6))
      .mockResolvedValueOnce(registroComAtraso(6))
      .mockResolvedValueOnce(registroNeutro());

    const res = await salvarAvaliacaoRhDiaLote({
      funcionarioId: 'func-1',
      referenciaAno: 2026,
      referenciaMes: 5,
      dias: [6, 7, 7],
      botao: 'A',
    });

    expect(res.aplicados).toEqual([6]);
    expect(res.ignorados).toEqual([
      { dia: 7, motivo: 'Sem débito/crédito elegível para este botão' },
    ]);
    expect(res.falhas).toEqual([]);
    expect(res.total).toBe(2);
    expect(comentarioCreate).toHaveBeenCalledTimes(1);
  });

  it('descarta dias inválidos fora do mês', async () => {
    registroFindFirst
      .mockResolvedValueOnce(registroComAtraso(6))
      .mockResolvedValueOnce(registroComAtraso(6));

    const res = await salvarAvaliacaoRhDiaLote({
      funcionarioId: 'func-1',
      referenciaAno: 2026,
      referenciaMes: 5,
      dias: [0, 32, 6],
      botao: 'A',
    });

    expect(res.aplicados).toEqual([6]);
    expect(res.total).toBe(1);
  });

  it('registra falha quando persistência lança erro', async () => {
    registroFindFirst
      .mockResolvedValueOnce(registroComAtraso(8))
      .mockResolvedValueOnce(registroComAtraso(8));
    comentarioCreate.mockRejectedValueOnce(new Error('Erro de persistência'));

    const res = await salvarAvaliacaoRhDiaLote({
      funcionarioId: 'func-1',
      referenciaAno: 2026,
      referenciaMes: 5,
      dias: [8],
      botao: 'D',
    });

    expect(res.aplicados).toEqual([]);
    expect(res.falhas).toEqual([{ dia: 8, message: 'Erro de persistência' }]);
  });
});
