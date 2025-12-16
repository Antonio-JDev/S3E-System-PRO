import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export type NFeAuditAction =
  | 'NFE_EMISSAO_INICIADA'
  | 'NFE_EMISSAO_AUTORIZADA'
  | 'NFE_EMISSAO_REJEITADA'
  | 'NFE_FALLBACK_SVC_AN'
  | 'NFE_CONTINGENCIA_OFFLINE_ENFILEIRADA'
  | 'NFE_CONTINGENCIA_REENVIO_SUCESSO'
  | 'NFE_CONTINGENCIA_REENVIO_FALHA';

interface NFeAuditParams {
  action: NFeAuditAction;
  description: string;
  notaFiscalId?: string;
  chaveAcesso?: string;
  pedidoId?: string;
  empresaFiscalId?: string;
  modoEnvio?: string;
  ambiente?: '1' | '2';
  status?: string;
  metadata?: any;
}

/**
 * Serviço de auditoria específica de NF-e com hash em cadeia (imutável).
 * Usa a tabela genérica AuditLog, mas com:
 * - entity = 'NFe'
 * - chainId = chaveAcesso ou notaFiscalId/pedidoId
 * - hash / previousHash / sequence para encadear os eventos.
 */
export class NFeAuditService {
  static async registrarEvento(params: NFeAuditParams) {
    const {
      action,
      description,
      notaFiscalId,
      chaveAcesso,
      pedidoId,
      empresaFiscalId,
      modoEnvio,
      ambiente,
      status,
      metadata
    } = params;

    // Identificador lógico da cadeia de auditoria desta NF-e
    const chainId = chaveAcesso || notaFiscalId || pedidoId;

    // Buscar último registro da cadeia (para previousHash e sequence)
    let previousHash: string | null = null;
    let sequence: number | null = null;

    if (chainId) {
      const lastLog = await prisma.auditLog.findFirst({
        where: { chainId },
        orderBy: { sequence: 'desc' }
      });

      if (lastLog) {
        previousHash = lastLog.hash || null;
        sequence = (lastLog.sequence || 0) + 1;
      } else {
        sequence = 1;
      }
    }

    const now = new Date();

    // Montar payload determinístico para o hash
    const payload = JSON.stringify({
      chainId: chainId || null,
      previousHash: previousHash || null,
      sequence: sequence || 1,
      action,
      entity: 'NFe',
      entityId: notaFiscalId || chaveAcesso || null,
      description,
      ambiente,
      status,
      modoEnvio,
      empresaFiscalId,
      pedidoId,
      metadata: metadata || null,
      createdAt: now.toISOString()
    });

    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    await prisma.auditLog.create({
      data: {
        action,
        entity: 'NFe',
        entityId: notaFiscalId || chaveAcesso || null,
        description,
        metadata: {
          ...metadata,
          pedidoId: pedidoId || undefined,
          empresaFiscalId: empresaFiscalId || undefined,
          ambiente,
          status,
          modoEnvio,
          chaveAcesso: chaveAcesso || undefined,
          notaFiscalId: notaFiscalId || undefined
        },
        hash,
        previousHash: previousHash || null,
        chainId: chainId || null,
        sequence: sequence || 1,
        createdAt: now
      }
    });
  }
}

export default NFeAuditService;


