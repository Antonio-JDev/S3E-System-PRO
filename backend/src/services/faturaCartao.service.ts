import { prisma } from '../lib/prisma';
import { ContaStatus } from '../types/index';
import { randomUUID } from 'crypto';

export type StatusFaturaCartao = 'ABERTA' | 'FECHADA' | 'PAGA';

export interface CompetenciaCartao {
  mes: number;
  ano: number;
}

/**
 * Calcula a competência da fatura com base na data do lançamento e no dia de fechamento.
 * Se o dia da data for maior que o fechamento, cai na competência do mês seguinte.
 */
export function calcularCompetenciaPorFechamento(
  dataLancamento: Date,
  diaFechamento: number
): CompetenciaCartao {
  const dia = dataLancamento.getDate();
  let mes = dataLancamento.getMonth() + 1;
  let ano = dataLancamento.getFullYear();

  if (dia > diaFechamento) {
    if (mes === 12) {
      mes = 1;
      ano += 1;
    } else {
      mes += 1;
    }
  }

  return { mes, ano };
}

export function dataVencimentoFatura(
  mesCompetencia: number,
  anoCompetencia: number,
  diaVencimento: number
): Date {
  const ultimoDia = new Date(anoCompetencia, mesCompetencia, 0).getDate();
  const dia = Math.min(Math.max(1, diaVencimento), ultimoDia);
  return new Date(anoCompetencia, mesCompetencia - 1, dia, 12, 0, 0, 0);
}

function parseDataPagamento(dataPagamento?: string | Date): Date {
  if (!dataPagamento) return new Date();
  if (dataPagamento instanceof Date) return dataPagamento;
  if (dataPagamento.includes('-') && !dataPagamento.includes('T')) {
    const [ano, mes, dia] = dataPagamento.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  }
  return new Date(dataPagamento);
}

function contaNaCompetencia(
  dataRef: Date,
  diaFechamento: number,
  mesCompetencia: number,
  anoCompetencia: number
): boolean {
  const comp = calcularCompetenciaPorFechamento(dataRef, diaFechamento);
  return comp.mes === mesCompetencia && comp.ano === anoCompetencia;
}

export class FaturaCartaoService {
  /**
   * Lista contas elegíveis para a fatura do cartão na competência (preview ou liquidação).
   */
  static async listarLancamentosElegiveis(
    cartaoCreditoId: string,
    mesCompetencia: number,
    anoCompetencia: number
  ) {
    const cartao = await prisma.cartaoCredito.findUnique({ where: { id: cartaoCreditoId } });
    if (!cartao) throw new Error('Cartão de crédito não encontrado');

    const contas = await prisma.contaPagar.findMany({
      where: {
        cartaoCreditoId,
        meioPagamento: 'CARTAO_CREDITO',
        status: { not: ContaStatus.Cancelado },
        OR: [
          { faturaCartaoId: null },
          {
            faturaCartao: {
              status: { not: 'PAGA' },
              mesCompetencia,
              anoCompetencia,
            },
          },
        ],
      },
      include: {
        fornecedor: { select: { id: true, nome: true } },
        compra: { select: { id: true, numeroNF: true, dataCompra: true, fornecedorNome: true } },
        faturaCartao: { select: { id: true, status: true } },
      },
      orderBy: { dataVencimento: 'asc' },
    });

    const elegiveis = contas.filter((c) => {
      // Já paga fora de fatura consolidada: não reabre
      if (c.status === ContaStatus.Pago && !c.faturaCartaoId) return false;
      if (c.status === ContaStatus.Pago && c.faturaCartao?.status === 'PAGA') return false;

      const dataRef =
        c.compra?.dataCompra ??
        c.dataVencimento ??
        c.createdAt;
      return contaNaCompetencia(dataRef, cartao.diaFechamento, mesCompetencia, anoCompetencia);
    });

    const valorTotal = elegiveis.reduce((acc, c) => acc + Number(c.valorParcela || 0), 0);

    return {
      cartao,
      mesCompetencia,
      anoCompetencia,
      valorTotal,
      dataVencimento: dataVencimentoFatura(mesCompetencia, anoCompetencia, cartao.diaVencimento),
      lancamentos: elegiveis,
    };
  }

  static async preview(cartaoCreditoId: string, mesCompetencia: number, anoCompetencia: number) {
    this.validarCompetencia(mesCompetencia, anoCompetencia);
    const preview = await this.listarLancamentosElegiveis(
      cartaoCreditoId,
      mesCompetencia,
      anoCompetencia
    );

    const faturaExistente = await prisma.faturaCartao.findUnique({
      where: {
        cartaoCreditoId_mesCompetencia_anoCompetencia: {
          cartaoCreditoId,
          mesCompetencia,
          anoCompetencia,
        },
      },
    });

    return {
      ...preview,
      faturaExistente,
    };
  }

