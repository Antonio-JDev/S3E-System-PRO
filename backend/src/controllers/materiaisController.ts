import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { classificarMaterialPorNome, normalizarCategoria, isCategoriaValida } from '../utils/materialClassifier';
import { gerarSKUUnico } from '../utils/skuGenerator';
import { recalcularCustoUnitarioMaterial, listarCandidatosRecalculo } from '../services/recalculoCustoUnitario.service';
import {
  combinaFamiliaEBitola,
  isCableFamilia,
  type CableFamilia
} from '../utils/cableBitolaMatcher';


/** Arredonda para 2 casas decimais (valores monetários). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula valor de venda, imposto (DAS) e custo agregado conforme Simples Nacional.
 * Imposto = valor de venda × (alíquota/100). Custo agregado = preço compra + valor imposto.
 */
function calcularPrecificacaoSimplesNacional(
  precoCompra: number,
  valorVendaInformado: number | null | undefined,
  markup: number,
  aliquotaPercentual: number
): { valorVenda: number; valorImposto: number; custoAgregado: number } {
  const valorVenda = valorVendaInformado != null && valorVendaInformado > 0
    ? valorVendaInformado
    : roundMoney(precoCompra * markup);
  const aliquotaDecimal = aliquotaPercentual / 100;
  const valorImposto = roundMoney(valorVenda * aliquotaDecimal);
  const custoAgregado = roundMoney(precoCompra + valorImposto);
  return { valorVenda, valorImposto, custoAgregado };
}

// No CommonJS, __dirname já está disponível automaticamente

