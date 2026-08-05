import { LancamentoFolhaCategoria, TipoContratoFuncionario } from '@prisma/client';
import { prisma } from '../lib/prisma';

function valorHoraClt(f: {
  salarioBase: unknown;
  salario: unknown;
  cargaHorariaMensal: number | null;
  valorHora: unknown;
}): number {
  const base = f.salarioBase != null ? Number(f.salarioBase) : Number(f.salario ?? 0);
  const carga = f.cargaHorariaMensal ?? 220;
  if (base > 0 && carga > 0) return base / carga;
  return Number(f.valorHora ?? 0);
}

function valorPagamentoBanco(hNormais: number, hExtras100: number, vh: number): number {
  return hNormais * vh + hExtras100 * vh * 2;
}

export type OrigemConversaoFolga = 'automatico' | 'normais' | 'extras100';

/**
 * Transfere horas do banco para crédito de folga (exibição para RH).
 */
export async function converterHorasParaFolga(
  funcionarioId: string,
  horas: number,
  origem: OrigemConversaoFolga = 'automatico',
) {
  if (!Number.isFinite(horas) || horas <= 0) {
    throw new Error('Informe uma quantidade de horas positiva');
  }
  const f = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!f) throw new Error('Funcionário não encontrado');
  let saldoN = Number(f.saldoBancoHorasNormaisExcedente ?? 0);
  let saldo100 = Number(f.saldoBancoHorasExtras100 ?? 0);
  const saldoLegado = Number(f.saldoBancoHoras ?? saldoN + saldo100);
  if (saldoN + saldo100 <= 0 && saldoLegado > 0) {
    saldoN = saldoLegado;
    saldo100 = 0;
  }
  const saldo = saldoN + saldo100;
  if (horas > saldo + 1e-6) {
    throw new Error('Quantidade maior que o saldo de banco de horas');
  }

  let takeN = 0;
  let take100 = 0;
  if (origem === 'normais') {
    if (horas > saldoN + 1e-6) throw new Error('Quantidade maior que o saldo em horas normais / excedente de jornada');
    takeN = horas;
  } else if (origem === 'extras100') {
    if (horas > saldo100 + 1e-6) throw new Error('Quantidade maior que o saldo em horas extras 100%');
    take100 = horas;
  } else {
    let rest = horas;
    take100 = Math.min(rest, saldo100);
    rest -= take100;
    takeN = Math.min(rest, saldoN);
  }

  const folgaAtual = Number(f.horasFolgaAcumuladas ?? 0);
  const novoN = saldoN - takeN;
  const novo100 = saldo100 - take100;
  const novoTotal = novoN + novo100;

  await prisma.funcionario.update({
    where: { id: funcionarioId },
    data: {
      saldoBancoHorasNormaisExcedente: novoN,
      saldoBancoHorasExtras100: novo100,
      saldoBancoHoras: novoTotal,
      horasFolgaAcumuladas: folgaAtual + horas,
    },
  });
  return {
    saldoNovo: novoTotal,
    saldoNormaisNovo: novoN,
    saldoExtras100Novo: novo100,
    horasFolgaTotal: folgaAtual + horas,
  };
}

export type AlocacaoPagamentoBanco =
  | { tipo: 'automatico' }
  | { tipo: 'so_normais' }
  | { tipo: 'so_extras100' }
  | { tipo: 'misto'; horasNormais: number; horasExtras100: number };

