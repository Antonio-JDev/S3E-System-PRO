import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';
import { gerarSKUCotacao } from '../utils/skuGenerator';
import gerarSKUsParaCotacoes from '../scripts/gerarSKUsCotacoes';

/**
 * Listar todas as cotações
 * GET /api/cotacoes
 */
export const listarCotacoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ativo, fornecedorId } = req.query;

    const where: any = {};
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }
    if (fornecedorId) {
      where.fornecedorId = fornecedorId as string;
    }

    const cotacoes = await prisma.cotacao.findMany({
      where,
      include: {
        fornecedor: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
            classificacao: true,
          }
        }
      },
      orderBy: {
        dataAtualizacao: 'desc'
      }
    });

    res.json({
      success: true,
      data: cotacoes
    });
  } catch (error) {
    console.error('Erro ao listar cotações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar cotações'
    });
  }
};

/**
 * Buscar cotação por ID
 * GET /api/cotacoes/:id
 */
export const buscarCotacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cotacao = await prisma.cotacao.findUnique({
      where: { id },
      include: {
        fornecedor: true
      }
    });

    if (!cotacao) {
      res.status(404).json({
        success: false,
        error: 'Cotação não encontrada'
      });
      return;
    }

    res.json({
      success: true,
      data: cotacao
    });
  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar cotação'
    });
  }
};

/**
 * Calcula valor de venda para orçamento conforme classificação do fornecedor:
 * - Representante_Vendedor: valor de venda = valor unitário (preço já é de venda).
 * - Fabricante ou sem classificação: valor de venda = valor unitário × markupFabricante (ex.: 1,55).
 */
async function calcularValorVendaPorClassificacao(
  valorUnitario: number,
  fornecedorId: string | null | undefined,
  valorVendaEnviado: number | undefined
): Promise<number> {
  if (fornecedorId) {
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: fornecedorId },
      select: { classificacao: true }
    });
    const config = await prisma.configuracaoSistema.findFirst({
      select: { markupFabricante: true, multiplicadorVenda: true }
    });
    const markupFabricante = config?.markupFabricante ?? config?.multiplicadorVenda ?? 1.55;

    if (fornecedor?.classificacao === 'Representante_Vendedor') {
      return valorUnitario; // Vendedor: valor que entra no orçamento = valor do fornecedor
    }
    // Fabricante ou sem classificação: preço × coeficiente
    if (fornecedor?.classificacao === 'Fabricante' || !fornecedor?.classificacao) {
      return Math.round(valorUnitario * markupFabricante * 100) / 100;
    }
  }
  // Sem fornecedor ou valor enviado explicitamente
  if (valorVendaEnviado !== undefined) return valorVendaEnviado;
  return Math.round(valorUnitario * 1.4 * 100) / 100; // padrão 40% de margem
}

/**
 * Criar nova cotação
 * POST /api/cotacoes
 */
export const criarCotacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, ncm, valorUnitario, valorVenda, unidadeMedida, fornecedorId, fornecedorNome, observacoes, quantidadePorEmbalagem } = req.body;

    // Validações
    if (!nome || valorUnitario === undefined) {
      res.status(400).json({
        success: false,
        error: 'Nome e valor unitário são obrigatórios'
      });
      return;
    }

    const valorUnitarioNum = parseFloat(valorUnitario);
    const valorVendaCalculado = await calcularValorVendaPorClassificacao(
      valorUnitarioNum,
      fornecedorId || null,
      valorVenda !== undefined ? parseFloat(valorVenda) : undefined
    );

    // 🔧 Gerar SKU único para cotação (obrigatório para NF-e)
    const skuCotacao = await gerarSKUCotacao(prisma);

    const cotacao = await prisma.cotacao.create({
      data: {
        nome,
        sku: skuCotacao, // ✅ SKU obrigatório para campo cProd da NF-e
        ncm,
        valorUnitario: valorUnitarioNum,
        valorVenda: valorVendaCalculado,
        unidadeMedida: unidadeMedida || 'un',
        fornecedorId,
        fornecedorNome,
        observacoes,
        quantidadePorEmbalagem: quantidadePorEmbalagem != null ? parseFloat(quantidadePorEmbalagem) : null,
        dataAtualizacao: new Date()
      } as any,
      include: {
        fornecedor: true
      }
    });

    res.status(201).json({
      success: true,
      data: cotacao
    });
  } catch (error) {
    console.error('Erro ao criar cotação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar cotação'
    });
  }
};

