import { prisma } from '../lib/prisma';
import {
  calcularConversao,
  detectarConversaoKmParaM,
  normalizarUnidade,
  type MotivoConversao,
} from '../utils/conversaoUnidadeCompra.util';
import { camposCustoMovimento } from '../utils/custoMovimentacao.util';

export class ConverterUnidadeError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'ConverterUnidadeError';
  }
}

export type OrigemConversaoUnidade = 'AUTOMATICA_IMPORTACAO' | 'REVISAO' | 'MANUAL';

export interface ConverterUnidadeInput {
  compraId: string;
  itemId: string;
  de: string;
  para: string;
  origem?: OrigemConversaoUnidade;
  usuario?: { id?: string | null; nome?: string | null };
}

export interface ResultadoConverterUnidade {
  itemId: string;
  fator: number;
  unidade: string;
  quantidadeAnterior: number;
  quantidade: number;
  valorUnitAnterior: number;
  valorUnit: number;
  valorTotal: number;
  precoMaterialCorrigido: boolean;
  /** Diferença aplicada no estoque (0 quando o item ainda não entrou no estoque). */
  estoqueAjustado: number;
  destinoAjustado: 'OBRA' | 'RESERVA_OS' | null;
}

const MOTIVO_MOVIMENTACAO = 'AJUSTE_CONVERSAO_UNIDADE';
const TOLERANCIA_PRECO = 0.01;
const arred6 = (n: number) => Math.round(n * 1e6) / 1e6;

export async function converterUnidadeCompraItem(input: ConverterUnidadeInput): Promise<ResultadoConverterUnidade> {
  const { compraId, itemId, de, para } = input;
  if (!compraId || !itemId) throw new ConverterUnidadeError('Compra e item são obrigatórios');
  if (!de || !para) throw new ConverterUnidadeError('Informe as unidades de origem (de) e destino (para)');

  return prisma.$transaction(async (tx: any) => {
    const item = await tx.compraItem.findUnique({
      where: { id: itemId },
      include: {
        compra: {
          select: { id: true, status: true, numeroNF: true, obraId: true, projetoId: true, destinoTipo: true },
        },
      },
    });
    if (!item || item.compraId !== compraId) {
      throw new ConverterUnidadeError('Item da compra não encontrado', 404);
    }
    const compra = item.compra;
    if (compra.status === 'Cancelado') {
      throw new ConverterUnidadeError('Não é possível converter itens de uma compra cancelada');
    }
    if (item.conversaoUnidadeEm) {
      throw new ConverterUnidadeError('Este item já teve a unidade convertida');
    }
    if (item.quantidadeFracionada) {
      throw new ConverterUnidadeError('Item com fracionamento configurado não pode ter a unidade convertida');
    }

    let conv;
    try {
      conv = calcularConversao(
        { quantidade: item.quantidade, valorUnit: item.valorUnit, valorTotal: item.valorTotal },
        de,
        para,
      );
    } catch (e) {
      throw new ConverterUnidadeError(e instanceof Error ? e.message : 'Conversão inválida');
    }
    const delta = arred6(conv.quantidade - item.quantidade);
    const origemUnidade = normalizarUnidade(de);

    await tx.compraItem.update({
      where: { id: item.id },
      data: {
        quantidade: conv.quantidade,
        valorUnit: conv.valorUnit,
        unidadeMedida: conv.unidade,
        unidadeOriginal: origemUnidade,
        quantidadeOriginal: item.quantidade,
        valorUnitOriginal: item.valorUnit,
        conversaoUnidadeEm: new Date(),
        conversaoUnidadePorId: input.usuario?.id ?? null,
        conversaoUnidadePorNome: input.usuario?.nome ?? null,
        conversaoUnidadeOrigem: input.origem ?? 'MANUAL',
      },
    });

    const resultado: ResultadoConverterUnidade = {
      itemId: item.id,
      fator: conv.fator,
      unidade: conv.unidade,
      quantidadeAnterior: item.quantidade,
      quantidade: conv.quantidade,
      valorUnitAnterior: item.valorUnit,
      valorUnit: conv.valorUnit,
      valorTotal: conv.valorTotal,
      precoMaterialCorrigido: false,
      estoqueAjustado: 0,
      destinoAjustado: null,
    };

    if (!item.materialId) return resultado;
    const materialId: string = item.materialId;

    const material = await tx.material.findUnique({
      where: { id: materialId },
      select: { preco: true, unidadeMedida: true },
    });
    const dadosMaterial: Record<string, unknown> = {};
    if (material?.preco != null && Math.abs(material.preco - item.valorUnit) < TOLERANCIA_PRECO) {
      dadosMaterial.preco = conv.valorUnit;
      resultado.precoMaterialCorrigido = true;
    }
    if (material && normalizarUnidade(material.unidadeMedida) === origemUnidade) {
      dadosMaterial.unidadeMedida = conv.unidade;
    }
    if (Object.keys(dadosMaterial).length > 0) {
      await tx.material.update({ where: { id: materialId }, data: dadosMaterial });
    }

    const entradaCompra = await tx.movimentacaoEstoque.findFirst({
      where: { materialId, referencia: compraId, motivo: 'COMPRA', tipo: 'ENTRADA' },
      select: { id: true },
    });
    if (!entradaCompra || delta === 0) return resultado;

    const descricaoConversao = `${item.quantidade} ${origemUnidade} -> ${conv.quantidade} ${conv.unidade} (NF ${compra.numeroNF})`;

    await tx.material.update({ where: { id: materialId }, data: { estoque: { increment: delta } } });
    await tx.movimentacaoEstoque.create({
      data: {
        materialId,
        tipo: delta > 0 ? 'ENTRADA' : 'SAIDA',
        quantidade: Math.abs(delta),
        motivo: MOTIVO_MOVIMENTACAO,
        referencia: compraId,
        observacoes: `Conversão de unidade: ${descricaoConversao}`,
      },
    });
    resultado.estoqueAjustado = delta;

    const legacyObraAvulsa = !!(compra.obraId && !compra.destinoTipo);
    const segueDestino = legacyObraAvulsa || item.destinoEstoque === false;
    if (!segueDestino) return resultado;

    const destinoTipo = compra.destinoTipo || (compra.obraId ? 'OBRA' : compra.projetoId ? 'PROJETO' : null);

    const ajustarSaidaObra = async (obraId: string) => {
      const qtd = Math.abs(delta);
      const mat = await tx.material.findUnique({
        where: { id: materialId },
        select: { preco: true },
      });
      const obraDestino = await tx.obra.findUnique({
        where: { id: obraId },
        select: { projetoId: true },
      });
      await tx.material.update({ where: { id: materialId }, data: { estoque: { decrement: delta } } });
      await tx.movimentacaoEstoque.create({
        data: {
          materialId,
          tipo: delta > 0 ? 'SAIDA' : 'ENTRADA',
          quantidade: qtd,
          motivo: 'OBRA',
          referencia: obraId,
          observacoes: `Ajuste de alocação por conversão de unidade: ${descricaoConversao}`,
          ...camposCustoMovimento({
            preco: mat?.preco,
            quantidade: qtd,
            projetoId: obraDestino?.projetoId ?? compra.projetoId ?? null,
          }),
        },
      });
      resultado.destinoAjustado = 'OBRA';
    };

    if ((destinoTipo === 'OBRA' || legacyObraAvulsa) && compra.obraId) {
      await ajustarSaidaObra(compra.obraId);
      return resultado;
    }

    if (destinoTipo === 'PROJETO' && compra.projetoId) {
      const reserva = await tx.reservaMaterialProjeto.findFirst({
        where: { compraItemId: item.id },
        select: { id: true, quantidade: true },
      });
      if (reserva) {
        await tx.reservaMaterialProjeto.update({
          where: { id: reserva.id },
          data: { quantidade: arred6(reserva.quantidade * conv.fator) },
        });
        resultado.destinoAjustado = 'RESERVA_OS';
        return resultado;
      }
      const obra = await tx.obra.findUnique({ where: { projetoId: compra.projetoId }, select: { id: true } });
      if (obra?.id) await ajustarSaidaObra(obra.id);
    }

    return resultado;
  });
}

