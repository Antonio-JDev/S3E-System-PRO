import { prisma } from '../lib/prisma';

/**
 * Retenção da página Logs do desenvolvedor (GET /api/logs/audit → tabela audit_logs).
 *
 * A tela lista a auditoria geral. A limpeza NÃO apaga a tabela inteira.
 * Só remove o rastro operacional que a tela trata como log de dev, com mais de 21 dias
 * em `createdAt`:
 *   CREATE, UPDATE, UPDATE_USER, UPDATE_PROFILE, DELETE, DELETE_PERMANENT, VIEW, ERROR, ACCESS
 *
 * Permanece, mesmo antigo:
 * - auditoria fiscal de NF-e (`entity` NFe, `action` NFE_*, `chainId` ou `hash` preenchidos)
 * - auditoria de login (`LOGIN`, `LOGOUT`, `LOGIN_FAILED`) e `PASSWORD_RESET` — fora da lista
 * - auditoria de negócio do orçamento (`entity` orcamento), usada pelo backfill do orçamentista
 * - qualquer outra action (ex.: MODIFICACAO_ORCAMENTO_BLOQUEADA, REGISTRO_TAREFA)
 *
 * Não apaga usuário, compra, orçamento nem linhas de NF-e.
 */

export const RETENCAO_DIAS = 21;
export const INTERVALO_RETENCAO_MS = 24 * 60 * 60 * 1000;

export const ACOES_PURGA_LOG_DEV = [
  'CREATE',
  'UPDATE',
  'UPDATE_USER',
  'UPDATE_PROFILE',
  'DELETE',
  'DELETE_PERMANENT',
  'VIEW',
  'ERROR',
  'ACCESS',
] as const;

const ACOES_PURGA = new Set<string>(ACOES_PURGA_LOG_DEV);

export type RegistroRetencao = {
  createdAt: Date;
  action: string;
  entity?: string | null;
  chainId?: string | null;
  hash?: string | null;
};

export function corteRetencao(agora = new Date()): Date {
  return new Date(agora.getTime() - RETENCAO_DIAS * 24 * 60 * 60 * 1000);
}

export function devePurgarLogDev(row: RegistroRetencao, corte: Date): boolean {
  if (!(row.createdAt < corte)) return false;
  const action = String(row.action || '');
  if (action.toUpperCase().startsWith('NFE_')) return false;
  if ((row.entity || '').toLowerCase() === 'nfe') return false;
  if ((row.entity || '').toLowerCase() === 'orcamento') return false;
  if (row.chainId) return false;
  if (row.hash) return false;
  return ACOES_PURGA.has(action);
}

export function filtroPrismaPurga(corte: Date) {
  return {
    createdAt: { lt: corte },
    action: { in: [...ACOES_PURGA_LOG_DEV] },
    chainId: null,
    hash: null,
    NOT: {
      OR: [
        { entity: { equals: 'NFe', mode: 'insensitive' as const } },
        { entity: { equals: 'orcamento', mode: 'insensitive' as const } },
        { action: { startsWith: 'NFE_' } },
      ],
    },
  };
}

export async function executarPurgaLogsDev(agora = new Date()): Promise<{ removidos: number; corte: string }> {
  const corte = corteRetencao(agora);
  const resultado = await prisma.auditLog.deleteMany({
    where: filtroPrismaPurga(corte),
  });
  return { removidos: resultado.count, corte: corte.toISOString() };
}
