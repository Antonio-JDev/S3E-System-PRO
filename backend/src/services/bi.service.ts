import { prisma } from '../lib/prisma';

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
  materiais?: MaterialInfo[]; // Materiais comprados deste fornecedor
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


export interface OrcamentosPorTipoMensal {
  mes: string; // YYYY-MM
  quadros: number; // Valor total de orçamentos com QUADRO_PRONTO
  servicos: number; // Valor total de orçamentos com SERVICO
  quantidadeQuadros: number; // Quantidade de orçamentos com quadros
  quantidadeServicos: number; // Quantidade de orçamentos com serviços
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
  orcamentosPorTipoMensal: OrcamentosPorTipoMensal[]; // Comparação Quadros vs Serviços
  gastosFixos: GastosFixos;
}

export interface MaterialInfo {
  materialId: string;
  sku: string;
  nome: string;
  quantidade?: number;
  valorTotal?: number;
  custoMedio?: number;
}

export interface MaterialPorFornecedor {
  fornecedorNome: string;
  materiais: MaterialInfo[];
  totalGasto: number;
}

export interface MaterialMaisVendido {
  materialId: string;
  sku: string;
  nome: string;
  quantidadeVendida: number;
  valorTotalVendido: number;
  quantidadeOrcamentos: number;
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
  
