import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Listar orçamentos
export const getOrcamentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, clienteId } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;

    const orcamentos = await prisma.orcamento.findMany({
      where,
      include: {
        cliente: {
          select: { id: true, nome: true, cpfCnpj: true }
        },
        items: {
          include: {
            material: { select: { id: true, nome: true, sku: true, valorVenda: true, preco: true } },
            kit: { select: { id: true, nome: true } },
            cotacao: { select: { id: true, nome: true, dataAtualizacao: true, fornecedorNome: true } } // ✅ NOVO
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orcamentos);
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
};

// Buscar orçamento por ID
export const getOrcamentoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        cliente: true,
        items: {
          include: {
            material: true,
            kit: {
              include: {
                items: {
                  include: { material: true }
                }
              }
            },
            cotacao: true // ✅ NOVO: Incluir dados da cotação
          }
        },
        projeto: true
      }
    });

    if (!orcamento) {
      res.status(404).json({ error: 'Orçamento não encontrado' });
      return;
    }

    res.json(orcamento);
  } catch (error) {
    console.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamento' });
  }
};

// Obter próximo número sequencial de orçamento (apenas informativo)
export const getProximoNumeroOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    const ultimo = await prisma.orcamento.findFirst({
      orderBy: { numeroSequencial: 'desc' },
      select: { numeroSequencial: true }
    });

    const proximoNumero = (ultimo?.numeroSequencial || 0) + 1;

    res.json({
      proximoNumero
    });
  } catch (error) {
    console.error('Erro ao obter próximo número de orçamento:', error);
    res.status(500).json({ error: 'Erro ao obter próximo número de orçamento' });
  }
};