// Configuração de upload para imagens de materiais
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const cwd = process.cwd();
    const uploadDir = cwd.endsWith('backend')
      ? path.join(cwd, 'uploads', 'materiais')
      : path.join(cwd, 'uploads', 'materiais');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `material-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const uploadImagemMaterial = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPEG, PNG, WEBP) são permitidas'));
    }
  }
}).single('imagem');

// Listar todos os materiais
export const getMateriais = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoria, ativo } = req.query;
    
    const where: any = {};
    if (categoria) where.categoria = categoria;
    // ✅ CORREÇÃO: Filtrar por ativo: true por padrão (mostrar apenas materiais ativos)
    // Se ativo for explicitamente 'false', mostrar apenas inativos
    // Se não for especificado, mostrar apenas ativos
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    } else {
      where.ativo = true; // Por padrão, mostrar apenas materiais ativos
    }

    const materiais = await prisma.material.findMany({
      where,
      include: {
        fornecedor: {
          select: { id: true, nome: true, classificacao: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    res.json(materiais);
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
};

// Buscar material por ID
export const getMaterialById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        movimentacoes: {
          orderBy: { data: 'desc' },
          take: 10
        }
      }
    });

    if (!material) {
      res.status(404).json({ error: 'Material não encontrado' });
      return;
    }

    res.json(material);
  } catch (error) {
    console.error('Erro ao buscar material:', error);
    res.status(500).json({ error: 'Erro ao buscar material' });
  }
};

// Criar material
export const createMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    // codigo e unidade vêm do front mas não existem no modelo Material (Prisma); não incluir em rest
    let { categoria, nome, sku, ncm, unidadeMedida, tipo, codigo, unidade, ...rest } = req.body;
    
    // Schema exige "nome" e "tipo": usar fallbacks quando o front não envia (ex: formulário com descricao/codigo)
    const nomeFinal = (nome && String(nome).trim()) || rest.descricao || codigo || 'Material sem nome';
    const tipoFinal = (tipo && String(tipo).trim()) || categoria || 'Insumo';
    
    // Normalizar categoria se fornecida
    if (categoria) {
      categoria = normalizarCategoria(categoria);
    }
    
    // Se categoria não fornecida ou inválida, classificar automaticamente
    if (!categoria || !isCategoriaValida(categoria)) {
      categoria = classificarMaterialPorNome(nomeFinal || '');
      console.log(`🔍 Categoria auto-classificada: "${categoria}" para "${nomeFinal}"`);
    }
    
    // Gerar SKU único e aleatório se não fornecido
    let skuFinal = sku;
    if (!skuFinal || skuFinal.trim() === '') {
      console.log('🔧 SKU não fornecido. Gerando SKU único e aleatório...');
      skuFinal = await gerarSKUUnico(prisma, ncm || null);
      console.log(`✅ SKU gerado: ${skuFinal}`);
    }
    
    // Usar unidade de medida fornecida ou padrão 'un' se não especificada
    const unidadeMedidaFinal = unidadeMedida || 'un';

    // Precificação Simples Nacional: config + markup por fornecedor
    const config = await prisma.configuracaoSistema.findUnique({
      where: { id: 'sistema-config' },
      select: { aliquotaImpostoPadrao: true, markupFabricante: true, markupRevendedor: true, percentualImpostoPadrao: true, multiplicadorVenda: true }
    }).catch(() => null);
    const aliquota = config?.aliquotaImpostoPadrao ?? config?.percentualImpostoPadrao ?? 8;
    let markup = config?.markupFabricante ?? config?.multiplicadorVenda ?? 1.55;
    if (rest.fornecedorId) {
      const forn = await prisma.fornecedor.findUnique({
        where: { id: rest.fornecedorId },
        select: { classificacao: true }
      });
      if (forn?.classificacao === 'Representante_Vendedor') markup = config?.markupRevendedor ?? 1.10;
    }
    const precoNum = typeof rest.preco === 'number' ? rest.preco : parseFloat(rest.preco) || 0;
    const aliquotaMaterial = rest.percentualImposto != null ? Number(rest.percentualImposto) : aliquota;
    const precificacao = precoNum > 0 || rest.valorVenda != null
      ? calcularPrecificacaoSimplesNacional(precoNum, rest.valorVenda, markup, aliquotaMaterial)
      : null;
    const dataCreate: any = {
      ...rest,
      nome: nomeFinal,
      tipo: tipoFinal,
      categoria,
      sku: skuFinal,
      ncm: ncm || null,
      unidadeMedida: unidadeMedidaFinal
    };
    if (precificacao) {
      dataCreate.valorVenda = precificacao.valorVenda;
      dataCreate.valorImposto = precificacao.valorImposto;
      dataCreate.custoAgregado = precificacao.custoAgregado;
    }

    const material = await prisma.material.create({
      data: dataCreate
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Erro ao criar material' });
  }
};

// Atualizar material
export const updateMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let { categoria, nome, unidadeMedida, ...rest } = req.body;

    // Normalizar categoria se fornecida
    if (categoria) {
      categoria = normalizarCategoria(categoria);
    }

    // Buscar nome atual do material se não foi fornecido
    let nomeFinal = nome;
    if (!nomeFinal) {
      const materialAtual = await prisma.material.findUnique({
        where: { id },
        select: { nome: true }
      });
      nomeFinal = materialAtual?.nome || '';
    }

    // Se categoria não fornecida ou inválida, classificar automaticamente
    if (!categoria || !isCategoriaValida(categoria)) {
      categoria = classificarMaterialPorNome(nomeFinal);
      console.log(`🔍 Categoria auto-classificada na atualização: "${categoria}" para "${nomeFinal}"`);
    }

    // Se unidadeMedida não foi fornecida, buscar a atual do material (preservar valor existente)
    let unidadeMedidaFinal = unidadeMedida;
    if (!unidadeMedidaFinal) {
      const materialAtual = await prisma.material.findUnique({
        where: { id },
        select: { unidadeMedida: true }
      });
      unidadeMedidaFinal = materialAtual?.unidadeMedida || 'un';
    }

    // Precificação Simples Nacional: recalcular valorImposto e custoAgregado a partir de preco/valorVenda
    const materialAtual = await prisma.material.findUnique({
      where: { id },
      select: { preco: true, valorVenda: true, fornecedorId: true, percentualImposto: true }
    });
    const precoAtual = materialAtual?.preco ?? 0;
    const precoNum = rest.preco != null ? (typeof rest.preco === 'number' ? rest.preco : parseFloat(rest.preco) || 0) : precoAtual;
    // Só usar valorVenda do body se foi enviado; senão recalcular valorVenda = preco * markup
    const valorVendaEnviado = rest.hasOwnProperty('valorVenda')
      ? (typeof rest.valorVenda === 'number' ? rest.valorVenda : parseFloat(rest.valorVenda))
      : undefined;
    const config = await prisma.configuracaoSistema.findUnique({
      where: { id: 'sistema-config' },
      select: { aliquotaImpostoPadrao: true, markupFabricante: true, markupRevendedor: true, percentualImpostoPadrao: true, multiplicadorVenda: true }
    }).catch(() => null);
    const aliquota = config?.aliquotaImpostoPadrao ?? config?.percentualImpostoPadrao ?? 8;
    let markup = config?.markupFabricante ?? config?.multiplicadorVenda ?? 1.55;
    const fornecedorId = rest.fornecedorId ?? materialAtual?.fornecedorId;
    if (fornecedorId) {
      const forn = await prisma.fornecedor.findUnique({
        where: { id: fornecedorId },
        select: { classificacao: true }
      });
      if (forn?.classificacao === 'Representante_Vendedor') markup = config?.markupRevendedor ?? 1.10;
    }
    const aliquotaMaterial = rest.percentualImposto != null ? Number(rest.percentualImposto) : (materialAtual?.percentualImposto ?? aliquota);
    const precificacao = precoNum > 0 || valorVendaEnviado != null || materialAtual?.valorVenda != null
      ? calcularPrecificacaoSimplesNacional(precoNum, valorVendaEnviado, markup, aliquotaMaterial)
      : null;
    const dataUpdate: any = {
      ...rest,
      ...(nomeFinal && { nome: nomeFinal }),
      unidadeMedida: unidadeMedidaFinal,
      categoria
    };
    if (precificacao) {
      dataUpdate.valorVenda = precificacao.valorVenda;
      dataUpdate.valorImposto = precificacao.valorImposto;
      dataUpdate.custoAgregado = precificacao.custoAgregado;
    }

    const material = await prisma.material.update({
      where: { id },
      data: dataUpdate
    });

    res.json(material);
  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
};

// Deletar material
export const deleteMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true para exclusão permanente
    const userRole = (req as any).user?.role?.toLowerCase(); // Role do usuário autenticado

    // Verificar se o material existe
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        compraItems: true,
        orcamentoItems: true,
        kitItems: true,
        movimentacoes: true,
        historicoPrecos: true
      }
    });

    if (!material) {
      res.status(404).json({ success: false, error: 'Material não encontrado' });
      return;
    }

    // EXCLUSÃO PERMANENTE (apenas Admin e Desenvolvedor)
    if (permanent === 'true') {
      // Verificar permissões: apenas Admin e Desenvolvedor podem excluir permanentemente
      if (!['admin', 'desenvolvedor', 'administrador'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas Administradores e Desenvolvedores podem excluir materiais permanentemente.'
        });
        return;
      }

      // ✅ Excluir todas as dependências relacionadas em cascata antes de excluir o material
      const movimentacoesCount = material.movimentacoes?.length || 0;
      const kitItemsCount = material.kitItems?.length || 0;
      const historicoPrecosCount = material.historicoPrecos?.length || 0;
      
      // Nota: compraItems e orcamentoItems NÃO são excluídos para manter histórico financeiro
      const compraItemsCount = material.compraItems?.length || 0;
      const orcamentoItemsCount = material.orcamentoItems?.length || 0;
      
      // Exclusão permanente em transação: primeiro dependências, depois material
      await prisma.$transaction(async (tx) => {
        // 1. Excluir todas as movimentações relacionadas ao material (sempre, mesmo que count seja 0)
        const movimentacoesDeletadas = await tx.movimentacaoEstoque.deleteMany({
          where: { materialId: id }
        });
        if (movimentacoesDeletadas.count > 0) {
          console.log(`✅ ${movimentacoesDeletadas.count} movimentação(ões) excluída(s) para o material ${id}`);
        }

        // 2. Excluir todos os itens de kits que usam este material (sempre, mesmo que count seja 0)
        const kitItemsDeletados = await tx.kitItem.deleteMany({
          where: { materialId: id }
        });
        if (kitItemsDeletados.count > 0) {
          console.log(`✅ ${kitItemsDeletados.count} item(ns) de kit excluído(s) para o material ${id}`);
        }

        // 3. HistoricoPrecos já tem onDelete: Cascade, mas vamos excluir explicitamente para contar
        const historicoDeletado = await tx.historicoPreco.deleteMany({
          where: { materialId: id }
        });
        if (historicoDeletado.count > 0) {
          console.log(`✅ ${historicoDeletado.count} registro(s) de histórico de preços excluído(s) para o material ${id}`);
        }

        // 4. Excluir o material
        await tx.material.delete({
          where: { id }
        });
      });

      // Buscar contagens reais após exclusão (para garantir que foram excluídos)
      const movimentacoesReais = movimentacoesCount;
      const kitItemsReais = kitItemsCount;
      const historicoReais = historicoPrecosCount;

      const mensagem = `Material excluído permanentemente do banco de dados. ` +
        `${movimentacoesReais > 0 ? `${movimentacoesReais} movimentação(ões), ` : ''}` +
        `${kitItemsReais > 0 ? `${kitItemsReais} item(ns) de kit, ` : ''}` +
        `${historicoReais > 0 ? `${historicoReais} registro(s) de histórico de preços ` : ''}` +
        `excluído(s). ` +
        `${compraItemsCount > 0 || orcamentoItemsCount > 0 ? `Nota: ${compraItemsCount} item(ns) de compra e ${orcamentoItemsCount} item(ns) de orçamento foram mantidos para preservar histórico financeiro.` : ''}`;

      res.json({ 
        success: true,
        message: mensagem,
        movimentacoesExcluidas: movimentacoesReais,
        kitItemsExcluidos: kitItemsReais,
        historicoPrecosExcluidos: historicoReais,
        compraItemsMantidos: compraItemsCount,
        orcamentoItemsMantidos: orcamentoItemsCount
      });
      return;
    }

    // SOFT DELETE (para outros usuários ou quando não especificado permanent)
    // Verificar se há registros relacionados em compras ou contas a pagar
    // Mesmo que haja, vamos fazer soft delete (desativar) para manter histórico
    // O material não será excluído fisicamente, apenas desativado
    await prisma.material.update({
      where: { id },
      data: {
        ativo: false,
        updatedAt: new Date()
      }
    });

    // Nota: O material permanece no banco de dados para manter histórico
    // de compras, contas a pagar, orçamentos, etc.
    res.json({ 
      success: true,
      message: 'Material desativado com sucesso. Ele permanecerá no histórico de compras e contas a pagar.' 
    });
  } catch (error) {
    console.error('Erro ao deletar material:', error);
    res.status(500).json({ success: false, error: 'Erro ao deletar material' });
  }
};

// Registrar movimentação de estoque
export const registrarMovimentacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId, tipo, quantidade, motivo, referencia, observacoes } = req.body;

    // Buscar material atual
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) {
      res.status(404).json({ error: 'Material não encontrado' });
      return;
    }

    // Calcular novo estoque
    let novoEstoque = material.estoque;
    if (tipo === 'ENTRADA') {
      novoEstoque += quantidade;
    } else if (tipo === 'SAIDA') {
      novoEstoque -= quantidade;
      if (novoEstoque < 0) {
        res.status(400).json({ error: 'Estoque insuficiente' });
        return;
      }
    }

    // Criar movimentação e atualizar estoque em transação
    const [movimentacao, materialAtualizado] = await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: {
          materialId,
          tipo,
          quantidade,
          motivo,
          referencia,
          observacoes
        }
      }),
      prisma.material.update({
        where: { id: materialId },
        data: { estoque: novoEstoque }
      })
    ]);

    res.status(201).json({ movimentacao, material: materialAtualizado });
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({ error: 'Erro ao registrar movimentação' });
  }
};

// Obter histórico de movimentações
export const getMovimentacoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId } = req.query;

    const where = materialId ? { materialId: materialId as string } : {};

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        material: {
          select: { id: true, nome: true, sku: true }
        }
      },
      orderBy: { data: 'desc' },
      take: 100
    });

    res.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ error: 'Erro ao buscar movimentações' });
  }
};

// Obter histórico de compras de um material
export const getHistoricoCompras = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const compraItems = await prisma.compraItem.findMany({
      where: { materialId: id },
      include: {
        compra: {
          select: {
            dataCompra: true,
            dataEmissaoNF: true,
            numeroNF: true,
            fornecedorNome: true,
            status: true
          }
        }
      },
      orderBy: { compra: { dataCompra: 'desc' } }
    });

    const historico = compraItems.map(item => ({
      dataCompra: item.compra.dataCompra,
      numeroNF: item.compra.numeroNF,
      fornecedor: item.compra.fornecedorNome,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnit,
      valorTotal: item.valorTotal,
      status: item.compra.status,
      nomeProduto: item.nomeProduto, // Incluir nome do produto da compra
      // ✅ Campos de fracionamento
      quantidadeFracionada: (item as any).quantidadeFracionada,
      tipoEmbalagem: (item as any).tipoEmbalagem,
      unidadeEmbalagem: (item as any).unidadeEmbalagem
    }));

    res.json(historico);
  } catch (error) {
    console.error('Erro ao buscar histórico de compras:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de compras' });
  }
};

// Buscar materiais similares pelo nome (para verificação de duplicatas)
export const buscarMateriaisSimilares = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nomeProduto, ncm } = req.body;

    if (!nomeProduto) {
      res.status(400).json({ error: 'Nome do produto é obrigatório' });
      return;
    }

    console.log(`🔍 Buscando materiais similares a: "${nomeProduto}"`);

    // Extrair palavras-chave do nome (mínimo 3 caracteres)
    const palavrasChave = nomeProduto
      .split(/\s+/)
      .filter((palavra: string) => palavra.length >= 3)
      .slice(0, 5); // Limitar a 5 palavras-chave principais

    const materiaisSimilares = await prisma.material.findMany({
      where: {
        AND: [
          { ativo: true },
          {
            OR: [
              // Busca exata pelo nome
              { nome: { equals: nomeProduto, mode: 'insensitive' } },
              // Busca exata pela descrição
              { descricao: { equals: nomeProduto, mode: 'insensitive' } },
              // Busca por NCM se fornecido
              ...(ncm ? [{ sku: { contains: String(ncm) } }] : []),
              // Busca por palavras-chave no nome
              ...palavrasChave.map((palavra: string) => ({
                nome: { contains: palavra, mode: 'insensitive' as any }
              })),
              // Busca por palavras-chave na descrição
              ...palavrasChave.map((palavra: string) => ({
                descricao: { contains: palavra, mode: 'insensitive' as any }
              }))
            ]
          }
        ]
      },
      include: {
        fornecedor: {
          select: { id: true, nome: true }
        }
      },
      take: 10, // Limitar a 10 resultados
      orderBy: { nome: 'asc' }
    });

    console.log(`✅ Encontrados ${materiaisSimilares.length} materiais similares`);

    res.json(materiaisSimilares);
  } catch (error) {
    console.error('Erro ao buscar materiais similares:', error);
    res.status(500).json({ error: 'Erro ao buscar materiais similares' });
  }
};

// Corrigir nomes genéricos de materiais baseado no histórico de compras
export const corrigirNomesGenericos = async (req: Request, res: Response): Promise<void> => {
  try {
    // Buscar materiais com nomes genéricos
    const materiaisGenericos = await prisma.material.findMany({
      where: {
        OR: [
          { nome: { contains: 'Produto importado via XML' } },
          { categoria: 'Importado XML' }
        ]
      }
    });

    console.log(`📋 Encontrados ${materiaisGenericos.length} materiais com nomes genéricos`);

    let corrigidos = 0;

    for (const material of materiaisGenericos) {
      // Buscar a compra mais recente deste material
      const compraItem = await prisma.compraItem.findFirst({
        where: { materialId: material.id },
        orderBy: { compra: { dataCompra: 'desc' } },
        include: { compra: true }
      });

      if (compraItem && compraItem.nomeProduto && !compraItem.nomeProduto.includes('Produto importado')) {
        // Classificar categoria automaticamente baseado no nome do produto
        const categoriaClassificada = classificarMaterialPorNome(compraItem.nomeProduto);
        
        // Atualizar com o nome real do produto
        await prisma.material.update({
          where: { id: material.id },
          data: {
            nome: compraItem.nomeProduto,
            descricao: compraItem.nomeProduto,
            categoria: categoriaClassificada // ✅ Categoria classificada automaticamente
          }
        });
        console.log(`✅ Material ${material.id} atualizado: "${compraItem.nomeProduto}"`);
        corrigidos++;
      }
    }

    res.json({
      success: true,
      message: `${corrigidos} materiais corrigidos com sucesso`,
      total: materiaisGenericos.length,
      corrigidos
    });
  } catch (error) {
    console.error('Erro ao corrigir nomes genéricos:', error);
    res.status(500).json({ error: 'Erro ao corrigir nomes genéricos' });
  }
};

/**
 * Exportar materiais críticos (estoque baixo/zerado) para cotação com fornecedor
 * GET /api/materiais/exportar-criticos?formato=xlsx|csv|pdf
 */
export const exportarMateriaisCriticos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { formato = 'xlsx' } = req.query;

    // Buscar materiais com estoque crítico
    // Primeiro buscar todos os materiais ativos
    const todosMateriais = await prisma.material.findMany({
      where: {
        ativo: true
      },
      include: {
        fornecedor: {
          select: { id: true, nome: true, email: true, telefone: true }
        }
      },
      orderBy: [
        { estoque: 'asc' },
        { sku: 'asc' }
      ]
    });

    // Filtrar materiais críticos (estoque zerado ou abaixo do mínimo)
    const materiais = todosMateriais.filter(m => 
      m.estoque === 0 || m.estoque <= m.estoqueMinimo
    );

    console.log(`📊 Exportando ${materiais.length} materiais críticos em formato ${formato}`);

    if (materiais.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Nenhum material com estoque crítico encontrado'
      });
      return;
    }

    // Gerar arquivo conforme formato solicitado
    if (formato === 'xlsx') {
      await gerarExcelCotacao(res, materiais);
    } else if (formato === 'csv') {
      await gerarCSVCotacao(res, materiais);
    } else if (formato === 'pdf') {
      await gerarPDFCotacao(res, materiais);
    } else {
      res.status(400).json({ error: 'Formato inválido. Use: xlsx, csv ou pdf' });
    }

  } catch (error) {
    console.error('Erro ao exportar materiais críticos:', error);
    res.status(500).json({ error: 'Erro ao exportar materiais críticos' });
  }
};

/**
 * Gerar arquivo Excel para cotação com fornecedor
 */
async function gerarExcelCotacao(res: Response, materiais: any[]) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'S3E Engenharia';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Materiais para Cotação');

    // Mesclar células do cabeçalho
    sheet.mergeCells('A1:F1');
    sheet.mergeCells('A2:F2');
    sheet.mergeCells('A4:F4');

    // Cabeçalho
    sheet.getCell('A1').value = 'S3E ENGENHARIA ELÉTRICA - SOLICITAÇÃO DE COTAÇÃO';
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1a5490' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 25;

    sheet.getCell('A2').value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    sheet.getCell('A2').font = { size: 11 };
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    sheet.getCell('A4').value = 'INSTRUÇÕES: Preencha os campos de preço, prazo de entrega e observações. Não altere as outras colunas!';
    sheet.getCell('A4').font = { bold: true, color: { argb: 'FFF57C00' } };
    sheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(4).height = 30;

    // Cabeçalhos das colunas (linha 6)
    const headerRow = sheet.getRow(6);
    headerRow.values = [
      'Código (SKU)',
      'Nome do Material',
      'Unidade',
      'Preço Cotado',
      'Prazo de Entrega',
      'Observações'
    ];

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Adicionar bordas ao header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Dados (começando da linha 7)
    let rowIndex = 7;
    materiais.forEach((material) => {
      const row = sheet.getRow(rowIndex);
      row.values = [
        material.sku,
        material.nome || material.descricao,
        material.unidadeMedida,
        null, // Preço Cotado (para fornecedor preencher)
        null, // Prazo de Entrega (para fornecedor preencher)
        null // Observações
      ];

      // Colorir linhas alternadas
      const fillColor = rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });

      rowIndex++;
    });

    // Formatação de colunas
    sheet.getColumn(1).width = 15; // SKU
    sheet.getColumn(2).width = 50; // Nome
    sheet.getColumn(3).width = 12; // Unidade
    sheet.getColumn(4).width = 18; // Preço Cotado
    sheet.getColumn(5).width = 18; // Prazo de Entrega
    sheet.getColumn(6).width = 35; // Observações

    // Formato numérico para preço
    sheet.getColumn(4).numFmt = '"R$ "#,##0.00';

    // Alinhar células de dados
    for (let i = 7; i < rowIndex; i++) {
      const row = sheet.getRow(i);
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Configurar headers antes de escrever
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cotacao-materiais-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Escrever diretamente no response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('❌ Erro ao gerar Excel:', error);
    throw error;
  }
}

/**
 * Gerar arquivo CSV para cotação
 */
async function gerarCSVCotacao(res: Response, materiais: any[]) {
  let csv = 'Código (SKU);Nome do Material;Unidade;Preço Cotado;Prazo de Entrega;Observações\n';

  materiais.forEach((material) => {
    csv += `${material.sku};`;
    csv += `${material.nome || material.descricao};`;
    csv += `${material.unidadeMedida};`;
    csv += `;`; // Preço Cotado (para fornecedor preencher)
    csv += `;`; // Prazo de Entrega (para fornecedor preencher)
    csv += `\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=cotacao-materiais-${new Date().toISOString().split('T')[0]}.csv`);
  
  // Adicionar BOM UTF-8 para Excel reconhecer corretamente
  res.write('\uFEFF');
  res.write(csv);
  res.end();
}

/**
 * Gerar arquivo PDF para cotação
 */
async function gerarPDFCotacao(res: Response, materiais: any[]) {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=cotacao-materiais-${new Date().toISOString().split('T')[0]}.pdf`);

  doc.pipe(res);

  // Cabeçalho
  doc.fontSize(16).fillColor('#000000').text('S3E ENGENHARIA ELÉTRICA', 30, 30, { align: 'center', width: 782 });
  doc.fontSize(12).fillColor('#333333').text('Solicitação de Cotação - Lista de Materiais', 30, 50, { align: 'center', width: 782 });
  doc.fontSize(9).fillColor('#666666').text(
    `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    30, 70, { align: 'center', width: 782 }
  );

  // Instruções
  doc.fontSize(8).fillColor('#FF6600').text(
    'INSTRUÇÕES: Informe preço, prazo de entrega e condições de pagamento',
    30, 90, { align: 'center', width: 782 }
  );

  let yPos = 110;

  // Tabela - Header
  doc.fontSize(8).fillColor('#FFFFFF');
  doc.rect(30, yPos, 782, 20).fill('#4CAF50');

  const headers = ['SKU', 'Material', 'Un', 'Preço Cotado', 'Prazo Entrega', 'Observações'];
  const colX = [35, 100, 400, 480, 570, 660];
  
  headers.forEach((header, i) => {
    doc.fontSize(8).fillColor('#FFFFFF').text(header, colX[i], yPos + 6);
  });

  yPos += 20;

  // Linhas de materiais
  materiais.forEach((material, index) => {
    if (yPos > 540) {
      doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
      yPos = 30;
      
      // Repetir header na nova página
      doc.rect(30, yPos, 782, 20).fill('#4CAF50');
      headers.forEach((header, i) => {
        doc.fontSize(8).fillColor('#FFFFFF').text(header, colX[i], yPos + 6);
      });
      yPos += 20;
    }

    // Background alternado
    const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F5F5F5';
    doc.rect(30, yPos, 782, 18).fill(bgColor);

    // Dados
    doc.fontSize(7).fillColor('#000000');
    doc.text(material.sku || '', 35, yPos + 5);
    doc.text((material.nome || material.descricao || '').substring(0, 40), 100, yPos + 5);
    doc.text(material.unidadeMedida || '', 400, yPos + 5);
    doc.text('_____________', 480, yPos + 5); // Preço Cotado (para o fornecedor preencher)
    doc.text('_____________', 570, yPos + 5); // Prazo Entrega (para o fornecedor preencher)
    doc.text('', 660, yPos + 5); // Observações

    yPos += 18;
  });

  // Rodapé
  doc.fontSize(7).fillColor('#999999').text(
    `S3E Engenharia - Total de ${materiais.length} materiais`,
    30, 560, { align: 'center', width: 782 }
  );

  doc.end();
}

/**
 * Buscar histórico de preços de um material
 * GET /api/materiais/:id/historico-precos
 */
export const getHistoricoPrecos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const historico = await prisma.historicoPreco.findMany({
      where: { materialId: id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Últimas 50 alterações
    });

    const material = await prisma.material.findUnique({
      where: { id },
      select: {
        nome: true,
        sku: true,
        preco: true,
        ultimaAtualizacaoPreco: true
      }
    });

    res.json({
      success: true,
      data: {
        material,
        historico
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico de preços'
    });
  }
};

/**
 * POST /api/materiais/:id/recalcular-custo
 * Recalcula custo unitário quando compra veio em KM mas material está em M (corrige DRE).
 * Body opcional: { force: true } para forçar recálculo mesmo sem critério automático.
 */
export const recalcularCustoUnitario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: materialId } = req.params;
    const force = Boolean((req.body && typeof req.body === 'object' && req.body.force) || req.query.force === 'true');

    const resultado = await recalcularCustoUnitarioMaterial(materialId, { force });

    if (!resultado.aplicado) {
      res.status(400).json({
        success: false,
        message: resultado.motivo,
        aplicado: false,
        materialId: resultado.materialId,
        materialNome: resultado.materialNome
      });
      return;
    }

    res.json({
      success: true,
      message: resultado.motivo,
      aplicado: true,
      data: {
        materialId: resultado.materialId,
        materialNome: resultado.materialNome,
        valorUnitarioAnterior: resultado.valorUnitarioAnterior,
        valorUnitarioNovo: resultado.valorUnitarioNovo,
        numeroNF: resultado.numeroNF
      }
    });
  } catch (error) {
    console.error('Erro ao recalcular custo unitário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao recalcular custo unitário',
      aplicado: false
    });
  }
};

/**
 * GET /api/materiais/candidatos-recalculo-custo
 * Lista materiais em metros com custo muito alto (candidatos a correção KM→M).
 */
export const getCandidatosRecalculoCusto = async (_req: Request, res: Response): Promise<void> => {
  try {
    const candidatos = await listarCandidatosRecalculo();
    res.json({ success: true, data: candidatos });
  } catch (error) {
    console.error('Erro ao listar candidatos ao recálculo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar candidatos ao recálculo de custo'
    });
  }
};

/**
 * POST /api/materiais/:id/upload-imagem
 * Upload de imagem para um material
 */
export const uploadImagemMaterialHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Nenhuma imagem foi enviada' });
      return;
    }

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      res.status(404).json({ success: false, message: 'Material não encontrado' });
      return;
    }

    // Deletar imagem antiga se existir
    if (material.imagemUrl) {
      const oldImagePath = material.imagemUrl.replace('/uploads/', '');
      const cwd = process.cwd();
      const oldFilePath = path.join(cwd, 'uploads', 'materiais', oldImagePath.split('/').pop()!);
      
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Salvar nova URL no banco
    const imagemUrl = `/uploads/materiais/${req.file.filename}`;
    const materialAtualizado = await prisma.material.update({
      where: { id },
      data: { imagemUrl }
    });

    res.status(200).json({
      success: true,
      message: 'Imagem enviada com sucesso',
      data: {
        id: materialAtualizado.id,
        imagemUrl: materialAtualizado.imagemUrl
      }
    });
  } catch (error: any) {
    console.error('Erro ao fazer upload de imagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload de imagem',
      error: error.message
    });
  }
};

/**
 * POST /api/materiais/atualizar-skus-ncms
 * Atualiza SKUs e NCMs de materiais existentes
 * Gera SKUs únicos para materiais sem SKU ou com SKU no formato antigo
 * Atualiza NCMs de materiais que não têm mas deveriam ter (baseado em compras)
 */
export const atualizarSKUsENCMs = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 Iniciando atualização de SKUs e NCMs...');

    // Buscar todos os materiais ativos
    const materiais = await prisma.material.findMany({
      where: {
        ativo: true,
      },
      include: {
        compraItems: {
          include: {
            compra: {
              select: {
                dataCompra: true,
              },
            },
          },
          orderBy: {
            compra: {
              dataCompra: 'desc',
            },
          },
          // Buscar todas as compras para encontrar NCM mais recente
        },
      },
    });

    let materiaisAtualizados = 0;
    let skusGerados = 0;
    let ncmsAtualizados = 0;
    const erros: string[] = [];

    // Padrões de SKU antigo para identificar
    const padroesSKUAntigo = /^(NCM-|AUTO-)/i;
    const padraoSKUCorreto = /^SKU-/;

    for (const material of materiais) {
      try {
        let precisaAtualizarSKU = false;
        let precisaAtualizarNCM = false;
        let novoSKU: string | null = null;
        let novoNCM: string | null = material.ncm || null;

        // Verificar se precisa atualizar SKU
        if (!material.sku || 
            padroesSKUAntigo.test(material.sku) || 
            !padraoSKUCorreto.test(material.sku)) {
          precisaAtualizarSKU = true;
          novoSKU = await gerarSKUUnico(prisma, material.ncm || null);
          skusGerados++;
          console.log(`📦 Gerando SKU para ${material.nome}: ${novoSKU}`);
        }

        // Verificar se precisa atualizar NCM
        if (!material.ncm || material.ncm.trim() === '') {
          // Buscar NCM em todas as compras relacionadas (pegar o mais recente)
          if (material.compraItems && material.compraItems.length > 0) {
            // Ordenar por data da compra (mais recente primeiro) e pegar o primeiro com NCM
            const compraItemComNCM = material.compraItems
              .filter((item: any) => item.ncm && item.ncm.trim() !== '')
              .sort((a: any, b: any) => {
                const dataA = a.compra?.dataCompra || new Date(0);
                const dataB = b.compra?.dataCompra || new Date(0);
                return new Date(dataB).getTime() - new Date(dataA).getTime();
              })[0];
            
            if (compraItemComNCM && compraItemComNCM.ncm) {
              novoNCM = String(compraItemComNCM.ncm);
              precisaAtualizarNCM = true;
              ncmsAtualizados++;
              console.log(`🏷️ Encontrado NCM para ${material.nome}: ${novoNCM}`);
            }
          }
        }

        // Atualizar material se necessário
        if (precisaAtualizarSKU || precisaAtualizarNCM) {
          await prisma.material.update({
            where: { id: material.id },
            data: {
              ...(precisaAtualizarSKU && novoSKU ? { sku: novoSKU } : {}),
              ...(precisaAtualizarNCM && novoNCM ? { ncm: novoNCM } : {}),
              updatedAt: new Date(),
            },
          });
          materiaisAtualizados++;
        }
      } catch (error: any) {
        const erroMsg = `Erro ao atualizar material ${material.id} (${material.nome}): ${error.message}`;
        console.error(`❌ ${erroMsg}`);
        erros.push(erroMsg);
      }
    }

    console.log(`✅ Atualização concluída:`);
    console.log(`   - Materiais atualizados: ${materiaisAtualizados}`);
    console.log(`   - SKUs gerados: ${skusGerados}`);
    console.log(`   - NCMs atualizados: ${ncmsAtualizados}`);
    if (erros.length > 0) {
      console.log(`   - Erros: ${erros.length}`);
    }

    res.json({
      success: true,
      message: 'Atualização de SKUs e NCMs concluída',
      data: {
        totalMateriais: materiais.length,
        materiaisAtualizados,
        skusGerados,
        ncmsAtualizados,
        erros: erros.length > 0 ? erros : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar SKUs e NCMs:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar SKUs e NCMs',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/materiais/:id/imagem
 * Remove a imagem de um material
 */
export const deletarImagemMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      res.status(404).json({ success: false, message: 'Material não encontrado' });
      return;
    }

    if (!material.imagemUrl) {
      res.status(400).json({ success: false, message: 'Material não possui imagem' });
      return;
    }

    // Deletar arquivo físico
    const imagePath = material.imagemUrl.replace('/uploads/', '');
    const cwd = process.cwd();
    const filePath = path.join(cwd, 'uploads', 'materiais', imagePath.split('/').pop()!);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remover URL do banco
    await prisma.material.update({
      where: { id },
      data: { imagemUrl: null }
    });

    res.status(200).json({
      success: true,
      message: 'Imagem removida com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar imagem',
      error: error.message
    });
  }
};

/**
 * GET /api/materiais/imagem/:filename
 * Serve imagem de material (rota pública)
 */
export const servirImagemMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const cwd = process.cwd();
    const filePath = path.join(cwd, 'uploads', 'materiais', filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'Imagem não encontrada' });
      return;
    }

    res.sendFile(filePath);
  } catch (error: any) {
    console.error('Erro ao servir imagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao servir imagem',
      error: error.message
    });
  }
};

/**
 * POST /api/materiais/atualizar-valores-venda
 * Atualiza valores de venda de todos os materiais baseado na configuração de markup
 * Acesso: admin, desenvolvedor
 */
export const atualizarValoresVenda = async (req: Request, res: Response) => {
  console.log('🔧 [API] Iniciando atualização de valores de venda dos materiais...');
  
  try {
    // 1. Buscar configuração atual do markup
    const configuracao = await prisma.configuracaoSistema.findFirst({
      select: {
        markupFabricante: true,
        multiplicadorVenda: true // fallback para versão legada
      }
    });

    const markup = configuracao?.markupFabricante || configuracao?.multiplicadorVenda || 1.55;
    console.log(`📊 [Valores] Usando markup: ${markup}x (${((markup - 1) * 100).toFixed(1)}% de lucro)`);

    // 2. Buscar materiais que têm preço de custo definido
    const materiaisComCusto = await prisma.material.findMany({
      where: {
        preco: {
          not: null,
          gt: 0
        }
      },
      select: {
        id: true,
        nome: true,
        sku: true,
        preco: true,
        valorVenda: true,
        unidadeMedida: true
      }
    });

    console.log(`📦 [Materiais] Encontrados ${materiaisComCusto.length} materiais com preço de custo`);

    if (materiaisComCusto.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum material com preço de custo encontrado',
        data: {
          totalMateriais: 0,
          materiaisAtualizados: 0,
          markup: markup,
          cobertura: 0
        }
      });
    }

    // 3. Atualizar materiais em lotes para performance
    let sucessos = 0;
    let erros = 0;
    const LOTE_SIZE = 20;

    for (let i = 0; i < materiaisComCusto.length; i += LOTE_SIZE) {
      const lote = materiaisComCusto.slice(i, i + LOTE_SIZE);
      
      console.log(`📦 [Lote] Processando ${Math.floor(i / LOTE_SIZE) + 1}/${Math.ceil(materiaisComCusto.length / LOTE_SIZE)}`);
      
      // Processar lote em paralelo
      const promises = lote.map(async (material) => {
        try {
          if (!material.preco || material.preco <= 0) {
            return { sucesso: false, erro: 'Preço inválido' };
          }

          // Calcular novo valor de venda
          const novoValorVenda = roundMoney(material.preco * markup);
          
          // Calcular custos específicos por unidade de medida
          let valorVendaM: number | null = null;
          let valorVendaCM: number | null = null;
          let custoCM: number | null = null;

          if (material.unidadeMedida === 'M' || material.unidadeMedida === 'KG/M') {
            valorVendaM = novoValorVenda;
            valorVendaCM = roundMoney(novoValorVenda / 100);
            custoCM = roundMoney(material.preco / 100);
          }

          // Calcular porcentagem de lucro
          const porcentagemLucro = ((novoValorVenda - material.preco) / material.preco) * 100;

          // Atualizar material
          await prisma.material.update({
            where: { id: material.id },
            data: {
              valorVenda: novoValorVenda,
              valorVendaM: valorVendaM,
              valorVendaCM: valorVendaCM,
              custoCM: custoCM,
              porcentagemLucro: roundMoney(porcentagemLucro)
            }
          });

          console.log(`✅ [${material.sku}] ${material.nome}: R$ ${material.preco?.toFixed(2)} → R$ ${novoValorVenda.toFixed(2)} (+${porcentagemLucro.toFixed(1)}%)`);
          
          return { sucesso: true, material: material.sku };

        } catch (error: any) {
          console.error(`❌ [${material.sku}] Erro ao atualizar:`, error.message);
          return { sucesso: false, erro: error.message };
        }
      });

      // Aguardar conclusão do lote
      const resultados = await Promise.all(promises);
      
      // Contar resultados
      sucessos += resultados.filter(r => r.sucesso).length;
      erros += resultados.filter(r => !r.sucesso).length;
      
      // Pequena pausa entre lotes para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. Calcular estatísticas finais
    const cobertura = materiaisComCusto.length > 0 ? ((sucessos / materiaisComCusto.length) * 100) : 0;

    console.log(`\n🎉 [Resultado] Atualização concluída:`);
    console.log(`   ✅ Sucessos: ${sucessos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📊 Cobertura: ${cobertura.toFixed(1)}%`);
    console.log(`   💰 Markup aplicado: ${markup}x`);

    res.status(200).json({
      success: true,
      message: `Valores de venda atualizados com sucesso!`,
      data: {
        totalMateriais: materiaisComCusto.length,
        materiaisAtualizados: sucessos,
        erros: erros,
        markup: markup,
        cobertura: Math.round(cobertura * 10) / 10, // 1 casa decimal
        porcentagemLucro: ((markup - 1) * 100).toFixed(1)
      }
    });
    
  } catch (error: any) {
    console.error('❌ [API] Erro ao atualizar valores de venda:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar valores de venda dos materiais',
      message: error.message || 'Erro interno do servidor'
    });
  }
};

/**
 * GET /api/materiais/import/template
 * Retorna template JSON para importação em lote (chaves aceitas pelo sistema).
 */
export const exportarTemplateMateriais = async (_req: Request, res: Response): Promise<void> => {
  try {
    const template = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      _instrucoes: 'Preencha o array "materiais". Por item: nome (ou descricao) é obrigatório. Opcionais: tipo, categoria, unidadeMedida, preco, estoque, estoqueMinimo, sku, ncm, fornecedorId.',
      materiais: [
        {
          nome: 'Exemplo Material 1',
          descricao: 'Descrição opcional',
          tipo: 'Insumo',
          categoria: 'Material Elétrico',
          unidadeMedida: 'un',
          preco: 100,
          estoque: 50,
          estoqueMinimo: 10,
          sku: '',
          ncm: '',
          fornecedorId: null,
          ativo: true
        },
        {
          nome: 'Exemplo Material 2',
          tipo: 'Material Elétrico',
          categoria: 'Material Elétrico',
          unidadeMedida: 'm',
          preco: 25.5,
          estoque: 0,
          estoqueMinimo: 5,
          ativo: true
        }
      ]
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="template_materiais_${Date.now()}.json"`);
    res.json(template);
  } catch (error) {
    console.error('Erro ao exportar template de materiais:', error);
    res.status(500).json({ error: 'Erro ao exportar template' });
  }
};