export interface SugestaoConversaoUnidade {
  itemId: string;
  nomeProduto: string;
  de: 'km';
  para: 'm';
  motivo: MotivoConversao;
  descricao?: string;
  atual: { quantidade: number; valorUnit: number; valorTotal: number; unidade: string };
  convertido: { quantidade: number; valorUnit: number; valorTotal: number; unidade: string };
}

export async function sugerirConversoesCompra(compraId: string): Promise<SugestaoConversaoUnidade[]> {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    select: {
      status: true,
      items: {
        select: {
          id: true,
          nomeProduto: true,
          quantidade: true,
          valorUnit: true,
          valorTotal: true,
          unidadeMedida: true,
          quantidadeFracionada: true,
          conversaoUnidadeEm: true,
          material: { select: { preco: true } },
        },
      },
    },
  });
  if (!compra) throw new ConverterUnidadeError('Compra não encontrada', 404);
  if (compra.status === 'Cancelado') return [];

  const sugestoes: SugestaoConversaoUnidade[] = [];
  for (const it of compra.items) {
    if (it.conversaoUnidadeEm || it.quantidadeFracionada) continue;
    const det = detectarConversaoKmParaM({
      nomeProduto: it.nomeProduto,
      unidadeMedida: it.unidadeMedida,
      quantidade: it.quantidade,
      valorUnit: it.valorUnit,
      valorTotal: it.valorTotal,
      precoMaterialPorMetro: it.material?.preco ?? null,
    });
    if (!det.converter || !det.motivo) continue;
    const conv = calcularConversao(it, 'km', 'm');
    sugestoes.push({
      itemId: it.id,
      nomeProduto: it.nomeProduto,
      de: 'km',
      para: 'm',
      motivo: det.motivo,
      descricao: det.descricao,
      atual: {
        quantidade: it.quantidade,
        valorUnit: it.valorUnit,
        valorTotal: it.valorTotal,
        unidade: normalizarUnidade(it.unidadeMedida),
      },
      convertido: {
        quantidade: conv.quantidade,
        valorUnit: conv.valorUnit,
        valorTotal: conv.valorTotal,
        unidade: conv.unidade,
      },
    });
  }
  return sugestoes;
}
