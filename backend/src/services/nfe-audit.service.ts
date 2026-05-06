import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AuditoriaService } from './auditoria.service';

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
 * Auditoria específica de NF-e com hash em cadeia (imutável).
 * Persiste em `audit_logs` com entity = 'NFe', encadeando hash/previousHash/sequence por chainId.
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

    const chainId = chaveAcesso || notaFiscalId || pedidoId || null;

    let previousHash: string | null = null;
    let sequence = 1;

    if (chainId) {
      try {
        const last = await prisma.auditLog.findFirst({
          where: { chainId, entity: 'NFe' },
          orderBy: [{ sequence: 'desc' }, { createdAt: 'desc' }]
        });
        if (last?.hash) {
          previousHash = last.hash;
          sequence = (last.sequence ?? 0) + 1;
        }
      } catch {
        // continua com sequence 1 se leitura falhar
      }
    }

    const now = new Date();

    const payload = JSON.stringify({
      chainId: chainId || null,
      previousHash,
      sequence,
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

    try {
      await AuditoriaService.registrarEvento({
        action,
        entity: 'NFe',
        entityId: notaFiscalId || chaveAcesso || undefined,
        description,
        metadata: {
          ...(metadata || {}),
          pedidoId: pedidoId || undefined,
          empresaFiscalId: empresaFiscalId || undefined,
          ambiente,
          status,
          modoEnvio,
          chaveAcesso: chaveAcesso || undefined,
          notaFiscalId: notaFiscalId || undefined,
          hash,
          previousHash,
          chainId: chainId || undefined,
          sequence,
          createdAt: now.toISOString()
        }
      });
    } catch (err) {
      console.error('Erro ao registrar NFe audit:', err);
    }
  }
}

export default NFeAuditService;

