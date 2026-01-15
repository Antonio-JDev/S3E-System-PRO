import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';

const prisma = new PrismaClient();

// Configurar multer para upload de JSON
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp/';
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `orcamentos-${Date.now()}-${file.originalname}`);
  }
});

export const uploadJSON = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JSON são permitidos'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB para permitir arquivos grandes com muitos orçamentos
});

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
            material: { select: { id: true, nome: true, sku: true, valorVenda: true, preco: true, ncm: true } },
            kit: { select: { id: true, nome: true } },
            cotacao: { select: { id: true, nome: true, ncm: true, dataAtualizacao: true, fornecedorNome: true } } // ✅ NOVO: Incluir NCM
          }
        }
      },
      orderBy: { createdAt: 'desc' } // Ordenar por data de criação (mais recente primeiro)
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
      let custoUnit = item.custoUnit || 0;
      let precoUnit = 0;
      
      // ✅ PRIORIDADE 1: Se o usuário editou o preço manualmente, usar o valor editado
      if (item.precoUnitario !== undefined && item.precoUnitario !== null) {
        // Usuário editou o valor - usar diretamente (já pode incluir BDI ou não, conforme editado)
        precoUnit = item.precoUnitario;
        console.log(`✅ Usando preço editado pelo usuário: R$ ${precoUnit.toFixed(2)} para item ${item.descricao || item.nome}`);
      } else {
        // ✅ PRIORIDADE 2: Se não foi editado, calcular baseado no estoque/cotações
        let precoVendaUnit = item.custoUnit || 0; // Preço de venda unitário (valorVenda || preco)
        
        // Se for cotação (banco frio), buscar valor da cotação
        if (item.tipo === 'COTACAO' && item.cotacaoId) {
          const cotacao = await prisma.cotacao.findUnique({
            where: { id: item.cotacaoId },
            select: { valorUnitario: true, valorVenda: true }
          });
          
          if (cotacao) {
            // Usar valorVenda se disponível, senão usar valorUnitario
            precoVendaUnit = cotacao.valorVenda || cotacao.valorUnitario || 0;
            custoUnit = cotacao.valorUnitario || 0; // Custo é o valor unitário da cotação
          }
        }
        // Se for material, buscar valorVenda se disponível
        else if (item.tipo === 'MATERIAL' && item.materialId) {
          const material = await prisma.material.findUnique({
            where: { id: item.materialId },
            select: { preco: true, valorVenda: true, valorVendaM: true, valorVendaCM: true, unidadeMedida: true }
          });
          
          if (material) {
            // Determinar preço de venda e custo baseado na unidade de venda
            const unidadeVenda = item.unidadeVenda || material.unidadeMedida;
            const unidadeUpper = (material.unidadeMedida || '').toUpperCase().trim();
            const podeVenderMCM = (unidadeUpper === 'M' || unidadeUpper === 'KG/M' || unidadeUpper === 'M/KG');
            
            if (podeVenderMCM && unidadeVenda === 'm') {
              // Usar valorVendaM se disponível
              precoVendaUnit = material.valorVendaM || material.valorVenda || material.preco || 0;
              custoUnit = material.preco || 0; // Custo em metro é o preço de compra
            } else if (podeVenderMCM && unidadeVenda === 'cm') {
              // Usar valorVendaCM se disponível
              precoVendaUnit = material.valorVendaCM || 
                              (material.valorVendaM ? material.valorVendaM / 100 : 
                              (material.valorVenda ? material.valorVenda / 100 : (material.preco || 0) / 100));
              // Calcular custoCM dividindo preço por 100 (custoCM não está no select, calcular diretamente)
              custoUnit = material.preco ? material.preco / 100 : 0;
            } else {
              // Para outras unidades, usar valorVenda padrão
              precoVendaUnit = material.valorVenda || material.preco || 0;
              custoUnit = material.preco || 0; // Custo padrão
            }
          }
        }
        
        // Se for kit cadastrado (com kitId), calcular custo baseado nos materiais
        // Kits customizados (sem kitId) usam os valores já calculados no frontend (custoUnit e precoUnitario)
        if (item.tipo === 'KIT' && item.kitId) {
          try {
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
            
            if (!kit) {
              console.error(`❌ Kit não encontrado: ${item.kitId}`);
              throw new Error(`Kit não encontrado: ${item.kitId}`);
            }

            if (!kit.items || kit.items.length === 0) {
              console.warn(`⚠️ Kit ${kit.id} não possui itens cadastrados`);
              // Se o kit não tem itens, usar valores padrão ou do item
              custoUnit = item.custoUnit || 0;
              precoVendaUnit = item.precoUnitario || item.custoUnit || 0;
            } else {
              // Calcular custo total (soma dos preços de compra dos materiais do estoque real)
              const custoTotalKit = kit.items.reduce((sum, kitItem) => {
                if (!kitItem.material) {
                  console.warn(`⚠️ KitItem ${kitItem.id} não possui material associado`);
                  return sum;
                }
                return sum + (kitItem.material.preco || 0) * kitItem.quantidade;
              }, 0);
              
              // Calcular preço de venda total (soma dos valorVenda || preco dos materiais do estoque real)
              let precoVendaTotalKit = kit.items.reduce((sum, kitItem) => {
                if (!kitItem.material) {
                  return sum;
                }
                const precoVendaItem = kitItem.material.valorVenda || kitItem.material.preco || 0;
                return sum + precoVendaItem * kitItem.quantidade;
              }, 0);
              
              // IMPORTANTE: Incluir itens do banco frio E serviços no cálculo do preço de venda
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
                
                // Somar preços dos itens do banco frio E serviços
                const precoVendaExtras = itensFaltantesArray.reduce((sum: number, item: any) => {
                  // Incluir tanto cotações (tipo === 'COTACAO') quanto serviços (tipo === 'SERVICO')
                  const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                  const quantidade = item.quantidade || 0;
                  return sum + (precoUnit * quantidade);
                }, 0);
                precoVendaTotalKit += precoVendaExtras;
              }
              
              custoUnit = custoTotalKit;
              precoVendaUnit = precoVendaTotalKit;
            }
          } catch (error: any) {
            console.error(`❌ Erro ao processar kit ${item.kitId}:`, error);
            // Se houver erro ao buscar o kit, usar valores do item ou lançar erro
            if (item.precoUnitario !== undefined && item.precoUnitario !== null) {
              // Se o usuário já editou o preço, usar esse valor
              precoUnit = item.precoUnitario;
              custoUnit = item.custoUnit || 0;
            } else {
              // Se não, lançar erro para o usuário saber que o kit não foi encontrado
              throw new Error(`Erro ao processar kit: ${error.message || 'Kit não encontrado ou inválido'}`);
            }
          }
        }
        
        // Aplicar BDI apenas se o preço não foi editado manualmente
        precoUnit = precoVendaUnit * (1 + (bdi || 0) / 100);
      }

      const subtotal = custoUnit * item.quantidade;
      const subtotalPreco = precoUnit * item.quantidade;
      
      custoTotal += subtotal;

      // Obter NCM do material, cotação ou item editado manualmente
      let ncm = item.ncm || null;
      
      if (!ncm) {
        // Se não foi fornecido manualmente, buscar do material ou cotação
        if (item.tipo === 'MATERIAL' && item.materialId) {
          const material = await prisma.material.findUnique({
            where: { id: item.materialId },
            select: { ncm: true }
          });
          ncm = material?.ncm || null;
        } else if (item.tipo === 'COTACAO' && item.cotacaoId) {
          const cotacao = await prisma.cotacao.findUnique({
            where: { id: item.cotacaoId },
            select: { ncm: true }
          });
          ncm = cotacao?.ncm || null;
        }
      }

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
        subtotal: subtotalPreco, // Usar subtotal baseado no preço (editado ou calculado)
        ncm: ncm ? String(ncm) : null, // ✅ NCM para faturamento NF-e/NFS-e
        // ✅ NOVOS CAMPOS: Conversão de unidades (opcionais, compatível com dados existentes)
        unidadeVenda: item.unidadeVenda || null,
        tipoMaterial: item.tipoMaterial || null,
        // ✅ Campo para armazenar itens de kits customizados
        itensDoKit: item.itensDoKit || null
      });
    }

    // NOVA LÓGICA DE CÁLCULO:
    // 1. Subtotal com BDI aplicado aos itens
    const subtotalComBDI = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
    
    // 2. Aplicar desconto
    const valorComDesconto = subtotalComBDI - (descontoValor || 0);
    
    // 3. Aplicar impostos
    const precoVenda = valorComDesconto * (1 + (impostoPercentual || 0) / 100);

    // Buscar o próximo número sequencial disponível
    // Isso garante que não haverá conflito mesmo após importações com números específicos
    const ultimoOrcamento = await prisma.orcamento.findFirst({
      orderBy: { numeroSequencial: 'desc' },
      select: { numeroSequencial: true }
    });

    const proximoNumero = (ultimoOrcamento?.numeroSequencial || 0) + 1;

    // Atualizar a sequência do PostgreSQL para evitar conflitos futuros
    // Tentar diferentes nomes possíveis da sequência
    try {
      // Tentar com o nome padrão do Prisma (case-sensitive)
      await prisma.$executeRawUnsafe(`
        SELECT setval('"orcamentos_numeroSequencial_seq"', ${proximoNumero}, true);
      `);
    } catch (error: any) {
      try {
        // Tentar com nome em minúsculas (PostgreSQL pode criar assim)
        await prisma.$executeRawUnsafe(`
          SELECT setval('orcamentos_numerosequencial_seq', ${proximoNumero}, true);
        `);
      } catch (error2: any) {
        // Se não conseguir atualizar a sequência, não é crítico
        // O importante é que estamos especificando o número manualmente
        console.warn('⚠️  Não foi possível atualizar a sequência (não crítico):', error2.message);
      }
    }

    const orcamento = await prisma.orcamento.create({
      data: {
        numeroSequencial: proximoNumero, // ✅ Especificar manualmente o número para evitar conflitos
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
  } catch (error: any) {
    console.error('❌ Erro ao criar orçamento:', error);
    
    // Retornar mensagem de erro mais específica
    const errorMessage = error?.message || 'Erro ao criar orçamento';
    const statusCode = error?.statusCode || 500;
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
};

/**
 * Resetar todos os orçamentos e a sequência
 * ATENÇÃO: Esta função deleta TODOS os orçamentos permanentemente!
 * @route POST /api/orcamentos/reset
 * @access RBAC: Apenas admin
 */
export const resetarOrcamentos = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verificar se o usuário é admin
    const user = (req as any).user;
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem resetar orçamentos.'
      });
      return;
    }

    console.log('🗑️  Iniciando reset de orçamentos...');

    // 1. Contar orçamentos antes de deletar
    const totalOrcamentos = await prisma.orcamento.count();
    console.log(`📊 Total de orçamentos encontrados: ${totalOrcamentos}`);

    if (totalOrcamentos === 0) {
      // Mesmo assim, resetar a sequência
      await resetarSequenciaOrcamentos();
      res.json({
        success: true,
        message: 'Não havia orçamentos para deletar. Sequência resetada.',
        totalDeletados: 0
      });
      return;
    }

    // 2. Deletar todos os orçamentos (os itens serão deletados automaticamente por cascade)
    console.log('🗑️  Deletando orçamentos...');
    const resultado = await prisma.orcamento.deleteMany({});
    console.log(`✅ ${resultado.count} orçamento(s) deletado(s)`);

    // 3. Resetar a sequência do numeroSequencial
    await resetarSequenciaOrcamentos();

    console.log('✅ Reset completo!');

    res.json({
      success: true,
      message: `Reset concluído! ${resultado.count} orçamento(s) deletado(s) e sequência resetada.`,
      totalDeletados: resultado.count
    });

  } catch (error: any) {
    console.error('❌ Erro ao resetar orçamentos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao resetar orçamentos'
    });
  }
};