export async function incluirPagamentoBancoNaFolha(params: {
  funcionarioId: string;
  referenciaAno: number;
  referenciaMes: number;
  modo: 'total' | 'parcial';
  horasParcial?: number;
  alocacao?: AlocacaoPagamentoBanco;
}) {
  const f = await prisma.funcionario.findUnique({ where: { id: params.funcionarioId } });
  if (!f) throw new Error('Funcionário não encontrado');
  if (f.tipoContrato !== TipoContratoFuncionario.REGISTRADO) {
    throw new Error('Pagamento de banco na folha aplica-se a colaboradores registrados (CLT)');
  }

  let saldoN = Number(f.saldoBancoHorasNormaisExcedente ?? 0);
  let saldo100 = Number(f.saldoBancoHorasExtras100 ?? 0);
  const saldoLegado = Number(f.saldoBancoHoras ?? saldoN + saldo100);
  if (saldoN + saldo100 <= 0 && saldoLegado > 0) {
    saldoN = saldoLegado;
    saldo100 = 0;
  }

  const vh = valorHoraClt(f);
  if (vh <= 0) {
    throw new Error('Não foi possível calcular valor hora (salário base ou valor hora)');
  }

  const aloc: AlocacaoPagamentoBanco = params.alocacao ?? { tipo: 'automatico' };
  let takeN = 0;
  let take100 = 0;

  if (params.modo === 'total') {
    takeN = saldoN;
    take100 = saldo100;
  } else {
    const H = Number(params.horasParcial ?? 0);
    if (!Number.isFinite(H) || H <= 0) {
      throw new Error('Informe as horas a pagar');
    }
    if (H > saldoN + saldo100 + 1e-6) {
      throw new Error('Quantidade maior que o saldo de banco de horas');
    }

    if (aloc.tipo === 'misto') {
      takeN = aloc.horasNormais;
      take100 = aloc.horasExtras100;
      if (Math.abs(takeN + take100 - H) > 0.02) {
        throw new Error('Na alocação mista, a soma das horas deve igualar o total informado');
      }
      if (takeN > saldoN + 1e-6 || take100 > saldo100 + 1e-6) {
        throw new Error('Horas informadas excedem o saldo por componente');
      }
    } else if (aloc.tipo === 'so_normais') {
      takeN = Math.min(H, saldoN);
      if (takeN < H - 1e-6) throw new Error('Saldo insuficiente em horas normais / excedente de jornada');
    } else if (aloc.tipo === 'so_extras100') {
      take100 = Math.min(H, saldo100);
      if (take100 < H - 1e-6) throw new Error('Saldo insuficiente em horas extras 100%');
    } else {
      let rest = H;
      take100 = Math.min(rest, saldo100);
      rest -= take100;
      takeN = Math.min(rest, saldoN);
      if (takeN + take100 < H - 1e-6) {
        throw new Error('Não foi possível alocar as horas (saldo por componente)');
      }
    }
  }

  if (takeN + take100 <= 1e-6) {
    throw new Error('Informe as horas a pagar');
  }

  const valor = valorPagamentoBanco(takeN, take100, vh);
  const totalH = takeN + take100;
  const desc =
    take100 > 1e-6 && takeN > 1e-6
      ? `Pagamento banco de horas (${takeN.toFixed(2)} h normais + ${take100.toFixed(2)} h 100%)`
      : take100 > 1e-6
        ? `Pagamento banco de horas (${take100.toFixed(2)} h extras 100%)`
        : `Pagamento banco de horas (${takeN.toFixed(2)} h)`;

  const row = await prisma.lancamentoFolha.create({
    data: {
      funcionarioId: params.funcionarioId,
      referenciaAno: params.referenciaAno,
      referenciaMes: params.referenciaMes,
      categoria: LancamentoFolhaCategoria.PAGAMENTO_BANCO_HORAS,
      valor,
      quantidadeHoras: totalH,
      horasComponenteNormais: takeN,
      horasComponenteExtras100: take100,
      descricao: desc,
    },
  });

  return {
    lancamento: row,
    valor,
    horas: totalH,
    horasNormais: takeN,
    horasExtras100: take100,
    valorHora: vh,
  };
}

const MES_REF_REGEX = /(20\d{2})-(\d{2})/;

/**
 * Ao marcar salário como pago, baixa as horas do banco vinculadas aos lançamentos daquele mês.
 */
export async function baixarBancoHorasAoPagarSalarioRh(conta: {
  id: string;
  funcionarioId: string | null;
  tipo: string;
  descricao: string;
  status: string;
}) {
  if (conta.tipo !== 'RH' || !conta.funcionarioId) return { aplicado: false };
  const m = conta.descricao.match(MES_REF_REGEX);
  if (!m) return { aplicado: false };
  const ano = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);

  const lancs = await prisma.lancamentoFolha.findMany({
    where: {
      funcionarioId: conta.funcionarioId,
      referenciaAno: ano,
      referenciaMes: mes,
      categoria: LancamentoFolhaCategoria.PAGAMENTO_BANCO_HORAS,
    },
  });

  let sumN = 0;
  let sum100 = 0;
  let sumLegacy = 0;
  for (const l of lancs) {
    const q = Number(l.quantidadeHoras ?? 0);
    if (q <= 0) continue;
    const cn = l.horasComponenteNormais != null ? Number(l.horasComponenteNormais) : null;
    const c100 = l.horasComponenteExtras100 != null ? Number(l.horasComponenteExtras100) : null;
    if (cn != null || c100 != null) {
      sumN += cn ?? 0;
      sum100 += c100 ?? 0;
    } else {
      sumLegacy += q;
    }
  }

  const horasTotal = sumN + sum100 + sumLegacy;
  if (horasTotal <= 0) return { aplicado: false, horas: 0 };

  await prisma.$transaction(async (tx) => {
    const func = await tx.funcionario.findUnique({ where: { id: conta.funcionarioId! } });
    if (!func) return;
    let saldoN = Number(func.saldoBancoHorasNormaisExcedente ?? 0);
    let saldo100 = Number(func.saldoBancoHorasExtras100 ?? 0);
    const novoN = Math.max(0, saldoN - sumN - sumLegacy);
    const novo100 = Math.max(0, saldo100 - sum100);
    const novoTotal = novoN + novo100;
    await tx.funcionario.update({
      where: { id: conta.funcionarioId! },
      data: {
        saldoBancoHorasNormaisExcedente: novoN,
        saldoBancoHorasExtras100: novo100,
        saldoBancoHoras: novoTotal,
      },
    });
  });

  return { aplicado: true, horas: horasTotal };
}

