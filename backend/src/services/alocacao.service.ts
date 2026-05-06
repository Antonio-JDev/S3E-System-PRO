import { prisma } from '../lib/prisma';

/**
 * Interface para criar uma nova equipe
 */
export interface CriarEquipeDTO {
  nome: string;
  tipo: 'MONTAGEM' | 'CAMPO' | 'DISTINTA';
  membros: string[]; // IDs dos usuários
}

/**
 * Interface para alocar uma equipe a um projeto
 */
export interface AlocarEquipeDTO {
  equipeId: string;
  projetoId: string;
  dataInicio: Date | string;
  duracaoDias: number; // Dias úteis (20 dias/mês)
  observacoes?: string;
}

/**
 * Interface para alocar um eletricista individual a um projeto
 */
export interface AlocarEletricistaDTO {
  eletricistaId: string;
  projetoId: string;
  dataInicio: Date | string;
  duracaoDias: number; // Dias úteis (20 dias/mês)
  observacoes?: string;
}

/**
 * Interface para atualizar uma alocação
 */
export interface AtualizarAlocacaoDTO {
  dataFimReal?: Date | string;
  status?: 'Planejada' | 'EmAndamento' | 'Concluida' | 'Cancelada';
  observacoes?: string;
}

/**
 * Classe de serviço para gestão de equipes e alocações
 */
export class AlocacaoService {
  
