import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  OS_STATUS_LABEL,
  agregarOsBucket,
  buildProgressoMapForProjetos,
  calcularTendenciaPct,
  classificarOsPorProgresso,
  contarClientesComOrcamentoAprovado,
  contarOsEmAndamento,
  contarQuadrosProduzidosMesAtual,
} from '../services/dashboardMetrics.service';

function inRange(d: Date, b: { start: Date; end: Date }): boolean {
  const t = new Date(d).getTime();
  return t >= b.start.getTime() && t <= b.end.getTime();
}

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

  /**
   * Métricas dos cards do dashboard + tendências reais (mês atual vs mês anterior).
   * GET /api/dashboard/cards-metricas
   */
  static async getCardsMetricas(req: Request, res: Response): Promise<void> {
    try {
      const agora = new Date();
      const mesAtualIni = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const mesAnteriorIni = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      const mesAnteriorFim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999);

      const [
        obrasAtivas,
        obrasAtivasMesAnterior,
        equipesAtivas,
        equipesAtivasMesAnterior,
        osEmAndamento,
        clientesAtendidos,
        clientesAprovadosMesAtual,
        clientesAprovadosMesAnterior,
        quadrosMesAtual,
        quadrosMesAnterior,
        osAtualizadasMesAtual,
        osAtualizadasMesAnterior,
      ] = await Promise.all([
        prisma.projeto.count({ where: { status: 'EXECUCAO' } }),
        prisma.projeto.count({
          where: {
            status: 'EXECUCAO',
            updatedAt: { lte: mesAnteriorFim },
          },
        }),
        prisma.equipe.count({ where: { ativa: true } }),
        prisma.equipe.count({
          where: { ativa: true, updatedAt: { lte: mesAnteriorFim } },
        }),
        contarOsEmAndamento(),
        contarClientesComOrcamentoAprovado(),
        prisma.orcamento.findMany({
          where: {
            status: { contains: 'aprovado', mode: 'insensitive' },
            updatedAt: { gte: mesAtualIni },
          },
          select: { clienteId: true },
          distinct: ['clienteId'],
        }),
        prisma.orcamento.findMany({
          where: {
            status: { contains: 'aprovado', mode: 'insensitive' },
            updatedAt: { gte: mesAnteriorIni, lte: mesAnteriorFim },
          },
          select: { clienteId: true },
          distinct: ['clienteId'],
        }),
        contarQuadrosProduzidosMesAtual(),
        prisma.projeto.count({
          where: {
            createdAt: { gte: mesAnteriorIni, lte: mesAnteriorFim },
            status: { in: ['EXECUCAO', 'CONCLUIDO'] },
            OR: [
              { titulo: { contains: 'Quadro', mode: 'insensitive' } },
              { titulo: { contains: 'Painel', mode: 'insensitive' } },
              { descricao: { contains: 'Quadro', mode: 'insensitive' } },
            ],
          },
        }),
        prisma.projeto.count({
          where: { status: { not: 'CANCELADO' }, updatedAt: { gte: mesAtualIni } },
        }),
        prisma.projeto.count({
          where: {
            status: { not: 'CANCELADO' },
            updatedAt: { gte: mesAnteriorIni, lte: mesAnteriorFim },
          },
        }),
      ]);

      const projetosAtivos = await prisma.projeto.findMany({
        where: { status: { not: 'CANCELADO' } },
        select: { id: true, status: true, updatedAt: true },
      });
      const progressoMap = await buildProgressoMapForProjetos(projetosAtivos);
      const osComProgressoMesAnterior = projetosAtivos.filter((p) => {
        if (p.updatedAt > mesAnteriorFim) return false;
        const pct = progressoMap[p.id]?.percentual ?? 0;
        return classificarOsPorProgresso(p.status, pct) === 'comProgresso';
      }).length;

      const data = {
        obrasAtivas: {
          valor: obrasAtivas,
          tendencia: calcularTendenciaPct(obrasAtivas, obrasAtivasMesAnterior),
        },
        osEmAndamento: {
          valor: osEmAndamento,
          tendencia: calcularTendenciaPct(osEmAndamento, osComProgressoMesAnterior),
          descricao:
            'OS com barra de progresso entre 1% e 99% (mesma regra da página Ordem de Serviços)',
        },
        equipesAtivas: {
          valor: equipesAtivas,
          tendencia: calcularTendenciaPct(equipesAtivas, equipesAtivasMesAnterior),
        },
        quadrosProduzidos: {
          valor: quadrosMesAtual,
          tendencia: calcularTendenciaPct(quadrosMesAtual, quadrosMesAnterior),
          fonte:
            'OS (projetos) criadas no mês com status Em Execução ou Concluído e título/descrição contendo "Quadro" ou "Painel"',
        },
        clientesAtendidos: {
          valor: clientesAtendidos,
          tendencia: calcularTendenciaPct(
            clientesAprovadosMesAtual.length,
            clientesAprovadosMesAnterior.length,
          ),
          descricao: 'Clientes distintos com pelo menos um orçamento aprovado',
        },
        osAtividadeMensal: {
          mesAtual: osAtualizadasMesAtual,
          mesAnterior: osAtualizadasMesAnterior,
        },
      };

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Erro ao buscar cards métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar métricas dos cards',
        error: error.message,
      });
    }
  }

  /**
   * Detalhamento dos KPIs de um gráfico (modal).
   * GET /api/dashboard/detalhe-kpis?grafico=ordens-servico|orcamentos|obras-kanban|pedidos-vendas&periodo=monthly&bucket=Mai
   */
  static async getDetalheKpis(req: Request, res: Response): Promise<void> {
    try {
      const grafico = String(req.query.grafico || 'ordens-servico');
      const periodo = String(req.query.periodo || 'monthly');
      const bucket = String(req.query.bucket || '').trim();
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      if (grafico === 'ordens-servico') {
        const projetos = await prisma.projeto.findMany({
          select: {
            id: true,
            titulo: true,
            status: true,
            semObra: true,
            createdAt: true,
            orcamento: { select: { numeroSequencial: true } },
          },
        });
        const progressoMap = await buildProgressoMapForProjetos(projetos);

        let filtrados = projetos;
        if (bucket) {
          if (periodo === 'monthly') {
            const mesIdx = mesesNomes.indexOf(bucket);
            if (mesIdx >= 0) {
              filtrados = projetos.filter((p) => {
                const d = new Date(p.createdAt);
                return d.getFullYear() === anoAtual && d.getMonth() === mesIdx;
              });
            }
          } else if (periodo === 'annual' && /^\d{4}$/.test(bucket)) {
            const ano = parseInt(bucket, 10);
            filtrados = projetos.filter((p) => new Date(p.createdAt).getFullYear() === ano);
          }
        }

        const resumo = agregarOsBucket(filtrados, progressoMap, bucket || 'Período');

        const linhas = filtrados
          .filter((p) => p.status !== 'CANCELADO')
          .map((p) => {
            const pct = progressoMap[p.id]?.percentual ?? 0;
            const cls = classificarOsPorProgresso(p.status, pct);
            const osNum = p.orcamento?.numeroSequencial
              ? `OS-${p.orcamento.numeroSequencial}`
              : p.id.slice(0, 8);
            return {
              os: osNum,
              titulo: p.titulo,
              statusPagina: OS_STATUS_LABEL[p.status] || p.status,
              progressoPct: pct,
              classificacaoGrafico:
                cls === 'concluido'
                  ? 'Concluído (100%)'
                  : cls === 'comProgresso'
                    ? 'Com progresso (barra 1–99%)'
                    : 'Aguardando (0%)',
              criadoEm: new Date(p.createdAt).toLocaleDateString('pt-BR'),
            };
          })
          .sort((a, b) => b.progressoPct - a.progressoPct);

        const legenda = [
          {
            kpi: 'Com progresso',
            significado: 'Barra de progresso entre 1% e 99% na listagem de OS',
            termoPaginaOs: 'Coluna Progresso (mesma regra do Kanban + obra)',
          },
          {
            kpi: 'Aguardando',
            significado: 'Progresso 0% e ainda não concluída',
            termoPaginaOs: 'Cards na aba Listagem sem avanço na barra',
          },
          {
            kpi: 'Concluído',
            significado: 'Status Concluído com progresso 100%',
            termoPaginaOs: 'Aba Concluídos',
          },
          {
            kpi: 'Proposta / Validado / Aprovado / Em Execução',
            significado: 'Status cadastrado na OS (filtro da página)',
            termoPaginaOs: 'Badge colorido no card da OS',
          },
        ];

        res.status(200).json({
          success: true,
          data: {
            titulo: 'Ordens de serviço — detalhamento',
            periodo,
            bucket: bucket || 'Todos',
            resumo,
            legenda,
            linhas,
            nota: 'Contagem por data de criação da OS no período. "Planejamento" foi renomeado para Aguardando (0% de progresso).',
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'grafico inválido. Use: ordens-servico, orcamentos, obras-kanban, pedidos-vendas',
      });
    } catch (error: any) {
      console.error('Erro detalhe KPIs:', error);
      res.status(500).json({ success: false, message: error.message });
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

        // Contas a pagar vencidas (excluir canceladas)
        prisma.contaPagar.findMany({
          where: {
            status: { notIn: ['Pago', 'Cancelado'] }, // ✅ Excluir pagas e canceladas
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
            let ultimaCompra: any = null;
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
        // Contas a pagar (excluir canceladas)
        prisma.contaPagar.aggregate({
          where: { 
            status: { 
              notIn: ['Pago', 'Cancelado'] // ✅ Excluir pagas e canceladas
            } 
          },
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

  /**
   * Gráficos do dashboard executivo: evoluções, comparativo e categorias de venda.
   * GET /api/dashboard/graficos-executivo?periodo=monthly|semester|annual
   */
  static async getGraficosExecutivo(req: Request, res: Response): Promise<void> {
    try {
      const { periodo = 'monthly' } = req.query;
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();

      let dataInicio: Date;
      let dataFim: Date;
      let modo: 'month' | 'semester' | 'year';

      switch (periodo) {
        case 'semester':
          dataInicio = new Date(anoAtual - 2, 0, 1);
          dataFim = hoje;
          modo = 'semester';
          break;
        case 'annual':
          dataInicio = new Date(anoAtual - 5, 0, 1);
          dataFim = hoje;
          modo = 'year';
          break;
        case 'monthly':
        default:
          dataInicio = new Date(anoAtual, 0, 1);
          dataFim = new Date(anoAtual, 11, 31, 23, 59, 59, 999);
          modo = 'month';
      }

      const [orcamentos, projetos, obras, vendas] = await Promise.all([
        prisma.orcamento.findMany({
          where: { createdAt: { gte: dataInicio, lte: dataFim } },
          select: { createdAt: true, status: true }
        }),
        prisma.projeto.findMany({
          where: { createdAt: { gte: dataInicio, lte: dataFim } },
          select: { id: true, createdAt: true, status: true, semObra: true }
        }),
        prisma.obra.findMany({
          where: { createdAt: { gte: dataInicio, lte: dataFim } },
          select: { createdAt: true, status: true }
        }),
        prisma.venda.findMany({
          where: { createdAt: { gte: dataInicio, lte: dataFim } },
          select: { createdAt: true, valorTotal: true, formaPagamento: true }
        })
      ]);

      const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      let evolucaoOrcamentos: any[] = [];
      let evolucaoOrdensServico: any[] = [];
      let evolucaoObrasKanban: any[] = [];
      let evolucaoPedidosVendas: any[] = [];
      let comparativoMensal: any[] = [];
      let categoriasVendas: { name: string; value: number }[] = [];

      const progressoMapOs = await buildProgressoMapForProjetos(projetos);

      if (modo === 'month') {
        for (let mes = 0; mes < 12; mes++) {
          const oM = orcamentos.filter((o) => {
            const d = new Date(o.createdAt);
            return d.getFullYear() === anoAtual && d.getMonth() === mes;
          });
          const pM = projetos.filter((p) => {
            const d = new Date(p.createdAt);
            return d.getFullYear() === anoAtual && d.getMonth() === mes;
          });
          const obM = obras.filter((o) => {
            const d = new Date(o.createdAt);
            return d.getFullYear() === anoAtual && d.getMonth() === mes;
          });
          const vM = vendas.filter((v) => {
            const d = new Date(v.createdAt);
            return d.getFullYear() === anoAtual && d.getMonth() === mes;
          });

          evolucaoOrcamentos.push({
            name: mesesNomes[mes],
            criados: oM.length,
            aprovados: oM.filter((o) => /aprovado/i.test(o.status || '')).length,
            emAnalise: oM.filter(
              (o) => !/Aprovado|Recusado|Cancelado|Declinado/i.test(o.status || '')
            ).length
          });

          evolucaoOrdensServico.push(
            agregarOsBucket(pM, progressoMapOs, mesesNomes[mes]),
          );

          evolucaoObrasKanban.push({
            name: mesesNomes[mes],
            backlog: obM.filter((o) => o.status === 'BACKLOG').length,
            aFazer: obM.filter((o) => o.status === 'A_FAZER').length,
            andamento: obM.filter((o) => o.status === 'ANDAMENTO').length,
            concluidas: obM.filter((o) => o.status === 'CONCLUIDO').length
          });

          const valorVendas = vM.reduce((s, v) => s + (v.valorTotal || 0), 0);
          evolucaoPedidosVendas.push({
            name: mesesNomes[mes],
            quantidade: vM.length,
            valor: valorVendas
          });

          comparativoMensal.push({
            name: mesesNomes[mes],
            orcamentos: oM.length,
            ordensServico: pM.length,
            obras: obM.length,
            pedidosVendas: vM.length
          });
        }

        const mapaCat = new Map<string, number>();
        vendas.forEach((v) => {
          const k = (v.formaPagamento && v.formaPagamento.trim()) || 'Não informado';
          mapaCat.set(k, (mapaCat.get(k) || 0) + 1);
        });
        categoriasVendas = Array.from(mapaCat.entries()).map(([name, value]) => ({ name, value }));
      } else if (modo === 'semester') {
        const anoBase = dataInicio.getFullYear();
        const buckets: { start: Date; end: Date; label: string }[] = [];
        for (let i = 0; i < 4; i++) {
          const anoSem = Math.floor(anoBase + i / 2);
          const semestre = (i % 2) + 1;
          const start = new Date(anoSem, semestre === 1 ? 0 : 6, 1);
          const end = new Date(anoSem, semestre === 1 ? 5 : 11, semestre === 1 ? 30 : 31, 23, 59, 59, 999);
          buckets.push({
            start: start < dataInicio ? dataInicio : start,
            end: end > dataFim ? dataFim : end,
            label: `${semestre}º Sem ${anoSem}`
          });
        }
        evolucaoOrcamentos = buckets.map((b) =>
          DashboardController.fillBucketOrcamentos(orcamentos, b)
        );
        evolucaoOrdensServico = buckets.map((b) => {
          const pB = projetos.filter((p) => inRange(p.createdAt, b));
          return agregarOsBucket(pB, progressoMapOs, b.label);
        });
        evolucaoObrasKanban = buckets.map((b) => DashboardController.fillBucketObras(obras, b));
        evolucaoPedidosVendas = buckets.map((b) => DashboardController.fillBucketVendas(vendas, b));
        comparativoMensal = buckets.map((b) => {
          const oB = orcamentos.filter((x) => inRange(x.createdAt, b));
          const pB = projetos.filter((x) => inRange(x.createdAt, b));
          const obB = obras.filter((x) => inRange(x.createdAt, b));
          const vB = vendas.filter((x) => inRange(x.createdAt, b));
          return {
            name: b.label,
            orcamentos: oB.length,
            ordensServico: pB.length,
            obras: obB.length,
            pedidosVendas: vB.length
          };
        });
        const mapaCat = new Map<string, number>();
        vendas.forEach((v) => {
          const k = (v.formaPagamento && v.formaPagamento.trim()) || 'Não informado';
          mapaCat.set(k, (mapaCat.get(k) || 0) + 1);
        });
        categoriasVendas = Array.from(mapaCat.entries()).map(([name, value]) => ({ name, value }));
      } else {
        const anoIni = dataInicio.getFullYear();
        const anoFim = dataFim.getFullYear();
        for (let ano = anoIni; ano <= anoFim; ano++) {
          const oY = orcamentos.filter((o) => new Date(o.createdAt).getFullYear() === ano);
          const pY = projetos.filter((p) => new Date(p.createdAt).getFullYear() === ano);
          const obY = obras.filter((o) => new Date(o.createdAt).getFullYear() === ano);
          const vY = vendas.filter((v) => new Date(v.createdAt).getFullYear() === ano);

          evolucaoOrcamentos.push({
            name: String(ano),
            criados: oY.length,
            aprovados: oY.filter((o) => /aprovado/i.test(o.status || '')).length,
            emAnalise: oY.filter(
              (o) => !/Aprovado|Recusado|Cancelado|Declinado/i.test(o.status || '')
            ).length
          });
          evolucaoOrdensServico.push(
            agregarOsBucket(pY, progressoMapOs, String(ano)),
          );
          evolucaoObrasKanban.push({
            name: String(ano),
            backlog: obY.filter((o) => o.status === 'BACKLOG').length,
            aFazer: obY.filter((o) => o.status === 'A_FAZER').length,
            andamento: obY.filter((o) => o.status === 'ANDAMENTO').length,
            concluidas: obY.filter((o) => o.status === 'CONCLUIDO').length
          });
          evolucaoPedidosVendas.push({
            name: String(ano),
            quantidade: vY.length,
            valor: vY.reduce((s, v) => s + (v.valorTotal || 0), 0)
          });
          comparativoMensal.push({
            name: String(ano),
            orcamentos: oY.length,
            ordensServico: pY.length,
            obras: obY.length,
            pedidosVendas: vY.length
          });
        }
        const mapaCat = new Map<string, number>();
        vendas.forEach((v) => {
          const k = (v.formaPagamento && v.formaPagamento.trim()) || 'Não informado';
          mapaCat.set(k, (mapaCat.get(k) || 0) + 1);
        });
        categoriasVendas = Array.from(mapaCat.entries()).map(([name, value]) => ({ name, value }));
      }

      res.status(200).json({
        success: true,
        data: {
          periodo,
          evolucaoOrcamentos,
          evolucaoOrdensServico,
          evolucaoObrasKanban,
          evolucaoPedidosVendas,
          comparativoMensal,
          categoriasVendas
        }
      });
    } catch (error: any) {
      console.error('Erro ao buscar gráficos executivo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar gráficos executivo',
        error: error.message
      });
    }
  }

  private static fillBucketOrcamentos(
    orcamentos: { createdAt: Date; status: string }[],
    b: { start: Date; end: Date; label: string }
  ) {
    const oB = orcamentos.filter((o) => inRange(o.createdAt, b));
    return {
      name: b.label,
      criados: oB.length,
      aprovados: oB.filter((o) => /aprovado/i.test(o.status || '')).length,
      emAnalise: oB.filter((o) => !/Aprovado|Recusado|Cancelado|Declinado/i.test(o.status || '')).length
    };
  }

  private static fillBucketProjetos(
    projetos: { createdAt: Date; status: string }[],
    b: { start: Date; end: Date; label: string }
  ) {
    const pB = projetos.filter((p) => inRange(p.createdAt, b));
    return {
      name: b.label,
      concluidas: pB.filter((p) => p.status === 'CONCLUIDO').length,
      emAndamento: pB.filter((p) => p.status === 'EXECUCAO').length,
      planejadas: pB.filter((p) =>
        ['PROPOSTA', 'VALIDADO', 'APROVADO'].includes(String(p.status))
      ).length
    };
  }

  private static fillBucketObras(
    obras: { createdAt: Date; status: string }[],
    b: { start: Date; end: Date; label: string }
  ) {
    const obB = obras.filter((o) => inRange(o.createdAt, b));
    return {
      name: b.label,
      backlog: obB.filter((o) => o.status === 'BACKLOG').length,
      aFazer: obB.filter((o) => o.status === 'A_FAZER').length,
      andamento: obB.filter((o) => o.status === 'ANDAMENTO').length,
      concluidas: obB.filter((o) => o.status === 'CONCLUIDO').length
    };
  }

  private static fillBucketVendas(
    vendas: { createdAt: Date; valorTotal: number }[],
    b: { start: Date; end: Date; label: string }
  ) {
    const vB = vendas.filter((v) => inRange(v.createdAt, b));
    return {
      name: b.label,
      quantidade: vB.length,
      valor: vB.reduce((s, v) => s + (v.valorTotal || 0), 0)
    };
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