/**
 * POST /api/materiais/import
 * Importa vários materiais de uma vez via JSON (body: { materiais: [...] }).
 */
export const importarMateriais = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materiais: itens } = req.body as { materiais?: any[] };
    if (!Array.isArray(itens) || itens.length === 0) {
      res.status(400).json({ error: 'Envie um objeto com array "materiais" contendo os itens' });
      return;
    }

    const resultados = { criados: 0, erros: 0 as number, mensagens: [] as string[] };

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      try {
        let { categoria, nome, sku, ncm, unidadeMedida, tipo, codigo, unidade, ...rest } = item;
        const nomeFinal = (nome && String(nome).trim()) || item.descricao || item.codigo || 'Material sem nome';
        const tipoFinal = (tipo && String(tipo).trim()) || categoria || 'Insumo';
        if (categoria) categoria = normalizarCategoria(categoria);
        if (!categoria || !isCategoriaValida(categoria)) {
          categoria = classificarMaterialPorNome(nomeFinal || '');
        }
        let skuFinal = sku;
        if (!skuFinal || String(skuFinal).trim() === '') {
          skuFinal = await gerarSKUUnico(prisma, ncm || null);
        }
        const unidadeMedidaFinal = unidadeMedida || unidade || 'un';

        const config = await prisma.configuracaoSistema.findUnique({
          where: { id: 'sistema-config' },
          select: { aliquotaImpostoPadrao: true, markupFabricante: true, markupRevendedor: true, percentualImpostoPadrao: true, multiplicadorVenda: true }
        }).catch(() => null);
        const aliquota = config?.aliquotaImpostoPadrao ?? config?.percentualImpostoPadrao ?? 8;
        let markup = config?.markupFabricante ?? config?.multiplicadorVenda ?? 1.55;
        if (rest.fornecedorId) {
          const forn = await prisma.fornecedor.findUnique({ where: { id: rest.fornecedorId }, select: { classificacao: true } });
          if (forn?.classificacao === 'Representante_Vendedor') markup = config?.markupRevendedor ?? 1.10;
        }
        const precoNum = typeof rest.preco === 'number' ? rest.preco : parseFloat(rest.preco) || 0;
        const aliquotaMaterial = rest.percentualImposto != null ? Number(rest.percentualImposto) : aliquota;
        const precificacao = precoNum > 0 || rest.valorVenda != null
          ? calcularPrecificacaoSimplesNacional(precoNum, rest.valorVenda, markup, aliquotaMaterial)
          : null;

        const dataCreate: any = {
          nome: nomeFinal,
          tipo: tipoFinal,
          categoria,
          sku: skuFinal,
          descricao: rest.descricao ?? nomeFinal,
          ncm: ncm || null,
          unidadeMedida: unidadeMedidaFinal,
          estoque: rest.estoque != null ? Number(rest.estoque) : 0,
          estoqueMinimo: rest.estoqueMinimo != null ? Number(rest.estoqueMinimo) : 5,
          preco: rest.preco != null ? Number(rest.preco) : null,
          fornecedorId: rest.fornecedorId || null,
          ativo: rest.ativo !== false,
          localizacao: rest.localizacao ?? null,
          imagemUrl: rest.imagemUrl ?? null,
          quantidadePorEmbalagem: rest.quantidadePorEmbalagem ?? null,
          tipoEmbalagem: rest.tipoEmbalagem ?? null,
          precoEmbalagem: rest.precoEmbalagem ?? null,
          precoUnitario: rest.precoUnitario ?? null,
          percentualImposto: rest.percentualImposto ?? null,
        };
        if (precificacao) {
          dataCreate.valorVenda = precificacao.valorVenda;
          dataCreate.valorImposto = precificacao.valorImposto;
          dataCreate.custoAgregado = precificacao.custoAgregado;
          dataCreate.porcentagemLucro = precoNum > 0 ? roundMoney(((precificacao.valorVenda - precoNum) / precoNum) * 100) : null;
        }

        await prisma.material.create({ data: dataCreate });
        resultados.criados++;
      } catch (err: any) {
        resultados.erros++;
        resultados.mensagens.push(`Item ${i + 1} (${item.nome || item.descricao || '?'}): ${err?.message || 'erro'}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `${resultados.criados} material(is) criado(s). ${resultados.erros} erro(s).`,
      data: resultados
    });
  } catch (error) {
    console.error('Erro ao importar materiais:', error);
    res.status(500).json({ error: 'Erro ao importar materiais' });
  }
};

type MaterialCabosPrecoRow = {
  id: string;
  nome: string;
  preco: number | null;
  valorVenda: number | null;
  fornecedorId: string | null;
  percentualImposto: number | null;
  unidadeMedida: string;
};

/** Mesma regra de `updateMaterial` (SN + markup por fornecedor) + campos por metro para unidade M/KG-M. */
async function buildMaterialDataUpdateNovoPrecoCusto(
  material: MaterialCabosPrecoRow,
  novoPreco: number
): Promise<Record<string, unknown>> {
  const config = await prisma.configuracaoSistema
    .findUnique({
      where: { id: 'sistema-config' },
      select: {
        aliquotaImpostoPadrao: true,
        markupFabricante: true,
        markupRevendedor: true,
        percentualImpostoPadrao: true,
        multiplicadorVenda: true
      }
    })
    .catch(() => null);
  const aliquota = config?.aliquotaImpostoPadrao ?? config?.percentualImpostoPadrao ?? 8;
  let markup = config?.markupFabricante ?? config?.multiplicadorVenda ?? 1.55;
  if (material.fornecedorId) {
    const forn = await prisma.fornecedor.findUnique({
      where: { id: material.fornecedorId },
      select: { classificacao: true }
    });
    if (forn?.classificacao === 'Representante_Vendedor') markup = config?.markupRevendedor ?? 1.10;
  }
  const aliquotaMaterial =
    material.percentualImposto != null ? Number(material.percentualImposto) : aliquota;
  const precificacao =
    novoPreco > 0 || material.valorVenda != null
      ? calcularPrecificacaoSimplesNacional(novoPreco, undefined, markup, aliquotaMaterial)
      : null;

  const data: Record<string, unknown> = {
    preco: novoPreco,
    ultimaAtualizacaoPreco: new Date()
  };

  if (precificacao) {
    data.valorVenda = precificacao.valorVenda;
    data.valorImposto = precificacao.valorImposto;
    data.custoAgregado = precificacao.custoAgregado;
  }

  const um = (material.unidadeMedida || 'un').toLowerCase();
  if ((um === 'm' || um === 'kg/m') && precificacao && novoPreco > 0) {
    data.valorVendaM = precificacao.valorVenda;
    data.valorVendaCM = roundMoney(precificacao.valorVenda / 100);
    data.custoCM = roundMoney(novoPreco / 100);
    data.porcentagemLucro = roundMoney(
      ((precificacao.valorVenda - novoPreco) / novoPreco) * 100
    );
  }

  return data;
}

async function listarMateriaisCabosFamiliaBitola(
  familia: CableFamilia,
  bitolaMm2: number
): Promise<MaterialCabosPrecoRow[]> {
  const todos = await prisma.material.findMany({
    where: {
      ativo: true,
      nome: { contains: 'CABO', mode: 'insensitive' }
    },
    select: {
      id: true,
      nome: true,
      preco: true,
      valorVenda: true,
      fornecedorId: true,
      percentualImposto: true,
      unidadeMedida: true
    }
  });

  return todos.filter((m) => combinaFamiliaEBitola(m.nome, familia, bitolaMm2));
}

/**
 * POST /api/materiais/cabos/preview-preco-bitola
 * Body: { familia, bitolaMm2 }
 */
export const previewPrecoBitolaCabo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { familia, bitolaMm2 } = req.body as { familia?: string; bitolaMm2?: unknown };
    if (!familia || !isCableFamilia(familia)) {
      res.status(400).json({ error: 'Informe familia: FLEX_750V | FLEX_1KV | RIGIDO_1KV' });
      return;
    }
    const bitola =
      typeof bitolaMm2 === 'number' ? bitolaMm2 : parseFloat(String(bitolaMm2 ?? ''));
    if (!Number.isFinite(bitola) || bitola <= 0) {
      res.status(400).json({ error: 'bitolaMm2 inválida' });
      return;
    }

    const lista = await listarMateriaisCabosFamiliaBitola(familia, bitola);
    res.json({
      success: true,
      total: lista.length,
      materiais: lista.map((m) => ({
        id: m.id,
        nome: m.nome,
        precoAtual: m.preco
      }))
    });
  } catch (error) {
    console.error('previewPrecoBitolaCabo:', error);
    res.status(500).json({ error: 'Erro ao pré-visualizar materiais' });
  }
};

/**
 * POST /api/materiais/cabos/aplicar-preco-bitola
 * Body: { familia, bitolaMm2, preco }
 */
export const aplicarPrecoBitolaCabo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { familia, bitolaMm2, preco } = req.body as {
      familia?: string;
      bitolaMm2?: unknown;
      preco?: unknown;
    };
    if (!familia || !isCableFamilia(familia)) {
      res.status(400).json({ error: 'Informe familia: FLEX_750V | FLEX_1KV | RIGIDO_1KV' });
      return;
    }
    const bitola =
      typeof bitolaMm2 === 'number' ? bitolaMm2 : parseFloat(String(bitolaMm2 ?? ''));
    if (!Number.isFinite(bitola) || bitola <= 0) {
      res.status(400).json({ error: 'bitolaMm2 inválida' });
      return;
    }
    const novoPreco = typeof preco === 'number' ? preco : parseFloat(String(preco ?? ''));
    if (!Number.isFinite(novoPreco) || novoPreco < 0) {
      res.status(400).json({ error: 'preço inválido' });
      return;
    }

    const lista = await listarMateriaisCabosFamiliaBitola(familia, bitola);
    if (lista.length === 0) {
      res.status(200).json({
        success: false,
        error: 'Nenhum material encontrado para esta família e bitola',
        atualizados: 0,
        ids: [] as string[]
      });
      return;
    }

    const ids: string[] = [];
    const LOTE = 15;
    for (let i = 0; i < lista.length; i += LOTE) {
      const lote = lista.slice(i, i + LOTE);
      await Promise.all(
        lote.map(async (m) => {
          const data = await buildMaterialDataUpdateNovoPrecoCusto(m, novoPreco);
          await prisma.material.update({
            where: { id: m.id },
            data: data as any
          });
          ids.push(m.id);
        })
      );
    }

    res.json({
      success: true,
      atualizados: ids.length,
      ids
    });
  } catch (error) {
    console.error('aplicarPrecoBitolaCabo:', error);
    res.status(500).json({ error: 'Erro ao aplicar preços' });
  }
};
