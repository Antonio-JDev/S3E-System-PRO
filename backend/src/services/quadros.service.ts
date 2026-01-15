import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface QuadroConfig {
  tipo: 'POLICARBONATO' | 'ALUMINIO' | 'COMANDO';
  caixas: { materialId: string; quantidade: number }[];
  disjuntorGeral?: { materialId: string; quantidade: number };
  barramento?: { materialId: string; quantidade: number; unidade?: 'METROS' | 'CM' };
  medidores: { disjuntorId: string; medidorId?: string; quantidade: number }[];
  cabos: { materialId: string; quantidade: number; unidade: 'METROS' | 'CM' }[];
  dps?: {
    classe: 'CLASSE_1' | 'CLASSE_2';
    items: { materialId: string; quantidade: number }[];
  };
  born?: { materialId: string; quantidade: number }[];
  parafusos?: { materialId: string; quantidade: number }[];
  trilhos?: { materialId: string; quantidade: number; unidade: 'METROS' | 'CM' }[];
  componentes: { materialId: string; quantidade: number }[];
  fonteDados?: 'ESTOQUE' | 'COTACOES';
  temItensCotacao?: boolean;
}

export class QuadrosService {
  static async criarQuadro(nome: string, descricao: string, config: QuadroConfig) {
    try {
      // Buscar materiais da configuração
      const materiais = await this.buscarMateriaisConfig(config);
      
      // Buscar cotações se houver itens de cotação
      const idsCotacoes = this.extrairIdsConfig(config)
        .filter(id => id.startsWith('cotacao_'))
        .map(id => id.replace('cotacao_', ''));
      
      const cotacoes = idsCotacoes.length > 0
        ? await prisma.cotacao.findMany({
            where: { id: { in: idsCotacoes } },
            select: { id: true, nome: true, valorUnitario: true, valorVenda: true }
          })
        : [];
      
      // Validar estoque e identificar itens faltantes
      const validacao = await this.validarEstoque(config, materiais);
      
      // Calcular preço total baseado nos materiais e cotações
      const precoTotal = await this.calcularPrecoTotal(materiais, cotacoes, config);
      
      // Montar itens do kit (apenas os que NÃO são de cotações)
      const itensKit = this.montarItensKit(config);
      
      // Determinar status do estoque
      const statusEstoque = validacao.itensFaltantes.length > 0 
        ? 'PENDENTE' 
        : 'COMPLETO';
      
      // Criar Kit com metadata JSON
      const kit = await prisma.kit.create({
        data: {
          nome,
          descricao: JSON.stringify({ 
            descricao_base: descricao, 
            configuracao: config 
          }),
          preco: precoTotal,
          tipo: 'quadro-eletrico',
          temItensCotacao: config.temItensCotacao || false,
          itensFaltantes: validacao.itensFaltantes.length > 0 
            ? JSON.parse(JSON.stringify(validacao.itensFaltantes)) 
            : null,
          statusEstoque,
          items: {
            create: itensKit
          }
        },
        include: { 
          items: { 
            include: { material: true } 
          } 
        }
      });
      
      console.log(`✅ Quadro criado - Status: ${statusEstoque}, Itens faltantes: ${validacao.itensFaltantes.length}`);
      return kit;
    } catch (error) {
      console.error('Erro ao criar quadro:', error);
      throw error;
    }
  }

