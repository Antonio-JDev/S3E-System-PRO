import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Resumo Administrativo - Métricas de Lucro e Evolução Financeira
 * 
 * Este serviço fornece:
 * - Lucro mensal por venda de material
 * - Lucro por venda de serviço
 * - Resumo de arrecadação do BDI por cada orçamento
 * - Resumo do lucro por mão de obra (serviço)
 * - Métricas mensais, 6 meses e 1 ano
 * - Evolução financeira da empresa
 */

export interface LucroPorMaterial {
  mes: string; // YYYY-MM
  lucroTotal: number;
  quantidadeVendas: number;
  valorVendido: number;
  custoTotal: number;
  margemPercentual: number;
}

export interface LucroPorServico {
  mes: string; // YYYY-MM
  lucroTotal: number;
  quantidadeVendas: number;
  valorVendido: number;
  custoTotal: number;
  margemPercentual: number;
}

export interface BDIPorOrcamento {
  orcamentoId: string;
  numeroSequencial: number;
  clienteNome: string;
  dataVenda: Date;
  valorTotal: number;
  bdiPercentual: number;
  valorBDI: number; // Valor arrecadado do BDI
  custoTotal: number;
  lucroTotal: number;
}

export interface LucroMaoDeObra {
  mes: string; // YYYY-MM
  lucroTotal: number;
  quantidadeServicos: number;
  valorVendido: number;
  custoTotal: number;
  margemPercentual: number;
}

export interface ResumoMensal {
  mes: string; // YYYY-MM
  lucroMateriais: number;
  lucroServicos: number;
  lucroMaoDeObra: number;
  totalBDI: number;
  receitaTotal: number;
  custoTotal: number;
  lucroLiquido: number;
  margemPercentual: number;
}

export interface EvolucaoFinanceira {
  periodo: string; // 'mensal' | '6meses' | 'anual'
  dados: ResumoMensal[];
  totalReceita: number;
  totalCusto: number;
  totalLucro: number;
  margemMedia: number;
}

export interface ResumoAdministrativoCompleto {
  lucroPorMaterial: LucroPorMaterial[];
  lucroPorServico: LucroPorServico[];
  bdiPorOrcamento: BDIPorOrcamento[];
  lucroMaoDeObra: LucroMaoDeObra[];
  resumoMensal: ResumoMensal[];
  evolucaoFinanceira: {
    mensal: EvolucaoFinanceira;
    semestral: EvolucaoFinanceira;
    anual: EvolucaoFinanceira;
  };
}

