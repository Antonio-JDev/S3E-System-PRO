jest.mock('../lib/prisma', () => ({
  prisma: {
    projeto: { findUnique: jest.fn(), update: jest.fn() },
    obra: { findUnique: jest.fn() },
  },
}));

jest.mock('./obra.service', () => ({
  __esModule: true,
  default: {
    deletarObraParaRollback: jest.fn().mockResolvedValue({ removida: true }),
  },
}));

import { prisma } from '../lib/prisma';
import obraService from './obra.service';
import { ProjetosService } from './projetos.service';

describe('ProjetosService.reverterStatus', () => {
  const service = new ProjetosService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reverte EXECUCAO para APROVADO e remove obra', async () => {
    (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'EXECUCAO',
    });
    (prisma.obra.findUnique as jest.Mock).mockResolvedValue({ id: 'obra-1', projetoId: 'p1' });
    (prisma.projeto.update as jest.Mock).mockResolvedValue({ id: 'p1', status: 'APROVADO' });

    const r = await service.reverterStatus('p1', 'APROVADO');

    expect(obraService.deletarObraParaRollback).toHaveBeenCalledWith('obra-1');
    expect(prisma.projeto.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'APROVADO' },
    });
    expect(r.status).toBe('APROVADO');
  });

  it('rejeita destino igual ou posterior ao atual', async () => {
    (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      status: 'APROVADO',
    });

    await expect(service.reverterStatus('p1', 'APROVADO')).rejects.toThrow(/anterior/);
  });

  it('rejeita destino VALIDADO (removido do fluxo)', async () => {
    await expect(service.reverterStatus('p1', 'VALIDADO' as any)).rejects.toThrow(/inválido/);
  });
});
