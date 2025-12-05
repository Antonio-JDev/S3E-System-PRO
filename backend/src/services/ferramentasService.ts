import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// CRUD DE FERRAMENTAS
// ============================================

export const ferramentasService = {
  // Listar todas as ferramentas
  async listarFerramentas(apenasAtivas = true) {
    try {
      const where = apenasAtivas ? { ativo: true } : {};
      
      const ferramentas = await prisma.ferramenta.findMany({
        where,
        orderBy: {
          nome: 'asc'
        },
        include: {
          itensKit: {
            select: {
              id: true,
              kitId: true,
              quantidade: true
            }
          },
          _count: {
            select: {
              itensKit: true
            }
          }
        }
      });

      return {
        success: true,
        data: ferramentas,
        message: `${ferramentas.length} ferramentas encontradas`
      };
    } catch (error: any) {
      console.error('❌ Erro ao listar ferramentas:', error);
      return {
        success: false,
        message: 'Erro ao listar ferramentas',
        error: error.message
      };
    }
  },

  // Buscar ferramenta por ID
  async buscarFerramentaPorId(id: string) {
    try {
      const ferramenta = await prisma.ferramenta.findUnique({
        where: { id },
        include: {
          itensKit: {
            include: {
              kit: {
                select: {
                  id: true,
                  nome: true,
                  eletricistaNome: true
                }
              }
            }
          }
        }
      });

      if (!ferramenta) {
        return {
          success: false,
          message: 'Ferramenta não encontrada'
        };
      }

      return {
        success: true,
        data: ferramenta
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar ferramenta:', error);
      return {
        success: false,
        message: 'Erro ao buscar ferramenta',
        error: error.message
      };
    }
  },

  // Criar nova ferramenta
  async criarFerramenta(dados: any) {
    try {
      const ferramenta = await prisma.ferramenta.create({
        data: {
          nome: dados.nome,
          codigo: dados.codigo,
          categoria: dados.categoria,
          marca: dados.marca || null,
          modelo: dados.modelo || null,
          descricao: dados.descricao || null,
          valorCompra: dados.valorCompra || null,
          imagemUrl: dados.imagemUrl || null,
          ativo: dados.ativo !== undefined ? dados.ativo : true
        }
      });

      return {
        success: true,
        data: ferramenta,
        message: 'Ferramenta criada com sucesso'
      };
    } catch (error: any) {
      console.error('❌ Erro ao criar ferramenta:', error);
      return {
        success: false,
        message: 'Erro ao criar ferramenta',
        error: error.message
      };
    }
  },

  // Atualizar ferramenta
  async atualizarFerramenta(id: string, dados: any) {
    try {
      const ferramenta = await prisma.ferramenta.update({
        where: { id },
        data: {
          nome: dados.nome,
          codigo: dados.codigo,
          categoria: dados.categoria,
          marca: dados.marca || null,
          modelo: dados.modelo || null,
          descricao: dados.descricao || null,
          valorCompra: dados.valorCompra || null,
          imagemUrl: dados.imagemUrl || null,
          ativo: dados.ativo
        }
      });

      return {
        success: true,
        data: ferramenta,
        message: 'Ferramenta atualizada com sucesso'
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar ferramenta:', error);
      return {
        success: false,
        message: 'Erro ao atualizar ferramenta',
        error: error.message
      };
    }
  },

  // Deletar ferramenta (soft delete)
  async deletarFerramenta(id: string) {
    try {
      // Verificar se a ferramenta está em algum kit
      const ferramentaEmUso = await prisma.kitFerramentaItem.findFirst({
        where: { ferramentaId: id }
      });

      if (ferramentaEmUso) {
        return {
          success: false,
          message: 'Não é possível deletar. Ferramenta está vinculada a um ou mais kits.'
        };
      }

      // Soft delete
      await prisma.ferramenta.update({
        where: { id },
        data: { ativo: false }
      });

      return {
        success: true,
        message: 'Ferramenta desativada com sucesso'
      };
    } catch (error: any) {
      console.error('❌ Erro ao deletar ferramenta:', error);
      return {
        success: false,
        message: 'Erro ao deletar ferramenta',
        error: error.message
      };
    }
  }
};

// ============================================
// CRUD DE KITS DE FERRAMENTAS
// ============================================

export const kitsFerramentaService = {
  // Listar todos os kits
  async listarKits(eletricistaId?: string) {
    try {
      const where = eletricistaId ? { eletricistaId, ativo: true } : { ativo: true };
      
      const kits = await prisma.kitFerramenta.findMany({
        where,
        orderBy: {
          dataEntrega: 'desc'
        },
        include: {
          itens: {
            include: {
              ferramenta: true
            }
          },
          _count: {
            select: {
              itens: true
            }
          }
        }
      });

      return {
        success: true,
        data: kits,
        message: `${kits.length} kits encontrados`
      };
    } catch (error: any) {
      console.error('❌ Erro ao listar kits:', error);
      return {
        success: false,
        message: 'Erro ao listar kits',
        error: error.message
      };
    }
  },

  // Buscar kit por ID
  async buscarKitPorId(id: string) {
    try {
      const kit = await prisma.kitFerramenta.findUnique({
        where: { id },
        include: {
          itens: {
            include: {
              ferramenta: true
            }
          }
        }
      });

      if (!kit) {
        return {
          success: false,
          message: 'Kit não encontrado'
        };
      }

      return {
        success: true,
        data: kit
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar kit:', error);
      return {
        success: false,
        message: 'Erro ao buscar kit',
        error: error.message
      };
    }
  },

  // Criar novo kit
  async criarKit(dados: any) {
    try {
      // Buscar nome do eletricista
      const eletricista = await prisma.user.findUnique({
        where: { id: dados.eletricistaId },
        select: { name: true }
      });

      if (!eletricista) {
        return {
          success: false,
          message: 'Eletricista não encontrado'
        };
      }

      const kit = await prisma.kitFerramenta.create({
        data: {
          nome: dados.nome,
          descricao: dados.descricao || null,
          eletricistaId: dados.eletricistaId,
          eletricistaNome: eletricista.name,
          dataEntrega: new Date(dados.dataEntrega),
          imagemUrl: dados.imagemUrl || null,
          observacoes: dados.observacoes || null,
          itens: {
            create: dados.itens.map((item: any) => ({
              ferramentaId: item.ferramentaId,
              quantidade: item.quantidade || 1,
              estadoEntrega: item.estadoEntrega || 'Novo',
              observacoes: item.observacoes || null
            }))
          }
        },
        include: {
          itens: {
            include: {
              ferramenta: true
            }
          }
        }
      });

      return {
        success: true,
        data: kit,
        message: 'Kit criado com sucesso'
      };
    } catch (error: any) {
      console.error('❌ Erro ao criar kit:', error);
      return {
        success: false,
        message: 'Erro ao criar kit',
        error: error.message
      };
    }
  },

  // Atualizar kit
  async atualizarKit(id: string, dados: any) {
    try {
      // Atualizar dados básicos do kit
      const kit = await prisma.kitFerramenta.update({
        where: { id },
        data: {
          nome: dados.nome,
          descricao: dados.descricao || null,
          dataEntrega: dados.dataEntrega ? new Date(dados.dataEntrega) : undefined,
          imagemUrl: dados.imagemUrl,
          observacoes: dados.observacoes,
          ativo: dados.ativo
        }
      });

      // Se houver itens para atualizar, deletar os antigos e criar os novos
      if (dados.itens && Array.isArray(dados.itens)) {
        // Deletar itens existentes
        await prisma.kitFerramentaItem.deleteMany({
          where: { kitId: id }
        });

        // Criar novos itens
        await prisma.kitFerramentaItem.createMany({
          data: dados.itens.map((item: any) => ({
            kitId: id,
            ferramentaId: item.ferramentaId,
            quantidade: item.quantidade || 1,
            estadoEntrega: item.estadoEntrega || 'Novo',
            observacoes: item.observacoes || null
          }))
        });
      }

      // Buscar kit atualizado com itens
      const kitAtualizado = await prisma.kitFerramenta.findUnique({
        where: { id },
        include: {
          itens: {
            include: {
              ferramenta: true
            }
          }
        }
      });

      return {
        success: true,
        data: kitAtualizado,
        message: 'Kit atualizado com sucesso'
      };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar kit:', error);
      return {
        success: false,
        message: 'Erro ao atualizar kit',
        error: error.message
      };
    }
  },

  // Deletar kit (soft delete)
  async deletarKit(id: string) {
    try {
      await prisma.kitFerramenta.update({
        where: { id },
        data: { ativo: false }
      });

      return {
        success: true,
        message: 'Kit desativado com sucesso'
      };
    } catch (error: any) {
      console.error('❌ Erro ao deletar kit:', error);
      return {
        success: false,
        message: 'Erro ao deletar kit',
        error: error.message
      };
    }
  },

  // Listar eletricistas disponíveis
  async listarEletricistas() {
    try {
      const eletricistas = await prisma.user.findMany({
        where: {
          active: true,
          role: {
            in: ['tecnico', 'eletricista', 'desenvolvedor', 'admin']
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return {
        success: true,
        data: eletricistas
      };
    } catch (error: any) {
      console.error('❌ Erro ao listar eletricistas:', error);
      return {
        success: false,
        message: 'Erro ao listar eletricistas',
        error: error.message
      };
    }
  }
};