  /**
   * Cria uma nova equipe
   */
  async criarEquipe(data: CriarEquipeDTO) {
    // Verificar se já existe uma equipe com o mesmo nome
    const equipeExistente = await prisma.equipe.findUnique({
      where: { nome: data.nome }
    });

    if (equipeExistente) {
      throw new Error(`Já existe uma equipe com o nome "${data.nome}". Por favor, escolha outro nome.`);
    }

    // Filtrar valores nulos, undefined e strings vazias dos membros
    const membrosValidos = (data.membros || []).filter(
      (id: string | null | undefined) => id != null && id !== '' && typeof id === 'string'
    );

    // Validar se os membros existem (só se houver membros válidos)
    if (membrosValidos.length > 0) {
      const membrosExistem = await prisma.user.findMany({
        where: {
          id: { in: membrosValidos }
        }
      });

      if (membrosExistem.length !== membrosValidos.length) {
        throw new Error('Um ou mais membros não foram encontrados');
      }
    }

    // Criar equipe com apenas membros válidos
    const equipe = await prisma.equipe.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        membros: membrosValidos,
        ativa: true
      }
    });

    return equipe;
  }

  /**
   * Lista todas as equipes
   */
  async listarEquipes(apenasAtivas: boolean = true) {
    const equipes = await prisma.equipe.findMany({
      where: apenasAtivas ? { ativa: true } : {},
      orderBy: { nome: 'asc' }
    });

    return equipes;
  }

  /**
   * Busca uma equipe por ID
   */
  async buscarEquipe(id: string) {
    const equipe = await prisma.equipe.findUnique({
      where: { id },
      include: {
        alocacoes: {
          include: {
            projeto: {
              select: {
                id: true,
                titulo: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!equipe) {
      throw new Error('Equipe não encontrada');
    }

    return equipe;
  }

  /**
   * Atualiza uma equipe
   */
  async atualizarEquipe(id: string, data: Partial<CriarEquipeDTO>) {
    // Verificar se a equipe existe
    const equipeExistente = await prisma.equipe.findUnique({
      where: { id }
    });

    if (!equipeExistente) {
      throw new Error('Equipe não encontrada');
    }

    // Se estiver atualizando o nome, verificar se já existe outra equipe com o mesmo nome
    if (data.nome && data.nome !== equipeExistente.nome) {
      const equipeComMesmoNome = await prisma.equipe.findFirst({
        where: {
          nome: data.nome,
          id: { not: id } // Excluir a própria equipe da verificação
        }
      });

      if (equipeComMesmoNome) {
        throw new Error(`Já existe uma equipe com o nome "${data.nome}". Por favor, escolha outro nome.`);
      }
    }

    // Se estiver atualizando membros, validar
    if (data.membros && Array.isArray(data.membros)) {
      // Filtrar valores nulos, undefined e strings vazias
      const membrosValidos = data.membros.filter(
        (id: string | null | undefined) => id != null && id !== '' && typeof id === 'string'
      );

      // Só validar se houver membros válidos
      if (membrosValidos.length > 0) {
        const membrosExistem = await prisma.user.findMany({
          where: {
            id: { in: membrosValidos }
          }
        });

        if (membrosExistem.length !== membrosValidos.length) {
          throw new Error('Um ou mais membros não foram encontrados');
        }
      }

      // Atualizar data.membros com apenas os valores válidos
      data.membros = membrosValidos;
    }

    const equipe = await prisma.equipe.update({
      where: { id },
      data
    });

    return equipe;
  }

  /**
   * Desativa uma equipe (soft delete)
   */
  async desativarEquipe(id: string) {
    const alocacoesAtivas = await prisma.alocacaoObra.count({
      where: {
        equipeId: id,
        status: { in: ['Planejada', 'EmAndamento'] }
      }
    });

    if (alocacoesAtivas > 0) {
      throw new Error('Não é possível desativar uma equipe com alocações ativas');
    }

    return prisma.$transaction(async (tx) => {
      const existe = await tx.equipe.findUnique({ where: { id } });
      if (!existe) {
        throw new Error('Equipe não encontrada');
      }

      await tx.tarefaObra.updateMany({
        where: { equipeId: id },
        data: { equipeId: null }
      });

      await tx.alocacaoEquipe.updateMany({
        where: { equipeId: id },
        data: { status: 'CANCELADA' }
      });

      return tx.equipe.update({
        where: { id },
        data: { ativa: false, membros: [] }
      });
    });
  }

  /**
   * Calcula a data fim prevista com base nos dias úteis
   * Considera 20 dias úteis por mês (simplificado)
   */
  private calcularDataFimPrevista(dataInicio: Date, duracaoDias: number): Date {
    const dataFim = new Date(dataInicio);
    let diasAdicionados = 0;

    while (diasAdicionados < duracaoDias) {
      dataFim.setDate(dataFim.getDate() + 1);
      const diaSemana = dataFim.getDay();

      // Pular finais de semana (0 = Domingo, 6 = Sábado)
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAdicionados++;
      }
    }

    return dataFim;
  }

  /**
   * Verifica se há conflito de datas entre alocações
   */
  private verificarConflito(
    inicio1: Date,
    fim1: Date,
    inicio2: Date,
    fim2: Date
  ): boolean {
    // Duas alocações conflitam se:
    // - início1 está entre início2 e fim2
    // - fim1 está entre início2 e fim2
    // - início2 está entre início1 e fim1
    // - fim2 está entre início1 e fim1
    return (
      (inicio1 >= inicio2 && inicio1 <= fim2) ||
      (fim1 >= inicio2 && fim1 <= fim2) ||
      (inicio2 >= inicio1 && inicio2 <= fim1) ||
      (fim2 >= inicio1 && fim2 <= fim1)
    );
  }

  /**
   * Aloca uma equipe a um projeto/obra
   */
  async alocarEquipe(data: AlocarEquipeDTO) {
    // Validar se equipe existe e está ativa
    const equipe = await prisma.equipe.findUnique({
      where: { id: data.equipeId }
    });

    if (!equipe) {
      throw new Error('Equipe não encontrada');
    }

    if (!equipe.ativa) {
      throw new Error('Equipe não está ativa');
    }

    // Validar se projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { id: data.projetoId }
    });

    if (!projeto) {
      throw new Error('Projeto não encontrado');
    }

    // Converter dataInicio para Date se for string
    const dataInicio = typeof data.dataInicio === 'string' 
      ? new Date(data.dataInicio) 
      : data.dataInicio;

    // Calcular data fim prevista
    const dataFimPrevisto = this.calcularDataFimPrevista(dataInicio, data.duracaoDias);

    // Verificar conflitos com outras alocações da mesma equipe
    const alocacoesExistentes = await prisma.alocacaoObra.findMany({
      where: {
        equipeId: data.equipeId,
        status: { in: ['Planejada', 'EmAndamento'] }
      }
    });

    for (const alocacao of alocacoesExistentes) {
      const conflito = this.verificarConflito(
        dataInicio,
        dataFimPrevisto,
        alocacao.dataInicio,
        alocacao.dataFimPrevisto
      );

      if (conflito) {
        throw new Error(
          `Conflito detectado! A equipe já está alocada no período de ${
            alocacao.dataInicio.toLocaleDateString('pt-BR')
          } a ${alocacao.dataFimPrevisto.toLocaleDateString('pt-BR')}`
        );
      }
    }

    // Criar alocação
    const alocacao = await prisma.alocacaoObra.create({
      data: {
        equipeId: data.equipeId,
        projetoId: data.projetoId,
        dataInicio,
        dataFimPrevisto,
        status: 'Planejada',
        observacoes: data.observacoes
      },
      include: {
        equipe: true,
        projeto: {
          select: {
            id: true,
            titulo: true,
            cliente: {
              select: {
                nome: true
              }
            }
          }
        }
      }
    });

    return alocacao;
  }

  /**
   * Aloca um eletricista individual a um projeto/obra
   */
  async alocarEletricista(data: AlocarEletricistaDTO) {
    // Validar se eletricista existe e está ativo
    const eletricista = await prisma.user.findUnique({
      where: { id: data.eletricistaId }
    });

    if (!eletricista) {
      throw new Error('Eletricista não encontrado');
    }

    if (!eletricista.active) {
      throw new Error('Eletricista não está ativo');
    }

    // Verificar se é realmente um eletricista
    if (eletricista.role?.toLowerCase() !== 'eletricista') {
      throw new Error('Usuário não é um eletricista');
    }

    // Validar se projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { id: data.projetoId }
    });

    if (!projeto) {
      throw new Error('Projeto não encontrado');
    }

    // Converter dataInicio para Date se for string
    const dataInicio = typeof data.dataInicio === 'string' 
      ? new Date(data.dataInicio) 
      : data.dataInicio;

    // Calcular data fim prevista
    const dataFimPrevisto = this.calcularDataFimPrevista(dataInicio, data.duracaoDias);

    // Verificar conflitos com outras alocações do mesmo eletricista
    const alocacoesExistentes = await prisma.alocacaoObra.findMany({
      where: {
        eletricistaId: data.eletricistaId,
        status: { in: ['Planejada', 'EmAndamento'] }
      }
    });

    for (const alocacao of alocacoesExistentes) {
      const conflito = this.verificarConflito(
        dataInicio,
        dataFimPrevisto,
        alocacao.dataInicio,
        alocacao.dataFimPrevisto
      );

      if (conflito) {
        throw new Error(
          `Conflito detectado! O eletricista já está alocado no período de ${
            alocacao.dataInicio.toLocaleDateString('pt-BR')
          } a ${alocacao.dataFimPrevisto.toLocaleDateString('pt-BR')}`
        );
      }
    }

    // Criar alocação
    const alocacao = await prisma.alocacaoObra.create({
      data: {
        eletricistaId: data.eletricistaId,
        projetoId: data.projetoId,
        dataInicio,
        dataFimPrevisto,
        status: 'Planejada',
        observacoes: data.observacoes
      },
      include: {
        eletricista: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        projeto: {
          select: {
            id: true,
            titulo: true,
            cliente: {
              select: {
                nome: true
              }
            }
          }
        }
      }
    });

    return alocacao;
  }

  /**
   * Lista todas as alocações (com filtros opcionais)
   */
  async listarAlocacoes(filtros?: {
    equipeId?: string;
    eletricistaId?: string;
    projetoId?: string;
    status?: string;
    dataInicio?: Date;
    dataFim?: Date;
  }) {
    const where: any = {};

    if (filtros?.equipeId) {
      where.equipeId = filtros.equipeId;
    }

    if (filtros?.eletricistaId) {
      where.eletricistaId = filtros.eletricistaId;
    }

    if (filtros?.projetoId) {
      where.projetoId = filtros.projetoId;
    }

    if (filtros?.status) {
      where.status = filtros.status;
    }

    // Filtrar por período
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.AND = [];

      if (filtros.dataInicio) {
        where.AND.push({
          dataFimPrevisto: { gte: filtros.dataInicio }
        });
      }

      if (filtros.dataFim) {
        where.AND.push({
          dataInicio: { lte: filtros.dataFim }
        });
      }
    }

    const alocacoes = await prisma.alocacaoObra.findMany({
      where,
      include: {
        equipe: true,
        projeto: {
          select: {
            id: true,
            titulo: true,
            cliente: {
              select: {
                nome: true
              }
            }
          }
        }
      },
      orderBy: { dataInicio: 'asc' }
    });

    // Buscar eletricistas separadamente se necessário (para evitar erro se relação não existir)
    const eletricistaIds = alocacoes
      .map(a => a.eletricistaId)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const eletricistasMap = new Map<string, any>();
    if (eletricistaIds.length > 0) {
      try {
        const eletricistas = await prisma.user.findMany({
          where: { id: { in: eletricistaIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });
        eletricistas.forEach(e => eletricistasMap.set(e.id, e));
      } catch (error) {
        console.warn('Erro ao buscar eletricistas:', error);
        // Continuar sem eletricistas se houver erro
      }
    }

    // Retornar alocações com eletricistas incluídos
    return alocacoes.map(alocacao => ({
      ...alocacao,
      eletricista: alocacao.eletricistaId && eletricistasMap.has(alocacao.eletricistaId) 
        ? eletricistasMap.get(alocacao.eletricistaId)! 
        : null
    }));
  }

  /**
   * Busca alocações para exibição em calendário
   * Otimizado para frontend de calendário
   */
  async getAlocacoesCalendario(mes: number, ano: number) {
    // Calcular primeiro e último dia do mês
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);

    const alocacoes = await prisma.alocacaoObra.findMany({
      where: {
        OR: [
          {
            // Alocação começa no mês
            dataInicio: { gte: dataInicio, lte: dataFim }
          },
          {
            // Alocação termina no mês
            dataFimPrevisto: { gte: dataInicio, lte: dataFim }
          },
          {
            // Alocação engloba o mês todo
            AND: [
              { dataInicio: { lte: dataInicio } },
              { dataFimPrevisto: { gte: dataFim } }
            ]
          }
        ]
      },
      include: {
        equipe: {
          select: {
            id: true,
            nome: true,
            tipo: true
          }
        },
        projeto: {
          select: {
            id: true,
            titulo: true,
            cliente: {
              select: {
                nome: true
              }
            }
          }
        }
      },
      orderBy: { dataInicio: 'asc' }
    });

    // Buscar eletricistas separadamente se necessário (para evitar erro se relação não existir)
    const eletricistaIds = alocacoes
      .map(a => a.eletricistaId)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const eletricistasMap = new Map<string, any>();
    if (eletricistaIds.length > 0) {
      try {
        const eletricistas = await prisma.user.findMany({
          where: { id: { in: eletricistaIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });
        eletricistas.forEach(e => eletricistasMap.set(e.id, e));
      } catch (error) {
        console.warn('Erro ao buscar eletricistas:', error);
        // Continuar sem eletricistas se houver erro
      }
    }

    // Formatar para calendário
    return alocacoes.map(alocacao => ({
      id: alocacao.id,
      equipeId: alocacao.equipeId,
      eletricistaId: alocacao.eletricistaId,
      projetoId: alocacao.projetoId,
      equipe: alocacao.equipe ? {
        id: alocacao.equipe.id,
        nome: alocacao.equipe.nome,
        tipo: alocacao.equipe.tipo
      } : null,
      eletricista: alocacao.eletricistaId && eletricistasMap.has(alocacao.eletricistaId) ? {
        id: eletricistasMap.get(alocacao.eletricistaId)!.id,
        nome: eletricistasMap.get(alocacao.eletricistaId)!.name,
        email: eletricistasMap.get(alocacao.eletricistaId)!.email,
        role: eletricistasMap.get(alocacao.eletricistaId)!.role
      } : null,
      projeto: {
        id: alocacao.projeto.id,
        titulo: alocacao.projeto.titulo,
        cliente: alocacao.projeto.cliente.nome
      },
      dataInicio: alocacao.dataInicio,
      dataFimPrevisto: alocacao.dataFimPrevisto,
      dataFimReal: alocacao.dataFimReal,
      status: alocacao.status,
      observacoes: alocacao.observacoes
    }));
  }

  /**
   * Retorna equipes disponíveis em um período
   */
  async getEquipesDisponiveis(dataInicio: Date | string, dataFim: Date | string) {
    // Converter para Date se necessário
    const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio;
    const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim;

    // Buscar todas as equipes ativas
    const todasEquipes = await prisma.equipe.findMany({
      where: { ativa: true }
    });

    // Buscar alocações que conflitam com o período
    const alocacoesConflitantes = await prisma.alocacaoObra.findMany({
      where: {
        status: { in: ['Planejada', 'EmAndamento'] },
        OR: [
          {
            AND: [
              { dataInicio: { lte: fim } },
              { dataFimPrevisto: { gte: inicio } }
            ]
          }
        ]
      },
      select: { equipeId: true }
    });

    // IDs das equipes ocupadas
    const equipesOcupadas = new Set(
      alocacoesConflitantes.map(a => a.equipeId)
    );

    // Filtrar equipes disponíveis
    const equipesDisponiveis = todasEquipes.filter(
      equipe => !equipesOcupadas.has(equipe.id)
    );

    return equipesDisponiveis;
  }

  /**
   * Busca uma alocação específica
   */
  async buscarAlocacao(id: string) {
    const alocacao = await prisma.alocacaoObra.findUnique({
      where: { id },
      include: {
        equipe: true,
        projeto: {
          include: {
            cliente: true
          }
        }
      }
    });

    if (!alocacao) {
      throw new Error('Alocação não encontrada');
    }

    return alocacao;
  }

  /**
   * Atualiza uma alocação
   */
  async atualizarAlocacao(id: string, data: AtualizarAlocacaoDTO) {
    // Converter data se for string
    const updateData: any = { ...data };
    
    if (data.dataFimReal && typeof data.dataFimReal === 'string') {
      updateData.dataFimReal = new Date(data.dataFimReal);
    }

    const alocacao = await prisma.alocacaoObra.update({
      where: { id },
      data: updateData,
      include: {
        equipe: true,
        projeto: {
          select: {
            id: true,
            titulo: true,
            cliente: {
              select: {
                nome: true
              }
            }
          }
        }
      }
    });

    return alocacao;
  }

  /**
   * Cancela uma alocação
   */
  async cancelarAlocacao(id: string, motivo?: string) {
    const alocacao = await prisma.alocacaoObra.update({
      where: { id },
      data: {
        status: 'Cancelada',
        observacoes: motivo || 'Alocação cancelada'
      },
      include: {
        equipe: true,
        projeto: true
      }
    });

    return alocacao;
  }

  /**
   * Iniciar uma alocação (mudar status para EmAndamento)
   */
  async iniciarAlocacao(id: string) {
    const alocacao = await prisma.alocacaoObra.findUnique({
      where: { id }
    });

    if (!alocacao) {
      throw new Error('Alocação não encontrada');
    }

    if (alocacao.status !== 'Planejada') {
      throw new Error('Apenas alocações planejadas podem ser iniciadas');
    }

    return await prisma.alocacaoObra.update({
      where: { id },
      data: { status: 'EmAndamento' },
      include: {
        equipe: true,
        projeto: true
      }
    });
  }

  /**
   * Concluir uma alocação
   */
  async concluirAlocacao(id: string, dataFimReal?: Date | string) {
    const alocacao = await prisma.alocacaoObra.findUnique({
      where: { id }
    });

    if (!alocacao) {
      throw new Error('Alocação não encontrada');
    }

    if (alocacao.status === 'Concluida') {
      throw new Error('Alocação já está concluída');
    }

    if (alocacao.status === 'Cancelada') {
      throw new Error('Alocação cancelada não pode ser concluída');
    }

    const dataFim = dataFimReal 
      ? (typeof dataFimReal === 'string' ? new Date(dataFimReal) : dataFimReal)
      : new Date();

    return await prisma.alocacaoObra.update({
      where: { id },
      data: {
        status: 'Concluida',
        dataFimReal: dataFim
      },
      include: {
        equipe: true,
        projeto: true
      }
    });
  }

  /**
   * Estatísticas de alocação
   */
  async getEstatisticas() {
    const totalEquipes = await prisma.equipe.count({ where: { ativa: true } });
    
    const alocacoesAtivas = await prisma.alocacaoObra.count({
      where: { status: { in: ['Planejada', 'EmAndamento'] } }
    });

    const alocacoesConcluidas = await prisma.alocacaoObra.count({
      where: { status: 'Concluida' }
    });

    const equipesOcupadas = await prisma.alocacaoObra.findMany({
      where: { status: 'EmAndamento' },
      select: { equipeId: true },
      distinct: ['equipeId']
    });

    return {
      totalEquipes,
      equipesOcupadas: equipesOcupadas.length,
      equipesDisponiveis: totalEquipes - equipesOcupadas.length,
      alocacoesAtivas,
      alocacoesConcluidas
    };
  }
}

export const alocacaoService = new AlocacaoService();