/**
 * Atualizar cotação
 * PUT /api/cotacoes/:id
 */
export const atualizarCotacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nome, ncm, valorUnitario, valorVenda, unidadeMedida, fornecedorId, fornecedorNome, observacoes, ativo, atualizarDataCotacao, quantidadePorEmbalagem } = req.body;

    const updateData: any = {
      ...(nome && { nome }),
      ...(ncm !== undefined && { ncm }),
      ...(unidadeMedida !== undefined && { unidadeMedida }),
      ...(fornecedorId !== undefined && { fornecedorId }),
      ...(fornecedorNome !== undefined && { fornecedorNome }),
      ...(observacoes !== undefined && { observacoes }),
      ...(ativo !== undefined && { ativo }),
      ...(quantidadePorEmbalagem !== undefined && { quantidadePorEmbalagem: quantidadePorEmbalagem == null || quantidadePorEmbalagem === '' ? null : parseFloat(quantidadePorEmbalagem) })
    };

    const valorUnitarioNum = valorUnitario !== undefined ? parseFloat(valorUnitario) : undefined;
    const fornecedorIdAtual = fornecedorId !== undefined ? (fornecedorId || null) : undefined;

    // Recalcular valorVenda por classificação quando há fornecedor e valor unitário
    if (valorUnitarioNum !== undefined || fornecedorIdAtual !== undefined) {
      const cotacaoAtual = await prisma.cotacao.findUnique({
        where: { id },
        select: { valorUnitario: true, fornecedorId: true }
      });
      if (cotacaoAtual) {
        const vu = valorUnitarioNum ?? cotacaoAtual.valorUnitario;
        const fid = fornecedorIdAtual !== undefined ? fornecedorIdAtual : cotacaoAtual.fornecedorId;
        const valorVendaRecalc = await calcularValorVendaPorClassificacao(
          vu,
          fid,
          valorVenda !== undefined ? parseFloat(valorVenda) : undefined
        );
        updateData.valorVenda = valorVendaRecalc;
      }
    }

    if (valorUnitarioNum !== undefined) {
      updateData.valorUnitario = valorUnitarioNum;
      updateData.dataAtualizacao = new Date();
    }

    if (valorVenda !== undefined && valorUnitarioNum === undefined && fornecedorIdAtual === undefined) {
      updateData.valorVenda = parseFloat(valorVenda);
    }

    if (atualizarDataCotacao !== false && (valorUnitarioNum !== undefined || nome || ncm)) {
      updateData.dataAtualizacao = new Date();
    }

    const cotacao = await prisma.cotacao.update({
      where: { id },
      data: updateData,
      include: {
        fornecedor: true
      }
    });

    res.json({
      success: true,
      data: cotacao
    });
  } catch (error) {
    console.error('Erro ao atualizar cotação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar cotação'
    });
  }
};

/**
 * Deletar cotação
 * DELETE /api/cotacoes/:id
 */
export const deletarCotacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'ID da cotação é obrigatório'
      });
      return;
    }

    // Verificar se a cotação existe antes de deletar
    const cotacao = await prisma.cotacao.findUnique({
      where: { id }
    });

    if (!cotacao) {
      res.status(404).json({
        success: false,
        error: 'Cotação não encontrada'
      });
      return;
    }

    await prisma.cotacao.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Cotação deletada com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao deletar cotação:', error);
    
    // Tratar erro específico do Prisma quando registro não existe
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Cotação não encontrada'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao deletar cotação',
      message: error.message
    });
  }
};

/**
 * Importar cotações de JSON
 * POST /api/cotacoes/importar
 */
/**
 * Preview de importação (validação antes de salvar)
 * POST /api/cotacoes/preview-importacao
 */
