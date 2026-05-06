import { prisma } from '../lib/prisma';

export type NfseFilaStatus = 'PENDENTE' | 'ENVIANDO' | 'ENVIADA' | 'FALHA';

interface EnfileirarNfseParams {
  empresaFiscalId: string;
  ambiente: '1' | '2';
  numeroLote: number;
  xmlEnvio: string; // XML assinado
  motivo?: string;
}

export class NfseFilaService {
  /**
   * Enfileira uma NFS-e para envio posterior (contingência).
   */
  static async enfileirar(params: EnfileirarNfseParams) {
    const { empresaFiscalId, ambiente, numeroLote, xmlEnvio, motivo } = params;

    const registro = await (prisma as any).nfseFila.create({
      data: {
        empresaFiscalId,
        ambiente,
        numeroLote,
        xmlEnvio,
        status: 'PENDENTE',
        tentativas: 0,
        ultimoErro: motivo || null,
        proximaTentativa: new Date()
      }
    });

    console.log('📥 NFS-e enfileirada para contingência:', {
      filaId: registro.id,
      numeroLote: registro.numeroLote,
      ambiente: registro.ambiente
    });

    return registro;
  }

  /**
   * Marca um item da fila como processado (ENVIADA ou FALHA)
   */
  static async atualizarStatus(
    id: string,
    status: NfseFilaStatus,
    options?: { erro?: string; proximaTentativa?: Date }
  ) {
    const registro = await (prisma as any).nfseFila.update({
      where: { id },
      data: {
        status,
        ultimoErro: options?.erro ?? null,
        proximaTentativa: options?.proximaTentativa ?? new Date(),
        tentativas: {
          increment: status === 'PENDENTE' ? 0 : 1
        }
      }
    });

    return registro;
  }

  /**
   * Retorna itens pendentes de envio
   */
  static async listarPendentes(limit = 20) {
    return (prisma as any).nfseFila.findMany({
      where: {
        status: 'PENDENTE',
        proximaTentativa: {
          lte: new Date()
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit
    });
  }
}

export default NfseFilaService;