export type BancoHorasResumo = {
  horasPositivas: number;
  horasNegativas: number;
  horasTotalLiquido: number;
  horasPositivasCadastro: number;
  horasNegativasCadastro: number;
};

export function montarBancoHorasResumo(f: {
  saldoBancoHoras?: unknown;
  saldoBancoHorasNormaisExcedente?: unknown;
  saldoBancoHorasExtras100?: unknown;
  saldoHorasNegativas?: unknown;
}): BancoHorasResumo {
  let n = Number(f.saldoBancoHorasNormaisExcedente ?? 0);
  let e = Number(f.saldoBancoHorasExtras100 ?? 0);
  const leg = Number(f.saldoBancoHoras ?? n + e);
  if (n + e <= 0 && leg > 0) {
    n = leg;
    e = 0;
  }
  const horasPositivas = Math.max(0, n + e);
  const horasNegativas = Math.max(0, Number(f.saldoHorasNegativas ?? 0));
  return {
    horasPositivas,
    horasNegativas,
    horasTotalLiquido: horasPositivas - horasNegativas,
    horasPositivasCadastro: horasPositivas,
    horasNegativasCadastro: horasNegativas,
  };
}

/**
 * Aplica delta em horas do clique B / troca B↔P/D.
 * - `creditoDeltaHoras` > 0: soma banco positivo; < 0: estorna do positivo (não vira negativa).
 * - `debitoDeltaHoras` > 0: soma horas negativas; < 0: estorna dívida (não cria positivo).
 */
export async function aplicarDeltasAvaliacaoBancoHoras(
  funcionarioId: string,
  opts: { creditoDeltaHoras?: number; debitoDeltaHoras?: number },
) {
  const creditoDelta = Number(opts.creditoDeltaHoras ?? 0);
  const debitoDelta = Number(opts.debitoDeltaHoras ?? 0);
  if (
    (!Number.isFinite(creditoDelta) || Math.abs(creditoDelta) < 1e-9) &&
    (!Number.isFinite(debitoDelta) || Math.abs(debitoDelta) < 1e-9)
  ) {
    return montarBancoHorasResumo(
      (await prisma.funcionario.findUnique({ where: { id: funcionarioId } })) ?? {},
    );
  }

  const f = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!f) throw new Error('Funcionário não encontrado');

  let saldoN = Number(f.saldoBancoHorasNormaisExcedente ?? 0);
  let saldo100 = Number(f.saldoBancoHorasExtras100 ?? 0);
  const saldoLegado = Number(f.saldoBancoHoras ?? saldoN + saldo100);
  if (saldoN + saldo100 <= 0 && saldoLegado > 0) {
    saldoN = saldoLegado;
    saldo100 = 0;
  }
  let negativas = Math.max(0, Number(f.saldoHorasNegativas ?? 0));

  if (Number.isFinite(creditoDelta) && Math.abs(creditoDelta) >= 1e-9) {
    if (creditoDelta > 0) {
      saldoN += creditoDelta;
    } else {
      let rest = Math.abs(creditoDelta);
      const fromN = Math.min(Math.max(0, saldoN), rest);
      saldoN -= fromN;
      rest -= fromN;
      const from100 = Math.min(Math.max(0, saldo100), rest);
      saldo100 -= from100;
    }
  }

  if (Number.isFinite(debitoDelta) && Math.abs(debitoDelta) >= 1e-9) {
    if (debitoDelta > 0) {
      negativas += debitoDelta;
    } else {
      negativas = Math.max(0, negativas - Math.abs(debitoDelta));
    }
  }

  const novoTotal = Math.max(0, saldoN) + Math.max(0, saldo100);
  await prisma.funcionario.update({
    where: { id: funcionarioId },
    data: {
      saldoBancoHorasNormaisExcedente: Math.max(0, saldoN),
      saldoBancoHorasExtras100: Math.max(0, saldo100),
      saldoBancoHoras: novoTotal,
      saldoHorasNegativas: Math.max(0, negativas),
    },
  });

  return montarBancoHorasResumo({
    saldoBancoHoras: novoTotal,
    saldoBancoHorasNormaisExcedente: Math.max(0, saldoN),
    saldoBancoHorasExtras100: Math.max(0, saldo100),
    saldoHorasNegativas: Math.max(0, negativas),
  });
}