/**
 * Função auxiliar para resetar a sequência do numeroSequencial
 */
async function resetarSequenciaOrcamentos() {
  try {
    // Resetar a sequência do PostgreSQL para o numeroSequencial
    // Tentar com o nome padrão do Prisma (case-sensitive)
    await prisma.$executeRawUnsafe(`
      ALTER SEQUENCE "orcamentos_numeroSequencial_seq" RESTART WITH 1;
    `);
    console.log('✅ Sequência resetada para 1');
  } catch (error: any) {
    console.warn('⚠️  Erro ao resetar sequência:', error.message);
    console.log('ℹ️  Tentando método alternativo...');
    
    try {
      // Método alternativo 1: setval com nome case-sensitive
      await prisma.$executeRawUnsafe(`
        SELECT setval('"orcamentos_numeroSequencial_seq"', 1, false);
      `);
      console.log('✅ Sequência resetada (método alternativo 1)');
    } catch (error2: any) {
      try {
        // Método alternativo 2: setval com nome em minúsculas
        await prisma.$executeRawUnsafe(`
          SELECT setval('orcamentos_numerosequencial_seq', 1, false);
        `);
        console.log('✅ Sequência resetada (método alternativo 2)');
      } catch (error3: any) {
        console.error('❌ Erro ao resetar sequência:', error3.message);
        // Não lançar erro, apenas avisar - a sequência será ajustada automaticamente na próxima criação
        console.warn('ℹ️  A sequência será ajustada automaticamente na próxima criação de orçamento');
      }
    }
  }
}