// Criar orçamento
export const createOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      clienteId,
      titulo,
      descricao,
      descricaoProjeto,
      validade,
      bdi,
      items,
      observacoes,
      // Novos campos
      empresaCNPJ,
      enderecoObra,
      cidade,
      bairro,
      cep,
      responsavelObra,
      previsaoInicio,
      previsaoTermino,
      descontoValor,
      impostoPercentual,
      condicaoPagamento
    } = req.body;

    // Calcular custo total e preço de venda
    let custoTotal = 0;
    const itemsData = [];

    for (const item of items) {
      let custoUnit = item.custoUnit;
      let precoVendaUnit = item.custoUnit; // Preço de venda unitário (valorVenda || preco)
      
      // Se for material, buscar valorVenda se disponível
      if (item.tipo === 'MATERIAL' && item.materialId) {
        const material = await prisma.material.findUnique({
          where: { id: item.materialId },
          select: { preco: true, valorVenda: true }
        });
        
        if (material) {
          // Usar valorVenda se disponível, senão usar preco (preço de compra)
          precoVendaUnit = material.valorVenda || material.preco || 0;
          custoUnit = material.preco || 0; // Custo sempre é o preço de compra
        }
      }
      
      // Se for kit, calcular custo baseado nos materiais
      if (item.tipo === 'KIT' && item.kitId) {
        const kit = await prisma.kit.findUnique({
          where: { id: item.kitId },
          include: {
            items: {
              include: { 
                material: {
                  select: { preco: true, valorVenda: true }
                }
              }
            }
          }
        });
        
        if (kit) {
          // Calcular custo total (soma dos preços de compra dos materiais do estoque real)
          const custoTotalKit = kit.items.reduce((sum, kitItem) => 
            sum + (kitItem.material.preco || 0) * kitItem.quantidade, 0
          );
          
          // Calcular preço de venda total (soma dos valorVenda || preco dos materiais do estoque real)
          let precoVendaTotalKit = kit.items.reduce((sum, kitItem) => {
            const precoVendaItem = kitItem.material.valorVenda || kitItem.material.preco || 0;
            return sum + precoVendaItem * kitItem.quantidade;
          }, 0);
          
          // IMPORTANTE: Incluir itens do banco frio no cálculo do preço de venda
          if (kit.itensFaltantes) {
            let itensFaltantesArray: any[] = [];
            // Processar itensFaltantes (pode vir como JSON string, array ou objeto)
            if (typeof kit.itensFaltantes === 'string') {
              try {
                const parsed = JSON.parse(kit.itensFaltantes);
                itensFaltantesArray = Array.isArray(parsed) ? parsed : [parsed];
              } catch (e) {
                console.error('Erro ao fazer parse de itensFaltantes:', e);
                itensFaltantesArray = [];
              }
            } else if (Array.isArray(kit.itensFaltantes)) {
              itensFaltantesArray = kit.itensFaltantes;
            } else if (typeof kit.itensFaltantes === 'object' && kit.itensFaltantes !== null) {
              itensFaltantesArray = [kit.itensFaltantes];
            }
            
            // Somar preços dos itens do banco frio
            const precoVendaBancoFrio = itensFaltantesArray.reduce((sum: number, itemBancoFrio: any) => {
              const precoUnit = itemBancoFrio.precoUnit || itemBancoFrio.preco || itemBancoFrio.valorUnitario || 0;
              const quantidade = itemBancoFrio.quantidade || 0;
              return sum + (precoUnit * quantidade);
            }, 0);
            precoVendaTotalKit += precoVendaBancoFrio;
          }
          
          custoUnit = custoTotalKit;
          precoVendaUnit = precoVendaTotalKit;
        }
      }

      const subtotal = custoUnit * item.quantidade;
      const precoUnit = precoVendaUnit * (1 + (bdi || 0) / 100);
      
      custoTotal += subtotal;

      itemsData.push({
        tipo: item.tipo,
        materialId: item.materialId,
        kitId: item.kitId,
        cotacaoId: item.cotacaoId, // ✅ Incluir cotacaoId para itens do banco frio
        servicoNome: item.servicoNome,
        descricao: item.descricao,
        quantidade: item.quantidade,
        custoUnit,
        precoUnit,
        subtotal: precoUnit * item.quantidade,
        // ✅ NOVOS CAMPOS: Conversão de unidades (opcionais, compatível com dados existentes)
        unidadeVenda: item.unidadeVenda || null,
        tipoMaterial: item.tipoMaterial || null
      });
    }

    // NOVA LÓGICA DE CÁLCULO:
    // 1. Subtotal com BDI aplicado aos itens
    const subtotalComBDI = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    
    // 2. Aplicar desconto
    const valorComDesconto = subtotalComBDI - (descontoValor || 0);
    
    // 3. Aplicar impostos
    const precoVenda = valorComDesconto * (1 + (impostoPercentual || 0) / 100);

    const orcamento = await prisma.orcamento.create({
      data: {
        clienteId,
        titulo,
        descricao,
        descricaoProjeto,
        validade: new Date(validade),
        bdi: bdi || 0,
        custoTotal,
        precoVenda,
        observacoes,
        // Novos campos
        empresaCNPJ,
        enderecoObra,
        cidade,
        bairro,
        cep,
        responsavelObra,
        previsaoInicio: previsaoInicio ? new Date(previsaoInicio) : null,
        previsaoTermino: previsaoTermino ? new Date(previsaoTermino) : null,
        descontoValor: descontoValor || 0,
        impostoPercentual: impostoPercentual || 0,
        condicaoPagamento,
        items: {
          create: itemsData
        }
      },
      include: {
        cliente: true,
        items: {
          include: {
            material: true,
            kit: true,
            cotacao: { select: { id: true, nome: true, dataAtualizacao: true, fornecedorNome: true } } // ✅ Incluir cotação
          }
        },
        fotos: true
      }
    });

    res.status(201).json(orcamento);
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
};

// Atualizar status do orçamento
export const updateOrcamentoStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!orcamento) {
      res.status(404).json({ error: 'Orçamento não encontrado' });
      return;
    }

    // Se aprovado, criar ou atualizar projeto automaticamente
    let projeto = null;
    if (status === 'Aprovado' && orcamento.status !== 'Aprovado') {
      // Verificar se já existe um projeto vinculado
      const projetoExistente = await prisma.projeto.findUnique({
        where: { orcamentoId: id }
      });

      if (projetoExistente) {
        // Se já existe, apenas atualizar o status
        console.log(`📋 Projeto existente encontrado: ${projetoExistente.id}. Atualizando status para APROVADO`);
        projeto = await prisma.projeto.update({
          where: { id: projetoExistente.id },
          data: { status: 'APROVADO' }
        });
      } else {
        // Se não existe, criar novo projeto
        console.log(`📋 Criando novo projeto para orçamento ${id}`);
        projeto = await prisma.projeto.create({
          data: {
            orcamentoId: id,
            clienteId: orcamento.clienteId,
            titulo: orcamento.titulo,
            descricao: orcamento.descricao,
            valorTotal: orcamento.precoVenda,
            dataInicio: new Date(),
            status: 'APROVADO' // Projeto começa como APROVADO (ainda não em execução)
          }
        });
      }
    }

    const orcamentoAtualizado = await prisma.orcamento.update({
      where: { id },
      data: {
        status,
        aprovedAt: status === 'Aprovado' ? new Date() : orcamento.aprovedAt
      },
      include: {
        cliente: true,
        items: true,
        projeto: true
      }
    });

    res.json({ orcamento: orcamentoAtualizado, projeto });
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar orçamento' });
  }
};

