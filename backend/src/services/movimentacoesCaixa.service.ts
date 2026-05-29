import { prisma } from '../lib/prisma';
import { ContaStatus, VendaStatus } from '../types/index';

export interface MovimentacaoCaixaItem {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  dataPagamento: Date;
  descricao: string;
  categoria: string;
  valor: number; // valor efetivo (base + juros - desconto)
  valorBase?: number;
  valorJuros?: number;
  valorDesconto?: number;
  meioPagamento: string | null;
  origem: 'conta_receber' | 'conta_pagar';
  referenciaId: string | null;
  tipoCategoria?: string; // FORNECEDOR, RH, etc. para saídas (edição)
  observacoes?: string | null; // Justificativa/descrição do pagamento (ex.: desconto por falta)
  /** true quando a entrada é um recebimento parcial (cada parcial tem sua data/valor; edição/desfazer é feita em Contas a Receber) */
  recebimentoParcial?: boolean;
}

export interface MovimentacoesCaixaFiltros {
  dataInicio?: string;
  dataFim?: string;
  categoria?: string;
  busca?: string;
}

export interface ResumoMovimentacoes {
  entradasTotal: number;
  saidasTotal: number;
  saldoConta: number;
}

function labelMeioPagamento(meio: string | null): string {
  if (!meio) return 'Não informado';
  const map: Record<string, string> = {
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão de Crédito',
    CARTAO_DEBITO: 'Cartão de Débito',
    BOLETO: 'Boleto',
    TRANSFERENCIA: 'Transferência',
    DINHEIRO: 'Dinheiro'
  };
  return map[meio] || meio;
}

function labelCategoriaPagar(tipo: string): string {
  const map: Record<string, string> = {
    FORNECEDOR: 'Fornecedor',
    RH: 'Recursos Humanos',
    DESPESA_FIXA: 'Despesa Fixa',
    FROTA: 'Frota'
  };
  return map[tipo] || tipo;
}

const CATEGORIA_TO_TIPO: Record<string, string> = {
  Fornecedor: 'FORNECEDOR',
  'Recursos Humanos': 'RH',
  'Despesa Fixa': 'DESPESA_FIXA',
  Frota: 'FROTA'
};

export interface AtualizarMovimentacaoPayload {
  dataPagamento?: string; // YYYY-MM-DD
  descricao?: string;
  categoria?: string; // label para saídas (Fornecedor, RH, etc.)
  valor?: number; // valorParcela (base)
  valorJuros?: number;
  valorDesconto?: number;
  meioPagamento?: string;
}

/**
 * Lista todas as movimentações de caixa (entradas = contas a receber pagas + recebimentos parciais, saídas = contas a pagar pagas)
 * Ordenadas por data do pagamento, mais recente primeiro.
 * Recebimentos parciais aparecem cada um com sua data, valor e forma de pagamento; parcelas quitadas só por parciais não duplicam.
 */