// Atualizar status do orçamento
export const updateOrcamentoStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`🔄 Atualizando status do orçamento ${id} para ${status}...`);

    if (!status) {
      res.status(400).json({
        success: false,
        error: 'Status é obrigatório'
      });
      return;
    }

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
      include: { cliente: true }
    });

    if (!orcamento) {
      console.log(`❌ Orçamento ${id} não encontrado`);
      res.status(404).json({
        success: false,
        error: 'Orçamento não encontrado'
      });
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

    // Se declinado e estava aprovado, cancelar projeto se existir
    if (status === 'Declinado' && orcamento.status === 'Aprovado') {
      const projetoExistente = await prisma.projeto.findUnique({
        where: { orcamentoId: id }
      });

      if (projetoExistente) {
        console.log(`❌ Orçamento aprovado foi declinado. Cancelando projeto ${projetoExistente.id}`);
        await prisma.projeto.update({
          where: { id: projetoExistente.id },
          data: { status: 'CANCELADO' }
        });
      }
    }

    const orcamentoAtualizado = await prisma.orcamento.update({
      where: { id },
      data: {
        status,
        aprovedAt: status === 'Aprovado' ? new Date() : orcamento.aprovedAt,
        recusadoAt: status === 'Declinado' || status === 'Recusado' ? new Date() : orcamento.recusadoAt
      },
      include: {
        cliente: true,
        items: true,
        projeto: true
      }
    });

    // Retornar no formato esperado pelo frontend
    res.json({
      success: true,
      data: orcamentoAtualizado,
      projeto: projeto,
      message: `Status alterado para ${status} com sucesso`
    });
  } catch (error) {
    console.error('Erro ao atualizar status do orçamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status do orçamento'
    });
  }
};