  // Validar estoque dos materiais do quadro
  private static async validarEstoque(config: QuadroConfig, materiais: any[]) {
    const itensFaltantes: any[] = [];
    
    // Extrair todos os IDs e quantidades
    const todosItens = this.extrairTodosItens(config);
    
    // Verificar se há itens de cotação (começam com 'cotacao_')
    const temItensCotacao = todosItens.some(item => item.materialId.startsWith('cotacao_'));
    
    // Se houver itens de cotação, adicionar aos faltantes
    if (temItensCotacao || config.fonteDados === 'COTACOES' || config.temItensCotacao) {
      // Usar for...of para permitir await
      for (const item of todosItens) {
        // Itens de cotação começam com 'cotacao_'
        if (item.materialId.startsWith('cotacao_')) {
          // Extrair ID real da cotação (remover prefixo 'cotacao_')
          const cotacaoId = item.materialId.replace('cotacao_', '');
          
          // Buscar cotação no banco para obter nome
          try {
            const cotacao = await prisma.cotacao.findUnique({
              where: { id: cotacaoId },
              select: { nome: true }
            });
            
            itensFaltantes.push({
              materialId: item.materialId,
              cotacaoId: cotacaoId,
              quantidade: item.quantidade,
              nome: cotacao?.nome || 'Item de Cotação',
              tipo: 'COTACAO'
            });
          } catch (error) {
            // Se não encontrar a cotação, adicionar mesmo assim
            itensFaltantes.push({
              materialId: item.materialId,
              cotacaoId: cotacaoId,
              quantidade: item.quantidade,
              nome: 'Item de Cotação',
              tipo: 'COTACAO'
            });
          }
        }
      }
    }
    
    // Se for do estoque, validar disponibilidade (apenas materiais reais, não cotações)
    // Reutilizar todosItens já declarado acima
    
    for (const item of todosItens) {
      // Pular itens de cotação (já foram tratados acima)
      if (item.materialId.startsWith('cotacao_')) {
        continue;
      }
      
      const material = materiais.find(m => m.id === item.materialId);
      if (!material) {
        // Material não encontrado
        itensFaltantes.push({
          materialId: item.materialId,
          quantidade: item.quantidade,
          quantidadeFaltante: item.quantidade,
          nome: 'Material não encontrado',
          tipo: 'MATERIAL_NAO_ENCONTRADO'
        });
      } else if (material.estoque < item.quantidade) {
        // Estoque insuficiente
        itensFaltantes.push({
          materialId: item.materialId,
          quantidade: item.quantidade,
          quantidadeFaltante: item.quantidade - material.estoque,
          nome: material.nome || material.descricao,
          tipo: 'ESTOQUE_INSUFICIENTE'
        });
      }
    }
    
    return { itensFaltantes, statusEstoque: itensFaltantes.length > 0 ? 'PENDENTE' : 'COMPLETO' };
  }

  // Extrair todos os itens da configuração
  private static extrairTodosItens(config: QuadroConfig) {
    const itens: { materialId: string; quantidade: number }[] = [];
    
    // Caixas
    config.caixas.forEach(c => itens.push({ materialId: c.materialId, quantidade: c.quantidade }));
    
    // Disjuntor Geral
    if (config.disjuntorGeral) {
      itens.push({ materialId: config.disjuntorGeral.materialId, quantidade: config.disjuntorGeral.quantidade });
    }
    
    // Barramento
    if (config.barramento) {
      const qtd = config.barramento.unidade === 'CM' ? config.barramento.quantidade / 100 : config.barramento.quantidade;
      itens.push({ materialId: config.barramento.materialId, quantidade: qtd });
    }
    
    // Medidores
    config.medidores.forEach(m => {
      itens.push({ materialId: m.disjuntorId, quantidade: m.quantidade });
      if (m.medidorId) {
        itens.push({ materialId: m.medidorId, quantidade: m.quantidade });
      }
    });
    
    // Cabos
    config.cabos.forEach(c => {
      const qty = c.unidade === 'CM' ? c.quantidade / 100 : c.quantidade;
      itens.push({ materialId: c.materialId, quantidade: qty });
    });
    
    // DPS
    if (config.dps) {
      config.dps.items.forEach(d => itens.push({ materialId: d.materialId, quantidade: d.quantidade }));
    }
    
    // Born
    if (config.born) {
      config.born.forEach(b => itens.push({ materialId: b.materialId, quantidade: b.quantidade }));
    }
    
    // Parafusos
    if (config.parafusos) {
      config.parafusos.forEach(p => itens.push({ materialId: p.materialId, quantidade: p.quantidade }));
    }
    
    // Trilhos
    if (config.trilhos) {
      config.trilhos.forEach(t => {
        const qty = t.unidade === 'CM' ? t.quantidade / 100 : t.quantidade;
        itens.push({ materialId: t.materialId, quantidade: qty });
      });
    }
    
    // Componentes
    config.componentes.forEach(c => itens.push({ materialId: c.materialId, quantidade: c.quantidade }));
    
    return itens;
  }