export class ResumoAdministrativoService {
  /**
   * Calcula lucro por venda de materiais (mensal)
   */
  static async getLucroPorMaterial(
    dataInicio: Date,
    dataFim: Date
  ): Promise<LucroPorMaterial[]> {
    // Buscar vendas realizadas no período
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: { not: 'Cancelada' },
      },
      include: {
        orcamento: {
          include: {
            items: {
              where: {
                tipo: 'MATERIAL',
              },
            },
          },
        },
      },
    });

    // Agrupar por mês
    const dadosPorMes = new Map<string, {
      lucroTotal: number;
      quantidadeVendas: number;
      valorVendido: number;
      custoTotal: number;
    }>();

    vendas.forEach((venda) => {
      const mes = venda.dataVenda.toISOString().substring(0, 7); // YYYY-MM
      
      // Calcular lucro dos materiais desta venda
      let lucroVenda = 0;
      let valorVendidoVenda = 0;
      let custoVenda = 0;

      venda.orcamento.items.forEach((item) => {
        if (item.tipo === 'MATERIAL') {
          const valorVendido = item.precoUnit * item.quantidade;
          const custo = item.custoUnit * item.quantidade;
          const lucro = valorVendido - custo;

          valorVendidoVenda += valorVendido;
          custoVenda += custo;
          lucroVenda += lucro;
        }
      });

      if (lucroVenda > 0 || valorVendidoVenda > 0) {
        const mesData = dadosPorMes.get(mes) || {
          lucroTotal: 0,
          quantidadeVendas: 0,
          valorVendido: 0,
          custoTotal: 0,
        };

        mesData.lucroTotal += lucroVenda;
        mesData.valorVendido += valorVendidoVenda;
        mesData.custoTotal += custoVenda;
        mesData.quantidadeVendas += 1;

        dadosPorMes.set(mes, mesData);
      }
    });

    // Converter para array e calcular margem
    return Array.from(dadosPorMes.entries())
      .map(([mes, dados]) => ({
        mes,
        lucroTotal: dados.lucroTotal,
        quantidadeVendas: dados.quantidadeVendas,
        valorVendido: dados.valorVendido,
        custoTotal: dados.custoTotal,
        margemPercentual: dados.valorVendido > 0
          ? (dados.lucroTotal / dados.valorVendido) * 100
          : 0,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  /**
   * Calcula lucro por venda de serviços (mensal)
   */
  static async getLucroPorServico(
    dataInicio: Date,
    dataFim: Date
  ): Promise<LucroPorServico[]> {
    // Buscar vendas realizadas no período
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: { not: 'Cancelada' },
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

    // Agrupar por mês
    const dadosPorMes = new Map<string, {
      lucroTotal: number;
      quantidadeVendas: number;
      valorVendido: number;
      custoTotal: number;
    }>();

    vendas.forEach((venda) => {
      const mes = venda.dataVenda.toISOString().substring(0, 7); // YYYY-MM
      
      // Calcular lucro dos serviços desta venda
      let lucroVenda = 0;
      let valorVendidoVenda = 0;
      let custoVenda = 0;

      venda.orcamento.items.forEach((item) => {
        if (item.tipo === 'SERVICO') {
          const valorVendido = item.precoUnit * item.quantidade;
          const custo = item.custoUnit * item.quantidade;
          const lucro = valorVendido - custo;

          valorVendidoVenda += valorVendido;
          custoVenda += custo;
          lucroVenda += lucro;
        }
      });

      if (lucroVenda > 0 || valorVendidoVenda > 0) {
        const mesData = dadosPorMes.get(mes) || {
          lucroTotal: 0,
          quantidadeVendas: 0,
          valorVendido: 0,
          custoTotal: 0,
        };

        mesData.lucroTotal += lucroVenda;
        mesData.valorVendido += valorVendidoVenda;
        mesData.custoTotal += custoVenda;
        mesData.quantidadeVendas += 1;

        dadosPorMes.set(mes, mesData);
      }
    });

    // Converter para array e calcular margem
    return Array.from(dadosPorMes.entries())
      .map(([mes, dados]) => ({
        mes,
        lucroTotal: dados.lucroTotal,
        quantidadeVendas: dados.quantidadeVendas,
        valorVendido: dados.valorVendido,
        custoTotal: dados.custoTotal,
        margemPercentual: dados.valorVendido > 0
          ? (dados.lucroTotal / dados.valorVendido) * 100
          : 0,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  /**
   * Calcula resumo de arrecadação do BDI por cada orçamento vendido
   */
  static async getBDIPorOrcamento(
    dataInicio: Date,
    dataFim: Date
  ): Promise<BDIPorOrcamento[]> {
    // Buscar vendas realizadas no período
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: { not: 'Cancelada' },
      },
      include: {
        orcamento: {
          include: {
            cliente: {
              select: {
                nome: true,
              },
            },
            items: true,
          },
        },
      },
      orderBy: {
        dataVenda: 'desc',
      },
    });

    return vendas.map((venda) => {
      const orcamento = venda.orcamento;
      const bdiPercentual = orcamento.bdi || 0;
      
      // Calcular valor do BDI
      // O BDI é aplicado sobre o custo total, então:
      // precoVenda = custoTotal * (1 + BDI/100)
      // valorBDI = precoVenda - custoTotal
      const custoTotal = orcamento.custoTotal || 0;
      const precoVenda = orcamento.precoVenda || 0;
      const valorBDI = precoVenda - custoTotal;
      const lucroTotal = valorBDI; // O BDI representa o lucro

      return {
        orcamentoId: orcamento.id,
        numeroSequencial: orcamento.numeroSequencial,
        clienteNome: orcamento.cliente.nome,
        dataVenda: venda.dataVenda,
        valorTotal: precoVenda,
        bdiPercentual,
        valorBDI,
        custoTotal,
        lucroTotal,
      };
    });
  }

  /**
   * Calcula lucro por mão de obra (serviços) - mensal
   */
  static async getLucroMaoDeObra(
    dataInicio: Date,
    dataFim: Date
  ): Promise<LucroMaoDeObra[]> {
    // Buscar vendas com serviços no período
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: dataInicio,
          lte: dataFim,
        },
        status: { not: 'Cancelada' },
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

    // Agrupar por mês
    const dadosPorMes = new Map<string, {
      lucroTotal: number;
      quantidadeServicos: number;
      valorVendido: number;
      custoTotal: number;
    }>();

    vendas.forEach((venda) => {
      const mes = venda.dataVenda.toISOString().substring(0, 7); // YYYY-MM
      
      // Calcular lucro dos serviços (mão de obra)
      let lucroVenda = 0;
      let valorVendidoVenda = 0;
      let custoVenda = 0;
      let quantidadeServicos = 0;

      venda.orcamento.items.forEach((item) => {
        if (item.tipo === 'SERVICO') {
          const valorVendido = item.precoUnit * item.quantidade;
          const custo = item.custoUnit * item.quantidade;
          const lucro = valorVendido - custo;

          valorVendidoVenda += valorVendido;
          custoVenda += custo;
          lucroVenda += lucro;
          quantidadeServicos += item.quantidade;
        }
      });

      if (lucroVenda > 0 || valorVendidoVenda > 0) {
        const mesData = dadosPorMes.get(mes) || {
          lucroTotal: 0,
          quantidadeServicos: 0,
          valorVendido: 0,
          custoTotal: 0,
        };

        mesData.lucroTotal += lucroVenda;
        mesData.valorVendido += valorVendidoVenda;
        mesData.custoTotal += custoVenda;
        mesData.quantidadeServicos += quantidadeServicos;

        dadosPorMes.set(mes, mesData);
      }
    });

    // Converter para array e calcular margem
    return Array.from(dadosPorMes.entries())
      .map(([mes, dados]) => ({
        mes,
        lucroTotal: dados.lucroTotal,
        quantidadeServicos: dados.quantidadeServicos,
        valorVendido: dados.valorVendido,
        custoTotal: dados.custoTotal,
        margemPercentual: dados.valorVendido > 0
          ? (dados.lucroTotal / dados.valorVendido) * 100
          : 0,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  /**
   * Calcula resumo mensal consolidado
   */
  static async getResumoMensal(
    dataInicio: Date,
    dataFim: Date
  ): Promise<ResumoMensal[]> {
    const [
      lucroMateriais,
      lucroServicos,
      lucroMaoDeObra,
      bdiPorOrcamento,
    ] = await Promise.all([
      this.getLucroPorMaterial(dataInicio, dataFim),
      this.getLucroPorServico(dataInicio, dataFim),
      this.getLucroMaoDeObra(dataInicio, dataFim),
      this.getBDIPorOrcamento(dataInicio, dataFim),
    ]);

    // Agrupar BDI por mês
    const bdiPorMes = new Map<string, number>();
    bdiPorOrcamento.forEach((bdi) => {
      const mes = bdi.dataVenda.toISOString().substring(0, 7);
      bdiPorMes.set(mes, (bdiPorMes.get(mes) || 0) + bdi.valorBDI);
    });

    // Combinar todos os meses
    const meses = new Set<string>();
    lucroMateriais.forEach((item) => meses.add(item.mes));
    lucroServicos.forEach((item) => meses.add(item.mes));
    lucroMaoDeObra.forEach((item) => meses.add(item.mes));
    bdiPorMes.forEach((_, mes) => meses.add(mes));

    return Array.from(meses)
      .map((mes) => {
        const materiais = lucroMateriais.find((m) => m.mes === mes) || {
          lucroTotal: 0,
          valorVendido: 0,
          custoTotal: 0,
        };
        const servicos = lucroServicos.find((s) => s.mes === mes) || {
          lucroTotal: 0,
          valorVendido: 0,
          custoTotal: 0,
        };
        const maoDeObra = lucroMaoDeObra.find((m) => m.mes === mes) || {
          lucroTotal: 0,
          valorVendido: 0,
          custoTotal: 0,
        };
        const totalBDI = bdiPorMes.get(mes) || 0;

        const receitaTotal = materiais.valorVendido + servicos.valorVendido;
        const custoTotal = materiais.custoTotal + servicos.custoTotal;
        const lucroLiquido = materiais.lucroTotal + servicos.lucroTotal;
        const margemPercentual = receitaTotal > 0
          ? (lucroLiquido / receitaTotal) * 100
          : 0;

        return {
          mes,
          lucroMateriais: materiais.lucroTotal,
          lucroServicos: servicos.lucroTotal,
          lucroMaoDeObra: maoDeObra.lucroTotal,
          totalBDI,
          receitaTotal,
          custoTotal,
          lucroLiquido,
          margemPercentual,
        };
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  /**
   * Calcula evolução financeira por período (mensal, 6 meses, anual)
   */
  static async getEvolucaoFinanceira(
    dataInicio: Date,
    dataFim: Date,
    periodo: 'mensal' | '6meses' | 'anual'
  ): Promise<EvolucaoFinanceira> {
    const resumoMensal = await this.getResumoMensal(dataInicio, dataFim);

    const totalReceita = resumoMensal.reduce((sum, item) => sum + item.receitaTotal, 0);
    const totalCusto = resumoMensal.reduce((sum, item) => sum + item.custoTotal, 0);
    const totalLucro = resumoMensal.reduce((sum, item) => sum + item.lucroLiquido, 0);
    const margemMedia = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

    return {
      periodo,
      dados: resumoMensal,
      totalReceita,
      totalCusto,
      totalLucro,
      margemMedia,
    };
  }

  /**
   * Resumo administrativo completo
   */
  static async getResumoAdministrativoCompleto(
    dataInicio: Date,
    dataFim: Date
  ): Promise<ResumoAdministrativoCompleto> {
    // Calcular períodos
    const hoje = new Date();
    const inicioMensal = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioSemestral = new Date(hoje);
    inicioSemestral.setMonth(inicioSemestral.getMonth() - 6);
    const inicioAnual = new Date(hoje.getFullYear(), 0, 1);

    const [
      lucroPorMaterial,
      lucroPorServico,
      bdiPorOrcamento,
      lucroMaoDeObra,
      resumoMensal,
      evolucaoMensal,
      evolucaoSemestral,
      evolucaoAnual,
    ] = await Promise.all([
      this.getLucroPorMaterial(dataInicio, dataFim),
      this.getLucroPorServico(dataInicio, dataFim),
      this.getBDIPorOrcamento(dataInicio, dataFim),
      this.getLucroMaoDeObra(dataInicio, dataFim),
      this.getResumoMensal(dataInicio, dataFim),
      this.getEvolucaoFinanceira(inicioMensal, hoje, 'mensal'),
      this.getEvolucaoFinanceira(inicioSemestral, hoje, '6meses'),
      this.getEvolucaoFinanceira(inicioAnual, hoje, 'anual'),
    ]);

    return {
      lucroPorMaterial,
      lucroPorServico,
      bdiPorOrcamento,
      lucroMaoDeObra,
      resumoMensal,
      evolucaoFinanceira: {
        mensal: evolucaoMensal,
        semestral: evolucaoSemestral,
        anual: evolucaoAnual,
      },
    };
  }
}