// Aprovar orçamento
export const aprovarOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: true
          }
        }
      }
    });

    if (!orcamento) {
      res.status(404).json({
        success: false,
        error: 'Orçamento não encontrado'
      });
      return;
    }

    if (orcamento.status === 'Aprovado') {
      res.status(400).json({
        success: false,
        error: 'Orçamento já está aprovado'
      });
      return;
    }

    // 🔍 VERIFICAR ESTOQUE - Identificar items frios
    console.log('🔍 Verificando disponibilidade de estoque...');
    const itemsFrios: any[] = [];
    const itemsDisponiveis: any[] = [];

    for (const item of orcamento.items) {
      if (item.tipo === 'MATERIAL' && item.materialId) {
        const material = await prisma.material.findUnique({
          where: { id: item.materialId }
        });

        if (!material) {
          itemsFrios.push({
            id: item.id,
            nome: (item as any).nome || 'Material não identificado',
            quantidade: item.quantidade,
            motivo: 'Material não encontrado no catálogo'
          });
        } else if (material.estoque < item.quantidade) {
          itemsFrios.push({
            id: item.id,
            materialId: material.id,
            nome: material.nome,
            sku: material.sku,
            quantidadeNecessaria: item.quantidade,
            quantidadeDisponivel: material.estoque,
            quantidadeFaltante: item.quantidade - material.estoque,
            motivo: 'Estoque insuficiente'
          });
        } else {
          itemsDisponiveis.push({
            id: item.id,
            materialId: material.id,
            nome: material.nome,
            quantidade: item.quantidade,
            estoqueDisponivel: material.estoque
          });
        }
      }
    }

    console.log(`✅ Items disponíveis: ${itemsDisponiveis.length}`);
    console.log(`❄️ Items frios (sem estoque): ${itemsFrios.length}`);

    // Verificar se já existe um projeto vinculado
    const projetoExistente = await prisma.projeto.findUnique({
      where: { orcamentoId: id }
    });

    let projeto = null;
    if (projetoExistente) {
      // Se já existe, atualizar o status para PROPOSTA e adicionar flag de items frios
      console.log(`📋 Atualizando projeto existente ${projetoExistente.id} para PROPOSTA`);
      projeto = await prisma.projeto.update({
        where: { id: projetoExistente.id },
        data: { 
          status: 'PROPOSTA' // ⚠️ PROPOSTA até que items frios sejam resolvidos
        }
      });
    } else {
      // Se não existe, criar novo projeto com status PROPOSTA
      console.log(`📋 Criando novo projeto para orçamento ${id} com status PROPOSTA`);
      projeto = await prisma.projeto.create({
        data: {
          orcamentoId: id,
          clienteId: orcamento.clienteId,
          titulo: orcamento.titulo,
          descricao: orcamento.descricao,
          valorTotal: orcamento.precoVenda,
          dataInicio: new Date(),
          status: 'PROPOSTA' // ⚠️ Projeto começa como PROPOSTA
        }
      });
    }

    const orcamentoAtualizado = await prisma.orcamento.update({
      where: { id },
      data: {
        status: 'Aprovado',
        aprovedAt: new Date()
      },
      include: {
        cliente: {
          select: { id: true, nome: true }
        },
        items: {
          include: {
            material: true
          }
        },
        projeto: true
      }
    });

    res.json({
      success: true,
      data: orcamentoAtualizado,
      projeto: projeto,
      itemsFrios: itemsFrios,
      itemsDisponiveis: itemsDisponiveis,
      message: itemsFrios.length > 0 
        ? `⚠️ Orçamento aprovado! ATENÇÃO: ${itemsFrios.length} item(ns) sem estoque. O projeto foi criado, mas sua aprovação está bloqueada até a compra dos materiais.`
        : `✅ Orçamento aprovado com sucesso! Projeto criado e pronto para aprovação.`
    });
  } catch (error) {
    console.error('Erro ao aprovar orçamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao aprovar orçamento'
    });
  }
};

