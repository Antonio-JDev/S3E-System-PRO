jest.mock('../lib/prisma', () => ({
  prisma: {
    configuracaoPonto: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    funcionario: {
      findUnique: jest.fn(),
    },
    registroPonto: {
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    comentarioConferenciaPontoRh: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    feriadoCalendarioOverride: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('./bancoHorasExcesso.service', () => ({
  sincronizarExcessoCompetencia: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../lib/prisma';
import { upsertPorFuncionario } from './configuracaoPonto.service';
import { recalcularMetricasFuncionario } from './ponto.service';
import {
  aplicarAvaliacaoRhDia,
  parseTratamentoCredito,
  parseTratamentoDebito,
  resolverTratamentosDoBotao,
} from '../utils/avaliacaoPontoRh.util';

const p = prisma as unknown as {
  configuracaoPonto: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
  funcionario: { findUnique: jest.Mock };
  registroPonto: {
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  comentarioConferenciaPontoRh: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
};

/**
 * Avaliação RH A/B/P/D + isolamento na troca de workshift.
 */

describe('workshift-rh-evaluation — A/B/P/D', () => {
  describe('parse', () => {
    it('parseTratamentoDebito aceita A|B|D', () => {
      expect(parseTratamentoDebito('A')).toBe('A');
      expect(parseTratamentoDebito('b')).toBe('B');
      expect(parseTratamentoDebito('D')).toBe('D');
      expect(parseTratamentoDebito('P')).toBeNull();
      expect(parseTratamentoDebito(null)).toBeNull();
    });

    it('parseTratamentoCredito aceita B|P', () => {
      expect(parseTratamentoCredito('B')).toBe('B');
      expect(parseTratamentoCredito('p')).toBe('P');
      expect(parseTratamentoCredito('A')).toBeNull();
    });
  });

  /** [Teste 1] Botão A (Abonar): atraso 30min → saldo zero e sem desconto. */
  it('[Teste 1] Botão A — atraso 30min abonado resulta em saldo zero e sem desconto', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 30,
      tratamentoDebito: 'A',
    });
    expect(r.minutosAbonados).toBe(30);
    expect(r.minutosBancoDelta).toBe(0);
    expect(r.minutosDescontarFolha).toBe(0);
    expect(r.minutosPagarFolha).toBe(0);
  });

  /** [Teste 2] Botão B (Banco — Negativo): atraso 45min → -45min no banco. */
  it('[Teste 2] Botão B — atraso 45min adiciona -45min no saldo do banco', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 45,
      tratamentoDebito: 'B',
    });
    expect(r.minutosBancoDelta).toBe(-45);
    expect(r.minutosAbonados).toBe(0);
    expect(r.minutosDescontarFolha).toBe(0);
  });

  /** [Teste 3] Botão B (Banco — Positivo): saída 1h após workshift → +1h no banco. */
  it('[Teste 3] Botão B — saída 1h após workshift adiciona +60min no banco', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosExtra: 60,
      tratamentoCredito: 'B',
    });
    expect(r.minutosBancoDelta).toBe(60);
    expect(r.minutosPagarFolha).toBe(0);
  });

  /** [Teste 4] Botão P (Pagar): HE marcada como P → folha, não banco. */
  it('[Teste 4] Botão P — hora extra sinalizada para pagamento em folha e não vai ao banco', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosExtra: 60,
      tratamentoCredito: 'P',
    });
    expect(r.minutosPagarFolha).toBe(60);
    expect(r.minutosBancoDelta).toBe(0);
  });

  it('padrão sem tratamento: atraso e HE vão ao banco (B)', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 30,
      minutosExtra: 45,
    });
    expect(r.minutosBancoDebito).toBe(30);
    expect(r.minutosBancoCredito).toBe(45);
    expect(r.minutosPagarFolha).toBe(0);
    expect(r.minutosDescontarFolha).toBe(0);
  });

  /** [Teste 5] Botão D (Descontar): falta/atraso → folha de descontos. */
  it('[Teste 5] Botão D — atraso marcado como D contabilizado na folha de descontos', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 20,
      minutosHorasDevidas: 10,
      tratamentoDebito: 'D',
    });
    expect(r.minutosDescontarFolha).toBe(30);
    expect(r.minutosBancoDelta).toBe(0);
    expect(r.minutosAbonados).toBe(0);
  });

  it('[Teste 5b] Botão D — falta integral para desconto em folha', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosFaltaIntegral: 480,
      tratamentoDebito: 'D',
    });
    expect(r.minutosDescontarFolha).toBe(480);
  });

  it('B no mesmo dia com atraso e HE aplica nos dois sentidos (pistas separadas)', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 120,
      minutosExtra: 60,
      tratamentoDebito: 'B',
      tratamentoCredito: 'B',
    });
    expect(r.minutosBancoDebito).toBe(120);
    expect(r.minutosBancoCredito).toBe(60);
    expect(r.minutosBancoDelta).toBe(-60);
    expect(r.minutosPagarFolha).toBe(0);
  });

  it('B com atraso 15 + HE 60 (líquido +45)', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 15,
      minutosExtra: 60,
      tratamentoDebito: 'B',
      tratamentoCredito: 'B',
    });
    expect(r.minutosBancoDebito).toBe(15);
    expect(r.minutosBancoCredito).toBe(60);
    expect(r.minutosBancoDelta).toBe(45);
  });

  it('D com atraso 2h e HE 1h: compensa e resto 1h negativo no banco', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 120,
      minutosExtra: 60,
      tratamentoDebito: 'D',
      tratamentoCredito: null,
    });
    expect(r.minutosDescontarFolha).toBe(0);
    expect(r.minutosPagarFolha).toBe(0);
    expect(r.minutosBancoDebito).toBe(60);
    expect(r.minutosBancoCredito).toBe(0);
  });

  it('D com atraso 1h e HE 2h: resto 1h positivo no banco', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 60,
      minutosExtra: 120,
      tratamentoDebito: 'D',
    });
    expect(r.minutosDescontarFolha).toBe(0);
    expect(r.minutosBancoCredito).toBe(60);
    expect(r.minutosBancoDebito).toBe(0);
  });

  it('P com débito B: HE paga e atraso permanece no banco', () => {
    const r = aplicarAvaliacaoRhDia({
      minutosAtraso: 120,
      minutosExtra: 60,
      tratamentoDebito: 'B',
      tratamentoCredito: 'P',
    });
    expect(r.minutosBancoDebito).toBe(120);
    expect(r.minutosBancoCredito).toBe(0);
    expect(r.minutosPagarFolha).toBe(60);
  });

  it('resolverTratamentosDoBotao mapeia clique único', () => {
    expect(resolverTratamentosDoBotao('A', { temDebito: true, temCredito: false })).toEqual({
      tratamentoDebito: 'A',
      tratamentoCredito: null,
    });
    expect(resolverTratamentosDoBotao('B', { temDebito: true, temCredito: true })).toEqual({
      tratamentoDebito: 'B',
      tratamentoCredito: 'B',
    });
    expect(resolverTratamentosDoBotao('P', { temDebito: true, temCredito: true })).toEqual({
      tratamentoDebito: undefined,
      tratamentoCredito: 'P',
    });
    expect(resolverTratamentosDoBotao('D', { temDebito: true, temCredito: true })).toEqual({
      tratamentoDebito: 'D',
      tratamentoCredito: null,
    });
  });
});

