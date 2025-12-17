import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardController {
  static async getEstatisticas(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalClientes,
        totalFornecedores,
        projetosAtivos,
        orcamentosPendentes,
        vendasMes,
        materiaisEstoqueBaixo,
        totalEquipes,
        equipesAtivas
      ] = await Promise.all([
        // Total de clientes ativos
        prisma.cliente.count({ where: { ativo: true } }),
        
        // Total de fornecedores ativos
        prisma.fornecedor.count({ where: { ativo: true } }),
        
        // Projetos ativos
        prisma.projeto.count({ where: { status: 'EXECUCAO' } }),
        
        // Orçamentos pendentes
        prisma.orcamento.count({ where: { status: { in: ['Rascunho', 'Enviado'] } } }),
        
        // Vendas do mês atual
        prisma.venda.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),
        
        // Materiais com estoque baixo
        prisma.material.count({
          where: {
            ativo: true,
            estoque: { lt: prisma.material.fields.estoqueMinimo }
          }
        }),
        
        // Total de equipes
        prisma.equipe.count(),
        
        // Equipes ativas
        prisma.equipe.count({ where: { ativa: true } })
      ]);

      const estatisticas = {
        clientes: {
          total: totalClientes,
          ativos: totalClientes
        },
        fornecedores: {
          total: totalFornecedores,
          ativos: totalFornecedores
        },
        projetos: {
          ativos: projetosAtivos,
          pendentes: orcamentosPendentes
        },
        vendas: {
          mesAtual: vendasMes
        },
        estoque: {
          materiaisBaixo: materiaisEstoqueBaixo
        },
        equipes: {
          total: totalEquipes,
          ativas: equipesAtivas
        }
      };

      res.status(200).json({ success: true, data: estatisticas });
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas', error: error.message });
    }
  }

  static async getGraficos(req: Request, res: Response): Promise<void> {
    try {
      const { meses = '6' } = req.query;
      const mesesNum = parseInt(meses as string);
      const dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() - mesesNum);

      const [
        vendasPorMes,
        projetosPorStatus,
        materiaisMaisVendidos
      ] = await Promise.all([
        // Vendas por mês (últimos N meses)
        prisma.venda.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: dataInicio }
          },
          _count: { id: true },
          _sum: { valorTotal: true }
        }),

        // Projetos por status
        prisma.projeto.groupBy({
          by: ['status'],
          _count: { id: true }
        }),

        // Materiais mais vendidos (baseado em orçamentos)
        prisma.orcamentoItem.groupBy({
          by: ['materialId'],
          where: {
            material: { isNot: null }
          },
          _sum: { quantidade: true },
          _count: { id: true },
          orderBy: { _sum: { quantidade: 'desc' } },
          take: 10
        })
      ]);

      // Processar dados de vendas por mês
      const vendasProcessadas = vendasPorMes.map(venda => ({
        mes: venda.createdAt.toISOString().substring(0, 7), // YYYY-MM
        quantidade: venda._count.id,
        valor: venda._sum.valorTotal || 0
      }));

      // Processar materiais mais vendidos
      const materiaisProcessados = await Promise.all(
        materiaisMaisVendidos.map(async (item) => {
          const material = await prisma.material.findUnique({
            where: { id: item.materialId! },
            select: { nome: true, sku: true }
          });
          return {
            materialId: item.materialId,
            nome: material?.nome || 'Material não encontrado',
            sku: material?.sku || '',
            quantidade: item._sum.quantidade || 0,
            vendas: item._count.id
          };
        })
      );

      const graficos = {
        vendasPorMes: vendasProcessadas,
        projetosPorStatus: projetosPorStatus.map(p => ({
          status: p.status,
          quantidade: p._count.id
        })),
        materiaisMaisVendidos: materiaisProcessados
      };

      res.status(200).json({ success: true, data: graficos });
    } catch (error: any) {
      console.error('Erro ao buscar dados para gráficos:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar dados para gráficos', error: error.message });
    }
  }

  static async getAlertas(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);

      const [
        estoqueBaixo,
        orcamentosVencendo,
        contasVencidas,
        projetosAtrasados
      ] = await Promise.all([
        // Materiais com estoque baixo
        // Buscar materiais e enriquecer com fornecedor da última compra
        prisma.material.findMany({
          where: {
            ativo: true,
            estoque: { lt: prisma.material.fields.estoqueMinimo }
          },
          select: {
            id: true,
            nome: true,
            sku: true,
            estoque: true,
            estoqueMinimo: true,
            unidadeMedida: true,
            fornecedorId: true,
            fornecedor: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            },
            compraItems: {
              select: {
                compra: {
                  select: {
                    fornecedorId: true,
                    fornecedorNome: true,
                    fornecedor: {
                      select: {
                        id: true,
                        nome: true,
                        email: true
                      }
                    },
                    dataCompra: true
                  }
                }
              }
            }
          },
          take: 100 // Aumentar limite para ter mais materiais para filtrar
        }),

        // Orçamentos vencendo (próximos 7 dias)
        prisma.orcamento.findMany({
          where: {
            status: { in: ['Rascunho', 'Enviado'] },
            validade: {
              gte: hoje,
              lte: proximos7Dias
            }
          },
          select: {
            id: true,
            titulo: true,
            validade: true,
            cliente: { select: { nome: true } }
          },
          take: 10
        }),

        // Contas a pagar vencidas
        prisma.contaPagar.findMany({
          where: {
            status: { not: 'Pago' },
            dataVencimento: { lt: hoje }
          },
          select: {
            id: true,
            descricao: true,
            valorParcela: true,
            dataVencimento: true,
            fornecedor: { select: { nome: true } }
          },
          take: 10
        }),

        // Projetos atrasados (data previsão passou)
        prisma.projeto.findMany({
          where: {
            status: 'EXECUCAO', // Corrigido: usar valor do enum ProjetoStatus
            dataPrevisao: { lt: hoje }
          },
          select: {
            id: true,
            titulo: true,
            dataPrevisao: true,
            cliente: { select: { nome: true } }
          },
          take: 10
        })
      ]);

      const alertas = {
        estoqueBaixo: {
          titulo: 'Estoque Baixo',
          nivel: 'warning',
          itens: estoqueBaixo.map(item => {
            // Determinar fornecedor: priorizar fornecedorId direto, senão usar fornecedor da última compra
            const fornecedorDireto = item.fornecedor;
            
            // Buscar última compra ordenando por dataCompra
            let ultimaCompra = null;
            if (item.compraItems && item.compraItems.length > 0) {
              // Ordenar compras por dataCompra (mais recente primeiro)
              const comprasOrdenadas = [...item.compraItems]
                .map(ci => ci.compra)
                .filter(c => c && c.dataCompra)
                .sort((a, b) => new Date(b.dataCompra).getTime() - new Date(a.dataCompra).getTime());
              
              ultimaCompra = comprasOrdenadas[0] || null;
            }
            
            const fornecedorUltimaCompra = ultimaCompra?.fornecedor; // Objeto fornecedor da relação
            const fornecedorIdUltimaCompra = ultimaCompra?.fornecedorId;
            const fornecedorNomeUltimaCompra = ultimaCompra?.fornecedorNome;
            
            // Usar fornecedor direto se existir, senão usar fornecedor da última compra
            let fornecedorFinal = fornecedorDireto;
            let fornecedorIdFinal = item.fornecedorId;
            
            // Se não tem fornecedor direto, usar da última compra
            if (!fornecedorFinal && fornecedorUltimaCompra) {
              // Usar objeto fornecedor da relação (mais completo)
              fornecedorIdFinal = fornecedorUltimaCompra.id;
              fornecedorFinal = fornecedorUltimaCompra;
            } else if (!fornecedorFinal && fornecedorIdUltimaCompra) {
              // Se não tem objeto fornecedor mas tem fornecedorId, criar objeto básico
              fornecedorIdFinal = fornecedorIdUltimaCompra;
              fornecedorFinal = {
                id: fornecedorIdUltimaCompra,
                nome: fornecedorNomeUltimaCompra || 'Fornecedor não informado',
                email: null
              };
            }
            
            return {
              id: item.id,
              nome: item.nome,
              sku: item.sku,
              estoque: item.estoque,
              estoqueMinimo: item.estoqueMinimo,
              unidadeMedida: item.unidadeMedida,
              diferenca: item.estoque - item.estoqueMinimo,
              fornecedorId: fornecedorIdFinal, // ✅ Fornecedor direto ou da última compra
              fornecedor: fornecedorFinal ? {
                id: fornecedorFinal.id,
                nome: fornecedorFinal.nome,
                email: fornecedorFinal.email || null
              } : null // ✅ Fornecedor direto ou da última compra
            };
          })
        },
        orcamentosVencendo: {
          titulo: 'Orçamentos Vencendo',
          nivel: 'info',
          itens: orcamentosVencendo.map(orc => ({
            id: orc.id,
            titulo: orc.titulo,
            cliente: orc.cliente.nome,
            validade: orc.validade,
            diasRestantes: Math.ceil((orc.validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
          }))
        },
        contasVencidas: {
          titulo: 'Contas Vencidas',
          nivel: 'error',
          itens: contasVencidas.map(conta => ({
            id: conta.id,
            descricao: conta.descricao,
            fornecedor: conta.fornecedor?.nome || 'N/A',
            valor: conta.valorParcela,
            vencimento: conta.dataVencimento,
            diasAtraso: Math.ceil((hoje.getTime() - conta.dataVencimento.getTime()) / (1000 * 60 * 60 * 24))
          }))
        },
        projetosAtrasados: {
          titulo: 'Projetos Atrasados',
          nivel: 'warning',
          itens: projetosAtrasados.map(proj => ({
            id: proj.id,
            titulo: proj.titulo,
            cliente: proj.cliente.nome,
            previsao: proj.dataPrevisao,
            diasAtraso: Math.ceil((hoje.getTime() - proj.dataPrevisao!.getTime()) / (1000 * 60 * 60 * 24))
          }))
        }
      };

      res.status(200).json({ success: true, data: alertas });
    } catch (error: any) {
      console.error('Erro ao buscar alertas:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar alertas', error: error.message });
    }
  }

  static async getEvolucaoObras(req: Request, res: Response): Promise<void> {
    try {
      const { periodo = 'monthly' } = req.query;
      const hoje = new Date();
      let dataInicio: Date;
      let agrupamento: 'day' | 'week' | 'month' | 'semester' | 'year';

      // Definir período de análise
      switch (periodo) {
        case 'monthly':
          dataInicio = new Date(hoje.getFullYear(), 0, 1); // Início do ano
          agrupamento = 'month';
          break;
        case 'semester':
          dataInicio = new Date(hoje.getFullYear() - 2, 0, 1); // Últimos 2 anos
          agrupamento = 'semester';
          break;
        case 'annual':
          dataInicio = new Date(hoje.getFullYear() - 5, 0, 1); // Últimos 5 anos
          agrupamento = 'year';
          break;
        default:
          dataInicio = new Date(hoje.getFullYear(), 0, 1);
          agrupamento = 'month';
      }

      // Buscar projetos/obras
      const projetos = await prisma.projeto.findMany({
        where: {
          createdAt: { gte: dataInicio }
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          dataInicio: true,
          valorTotal: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Processar dados por período
      const dadosAgrupados = DashboardController.processarEvolucaoObras(projetos, agrupamento, dataInicio, hoje);

      res.status(200).json({ success: true, data: dadosAgrupados });
    } catch (error: any) {
      console.error('Erro ao buscar evolução de obras:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar evolução de obras', error: error.message });
    }
  }

  static async getProducaoQuadros(req: Request, res: Response): Promise<void> {
    try {
      const { periodo = 'daily' } = req.query;
      const hoje = new Date();
      let dataInicio: Date;

      // Definir período de análise
      switch (periodo) {
        case 'daily':
          dataInicio = new Date(hoje);
          dataInicio.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          dataInicio = new Date(hoje);
          dataInicio.setDate(hoje.getDate() - 7);
          break;
        case 'monthly':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          break;
        default:
          dataInicio = new Date(hoje);
          dataInicio.setHours(0, 0, 0, 0);
      }

      // Buscar dados de produção de quadros
      // Vamos usar projetos do tipo "Quadro Elétrico" ou orçamentos com categoria específica
      const quadrosProduzidos = await prisma.projeto.findMany({
        where: {
          createdAt: { gte: dataInicio },
          OR: [
            { titulo: { contains: 'Quadro', mode: 'insensitive' } },
            { titulo: { contains: 'Painel', mode: 'insensitive' } },
            { descricao: { contains: 'Quadro Elétrico', mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          titulo: true,
          createdAt: true,
          status: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Processar dados por período
      const dadosProducao = DashboardController.processarProducaoQuadros(quadrosProduzidos, periodo as string);

      res.status(200).json({ success: true, data: dadosProducao });
    } catch (error: any) {
      console.error('Erro ao buscar produção de quadros:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar produção de quadros', error: error.message });
    }
  }

  static async exportarDados(req: Request, res: Response): Promise<void> {
    try {
      const { formato = 'json' } = req.query;

      // Buscar todos os dados do dashboard
      const [estatisticas, graficos, alertas] = await Promise.all([
        DashboardController.getEstatisticasData(),
        DashboardController.getGraficosData(),
        DashboardController.getAlertasData()
      ]);

      const dadosExportacao = {
        timestamp: new Date().toISOString(),
        estatisticas,
        graficos,
        alertas,
        geradoPor: 'S3E Engenharia - Sistema de Gestão'
      };

      if (formato === 'json') {
        res.status(200).json({
          success: true,
          data: dadosExportacao,
          formato: 'JSON'
        });
      } else {
        // Para PDF/Excel, retornar dados estruturados que o frontend vai processar
        res.status(200).json({
          success: true,
          data: dadosExportacao,
          formato: formato.toString().toUpperCase(),
          message: 'Dados preparados para exportação'
        });
      }
    } catch (error: any) {
      console.error('Erro ao exportar dados:', error);
      res.status(500).json({ success: false, message: 'Erro ao exportar dados', error: error.message });
    }
  }

  // Métodos auxiliares
  private static processarEvolucaoObras(projetos: any[], agrupamento: string, dataInicio: Date, dataFim: Date): any[] {
    const resultado: any[] = [];
    
    if (agrupamento === 'month') {
      // Agrupar por mês
      for (let mes = 0; mes < 12; mes++) {
        const nomeMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][mes];
        const projetosDoMes = projetos.filter(p => new Date(p.createdAt).getMonth() === mes);
        
        resultado.push({
          name: nomeMes,
          concluidas: projetosDoMes.filter(p => p.status === 'CONCLUIDO').length,
          emAndamento: projetosDoMes.filter(p => p.status === 'EXECUCAO').length,
          planejadas: projetosDoMes.filter(p => p.status === 'PLANEJAMENTO' || p.status === 'ORCAMENTO').length,
          receita: projetosDoMes.reduce((sum, p) => sum + (p.valorTotal || 0), 0)
        });
      }
    } else if (agrupamento === 'semester') {
      // Agrupar por semestre
      const ano = dataInicio.getFullYear();
      for (let i = 0; i < 4; i++) {
        const anoSem = Math.floor(ano + i / 2);
        const semestre = (i % 2) + 1;
        const label = `${semestre}º Sem ${anoSem}`;
        
        const projetosSemestre = projetos.filter(p => {
          const data = new Date(p.createdAt);
          const projetoAno = data.getFullYear();
          const projetoSemestre = data.getMonth() < 6 ? 1 : 2;
          return projetoAno === anoSem && projetoSemestre === semestre;
        });
        
        resultado.push({
          name: label,
          concluidas: projetosSemestre.filter(p => p.status === 'CONCLUIDO').length,
          emAndamento: projetosSemestre.filter(p => p.status === 'EXECUCAO').length,
          planejadas: projetosSemestre.filter(p => p.status === 'PLANEJAMENTO' || p.status === 'ORCAMENTO').length,
          receita: projetosSemestre.reduce((sum, p) => sum + (p.valorTotal || 0), 0)
        });
      }
    } else if (agrupamento === 'year') {
      // Agrupar por ano
      const anoInicio = dataInicio.getFullYear();
      const anoFim = dataFim.getFullYear();
      
      for (let ano = anoInicio; ano <= anoFim; ano++) {
        const projetosAno = projetos.filter(p => new Date(p.createdAt).getFullYear() === ano);
        
        resultado.push({
          name: ano.toString(),
          concluidas: projetosAno.filter(p => p.status === 'CONCLUIDO').length,
          emAndamento: projetosAno.filter(p => p.status === 'EXECUCAO').length,
          planejadas: projetosAno.filter(p => p.status === 'PLANEJAMENTO' || p.status === 'ORCAMENTO').length,
          receita: projetosAno.reduce((sum, p) => sum + (p.valorTotal || 0), 0)
        });
      }
    }
    
    return resultado;
  }

  private static processarProducaoQuadros(quadros: any[], periodo: string): any[] {
    const resultado: any[] = [];
    
    if (periodo === 'daily') {
      // Agrupar por hora (últimas 12 horas)
      const horaAtual = new Date().getHours();
      for (let i = 0; i < 6; i++) {
        const hora = (horaAtual - 10 + i * 2) % 24;
        const horaFormatada = `${hora.toString().padStart(2, '0')}h`;
        
        const quadrosHora = quadros.filter(q => {
          const horaQuadro = new Date(q.createdAt).getHours();
          return horaQuadro >= hora - 1 && horaQuadro < hora + 1;
        });
        
        resultado.push({
          hora: horaFormatada,
          producao: quadrosHora.length
        });
      }
    } else if (periodo === 'weekly') {
      // Agrupar por dia da semana
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      for (let i = 0; i < 7; i++) {
        const quadrosDia = quadros.filter(q => new Date(q.createdAt).getDay() === i);
        resultado.push({
          hora: diasSemana[i],
          producao: quadrosDia.length
        });
      }
    } else if (periodo === 'monthly') {
      // Agrupar por semana do mês
      for (let semana = 1; semana <= 4; semana++) {
        const quadrosSemana = quadros.filter(q => {
          const dia = new Date(q.createdAt).getDate();
          return dia >= (semana - 1) * 7 + 1 && dia <= semana * 7;
        });
        
        resultado.push({
          hora: `Sem ${semana}`,
          producao: quadrosSemana.length
        });
      }
    }
    
    return resultado;
  }

  // Métodos auxiliares para exportação
  private static async getEstatisticasData() {
    const [totalClientes, totalFornecedores, projetosAtivos, vendasMes] = await Promise.all([
      prisma.cliente.count({ where: { ativo: true } }),
      prisma.fornecedor.count({ where: { ativo: true } }),
      prisma.projeto.count({ where: { status: 'EXECUCAO' } }),
      prisma.venda.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return { totalClientes, totalFornecedores, projetosAtivos, vendasMes };
  }

  private static async getGraficosData() {
    return { message: 'Dados de gráficos' };
  }

  private static async getAlertasData() {
    return { message: 'Dados de alertas' };
  }

  static async getAtividades(req: Request, res: Response): Promise<void> {
    try {
      const { periodo = 'daily' } = req.query;
      const hoje = new Date();
      let dataInicio: Date;

      switch (periodo) {
        case 'daily':
          dataInicio = new Date(hoje);
          dataInicio.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          dataInicio = new Date(hoje);
          dataInicio.setDate(hoje.getDate() - 7);
          break;
        case 'monthly':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          break;
        default:
          dataInicio = new Date(hoje);
          dataInicio.setHours(0, 0, 0, 0);
      }

      // Buscar atividades (vendas, orçamentos, movimentações)
      const [vendas, orcamentos, movimentacoes] = await Promise.all([
        prisma.venda.findMany({
          where: { createdAt: { gte: dataInicio } },
          select: { id: true, createdAt: true }
        }),
        prisma.orcamento.findMany({
          where: { createdAt: { gte: dataInicio } },
          select: { id: true, createdAt: true }
        }),
        prisma.movimentacaoEstoque.findMany({
          where: { data: { gte: dataInicio } },
          select: { id: true, data: true }
        })
      ]);

      // Processar por hora/dia
      const dadosAtividades = DashboardController.processarAtividades(
        [...vendas, ...orcamentos, ...movimentacoes.map(m => ({ id: m.id, createdAt: m.data }))],
        periodo as string
      );

      res.status(200).json({ success: true, data: dadosAtividades });
    } catch (error: any) {
      console.error('Erro ao buscar atividades:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar atividades', error: error.message });
    }
  }

  static async getResumoFinanceiro(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);

      // Buscar dados financeiros
      const [
        vendasMes,
        vendasAno,
        orcamentosAbertos,
        contasPagar,
        totalProjetos
      ] = await Promise.all([
        // Vendas do mês
        prisma.venda.aggregate({
          where: { createdAt: { gte: inicioMes } },
          _sum: { valorTotal: true },
          _count: { id: true }
        }),
        // Vendas do ano
        prisma.venda.aggregate({
          where: { createdAt: { gte: inicioAno } },
          _sum: { valorTotal: true }
        }),
        // Orçamentos em aberto
        prisma.orcamento.aggregate({
          where: { status: { in: ['Rascunho', 'Enviado'] } },
          _sum: { precoVenda: true },
          _count: { id: true }
        }),
        // Contas a pagar
        prisma.contaPagar.aggregate({
          where: { status: { not: 'Pago' } },
          _sum: { valorParcela: true }
        }),
        // Projetos em execução
        prisma.projeto.aggregate({
          where: { status: 'EXECUCAO' },
          _sum: { valorTotal: true },
          _count: { id: true }
        })
      ]);

      const resumoFinanceiro = {
        receitaTotal: (vendasAno._sum.valorTotal || 0) + (totalProjetos._sum.valorTotal || 0),
        receitaMes: vendasMes._sum.valorTotal || 0,
        obrasConcluidas: vendasMes._sum.valorTotal || 0,
        obrasAndamento: totalProjetos._sum.valorTotal || 0,
        orcamentosAbertos: orcamentosAbertos._sum.precoVenda || 0,
        contasPagar: contasPagar._sum.valorParcela || 0,
        vendasMes: vendasMes._count.id || 0,
        projetosAtivos: totalProjetos._count.id || 0,
        orcamentosPendentes: orcamentosAbertos._count.id || 0
      };

      res.status(200).json({ success: true, data: resumoFinanceiro });
    } catch (error: any) {
      console.error('Erro ao buscar resumo financeiro:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar resumo financeiro', error: error.message });
    }
  }

  private static processarAtividades(atividades: any[], periodo: string): any[] {
    const resultado: any[] = [];
    
    if (periodo === 'daily') {
      // Últimas 6 horas (intervalos de 2h)
      const horaAtual = new Date().getHours();
      for (let i = 0; i < 6; i++) {
        const hora = Math.max(0, horaAtual - 10 + i * 2);
        const horaFormatada = `${hora}h`;
        
        const atividadesHora = atividades.filter(a => {
          const horaAtividade = new Date(a.createdAt).getHours();
          return horaAtividade >= hora && horaAtividade < hora + 2;
        });
        
        resultado.push({
          hora: horaFormatada,
          sessoes: atividadesHora.length
        });
      }
    } else if (periodo === 'weekly') {
      // Últimos 7 dias
      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        const dia = data.toLocaleDateString('pt-BR', { weekday: 'short' });
        
        const atividadesDia = atividades.filter(a => {
          const dataAtividade = new Date(a.createdAt);
          return dataAtividade.toDateString() === data.toDateString();
        });
        
        resultado.push({
          hora: dia,
          sessoes: atividadesDia.length
        });
      }
    } else if (periodo === 'monthly') {
      // Últimas 4 semanas
      for (let semana = 1; semana <= 4; semana++) {
        const atividadesSemana = atividades.filter(a => {
          const dia = new Date(a.createdAt).getDate();
          return dia >= (semana - 1) * 7 + 1 && dia <= semana * 7;
        });
        
        resultado.push({
          hora: `Sem ${semana}`,
          sessoes: atividadesSemana.length
        });
      }
    }
    
    return resultado;
  }
}
