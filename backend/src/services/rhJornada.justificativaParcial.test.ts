import {
  atualizarJustificativaParcial,
  criarJustificativaParcial,
  excluirJustificativaParcial,
} from './rhJornada.service';

const mockRegistroFindUnique = jest.fn();
const mockOcorrenciaFindUnique = jest.fn();
const mockOcorrenciaUpsert = jest.fn();
const mockOcorrenciaUpdate = jest.fn();
const mockOcorrenciaDelete = jest.fn();
const mockFuncionarioFindUnique = jest.fn();
const mockFuncionarioUpdate = jest.fn();
const mockRegistroFindFirst = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    registroPonto: {
      findUnique: (...args: unknown[]) => mockRegistroFindUnique(...args),
      findFirst: (...args: unknown[]) => mockRegistroFindFirst(...args),
    },
    ocorrenciaPontoRh: {
      findUnique: (...args: unknown[]) => mockOcorrenciaFindUnique(...args),
      upsert: (...args: unknown[]) => mockOcorrenciaUpsert(...args),
      update: (...args: unknown[]) => mockOcorrenciaUpdate(...args),
      delete: (...args: unknown[]) => mockOcorrenciaDelete(...args),
    },
    funcionario: {
      findUnique: (...args: unknown[]) => mockFuncionarioFindUnique(...args),
      update: (...args: unknown[]) => mockFuncionarioUpdate(...args),
    },
  },
}));

const paramsBase = {
  funcionarioId: 'func-1',
  referenciaAno: 2026,
  referenciaMes: 3,
  dia: 12,
  descricao: 'Consulta médica',
  justificativaTipo: 'SAIDA_ANTECIPADA' as const,
  horaInicio: '12:00',
  horaFim: '13:00',
};

function mockSaldoBanco(normais: number, extras100 = 0) {
  let saldoN = normais;
  const saldo100 = extras100;
  mockFuncionarioFindUnique.mockImplementation(async () => ({
    saldoBancoHoras: saldoN + saldo100,
    saldoBancoHorasNormaisExcedente: saldoN,
    saldoBancoHorasExtras100: saldo100,
  }));
  mockFuncionarioUpdate.mockImplementation(async ({ data }: { data: { saldoBancoHorasNormaisExcedente: number } }) => {
    saldoN = data.saldoBancoHorasNormaisExcedente;
    return {};
  });
}