  // Revalidar estoque de um quadro (chamado após entrada de materiais)
  static async revalidarEstoque(kitId: string) {
    try {
      const kit = await prisma.kit.findUnique({
        where: { id: kitId },
        include: { items: { include: { material: true } } }
      });
      
      if (!kit || kit.tipo !== 'quadro-eletrico') {
        return { success: false, message: 'Quadro não encontrado' };
      }
      
      // Extrair configuração
      const metadata = JSON.parse(kit.descricao || '{}');
      const config: QuadroConfig = metadata.configuracao;
      
      if (!config) {
        return { success: false, message: 'Configuração inválida' };
      }
      
      // Buscar materiais atualizados
      const materiais = await this.buscarMateriaisConfig(config);
      
      // Revalidar estoque
      const validacao = await this.validarEstoque(config, materiais);
      
      // Atualizar kit
      const kitAtualizado = await prisma.kit.update({
        where: { id: kitId },
        data: {
          itensFaltantes: validacao.itensFaltantes.length > 0 
            ? JSON.parse(JSON.stringify(validacao.itensFaltantes)) 
            : null,
          statusEstoque: validacao.statusEstoque
        }
      });
      
      console.log(`✅ Quadro ${kitId} revalidado - Status: ${validacao.statusEstoque}`);
      
      return { 
        success: true, 
        data: kitAtualizado,
        itensFaltantes: validacao.itensFaltantes,
        statusAnterior: kit.statusEstoque,
        statusNovo: validacao.statusEstoque
      };
    } catch (error) {
      console.error('Erro ao revalidar estoque:', error);
      return { success: false, message: 'Erro ao revalidar estoque' };
    }
  }

