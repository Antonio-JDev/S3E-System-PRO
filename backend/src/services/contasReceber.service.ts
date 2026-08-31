import { prisma } from '../lib/prisma';
import { ContaStatus } from '../types/index';
import { calcValorBaseFromEfetivo, parseMoney, validarValoresFinanceiros } from '../utils/financeiroValor.util';

export interface CriarContaReceberManualPayload {
  tipo: 'ENTRADA' | 'OUTRAS_RECEITAS';
  pagadorNome?: string;
  descricao: string;
  valorParcela: number;
  valorJuros?: number;
  valorDesconto?: number;
  dataVencimento: Date;
  observacoes?: string;
}

export interface AtualizarContaReceberPayload {
  tipo?: 'ENTRADA' | 'OUTRAS_RECEITAS';
  pagadorNome?: string | null;
  descricao?: string;
  valorParcela?: number;
  valorJuros?: number;
  valorDesconto?: number;
  dataVencimento?: Date;
  observacoes?: string | null;
}

export class ContasReceberService {
  /**
   * Cria uma conta a receber manual (receita não vinculada a venda)
   */
  static async criarContaReceberManual(data: CriarContaReceberManualPayload) {
    const { tipo, pagadorNome, descricao, dataVencimento, observacoes } = data;
    const { valorJuros, valorDesconto, valorARegistrar } = validarValoresFinanceiros(
      data.valorParcela,
      data.valorJuros,
      data.valorDesconto
    );

    const createData = {
        vendaId: null,
        tipo,
        pagadorNome: pagadorNome || null,
        descricao,
        valorParcela: valorARegistrar,
        valorJuros: valorJuros > 0 ? valorJuros : null,
        valorDesconto: valorDesconto > 0 ? valorDesconto : null,
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

  static async atualizarContaReceber(id: string, payload: AtualizarContaReceberPayload) {
    const conta = await prisma.contaReceber.findUnique({ where: { id } });
    if (!conta) {
      throw new Error('Conta a receber não encontrada');
    }

    // Evita inconsistências com contas originadas de venda
    if (conta.vendaId) {
      throw new Error('Não é permitido editar conta vinculada a venda');
    }

    if (conta.status === ContaStatus.Pago || conta.status === ContaStatus.RecebidoParcial) {
      throw new Error('Não é possível alterar uma conta já recebida');
    }

    const dataUpdate: any = {
      updatedAt: new Date()
    };

    if (payload.tipo !== undefined) dataUpdate.tipo = payload.tipo;
    if (payload.pagadorNome !== undefined) dataUpdate.pagadorNome = payload.pagadorNome || null;
    if (payload.descricao !== undefined) dataUpdate.descricao = payload.descricao;
    if (payload.observacoes !== undefined) dataUpdate.observacoes = payload.observacoes || null;
    if (payload.dataVencimento !== undefined) dataUpdate.dataVencimento = payload.dataVencimento;

    const alteraValores =
      payload.valorParcela !== undefined ||
      payload.valorJuros !== undefined ||
      payload.valorDesconto !== undefined;

    if (alteraValores) {
      const juros = payload.valorJuros !== undefined ? parseMoney(payload.valorJuros) : parseMoney((conta as any).valorJuros);
      const desconto = payload.valorDesconto !== undefined ? parseMoney(payload.valorDesconto) : parseMoney((conta as any).valorDesconto);
      const base = payload.valorParcela !== undefined
        ? payload.valorParcela
        : calcValorBaseFromEfetivo(conta.valorParcela, (conta as any).valorJuros, (conta as any).valorDesconto);
      const { valorARegistrar, valorJuros: j, valorDesconto: d } = validarValoresFinanceiros(
        base,
        juros,
        desconto
      );
      dataUpdate.valorParcela = valorARegistrar;
      dataUpdate.valorJuros = j > 0 ? j : null;
      dataUpdate.valorDesconto = d > 0 ? d : null;
    }

    return prisma.contaReceber.update({
      where: { id },
      data: dataUpdate
    });
  }

  static async excluirContaReceber(id: string) {
    const conta = await prisma.contaReceber.findUnique({ where: { id } });
    if (!conta) {
      throw new Error('Conta a receber não encontrada');
    }

    // Evita apagar registros financeiros de vendas
    if (conta.vendaId) {
      throw new Error('Não é permitido excluir conta vinculada a venda');
    }

    await prisma.contaReceber.delete({ where: { id } });
    return { message: 'Conta a receber excluída com sucesso' };
  }
}