export const previewImportacao = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    console.log('📥 Preview de importação do arquivo:', file.path);

    // Ler arquivo JSON
    const jsonContent = fs.readFileSync(file.path, 'utf-8');
    let jsonData = JSON.parse(jsonContent);

    // Remover wrapper se existir
    if (jsonData.success && jsonData.data) {
      jsonData = jsonData.data;
    }

    if (!jsonData.cotacoes || !Array.isArray(jsonData.cotacoes)) {
      res.status(400).json({
        success: false,
        error: 'Formato JSON inválido. Deve conter array "cotacoes"'
      });
      return;
    }

    // Buscar todas as cotações existentes para comparação
    const cotacoesExistentes = await prisma.cotacao.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        ncm: true,
        valorUnitario: true,
        valorVenda: true,
        fornecedorNome: true
      }
    });

    // Buscar todos os fornecedores para verificar classificação
    const fornecedores = await prisma.fornecedor.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        classificacao: true
      }
    });

    // Criar mapa de fornecedores por nome (case insensitive)
    const mapaFornecedores = new Map<string, { id: string; nome: string; classificacao: string | null }>();
    fornecedores.forEach(f => {
      mapaFornecedores.set(f.nome.toLowerCase().trim(), f);
    });

    // Criar mapa para busca rápida (nome + fornecedorNome como chave)
    const mapaExistentes = new Map<string, typeof cotacoesExistentes[0]>();
    cotacoesExistentes.forEach(c => {
      const chave = `${c.nome}|${c.fornecedorNome || ''}`;
      mapaExistentes.set(chave, c);
    });

    // Processar cotações para preview com informações de comparação
    const cotacoesPreview = jsonData.cotacoes.map((cotacao: any) => {
      const valorUnitario = parseFloat(cotacao.valorUnitario) || 0;
      
      // Verificar se o fornecedor é representante para aplicar markup de 10%
      const fornecedorNome = cotacao.fornecedorNome || '';
      const fornecedor = mapaFornecedores.get(fornecedorNome.toLowerCase().trim());
      const isRepresentante = fornecedor?.classificacao === 'Representante_Vendedor';
      
      // Calcular valor de venda:
      // - Representante: valor unitário × 1.1 (10% markup para cobrir impostos)
      // - Outros: valor unitário × 1.4 (40% margem padrão)
      let valorVenda: number;
      if (cotacao.valorVenda !== undefined && cotacao.valorVenda !== null) {
        valorVenda = parseFloat(cotacao.valorVenda);
      } else if (isRepresentante) {
        valorVenda = Math.round(valorUnitario * 1.1 * 100) / 100;
      } else {
        valorVenda = Math.round(valorUnitario * 1.4 * 100) / 100;
      }

      const chave = `${cotacao.nome}|${fornecedorNome}`;
      const existente = mapaExistentes.get(chave);

      // Determinar status da cotação
      let status: 'novo' | 'atualizado' | 'mantido' = 'novo';
      let valorAnterior: number | null = null;

      if (existente) {
        // Comparar valores com tolerância de 0.01 para evitar problemas de ponto flutuante
        const valorMudou = Math.abs(existente.valorUnitario - valorUnitario) > 0.01;
        
        if (valorMudou) {
          status = 'atualizado';
          valorAnterior = existente.valorUnitario;
        } else {
          status = 'mantido';
          valorAnterior = existente.valorUnitario;
        }
      }

      return {
        nome: cotacao.nome,
        ncm: cotacao.ncm || '',
        valorUnitario,
        valorVenda,
        fornecedorNome,
        fornecedorId: fornecedor?.id || null,
        fornecedorClassificacao: fornecedor?.classificacao || null,
        isRepresentante,
        observacoes: cotacao.observacoes || '',
        status, // 'novo' | 'atualizado' | 'mantido'
        valorAnterior,
        idExistente: existente?.id || null
      };
    });

    // Calcular estatísticas
    const estatisticas = {
      novos: cotacoesPreview.filter((c: any) => c.status === 'novo').length,
      atualizados: cotacoesPreview.filter((c: any) => c.status === 'atualizado').length,
      mantidos: cotacoesPreview.filter((c: any) => c.status === 'mantido').length,
      total: cotacoesPreview.length
    };

    res.json({
      success: true,
      data: {
        total: cotacoesPreview.length,
        cotacoes: cotacoesPreview,
        estatisticas
      }
    });
  } catch (error) {
    console.error('Erro ao fazer preview de importação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer preview de importação'
    });
  }
};

