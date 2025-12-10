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

export interface EvolucaoOrcamentosPorServico {
  data: string;
  [key: string]: string | number; // Tipo de serviço como chave, valor como número
}

export interface GastosFixos {
  totalMensal: number;
  totalAnual: number;
  porCategoria: Record<string, number>;
  evolucaoMensal: Array<{ mes: string; valor: number }>;
}

export interface ResumoGeral {
  investimentos: InvestimentosProdutos;
  gastosFornecedor: GastoFornecedor[];
  custosQuadros: CustosQuadros;
  lucrosQuadros: LucrosQuadros;
  vendas: VendasStats;
  markupItens: { porTipo: MarkupItem[] };
  evolucaoOrcamentosPorServico: EvolucaoOrcamentosPorServico[];
  gastosFixos: GastosFixos;
}

export interface DashboardMetrics {
  // Métricas principais
  vendasTotal: number; // Receita Bruta
  cpv: number; // Custo dos Produtos Vendidos
  margemBruta: number; // Lucro Bruto (Vendas Total - CPV)
  custosFixosTotal: number; // Total de custos fixos no período
  
  // Dados para gráficos
  investimentosPorMes: Array<{ mes: string; cpv: number }>; // CPV por mês
  gastosPorFornecedorTop10: Array<{ nomeFornecedor: string; valorGasto: number }>; // Top 10 fornecedores
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
   * Calcula evolução de orçamentos por tipo de serviço
   */
  static async getEvolucaoOrcamentosPorServico(
    dataInicio: Date,
    dataFim: Date
  ): Promise<EvolucaoOrcamentosPorServico[]> {
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: {
        items: {
          where: {
            tipo: 'SERVICO',
          },
        },
      },
    });

    // Agrupar por data e tipo de serviço
    const dadosPorData = new Map<string, Map<string, number>>();

    orcamentos.forEach((orcamento) => {
      const data = orcamento.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dadosPorData.has(data)) {
        dadosPorData.set(data, new Map());
      }

      const dadosDia = dadosPorData.get(data)!;

      orcamento.items.forEach((item) => {
        if (item.tipo === 'SERVICO') {
          const servicoNome = item.servicoNome || 'Serviço não especificado';
          const valor = item.subtotal || 0;

          dadosDia.set(servicoNome, (dadosDia.get(servicoNome) || 0) + valor);
        }
      });
    });

    // Converter para array
    const resultado: EvolucaoOrcamentosPorServico[] = [];

    // Obter todos os tipos de serviço únicos
    const tiposServico = new Set<string>();
    dadosPorData.forEach((dadosDia) => {
      dadosDia.forEach((_, servicoNome) => {
        tiposServico.add(servicoNome);
      });
    });

    // Criar array ordenado por data
    const datasOrdenadas = Array.from(dadosPorData.keys()).sort();

    datasOrdenadas.forEach((data) => {
      const dadosDia = dadosPorData.get(data)!;
      const item: EvolucaoOrcamentosPorServico = { data };

      tiposServico.forEach((servicoNome) => {
        item[servicoNome] = dadosDia.get(servicoNome) || 0;
      });

      resultado.push(item);
    });

    return resultado;
  }

  /**
   * Calcula gastos fixos no período
   */
  static async getGastosFixos(
    dataInicio: Date,
    dataFim: Date
  ): Promise<GastosFixos> {
    // Buscar despesas fixas ativas
    const despesas = await prisma.despesaFixa.findMany({
      where: { ativa: true },
      include: {
        pagamentos: {
          where: {
            dataPagamento: {
              gte: dataInicio,
              lte: dataFim,
            },
          },
        },
      },
    });

    // Calcular total mensal (soma de todas as despesas fixas)
    const totalMensal = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
    const totalAnual = totalMensal * 12;

    // Agrupar por categoria
    const porCategoria: Record<string, number> = {};
    despesas.forEach((d) => {
      const cat = d.categoria || 'Outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(d.valor);
    });

    // Calcular evolução mensal baseada nos pagamentos
    const evolucaoMensalMap = new Map<string, number>();

    despesas.forEach((despesa) => {
      despesa.pagamentos.forEach((pagamento) => {
        const mes = pagamento.dataPagamento.toISOString().substring(0, 7); // YYYY-MM
        evolucaoMensalMap.set(
          mes,
          (evolucaoMensalMap.get(mes) || 0) + Number(pagamento.valorPago)
        );
      });
    });

    // Se não houver pagamentos, usar valor mensal estimado
    if (evolucaoMensalMap.size === 0) {
      const mesAtual = new Date(dataInicio);
      while (mesAtual <= dataFim) {
        const mes = mesAtual.toISOString().substring(0, 7);
        evolucaoMensalMap.set(mes, totalMensal);
        mesAtual.setMonth(mesAtual.getMonth() + 1);
      }
    }

    const evolucaoMensal = Array.from(evolucaoMensalMap.entries())
      .map(([mes, valor]) => ({ mes, valor }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return {
      totalMensal,
      totalAnual,
      porCategoria,
      evolucaoMensal,
    };
  }

  /**
   * Calcula métricas do dashboard de BI conforme especificação
   * Retorna: Vendas Total, CPV, Margem Bruta, Custos Fixos e dados para gráficos
   */
  static async getDashboardMetrics(
    dataInicio: Date,
    dataFim: Date
  ): Promise<DashboardMetrics> {
    // 1. Vendas Total (Receita Bruta)
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: {
          not: 'Cancelada',
        },
      },
      select: {
        valorTotal: true,
        orcamentoId: true,
      },
    });

    const vendasTotal = vendas.reduce((sum, v) => sum + (v.valorTotal || 0), 0);

    // 2. CPV (Custo dos Produtos Vendidos)
    // Buscar itens de orçamento das vendas realizadas
    const orcamentoIds = vendas.map((v) => v.orcamentoId).filter(Boolean);
    
    let cpv = 0;
    if (orcamentoIds.length > 0) {
      const itensVendidos = await prisma.orcamentoItem.findMany({
        where: {
          orcamentoId: {
            in: orcamentoIds,
          },
          // Excluir serviços e custos extras do CPV
          tipo: {
            notIn: ['SERVICO', 'CUSTO_EXTRA'],
          },
        },
        select: {
          quantidade: true,
          custoUnit: true,
        },
      });

      cpv = itensVendidos.reduce(
        (sum, item) => sum + (item.quantidade || 0) * (item.custoUnit || 0),
        0
      );
    }

    // 3. Margem Bruta (Lucro Bruto)
    const margemBruta = vendasTotal - cpv;

    // 4. Custos Fixos Total
    const despesasFixas = await prisma.despesaFixa.findMany({
      where: {
        ativa: true,
      },
      include: {
        pagamentos: {
          where: {
            dataPagamento: {
              gte: dataInicio,
              lte: dataFim,
            },
          },
        },
      },
    });

    // Calcular custos fixos baseado nos pagamentos realizados no período
    let custosFixosTotal = 0;
    despesasFixas.forEach((despesa) => {
      if (despesa.pagamentos.length > 0) {
        // Se houver pagamentos no período, somar os valores pagos
        despesa.pagamentos.forEach((pagamento) => {
          custosFixosTotal += Number(pagamento.valorPago);
        });
      } else {
        // Se não houver pagamentos no período, usar o valor mensal da despesa
        // Calcular proporcionalmente aos meses no período
        const mesesNoPeriodo = this.calcularMesesNoPeriodo(dataInicio, dataFim);
        custosFixosTotal += Number(despesa.valor) * mesesNoPeriodo;
      }
    });

    // 5. Investimentos em Produtos por Mês (CPV por mês)
    // Buscar vendas novamente com dataVenda para agrupar por mês
    const vendasComData = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: {
          not: 'Cancelada',
        },
      },
      select: {
        dataVenda: true,
        orcamentoId: true,
      },
    });

    // Agrupar vendas por mês
    const vendasPorMesMap = new Map<string, string[]>(); // mes -> orcamentoIds
    
    vendasComData.forEach((venda) => {
      const mes = venda.dataVenda.toISOString().substring(0, 7); // YYYY-MM
      if (!vendasPorMesMap.has(mes)) {
        vendasPorMesMap.set(mes, []);
      }
      if (venda.orcamentoId) {
        vendasPorMesMap.get(mes)!.push(venda.orcamentoId);
      }
    });

    // Calcular CPV por mês de forma otimizada
    const cpvPorMesMap = new Map<string, number>();
    
    for (const [mes, orcamentoIdsMes] of vendasPorMesMap.entries()) {
      if (orcamentoIdsMes.length === 0) {
        cpvPorMesMap.set(mes, 0);
        continue;
      }

      // Buscar todos os itens dos orçamentos deste mês de uma vez
      const itens = await prisma.orcamentoItem.findMany({
        where: {
          orcamentoId: {
            in: orcamentoIdsMes,
          },
          tipo: {
            notIn: ['SERVICO', 'CUSTO_EXTRA'],
          },
        },
        select: {
          quantidade: true,
          custoUnit: true,
        },
      });

      const cpvMes = itens.reduce(
        (sum, item) => sum + (item.quantidade || 0) * (item.custoUnit || 0),
        0
      );

      cpvPorMesMap.set(mes, cpvMes);
    }

    const investimentosPorMes = Array.from(cpvPorMesMap.entries())
      .map(([mes, cpv]) => ({ mes, cpv }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // 6. Gastos por Fornecedor Top 10
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
        fornecedorNome: true,
        valorTotal: true,
      },
    });

    // Agrupar por fornecedor
    const gastosPorFornecedorMap = new Map<string, number>();
    compras.forEach((compra) => {
      const nome = compra.fornecedorNome || 'Fornecedor não identificado';
      gastosPorFornecedorMap.set(
        nome,
        (gastosPorFornecedorMap.get(nome) || 0) + (compra.valorTotal || 0)
      );
    });

    // Ordenar e pegar top 10
    const gastosPorFornecedorTop10 = Array.from(gastosPorFornecedorMap.entries())
      .map(([nomeFornecedor, valorGasto]) => ({ nomeFornecedor, valorGasto }))
      .sort((a, b) => b.valorGasto - a.valorGasto)
      .slice(0, 10);

    return {
      vendasTotal,
      cpv,
      margemBruta,
      custosFixosTotal,
      investimentosPorMes,
      gastosPorFornecedorTop10,
    };
  }

  /**
   * Calcula o número de meses no período (para cálculo proporcional de custos fixos)
   */
  private static calcularMesesNoPeriodo(dataInicio: Date, dataFim: Date): number {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    let meses = 0;
    const dataAtual = new Date(inicio);
    
    while (dataAtual <= fim) {
      meses++;
      dataAtual.setMonth(dataAtual.getMonth() + 1);
    }
    
    return meses;
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
      evolucaoOrcamentosPorServico,
      gastosFixos,
    ] = await Promise.all([
      this.getInvestimentosProdutos(dataInicio, dataFim),
      this.getGastosPorFornecedor(dataInicio, dataFim),
      this.getCustosQuadros(dataInicio, dataFim),
      this.getLucrosQuadros(dataInicio, dataFim),
      this.getVendas(dataInicio, dataFim),
      this.getMarkupItens(dataInicio, dataFim),
      this.getEvolucaoOrcamentosPorServico(dataInicio, dataFim),
      this.getGastosFixos(dataInicio, dataFim),
    ]);

    return {
      investimentos,
      gastosFornecedor,
      custosQuadros,
      lucrosQuadros,
      vendas,
      markupItens,
      evolucaoOrcamentosPorServico,
      gastosFixos,
    };
  }
}