// Recusar orçamento
export const recusarOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const orcamento = await prisma.orcamento.findUnique({
      where: { id }
    });

    if (!orcamento) {
      res.status(404).json({
        success: false,
        error: 'Orçamento não encontrado'
      });
      return;
    }

    if (orcamento.status === 'Recusado') {
      res.status(400).json({
        success: false,
        error: 'Orçamento já está recusado'
      });
      return;
    }

    const orcamentoAtualizado = await prisma.orcamento.update({
      where: { id },
      data: {
        status: 'Recusado',
        recusadoAt: new Date(),
        motivoRecusa: motivo || null
      },
      include: {
        cliente: {
          select: { id: true, nome: true }
        },
        items: true
      }
    });

    res.json({
      success: true,
      data: orcamentoAtualizado,
      message: 'Orçamento recusado'
    });
  } catch (error) {
    console.error('Erro ao recusar orçamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao recusar orçamento'
    });
  }
};

// Atualizar orçamento completo
export const updateOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      clienteId,
      titulo,
      descricao,
      descricaoProjeto,
      validade,
      bdi,
      items,
      observacoes,
      empresaCNPJ,
      enderecoObra,
      cidade,
      bairro,
      cep,
      responsavelObra,
      previsaoInicio,
      previsaoTermino,
      descontoValor,
      impostoPercentual,
      condicaoPagamento
    } = req.body;

    console.log('🔄 Atualizando orçamento:', id);
    console.log('📦 Dados recebidos:', req.body);

    // Verificar se orçamento existe
    const orcamentoExistente = await prisma.orcamento.findUnique({
      where: { id },
      include: { 
        items: {
          include: {
            material: true,
            kit: true
          }
        }
      }
    });

    if (!orcamentoExistente) {
      res.status(404).json({
        success: false,
        error: 'Orçamento não encontrado'
      });
      return;
    }

    // Recalcular totais se items foram fornecidos
    let custoTotal = orcamentoExistente.custoTotal;
    let precoVenda = orcamentoExistente.precoVenda;
    let itemsData: any[] = [];

    if (items && items.length > 0) {
      custoTotal = 0;

      for (const item of items) {
        let custoUnit = item.custoUnit || 0;
        
        // Se for kit, calcular custo baseado nos materiais
        if (item.tipo === 'KIT' && item.kitId) {
          const kit = await prisma.kit.findUnique({
            where: { id: item.kitId },
            include: {
              items: {
                include: { material: true }
              }
            }
          });
          
          if (kit) {
            custoUnit = kit.items.reduce((sum, kitItem) => 
              sum + (kitItem.material.preco || 0) * kitItem.quantidade, 0
            );
          }
        }

        const subtotal = custoUnit * item.quantidade;
        const precoUnit = custoUnit * (1 + (bdi || orcamentoExistente.bdi || 0) / 100);
        
        custoTotal += subtotal;

        itemsData.push({
          tipo: item.tipo,
          materialId: item.materialId,
          kitId: item.kitId,
          cotacaoId: item.cotacaoId, // ✅ Incluir cotacaoId para itens do banco frio
          servicoNome: item.servicoNome,
          descricao: item.descricao,
          quantidade: item.quantidade,
          custoUnit,
          precoUnit,
          subtotal: precoUnit * item.quantidade,
          // ✅ NOVOS CAMPOS: Conversão de unidades (opcionais, compatível com dados existentes)
          unidadeVenda: item.unidadeVenda || null,
          tipoMaterial: item.tipoMaterial || null
        });
      }

      // Recalcular preço de venda
      const subtotalComBDI = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
      const valorComDesconto = subtotalComBDI - (descontoValor || orcamentoExistente.descontoValor || 0);
      precoVenda = valorComDesconto * (1 + (impostoPercentual || orcamentoExistente.impostoPercentual || 0) / 100);
    }

    // Preparar dados de atualização
    const updateData: any = {
      titulo: titulo || orcamentoExistente.titulo,
      descricao: descricao !== undefined ? descricao : orcamentoExistente.descricao,
      descricaoProjeto: descricaoProjeto !== undefined ? descricaoProjeto : orcamentoExistente.descricaoProjeto,
      observacoes: observacoes !== undefined ? observacoes : orcamentoExistente.observacoes,
      validade: validade ? new Date(validade) : orcamentoExistente.validade,
      bdi: bdi !== undefined ? bdi : orcamentoExistente.bdi,
      custoTotal,
      precoVenda,
      empresaCNPJ: empresaCNPJ !== undefined ? empresaCNPJ : orcamentoExistente.empresaCNPJ,
      enderecoObra: enderecoObra !== undefined ? enderecoObra : orcamentoExistente.enderecoObra,
      cidade: cidade !== undefined ? cidade : orcamentoExistente.cidade,
      bairro: bairro !== undefined ? bairro : orcamentoExistente.bairro,
      cep: cep !== undefined ? cep : orcamentoExistente.cep,
      responsavelObra: responsavelObra !== undefined ? responsavelObra : orcamentoExistente.responsavelObra,
      descontoValor: descontoValor !== undefined ? descontoValor : orcamentoExistente.descontoValor,
      impostoPercentual: impostoPercentual !== undefined ? impostoPercentual : orcamentoExistente.impostoPercentual,
      condicaoPagamento: condicaoPagamento !== undefined ? condicaoPagamento : orcamentoExistente.condicaoPagamento,
      previsaoInicio: previsaoInicio ? new Date(previsaoInicio) : orcamentoExistente.previsaoInicio,
      previsaoTermino: previsaoTermino ? new Date(previsaoTermino) : orcamentoExistente.previsaoTermino
    };

    if (clienteId) {
      updateData.clienteId = clienteId;
    }

    // Se items foram fornecidos, deletar os antigos e criar novos
    if (items && items.length > 0) {
      await prisma.orcamentoItem.deleteMany({
        where: { orcamentoId: id }
      });

      updateData.items = {
        create: itemsData
      };
    }

    // Atualizar orçamento
    const orcamentoAtualizado = await prisma.orcamento.update({
      where: { id },
      data: updateData,
      include: {
        cliente: {
          select: { 
            id: true, 
            nome: true, 
            email: true, 
            telefone: true 
          }
        },
        items: {
          include: {
            material: { select: { id: true, nome: true, sku: true } },
            kit: { select: { id: true, nome: true } },
            cotacao: { select: { id: true, nome: true, dataAtualizacao: true, fornecedorNome: true } } // ✅ Incluir cotação
          }
        },
        fotos: true
      }
    });

    console.log('✅ Orçamento atualizado com sucesso');

    res.json({
      success: true,
      data: orcamentoAtualizado,
      message: 'Orçamento atualizado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar orçamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar orçamento'
    });
  }
};