export const importarCotacoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    // CORREÇÃO: Tornar o destructuring seguro (req.body pode ser undefined se não houver body parser)
    const cotacoes = req.body?.cotacoes; // Usar optional chaining

    if (!file && !cotacoes) {
      res.status(400).json({
        success: false,
        error: 'Nenhum arquivo ou dados foram enviados'
      });
      return;
    }

    let cotacoesParaImportar: any[] = [];

    if (cotacoes && Array.isArray(cotacoes)) {
      // Se vier do modal de preview, usar os dados já processados
      cotacoesParaImportar = cotacoes;
    } else if (file) {
      // Se vier direto do arquivo, processar normalmente
      console.log('📥 Importando cotações do arquivo:', file.filename);

      const jsonContent = fs.readFileSync(file.path, 'utf-8');
      let jsonData = JSON.parse(jsonContent);

      if (jsonData.success && jsonData.data) {
        jsonData = jsonData.data;
      }

      if (!jsonData.cotacoes || !Array.isArray(jsonData.cotacoes)) {
        res.status(400).json({
          success: false,
          error: 'Formato JSON inválido. Deve conter array "cotacoes"'
        });
        return;
      }

      cotacoesParaImportar = jsonData.cotacoes;
    }

    // Processar cotações
    const resultados = {
      criados: 0,
      atualizados: 0,
      mantidos: 0,
      erros: 0,
      detalhes: [] as Array<{
        nome: string;
        status: 'criado' | 'atualizado' | 'mantido' | 'erro';
        valorAnterior?: number;
        valorNovo?: number;
        erro?: string;
      }>
    };

    for (const cotacao of cotacoesParaImportar) {
      try {
        const valorUnitario = parseFloat(cotacao.valorUnitario);
        const valorVenda = cotacao.valorVenda !== undefined 
          ? parseFloat(cotacao.valorVenda) 
          : valorUnitario * 1.4; // 40% de margem padrão

        // Verificar se já existe (por nome + fornecedor)
        const existente = await prisma.cotacao.findFirst({
          where: {
            nome: cotacao.nome,
            fornecedorNome: cotacao.fornecedorNome
          }
        });

        if (existente) {
          // Comparar valores com tolerância de 0.01
          const valorUnitarioMudou = Math.abs(existente.valorUnitario - valorUnitario) > 0.01;
          
          if (valorUnitarioMudou) {
            // Atualizar - atualizar dataAtualizacao apenas se valorUnitario mudou
            await prisma.cotacao.update({
              where: { id: existente.id },
              data: {
                valorUnitario,
                valorVenda,
                unidadeMedida: cotacao.unidadeMedida || 'un',
                ncm: cotacao.ncm,
                observacoes: cotacao.observacoes,
                dataAtualizacao: new Date()
              } as any
            });
            resultados.atualizados++;
            resultados.detalhes.push({
              nome: cotacao.nome,
              status: 'atualizado',
              valorAnterior: existente.valorUnitario,
              valorNovo: valorUnitario
            });
          } else {
            // Manter valor existente (não atualizar)
            resultados.mantidos++;
            resultados.detalhes.push({
              nome: cotacao.nome,
              status: 'mantido',
              valorAnterior: existente.valorUnitario,
              valorNovo: existente.valorUnitario
            });
          }
        } else {
          // Criar
          // 🔧 Gerar SKU único para cotação (obrigatório para NF-e)
          const skuCotacaoImport = await gerarSKUCotacao(prisma);
          
          await prisma.cotacao.create({
            data: {
              nome: cotacao.nome,
              sku: skuCotacaoImport, // ✅ SKU obrigatório para campo cProd da NF-e
              ncm: cotacao.ncm,
              valorUnitario,
              valorVenda,
              unidadeMedida: cotacao.unidadeMedida || 'un',
              fornecedorId: cotacao.fornecedorId,
              fornecedorNome: cotacao.fornecedorNome,
              observacoes: cotacao.observacoes,
              dataAtualizacao: new Date()
            } as any
          });
          resultados.criados++;
          resultados.detalhes.push({
            nome: cotacao.nome,
            status: 'criado',
            valorNovo: valorUnitario
          });
        }
      } catch (error: any) {
        console.error('Erro ao processar cotação:', cotacao.nome, error);
        resultados.erros++;
        resultados.detalhes.push({
          nome: cotacao.nome,
          status: 'erro',
          erro: error.message || 'Erro desconhecido'
        });
      }
    }

    // Limpar arquivo temporário se existir
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    console.log('✅ Importação concluída:', resultados);

    res.json({
      success: true,
      data: resultados
    });
  } catch (error) {
    console.error('Erro ao importar cotações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao importar cotações'
    });
  }
};

/**
 * Gerar template JSON para importação
 * GET /api/cotacoes/template
 */
export const gerarTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = {
      versao: '1.0',
      geradoEm: new Date().toISOString(),
      empresa: 'S3E Engenharia Elétrica',
      instrucoes: 'Preencha os campos das cotações abaixo. Mantenha a estrutura do JSON.',
      cotacoes: [
        {
          nome: 'EXEMPLO - Cabo de Cobre 2,5mm',
          ncm: '85444200',
          valorUnitario: 100.50,
          fornecedorNome: 'Fornecedor Exemplo Ltda',
          observacoes: 'Cotação válida por 30 dias'
        }
      ]
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(template);
  } catch (error) {
    console.error('Erro ao gerar template:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar template'
    });
  }
};

