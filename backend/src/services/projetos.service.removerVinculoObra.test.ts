jest.mock('../lib/prisma', () => ({
  prisma: {
    projeto: { findUnique: jest.fn(), update: jest.fn() },
    obra: { findUnique: jest.fn(), delete: jest.fn() },
    compra: { updateMany: jest.fn() },
    alocacaoObra: { deleteMany: jest.fn() },
    alocacaoEquipe: { deleteMany: jest.fn() },
    eventoCalendario: { deleteMany: jest.fn(), updateMany: jest.fn() },
    apontamentoOs: { deleteMany: jest.fn(), updateMany: jest.fn() },
    task: { deleteMany: jest.fn() },
  },
}));

jest.mock('./obra.service', () => ({
  __esModule: true,
  default: {
    deletarObraParaRollback: jest.fn(),
  },
}));

jest.mock('./estoque.service', () => ({
  EstoqueService: {
    estornarBaixaPorObra: jest.fn().mockResolvedValue(0),
  },
}));

import { prisma } from '../lib/prisma';
import { EstoqueService } from './estoque.service';
import obraService from './obra.service';
import { ProjetosService } from './projetos.service';

describe('ProjetosService.removerVinculoObra', () => {
  const service = new ProjetosService();

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.compra.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.alocacaoEquipe.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.obra.delete as jest.Mock).mockResolvedValue({ id: 'obra-1' });
    (prisma.alocacaoObra.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.projeto.update as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'APROVADO',
      semObra: true,
    });
  });

  it('marca semObra, volta para APROVADO, remove obra e alocações e preserva calendário e apontamentos', async () => {
    (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'CONCLUIDO',
      semObra: false,
      dataFim: new Date('2026-01-10'),
      dataConclusao: new Date('2026-01-11'),
      concluidoPorId: 'user-1',
    });
    (prisma.obra.findUnique as jest.Mock).mockResolvedValue({ id: 'obra-1', projetoId: 'p1' });

    const r = await service.removerVinculoObra('p1', '  Obra encerrada no campo  ');

    expect(r.status).toBe('APROVADO');
    expect(r.semObra).toBe(true);

    expect(prisma.compra.updateMany).toHaveBeenCalledWith({
      where: { obraId: 'obra-1' },
      data: { obraId: null },
    });
    expect(EstoqueService.estornarBaixaPorObra).toHaveBeenCalledWith('obra-1', 'p1');
    expect(prisma.obra.delete).toHaveBeenCalledWith({ where: { id: 'obra-1' } });
    expect(prisma.alocacaoObra.deleteMany).toHaveBeenCalledWith({ where: { projetoId: 'p1' } });

    const ordemCompra = (prisma.compra.updateMany as jest.Mock).mock.invocationCallOrder[0];
    const ordemDeleteObra = (prisma.obra.delete as jest.Mock).mock.invocationCallOrder[0];
    expect(ordemCompra).toBeLessThan(ordemDeleteObra);

    expect(prisma.projeto.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        semObra: true,
        justificativaSemObra: 'Obra encerrada no campo',
        status: 'APROVADO',
        dataFim: null,
        dataConclusao: null,
        concluidoPorId: null,
      },
    });

    expect(prisma.eventoCalendario.deleteMany).not.toHaveBeenCalled();
    expect(prisma.eventoCalendario.updateMany).not.toHaveBeenCalled();
    expect(prisma.apontamentoOs.deleteMany).not.toHaveBeenCalled();
    expect(prisma.apontamentoOs.updateMany).not.toHaveBeenCalled();
    expect(prisma.task.deleteMany).not.toHaveBeenCalled();
    expect(obraService.deletarObraParaRollback).not.toHaveBeenCalled();
  });

  it('rejeita justificativa com menos de 3 caracteres', async () => {
    await expect(service.removerVinculoObra('p1', 'ok')).rejects.toThrow(/mínimo 3/);
    expect(prisma.projeto.findUnique).not.toHaveBeenCalled();
    expect(prisma.obra.delete).not.toHaveBeenCalled();
  });
});
