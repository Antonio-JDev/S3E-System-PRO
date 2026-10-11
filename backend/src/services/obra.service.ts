import { StatusObra } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { EstoqueService } from './estoque.service';
import { ReservaMaterialProjetoService } from './reservaMaterialProjeto.service';
import {
  agruparMateriaisDoOrcamento,
  baixarMapaMateriais,
  vincularMovimentosVendaAoProjeto,
} from './baixaMaterialOrcamento.service';

export interface CreateObraData {
  projetoId: string;
  nomeObra: string;
  dataPrevistaInicio?: Date;
  dataPrevistaFim?: Date;
}

export interface CreateTarefaData {
  descricao: string;
  atribuidoA?: string;
  dataPrevista?: Date;
}

export interface CreateRegistroAtividadeData {
  usuarioId: string;
  descricaoAtividade: string;
  horasTrabalhadas: number;
  observacoes?: string;
}

export interface ObraKanbanData {
  BACKLOG: any[];
  A_FAZER: any[];
  ANDAMENTO: any[];
  CONCLUIDO: any[];
}

export class ObraService {
  /**
   * Busca obra por ID do projeto
   */
  async buscarObraPorProjeto(projetoId: string) {
    try {
      const obra = await prisma.obra.findUnique({
        where: { projetoId },
        include: {
          projeto: {
            include: {
              cliente: { select: { id: true, nome: true } }
            }
          },
          tarefas: {
            include: {
              registrosAtividade: true
            }
          }
        }
      });

      return obra;
    } catch (error) {
      console.error('Erro ao buscar obra por projeto:', error);
      throw new Error('Erro ao buscar obra');
    }
  }

  /**
   * Busca obra por ID
   */
  async buscarObraPorId(obraId: string) {
    try {
      const obra = await prisma.obra.findUnique({
        where: { id: obraId },
        include: {
          projeto: {
            include: {
              cliente: { 
                select: { 
                  id: true, 
                  nome: true,
                  email: true,
                  telefone: true 
                } 
              }
            }
          },
          cliente: {
            select: { 
              id: true, 
              nome: true,
              email: true,
              telefone: true 
            }
          }
        }
      });

      if (!obra) {
        return null;
      }

      // Formatar resposta com informações do cliente
      const clienteNome = obra.cliente?.nome || obra.projeto?.cliente?.nome || 'Cliente não informado';

      return {
        ...obra,
        clienteNome,
        endereco: obra.endereco || '',
        descricao: obra.descricao || obra.projeto?.descricao || ''
      };
    } catch (error) {
      console.error('Erro ao buscar obra por ID:', error);
      throw new Error('Erro ao buscar obra');
    }
  }

