import { StatusConsistenciaPonto, TipoContratoFuncionario } from '@prisma/client';
import { RhService } from './rh.service';

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();

jest.mock('./bancoHorasExcesso.service', () => ({
  sincronizarExcessoCompetencia: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    funcionario: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    lancamentoFolha: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

function baseFuncionario(over: Record<string, unknown> = {}) {
  return {
    id: 'func-1',
    nome: 'Colaborador Teste',
    salario: 3000,
    salarioBase: 3000,
    valorHora: 15,
    valorDiaria: null,
    cargaHorariaMensal: 220,
    saldoBancoHoras: 0,
    beneficios: [],
    configuracaoPonto: null,
    registrosPonto: [],
    ...over,
  };
}

describe('RhService.calcularFolhaMes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it('lança se funcionário não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(
      RhService.calcularFolhaMes({
        funcionarioId: 'x',
        dataReferencia: new Date(Date.UTC(2026, 2, 10)),
      }),
    ).rejects.toThrow('Funcionário não encontrado');
  });

  it('AUTÔNOMO: conta diária em dia útil e horas FDS com valor da config', async () => {
    mockFindUnique.mockResolvedValue(
      baseFuncionario({
        tipoContrato: TipoContratoFuncionario.AUTONOMO,
        valorDiaria: 100,
        valorHora: 50,
        configuracaoPonto: { valorHoraFimDeSemana: 80 },
        registrosPonto: [
          {
            dataReferencia: new Date(Date.UTC(2026, 2, 2, 12, 0, 0)),
            horasNormais: 8,
            horasExtras50: 0,
            horasExtras100: 0,
            ehFimDeSemana: false,
          },
          {
            dataReferencia: new Date(Date.UTC(2026, 2, 7, 12, 0, 0)),
            horasNormais: 4,
            horasExtras50: 0,
            horasExtras100: 0,
            ehFimDeSemana: true,
          },
        ],
      }),
    );

    const r = await RhService.calcularFolhaMes({
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 2, 15)),
    });

    expect(r.tipoContrato).toBe(TipoContratoFuncionario.AUTONOMO);
    expect(r.autonomo?.modo).toBe('legacy');
    expect(r.autonomo?.diasUteisComRegistro).toBe(1);
    expect(r.autonomo?.valorDiaria).toBe(100);
    expect(r.autonomo?.valorHoraFimDeSemana).toBe(80);
    expect(r.autonomo?.subtotalDiarias).toBe(100);
    expect(r.autonomo?.subtotalFimDeSemana).toBe(4 * 80);
    expect(r.horas.fimDeSemana).toBe(4);
    expect(r.valores.totalAPagar).toBe(100 + 320);
  });

  it('AUTÔNOMO por_hora: base = diária × dias úteis; HE50 e noturna como acréscimo', async () => {
    mockFindUnique.mockResolvedValue(
      baseFuncionario({
        tipoContrato: TipoContratoFuncionario.AUTONOMO,
        valorDiaria: 100,
        valorHora: 10,
        valorHoraNormalAutonomo: 10,
        valorHoraExtra50Autonomo: 15,
        valorHoraExtra100Autonomo: 20,
        valorHoraNoturna20Autonomo: 12,
        configuracaoPonto: null,
        registrosPonto: [
          {
            dataReferencia: new Date(Date.UTC(2026, 2, 10, 12, 0, 0)),
            horasNormais: 8,
            horasExtras50: 0,
            horasExtras100: 0,
            ehFimDeSemana: false,
            entrada: new Date(Date.UTC(2026, 2, 10, 11, 0, 0)),
            saida: new Date(Date.UTC(2026, 2, 11, 1, 0, 0)),
            statusConsistencia: StatusConsistenciaPonto.CONSISTENTE,
          },
        ],
      }),
    );

    const r = await RhService.calcularFolhaMes({
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 2, 15)),
    });

    expect(r.autonomo?.modo).toBe('por_hora');
    expect(r.autonomo?.diasUteisComRegistro).toBe(1);
    expect(r.autonomo?.subtotalDiarias).toBe(100);
    expect(r.autonomo?.subtotalHoraExtra50).toBeCloseTo(7.5, 5);
    expect(r.autonomo?.subtotalHoraNoturna).toBeCloseTo(48, 5);
    expect(r.autonomo?.totalAcrescimosJornada).toBeCloseTo(55.5, 5);
    expect(r.valores.valorHorasNormais).toBe(100);
    expect(r.valores.valorHorasAutonomo).toBeCloseTo(155.5, 5);
    expect(r.valores.totalAPagar).toBeCloseTo(155.5, 5);
  });

  it('AUTÔNOMO: fallback valor hora FDS = valorHora quando sem config', async () => {
    mockFindUnique.mockResolvedValue(
      baseFuncionario({
        tipoContrato: TipoContratoFuncionario.AUTONOMO,
        valorDiaria: 50,
        valorHora: 40,
        configuracaoPonto: null,
        registrosPonto: [
          {
            dataReferencia: new Date(Date.UTC(2026, 2, 8, 12, 0, 0)),
            horasNormais: 2,
            horasExtras50: 0,
            horasExtras100: 0,
            ehFimDeSemana: true,
          },
        ],
      }),
    );

    const r = await RhService.calcularFolhaMes({
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 2, 1)),
    });

    expect(r.autonomo?.modo).toBe('legacy');
    expect(r.autonomo?.valorHoraFimDeSemana).toBe(40);
    expect(r.autonomo?.subtotalFimDeSemana).toBe(2 * 40);
  });

  it('REGISTRADO: total a pagar = salário + benefícios; excedente do mês e saldo banco (projetado = saldo após sync)', async () => {
    mockFindUnique.mockResolvedValue(
      baseFuncionario({
        tipoContrato: TipoContratoFuncionario.REGISTRADO,
        salarioBase: 2200,
        cargaHorariaMensal: 220,
        saldoBancoHoras: 5,
        beneficios: [{ valorPadrao: 100 }],
        registrosPonto: [
          {
            dataReferencia: new Date(Date.UTC(2026, 2, 3, 12, 0, 0)),
            horasNormais: 200,
            horasExtras50: 30,
            horasExtras100: 0,
            ehFimDeSemana: false,
          },
        ],
      }),
    );

    const r = await RhService.calcularFolhaMes({
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 2, 20)),
    });

    expect(r.valores.totalAPagar).toBe(2200 + 100);
    expect(r.registrado?.horasTrabalhadasNoMes).toBe(230);
    expect(r.registrado?.horasExcedentesParaBanco).toBe(10);
    expect(r.registrado?.saldoBancoHorasAtual).toBe(5);
    expect(r.registrado?.saldoBancoHorasProjetado).toBe(5);
  });

  it('REGISTRADO 40h (carga 160): horas negativas do mês somam 160h quando sem registros', async () => {
    mockFindUnique.mockResolvedValue(
      baseFuncionario({
        tipoContrato: TipoContratoFuncionario.REGISTRADO,
        cargaHorariaMensal: 160,
        registrosPonto: [],
        configuracaoPonto: {
          toleranciaMinutos: 5,
          workShift: { entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:00', nome: '40h - 08:00/12:00/17:00', id: 'ws40' },
        },
      }),
    );

    const r = await RhService.calcularFolhaMes({
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 3, 15)), // abril/2026
    });

    // Deve bater a meta mensal independentemente de feriados (distribuição por dias úteis).
    expect(r.registrado?.cargaHorariaMensal).toBe(160);
    expect(r.registrado?.horasNegativas).toBeCloseTo(160, 6);
  });

  it('soma lançamentos de desconto e acréscimo no total', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'l1',
        categoria: 'ADIANTAMENTO',
        valor: 200,
        descricao: null,
      },
      {
        id: 'l2',
        categoria: 'ACRESCIMO',
        valor: 50,
        descricao: null,
      },
    ]);

    mockFindUnique.mockResolvedValue(
      baseFuncionario({
        tipoContrato: TipoContratoFuncionario.REGISTRADO,
        salarioBase: 1000,
        beneficios: [],
      }),
    );

    const r = await RhService.calcularFolhaMes({
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 0, 5)),
    });

    expect(r.totaisLancamentos.subtracoes).toBe(200);
    expect(r.totaisLancamentos.acrescimos).toBe(50);
    expect(r.valores.totalAPagar).toBe(1000 - 200 + 50);
    expect(r.lancamentos).toHaveLength(2);
  });

  describe('conferenciaPonto', () => {
    it('retorna array com todos os dias do mês', async () => {
      mockFindUnique.mockResolvedValue(
        baseFuncionario({
          tipoContrato: TipoContratoFuncionario.REGISTRADO,
          registrosPonto: [],
        }),
      );

      const r = await RhService.calcularFolhaMes({
        funcionarioId: 'func-1',
        dataReferencia: new Date(Date.UTC(2026, 1, 15)),
      });

      expect(r.conferenciaPonto).toHaveLength(28);
      expect(r.conferenciaPonto[0].dia).toBe(1);
      expect(r.conferenciaPonto[27].dia).toBe(28);
    });

    it('marca dia com registro abaixo da meta como OK_PARCIAL', async () => {
      mockFindUnique.mockResolvedValue(
        baseFuncionario({
          tipoContrato: TipoContratoFuncionario.REGISTRADO,
          registrosPonto: [
            {
              dataReferencia: new Date(Date.UTC(2026, 2, 5, 12, 0, 0)),
              horasNormais: 8,
              horasExtras50: 0,
              horasExtras100: 0,
              ehFimDeSemana: false,
              entrada: new Date(Date.UTC(2026, 2, 5, 11, 0, 0)),
              saida: new Date(Date.UTC(2026, 2, 5, 22, 0, 0)),
              statusConsistencia: StatusConsistenciaPonto.CONSISTENTE,
            },
          ],
        }),
      );

      const r = await RhService.calcularFolhaMes({
        funcionarioId: 'func-1',
        dataReferencia: new Date(Date.UTC(2026, 2, 1)),
      });

      const dia5 = r.conferenciaPonto.find((d) => d.dia === 5);
      expect(dia5?.temRegistro).toBe(true);
      expect(dia5?.situacao).toBe('OK_PARCIAL');
      expect(dia5?.horasLiquidas).toBe(8);
      expect(dia5?.entrada).toBe('08:00');
      expect(dia5?.saida).toBe('19:00');
    });

    it('marca dia sem registro como "Sem registro"', async () => {
      mockFindUnique.mockResolvedValue(
        baseFuncionario({
          tipoContrato: TipoContratoFuncionario.REGISTRADO,
          registrosPonto: [],
        }),
      );

      const r = await RhService.calcularFolhaMes({
        funcionarioId: 'func-1',
        dataReferencia: new Date(Date.UTC(2026, 2, 1)),
      });

      const dia10 = r.conferenciaPonto.find((d) => d.dia === 10);
      expect(dia10?.temRegistro).toBe(false);
      expect(dia10?.situacao).toBe('Sem registro');
    });

    it('marca dia inconsistente corretamente', async () => {
      mockFindUnique.mockResolvedValue(
        baseFuncionario({
          tipoContrato: TipoContratoFuncionario.REGISTRADO,
          registrosPonto: [
            {
              dataReferencia: new Date(Date.UTC(2026, 2, 12, 12, 0, 0)),
              horasNormais: 0,
              horasExtras50: 0,
              horasExtras100: 0,
              ehFimDeSemana: false,
              entrada: new Date(Date.UTC(2026, 2, 12, 8, 0, 0)),
              saida: null,
              statusConsistencia: StatusConsistenciaPonto.INCONSISTENTE,
            },
          ],
        }),
      );

      const r = await RhService.calcularFolhaMes({
        funcionarioId: 'func-1',
        dataReferencia: new Date(Date.UTC(2026, 2, 1)),
      });

      const dia12 = r.conferenciaPonto.find((d) => d.dia === 12);
      expect(dia12?.temRegistro).toBe(true);
      expect(dia12?.situacao).toBe('Inconsistente');
      expect(dia12?.statusConsistencia).toBe(StatusConsistenciaPonto.INCONSISTENTE);
    });

    it('identifica fim de semana corretamente', async () => {
      mockFindUnique.mockResolvedValue(
        baseFuncionario({
          tipoContrato: TipoContratoFuncionario.REGISTRADO,
          registrosPonto: [],
        }),
      );

      const r = await RhService.calcularFolhaMes({
        funcionarioId: 'func-1',
        dataReferencia: new Date(Date.UTC(2026, 2, 1)),
      });

      const dia7 = r.conferenciaPonto.find((d) => d.dia === 7);
      const dia8 = r.conferenciaPonto.find((d) => d.dia === 8);
      const dia9 = r.conferenciaPonto.find((d) => d.dia === 9);

      expect(dia7?.ehFimDeSemana).toBe(true);
      expect(dia7?.diaSemanaLabel).toBe('Sáb');
      expect(dia8?.ehFimDeSemana).toBe(true);
      expect(dia8?.diaSemanaLabel).toBe('Dom');
      expect(dia9?.ehFimDeSemana).toBe(false);
      expect(dia9?.diaSemanaLabel).toBe('Seg');
    });

    it('marca feriado em dia útil com nome (ex.: Tiradentes)', async () => {
      mockFindUnique.mockResolvedValue(
        baseFuncionario({
          tipoContrato: TipoContratoFuncionario.REGISTRADO,
          registrosPonto: [],
        }),
      );

      const r = await RhService.calcularFolhaMes({
        funcionarioId: 'func-1',
        dataReferencia: new Date(Date.UTC(2026, 3, 10)),
      });

      const dia21 = r.conferenciaPonto.find((d) => d.dia === 21);
      expect(dia21?.ehFeriado).toBe(true);
      expect(dia21?.nomeFeriado).toBe('Tiradentes');
      expect(dia21?.ehFimDeSemana).toBe(false);
    });
  });
});
