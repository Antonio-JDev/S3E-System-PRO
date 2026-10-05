import { prisma } from '../lib/prisma';
import {
  calcularAjusteAbsoluto,
  montarObservacaoInventario,
  validarQuantidadeContada,
} from '../utils/inventarioAjuste.util';
import { resolverEanCprod } from './materialFornecedorAlias.service';

export interface MaterialContagem {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  localizacao: string | null;
  unidadeMedida: string;
  categoria: string | null;
  tipo: string | null;
  ean: string | null;
  codigoFornecedor: string | null;
}

export interface AjusteInventarioInput {
  materialId: string;
  quantidadeContada: unknown;
  observacoes?: string | null;
}

export interface AjusteInventarioResultado {
  materialId: string;
  materialNome?: string;
  estoqueAnterior: number;
  quantidadeContada: number;
  diferenca: number;
  semAlteracao: boolean;
  movimentacaoId?: string;
  message: string;
}

export class InventarioService {
  static async listarMateriaisParaContagem(busca?: string): Promise<MaterialContagem[]> {
    const where: Record<string, unknown> = { ativo: true };

    if (busca?.trim()) {
      const termo = busca.trim();
      where.OR = [
        { nome: { contains: termo, mode: 'insensitive' } },
        { sku: { contains: termo, mode: 'insensitive' } },
        { skuAnterior: { contains: termo, mode: 'insensitive' } },
        { localizacao: { contains: termo, mode: 'insensitive' } },
        { aliasesFornecedor: { some: { ean: { contains: termo, mode: 'insensitive' } } } },
        {
          aliasesFornecedor: {
            some: { codigoFornecedor: { contains: termo, mode: 'insensitive' } },
          },
        },
      ];
    }

    const materiais = await prisma.material.findMany({
      where,
      select: {
        id: true,
        nome: true,
        sku: true,
        estoque: true,
        localizacao: true,
        unidadeMedida: true,
        categoria: true,
        tipo: true,
        fornecedorId: true,
        aliasesFornecedor: {
          select: {
            ean: true,
            codigoFornecedor: true,
            fornecedorId: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: [{ localizacao: 'asc' }, { nome: 'asc' }],
    });

    return materiais.map((m) => {
      const { ean, codigoFornecedor } = resolverEanCprod(m.aliasesFornecedor, m.fornecedorId);
      return {
        id: m.id,
        nome: m.nome,
        sku: m.sku,
        estoqueAtual: m.estoque,
        localizacao: m.localizacao,
        unidadeMedida: m.unidadeMedida,
        categoria: m.categoria,
        tipo: m.tipo,
        ean,
        codigoFornecedor,
      };
    });
  }

  static async aplicarAjusteAbsoluto(
    input: AjusteInventarioInput,
    usuario?: { userId?: string; name?: string | null }
  ): Promise<AjusteInventarioResultado> {
    const validacao = validarQuantidadeContada(input.quantidadeContada);
    if (!validacao.ok) {
      throw Object.assign(
        new Error((validacao as { ok: false; message: string }).message),
        { statusCode: 400 }
      );
    }

    if (!input.materialId) {
      throw Object.assign(new Error('materialId é obrigatório'), { statusCode: 400 });
    }

    const material = await prisma.material.findUnique({
      where: { id: input.materialId },
      select: { id: true, nome: true, estoque: true, ativo: true },
    });

    if (!material) {
      throw Object.assign(new Error('Material não encontrado'), { statusCode: 404 });
    }

    const calculo = calcularAjusteAbsoluto(material.estoque, validacao.valor);

    if (calculo.semAlteracao) {
      return {
        materialId: material.id,
        materialNome: material.nome,
        estoqueAnterior: calculo.estoqueAnterior,
        quantidadeContada: calculo.quantidadeContada,
        diferenca: 0,
        semAlteracao: true,
        message: 'Saldo já confere com a contagem — nenhuma movimentação criada',
      };
    }

    const observacoes = montarObservacaoInventario({
      estoqueAnterior: calculo.estoqueAnterior,
      quantidadeContada: calculo.quantidadeContada,
      usuarioNome: usuario?.name,
      usuarioId: usuario?.userId,
      observacaoUsuario: input.observacoes,
    });

    const resultado = await prisma.$transaction(async (tx) => {
      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          materialId: material.id,
          tipo: 'AJUSTE',
          quantidade: calculo.quantidadeContada,
          motivo: 'Ajuste de Inventário',
          observacoes,
        },
      });

      await tx.material.update({
        where: { id: material.id },
        data: { estoque: calculo.quantidadeContada },
      });

      return movimentacao;
    });

    return {
      materialId: material.id,
      materialNome: material.nome,
      estoqueAnterior: calculo.estoqueAnterior,
      quantidadeContada: calculo.quantidadeContada,
      diferenca: calculo.diferenca,
      semAlteracao: false,
      movimentacaoId: resultado.id,
      message: `Estoque ajustado de ${calculo.estoqueAnterior} para ${calculo.quantidadeContada}`,
    };
  }

  static async aplicarAjustesEmLote(
    itens: AjusteInventarioInput[],
    usuario?: { userId?: string; name?: string | null }
  ): Promise<{
    resultados: AjusteInventarioResultado[];
    aplicados: number;
    semAlteracao: number;
    erros: number;
  }> {
    if (!Array.isArray(itens) || itens.length === 0) {
      throw Object.assign(new Error('Informe ao menos um item para ajuste'), { statusCode: 400 });
    }

    const resultados: AjusteInventarioResultado[] = [];
    let aplicados = 0;
    let semAlteracao = 0;
    let erros = 0;

    for (const item of itens) {
      try {
        const r = await this.aplicarAjusteAbsoluto(item, usuario);
        resultados.push(r);
        if (r.semAlteracao) semAlteracao += 1;
        else aplicados += 1;
      } catch (err: any) {
        erros += 1;
        resultados.push({
          materialId: item.materialId || '',
          estoqueAnterior: 0,
          quantidadeContada: Number(item.quantidadeContada) || 0,
          diferenca: 0,
          semAlteracao: false,
          message: err?.message || 'Erro ao aplicar ajuste',
        });
      }
    }

    return { resultados, aplicados, semAlteracao, erros };
  }
}