describe('workshift-rh-evaluation — troca de workshift isolada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * [Teste 6] Troca de Workshift sem perda de dados:
   * F1 e F2 com revisões RH; alterar workshift de F1; batidas F1 preservadas e recalculadas;
   * F2 intacto; nunca delete.
   */
  it('[Teste 6] Troca de workshift do F1 recalcula só F1 e preserva batidas + avaliações F2', async () => {
    const f1 = 'func-1';
    const f2 = 'func-2';
    const batidasF1 = ['08:30', '12:00', '13:00', '18:00'];
    const avaliacaoF2 = {
      id: 'com-f2',
      funcionarioId: f2,
      tratamentoDebito: 'A',
      tratamentoCredito: 'P',
      comentario: 'OK F2',
    };

    // Snapshot F2 (não deve ser tocado)
    p.comentarioConferenciaPontoRh.findMany.mockResolvedValue([avaliacaoF2]);

    p.configuracaoPonto.findUnique
      .mockResolvedValueOnce({
        // existente antes do upsert (workshift antiga)
        workShiftId: 'ws-antiga',
        toleranciaMinutos: 5,
      })
      .mockResolvedValueOnce({
        // cfg usada no recalc
        toleranciaMinutos: 5,
        workShift: {
          entrada1: '08:00',
          saida1: '12:00',
          entrada2: '13:00',
          saida2: '17:00',
        },
      });

    p.configuracaoPonto.upsert.mockResolvedValue({
      id: 'cfg-f1',
      funcionarioId: f1,
      workShiftId: 'ws-nova',
      workShift: {
        id: 'ws-nova',
        entrada1: '08:00',
        saida1: '12:00',
        entrada2: '13:00',
        saida2: '17:00',
      },
    });

    p.funcionario.findUnique.mockResolvedValue({
      id: f1,
      tipoContrato: 'REGISTRADO',
      permitirHorasExtras100: false,
    });

    p.registroPonto.findMany.mockResolvedValue([
      {
        id: 'reg-f1-dia1',
        dataReferencia: new Date(Date.UTC(2026, 5, 10)), // 10/06/2026 (quarta)
        batidasBrutas: batidasF1,
      },
    ]);

    p.registroPonto.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
      batidasBrutas: batidasF1,
    }));

    await upsertPorFuncionario(f1, { workShiftId: 'ws-nova' });

    // Só F1: findMany filtrado por funcionarioId
    expect(p.registroPonto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { funcionarioId: f1 },
      }),
    );

    // Batidas preservadas: update NÃO envia batidasBrutas
    expect(p.registroPonto.update).toHaveBeenCalled();
    const updateData = p.registroPonto.update.mock.calls[0][0].data;
    expect(updateData.batidasBrutas).toBeUndefined();
    expect(updateData.minutosAtraso).toBeDefined();

    // Nunca delete de registros/avaliações
    expect(p.registroPonto.delete).not.toHaveBeenCalled();
    expect(p.registroPonto.deleteMany).not.toHaveBeenCalled();
    expect(p.comentarioConferenciaPontoRh.delete).not.toHaveBeenCalled();
    expect(p.comentarioConferenciaPontoRh.deleteMany).not.toHaveBeenCalled();
    expect(p.comentarioConferenciaPontoRh.update).not.toHaveBeenCalled();

    // F2 intacto: nenhum find/update de F2
    const findManyArgs = JSON.stringify(p.registroPonto.findMany.mock.calls);
    expect(findManyArgs).not.toContain(f2);

    // Avaliações F2 ainda legíveis no "banco" mock
    const comentariosF2 = await p.comentarioConferenciaPontoRh.findMany();
    expect(comentariosF2[0].tratamentoDebito).toBe('A');
    expect(comentariosF2[0].tratamentoCredito).toBe('P');
  });

  it('recalcularMetricasFuncionario ignora registros sem batidas e não deleta', async () => {
    p.funcionario.findUnique.mockResolvedValue({
      id: 'f1',
      tipoContrato: 'REGISTRADO',
      permitirHorasExtras100: false,
    });
    p.configuracaoPonto.findUnique.mockResolvedValue({
      toleranciaMinutos: 5,
      workShift: {
        entrada1: '08:00',
        saida1: '12:00',
        entrada2: '13:00',
        saida2: '17:00',
      },
    });
    p.registroPonto.findMany.mockResolvedValue([
      {
        id: 'sem-batida',
        dataReferencia: new Date(Date.UTC(2026, 5, 11)),
        batidasBrutas: [],
      },
    ]);

    const result = await recalcularMetricasFuncionario('f1');
    expect(result.registrosAtualizados).toBe(0);
    expect(result.registrosIgnoradosSemBatidas).toBe(1);
    expect(p.registroPonto.update).not.toHaveBeenCalled();
    expect(p.registroPonto.delete).not.toHaveBeenCalled();
  });
});
