import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

function isAuditDisabled(): boolean {
    return String(process.env.DISABLE_AUDIT_LOGS || '').toLowerCase() === 'true';
}

export type RegistrarEventoInput = {
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    entity?: string;
    entityId?: string;
    description?: string;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
};

/**
 * Serviço de auditoria: persiste em `audit_logs` quando a tabela existe e
 * `DISABLE_AUDIT_LOGS` não está definido como `true`.
 * Falhas de gravação são apenas logadas — não interrompem a operação principal.
 */
export class AuditoriaService {
    static async registrarTentativaModificacaoBloqueada(dados: {
        orcamentoId: string;
        vendaId?: string;
        numeroVenda?: string;
        usuarioId?: string;
        usuarioNome?: string;
        motivo?: string;
        detalhes?: Record<string, unknown>;
    }) {
        return this.registrarEvento({
            userId: dados.usuarioId !== 'system' ? dados.usuarioId : undefined,
            userName: dados.usuarioNome,
            action: 'MODIFICACAO_ORCAMENTO_BLOQUEADA',
            entity: 'orcamento',
            entityId: dados.orcamentoId,
            description: `Tentativa de alteração bloqueada no orçamento ${dados.orcamentoId}${dados.motivo ? `: ${dados.motivo}` : ''}`,
            metadata: {
                vendaId: dados.vendaId,
                numeroVenda: dados.numeroVenda,
                motivo: dados.motivo,
                detalhes: dados.detalhes
            }
        });
    }

    static async registrarSolicitacaoReabertura(dados: {
        orcamentoId: string;
        vendaId?: string;
        numeroVenda?: string;
        solicitanteId?: string;
        solicitanteNome?: string;
        justificativa?: string;
        itensAdicionais?: unknown;
    }) {
        const evt = await this.registrarEvento({
            userId: dados.solicitanteId,
            userName: dados.solicitanteNome,
            action: 'SOLICITACAO_REABERTURA_ORCAMENTO',
            entity: 'orcamento',
            entityId: dados.orcamentoId,
            description: `Solicitação de reabertura para orçamento ${dados.orcamentoId}`,
            metadata: {
                vendaId: dados.vendaId,
                numeroVenda: dados.numeroVenda,
                justificativa: dados.justificativa,
                itensAdicionais: dados.itensAdicionais
            }
        });
        const log = evt && typeof evt === 'object' && 'log' in evt ? (evt as { log?: { id: string } }).log : undefined;
        return {
            success: true,
            solicitacaoId: log?.id ?? `AUD-${Date.now()}`,
            solicitacao: null
        };
    }

    static async registrarModificacaoAutorizada(dados: { vendaId?: string; [k: string]: unknown }) {
        return this.registrarEvento({
            action: 'MODIFICACAO_AUTORIZADA',
            entity: 'venda',
            entityId: dados.vendaId as string | undefined,
            description: `Modificação autorizada${dados.vendaId ? ` (venda ${dados.vendaId})` : ''}`,
            metadata: dados as Record<string, unknown>
        });
    }

    static async registrarSincronizacaoSucesso(dados: {
        orcamentoId: string;
        vendaId?: string;
        numeroVenda?: string;
        usuarioId?: string;
        usuarioNome?: string;
        valoresAnteriores?: Record<string, unknown>;
        valoresNovos?: Record<string, unknown>;
        diferencaCusto?: number;
        diferencaReceita?: number;
    }) {
        return this.registrarEvento({
            userId: dados.usuarioId !== 'system' ? dados.usuarioId : undefined,
            userName: dados.usuarioNome,
            action: 'SINCRONIZACAO_ORCAMENTO_PV',
            entity: 'orcamento',
            entityId: dados.orcamentoId,
            description: `Orçamento ${dados.orcamentoId} sincronizado com pedido de venda`,
            metadata: {
                vendaId: dados.vendaId,
                numeroVenda: dados.numeroVenda,
                valoresAnteriores: dados.valoresAnteriores,
                valoresNovos: dados.valoresNovos,
                diferencaCusto: dados.diferencaCusto,
                diferencaReceita: dados.diferencaReceita
            }
        });
    }

    static async buscarLogsOrcamento(orcamentoId: string) {
        if (isAuditDisabled()) {
            return { success: true, logs: [] as unknown[] };
        }
        try {
            const logs = await prisma.auditLog.findMany({
                where: {
                    entityId: orcamentoId,
                    entity: { in: ['orcamento', 'Orcamento', 'ORCAMENTO'] }
                },
                orderBy: { createdAt: 'asc' }
            });
            return { success: true, logs };
        } catch (err) {
            console.warn('Auditoria: buscarLogsOrcamento falhou:', err instanceof Error ? err.message : err);
            return { success: true, logs: [] };
        }
    }

    /**
     * Registrar evento genérico de auditoria
     */
    static async registrarEvento(data: RegistrarEventoInput) {
        if (isAuditDisabled()) {
            return { success: true, skipped: true as const };
        }

        const meta = data.metadata && typeof data.metadata === 'object' ? data.metadata : undefined;
        const ipRaw = data.ipAddress ?? (meta as any)?.ipAddress ?? (meta as any)?.ip;
        const uaRaw = data.userAgent ?? (meta as any)?.userAgent;

        const description =
            (data.description && String(data.description).trim()) || String(data.action || 'EVENTO');

        const hash = meta && typeof (meta as any).hash === 'string' ? (meta as any).hash : undefined;
        const previousHash =
            meta && (meta as any).previousHash != null && (meta as any).previousHash !== ''
                ? String((meta as any).previousHash)
                : undefined;
        const chainId = meta && (meta as any).chainId != null ? String((meta as any).chainId) : undefined;
        let sequence: number | undefined;
        if (meta && (meta as any).sequence != null) {
            const s = Number((meta as any).sequence);
            if (!Number.isNaN(s)) sequence = s;
        }

        try {
            const log = await prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    userName: data.userName,
                    userRole: data.userRole,
                    action: data.action,
                    entity: data.entity,
                    entityId: data.entityId ?? ((meta as any)?.entityId != null ? String((meta as any).entityId) : undefined),
                    description,
                    ipAddress: typeof ipRaw === 'string' ? ipRaw : undefined,
                    userAgent: typeof uaRaw === 'string' ? uaRaw : undefined,
                    metadata:
                        meta === undefined
                            ? undefined
                            : (meta as Prisma.InputJsonValue),
                    hash,
                    previousHash,
                    chainId,
                    sequence
                }
            });
            return { success: true, log };
        } catch (err) {
            console.warn(
                '⚠️ Auditoria: falha ao persistir (operação principal não foi bloqueada):',
                err instanceof Error ? err.message : err
            );
            return { success: false };
        }
    }
}