  static async listarFaturas(filtros: {
    cartaoCreditoId?: string;
    mesCompetencia?: number;
    anoCompetencia?: number;
    status?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filtros.cartaoCreditoId) where.cartaoCreditoId = filtros.cartaoCreditoId;
    if (filtros.mesCompetencia) where.mesCompetencia = filtros.mesCompetencia;
    if (filtros.anoCompetencia) where.anoCompetencia = filtros.anoCompetencia;
    if (filtros.status) where.status = filtros.status;

    return prisma.faturaCartao.findMany({
      where,
      include: {
        cartaoCredito: true,
        contasPagar: {
          include: {
            fornecedor: { select: { id: true, nome: true } },
            compra: { select: { id: true, numeroNF: true, fornecedorNome: true } },
          },
          orderBy: { dataVencimento: 'asc' },
        },
      },
      orderBy: [{ anoCompetencia: 'desc' }, { mesCompetencia: 'desc' }],
    });
  }

  /**
   * Gera (ou atualiza) a fatura da competência e liquida todas as ContasPagar vinculadas.
   * A saída de caixa nasce virtualmente via status=Pago das contas.
   */
  static async gerarEPagar(params: {
    cartaoCreditoId: string;
    mesCompetencia: number;
    anoCompetencia: number;
    dataPagamento?: string | Date;
    observacoes?: string;
  }) {
    const { cartaoCreditoId, mesCompetencia, anoCompetencia, observacoes } = params;
    this.validarCompetencia(mesCompetencia, anoCompetencia);

    const dataPagamentoFinal = parseDataPagamento(params.dataPagamento);

    return prisma.$transaction(async (tx) => {
      const cartao = await tx.cartaoCredito.findUnique({ where: { id: cartaoCreditoId } });
      if (!cartao) throw new Error('Cartão de crédito não encontrado');

      const preview = await this.listarLancamentosElegiveis(
        cartaoCreditoId,
        mesCompetencia,
        anoCompetencia
      );

      const pendentes = preview.lancamentos.filter((c) => c.status !== ContaStatus.Pago);
      if (pendentes.length === 0) {
        throw new Error('Não há lançamentos pendentes para liquidar nesta competência');
      }

      const valorTotal = pendentes.reduce((acc, c) => acc + Number(c.valorParcela || 0), 0);
      const dataVencimento = dataVencimentoFatura(
        mesCompetencia,
        anoCompetencia,
        cartao.diaVencimento
      );

      const fatura = await tx.faturaCartao.upsert({
        where: {
          cartaoCreditoId_mesCompetencia_anoCompetencia: {
            cartaoCreditoId,
            mesCompetencia,
            anoCompetencia,
          },
        },
        create: {
          id: randomUUID(),
          cartaoCreditoId,
          mesCompetencia,
          anoCompetencia,
          valorTotal,
          status: 'PAGA',
          dataVencimento,
          dataPagamento: dataPagamentoFinal,
        },
        update: {
          valorTotal,
          status: 'PAGA',
          dataVencimento,
          dataPagamento: dataPagamentoFinal,
        },
      });

      for (const conta of pendentes) {
        const obsFinal = observacoes
          ? conta.observacoes
            ? `${conta.observacoes}\n[Fatura] ${observacoes}`
            : observacoes
          : undefined;

        await tx.contaPagar.update({
          where: { id: conta.id },
          data: {
            faturaCartaoId: fatura.id,
            status: ContaStatus.Pago,
            dataPagamento: dataPagamentoFinal,
            dataAgendamento: null,
            meioPagamento: 'CARTAO_CREDITO',
            cartaoCreditoId,
            ...(obsFinal !== undefined ? { observacoes: obsFinal } : {}),
          },
        });
      }

      return tx.faturaCartao.findUnique({
        where: { id: fatura.id },
        include: {
          cartaoCredito: true,
          contasPagar: {
            include: {
              fornecedor: { select: { id: true, nome: true } },
              compra: { select: { id: true, numeroNF: true, fornecedorNome: true } },
            },
          },
        },
      });
    });
  }

  private static validarCompetencia(mes: number, ano: number) {
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new Error('Mês de competência inválido (1-12)');
    }
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      throw new Error('Ano de competência inválido');
    }
  }
}