describe('rhJornada — justificativa parcial e banco de horas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistroFindUnique.mockResolvedValue({ id: 'reg-1' });
    mockRegistroFindFirst.mockResolvedValue({ id: 'reg-1' });
    mockOcorrenciaFindUnique.mockResolvedValue(null);
    mockOcorrenciaUpsert.mockResolvedValue({ id: 'occ-jp-1' });
    mockOcorrenciaUpdate.mockResolvedValue({ id: 'occ-jp-1' });
    mockFuncionarioUpdate.mockResolvedValue({});
  });

  it('criar com ABONAR não altera saldo do banco', async () => {
    mockSaldoBanco(10);

    await criarJustificativaParcial({
      ...paramsBase,
      classificacaoJustificativa: 'ABONAR',
    });

    expect(mockFuncionarioUpdate).not.toHaveBeenCalled();
    expect(mockOcorrenciaUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          classificacaoJustificativa: 'ABONAR',
          minutos: 0,
        }),
      }),
    );
  });

  it('criar com DESCONTAR_BANCO debita 1h do banco (permite saldo negativo)', async () => {
    mockSaldoBanco(2);

    await criarJustificativaParcial({
      ...paramsBase,
      classificacaoJustificativa: 'DESCONTAR_BANCO',
    });

    expect(mockFuncionarioUpdate).toHaveBeenCalledTimes(1);
    expect(mockFuncionarioUpdate).toHaveBeenCalledWith({
      where: { id: 'func-1' },
      data: {
        saldoBancoHorasNormaisExcedente: 1,
        saldoBancoHoras: 1,
      },
    });
    expect(mockOcorrenciaUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          classificacaoJustificativa: 'DESCONTAR_BANCO',
          minutos: 60,
        }),
      }),
    );
  });

  it('criar DESCONTAR_BANCO estorna débito anterior ao substituir justificativa no mesmo dia', async () => {
    mockOcorrenciaFindUnique.mockResolvedValue({
      id: 'occ-antiga',
      classificacaoJustificativa: 'DESCONTAR_BANCO',
      minutos: 30,
    });
    mockSaldoBanco(5);

    await criarJustificativaParcial({
      ...paramsBase,
      horaInicio: '12:00',
      horaFim: '13:00',
      classificacaoJustificativa: 'DESCONTAR_BANCO',
    });

    expect(mockFuncionarioUpdate).toHaveBeenCalledTimes(2);
    expect(mockFuncionarioUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'func-1' },
      data: {
        saldoBancoHorasNormaisExcedente: 5.5,
        saldoBancoHoras: 5.5,
      },
    });
    expect(mockFuncionarioUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'func-1' },
      data: {
        saldoBancoHorasNormaisExcedente: 4.5,
        saldoBancoHoras: 4.5,
      },
    });
  });

  it('atualizar de DESCONTAR_BANCO para ABONAR estorna banco e zera minutos na ocorrência', async () => {
    mockOcorrenciaFindUnique.mockResolvedValue({
      id: 'occ-jp-1',
      tipo: 'JUSTIFICATIVA_PARCIAL',
      status: 'APROVADO_RH',
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 2, 12, 12, 0, 0)),
      classificacaoJustificativa: 'DESCONTAR_BANCO',
      minutos: 60,
      documentoAnexoUrl: null,
    });
    mockSaldoBanco(3);

    await atualizarJustificativaParcial('occ-jp-1', {
      descricao: 'Ajuste',
      justificativaTipo: 'SAIDA_ANTECIPADA',
      horaInicio: '12:00',
      horaFim: '13:00',
      classificacaoJustificativa: 'ABONAR',
    });

    expect(mockFuncionarioUpdate).toHaveBeenCalledTimes(1);
    expect(mockFuncionarioUpdate).toHaveBeenCalledWith({
      where: { id: 'func-1' },
      data: {
        saldoBancoHorasNormaisExcedente: 4,
        saldoBancoHoras: 4,
      },
    });
    expect(mockOcorrenciaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classificacaoJustificativa: 'ABONAR',
          minutos: 0,
        }),
      }),
    );
  });

  it('atualizar intervalo com DESCONTAR_BANCO estorna antigo e debita novo', async () => {
    mockOcorrenciaFindUnique.mockResolvedValue({
      id: 'occ-jp-1',
      tipo: 'JUSTIFICATIVA_PARCIAL',
      status: 'APROVADO_RH',
      funcionarioId: 'func-1',
      dataReferencia: new Date(Date.UTC(2026, 2, 12, 12, 0, 0)),
      classificacaoJustificativa: 'DESCONTAR_BANCO',
      minutos: 60,
      documentoAnexoUrl: null,
    });
    mockSaldoBanco(8);

    await atualizarJustificativaParcial('occ-jp-1', {
      descricao: 'Ajuste horário',
      justificativaTipo: 'SAIDA_ANTECIPADA',
      horaInicio: '12:00',
      horaFim: '12:30',
      classificacaoJustificativa: 'DESCONTAR_BANCO',
    });

    expect(mockFuncionarioUpdate).toHaveBeenCalledTimes(2);
    expect(mockFuncionarioUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'func-1' },
      data: {
        saldoBancoHorasNormaisExcedente: 9,
        saldoBancoHoras: 9,
      },
    });
    expect(mockFuncionarioUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'func-1' },
      data: {
        saldoBancoHorasNormaisExcedente: 8.5,
        saldoBancoHoras: 8.5,
      },
    });
  });

  it('rejeita atualização de justificativa reprovada', async () => {
    mockOcorrenciaFindUnique.mockResolvedValue({
      id: 'occ-jp-1',
      tipo: 'JUSTIFICATIVA_PARCIAL',
      status: 'REPROVADO',
      funcionarioId: 'func-1',
    });

    await expect(
      atualizarJustificativaParcial('occ-jp-1', {
        descricao: 'x',
        justificativaTipo: 'SAIDA_ANTECIPADA',
        horaInicio: '12:00',
        horaFim: '13:00',
      }),
    ).rejects.toThrow('Não é possível editar uma justificativa reprovada');
  });

  it('excluir justificativa DESCONTAR_BANCO estorna minutos do banco', async () => {
    mockSaldoBanco(8);
    mockOcorrenciaFindUnique.mockResolvedValue({
      id: 'occ-jp-1',
      tipo: 'JUSTIFICATIVA_PARCIAL',
      status: 'APROVADO_RH',
      funcionarioId: 'func-1',
      classificacaoJustificativa: 'DESCONTAR_BANCO',
      minutos: 60,
      documentoAnexoUrl: null,
    });
    mockOcorrenciaDelete.mockResolvedValue({ id: 'occ-jp-1' });

    await excluirJustificativaParcial('occ-jp-1');

    expect(mockFuncionarioUpdate).toHaveBeenCalledWith({
      where: { id: 'func-1' },
      data: {
        saldoBancoHorasNormaisExcedente: 9,
        saldoBancoHoras: 9,
      },
    });
    expect(mockOcorrenciaDelete).toHaveBeenCalledWith({ where: { id: 'occ-jp-1' } });
  });
});
