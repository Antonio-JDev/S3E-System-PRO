import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type NFeModoEnvio = 'NORMAL' | 'SVC-AN' | 'SVC-RS';
export type NFeFilaStatus = 'PENDENTE' | 'ENVIANDO' | 'ENVIADA' | 'FALHA';

interface EnfileirarParams {
  notaFiscalId?: string;
  empresaFiscalId?: string;
  ambiente: '1' | '2';
  modo: NFeModoEnvio;
  xmlAssinado: string;
  motivo?: string;
}

export class NFeFilaService {
  /**
   * Enfileira uma NF-e para envio posterior (contingência).
   */
  static async enfileirar(params: EnfileirarParams) {
    const { notaFiscalId, empresaFiscalId, ambiente, modo, xmlAsserto } = params as any;

    const registro = await prisma.nFeFila.create({
      data: {
        notaFiscalId: notaFiscalId || null,
        empresaFiscalId: empresaFiscalId || null,
        ambiente,
        modo,
        xmlAssinado: params.xmlAssinado,
        status: 'PENDENTE',
        tentativas: 0,
        ultimoErro: params.motivo || null,
        proximaTentativa: new Date()
      }
    });

    console.log('📥 NF-e enfileirada para contingência:', {
      filaId: registro.id,
      notaFiscalId: registro.notaFiscalId,
      ambiente: registro.ambiente,
      modo: registro.modo
    });

    return registro;
  }

  /**
   * Marca um item da fila como processado (ENVIADA ou FALHA)
   */
  static async atualizarStatus(
    id: string,
    status: NFeFilaStatus,
    options?: { erro?: string; proximaTentativa?: Date }
  ) {
    const registro = await prisma.nFeFila.update({
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
   * Retorna itens pendentes de envio cuja data de próxima tentativa já passou.
   * Esta função deve ser chamada por um job/cron em background.
   */
  static async listarPendentes(limit = 20) {
    return prisma.nFeFila.findMany({
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

export default NFeFilaService;


