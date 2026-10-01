import { prisma } from '../lib/prisma';
import { getFailedNfeDetails, getSystemLogs, getUserSessionAudit } from './debugMcp.handlers';

jest.mock('../lib/prisma', () => ({
  prisma: {
    auditLog: { findMany: jest.fn() },
    notaFiscal: { findFirst: jest.fn(), findMany: jest.fn() },
    nfse: { findFirst: jest.fn(), findMany: jest.fn() },
    nFeFila: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));

const auditFindMany = prisma.auditLog.findMany as jest.Mock;
const notaFindFirst = prisma.notaFiscal.findFirst as jest.Mock;
const notaFindMany = prisma.notaFiscal.findMany as jest.Mock;
const nfseFindFirst = prisma.nfse.findFirst as jest.Mock;
const nfseFindMany = prisma.nfse.findMany as jest.Mock;
const filaFindFirst = (prisma as any).nFeFila.findFirst as jest.Mock;

describe('handlers MCP de debug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filtra logs por level e respeita o limit', async () => {
    auditFindMany.mockResolvedValue([
      {
        id: '1',
        action: 'NFE_EMISSAO_REJEITADA',
        description: 'NF-e rejeitada',
        createdAt: new Date('2026-10-01T12:00:00.000Z'),
        metadata: { status: '539', mensagem: 'Rejeição: duplicidade' },
      },
      {
        id: '2',
        action: 'LOGIN',
        description: 'Entrou no sistema',
        createdAt: new Date('2026-10-01T11:00:00.000Z'),
      },
      {
        id: '3',
        action: 'WARN_ESTOQUE',
        description: 'Estoque baixo',
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
      },
    ]);

    const resultado = await getSystemLogs({ level: 'ERROR', limit: 10, startDate: '2026-10-01T00:00:00.000Z' });

    expect(resultado.ok).toBe(true);
    expect(resultado.total).toBe(1);
    const logs = resultado.logs as Array<{ id: string; nivel: string; acao: string }>;
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('1');
    expect(logs[0].nivel).toBe('ERROR');
    expect(auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    );
    const where = auditFindMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('ERROR');
    expect(where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('usa limit 50 quando o parâmetro não vem', async () => {
    auditFindMany.mockResolvedValue([]);
    await getSystemLogs({});
    expect(auditFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
  });

  it('responde que a NF-e não existe sem lançar erro', async () => {
    notaFindFirst.mockResolvedValue(null);
    filaFindFirst.mockResolvedValue(null);
    nfseFindFirst.mockResolvedValue(null);

    const resultado = await getFailedNfeDetails({ nfeId: 'nota-inexistente' });

    expect(resultado).toMatchObject({
      ok: true,
      encontrada: false,
      nfeId: 'nota-inexistente',
    });
    expect(String(resultado.mensagem)).toMatch(/não encontrada/i);
  });

  it('recusa userId vazio sem consultar o banco', async () => {
    const resultado = await getUserSessionAudit({ userId: '   ' });
    expect(resultado).toEqual({ ok: false, error: 'Informe o userId do usuário.' });
    expect(auditFindMany).not.toHaveBeenCalled();
  });

  it('transforma erro de banco em texto da tool, sem exceção não tratada', async () => {
    auditFindMany.mockRejectedValue(new Error('connection reset'));
    notaFindMany.mockRejectedValue(new Error('timeout'));
    nfseFindMany.mockRejectedValue(new Error('timeout'));

    await expect(getSystemLogs({ level: 'WARN' })).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('Erro ao consultar o banco: connection reset'),
    });

    await expect(getUserSessionAudit({ userId: 'user-1' })).resolves.toMatchObject({
      ok: false,
    });

    await expect(getFailedNfeDetails({ limit: 5 })).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('Erro ao consultar o banco'),
    });
  });
});