/**
 * Exportar cotações para JSON
 * GET /api/cotacoes/exportar
 */
export const exportarCotacoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const cotacoes = await prisma.cotacao.findMany({
      where: { ativo: true },
      include: {
        fornecedor: {
          select: {
            nome: true,
            cnpj: true
          }
        }
      },
      orderBy: {
        dataAtualizacao: 'desc'
      }
    });

    const exportData = {
      versao: '1.0',
      exportadoEm: new Date().toISOString(),
      empresa: 'S3E Engenharia Elétrica',
      totalCotacoes: cotacoes.length,
      cotacoes: cotacoes.map(c => ({
        nome: c.nome,
        ncm: c.ncm,
        valorUnitario: c.valorUnitario,
        valorVenda: c.valorVenda,
        fornecedorNome: c.fornecedorNome || c.fornecedor?.nome,
        dataAtualizacao: c.dataAtualizacao,
        observacoes: c.observacoes
      }))
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(exportData);
  } catch (error) {
    console.error('Erro ao exportar cotações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar cotações'
    });
  }
};

/**
 * Deletar múltiplas cotações
 * DELETE /api/cotacoes/bulk
 */
export const deletarCotacoesEmLote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Lista de IDs é obrigatória'
      });
      return;
    }

    // Filtrar IDs válidos (não vazios)
    const idsValidos = ids.filter((id: string) => id && id.trim() !== '');

    if (idsValidos.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Nenhum ID válido fornecido'
      });
      return;
    }

    // Verificar quantas cotações existem antes de deletar
    const cotacoesExistentes = await prisma.cotacao.findMany({
      where: {
        id: {
          in: idsValidos
        }
      },
      select: {
        id: true
      }
    });

    const idsExistentes = cotacoesExistentes.map(c => c.id);
    const idsNaoEncontrados = idsValidos.filter((id: string) => !idsExistentes.includes(id));

    // Deletar apenas as que existem
    const resultado = await prisma.cotacao.deleteMany({
      where: {
        id: {
          in: idsExistentes
        }
      }
    });

    // Preparar resposta com informações detalhadas
    const resposta: any = {
      success: true,
      data: {
        deletados: resultado.count,
        totalSolicitados: idsValidos.length,
        encontrados: idsExistentes.length,
        naoEncontrados: idsNaoEncontrados.length
      },
      message: `${resultado.count} cotação(ões) deletada(s) com sucesso`
    };

    // Adicionar aviso se houver IDs não encontrados
    if (idsNaoEncontrados.length > 0) {
      resposta.aviso = `${idsNaoEncontrados.length} cotação(ões) não encontrada(s) e não foram deletadas`;
    }

    res.json(resposta);
  } catch (error: any) {
    console.error('Erro ao deletar cotações em lote:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar cotações',
      message: error.message
    });
  }
};

/**
 * Gerar SKUs para todas as cotações existentes
 * Rota: POST /api/cotacoes/gerar-skus
 * Acesso: admin, desenvolvedor
 */
export const gerarSKUsCotacoes = async (req: Request, res: Response) => {
  console.log('🔧 [API] Iniciando geração de SKUs para cotações via interface...');
  
  try {
    // Executar o script de geração de SKUs
    await gerarSKUsParaCotacoes();
    
    // Buscar estatísticas atualizadas
    const [totalCotacoes, cotacoesComSKU] = await Promise.all([
      prisma.cotacao.count(),
      prisma.cotacao.count({
        where: {
          sku: {
            not: null
          }
        }
      })
    ]);
    
    const cobertura = totalCotacoes > 0 ? ((cotacoesComSKU / totalCotacoes) * 100) : 0;
    
    console.log('✅ [API] Geração de SKUs concluída com sucesso');
    
    res.status(200).json({
      success: true,
      message: 'SKUs gerados com sucesso!',
      data: {
        totalCotacoes,
        cotacoesComSKU,
        cobertura: Math.round(cobertura * 10) / 10, // 1 casa decimal
        processadas: cotacoesComSKU
      }
    });
    
  } catch (error: any) {
    console.error('❌ [API] Erro ao gerar SKUs:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar SKUs para cotações',
      message: error.message || 'Erro interno do servidor'
    });
  }
};