/**
 * Compat: delta assinado único (positivo = crédito; negativo = dívida).
 * Preferir `aplicarDeltasAvaliacaoBancoHoras` quando crédito e débito coexistem no dia.
 */
export async function aplicarDeltaAvaliacaoBancoHoras(funcionarioId: string, horasDelta: number) {
  if (!Number.isFinite(horasDelta) || Math.abs(horasDelta) < 1e-9) {
    return montarBancoHorasResumo(
      (await prisma.funcionario.findUnique({ where: { id: funcionarioId } })) ?? {},
    );
  }
  if (horasDelta > 0) {
    return aplicarDeltasAvaliacaoBancoHoras(funcionarioId, { creditoDeltaHoras: horasDelta });
  }
  return aplicarDeltasAvaliacaoBancoHoras(funcionarioId, {
    debitoDeltaHoras: Math.abs(horasDelta),
  });
}

/**
 * Abate horas positivas × negativas e persiste o líquido no cadastro.
 * liquido >= 0 → só banco positivo; liquido < 0 → só saldoHorasNegativas.
 */
export async function faturarBancoHoras(funcionarioId: string): Promise<BancoHorasResumo> {
  const f = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!f) throw new Error('Funcionário não encontrado');
  if (f.tipoContrato !== TipoContratoFuncionario.REGISTRADO &&
      f.tipoContrato !== TipoContratoFuncionario.AUTONOMO &&
      f.tipoContrato !== TipoContratoFuncionario.AUTONOMO_BANCO_HORAS) {
    throw new Error('Faturar banco aplica-se a colaboradores CLT, autônomo ou autônomo + banco horas');
  }

  const atual = montarBancoHorasResumo(f);
  const liquido = atual.horasTotalLiquido;

  if (liquido >= 0) {
    await prisma.funcionario.update({
      where: { id: funcionarioId },
      data: {
        saldoBancoHorasNormaisExcedente: liquido,
        saldoBancoHorasExtras100: 0,
        saldoBancoHoras: liquido,
        saldoHorasNegativas: 0,
      },
    });
    return montarBancoHorasResumo({
      saldoBancoHoras: liquido,
      saldoBancoHorasNormaisExcedente: liquido,
      saldoBancoHorasExtras100: 0,
      saldoHorasNegativas: 0,
    });
  }

  const debito = Math.abs(liquido);
  await prisma.funcionario.update({
    where: { id: funcionarioId },
    data: {
      saldoBancoHorasNormaisExcedente: 0,
      saldoBancoHorasExtras100: 0,
      saldoBancoHoras: 0,
      saldoHorasNegativas: debito,
    },
  });
  return montarBancoHorasResumo({
    saldoBancoHoras: 0,
    saldoBancoHorasNormaisExcedente: 0,
    saldoBancoHorasExtras100: 0,
    saldoHorasNegativas: debito,
  });
}

/**
 * Zera completamente o banco (positivas, HE 100% e negativas).
 * Não altera horas de folga acumuladas.
 */
export async function zerarBancoHoras(funcionarioId: string): Promise<BancoHorasResumo> {
  const f = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!f) throw new Error('Funcionário não encontrado');
  if (
    f.tipoContrato !== TipoContratoFuncionario.REGISTRADO &&
    f.tipoContrato !== TipoContratoFuncionario.AUTONOMO &&
    f.tipoContrato !== TipoContratoFuncionario.AUTONOMO_BANCO_HORAS
  ) {
    throw new Error('Zerar banco aplica-se a colaboradores CLT, autônomo ou autônomo + banco horas');
  }

  await prisma.funcionario.update({
    where: { id: funcionarioId },
    data: {
      saldoBancoHorasNormaisExcedente: 0,
      saldoBancoHorasExtras100: 0,
      saldoBancoHoras: 0,
      saldoHorasNegativas: 0,
    },
  });

  return montarBancoHorasResumo({
    saldoBancoHoras: 0,
    saldoBancoHorasNormaisExcedente: 0,
    saldoBancoHorasExtras100: 0,
    saldoHorasNegativas: 0,
  });
}
