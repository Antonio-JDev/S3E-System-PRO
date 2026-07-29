import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';

export interface CartaoCreditoPayload {
  nomeOuBanco: string;
  bandeira: string;
  ultimosQuatroDigitos: string;
  diaVencimento: number;
  diaFechamento: number;
  ativo?: boolean;
}

function validarDia(dia: number, campo: string) {
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new Error(`${campo} deve ser um inteiro entre 1 e 31`);
  }
}

function normalizarUltimosDigitos(digitos: string): string {
  const limpo = String(digitos || '').replace(/\D/g, '');
  if (limpo.length !== 4) {
    throw new Error('Informe exatamente os 4 últimos dígitos do cartão');
  }
  return limpo;
}

export class CartaoCreditoService {
  static async listar(ativo?: boolean) {
    return prisma.cartaoCredito.findMany({
      where: ativo === undefined ? undefined : { ativo },
      orderBy: [{ ativo: 'desc' }, { nomeOuBanco: 'asc' }],
    });
  }

  static async buscarPorId(id: string) {
    return prisma.cartaoCredito.findUnique({ where: { id } });
  }

  static async criar(payload: CartaoCreditoPayload) {
    const nomeOuBanco = (payload.nomeOuBanco || '').trim();
    const bandeira = (payload.bandeira || '').trim();
    if (!nomeOuBanco) throw new Error('Informe o nome ou banco do cartão');
    if (!bandeira) throw new Error('Informe a bandeira do cartão');

    validarDia(payload.diaVencimento, 'Dia de vencimento');
    validarDia(payload.diaFechamento, 'Dia de fechamento');
    const ultimosQuatroDigitos = normalizarUltimosDigitos(payload.ultimosQuatroDigitos);

    return prisma.cartaoCredito.create({
      data: {
        id: randomUUID(),
        nomeOuBanco,
        bandeira,
        ultimosQuatroDigitos,
        diaVencimento: payload.diaVencimento,
        diaFechamento: payload.diaFechamento,
        ativo: payload.ativo ?? true,
      },
    });
  }

  static async atualizar(id: string, payload: Partial<CartaoCreditoPayload>) {
    const existente = await prisma.cartaoCredito.findUnique({ where: { id } });
    if (!existente) throw new Error('Cartão de crédito não encontrado');

    const data: Record<string, unknown> = {};

    if (payload.nomeOuBanco !== undefined) {
      const nome = payload.nomeOuBanco.trim();
      if (!nome) throw new Error('Informe o nome ou banco do cartão');
      data.nomeOuBanco = nome;
    }
    if (payload.bandeira !== undefined) {
      const bandeira = payload.bandeira.trim();
      if (!bandeira) throw new Error('Informe a bandeira do cartão');
      data.bandeira = bandeira;
    }
    if (payload.ultimosQuatroDigitos !== undefined) {
      data.ultimosQuatroDigitos = normalizarUltimosDigitos(payload.ultimosQuatroDigitos);
    }
    if (payload.diaVencimento !== undefined) {
      validarDia(payload.diaVencimento, 'Dia de vencimento');
      data.diaVencimento = payload.diaVencimento;
    }
    if (payload.diaFechamento !== undefined) {
      validarDia(payload.diaFechamento, 'Dia de fechamento');
      data.diaFechamento = payload.diaFechamento;
    }
    if (payload.ativo !== undefined) {
      data.ativo = payload.ativo;
    }

    return prisma.cartaoCredito.update({ where: { id }, data });
  }

  /** Soft-delete: marca como inativo quando há vínculos; hard-delete se não houver. */
  static async excluir(id: string) {
    const existente = await prisma.cartaoCredito.findUnique({
      where: { id },
      include: {
        _count: { select: { contasPagar: true, faturas: true } },
      },
    });
    if (!existente) throw new Error('Cartão de crédito não encontrado');

    const temVinculos = existente._count.contasPagar > 0 || existente._count.faturas > 0;
    if (temVinculos) {
      return prisma.cartaoCredito.update({
        where: { id },
        data: { ativo: false },
      });
    }

    await prisma.cartaoCredito.delete({ where: { id } });
    return { id, excluido: true };
  }
}
