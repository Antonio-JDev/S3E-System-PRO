import { Request, Response } from 'express';
import { AlocacoesController } from './alocacoesController';

const mockFindMany = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    alocacaoEquipe: {
      findMany: (...args: unknown[]) => mockFindMany(...args)
    }
  }
}));

describe('AlocacoesController.verificarConflitos', () => {
  const controller = new AlocacoesController();
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { status: statusMock, json: jsonMock };
  });

  it('retorna 400 quando faltam parâmetros obrigatórios', async () => {
    await controller.verificarConflitos(
      { query: { equipeId: 'eq1' } } as unknown as Request,
      res as Response
    );

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('ignora conflitos na mesma obra quando obraId é informado', async () => {
    mockFindMany.mockResolvedValue([]);

    await controller.verificarConflitos(
      {
        query: {
          equipeId: 'eq1',
          dataInicio: '2026-06-01',
          dataFim: '2026-06-10',
          obraId: 'obra-mesma'
        }
      } as unknown as Request,
      res as Response
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          equipeId: 'eq1',
          obraId: { not: 'obra-mesma' }
        })
      })
    );
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: { temConflito: false, conflitos: [] }
    });
  });

  it('exclui a própria tarefa ao editar (tarefaId)', async () => {
    mockFindMany.mockResolvedValue([]);

    await controller.verificarConflitos(
      {
        query: {
          equipeId: 'eq1',
          dataInicio: '2026-06-01',
          dataFim: '2026-06-10',
          obraId: 'obra1',
          tarefaId: 'tarefa-atual'
        }
      } as unknown as Request,
      res as Response
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tarefaId: { not: 'tarefa-atual' }
        })
      })
    );
  });

  it('reporta conflito quando equipe está alocada em outra obra', async () => {
    mockFindMany.mockResolvedValue([
      {
        equipeId: 'eq1',
        tarefaId: 't-outra',
        dataInicio: new Date('2026-06-02'),
        dataFim: new Date('2026-06-08'),
        equipe: { nome: 'Equipe A' }
      }
    ]);

    await controller.verificarConflitos(
      {
        query: {
          equipeId: 'eq1',
          dataInicio: '2026-06-01',
          dataFim: '2026-06-10',
          obraId: 'obra-atual'
        }
      } as unknown as Request,
      res as Response
    );

    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: {
        temConflito: true,
        conflitos: [
          expect.objectContaining({
            equipeNome: 'Equipe A',
            tarefaId: 't-outra'
          })
        ]
      }
    });
  });
});