  static async listarQuadros() {
    try {
      const quadros = await prisma.kit.findMany({
        where: { tipo: 'quadro-eletrico', ativo: true },
        include: { 
          items: { 
            include: { material: true } 
          } 
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return quadros;
    } catch (error) {
      console.error('Erro ao listar quadros:', error);
      throw error;
    }
  }

  private static async buscarMateriaisConfig(config: QuadroConfig) {
    const ids = this.extrairIdsConfig(config);
    // Filtrar apenas IDs de materiais reais (não cotações que começam com 'cotacao_')
    const idsMateriais = ids.filter(id => !id.startsWith('cotacao_'));
    
    // Se não houver materiais reais, retornar array vazio
    if (idsMateriais.length === 0) {
      return [];
    }
    
    return prisma.material.findMany({ 
      where: { id: { in: idsMateriais } } 
    });
  }

  private static async calcularPrecoTotal(materiais: any[], cotacoes: any[], config: QuadroConfig): Promise<number> {
    let total = 0;
    
    // Mapa de materiais por ID para acesso rápido
    const materiaisMap = new Map(materiais.map(m => [m.id, m]));
    
    // Mapa de cotações por ID (com prefixo 'cotacao_') para acesso rápido
    const cotacoesMap = new Map(cotacoes.map(c => [`cotacao_${c.id}`, c]));
    
    // Função auxiliar para obter preço (de material ou cotação)
    const getPreco = (materialId: string): number => {
      if (materialId.startsWith('cotacao_')) {
        const cotacao = cotacoesMap.get(materialId);
        if (cotacao) {
          return cotacao.valorVenda || cotacao.valorUnitario || 0;
        }
        return 0;
      } else {
        const material = materiaisMap.get(materialId);
        if (material) {
          return (material as any).valorVenda || material.preco || 0;
        }
        return 0;
      }
    };
    
    // Caixas
    config.caixas.forEach(item => {
      const preco = getPreco(item.materialId);
      total += preco * item.quantidade;
    });
    
    // Disjuntor Geral
    if (config.disjuntorGeral) {
      const preco = getPreco(config.disjuntorGeral.materialId);
      total += preco * config.disjuntorGeral.quantidade;
    }
    
    // Barramento
    if (config.barramento) {
      const preco = getPreco(config.barramento.materialId);
      const qtd = config.barramento.unidade === 'CM' ? config.barramento.quantidade / 100 : config.barramento.quantidade;
      total += preco * qtd;
    }
    
    // Medidores
    config.medidores.forEach(item => {
      const precoDisjuntor = getPreco(item.disjuntorId);
      total += precoDisjuntor * item.quantidade;
      
      if (item.medidorId) {
        const precoMedidor = getPreco(item.medidorId);
        total += precoMedidor * item.quantidade;
      }
    });
    
    // Cabos
    config.cabos.forEach(item => {
      const preco = getPreco(item.materialId);
      const qtd = item.unidade === 'CM' ? item.quantidade / 100 : item.quantidade;
      total += preco * qtd;
    });
    
    // DPS
    if (config.dps) {
      config.dps.items.forEach(item => {
        const preco = getPreco(item.materialId);
        total += preco * item.quantidade;
      });
    }
    
    // Born
    if (config.born) {
      config.born.forEach(item => {
        const preco = getPreco(item.materialId);
        total += preco * item.quantidade;
      });
    }
    
    // Parafusos
    if (config.parafusos) {
      config.parafusos.forEach(item => {
        const preco = getPreco(item.materialId);
        total += preco * item.quantidade;
      });
    }
    
    // Trilhos
    if (config.trilhos) {
      config.trilhos.forEach(item => {
        const preco = getPreco(item.materialId);
        const qtd = item.unidade === 'CM' ? item.quantidade / 100 : item.quantidade;
        total += preco * qtd;
      });
    }
    
    // Componentes finais
    config.componentes.forEach(item => {
      const preco = getPreco(item.materialId);
      total += preco * item.quantidade;
    });
    
    return total;
  }

  private static montarItensKit(config: QuadroConfig) {
    const itens: any[] = [];
    
    // Função auxiliar para adicionar item apenas se não for cotação
    const adicionarItemSeNaoCotacao = (materialId: string, quantidade: number) => {
      // Não adicionar itens de cotação (começam com 'cotacao_')
      if (!materialId.startsWith('cotacao_')) {
        itens.push({
          materialId: materialId,
          quantidade: quantidade
        });
      }
    };
    
    // Caixas
    config.caixas.forEach(item => {
      adicionarItemSeNaoCotacao(item.materialId, item.quantidade);
    });
    
    // Disjuntor Geral
    if (config.disjuntorGeral) {
      adicionarItemSeNaoCotacao(config.disjuntorGeral.materialId, config.disjuntorGeral.quantidade);
    }
    
    // Barramento
    if (config.barramento) {
      adicionarItemSeNaoCotacao(config.barramento.materialId, config.barramento.quantidade);
    }
    
    // Medidores
    config.medidores.forEach(item => {
      adicionarItemSeNaoCotacao(item.disjuntorId, item.quantidade);
      if (item.medidorId) {
        adicionarItemSeNaoCotacao(item.medidorId, item.quantidade);
      }
    });
    
    // Cabos
    config.cabos.forEach(item => {
      const qtd = item.unidade === 'CM' ? item.quantidade / 100 : item.quantidade;
      adicionarItemSeNaoCotacao(item.materialId, qtd);
    });
    
    // DPS
    if (config.dps) {
      config.dps.items.forEach(item => {
        adicionarItemSeNaoCotacao(item.materialId, item.quantidade);
      });
    }
    
    // Born
    if (config.born) {
      config.born.forEach(item => {
        adicionarItemSeNaoCotacao(item.materialId, item.quantidade);
      });
    }
    
    // Parafusos
    if (config.parafusos) {
      config.parafusos.forEach(item => {
        adicionarItemSeNaoCotacao(item.materialId, item.quantidade);
      });
    }
    
    // Trilhos
    if (config.trilhos) {
      config.trilhos.forEach(item => {
        const qtd = item.unidade === 'CM' ? item.quantidade / 100 : item.quantidade;
        adicionarItemSeNaoCotacao(item.materialId, qtd);
      });
    }
    
    // Componentes finais
    config.componentes.forEach(item => {
      adicionarItemSeNaoCotacao(item.materialId, item.quantidade);
    });
    
    return itens;
  }

  private static extrairIdsConfig(config: QuadroConfig): string[] {
    const ids: string[] = [];
    
    // Caixas
    config.caixas.forEach(item => ids.push(item.materialId));
    
    // Disjuntor Geral
    if (config.disjuntorGeral) ids.push(config.disjuntorGeral.materialId);
    
    // Barramento
    if (config.barramento) ids.push(config.barramento.materialId);
    
    // Medidores
    config.medidores.forEach(item => {
      ids.push(item.disjuntorId);
      if (item.medidorId) ids.push(item.medidorId);
    });
    
    // Cabos
    config.cabos.forEach(item => ids.push(item.materialId));
    
    // DPS
    if (config.dps) {
      config.dps.items.forEach(item => ids.push(item.materialId));
    }
    
    // Born
    if (config.born) {
      config.born.forEach(item => ids.push(item.materialId));
    }
    
    // Parafusos
    if (config.parafusos) {
      config.parafusos.forEach(item => ids.push(item.materialId));
    }
    
    // Trilhos
    if (config.trilhos) {
      config.trilhos.forEach(item => ids.push(item.materialId));
    }
    
    // Componentes
    config.componentes.forEach(item => ids.push(item.materialId));
    
    // Remover duplicatas
    return [...new Set(ids)];
  }
}

