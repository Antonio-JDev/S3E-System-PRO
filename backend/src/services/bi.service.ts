import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuração de mão de obra para quadros (15% do custo de materiais)
const MAO_OBRA_PERCENTUAL = 0.15;

export interface InvestimentosProdutos {
  total: number;
  porMes: Array<{ mes: string; valor: number }>;
}

export interface GastoFornecedor {
  fornecedorId: string;
  fornecedorNome: string;
  total: number;
  quantidadeCompras: number;
}

export interface CustosQuadros {
  total: number;
  quantidade: number;
  media: number;
}

export interface LucrosQuadros {
  total: number;
  quantidade: number;
  media: number;
  margemMedia: number; // %
}

export interface VendasStats {
  quantidade: number;
  valorTotal: number;
  media: number;
}

export interface MarkupItem {
  tipo: 'MATERIAL' | 'KIT' | 'QUADRO_PRONTO' | 'SERVICO' | 'COTACAO';
  markupMedio: number;
  quantidade: number;
}

export interface ResumoGeral {
  investimentos: InvestimentosProdutos;
  gastosFornecedor: GastoFornecedor[];
  custosQuadros: CustosQuadros;
  lucrosQuadros: LucrosQuadros;
  vendas: VendasStats;
  markupItens: { porTipo: MarkupItem[] };
}

export class BIService {
  /**
   * Calcula investimentos em produtos (compras) por período
   */
  static async getInvestimentosProdutos(
    dataInicio: Date,
    dataFim: Date
  ): Promise<InvestimentosProdutos> {
    const compras = await prisma.compra.findMany({
      where: {
        dataCompra: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: {
          not: 'Cancelado',
        },
      },
      select: {
        valorTotal: true,
        dataCompra: true,
      },
    });

    const total = compras.reduce((sum, c) => sum + (c.valorTotal || 0), 0);

    // Agrupar por mês
    const porMesMap = new Map<string, number>();
      compras.forEach((compra) => {
        const mes = compra.dataCompra.toISOString().substring(0, 7); // YYYY-MM
        const valor = compra.valorTotal || 0;
      porMesMap.set(mes, (porMesMap.get(mes) || 0) + valor);
    });

    const porMes = Array.from(porMesMap.entries())
      .map(([mes, valor]) => ({
        mes,
        valor,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return {
      total,
      porMes,
    };
  }

  /**
   * Calcula gastos agrupados por fornecedor
   */
  static async getGastosPorFornecedor(
    dataInicio: Date,
    dataFim: Date
  ): Promise<GastoFornecedor[]> {
    const compras = await prisma.compra.findMany({
      where: {
        dataCompra: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: {
          not: 'Cancelado',
        },
      },
      include: {
        fornecedor: true,
      },
    });

    const gastosMap = new Map<string, { total: number; quantidade: number; nome: string }>();

      compras.forEach((compra) => {
        const fornecedorId = compra.fornecedorId || 'sem-fornecedor';
        const fornecedorNome = compra.fornecedor?.nome || compra.fornecedorNome || 'Fornecedor não identificado';
        const valor = compra.valorTotal || 0;

      const atual = gastosMap.get(fornecedorId) || { total: 0, quantidade: 0, nome: fornecedorNome };
      gastosMap.set(fornecedorId, {
        total: atual.total + valor,
        quantidade: atual.quantidade + 1,
        nome: fornecedorNome,
      });
    });

    return Array.from(gastosMap.entries()).map(([fornecedorId, dados]) => ({
      fornecedorId,
      fornecedorNome: dados.nome,
      total: dados.total,
      quantidadeCompras: dados.quantidade,
    }));
  }

  /**
   * Calcula custos de montagem de quadros (materiais + mão de obra)
   */
  static async getCustosQuadros(
    dataInicio: Date,
    dataFim: Date
  ): Promise<CustosQuadros> {
    // Buscar orçamentos vendidos (com venda associada) no período
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
        venda: {
          isNot: null, // Apenas orçamentos que foram vendidos
        },
      },
      include: {
        items: {
          where: {
            tipo: 'QUADRO_PRONTO',
          },
        },
      },
    });

    let totalCusto = 0;
    let quantidade = 0;

    for (const orcamento of orcamentos) {
      for (const item of orcamento.items) {
        if (item.tipo === 'QUADRO_PRONTO') {
          const custoMateriais = (item.custoUnit || 0) * (item.quantidade || 0);
          const custoMaoObra = custoMateriais * MAO_OBRA_PERCENTUAL;
          const custoTotal = custoMateriais + custoMaoObra;

          totalCusto += custoTotal;
          quantidade += item.quantidade || 0;
        }
      }
    }

    return {
      total: totalCusto,
      quantidade,
      media: quantidade > 0 ? totalCusto / quantidade : 0,
    };
  }

