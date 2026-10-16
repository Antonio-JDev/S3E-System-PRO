import { prisma } from '../lib/prisma';
import {
  ACOES_PURGA_LOG_DEV,
  corteRetencao,
  devePurgarLogDev,
  executarPurgaLogsDev,
  filtroPrismaPurga,
  RETENCAO_DIAS,
} from './devLogRetention.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    auditLog: { deleteMany: jest.fn() },
  },
}));

const deleteMany = prisma.auditLog.deleteMany as jest.Mock;

const AGORA = new Date('2026-10-13T03:00:00.000Z');

function linha(
  parcial: Partial<{
    id: string;
    createdAt: Date;
    action: string;
    entity: string | null;
    chainId: string | null;
    hash: string | null;
  }>
) {
  return {
    id: parcial.id || 'id',
    createdAt: parcial.createdAt || AGORA,
    action: parcial.action || 'CREATE',
    entity: parcial.entity ?? 'api',
    chainId: parcial.chainId ?? null,
    hash: parcial.hash ?? null,
  };
}

describe('retenção dos logs da página dev', () => {
  const corte = corteRetencao(AGORA);
  const velho = new Date(AGORA.getTime() - 22 * 24 * 60 * 60 * 1000);
  const recente = new Date(AGORA.getTime() - 2 * 24 * 60 * 60 * 1000);
  const noLimite = new Date(corte.getTime());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('apaga o que tem mais de 21 dias e mantém os mais novos, NF-e, login e orçamento', () => {
    expect(RETENCAO_DIAS).toBe(21);
    const registros = [
      linha({ id: 'velho-http', createdAt: velho, action: 'ERROR', entity: 'clientes' }),
      linha({ id: 'recente', createdAt: recente, action: 'CREATE', entity: 'compras' }),
      linha({ id: 'exato-21', createdAt: noLimite, action: 'UPDATE', entity: 'kits' }),
      linha({ id: 'login', createdAt: velho, action: 'LOGIN', entity: 'auth' }),
      linha({ id: 'logout', createdAt: velho, action: 'LOGOUT', entity: 'auth' }),
      linha({ id: 'nfe-acao', createdAt: velho, action: 'NFE_EMISSAO_AUTORIZADA', entity: 'NFe', chainId: 'ch', hash: 'h' }),
      linha({ id: 'nfe-entity', createdAt: velho, action: 'ERROR', entity: 'NFe' }),
      linha({ id: 'nfe-hash', createdAt: velho, action: 'CREATE', entity: 'outro', hash: 'abc' }),
      linha({ id: 'orcamento', createdAt: velho, action: 'CREATE', entity: 'orcamento' }),
      linha({ id: 'negocio', createdAt: velho, action: 'MODIFICACAO_ORCAMENTO_BLOQUEADA', entity: 'venda' }),
    ];

    const removidos = registros.filter((row) => devePurgarLogDev(row, corte));
    const mantidos = registros.filter((row) => !devePurgarLogDev(row, corte));

    expect(removidos.map((row) => row.id)).toEqual(['velho-http']);
    expect(mantidos.map((row) => row.id)).toEqual([
      'recente',
      'exato-21',
      'login',
      'logout',
      'nfe-acao',
      'nfe-entity',
      'nfe-hash',
      'orcamento',
      'negocio',
    ]);
  });

  it('chama deleteMany só com o filtro da página e é idempotente', async () => {
    deleteMany.mockResolvedValueOnce({ count: 3 }).mockResolvedValueOnce({ count: 0 });

    const primeira = await executarPurgaLogsDev(AGORA);
    const segunda = await executarPurgaLogsDev(AGORA);

    expect(primeira).toEqual({ removidos: 3, corte: corte.toISOString() });
    expect(segunda.removidos).toBe(0);
    expect(deleteMany).toHaveBeenCalledTimes(2);
    expect(deleteMany).toHaveBeenCalledWith({ where: filtroPrismaPurga(corte) });

    const where = filtroPrismaPurga(corte);
    expect(where.createdAt.lt.toISOString()).toBe(corte.toISOString());
    expect(where.action.in).toEqual([...ACOES_PURGA_LOG_DEV]);
    expect(where.chainId).toBeNull();
    expect(where.hash).toBeNull();
    expect(JSON.stringify(where.NOT)).toContain('NFe');
    expect(JSON.stringify(where.NOT)).toContain('orcamento');
    expect(where.action.in).not.toContain('LOGIN');
    expect(where.action.in).not.toContain('NFE_EMISSAO_AUTORIZADA');
  });
});
