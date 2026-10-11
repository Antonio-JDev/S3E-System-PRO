import { prisma } from '../lib/prisma';
import { CLASSIFICACAO_TRANSFERENCIA, montarExtratoConta, saldoContaBancaria } from '../utils/tesouraria.util';

export interface ContaBancariaPayload {
  nome?: string;
  banco?: string | null;
  agencia?: string | null;
  numeroConta?: string | null;
  saldoInicial?: number;
  ativo?: boolean;
}

export interface TransferenciaPayload {
  contaOrigemId?: string;
  contaDestinoId?: string;
  valor?: number;
  data?: string;
  descricao?: string;
}

function textoOpcional(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto || null;
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function parseDataMovimento(data: string): Date {
  if (data.includes('-') && !data.includes('T')) {
    const [ano, mes, dia] = data.split('-').map(Number);
    if (!ano || !mes || !dia) throw new Error('Data inválida');
    return new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  }
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) throw new Error('Data inválida');
  return parsed;
}

export async function listarContas(somenteAtivas?: boolean) {
  const contas = await prisma.contaBancaria.findMany({
    where: somenteAtivas ? { ativo: true } : undefined,
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    include: {
      movimentacoes: { select: { tipo: true, valor: true } },
    },
  });

  return contas.map((conta) => ({
    id: conta.id,
    nome: conta.nome,
    banco: conta.banco,
    agencia: conta.agencia,
    numeroConta: conta.numeroConta,
    saldoInicial: conta.saldoInicial,
    ativo: conta.ativo,
    saldo: arredondar(
      saldoContaBancaria({
        saldoInicial: conta.saldoInicial,
        movimentacoes: conta.movimentacoes,
      }),
    ),
  }));
}

export async function criarConta(payload: ContaBancariaPayload) {
  const nome = (payload.nome || '').trim();
  if (!nome) throw new Error('Informe o nome da conta');
  const saldoInicial = payload.saldoInicial === undefined ? 0 : Number(payload.saldoInicial);
  if (!Number.isFinite(saldoInicial)) throw new Error('Saldo inicial inválido');

  return prisma.contaBancaria.create({
    data: {
      nome,
      banco: textoOpcional(payload.banco),
      agencia: textoOpcional(payload.agencia),
      numeroConta: textoOpcional(payload.numeroConta),
      saldoInicial: arredondar(saldoInicial),
    },
  });
}

function inicioDoDia(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

function fimDoDia(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 23, 59, 59, 999);
}

export async function extratoConta(id: string, dataInicio?: string, dataFim?: string) {
  const conta = await prisma.contaBancaria.findUnique({ where: { id } });
  if (!conta) throw new Error('Conta bancária não encontrada');

  const movimentos = await prisma.movimentacaoTesouraria.findMany({
    where: { contaBancariaId: id },
    include: {
      transferencia: {
        select: {
          contaOrigem: { select: { nome: true } },
          contaDestino: { select: { nome: true } },
        },
      },
    },
  });

  const extrato = montarExtratoConta({
    saldoInicial: conta.saldoInicial,
    dataInicio: dataInicio ? inicioDoDia(dataInicio) : null,
    dataFim: dataFim ? fimDoDia(dataFim) : null,
    movimentacoes: movimentos.map((movimento) => ({
      id: movimento.id,
      data: movimento.data,
      tipo: movimento.tipo,
      valor: movimento.valor,
      descricao: movimento.descricao,
      contraparte:
        movimento.tipo === 'SAIDA'
          ? movimento.transferencia.contaDestino.nome
          : movimento.transferencia.contaOrigem.nome,
    })),
  });

  return {
    conta: {
      id: conta.id,
      nome: conta.nome,
      banco: conta.banco,
      agencia: conta.agencia,
      numeroConta: conta.numeroConta,
    },
    dataInicio: dataInicio || null,
    dataFim: dataFim || null,
    ...extrato,
  };
}

export async function definirAtivo(id: string, ativo: boolean) {
  const conta = await prisma.contaBancaria.findUnique({ where: { id } });
  if (!conta) throw new Error('Conta bancária não encontrada');
  return prisma.contaBancaria.update({
    where: { id },
    data: { ativo },
  });
}

export async function criarTransferencia(payload: TransferenciaPayload) {
  const contaOrigemId = (payload.contaOrigemId || '').trim();
  const contaDestinoId = (payload.contaDestinoId || '').trim();
  const valor = arredondar(Number(payload.valor));
  if (!contaOrigemId || !contaDestinoId) {
    throw new Error('Informe a conta de origem e a conta de destino');
  }
  if (contaOrigemId === contaDestinoId) {
    throw new Error('A conta de origem e a de destino precisam ser diferentes');
  }
  if (!Number.isFinite(valor) || valor <= 0) throw new Error('Informe um valor maior que zero');
  if (!payload.data) throw new Error('Informe a data');
  const data = parseDataMovimento(payload.data);

  const [origem, destino] = await Promise.all([
    prisma.contaBancaria.findUnique({ where: { id: contaOrigemId } }),
    prisma.contaBancaria.findUnique({ where: { id: contaDestinoId } }),
  ]);
  if (!origem || !origem.ativo) throw new Error('Conta de origem não encontrada ou inativa');
  if (!destino || !destino.ativo) throw new Error('Conta de destino não encontrada ou inativa');

  const descricao = (payload.descricao || '').trim() || `Transferência de ${origem.nome} para ${destino.nome}`;

  return prisma.$transaction(async (tx) => {
    const transferencia = await tx.transferenciaBancaria.create({
      data: {
        contaOrigemId,
        contaDestinoId,
        valor,
        data,
        descricao,
      },
    });

    await tx.movimentacaoTesouraria.createMany({
      data: [
        {
          contaBancariaId: contaOrigemId,
          transferenciaId: transferencia.id,
          tipo: 'SAIDA',
          classificacao: CLASSIFICACAO_TRANSFERENCIA,
          valor,
          data,
          descricao,
        },
        {
          contaBancariaId: contaDestinoId,
          transferenciaId: transferencia.id,
          tipo: 'ENTRADA',
          classificacao: CLASSIFICACAO_TRANSFERENCIA,
          valor,
          data,
          descricao,
        },
      ],
    });

    return transferencia;
  });
}

export async function estornarTransferencia(id: string) {
  const transferencia = await prisma.transferenciaBancaria.findUnique({ where: { id } });
  if (!transferencia) throw new Error('Transferência não encontrada');
  await prisma.transferenciaBancaria.delete({ where: { id } });
  return { id };
}