  /**
   * Gera uma Obra a partir de um Projeto aprovado.
   * Não bloqueia por falta de estoque: cria a obra e dá baixa parcial do disponível.
   */
  async gerarObraAPartirDoProjeto(projetoId: string, nomeObra?: string) {
    try {
      // Verificar se projeto existe
      const projeto = await prisma.projeto.findUnique({
        where: { id: projetoId },
        include: { cliente: true }
      });

      if (!projeto) {
        throw new Error('Projeto não encontrado');
      }

      // Verificar se já existe obra para este projeto
      const obraExistente = await prisma.obra.findUnique({
        where: { projetoId }
      });

      if (obraExistente) {
        throw new Error('Já existe uma obra para este projeto');
      }

      // Consulta informativa — nunca bloqueia a criação da obra
      console.log('🔍 Verificando disponibilidade de estoque para o projeto (informativo)...');
      const verificacaoEstoque = await EstoqueService.verificarDisponibilidadeProjeto(projetoId);
      const iniciadoSemEstoque = !verificacaoEstoque.disponivel;
      if (iniciadoSemEstoque) {
        console.warn(
          `⚠️ Estoque incompleto (${verificacaoEstoque.itensSemEstoque?.length || 0} item(ns)). Obra será criada com baixa parcial.`
        );
      } else {
        console.log('✅ Estoque suficiente para todos os materiais.');
      }

      // Criar obra
      const obra = await prisma.obra.create({
        data: {
          projetoId,
          nomeObra: nomeObra || `Obra - ${projeto.titulo}`,
          status: 'BACKLOG',
          dataPrevistaInicio: projeto.dataInicio,
          dataPrevistaFim: projeto.dataPrevisao
        },
        include: {
          projeto: {
            include: {
              cliente: true
            }
          }
        }
      });

      // Atualizar status do projeto (e flag se iniciou sem estoque completo)
      await prisma.projeto.update({
        where: { id: projetoId },
        data: {
          status: 'EXECUCAO',
          ...(iniciadoSemEstoque
            ? {
                iniciadoSemEstoque: true,
                iniciadoSemEstoqueEm: new Date(),
              }
            : {}),
        },
      });

      // Material de obra sai aqui. Componente de kit fica reservado até a NF-e.
      // Pedido antigo com baixa na venda não baixa de novo.
      try {
        if (projeto.orcamentoId) {
          const orcamentoParaBaixa = await prisma.orcamento.findUnique({
            where: { id: projeto.orcamentoId },
            select: { baixaEstoqueRealizadaEm: true }
          });
          if (orcamentoParaBaixa?.baixaEstoqueRealizadaEm === 'VENDA') {
            console.log(`[Obra] Baixa do orçamento ${projeto.orcamentoId} já foi realizada no Pedido de Venda antigo. Não realizar baixa ao iniciar obra.`);
            await vincularMovimentosVendaAoProjeto(projeto.orcamentoId, projetoId);
          } else if (orcamentoParaBaixa?.baixaEstoqueRealizadaEm === 'OBRA') {
            console.log(`[Obra] Material de obra do orçamento ${projeto.orcamentoId} já foi baixado.`);
          } else {
            const materiaisObra = await agruparMateriaisDoOrcamento(projeto.orcamentoId, 'obra');
            let consumidas = new Map<string, number>();
            try {
              consumidas = await ReservaMaterialProjetoService.consumirReservasLimitadas({
                projetoId,
                referencia: obra.id,
                motivo: 'OBRA',
                limites: materiaisObra,
                observacao: `Reserva de material de obra consumida ao iniciar obra (projeto ${projetoId})`,
              });
            } catch (reservaErr) {
              console.error('Erro ao consumir reservas do projeto:', reservaErr);
            }

            await baixarMapaMateriais({
              quantidades: materiaisObra,
              descontar: consumidas,
              projetoId,
              referencia: obra.id,
              motivo: 'Alocação para obra',
              observacao: (_nome, qtdBaixa, qtdRestante) =>
                qtdBaixa < qtdRestante
                  ? `Baixa parcial ao gerar obra (projeto ${projetoId}): ${qtdBaixa}/${qtdRestante}`
                  : `Alocação automática ao gerar obra (projeto ${projetoId}, orçamento ${projeto.orcamentoId})`,
            });

            await prisma.orcamento.update({
              where: { id: projeto.orcamentoId },
              data: { baixaEstoqueRealizadaEm: 'OBRA' }
            });
          }
        }
      } catch (alocErr) {
        console.error('Erro ao alocar materiais automaticamente na geração da obra:', alocErr);
        // Importante: não reverter criação da obra por falha de alocação.
      }

      console.log('✅ Obra criada com sucesso:', obra.id);

      return obra;
    } catch (error) {
      console.error('Erro ao gerar obra:', error);
      throw error;
    }
  }

