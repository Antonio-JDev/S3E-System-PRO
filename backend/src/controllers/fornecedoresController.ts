import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Listar todos os fornecedores
export const getFornecedores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ativo, busca } = req.query;
    
    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (busca) {
      where.OR = [
        { nome: { contains: busca as string, mode: 'insensitive' } },
        { cnpj: { contains: busca as string, mode: 'insensitive' } },
        { email: { contains: busca as string, mode: 'insensitive' } }
      ];
    }

    const fornecedores = await prisma.fornecedor.findMany({
      where,
      include: {
        materiais: {
          select: { id: true, nome: true, sku: true, preco: true, ativo: true },
          where: { ativo: true },
          take: 10
        },
        compras: {
          select: { id: true, valorTotal: true, status: true, dataCompra: true },
          orderBy: { dataCompra: 'desc' },
          take: 5
        },
        contasPagar: {
          select: { id: true, valorParcela: true, status: true, dataVencimento: true },
          where: { status: { not: 'Pago' } },
          orderBy: { dataVencimento: 'asc' },
          take: 5
        }
      },
      orderBy: { nome: 'asc' }
    });

    res.json({
      success: true,
      data: fornecedores,
      total: fornecedores.length
    });
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar fornecedores' 
    });
  }
};

// Buscar fornecedor por ID
export const getFornecedorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id },
      include: {
        materiais: {
          include: {
            movimentacoes: {
              orderBy: { data: 'desc' },
              take: 10
            }
          },
          orderBy: { nome: 'asc' }
        },
        compras: {
          include: {
            items: {
              include: {
                material: { select: { nome: true, sku: true } }
              }
            }
          },
          orderBy: { dataCompra: 'desc' }
        },
        contasPagar: {
          orderBy: { dataVencimento: 'asc' }
        }
      }
    });

    if (!fornecedor) {
      res.status(404).json({ 
        success: false,
        error: 'Fornecedor não encontrado' 
      });
      return;
    }

    res.json({
      success: true,
      data: fornecedor
    });
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar fornecedor' 
    });
  }
};

// Criar fornecedor
export const createFornecedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, cnpj, email, telefone, endereco, bairro, cidade, estado, cep, cnae_fiscal, codigo_municipio_ibge, situacao_cadastral, classificacao } = req.body;

    // Verificar se CNPJ já existe
    const fornecedorExistente = await prisma.fornecedor.findUnique({
      where: { cnpj }
    });

    if (fornecedorExistente) {
      res.status(400).json({
        success: false,
        error: 'Fornecedor com este CNPJ já existe'
      });
      return;
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        nome,
        cnpj,
        email,
        telefone,
        endereco,
        bairro,
        cidade,
        estado,
        cep,
        cnae_fiscal,
        codigo_municipio_ibge,
        situacao_cadastral,
        classificacao: classificacao && ['Fabricante', 'Representante_Vendedor'].includes(classificacao) ? classificacao : null
      }
    });

    res.status(201).json({
      success: true,
      data: fornecedor,
      message: 'Fornecedor criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao criar fornecedor' 
    });
  }
};

// Atualizar fornecedor
export const updateFornecedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nome, cnpj, email, telefone, endereco, bairro, cidade, estado, cep, cnae_fiscal, codigo_municipio_ibge, situacao_cadastral, classificacao } = req.body;

    // Verificar se fornecedor existe
    const fornecedorExistente = await prisma.fornecedor.findUnique({
      where: { id }
    });

    if (!fornecedorExistente) {
      res.status(404).json({
        success: false,
        error: 'Fornecedor não encontrado'
      });
      return;
    }

    // Se CNPJ está sendo alterado, verificar se não existe outro fornecedor com o mesmo
    if (cnpj && cnpj !== fornecedorExistente.cnpj) {
      const cnpjExistente = await prisma.fornecedor.findUnique({
        where: { cnpj }
      });

      if (cnpjExistente) {
        res.status(400).json({
          success: false,
          error: 'Já existe outro fornecedor com este CNPJ'
        });
        return;
      }
    }

    const fornecedor = await prisma.fornecedor.update({
      where: { id },
      data: {
        nome,
        cnpj,
        email,
        telefone,
        endereco,
        bairro,
        cidade,
        estado,
        cep,
        cnae_fiscal,
        codigo_municipio_ibge,
        situacao_cadastral,
        classificacao: classificacao !== undefined ? (classificacao && ['Fabricante', 'Representante_Vendedor'].includes(classificacao) ? classificacao : null) : undefined
      }
    });

    res.json({
      success: true,
      data: fornecedor,
      message: 'Fornecedor atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao atualizar fornecedor' 
    });
  }
};

// Desativar fornecedor (soft delete)
export const deleteFornecedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar se fornecedor existe
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id }
    });

    if (!fornecedor) {
      res.status(404).json({
        success: false,
        error: 'Fornecedor não encontrado'
      });
      return;
    }

    // Verificar se fornecedor tem materiais, compras ou contas a pagar ativos
    const materiaisAtivos = await prisma.material.count({
      where: { 
        fornecedorId: id,
        ativo: true
      }
    });

    const comprasAtivas = await prisma.compra.count({
      where: { 
        fornecedorId: id,
        status: { not: 'Cancelada' }
      }
    });

    const contasPagarAtivas = await prisma.contaPagar.count({
      where: { 
        fornecedorId: id,
        status: { not: 'Paga' }
      }
    });

    if (materiaisAtivos > 0 || comprasAtivas > 0 || contasPagarAtivas > 0) {
      res.status(400).json({
        success: false,
        error: 'Não é possível desativar fornecedor com materiais, compras ou contas a pagar ativos'
      });
      return;
    }

    // Soft delete - marcar como inativo
    await prisma.fornecedor.update({
      where: { id },
      data: { ativo: false }
    });

    res.json({
      success: true,
      message: 'Fornecedor desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar fornecedor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao desativar fornecedor' 
    });
  }
};

// Reativar fornecedor
export const reativarFornecedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar se fornecedor existe
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id }
    });

    if (!fornecedor) {
      res.status(404).json({
        success: false,
        error: 'Fornecedor não encontrado'
      });
      return;
    }

    if (fornecedor.ativo) {
      res.status(400).json({
        success: false,
        error: 'Fornecedor já está ativo'
      });
      return;
    }

    // Reativar fornecedor
    await prisma.fornecedor.update({
      where: { id },
      data: { ativo: true }
    });

    res.json({
      success: true,
      message: 'Fornecedor reativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao reativar fornecedor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao reativar fornecedor' 
    });
  }
};