  // Novos dados com informações de materiais
  materiaisPorFornecedor?: MaterialPorFornecedor[]; // Materiais agrupados por fornecedor
  materiaisMaisComprados?: MaterialInfo[]; // Top materiais mais comprados
  materiaisMaisVendidos?: MaterialMaisVendido[]; // Top materiais mais vendidos
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
   * Calcula gastos agrupados por fornecedor (inclui informações de materiais)
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
        items: {
          include: {
            material: {
              select: {
                id: true,
                sku: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    const gastosMap = new Map<string, { 
      total: number; 
      quantidade: number; 
      nome: string;
      materiais: Map<string, MaterialInfo>;
    }>();

    compras.forEach((compra) => {
      const fornecedorId = compra.fornecedorId || 'sem-fornecedor';
      const fornecedorNome = compra.fornecedor?.nome || compra.fornecedorNome || 'Fornecedor não identificado';
      const valor = compra.valorTotal || 0;

      const atual = gastosMap.get(fornecedorId) || { 
        total: 0, 
        quantidade: 0, 
        nome: fornecedorNome,
        materiais: new Map<string, MaterialInfo>(),
      };
      
      // Agregar materiais
      compra.items.forEach((item) => {
        if (item.materialId && item.material) {
          const materialId = item.material.id;
          let materialInfo = atual.materiais.get(materialId);
          
          if (!materialInfo) {
            materialInfo = {
              materialId: item.material.id,
              sku: item.material.sku || 'N/A',
              nome: item.material.nome || item.nomeProduto || 'Material não identificado',
              quantidade: 0,
              valorTotal: 0,
            };
          }

          atual.materiais.set(materialId, {
            ...materialInfo,
            quantidade: (materialInfo.quantidade || 0) + (item.quantidade || 0),
            valorTotal: (materialInfo.valorTotal || 0) + ((item.valorUnit || 0) * (item.quantidade || 0)),
          });
        }
      });

      gastosMap.set(fornecedorId, {
        total: atual.total + valor,
        quantidade: atual.quantidade + 1,
        nome: fornecedorNome,
        materiais: atual.materiais,
      });
    });

    return Array.from(gastosMap.entries()).map(([fornecedorId, dados]) => ({
      fornecedorId,
      fornecedorNome: dados.nome,
      total: dados.total,
      quantidadeCompras: dados.quantidade,
      materiais: Array.from(dados.materiais.values())
        .map((m) => ({
          ...m,
          custoMedio: (m.quantidade || 0) > 0 ? (m.valorTotal || 0) / (m.quantidade || 0) : 0,
        }))
        .sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0)),
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
            material: {
              select: {
                id: true,
                sku: true,
                nome: true,
              },
            },
            kit: {
              include: {
                items: {
                  include: {
                    material: {
                      select: {
                        id: true,
                        sku: true,
                        nome: true,
                      },
                    },
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
              // Buscar preço do material se disponível
              if (kitItem.materialId) {
                const material = await prisma.material.findUnique({
                  where: { id: kitItem.materialId },
                  select: { preco: true },
                });
                const materialCusto = material?.preco || 0;
                custoKit += materialCusto * kitItem.quantidade;
              }
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
   * Retorna comparação de orçamentos por tipo (Quadros vs Serviços) agrupado por mês
   */
  static async getOrcamentosPorTipoMensal(
    dataInicio: Date,
    dataFim: Date
  ): Promise<OrcamentosPorTipoMensal[]> {
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: {
        items: {
          select: {
            tipo: true,
            subtotal: true,
            vendaDiretaFornecedor: true,
          },
        },
      },
    });

    // Agrupar por mês
    const dadosPorMes = new Map<string, {
      quadros: number;
      servicos: number;
      quantidadeQuadros: number;
      quantidadeServicos: number;
      orcamentosComQuadro: Set<string>;
      orcamentosComServico: Set<string>;
    }>();

    orcamentos.forEach((orcamento) => {
      const mes = orcamento.createdAt.toISOString().substring(0, 7); // YYYY-MM

      let mesData = dadosPorMes.get(mes);
      if (!mesData) {
        mesData = {
          quadros: 0,
          servicos: 0,
          quantidadeQuadros: 0,
          quantidadeServicos: 0,
          orcamentosComQuadro: new Set<string>(),
          orcamentosComServico: new Set<string>(),
        };
        dadosPorMes.set(mes, mesData);
      }

      // Verificar itens do orçamento
      let temQuadro = false;
      let temServico = false;

      orcamento.items.forEach((item) => {
        if ((item as any).vendaDiretaFornecedor) return;
        if (item.tipo === 'QUADRO_PRONTO') {
          mesData.quadros += item.subtotal || 0;
          temQuadro = true;
        } else if (item.tipo === 'SERVICO') {
          mesData.servicos += item.subtotal || 0;
          temServico = true;
        }
      });

      // Contar orçamentos (não itens)
      if (temQuadro) {
        mesData.orcamentosComQuadro.add(orcamento.id);
      }
      if (temServico) {
        mesData.orcamentosComServico.add(orcamento.id);
      }
    });

    // Converter para array e calcular quantidades
    const resultado = Array.from(dadosPorMes.entries())
      .map(([mes, dados]) => ({
        mes,
        quadros: dados.quadros,
        servicos: dados.servicos,
        quantidadeQuadros: dados.orcamentosComQuadro.size,
        quantidadeServicos: dados.orcamentosComServico.size,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return resultado;
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
        if ((item as any).vendaDiretaFornecedor) return;
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
        include: {
          material: {
            select: {
              id: true,
              sku: true,
              nome: true,
            },
          },
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
        include: {
          material: {
            select: {
              id: true,
              sku: true,
              nome: true,
            },
          },
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

    // Buscar dados de materiais (paralelo para otimizar)
    const [materiaisMaisComprados, materiaisMaisVendidos, materiaisPorFornecedor] = await Promise.all([
      this.getMateriaisMaisComprados(dataInicio, dataFim, 10),
      this.getMateriaisMaisVendidos(dataInicio, dataFim, 10),
      this.getMateriaisPorFornecedor(dataInicio, dataFim),
    ]);

    return {
      vendasTotal,
      cpv,
      margemBruta,
      custosFixosTotal,
      investimentosPorMes,
      gastosPorFornecedorTop10,
      materiaisMaisComprados,
      materiaisMaisVendidos,
      materiaisPorFornecedor,
    };
  }

  /**
   * Retorna materiais mais comprados no período com informações de SKU e nome
   */
  static async getMateriaisMaisComprados(
    dataInicio: Date,
    dataFim: Date,
    limit: number = 10
  ): Promise<MaterialInfo[]> {
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
        items: {
          include: {
            material: {
              select: {
                id: true,
                sku: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    // Agregar por material
    const materiaisMap = new Map<string, {
      materialId: string;
      sku: string;
      nome: string;
      quantidade: number;
      valorTotal: number;
    }>();

    compras.forEach((compra) => {
      compra.items.forEach((item) => {
        if (item.materialId && item.material) {
          const materialId = item.material.id;
          const materialInfo = materiaisMap.get(materialId) || {
            materialId: item.material.id,
            sku: item.material.sku || 'N/A',
            nome: item.material.nome || item.nomeProduto || 'Material não identificado',
            quantidade: 0,
            valorTotal: 0,
          };

          materiaisMap.set(materialId, {
            ...materialInfo,
            quantidade: materialInfo.quantidade + (item.quantidade || 0),
            valorTotal: materialInfo.valorTotal + ((item.valorUnit || 0) * (item.quantidade || 0)),
          });
        }
      });
    });

    // Converter para array, calcular custo médio e ordenar
    const materiais = Array.from(materiaisMap.values())
      .map((m) => ({
        ...m,
        custoMedio: m.quantidade > 0 ? m.valorTotal / m.quantidade : 0,
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, limit);

    return materiais;
  }

  /**
   * Retorna materiais mais vendidos no período com informações de SKU e nome
   */
  static async getMateriaisMaisVendidos(
    dataInicio: Date,
    dataFim: Date,
    limit: number = 10
  ): Promise<MaterialMaisVendido[]> {
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
      include: {
        orcamento: {
          include: {
            items: {
              where: {
                tipo: 'MATERIAL',
                materialId: {
                  not: null,
                },
              },
              include: {
                material: {
                  select: {
                    id: true,
                    sku: true,
                    nome: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Agregar por material
    const materiaisMap = new Map<string, {
      materialId: string;
      sku: string;
      nome: string;
      quantidadeVendida: number;
      valorTotalVendido: number;
      orcamentosIds: Set<string>;
    }>();

    vendas.forEach((venda) => {
      if (venda.orcamento?.items) {
        venda.orcamento.items.forEach((item) => {
          if (item.materialId && item.material) {
            const materialId = item.material.id;
            const materialInfo = materiaisMap.get(materialId) || {
              materialId: item.material.id,
              sku: item.material.sku || 'N/A',
              nome: item.material.nome || 'Material não identificado',
              quantidadeVendida: 0,
              valorTotalVendido: 0,
              orcamentosIds: new Set<string>(),
            };

            const orcamentoId = venda.orcamentoId || '';
            materialInfo.orcamentosIds.add(orcamentoId);

            materiaisMap.set(materialId, {
              ...materialInfo,
              quantidadeVendida: materialInfo.quantidadeVendida + (item.quantidade || 0),
              valorTotalVendido: materialInfo.valorTotalVendido + ((item.precoUnit || 0) * (item.quantidade || 0)),
            });
          }
        });
      }
    });

    // Converter para array e ordenar
    const materiais = Array.from(materiaisMap.values())
      .map((m) => ({
        materialId: m.materialId,
        sku: m.sku,
        nome: m.nome,
        quantidadeVendida: m.quantidadeVendida,
        valorTotalVendido: m.valorTotalVendido,
        quantidadeOrcamentos: m.orcamentosIds.size,
      }))
      .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida)
      .slice(0, limit);

    return materiais;
  }

  /**
   * Retorna materiais agrupados por fornecedor com informações de SKU e nome
   */
  static async getMateriaisPorFornecedor(
    dataInicio: Date,
    dataFim: Date
  ): Promise<MaterialPorFornecedor[]> {
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
        fornecedor: {
          select: {
            nome: true,
          },
        },
        items: {
          include: {
            material: {
              select: {
                id: true,
                sku: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    // Agregar por fornecedor
    const fornecedoresMap = new Map<string, {
      fornecedorNome: string;
      materiais: Map<string, MaterialInfo>;
      totalGasto: number;
    }>();

    compras.forEach((compra) => {
      const fornecedorNome = compra.fornecedor?.nome || compra.fornecedorNome || 'Fornecedor não identificado';
      
      let fornecedor = fornecedoresMap.get(fornecedorNome);
      if (!fornecedor) {
        fornecedor = {
          fornecedorNome,
          materiais: new Map<string, MaterialInfo>(),
          totalGasto: 0,
        };
        fornecedoresMap.set(fornecedorNome, fornecedor);
      }

      fornecedor.totalGasto += compra.valorTotal || 0;

      compra.items.forEach((item) => {
        if (item.materialId && item.material) {
          const materialId = item.material.id;
          let materialInfo = fornecedor.materiais.get(materialId);
          
          if (!materialInfo) {
            materialInfo = {
              materialId: item.material.id,
              sku: item.material.sku || 'N/A',
              nome: item.material.nome || item.nomeProduto || 'Material não identificado',
              quantidade: 0,
              valorTotal: 0,
            };
          }

          fornecedor.materiais.set(materialId, {
            ...materialInfo,
            quantidade: (materialInfo.quantidade || 0) + (item.quantidade || 0),
            valorTotal: (materialInfo.valorTotal || 0) + ((item.valorUnit || 0) * (item.quantidade || 0)),
          });
        }
      });
    });

    // Converter para array e calcular custo médio
    const resultado = Array.from(fornecedoresMap.values())
      .map((fornecedor) => ({
        fornecedorNome: fornecedor.fornecedorNome,
        materiais: Array.from(fornecedor.materiais.values())
          .map((m) => ({
            ...m,
            custoMedio: (m.quantidade || 0) > 0 ? (m.valorTotal || 0) / (m.quantidade || 0) : 0,
          }))
          .sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0)),
        totalGasto: fornecedor.totalGasto,
      }))
      .sort((a, b) => b.totalGasto - a.totalGasto);

    return resultado;
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
   * Serviços mais rentáveis (maiores lucros) nos pedidos de venda
   */
  static async getServicosRentaveis(
    dataInicio: Date,
    dataFim: Date
  ): Promise<Array<{
    servicoNome: string;
    classificacao: string;
    receita: number;
    custo: number;
    lucro: number;
    markup: number;
    quantidade: number;
  }>> {
    // Buscar vendas realizadas no período
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
      include: {
        orcamento: {
          include: {
            items: {
              where: {
                tipo: 'SERVICO',
              },
            },
          },
        },
      },
    });

    // Mapear serviços para suas classificações
    const servicos = await prisma.servico.findMany({
      select: {
        id: true,
        nome: true,
        tipoServico: true,
        custo: true,
      },
    });

    const servicoMap = new Map<string, { tipoServico: string; custo: number | null }>();
    servicos.forEach((s) => {
      servicoMap.set(s.nome, {
        tipoServico: s.tipoServico || 'MAO_DE_OBRA',
        custo: s.custo || null,
      });
    });

    const classificacaoLabels: Record<string, string> = {
      MAO_DE_OBRA: 'Mão de Obra',
      ENGENHARIA: 'Engenharia',
      PROJETOS: 'Projetos',
      ADMINISTRATIVO: 'Administrativo',
      MONTAGEM: 'Montagem',
    };

    // Agrupar por serviço
    const servicosMap = new Map<string, {
      receita: number;
      custo: number;
      quantidade: number;
      classificacao: string;
    }>();

    vendas.forEach((venda) => {
      if (!venda.orcamento?.items) return;

      venda.orcamento.items.forEach((item) => {
        if (item.tipo === 'SERVICO' && item.servicoNome) {
          const servicoNome = item.servicoNome;
          const servicoInfo = servicoMap.get(servicoNome) || {
            tipoServico: 'MAO_DE_OBRA',
            custo: null,
          };
          const classificacao = classificacaoLabels[servicoInfo.tipoServico] || 'Mão de Obra';

          const receita = item.precoUnit || 0;
          const custo = servicoInfo.custo || item.custoUnit || 0;

          if (!servicosMap.has(servicoNome)) {
            servicosMap.set(servicoNome, {
              receita: 0,
              custo: 0,
              quantidade: 0,
              classificacao,
            });
          }

          const stats = servicosMap.get(servicoNome)!;
          stats.receita += receita;
          stats.custo += custo;
          stats.quantidade += 1;
        }
      });
    });

    // Converter para array e calcular lucro e markup
    const resultado = Array.from(servicosMap.entries()).map(([servicoNome, stats]) => {
      const lucro = stats.receita - stats.custo;
      const markup = stats.custo > 0 ? (lucro / stats.custo) * 100 : 0;

      return {
        servicoNome,
        classificacao: stats.classificacao,
        receita: stats.receita,
        custo: stats.custo,
        lucro,
        markup,
        quantidade: stats.quantidade,
      };
    });

    // Ordenar por lucro (maior para menor)
    resultado.sort((a, b) => b.lucro - a.lucro);

    return resultado;
  }

  /**
   * Estatísticas de orçamentos por status (Aprovado, Pendente, Expirado, Declinado)
   */
  static async getEstatisticasOrcamentosPorStatus(
    dataInicio: Date,
    dataFim: Date
  ): Promise<{
    aprovados: { quantidade: number; valorTotal: number };
    pendentes: { quantidade: number; valorTotal: number };
    expirados: { quantidade: number; valorTotal: number };
    declinados: { quantidade: number; valorTotal: number };
    total: { quantidade: number; valorTotal: number };
    porStatus: Array<{ status: string; quantidade: number; valorTotal: number; cor: string }>;
  }> {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    // Buscar todos os orçamentos no período
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      select: {
        id: true,
        status: true,
        precoVenda: true,
        validade: true,
      },
    });

    let aprovados = { quantidade: 0, valorTotal: 0 };
    let pendentes = { quantidade: 0, valorTotal: 0 };
    let expirados = { quantidade: 0, valorTotal: 0 };
    let declinados = { quantidade: 0, valorTotal: 0 };

    orcamentos.forEach((orcamento) => {
      const valor = orcamento.precoVenda || 0;
      const status = orcamento.status || 'Pendente';
      const validade = orcamento.validade;

      // Verificar se está expirado (validade passou e não está aprovado)
      const estaExpirado = validade && validade < hoje && status !== 'Aprovado';

      if (status === 'Aprovado') {
        aprovados.quantidade++;
        aprovados.valorTotal += valor;
      } else if (estaExpirado) {
        expirados.quantidade++;
        expirados.valorTotal += valor;
      } else if (status === 'Declinado' || status === 'Recusado') {
        declinados.quantidade++;
        declinados.valorTotal += valor;
      } else {
        // Pendente, Rascunho, Enviado ao Cliente
        pendentes.quantidade++;
        pendentes.valorTotal += valor;
      }
    });

    const total = {
      quantidade: orcamentos.length,
      valorTotal: orcamentos.reduce((sum, o) => sum + (o.precoVenda || 0), 0),
    };

    const porStatus = [
      {
        status: 'Aprovados',
        quantidade: aprovados.quantidade,
        valorTotal: aprovados.valorTotal,
        cor: '#10B981', // verde
      },
      {
        status: 'Pendentes',
        quantidade: pendentes.quantidade,
        valorTotal: pendentes.valorTotal,
        cor: '#F59E0B', // amarelo
      },
      {
        status: 'Expirados',
        quantidade: expirados.quantidade,
        valorTotal: expirados.valorTotal,
        cor: '#EF4444', // vermelho
      },
      {
        status: 'Declinados',
        quantidade: declinados.quantidade,
        valorTotal: declinados.valorTotal,
        cor: '#1F2937', // preto
      },
    ];

    return {
      aprovados,
      pendentes,
      expirados,
      declinados,
      total,
      porStatus,
    };
  }

  /**
   * Evolução de orçamentos por tipo de serviço com classificação
   * (Mão de obra, Engenharia/projetos, Administrativo, Montagem)
   */
  static async getEvolucaoOrcamentosPorTipoServicoClassificado(
    dataInicio: Date,
    dataFim: Date
  ): Promise<{
    porClassificacao: Array<{
      classificacao: string;
      quantidade: number;
      valorTotal: number;
      taxaAprovacao: number;
      servicos: Array<{ nome: string; quantidade: number; valorTotal: number }>;
    }>;
    evolucaoMensal: Array<{
      mes: string;
      maoDeObra: number;
      engenharia: number;
      administrativo: number;
      montagem: number;
    }>;
  }> {
    // Buscar orçamentos com itens de serviço
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

    // Mapear serviços para suas classificações
    const servicos = await prisma.servico.findMany({
      select: {
        id: true,
        nome: true,
        tipoServico: true,
      },
    });

    const servicoMap = new Map<string, string>();
    servicos.forEach((s) => {
      servicoMap.set(s.nome, s.tipoServico || 'MAO_DE_OBRA');
    });

    // Classificações disponíveis
    const classificacoes = ['MAO_DE_OBRA', 'ENGENHARIA', 'PROJETOS', 'ADMINISTRATIVO', 'MONTAGEM'];
    const classificacaoLabels: Record<string, string> = {
      MAO_DE_OBRA: 'Mão de Obra',
      ENGENHARIA: 'Engenharia',
      PROJETOS: 'Projetos',
      ADMINISTRATIVO: 'Administrativo',
      MONTAGEM: 'Montagem',
    };

    // Agrupar por classificação
    const dadosPorClassificacao = new Map<
      string,
      {
        servicos: Map<string, { quantidade: number; valorTotal: number }>;
        quantidadeOrcamentos: Set<string>;
        valorTotal: number;
        aprovados: Set<string>;
      }
    >();

    classificacoes.forEach((classif) => {
      dadosPorClassificacao.set(classif, {
        servicos: new Map(),
        quantidadeOrcamentos: new Set(),
        valorTotal: 0,
        aprovados: new Set(),
      });
    });

    // Processar orçamentos
    orcamentos.forEach((orcamento) => {
      const isAprovado = orcamento.status === 'Aprovado';

      orcamento.items.forEach((item) => {
        if ((item as any).vendaDiretaFornecedor) return;
        if (item.tipo === 'SERVICO' && item.servicoNome) {
          const servicoNome = item.servicoNome;
          const classificacao = servicoMap.get(servicoNome) || 'MAO_DE_OBRA';
          const valor = item.subtotal || 0;

          const dados = dadosPorClassificacao.get(classificacao);
          if (dados) {
            dados.quantidadeOrcamentos.add(orcamento.id);
            dados.valorTotal += valor;

            if (isAprovado) {
              dados.aprovados.add(orcamento.id);
            }

            // Agregar por serviço
            const servicoDados = dados.servicos.get(servicoNome) || {
              quantidade: 0,
              valorTotal: 0,
            };
            dados.servicos.set(servicoNome, {
              quantidade: servicoDados.quantidade + 1,
              valorTotal: servicoDados.valorTotal + valor,
            });
          }
        }
      });
    });

    // Converter para array
    const porClassificacao = Array.from(dadosPorClassificacao.entries())
      .map(([classificacao, dados]) => {
        const totalOrcamentos = dados.quantidadeOrcamentos.size;
        const aprovados = dados.aprovados.size;
        const taxaAprovacao = totalOrcamentos > 0 ? (aprovados / totalOrcamentos) * 100 : 0;

        return {
          classificacao: classificacaoLabels[classificacao] || classificacao,
          quantidade: totalOrcamentos,
          valorTotal: dados.valorTotal,
          taxaAprovacao,
          servicos: Array.from(dados.servicos.entries())
            .map(([nome, dadosServico]) => ({
              nome,
              quantidade: dadosServico.quantidade,
              valorTotal: dadosServico.valorTotal,
            }))
            .sort((a, b) => b.valorTotal - a.valorTotal),
        };
      })
      .filter((item) => item.quantidade > 0);

    // Evolução mensal
    const evolucaoMensalMap = new Map<string, {
      maoDeObra: number;
      engenharia: number;
      administrativo: number;
      montagem: number;
    }>();

    orcamentos.forEach((orcamento) => {
      const mes = orcamento.createdAt.toISOString().substring(0, 7); // YYYY-MM

      let mesData = evolucaoMensalMap.get(mes);
      if (!mesData) {
        mesData = {
          maoDeObra: 0,
          engenharia: 0,
          administrativo: 0,
          montagem: 0,
        };
        evolucaoMensalMap.set(mes, mesData);
      }

      orcamento.items.forEach((item) => {
        if (item.tipo === 'SERVICO' && item.servicoNome) {
          const servicoNome = item.servicoNome;
          const classificacao = servicoMap.get(servicoNome) || 'MAO_DE_OBRA';
          const valor = item.subtotal || 0;

          if (classificacao === 'MAO_DE_OBRA') {
            mesData.maoDeObra += valor;
          } else if (classificacao === 'ENGENHARIA' || classificacao === 'PROJETOS') {
            mesData.engenharia += valor;
          } else if (classificacao === 'ADMINISTRATIVO') {
            mesData.administrativo += valor;
          } else if (classificacao === 'MONTAGEM') {
            mesData.montagem += valor;
          }
        }
      });
    });

    const evolucaoMensal = Array.from(evolucaoMensalMap.entries())
      .map(([mes, dados]) => ({
        mes,
        ...dados,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return {
      porClassificacao,
      evolucaoMensal,
    };
  }

  /**
   * Estatísticas de markup de vendas por tipo de serviço e período
   * Retorna DRE detalhado por serviço (mês, semana, semestre, ano)
   */
  static async getMarkupVendasPorTipoServico(
    dataInicio: Date,
    dataFim: Date,
    periodo: 'mes' | 'semana' | 'semestre' | 'ano' = 'mes'
  ): Promise<{
    periodo: string;
    dados: Array<{
      periodo: string;
      classificacao: string;
      servicoNome: string;
      receita: number;
      custo: number;
      lucro: number;
      markup: number;
      quantidade: number;
    }>;
    resumoPorClassificacao: Array<{
      classificacao: string;
      receita: number;
      custo: number;
      lucro: number;
      markup: number;
      quantidade: number;
    }>;
  }> {
    // Buscar vendas realizadas no período
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
      include: {
        orcamento: {
          include: {
            items: {
              where: {
                tipo: 'SERVICO',
              },
            },
          },
        },
      },
    });

    // Mapear serviços para suas classificações
    const servicos = await prisma.servico.findMany({
      select: {
        id: true,
        nome: true,
        tipoServico: true,
        custo: true,
      },
    });

    const servicoMap = new Map<string, { tipoServico: string; custo: number | null }>();
    servicos.forEach((s) => {
      servicoMap.set(s.nome, {
        tipoServico: s.tipoServico || 'MAO_DE_OBRA',
        custo: s.custo || null,
      });
    });

    const classificacaoLabels: Record<string, string> = {
      MAO_DE_OBRA: 'Mão de Obra',
      ENGENHARIA: 'Engenharia',
      PROJETOS: 'Projetos',
      ADMINISTRATIVO: 'Administrativo',
      MONTAGEM: 'Montagem',
    };

    // Agrupar por período e serviço
    const dadosMap = new Map<string, Map<string, {
      receita: number;
      custo: number;
      quantidade: number;
    }>>();

    vendas.forEach((venda) => {
      if (!venda.orcamento?.items) return;

      venda.orcamento.items.forEach((item) => {
        if ((item as any).vendaDiretaFornecedor) return;
        if (item.tipo === 'SERVICO' && item.servicoNome) {
          const servicoNome = item.servicoNome;
          const servicoInfo = servicoMap.get(servicoNome) || {
            tipoServico: 'MAO_DE_OBRA',
            custo: null,
          };
          const classificacao = servicoInfo.tipoServico;

          // Determinar período baseado no parâmetro
          let periodoKey: string;
          const dataVenda = venda.dataVenda;

          if (periodo === 'mes') {
            periodoKey = dataVenda.toISOString().substring(0, 7); // YYYY-MM
          } else if (periodo === 'semana') {
            const semana = this.getSemanaAno(dataVenda);
            periodoKey = `${dataVenda.getFullYear()}-S${semana}`;
          } else if (periodo === 'semestre') {
            const semestre = dataVenda.getMonth() < 6 ? 1 : 2;
            periodoKey = `${dataVenda.getFullYear()}-S${semestre}`;
          } else {
            periodoKey = dataVenda.getFullYear().toString();
          }

          const chaveServico = `${classificacao}::${servicoNome}`;

          if (!dadosMap.has(periodoKey)) {
            dadosMap.set(periodoKey, new Map());
          }

          const periodoMap = dadosMap.get(periodoKey)!;
          const servicoDados = periodoMap.get(chaveServico) || {
            receita: 0,
            custo: 0,
            quantidade: 0,
          };

          const receita = item.subtotal || 0;
          const custoUnit = servicoInfo.custo || item.custoUnit || 0;
          const custo = custoUnit * (item.quantidade || 0);

          periodoMap.set(chaveServico, {
            receita: servicoDados.receita + receita,
            custo: servicoDados.custo + custo,
            quantidade: servicoDados.quantidade + (item.quantidade || 0),
          });
        }
      });
    });

    // Converter para array
    const dados: Array<{
      periodo: string;
      classificacao: string;
      servicoNome: string;
      receita: number;
      custo: number;
      lucro: number;
      markup: number;
      quantidade: number;
    }> = [];

    dadosMap.forEach((periodoMap, periodoKey) => {
      periodoMap.forEach((servicoDados, chaveServico) => {
        const [classificacao, servicoNome] = chaveServico.split('::');
        const lucro = servicoDados.receita - servicoDados.custo;
        const markup = servicoDados.custo > 0
          ? (lucro / servicoDados.custo) * 100
          : 0;

        dados.push({
          periodo: periodoKey,
          classificacao: classificacaoLabels[classificacao] || classificacao,
          servicoNome,
          receita: servicoDados.receita,
          custo: servicoDados.custo,
          lucro,
          markup,
          quantidade: servicoDados.quantidade,
        });
      });
    });

    // Resumo por classificação
    const resumoMap = new Map<string, {
      receita: number;
      custo: number;
      quantidade: number;
    }>();

    dados.forEach((item) => {
      const resumo = resumoMap.get(item.classificacao) || {
        receita: 0,
        custo: 0,
        quantidade: 0,
      };

      resumoMap.set(item.classificacao, {
        receita: resumo.receita + item.receita,
        custo: resumo.custo + item.custo,
        quantidade: resumo.quantidade + item.quantidade,
      });
    });

    const resumoPorClassificacao = Array.from(resumoMap.entries())
      .map(([classificacao, dados]) => {
        const lucro = dados.receita - dados.custo;
        const markup = dados.custo > 0 ? (lucro / dados.custo) * 100 : 0;

        return {
          classificacao,
          receita: dados.receita,
          custo: dados.custo,
          lucro,
          markup,
          quantidade: dados.quantidade,
        };
      })
      .sort((a, b) => b.receita - a.receita);

    return {
      periodo,
      dados: dados.sort((a, b) => {
        if (a.periodo !== b.periodo) {
          return a.periodo.localeCompare(b.periodo);
        }
        return b.receita - a.receita;
      }),
      resumoPorClassificacao,
    };
  }

  private static readonly CLASSIFICACAO_COMPRA_LABELS: Record<string, string> = {
    COMPOSICAO_ESTOQUE: 'Material / composição de estoque',
    FERRAMENTAS: 'Ferramentas',
    RECURSOS_HUMANOS: 'Recursos humanos',
    LIMPEZA_INSUMOS: 'Limpeza e insumos',
    ESCRITORIO_INSUMOS: 'Escritório e insumos',
    DESPESAS_VARIADAS: 'Despesas variadas',
  };

  /**
   * Receita de orçamentos aprovados (período) vs compras agregadas por classificação da NF-e
   */
  static async getVendasEComprasPorClassificacao(
    dataInicio: Date,
    dataFim: Date
  ): Promise<{
    vendasOrcamentosAprovados: { valorTotal: number; quantidadeOrcamentos: number };
    comprasPorClassificacao: Array<{
      classificacao: string;
      nomeExibicao: string;
      valorTotal: number;
      quantidadeCompras: number;
    }>;
  }> {
    const aprovados = await prisma.orcamento.findMany({
      where: {
        status: 'Aprovado',
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      select: {
        precoVenda: true,
      },
    });

    const vendasOrcamentosAprovados = {
      valorTotal: aprovados.reduce((s, o) => s + (o.precoVenda || 0), 0),
      quantidadeOrcamentos: aprovados.length,
    };

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
        classificacao: true,
        valorTotal: true,
      },
    });

    const map = new Map<string, { valorTotal: number; quantidadeCompras: number }>();
    compras.forEach((c) => {
      const key = c.classificacao || 'COMPOSICAO_ESTOQUE';
      const cur = map.get(key) || { valorTotal: 0, quantidadeCompras: 0 };
      map.set(key, {
        valorTotal: cur.valorTotal + (c.valorTotal || 0),
        quantidadeCompras: cur.quantidadeCompras + 1,
      });
    });

    const comprasPorClassificacao = Array.from(map.entries())
      .map(([classificacao, v]) => ({
        classificacao,
        nomeExibicao: this.CLASSIFICACAO_COMPRA_LABELS[classificacao] || classificacao,
        valorTotal: v.valorTotal,
        quantidadeCompras: v.quantidadeCompras,
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal);

    return {
      vendasOrcamentosAprovados,
      comprasPorClassificacao,
    };
  }

  /**
   * Calcula o número da semana do ano (1-52/53)
   */
  private static getSemanaAno(data: Date): number {
    const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
    const diaSemana = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
    const anoInicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - anoInicio.getTime()) / 86400000 + 1) / 7);
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
      orcamentosPorTipoMensal,
      gastosFixos,
    ] = await Promise.all([
      this.getInvestimentosProdutos(dataInicio, dataFim),
      this.getGastosPorFornecedor(dataInicio, dataFim),
      this.getCustosQuadros(dataInicio, dataFim),
      this.getLucrosQuadros(dataInicio, dataFim),
      this.getVendas(dataInicio, dataFim),
      this.getMarkupItens(dataInicio, dataFim),
      this.getEvolucaoOrcamentosPorServico(dataInicio, dataFim),
      this.getOrcamentosPorTipoMensal(dataInicio, dataFim),
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
      orcamentosPorTipoMensal,
      gastosFixos,
    };
  }
}