// Excluir orçamento (soft delete ou permanente)
export const deleteOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true para exclusão permanente
    const userRole = (req as any).user?.role?.toLowerCase(); // Role do usuário autenticado

    // Verificar se orçamento existe
    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        projeto: { select: { id: true } },
        items: { select: { id: true } }
      }
    });

    if (!orcamento) {
      res.status(404).json({
        success: false,
        error: 'Orçamento não encontrado'
      });
      return;
    }

    // EXCLUSÃO PERMANENTE (apenas Admin e Desenvolvedor)
    if (permanent === 'true') {
      // Verificar permissões: apenas Admin e Desenvolvedor podem excluir permanentemente
      if (!['admin', 'desenvolvedor', 'administrador'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas Administradores e Desenvolvedores podem excluir orçamentos permanentemente.'
        });
        return;
      }

      // Exclusão permanente - deletar do banco
      // Primeiro deletar os items relacionados
      await prisma.orcamentoItem.deleteMany({
        where: { orcamentoId: id }
      });

      // Depois deletar o orçamento
      await prisma.orcamento.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Orçamento excluído permanentemente do banco de dados'
      });
      return;
    }

    // SOFT DELETE (para outros usuários ou quando não especificado permanent)
    // Verificar se orçamento tem projeto vinculado
    if (orcamento.projeto) {
      res.status(400).json({
        success: false,
        error: 'Não é possível desativar orçamento com projeto vinculado'
      });
      return;
    }

    // Soft delete - marcar como cancelado
    await prisma.orcamento.update({
      where: { id },
      data: { status: 'Cancelado' }
    });

    res.json({
      success: true,
      message: 'Orçamento cancelado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir orçamento'
    });
  }
};