export async function listarMovimentacoes(filtros?: MovimentacoesCaixaFiltros): Promise<{
  movimentacoes: MovimentacaoCaixaItem[];
  resumo: ResumoMovimentacoes;
}> {
  const dataInicio = filtros?.dataInicio ? new Date(filtros.dataInicio) : undefined;
  const dataFim = filtros?.dataFim ? new Date(filtros.dataFim) : undefined;
  const categoriaFiltro = filtros?.categoria;
  const busca = filtros?.busca?.toLowerCase().trim();

  const dataPagamentoFiltro =
    dataInicio || dataFim
      ? {
          ...(dataInicio && { gte: dataInicio }),
          ...(dataFim && { lte: new Date(dataFim.getTime() + 24 * 60 * 60 * 1000) })
        }
      : undefined;

  // Recebimentos parciais (cada um vira uma entrada com data/valor/meio de pagamento reais)
  const recebimentosParciais = await prisma.recebimentoParcial.findMany({
    where: {
      ...(dataPagamentoFiltro ? { dataPagamento: dataPagamentoFiltro } : {})
    },
    include: {
      contaReceber: {
        include: {
          venda: {
            include: {
              cliente: { select: { nome: true } },
              orcamento: { select: { titulo: true, numeroSequencial: true } }
            }
          }
        }
      }
    },
    orderBy: { dataPagamento: 'desc' }
  });

  const contaIdsComParciais = new Set(recebimentosParciais.map((rp) => rp.contaReceberId));

  // Contas a receber PAGAS (entradas) — apenas as que foram pagas de uma vez (sem recebimento parcial), para não duplicar valor
  const contasReceberPagas = await prisma.contaReceber.findMany({
    where: {
      status: 'Pago',
      dataPagamento: { not: null },
      id: { notIn: [...contaIdsComParciais] },
      ...(dataPagamentoFiltro ? { dataPagamento: dataPagamentoFiltro } : {})
    },
    include: {
      venda: {
        include: {
          cliente: { select: { nome: true } },
          orcamento: { select: { titulo: true, numeroSequencial: true } }
        }
      }
    },
    orderBy: { dataPagamento: 'desc' }
  });

  // Contas a pagar PAGAS (saídas)
  const contasPagarPagas = await prisma.contaPagar.findMany({
    where: {
      status: 'Pago',
      dataPagamento: { not: null },
      ...(dataPagamentoFiltro ? { dataPagamento: dataPagamentoFiltro } : {})
    },
    include: {
      fornecedor: { select: { nome: true } },
      despesaFixa: { select: { descricao: true } }
    },
    orderBy: { dataPagamento: 'desc' }
  });

  const valorEfetivo = (valorParcela: number, juros?: number | null, desconto?: number | null) =>
    valorParcela + (juros ?? 0) - (desconto ?? 0);

  const entradasContas: MovimentacaoCaixaItem[] = contasReceberPagas.map((c) => {
    const clienteNome = c.venda?.cliente?.nome || 'Cliente';
    const titulo = c.venda?.orcamento?.titulo || c.descricao;
    const descricao = `${clienteNome} - ${titulo}${c.numeroParcela ? ` (Parcela ${c.numeroParcela}/${c.totalParcelas || 1})` : ''}`;
    const jurosC = (c as any).valorJuros ?? 0;
    const descontoC = (c as any).valorDesconto ?? 0;
    // valorParcela já é o valor líquido recebido; juros/desconto são informativos (conciliação)
    const valor = c.valorParcela;
    const valorBase = valor + descontoC - jurosC;
    return {
      id: c.id,
      tipo: 'ENTRADA',
      dataPagamento: c.dataPagamento!,
      descricao,
      categoria: 'Venda',
      valor,
      valorBase: valorBase > 0 ? valorBase : valor,
      valorJuros: jurosC,
      valorDesconto: descontoC,
      meioPagamento: c.meioPagamento ? labelMeioPagamento(c.meioPagamento) : null,
      origem: 'conta_receber',
      referenciaId: c.vendaId
    };
  });

  const entradasParciais: MovimentacaoCaixaItem[] = recebimentosParciais.map((rp) => {
    const c = rp.contaReceber;
    const clienteNome = c.venda?.cliente?.nome || 'Cliente';
    const titulo = c.venda?.orcamento?.titulo || c.descricao;
    const parcelaLabel = c.numeroParcela ? ` (Parcela ${c.numeroParcela}/${c.totalParcelas || 1})` : '';
    const descricao = `${clienteNome} - ${titulo}${parcelaLabel} - Recebimento parcial`;
    const rpJuros = (rp as any).valorJuros ?? 0;
    const rpDesconto = (rp as any).valorDesconto ?? 0;
    const valorBaseRp = rp.valorPago + rpDesconto - rpJuros;
    return {
      id: rp.id,
      tipo: 'ENTRADA',
      dataPagamento: rp.dataPagamento,
      descricao,
      categoria: 'Venda',
      valor: rp.valorPago,
      valorBase: valorBaseRp > 0 ? valorBaseRp : rp.valorPago,
      valorJuros: rpJuros,
      valorDesconto: rpDesconto,
      meioPagamento: rp.meioPagamento ? labelMeioPagamento(rp.meioPagamento) : null,
      origem: 'conta_receber',
      referenciaId: c.vendaId ?? c.id,
      observacoes: rp.observacoes ?? undefined,
      recebimentoParcial: true
    };
  });

  const entradas: MovimentacaoCaixaItem[] = [...entradasContas, ...entradasParciais];

  const saidas: MovimentacaoCaixaItem[] = contasPagarPagas.map((c) => {
    const temFornecedorOuCredor = c.fornecedor?.nome || (c as any).credorNome || c.despesaFixa?.descricao;
    const categoria = labelCategoriaPagar(c.tipo || 'FORNECEDOR');
    const descricao = c.tipo === 'FROTA'
      ? c.descricao
      : (c as any).credorNome
        ? c.descricao
        : temFornecedorOuCredor
          ? `${temFornecedorOuCredor} - ${c.descricao}`
          : c.descricao;
    const valor = valorEfetivo(c.valorParcela, (c as any).valorJuros, (c as any).valorDesconto);
    return {
      id: c.id,
      tipo: 'SAIDA',
      dataPagamento: c.dataPagamento!,
      descricao,
      categoria,
      valor,
      valorBase: c.valorParcela,
      valorJuros: (c as any).valorJuros ?? 0,
      valorDesconto: (c as any).valorDesconto ?? 0,
      meioPagamento: c.meioPagamento ? labelMeioPagamento(c.meioPagamento) : null,
      origem: 'conta_pagar',
      referenciaId: c.id,
      tipoCategoria: c.tipo || 'FORNECEDOR',
      observacoes: c.observacoes ?? undefined
    };
  });

  let movimentacoes: MovimentacaoCaixaItem[] = [...entradas, ...saidas].sort(
    (a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
  );

  if (categoriaFiltro && categoriaFiltro !== 'Todas') {
    movimentacoes = movimentacoes.filter((m) => m.categoria === categoriaFiltro);
  }
  if (busca) {
    movimentacoes = movimentacoes.filter(
      (m) =>
        m.descricao.toLowerCase().includes(busca) ||
        m.categoria.toLowerCase().includes(busca) ||
        (m.meioPagamento && m.meioPagamento.toLowerCase().includes(busca))
    );
  }

  const entradasTotal = movimentacoes.filter((m) => m.tipo === 'ENTRADA').reduce((s, m) => s + m.valor, 0);
  const saidasTotal = movimentacoes.filter((m) => m.tipo === 'SAIDA').reduce((s, m) => s + m.valor, 0);
  const resumo: ResumoMovimentacoes = {
    entradasTotal,
    saidasTotal,
    saldoConta: entradasTotal - saidasTotal
  };

  return { movimentacoes, resumo };
}

function parseDataPagamentoBR(payload?: string): Date | undefined {
  if (payload === undefined) return undefined;
  if (payload.includes('-') && !payload.includes('T')) {
    const [y, m, d] = payload.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  return new Date(payload);
}

/**
 * Recalcula valorRecebido/status/data a partir dos recebimentos parciais restantes e sincroniza status da venda.
 */
async function sincronizarContaReceberAposParciais(tx: any, contaId: string) {
  const conta = await tx.contaReceber.findUnique({ where: { id: contaId } });
  if (!conta) throw new Error('Conta a receber não encontrada');

  const parciais = await tx.recebimentoParcial.findMany({
    where: { contaReceberId: contaId },
    orderBy: { dataPagamento: 'desc' }
  });
  const sumParciais = parciais.reduce((s, r) => s + r.valorPago, 0);

  let novoStatus: string;
  let dataPagamento: Date | null = null;
  let meioPagamento: string | null = null;

  if (sumParciais <= 0.005) {
    novoStatus = ContaStatus.Pendente;
    dataPagamento = null;
    meioPagamento = null;
  } else if (sumParciais >= conta.valorParcela - 0.005) {
    novoStatus = ContaStatus.Pago;
    dataPagamento = parciais[0].dataPagamento;
    meioPagamento = parciais[0].meioPagamento ?? null;
  } else {
    novoStatus = ContaStatus.RecebidoParcial;
    dataPagamento = parciais[0].dataPagamento;
    meioPagamento = parciais[0].meioPagamento ?? null;
  }

  await tx.contaReceber.update({
    where: { id: contaId },
    data: {
      valorRecebido: sumParciais,
      status: novoStatus,
      dataPagamento,
      meioPagamento,
      updatedAt: new Date()
    }
  });

  if (conta.vendaId) {
    const contasDaVenda = await tx.contaReceber.findMany({ where: { vendaId: conta.vendaId } });
    const todasPagas = contasDaVenda.every((c) => c.status === ContaStatus.Pago);
    if (!todasPagas) {
      await tx.venda.update({
        where: { id: conta.vendaId },
        data: { status: VendaStatus.Pendente, updatedAt: new Date() }
      });
    } else {
      await tx.venda.update({
        where: { id: conta.vendaId },
        data: { status: VendaStatus.Concluida, updatedAt: new Date() }
      });
    }
  }
}

/**
 * Desfaz o pagamento registrado para uma conta (conta_receber ou conta_pagar).
 * - Atualiza a conta para status = 'Pendente' e limpa os campos de dataPagamento/meioPagamento/observacoes
 * - Caso seja uma contaReceber e a venda estava como 'Concluida', reverte a venda para 'Pendente' se necessário
 */
export async function desfazerPagamento(contaId: string, audit?: { userId?: string; userName?: string; motivo?: string }): Promise<{ origem: 'conta_receber' | 'conta_pagar'; conta: any }> {
  // Recebimento parcial (histórico) — id do extrato é o id do registro parcial
  const recebimentoParcial = await prisma.recebimentoParcial.findUnique({
    where: { id: contaId },
    include: { contaReceber: true }
  });
  if (recebimentoParcial) {
    const conta = recebimentoParcial.contaReceber;
    const resultado = await prisma.$transaction(async (tx) => {
      await tx.recebimentoParcial.delete({ where: { id: recebimentoParcial.id } });
      await sincronizarContaReceberAposParciais(tx, conta.id);
      return tx.contaReceber.findUnique({ where: { id: conta.id } });
    });
    return { origem: 'conta_receber', conta: resultado };
  }

  // Tentar encontrar como conta a receber
  const contaReceber = await prisma.contaReceber.findUnique({ where: { id: contaId } });
  if (contaReceber) {
    if (contaReceber.status !== 'Pago') {
      throw new Error('Esta conta a receber não está marcada como paga');
    }

    // Guardar valores anteriores para auditoria
    const valoresAnteriores = { ...contaReceber };

    const resultado = await prisma.$transaction(async (tx) => {
      const contaAtualizada = await tx.contaReceber.update({
        where: { id: contaId },
        data: {
          status: 'Pendente',
          dataPagamento: null,
          meioPagamento: null,
          observacoes: null,
          valorRecebido: 0,
          updatedAt: new Date()
        }
      });

      // Verificar se a venda permanece com todas parcelas pagas
      if (contaAtualizada.vendaId) {
        const contasDaVenda = await tx.contaReceber.findMany({ where: { vendaId: contaAtualizada.vendaId } });
        const todasPagas = contasDaVenda.every(c => c.status === 'Pago');
        if (!todasPagas) {
          // Reverter status da venda para Pendente caso estivesse Concluida
          await tx.venda.update({
            where: { id: contaAtualizada.vendaId },
            data: { status: 'Pendente', updatedAt: new Date() }
          });
        }
      }

      return contaAtualizada;
    });

    // Auditoria removida para operações de Movimentações de Caixa.

    return { origem: 'conta_receber', conta: resultado };
  }

  // Tentar encontrar como conta a pagar
  const contaPagar = await prisma.contaPagar.findUnique({ where: { id: contaId } });
  if (contaPagar) {
    if (contaPagar.status !== 'Pago') {
      throw new Error('Esta conta a pagar não está marcada como paga');
    }

    const valoresAnteriores = { ...contaPagar };

    const resultado = await prisma.$transaction(async (tx) => {
      const contaAtualizada = await tx.contaPagar.update({
        where: { id: contaId },
        data: {
          status: 'Pendente',
          dataPagamento: null,
          meioPagamento: null,
          observacoes: null,
          updatedAt: new Date()
        }
      });

      return contaAtualizada;
    });

    // Auditoria removida para operações de Movimentações de Caixa.

    return { origem: 'conta_pagar', conta: resultado };
  }

  throw new Error('Conta não encontrada');
}

/**
 * Atualiza uma movimentação (conta a receber ou a pagar já paga) para conciliação bancária.
 * Atualiza os campos: dataPagamento, descricao, categoria (tipo para conta a pagar), valor (valorParcela), valorJuros, valorDesconto, meioPagamento.
 */
export async function atualizarMovimentacao(
  contaId: string,
  payload: AtualizarMovimentacaoPayload
): Promise<{ origem: 'conta_receber' | 'conta_pagar'; conta: any }> {
  const recebimentoParcial = await prisma.recebimentoParcial.findUnique({
    where: { id: contaId },
    include: { contaReceber: true }
  });
  if (recebimentoParcial) {
    const conta = recebimentoParcial.contaReceber;
    const base =
      payload.valor !== undefined ? Number(payload.valor) : recebimentoParcial.valorPago;
    const j = payload.valorJuros !== undefined ? Number(payload.valorJuros) : 0;
    const d = payload.valorDesconto !== undefined ? Number(payload.valorDesconto) : 0;
    const novoValorPago = base + j - d;
    if (novoValorPago <= 0) {
      throw new Error('O valor efetivo do recebimento deve ser maior que zero');
    }
    const outros = await prisma.recebimentoParcial.aggregate({
      where: { contaReceberId: conta.id, id: { not: recebimentoParcial.id } },
      _sum: { valorPago: true }
    });
    const somaOutros = Number(outros._sum.valorPago ?? 0);
    if (somaOutros + novoValorPago > conta.valorParcela + 0.02) {
      throw new Error(
        `O total recebido (R$ ${(somaOutros + novoValorPago).toFixed(2)}) não pode exceder o valor da parcela (R$ ${conta.valorParcela.toFixed(2)})`
      );
    }

    const dataPagamento =
      payload.dataPagamento !== undefined
        ? parseDataPagamentoBR(payload.dataPagamento)!
        : recebimentoParcial.dataPagamento;

    const contaAtualizada = await prisma.$transaction(async (tx) => {
      await tx.recebimentoParcial.update({
        where: { id: recebimentoParcial.id },
        data: {
          valorPago: novoValorPago,
          dataPagamento,
          meioPagamento:
            payload.meioPagamento !== undefined ? payload.meioPagamento : recebimentoParcial.meioPagamento,
          observacoes:
            payload.descricao !== undefined ? payload.descricao : recebimentoParcial.observacoes
        }
      });
      await sincronizarContaReceberAposParciais(tx, conta.id);
      return tx.contaReceber.findUnique({ where: { id: conta.id } });
    });
    return { origem: 'conta_receber', conta: contaAtualizada };
  }

  const contaReceber = await prisma.contaReceber.findUnique({ where: { id: contaId } });
  if (contaReceber) {
    if (contaReceber.status !== 'Pago') {
      throw new Error('Só é possível editar movimentações de contas já pagas');
    }
    const data: any = { updatedAt: new Date() };
    if (payload.dataPagamento !== undefined) {
      const [y, m, d] = payload.dataPagamento.split('-').map(Number);
      data.dataPagamento = new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    if (payload.descricao !== undefined) data.descricao = payload.descricao;
    if (payload.valor !== undefined) data.valorParcela = payload.valor;
    if (payload.valorJuros !== undefined) data.valorJuros = payload.valorJuros;
    if (payload.valorDesconto !== undefined) data.valorDesconto = payload.valorDesconto;
    if (payload.meioPagamento !== undefined) data.meioPagamento = payload.meioPagamento;

    const conta = await prisma.contaReceber.update({
      where: { id: contaId },
      data
    });
    return { origem: 'conta_receber', conta };
  }

  const contaPagar = await prisma.contaPagar.findUnique({ where: { id: contaId } });
  if (contaPagar) {
    if (contaPagar.status !== 'Pago') {
      throw new Error('Só é possível editar movimentações de contas já pagas');
    }
    const data: any = { updatedAt: new Date() };
    if (payload.dataPagamento !== undefined) {
      const [y, m, d] = payload.dataPagamento.split('-').map(Number);
      data.dataPagamento = new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    if (payload.descricao !== undefined) data.descricao = payload.descricao;
    if (payload.valor !== undefined) data.valorParcela = payload.valor;
    if (payload.valorJuros !== undefined) data.valorJuros = payload.valorJuros;
    if (payload.valorDesconto !== undefined) data.valorDesconto = payload.valorDesconto;
    if (payload.meioPagamento !== undefined) data.meioPagamento = payload.meioPagamento;
    if (payload.categoria !== undefined) {
      const tipo = CATEGORIA_TO_TIPO[payload.categoria] || payload.categoria;
      data.tipo = tipo;
    }

    const conta = await prisma.contaPagar.update({
      where: { id: contaId },
      data
    });
    return { origem: 'conta_pagar', conta };
  }

  throw new Error('Movimentação não encontrada');
}