// Aprovar orçamento
export const aprovarOrcamento = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('✅ Função aprovarOrcamento chamada!', { id: req.params.id, method: req.method });
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
      classificacao, // ✅ NOVO: Classificação do orçamento
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
        let precoUnit = 0;
        
        // ✅ PRIORIDADE 1: Se o usuário editou o preço manualmente, usar o valor editado
        if (item.precoUnitario !== undefined && item.precoUnitario !== null) {
          // Usuário editou o valor - usar diretamente (já pode incluir BDI ou não, conforme editado)
          precoUnit = item.precoUnitario;
          console.log(`✅ Usando preço editado pelo usuário: R$ ${precoUnit.toFixed(2)} para item ${item.descricao || item.nome}`);
        } else {
          // ✅ PRIORIDADE 2: Se não foi editado, calcular baseado no estoque/cotações
          let precoVendaUnit = item.custoUnit || 0;
          
          // Se for cotação (banco frio), buscar valor da cotação
          if (item.tipo === 'COTACAO' && item.cotacaoId) {
            const cotacao = await prisma.cotacao.findUnique({
              where: { id: item.cotacaoId },
              select: { valorUnitario: true, valorVenda: true }
            });
            
            if (cotacao) {
              precoVendaUnit = cotacao.valorVenda || cotacao.valorUnitario || 0;
              custoUnit = cotacao.valorUnitario || 0;
            }
          }
          // Se for material, buscar valorVenda se disponível
          else if (item.tipo === 'MATERIAL' && item.materialId) {
            const material = await prisma.material.findUnique({
              where: { id: item.materialId },
              select: { preco: true, valorVenda: true }
            });
            
            if (material) {
              precoVendaUnit = material.valorVenda || material.preco || 0;
              custoUnit = material.preco || 0;
            }
          }
          
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
              
              // Calcular preço de venda do kit (soma dos valorVenda || preco dos materiais do estoque real)
              precoVendaUnit = kit.items.reduce((sum, kitItem) => {
                const precoVendaItem = kitItem.material.valorVenda || kitItem.material.preco || 0;
                return sum + precoVendaItem * kitItem.quantidade;
              }, 0);
              
              // IMPORTANTE: Incluir itens do banco frio E serviços no cálculo do preço de venda
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
                
                // Somar preços dos itens do banco frio E serviços
                const precoVendaExtras = itensFaltantesArray.reduce((sum: number, item: any) => {
                  // Incluir tanto cotações (tipo === 'COTACAO') quanto serviços (tipo === 'SERVICO')
                  const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                  const quantidade = item.quantidade || 0;
                  return sum + (precoUnit * quantidade);
                }, 0);
                precoVendaUnit += precoVendaExtras;
              }
            }
          }
          
          // Aplicar BDI apenas se o preço não foi editado manualmente
          precoUnit = precoVendaUnit * (1 + (bdi || orcamentoExistente.bdi || 0) / 100);
        }

        const subtotal = custoUnit * item.quantidade;
        const subtotalPreco = precoUnit * item.quantidade;
        
        custoTotal += subtotal;

        // Obter NCM do material, cotação ou item editado manualmente
        let ncm = item.ncm || null;
        
        if (!ncm) {
          // Se não foi fornecido manualmente, buscar do material ou cotação
          if (item.tipo === 'MATERIAL' && item.materialId) {
            const material = await prisma.material.findUnique({
              where: { id: item.materialId },
              select: { ncm: true }
            });
            ncm = material?.ncm || null;
          } else if (item.tipo === 'COTACAO' && item.cotacaoId) {
            const cotacao = await prisma.cotacao.findUnique({
              where: { id: item.cotacaoId },
              select: { ncm: true }
            });
            ncm = cotacao?.ncm || null;
          }
        }

        itemsData.push({
          tipo: item.tipo,
          materialId: item.materialId,
          kitId: item.kitId,
          itensDoKit: item.itensDoKit || null, // ✅ Campo para armazenar itens de kits customizados
          cotacaoId: item.cotacaoId, // ✅ Incluir cotacaoId para itens do banco frio
          servicoNome: item.servicoNome,
          descricao: item.descricao,
          quantidade: item.quantidade,
          custoUnit,
          precoUnit,
          subtotal: subtotalPreco, // Usar subtotal baseado no preço (editado ou calculado)
          ncm: ncm ? String(ncm) : null, // ✅ NCM para faturamento NF-e/NFS-e
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

// ============================================
// IMPORTAÇÃO DE ORÇAMENTOS HISTÓRICOS
// ============================================

// Função auxiliar para parsear data (suporta múltiplos formatos)
function parseData(dataStr: string | null | undefined): Date | null {
  if (!dataStr) return null;
  
  // Se for um número (serial do Excel), converter
  if (typeof dataStr === 'number') {
    // Excel armazena datas como número de dias desde 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dataStr * 86400000);
    return date;
  }
  
  // Tentar parsear formato DD/MM/YYYY
  const matchDDMMYYYY = String(dataStr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchDDMMYYYY) {
    const [, dia, mes, ano] = matchDDMMYYYY;
    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  }
  
  // Tentar parsear como ISO
  const date = new Date(dataStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

// Função auxiliar para mapear status do sistema antigo para o novo
function mapearStatus(status: string): string {
  const statusLower = String(status).toLowerCase().trim();
  
  if (statusLower.includes('concluído') || statusLower.includes('concluido') || statusLower.includes('aprovado')) {
    return 'Aprovado';
  }
  
  // Cancelados do sistema antigo devem ir para a aba/categorização de cancelados
  if (statusLower.includes('cancelado') || statusLower.includes('cancelada')) {
    return 'Cancelado';
  }

  if (statusLower.includes('recusado') || statusLower.includes('reprovado')) {
    return 'Recusado';
  }
  
  return 'Pendente'; // Padrão para "Aberto" ou qualquer outro
}

// Função auxiliar para normalizar nome do cliente
function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

// Função auxiliar para criar ou encontrar cliente
async function criarOuEncontrarCliente(nome: string): Promise<{ id: string; criado: boolean }> {
  const nomeNormalizado = normalizarNome(nome);
  
  // Tentar encontrar cliente existente pelo nome (case-insensitive)
  const clienteExistente = await prisma.cliente.findFirst({
    where: {
      nome: {
        equals: nomeNormalizado,
        mode: 'insensitive'
      }
    }
  });
  
  if (clienteExistente) {
    return { id: clienteExistente.id, criado: false };
  }
  
  // Criar novo cliente
  // Gerar CPF/CNPJ temporário baseado no nome (para permitir criação)
  const cpfCnpjTemp = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const novoCliente = await prisma.cliente.create({
    data: {
      nome: nomeNormalizado,
      cpfCnpj: cpfCnpjTemp,
      tipo: 'PJ', // Assumir PJ por padrão
      email: null,
      telefone: null,
      ativo: true
    }
  });
  
  return { id: novoCliente.id, criado: true };
}

/**
 * Exportar template JSON para importação de orçamentos
 * GET /api/orcamentos/import/template
 */
export const exportarTemplateOrcamentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = {
      orcamentos: [
        {
          numero: "ORC-001",
          status: "Aprovado",
          cliente: "Nome do Cliente",
          dataEmissao: "2024-01-15",
          dataValidade: "2024-02-15",
          valorTotal: 15000.00
        },
        {
          numero: "ORC-002",
          status: "Pendente",
          cliente: "Outro Cliente",
          dataEmissao: "2024-01-20",
          dataValidade: "2024-02-20",
          valorTotal: 25000.00
        }
      ]
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="template-orcamentos-${Date.now()}.json"`);
    res.json(template);
  } catch (error: any) {
    console.error('❌ Erro ao exportar template de orçamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar template de orçamentos'
    });
  }
};

/**
 * Preview de importação de orçamentos (validação antes de salvar)
 * POST /api/orcamentos/import/preview
 */
export const previewImportacaoOrcamentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    console.log('📥 Preview de importação de orçamentos do arquivo:', file.path);

    // Ler arquivo JSON
    const jsonContent = fs.readFileSync(file.path, 'utf-8');
    let jsonData = JSON.parse(jsonContent);

    // Remover wrapper se existir
    if (jsonData.success && jsonData.data) {
      jsonData = jsonData.data;
    }

    if (!jsonData.orcamentos || !Array.isArray(jsonData.orcamentos)) {
      res.status(400).json({
        success: false,
        error: 'Formato JSON inválido. Deve conter array "orcamentos"'
      });
      return;
    }

    // Buscar todos os clientes existentes para comparação
    const clientesExistentes = await prisma.cliente.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        cpfCnpj: true
      }
    });

    // Criar mapa para busca rápida (nome como chave, case-insensitive)
    const mapaExistentes = new Map<string, typeof clientesExistentes[0]>();
    clientesExistentes.forEach(c => {
      mapaExistentes.set(c.nome.toLowerCase().trim(), c);
    });

    // Processar orçamentos para preview
    const orcamentosPreview = [];
    let clientesNovos = 0;
    let clientesExistentesCount = 0;

    for (let i = 0; i < jsonData.orcamentos.length; i++) {
      const orcamento = jsonData.orcamentos[i];
      const linha = i + 1;

      // Validar campos obrigatórios
      const erros: string[] = [];
      if (!orcamento.numero) erros.push('Campo "numero" é obrigatório');
      if (!orcamento.cliente) erros.push('Campo "cliente" é obrigatório');
      if (!orcamento.dataEmissao) erros.push('Campo "dataEmissao" é obrigatório');
      if (!orcamento.dataValidade) erros.push('Campo "dataValidade" é obrigatório');
      if (orcamento.valorTotal === undefined || orcamento.valorTotal === null) {
        erros.push('Campo "valorTotal" é obrigatório');
      }

      // Verificar se cliente existe
      const nomeClienteNormalizado = normalizarNome(orcamento.cliente || '').toLowerCase();
      const clienteExistente = mapaExistentes.get(nomeClienteNormalizado);
      const statusCliente = clienteExistente ? 'existente' : 'novo';
      
      if (statusCliente === 'novo') {
        clientesNovos++;
      } else {
        clientesExistentesCount++;
      }

      orcamentosPreview.push({
        linha,
        numero: orcamento.numero || '',
        status: mapearStatus(orcamento.status || 'Aberto'),
        cliente: orcamento.cliente || '',
        dataEmissao: orcamento.dataEmissao || '',
        dataValidade: orcamento.dataValidade || '',
        valorTotal: parseFloat(orcamento.valorTotal) || 0,
        statusCliente,
        clienteExistenteId: clienteExistente?.id,
        clienteExistenteNome: clienteExistente?.nome,
        erros: erros.length > 0 ? erros : undefined,
        avisos: []
      });
    }

    // Limpar arquivo temporário
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.warn('⚠️  Não foi possível deletar arquivo temporário:', file.path);
    }

    res.json({
      success: true,
      data: {
        totalOrcamentos: orcamentosPreview.length,
        criar: orcamentosPreview.length,
        clientesNovos,
        clientesExistentes: clientesExistentesCount,
        orcamentos: orcamentosPreview
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao fazer preview de importação de orçamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer preview de importação de orçamentos',
      details: error.message
    });
  }
};

/**
 * Importar orçamentos de JSON
 * POST /api/orcamentos/import
 */
export const importarOrcamentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const orcamentos = req.body?.orcamentos;

    if (!file && !orcamentos) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo ou dados foram enviados'
      });
      return;
    }

    let orcamentosParaImportar: any[] = [];

    if (orcamentos && Array.isArray(orcamentos)) {
      // Se vier do modal de preview, usar os dados já processados
      orcamentosParaImportar = orcamentos;
    } else if (file) {
      // Se vier direto do arquivo, processar normalmente
      console.log('📥 Importando orçamentos do arquivo:', file.filename);

      const jsonContent = fs.readFileSync(file.path, 'utf-8');
      let jsonData = JSON.parse(jsonContent);

      if (jsonData.success && jsonData.data) {
        jsonData = jsonData.data;
      }

      if (!jsonData.orcamentos || !Array.isArray(jsonData.orcamentos)) {
        res.status(400).json({
          success: false,
          error: 'Formato JSON inválido. Deve conter array "orcamentos"'
        });
        return;
      }

      orcamentosParaImportar = jsonData.orcamentos;
    }

    // Processar orçamentos
    const resultados = {
      criados: 0,
      erros: 0,
      clientesCriados: 0,
      clientesEncontrados: 0,
      detalhes: [] as Array<{
        linha: number;
        numero: string;
        cliente: string;
        status: 'sucesso' | 'erro';
        mensagem?: string;
      }>
    };

    for (let i = 0; i < orcamentosParaImportar.length; i++) {
      const orcamentoData = orcamentosParaImportar[i];
      const linha = i + 1;

      try {
        // Validar campos obrigatórios
        if (!orcamentoData.numero || !orcamentoData.cliente || !orcamentoData.dataEmissao || 
            !orcamentoData.dataValidade || orcamentoData.valorTotal === undefined) {
          resultados.erros++;
          resultados.detalhes.push({
            linha,
            numero: orcamentoData.numero || 'N/A',
            cliente: orcamentoData.cliente || 'N/A',
            status: 'erro',
            mensagem: 'Campos obrigatórios faltando (numero, cliente, dataEmissao, dataValidade, valorTotal)'
          });
          continue;
        }

        // Criar ou encontrar cliente
        const { id: clienteId, criado } = await criarOuEncontrarCliente(orcamentoData.cliente);
        
        if (criado) {
          resultados.clientesCriados++;
        } else {
          resultados.clientesEncontrados++;
        }

        // Parsear datas
        const dataEmissao = parseData(orcamentoData.dataEmissao);
        const dataValidade = parseData(orcamentoData.dataValidade);

        if (!dataEmissao || !dataValidade) {
          resultados.erros++;
          resultados.detalhes.push({
            linha,
            numero: orcamentoData.numero,
            cliente: orcamentoData.cliente,
            status: 'erro',
            mensagem: 'Erro ao parsear datas (dataEmissao ou dataValidade inválidas)'
          });
          continue;
        }

        // Mapear status
        const status = mapearStatus(orcamentoData.status || 'Aberto');

        // Valor do orçamento (total da planilha)
        const valorTotal = parseFloat(orcamentoData.valorTotal) || 0;

        // Obter o número sequencial original do JSON
        const numeroOriginal = parseInt(orcamentoData.numero) || null;
        
        if (!numeroOriginal) {
          resultados.erros++;
          resultados.detalhes.push({
            linha,
            numero: orcamentoData.numero || 'N/A',
            cliente: orcamentoData.cliente,
            status: 'erro',
            mensagem: 'Número do orçamento inválido ou não fornecido'
          });
          continue;
        }

        // Verificar se já existe um orçamento com esse número sequencial
        const orcamentoExistente = await prisma.orcamento.findUnique({
          where: { numeroSequencial: numeroOriginal }
        });

        if (orcamentoExistente) {
          console.warn(`⚠️ Orçamento com número ${numeroOriginal} já existe. Pulando...`);
          resultados.erros++;
          resultados.detalhes.push({
            linha,
            numero: orcamentoData.numero,
            cliente: orcamentoData.cliente,
            status: 'erro',
            mensagem: `Orçamento com número ${numeroOriginal} já existe no banco`
          });
          continue;
        }

        // Criar orçamento com o número sequencial original
        // IMPORTANTE: Mesmo com @default(autoincrement()), podemos especificar manualmente o valor
        const orcamento = await prisma.orcamento.create({
          data: {
            numeroSequencial: numeroOriginal, // ✅ Usar o número original do JSON
            clienteId,
            titulo: `Orçamento - ${orcamentoData.cliente}`,
            descricao: `Orçamento migrado do sistema antigo${orcamentoData.numero ? ` (Número Original: ${orcamentoData.numero})` : ''}`,
            validade: dataValidade,
            status,
            bdi: 0,
            custoTotal: valorTotal,
            precoVenda: valorTotal,
            observacoes: `Orçamento histórico importado. Número original: ${orcamentoData.numero}`,
            // ⚠️ IMPORTANTE: não criar itens para orçamentos históricos
            // Eles serão apenas cabeçalhos, mantendo o valor total e permitindo visualização,
            // mas com a lista de itens vazia.
            createdAt: dataEmissao // Preservar data original
          }
        });

        resultados.criados++;
        resultados.detalhes.push({
          linha,
          numero: orcamentoData.numero,
          cliente: orcamentoData.cliente,
          status: 'sucesso'
        });

        console.log(`✅ Orçamento criado: #${orcamento.numeroSequencial} (original: ${orcamentoData.numero}) - ${orcamentoData.cliente} - R$ ${valorTotal.toFixed(2)}`);

      } catch (error: any) {
        resultados.erros++;
        resultados.detalhes.push({
          linha,
          numero: orcamentoData.numero || 'N/A',
          cliente: orcamentoData.cliente || 'N/A',
          status: 'erro',
          mensagem: error.message || 'Erro desconhecido'
        });

        console.error(`❌ Erro ao processar linha ${linha}:`, error.message);
      }
    }

    // Atualizar a sequência do PostgreSQL para o próximo número após a importação
    // Isso garante que novos orçamentos criados manualmente tenham números maiores que os importados
    if (resultados.criados > 0) {
      try {
        // Encontrar o maior número sequencial importado
        const maiorNumero = await prisma.orcamento.findFirst({
          orderBy: { numeroSequencial: 'desc' },
          select: { numeroSequencial: true }
        });

        if (maiorNumero) {
          // Atualizar a sequência para o próximo número após o maior importado
          // Usar true (is_called) para que o próximo nextval() retorne o número correto
          const proximoNumero = maiorNumero.numeroSequencial + 1;
          try {
            // Tentar com o nome padrão do Prisma (case-sensitive)
            await prisma.$executeRawUnsafe(`
              SELECT setval('"orcamentos_numeroSequencial_seq"', ${proximoNumero}, true);
            `);
            console.log(`✅ Sequência atualizada para começar em ${proximoNumero}`);
          } catch (error: any) {
            try {
              // Tentar com nome em minúsculas
              await prisma.$executeRawUnsafe(`
                SELECT setval('orcamentos_numerosequencial_seq', ${proximoNumero}, true);
              `);
              console.log(`✅ Sequência atualizada para começar em ${proximoNumero} (método alternativo)`);
            } catch (error2: any) {
              console.warn('⚠️  Não foi possível atualizar a sequência:', error2.message);
              // Não é crítico, apenas um aviso
            }
          }
        }
      } catch (error: any) {
        console.warn('⚠️  Erro ao atualizar sequência:', error.message);
        // Não é crítico, apenas um aviso
      }
    }

    // Limpar arquivo temporário se existir
    if (file) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.warn('⚠️  Não foi possível deletar arquivo temporário:', file.path);
      }
    }

    console.log('\n📊 Resumo da importação:');
    console.log(`   ✅ Orçamentos criados: ${resultados.criados}`);
    console.log(`   ❌ Erros: ${resultados.erros}`);
    console.log(`   👥 Clientes criados: ${resultados.clientesCriados}`);
    console.log(`   🔍 Clientes encontrados: ${resultados.clientesEncontrados}`);

    res.json({
      success: true,
      data: {
        criados: resultados.criados,
        erros: resultados.erros,
        clientesCriados: resultados.clientesCriados,
        clientesEncontrados: resultados.clientesEncontrados,
        detalhes: resultados.detalhes
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao importar orçamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao importar orçamentos',
      details: error.message
    });
  }
};

