import { PrismaClient, ProjetoStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class ProjetosService {
  /**
   * Cria Projeto a partir de um Orçamento, aprova o orçamento
   */
  async criarProjetoAPartirDoOrcamento(orcamentoId: string) {
    // Verifica orçamento
    const orcamento = await prisma.orcamento.findUnique({ where: { id: orcamentoId } });
    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    // Aprovar orçamento se necessário
    if (orcamento.status !== 'Aprovado') {
      await prisma.orcamento.update({ where: { id: orcamentoId }, data: { status: 'Aprovado', aprovedAt: new Date() } });
    }

    // Evitar duplicidade
    const existente = await prisma.projeto.findUnique({ where: { orcamentoId } });
    if (existente) {
      return existente;
    }

    // Criar projeto com status PROPOSTA
    const projeto = await prisma.projeto.create({
      data: {
        orcamentoId,
        clienteId: orcamento.clienteId,
        titulo: orcamento.titulo,
        descricao: orcamento.descricao ?? undefined,
        valorTotal: orcamento.precoVenda,
        status: ProjetoStatus.PROPOSTA
      }
    });


    return projeto;
  }

  /** Atualiza status do projeto; ao mudar para EXECUCAO, cria Obra/Alocação e gera alerta lógico */
  async atualizarStatus(projetoId: string, novoStatus: ProjetoStatus) {
    const projeto = await prisma.projeto.findUnique({ 
      where: { id: projetoId },
      include: {
        orcamento: {
          include: {
            items: {
              include: {
                material: true
              }
            }
          }
        }
      }
    });
    
    if (!projeto) throw new Error('Projeto não encontrado');

    const updateData: any = { status: novoStatus };
    if (novoStatus === 'CONCLUIDO') {
      updateData.dataFim = new Date();
    }

    // 🔍 SE MUDAR PARA APROVADO, VERIFICAR ESTOQUE E DAR BAIXA
    if (novoStatus === 'APROVADO' && projeto.status !== 'APROVADO') {
      console.log('🔍 Validando aprovação do projeto - Verificando estoque...');
      
      if (!projeto.orcamento) {
        throw new Error('Projeto sem orçamento vinculado');
      }

      const itemsFrios: any[] = [];
      const itemsReservados: any[] = [];

      // Verificar estoque de todos os items
      for (const item of projeto.orcamento.items) {
        if (item.tipo === 'MATERIAL' && item.materialId) {
          const material = await prisma.material.findUnique({
            where: { id: item.materialId }
          });

          if (!material) {
          itemsFrios.push({
            nome: (item as any).nome || 'Material não identificado',
            quantidade: item.quantidade,
            motivo: 'Material não encontrado no catálogo'
          });
          } else if (material.estoque < item.quantidade) {
            itemsFrios.push({
              materialId: material.id,
              nome: material.nome,
              sku: material.sku,
              quantidadeNecessaria: item.quantidade,
              quantidadeDisponivel: material.estoque,
              quantidadeFaltante: item.quantidade - material.estoque
            });
          } else {
            itemsReservados.push({
              materialId: material.id,
              nome: material.nome,
              quantidade: item.quantidade,
              estoqueAtual: material.estoque
            });
          }
        }
      }

      // ❌ BLOQUEAR APROVAÇÃO SE TIVER ITEMS FRIOS
      if (itemsFrios.length > 0) {
        console.log(`❄️ BLOQUEADO: ${itemsFrios.length} item(ns) sem estoque`);
        const listaItems = itemsFrios.map(i => 
          `• ${i.nome}${i.sku ? ` (${i.sku})` : ''} - Faltam: ${i.quantidadeFaltante || i.quantidadeNecessaria} unidades`
        ).join('\n');
        
        throw new Error(
          `⚠️ APROVAÇÃO BLOQUEADA!\n\n` +
          `${itemsFrios.length} item(ns) sem estoque suficiente:\n${listaItems}\n\n` +
          `📦 Realize a compra dos materiais antes de aprovar o projeto.`
        );
      }

      // ✅ DAR BAIXA NO ESTOQUE (Reservar materiais)
      console.log(`✅ Todos os ${itemsReservados.length} items disponíveis. Dando baixa no estoque...`);
      
      for (const item of itemsReservados) {
        await prisma.material.update({
          where: { id: item.materialId },
          data: {
            estoque: {
              decrement: item.quantidade
            }
          }
        });

        // Registrar movimentação de estoque
        await prisma.movimentacaoEstoque.create({
          data: {
            materialId: item.materialId,
            tipo: 'SAIDA',
            quantidade: item.quantidade,
            motivo: `Reserva para projeto: ${projeto.titulo}`,
            referencia: projeto.id
          }
        });

        console.log(`✅ Baixa realizada: ${item.nome} - ${item.quantidade} unidades`);
      }

      console.log(`✅ Estoque atualizado! ${itemsReservados.length} materiais reservados.`);
    }

    const atualizado = await prisma.projeto.update({ where: { id: projetoId }, data: updateData });

    // Regra "Gerar Obra"
    if (novoStatus === 'EXECUCAO') {
      // 🔍 VALIDAR ESTOQUE ANTES DE PERMITIR EXECUÇÃO
      console.log('🔍 Validando estoque antes de iniciar execução...');
      
      if (!projeto.orcamento) {
        throw new Error('Projeto sem orçamento vinculado');
      }

      const materiaisFaltantes: any[] = [];

      // Verificar estoque de todos os items do orçamento
      for (const item of projeto.orcamento.items) {
        // Pular itens do tipo SERVIÇO, QUADRO_PRONTO e CUSTO_EXTRA - não precisam de estoque
        if (item.tipo === 'SERVICO' || item.tipo === 'QUADRO_PRONTO' || item.tipo === 'CUSTO_EXTRA') {
          continue;
        }
        
        // Verificar materiais diretos
        if (item.tipo === 'MATERIAL' && item.materialId) {
          const material = await prisma.material.findUnique({
            where: { id: item.materialId }
          });

          if (!material || material.estoque < item.quantidade) {
            materiaisFaltantes.push({
              nome: material?.nome || 'Material desconhecido',
              necessario: item.quantidade,
              disponivel: material?.estoque || 0,
              falta: item.quantidade - (material?.estoque || 0)
            });
          }
        }
        
        // Verificar itens de KITS
        if (item.tipo === 'KIT' && item.kitId) {
          const kit = await prisma.kit.findUnique({
            where: { id: item.kitId },
            include: {
              items: {
                include: {
                  material: true
                }
              }
            }
          });

          if (kit) {
            // Verificar itens do banco frio do kit (apenas cotações, não serviços)
            // IMPORTANTE: Serviços não precisam de estoque e não devem ser validados aqui
            // Cotações só serão validadas quando vinculadas a um produto do estoque na ordem de serviço
            if (kit.temItensCotacao && kit.itensFaltantes) {
              const itensFrios = Array.isArray(kit.itensFaltantes) ? kit.itensFaltantes : [];
              // Filtrar apenas cotações (excluir serviços)
              const cotacoes = itensFrios.filter((item: any) => item.tipo === 'COTACAO' || (!item.tipo && !item.servicoId));
              
              // NOTA: Cotações não devem ser validadas aqui, apenas na ordem de serviço
              // quando forem vinculadas a um produto do estoque através do campo "localizar"
              // Por enquanto, apenas registramos que existem cotações, mas não validamos estoque
              // A validação acontecerá quando o item de cotação for vinculado a um material do estoque
            }

            // Verificar materiais reais do kit
            for (const kitItem of kit.items) {
              const necessario = kitItem.quantidade * item.quantidade;
              if (kitItem.material.estoque < necessario) {
                materiaisFaltantes.push({
                  nome: `${kitItem.material.nome} (do kit ${kit.nome})`,
                  necessario,
                  disponivel: kitItem.material.estoque,
                  falta: necessario - kitItem.material.estoque
                });
              }
            }
          }
        }

        // Verificar itens diretos de COTACAO
        if (item.tipo === 'COTACAO') {
          // Buscar cotação se necessário
          const cotacao = item.cotacaoId ? await prisma.cotacao.findUnique({
            where: { id: item.cotacaoId },
            select: { nome: true }
          }) : null;
          
          materiaisFaltantes.push({
            nome: cotacao?.nome || item.descricao || 'Item de cotação',
            necessario: item.quantidade,
            disponivel: 0,
            falta: item.quantidade,
            bancoFrio: true
          });
        }
      }

      // Se há materiais faltantes, BLOQUEAR execução
      if (materiaisFaltantes.length > 0) {
        const mensagem = `EXECUÇÃO BLOQUEADA! Há ${materiaisFaltantes.length} item(ns) sem estoque suficiente:\n\n` +
          materiaisFaltantes.map(m => 
            `• ${m.nome}\n  Necessário: ${m.necessario} | Disponível: ${m.disponivel} | Falta: ${m.falta}${m.bancoFrio ? ' (⚠️ Banco Frio - precisa comprar)' : ''}`
          ).join('\n\n');
        
        console.error('❌ Execução bloqueada por falta de materiais:', materiaisFaltantes);
        throw new Error(mensagem);
      }

      console.log('✅ Estoque validado - Permitindo execução');

      // NÃO criar alocação automática - o usuário deve alocar equipe/eletricista manualmente
      // A alocação será criada quando o usuário escolher uma equipe ou eletricista na página de Obras

      // "Gerar Alerta" de necessidade de alocação: persistimos como campo observacional em Etapa/Projeto
      await prisma.projeto.update({
        where: { id: projetoId },
        data: { descricao: `${atualizado.descricao ?? ''}\n[ALERTA] necessidade_alocacao: atribuir equipe ao projeto.` }
      });
    }

    return atualizado;
  }

  // REMOVIDO: criarEquipePlaceholder - equipes devem ser criadas manualmente pelo usuário

  /** Lista projetos com filtros e, opcionalmente, formato kanban */
  async listarProjetos(filtros: any, modo: 'lista' | 'kanban' = 'lista') {
    const where: any = {};
    if (filtros.status) where.status = filtros.status;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.responsavelId) where.tasks = { some: { responsavel: filtros.responsavelId } };

    const projetos = await prisma.projeto.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true } },
        orcamento: { select: { id: true, precoVenda: true, status: true } },
        alocacoes: true,
        tasks: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (modo === 'kanban') {
      const grupos: Record<string, any[]> = {
        PROPOSTA: [],
        APROVADO: [],
        EXECUCAO: [],
        CONCLUIDO: []
      };
      for (const p of projetos) {
        const key = (p.status as unknown as ProjetoStatus) || 'PROPOSTA';
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(p);
      }
      return grupos;
    }

    return projetos;
  }

}

export const projetosService = new ProjetosService();