  /**
   * Calcula lucros por montagem de quadros
   */
  static async getLucrosQuadros(
    dataInicio: Date,
    dataFim: Date
  ): Promise<LucrosQuadros> {
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
        venda: {
          isNot: null,
        },
      },
      include: {
        items: {
          where: {
            tipo: 'QUADRO_PRONTO',
          },
        },
      },
    });

    let totalLucro = 0;
    let quantidade = 0;
    let totalCusto = 0;
    let totalVenda = 0;

    for (const orcamento of orcamentos) {
      for (const item of orcamento.items) {
        if (item.tipo === 'QUADRO_PRONTO') {
          const custoMateriais = (item.custoUnit || 0) * (item.quantidade || 0);
          const custoMaoObra = custoMateriais * MAO_OBRA_PERCENTUAL;
          const custoTotal = custoMateriais + custoMaoObra;
          const precoVenda = (item.precoUnit || 0) * (item.quantidade || 0);
          const lucro = precoVenda - custoTotal;

          totalLucro += lucro;
          totalCusto += custoTotal;
          totalVenda += precoVenda;
          quantidade += item.quantidade || 0;
        }
      }
    }

    const margemMedia = totalCusto > 0 ? (totalLucro / totalCusto) * 100 : 0;

    return {
      total: totalLucro,
      quantidade,
      media: quantidade > 0 ? totalLucro / quantidade : 0,
      margemMedia,
    };
  }

  /**
   * Estatísticas de vendas
   */
  static async getVendas(
    dataInicio: Date,
    dataFim: Date
  ): Promise<VendasStats> {
    const vendas = await prisma.venda.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      select: {
        valorTotal: true,
      },
    });

    const quantidade = vendas.length;
    const valorTotal = vendas.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
    const media = quantidade > 0 ? valorTotal / quantidade : 0;

    return {
      quantidade,
      valorTotal,
      media,
    };
  }

  /**
   * Calcula markup % por tipo de item em orçamentos vendidos
   */
  static async getMarkupItens(
    dataInicio: Date,
    dataFim: Date
  ): Promise<{ porTipo: MarkupItem[] }> {
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
        venda: {
          isNot: null,
        },
      },
      include: {
        items: {
          include: {
            kit: {
              include: {
                items: {
                  include: {
                    material: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const markupsPorTipo = new Map<
      string,
      { somaMarkup: number; quantidade: number }
    >();

    for (const orcamento of orcamentos) {
      for (const item of orcamento.items) {
        const tipo = item.tipo as string;
        const custoUnit = item.custoUnit || 0;
        const precoUnit = item.precoUnit || 0;

        if (custoUnit > 0 && precoUnit > 0) {
          // Para quadros, incluir mão de obra no custo
          let custoTotal = custoUnit;
          if (tipo === 'QUADRO_PRONTO') {
            const custoMaoObra = custoUnit * MAO_OBRA_PERCENTUAL;
            custoTotal = custoUnit + custoMaoObra;
          }

          // Para kits, calcular custo total dos materiais do kit
          if (tipo === 'KIT' && item.kit) {
            let custoKit = 0;
            for (const kitItem of item.kit.items) {
              const materialCusto = kitItem.material?.preco || 0;
              custoKit += materialCusto * kitItem.quantidade;
            }
            if (custoKit > 0) {
              custoTotal = custoKit;
            }
          }

          const markup = ((precoUnit - custoTotal) / custoTotal) * 100;
          const quantidade = item.quantidade || 0;

          const atual = markupsPorTipo.get(tipo) || {
            somaMarkup: 0,
            quantidade: 0,
          };
          markupsPorTipo.set(tipo, {
            somaMarkup: atual.somaMarkup + markup * quantidade,
            quantidade: atual.quantidade + quantidade,
          });
        }
      }
    }

    const porTipo: MarkupItem[] = Array.from(markupsPorTipo.entries()).map(
      ([tipo, dados]) => ({
        tipo: tipo as MarkupItem['tipo'],
        markupMedio:
          dados.quantidade > 0 ? dados.somaMarkup / dados.quantidade : 0,
        quantidade: dados.quantidade,
      })
    );

    return { porTipo };
  }

  /**
   * Resumo consolidado de todas as métricas
   */
  static async getResumoGeral(
    dataInicio: Date,
    dataFim: Date
  ): Promise<ResumoGeral> {
    const [
      investimentos,
      gastosFornecedor,
      custosQuadros,
      lucrosQuadros,
      vendas,
      markupItens,
    ] = await Promise.all([
      this.getInvestimentosProdutos(dataInicio, dataFim),
      this.getGastosPorFornecedor(dataInicio, dataFim),
      this.getCustosQuadros(dataInicio, dataFim),
      this.getLucrosQuadros(dataInicio, dataFim),
      this.getVendas(dataInicio, dataFim),
      this.getMarkupItens(dataInicio, dataFim),
    ]);

    return {
      investimentos,
      gastosFornecedor,
      custosQuadros,
      lucrosQuadros,
      vendas,
      markupItens,
    };
  }
}