  /**
   * Cria uma Obra de Manutenção (sem projeto vinculado)
   */
  async criarObraManutencao(data: {
    clienteId: string;
    nomeObra: string;
    descricao?: string;
    endereco?: string;
    dataPrevistaInicio?: Date;
    dataPrevistaFim?: Date;
  }) {
    try {
      console.log('🔧 Criando obra de manutenção:', data);

      // Verificar se cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { id: data.clienteId }
      });

      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }

      // Criar obra sem projeto
      const obra = await prisma.obra.create({
        data: {
          projetoId: null, // ✅ Obra de manutenção não tem projeto
          clienteId: data.clienteId, // ✅ Cliente direto
          nomeObra: data.nomeObra,
          descricao: data.descricao || null,
          endereco: data.endereco || null,
          status: 'BACKLOG', // ✅ Inicia no Backlog
          dataPrevistaInicio: data.dataPrevistaInicio || new Date(),
          dataPrevistaFim: data.dataPrevistaFim || null,
          tipoObra: 'MANUTENCAO' // ✅ Marcador de tipo
        },
        include: {
          projeto: {
            include: {
              cliente: true
            }
          },
          cliente: true // ✅ Incluir cliente direto
        }
      });

      console.log('✅ Obra de manutenção criada:', obra.id);

      return obra;
    } catch (error) {
      console.error('Erro ao criar obra de manutenção:', error);
      throw error;
    }
  }

  /**
   * Lista todas as obras agrupadas por status (Kanban)
   */
  async getObrasKanban(): Promise<ObraKanbanData> {
    try {
      const obras = await prisma.obra.findMany({
        include: {
          projeto: {
            include: {
              cliente: { select: { id: true, nome: true } }
            }
          },
          cliente: { select: { id: true, nome: true } }, // ✅ Cliente direto (manutenção)
          tarefas: {
            include: {
              registrosAtividade: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📦 Total de obras encontradas: ${obras.length}`);

      const equipeIds = new Set<string>();
      for (const obra of obras) {
        for (const t of obra.tarefas) {
          if (t.equipeId) equipeIds.add(t.equipeId);
        }
      }

      const equipesPorId = new Map<string, { id: string; nome: string }>();
      if (equipeIds.size > 0) {
        const equipes = await prisma.equipe.findMany({
          where: { id: { in: [...equipeIds] } },
          select: { id: true, nome: true }
        });
        equipes.forEach((e) => equipesPorId.set(e.id, { id: e.id, nome: e.nome }));
      }

      // Agrupar por status
      const kanbanData: ObraKanbanData = {
        BACKLOG: [],
        A_FAZER: [],
        ANDAMENTO: [],
        CONCLUIDO: []
      };

      obras.forEach(obra => {
        // ✅ Cliente pode vir de 2 fontes: projeto.cliente OU cliente direto (manutenção)
        const clienteNome = obra.projeto?.cliente?.nome || obra.cliente?.nome || 'Cliente não informado';

        const primeiraTarefaComEquipe = obra.tarefas.find(t => t.equipeId);
        const equipe = primeiraTarefaComEquipe?.equipeId
          ? equipesPorId.get(primeiraTarefaComEquipe.equipeId)
          : undefined;
        
        const obraFormatada = {
          id: obra.id,
          projetoId: obra.projetoId,
          nomeObra: obra.nomeObra,
          status: obra.status,
          clienteNome, // ✅ Agora funciona para ambos os tipos
          tipoObra: (obra as any).tipoObra || 'PROJETO', // ✅ Identificar tipo
          createdAt: obra.createdAt,
          dataPrevistaInicio: obra.dataPrevistaInicio,
          dataInicioReal: obra.dataInicioReal,
          dataFimReal: obra.dataFimReal,
          dataPrevistaFim: obra.dataPrevistaFim,
          equipe,
          totalTarefas: obra.tarefas.length,
          tarefasConcluidas: obra.tarefas.filter(t => t.progresso === 100).length,
          progresso: obra.tarefas.length > 0 
            ? Math.round(obra.tarefas.reduce((sum, t) => sum + t.progresso, 0) / obra.tarefas.length)
            : 0,
          observacoes: obra.observacoes
        };

        console.log(`📋 Obra: ${obra.nomeObra} → ${obra.status} (Cliente: ${clienteNome})`);
        kanbanData[obra.status].push(obraFormatada);
      });

      console.log(`✅ Kanban organizado:`, {
        BACKLOG: kanbanData.BACKLOG.length,
        A_FAZER: kanbanData.A_FAZER.length,
        ANDAMENTO: kanbanData.ANDAMENTO.length,
        CONCLUIDO: kanbanData.CONCLUIDO.length
      });

      return kanbanData;
    } catch (error) {
      console.error('Erro ao buscar obras kanban:', error);
      throw new Error('Erro ao buscar obras para kanban');
    }
  }

  /**
   * Atualiza o status de uma obra (move no Kanban)
   */
  async updateObraStatus(obraId: string, newStatus: StatusObra) {
    try {
      const obra = await prisma.obra.update({
        where: { id: obraId },
        data: { 
          status: newStatus,
          updatedAt: new Date(),
          // Registrar data de início real quando mudar para ANDAMENTO
          dataInicioReal: newStatus === 'ANDAMENTO' ? new Date() : undefined,
          // Registrar data de fim real quando mudar para CONCLUIDO
          dataFimReal: newStatus === 'CONCLUIDO' ? new Date() : undefined
        },
        include: {
          projeto: {
            include: {
              cliente: true
            }
          }
        }
      });

      // Se concluiu a obra, atualizar status do projeto também (se houver projeto)
      if (newStatus === 'CONCLUIDO' && obra.projetoId) {
        await prisma.projeto.update({
          where: { id: obra.projetoId },
          data: { 
            status: 'CONCLUIDO',
            dataFim: new Date()
          }
        });
        console.log(`✅ Projeto ${obra.projetoId} marcado como CONCLUIDO`);
      } else if (newStatus === 'CONCLUIDO' && !obra.projetoId) {
        console.log(`✅ Obra de manutenção concluída (sem projeto vinculado)`);
      }

      return obra;
    } catch (error) {
      console.error('Erro ao atualizar status da obra:', error);
      throw error;
    }
  }

  /**
   * Busca detalhes de uma tarefa
   */
  async getTarefa(tarefaId: string) {
    try {
      const tarefa = await prisma.tarefaObra.findUnique({
        where: { id: tarefaId },
        include: {
          obra: {
            include: {
              projeto: {
                include: {
                  cliente: true
                }
              }
            }
          },
          registrosAtividade: {
            orderBy: { dataRegistro: 'desc' }
          }
        }
      });

      if (!tarefa) {
        throw new Error('Tarefa não encontrada');
      }

      return tarefa;
    } catch (error) {
      console.error('Erro ao buscar tarefa:', error);
      throw error;
    }
  }

  /**
   * Adiciona um registro de atividade em uma tarefa
   */
  async addRegistroAtividade(tarefaId: string, data: CreateRegistroAtividadeData) {
    try {
      const registro = await prisma.registroAtividade.create({
        data: {
          tarefaId,
          usuarioId: data.usuarioId,
          descricaoAtividade: data.descricaoAtividade,
          horasTrabalhadas: data.horasTrabalhadas,
          observacoes: data.observacoes
        }
      });

      return registro;
    } catch (error) {
      console.error('Erro ao adicionar registro de atividade:', error);
      throw new Error('Erro ao adicionar registro de atividade');
    }
  }

  /**
   * Cria uma nova tarefa em uma obra
   */
  async criarTarefa(obraId: string, data: CreateTarefaData) {
    try {
      const tarefa = await prisma.tarefaObra.create({
        data: {
          obraId,
          descricao: data.descricao,
          atribuidoA: data.atribuidoA,
          dataPrevista: data.dataPrevista
        }
      });

      return tarefa;
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      throw new Error('Erro ao criar tarefa');
    }
  }

  /**
   * Atualiza progresso de uma tarefa
   */
  async atualizarProgressoTarefa(tarefaId: string, progresso: number) {
    try {
      const tarefa = await prisma.tarefaObra.update({
        where: { id: tarefaId },
        data: { 
          progresso: Math.min(100, Math.max(0, progresso)),
          dataConclusaoReal: progresso === 100 ? new Date() : null
        }
      });

      return tarefa;
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
      throw error;
    }
  }

  /**
   * Busca alocação de equipes (para visualização de calendário)
   */
  async getAlocacaoEquipes(dataInicio?: Date, dataFim?: Date) {
    try {
      const where: any = {};

      if (dataInicio || dataFim) {
        where.OR = [
          {
            dataInicio: {
              gte: dataInicio,
              lte: dataFim
            }
          },
          {
            dataFimPrevisto: {
              gte: dataInicio,
              lte: dataFim
            }
          }
        ];
      }

      const alocacoes = await prisma.alocacaoObra.findMany({
        where,
        include: {
          equipe: true,
          projeto: {
            include: {
              cliente: { select: { nome: true } }
            }
          }
        },
        orderBy: { dataInicio: 'asc' }
      });

      return alocacoes;
    } catch (error) {
      console.error('Erro ao buscar alocações:', error);
      throw new Error('Erro ao buscar alocações de equipes');
    }
  }

  /**
   * Remove obra ao reverter status da OS (admin): ignora tarefas em andamento e estorna estoque.
   */
  async deletarObraParaRollback(obraId: string) {
    const obra = await prisma.obra.findUnique({
      where: { id: obraId },
      include: { projeto: true },
    });

    if (!obra) {
      return { removida: false };
    }

    const projetoId = obra.projetoId;

    if (projetoId) {
      const { EstoqueService } = await import('./estoque.service');
      await EstoqueService.estornarBaixaPorObra(obraId, projetoId);
    }

    await prisma.alocacaoEquipe.deleteMany({ where: { obraId } });

    if (projetoId) {
      await prisma.alocacaoObra.deleteMany({ where: { projetoId } });
    }

    await prisma.registroAtividade.deleteMany({
      where: { tarefa: { obraId } },
    });

    await prisma.tarefaObra.deleteMany({ where: { obraId } });

    await prisma.obra.delete({ where: { id: obraId } });

    return { removida: true, projetoId };
  }

  /**
   * Deleta uma obra (apenas admin e desenvolvedor)
   * Remove a obra e todas as suas tarefas e registros relacionados
   */
  async deletarObra(obraId: string) {
    try {
      // Verificar se a obra existe
      const obra = await prisma.obra.findUnique({
        where: { id: obraId },
        include: {
          tarefas: true,
          projeto: true
        }
      });

      if (!obra) {
        throw new Error('Obra não encontrada');
      }

      // Verificar se há tarefas em andamento (tarefas não concluídas)
      const tarefasEmAndamento = obra.tarefas.filter(
        t => !t.dataConclusaoReal && t.progresso < 100
      );

      if (tarefasEmAndamento.length > 0) {
        throw new Error(
          `Não é possível excluir a obra. Existem ${tarefasEmAndamento.length} tarefa(s) em andamento ou pendente(s). Finalize ou cancele as tarefas antes de excluir.`
        );
      }

      await prisma.alocacaoEquipe.deleteMany({ where: { obraId } });

      // Deletar alocações relacionadas ao projeto da obra (se houver)
      if (obra.projetoId) {
        await prisma.alocacaoObra.deleteMany({
          where: {
            projetoId: obra.projetoId
          }
        });
      }

      // Deletar todas as tarefas e seus registros (cascade)
      // O Prisma já cuida disso com onDelete: Cascade no schema
      // Mas vamos deletar explicitamente para garantir
      await prisma.registroAtividade.deleteMany({
        where: {
          tarefa: {
            obraId: obraId
          }
        }
      });

      await prisma.tarefaObra.deleteMany({
        where: {
          obraId: obraId
        }
      });

      // Deletar a obra
      await prisma.obra.delete({
        where: { id: obraId }
      });

      return { success: true, message: 'Obra excluída com sucesso' };
    } catch (error: any) {
      console.error('Erro ao deletar obra:', error);
      throw new Error(error.message || 'Erro ao deletar obra');
    }
  }
}

export default new ObraService();

