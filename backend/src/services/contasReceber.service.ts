import { prisma } from '../lib/prisma';
import { ContaStatus } from '../types/index';

export interface CriarContaReceberManualPayload {
  tipo: 'ENTRADA' | 'OUTRAS_RECEITAS';
  pagadorNome?: string;
  descricao: string;
  valorParcela: number;
  dataVencimento: Date;
  observacoes?: string;
}

export class ContasReceberService {
  /**
   * Cria uma conta a receber manual (receita não vinculada a venda)
   */
  static async criarContaReceberManual(data: CriarContaReceberManualPayload) {
    const { tipo, pagadorNome, descricao, valorParcela, dataVencimento, observacoes } = data;

    if (valorParcela <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }

    const createData = {
        vendaId: null,
        tipo,
        pagadorNome: pagadorNome || null,
        descricao,
        valorParcela,
        dataVencimento,
        observacoes: observacoes || null,
        status: ContaStatus.Pendente,
        numeroParcela: 1,
        totalParcelas: 1
      };
    const conta = await prisma.contaReceber.create({
      data: createData as any,
    });

    return conta;
  }

  /**
   * Lista todas as contas a receber (de vendas e manuais)
   */
  static async listarTodas() {
    const contas = await prisma.contaReceber.findMany({
      orderBy: { dataVencimento: 'asc' },
      include: {
        venda: {
          include: {
            cliente: { select: { nome: true } },
            orcamento: { select: { titulo: true, numeroSequencial: true } }
          }
        },
        clientePagador: { select: { nome: true } }
      }
    });

    return contas;
  }

  /**
   * Retorna o histórico de recebimentos parciais de uma duplicata (conta a receber)
   */
  static async historicoRecebimentos(contaReceberId: string) {
    const conta = await prisma.contaReceber.findUnique({
      where: { id: contaReceberId },
      select: {
        id: true,
        valorParcela: true,
        valorRecebido: true,
        dataVencimento: true,
        descricao: true,
        numeroParcela: true,
        totalParcelas: true,
        status: true
      }
    });
    if (!conta) return null;

    const recebimentos = await prisma.recebimentoParcial.findMany({
      where: { contaReceberId },
      orderBy: { dataPagamento: 'asc' }
    });

    return {
      conta: {
        ...conta,
        saldoRestante: Number(conta.valorParcela) - Number(conta.valorRecebido ?? 0)
      },
      recebimentos
    };
  }
}
