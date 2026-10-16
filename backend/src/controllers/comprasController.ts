import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { XMLParser } from 'fast-xml-parser';
import { ComprasService, CompraPayload, CompraNfDuplicadaError } from '../services/compras.service';
import { matchMaterial, normalizarEan, normalizarCodigoFornecedor } from '../services/materialFornecedorAlias.service';
import { vincularCompraItemAoMaterial } from '../services/vincularCompraItemMaterial.service';
import {
  ajustarCompraComXml,
  AjustarCompraXmlError,
} from '../services/ajustarCompraXml.service';
import {
  calcularConversao,
  detectarConversaoKmParaM,
  normalizarUnidade,
} from '../utils/conversaoUnidadeCompra.util';
import {
  converterUnidadeCompraItem,
  ConverterUnidadeError,
  sugerirConversoesCompra,
} from '../services/converterUnidadeCompraItem.service';
import {
  buscarFornecedorCanonicoPorCnpj,
  FornecedorCnpjError,
  resolverFornecedorParaAtualizacaoCompra,
} from '../services/fornecedorCnpj.service';
import { cnpjDeXml } from '../utils/cnpjFornecedor.util';
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
});

// Listar compras
export const getCompras = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ CORREÇÃO CRÍTICA: Aumentar limit padrão de 100 para 1000 para evitar perda de dados em auditoria
    const { status, fornecedorId, page = 1, limit = 1000 } = req.query;

    const resultado = await ComprasService.listarCompras(
      status as string,
      fornecedorId as string,
      undefined,
      undefined,
      parseInt(page as string),
      parseInt(limit as string)
    );

    console.log(`📦 Listando compras - Total: ${resultado.pagination.total}, Página: ${page}, Retornando: ${resultado.compras.length}`);

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Erro ao buscar compras:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar compras',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Buscar compra por ID
export const getCompraById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'ID da compra é obrigatório'
      });
      return;
    }

    console.log(`🔍 Buscando compra: ${id}`);
    const compra = await ComprasService.buscarCompra(id);

    res.json({
      success: true,
      data: compra
    });
  } catch (error) {
    console.error('Erro ao buscar compra:', error);
    
    if (error instanceof Error && error.message === 'Compra não encontrada') {
      res.status(404).json({
        success: false,
        error: 'Compra não encontrada'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar compra',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
};

// Criar compra
export const createCompra = async (req: Request, res: Response): Promise<void> => {
  try {
    const compraData: CompraPayload = {
      fornecedorNome: req.body.fornecedorNome,
      fornecedorCNPJ: req.body.fornecedorCNPJ,
      fornecedorTel: req.body.fornecedorTel,
      numeroNF: req.body.numeroNF,
      serieNF: req.body.serieNF || req.body.serie || null,
      dataEmissaoNF: new Date(req.body.dataEmissaoNF),
      // Evitar timezone: data só YYYY-MM-DD → usar meio-dia UTC para exibir o dia correto em qualquer fuso
      dataCompra: (() => {
        const raw = req.body.dataCompra;
        if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          return new Date(raw + 'T12:00:00.000Z');
        }
        return new Date(raw);
      })(),
      dataRecebimento: req.body.dataRecebimento ? new Date(req.body.dataRecebimento) : undefined,
      valorFrete: req.body.valorFrete || 0,
      outrasDespesas: req.body.outrasDespesas || 0,
      valorDesconto: req.body.valorDesconto ?? 0,
      status: req.body.status,
      classificacao: req.body.classificacao || 'COMPOSICAO_ESTOQUE', // ✅ NOVO: Classificação da compra
      items: req.body.items,
      observacoes: req.body.observacoes,
      // Campos adicionais vindos do frontend / XML
      valorIPI: req.body.valorIPI ?? 0,
      valorTotalProdutos: req.body.valorTotalProdutos,
      valorTotalNota: req.body.valorTotalNota,
      duplicatas: req.body.duplicatas || req.body.parcelas || [],
      statusImportacao: req.body.statusImportacao,
      // Campos para geração de contas a pagar (fallback quando não há duplicatas)
      condicoesPagamento: req.body.condicoesPagamento,
      parcelas: req.body.parcelas,
      dataPrimeiroVencimento: req.body.dataPrimeiroVencimento ? new Date(req.body.dataPrimeiroVencimento) : undefined,
      // ✅ NOVO: Obra vinculada (para compras avulsas)
      obraId: req.body.obraId || undefined,
      destinoTipo: req.body.destinoTipo || undefined,
      projetoId: req.body.projetoId || undefined,
      // ✅ NOVO: Empresa compradora (para identificar qual CNPJ está sendo usado)
      empresaCompradoraNome: req.body.empresaCompradoraNome || undefined,
      empresaCompradoraCNPJ: req.body.empresaCompradoraCNPJ || undefined
    };

    // Validar dados obrigatórios
    console.log('🔍 Validando compra:', {
      fornecedorNome: compraData.fornecedorNome,
      fornecedorCNPJ: compraData.fornecedorCNPJ,
      numeroNF: compraData.numeroNF,
      itemsLength: compraData.items?.length
    });
    
    if (!compraData.fornecedorNome || !compraData.fornecedorCNPJ || !compraData.numeroNF || !compraData.items || compraData.items.length === 0) {
      const missing: string[] = [];
      if (!compraData.fornecedorNome) missing.push('fornecedorNome');
      if (!compraData.fornecedorCNPJ) missing.push('fornecedorCNPJ');
      if (!compraData.numeroNF) missing.push('numeroNF');
      if (!compraData.items || compraData.items.length === 0) missing.push('items');
      
      console.error('❌ Dados obrigatórios ausentes:', missing);
      res.status(400).json({
        error: 'Dados obrigatórios ausentes: ' + missing.join(', ')
      });
      return;
    }

    const usuarioReq = (req as any).user;
    const resultado = await ComprasService.registrarCompra(
      compraData,
      usuarioReq?.userId ? { id: usuarioReq.userId, nome: usuarioReq.name } : undefined,
    );
    const estatisticas = (resultado as any).estatisticas;

    res.status(201).json({
      success: true,
      message: 'Compra registrada com sucesso',
      data: resultado,
      estatisticas: estatisticas || undefined
    });
  } catch (error) {
    if (error instanceof CompraNfDuplicadaError) {
      const nomeUsuario = (req as { user?: { name?: string } }).user?.name?.trim().split(/\s+/)[0] || 'Olá';
      res.status(409).json({
        success: false,
        error: 'COMPRA_NF_DUPLICADA',
        message: `Opa ${nomeUsuario}, essa nota já foi inserida e gerou a compra de ${error.numeroSequencial}.`,
        numeroSequencial: error.numeroSequencial,
      });
      return;
    }
    console.error('Erro ao criar compra:', error);
    res.status(500).json({ error: 'Erro ao criar compra' });
  }
};

// Editar compra existente
export const updateCompra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'ID da compra é obrigatório'
      });
      return;
    }

    // Verificar se a compra existe
    const compraExistente = await prisma.compra.findUnique({
      where: { id },
      include: { items: true, fornecedor: true }
    });

    if (!compraExistente) {
      res.status(404).json({
        success: false,
        error: 'Compra não encontrada'
      });
      return;
    }

    const isRecebido = compraExistente.status === 'Recebido';

    console.log('✏️ Atualizando compra:', id, isRecebido ? '(compra já recebida — permite correção de cadastro/parcelas)' : '');

    // Processar data da compra
    const processarData = (raw: any): Date | undefined => {
      if (!raw) return undefined;
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return new Date(raw + 'T12:00:00.000Z');
      }
      return new Date(raw);
    };

    // Preparar dados para atualização
    const updateData: any = {};

    // Correção de cadastro: NF, fornecedor e status também em compras já recebidas (não altera itens pelo body)
    if (req.body.fornecedorNome !== undefined) updateData.fornecedorNome = req.body.fornecedorNome;
    if (req.body.numeroNF !== undefined) updateData.numeroNF = req.body.numeroNF;
    if (req.body.serieNF !== undefined) updateData.serieNF = req.body.serieNF;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.classificacao !== undefined) updateData.classificacao = req.body.classificacao;

    if (req.body.fornecedorId || req.body.fornecedorCNPJ) {
      const fornecedorCompra = await resolverFornecedorParaAtualizacaoCompra(prisma, {
        fornecedorId: req.body.fornecedorId,
        fornecedorCNPJ: req.body.fornecedorCNPJ,
        fornecedorNome: req.body.fornecedorNome ?? compraExistente.fornecedorNome,
        telefone: req.body.fornecedorTel,
      });
      updateData.fornecedorId = fornecedorCompra.fornecedorId;
      updateData.fornecedorCNPJ = fornecedorCompra.fornecedorCNPJ;
      updateData.fornecedorNome = fornecedorCompra.fornecedorNome;
    }

    // Sempre permitir: datas, frete, despesas, observações, condições, valor total, empresa compradora (e duplicatas abaixo)
    if (req.body.dataEmissaoNF !== undefined) updateData.dataEmissaoNF = processarData(req.body.dataEmissaoNF);
    if (req.body.dataCompra !== undefined) updateData.dataCompra = processarData(req.body.dataCompra);
    if (req.body.empresaCompradoraNome !== undefined) updateData.empresaCompradoraNome = req.body.empresaCompradoraNome || null;
    if (req.body.empresaCompradoraCNPJ !== undefined) updateData.empresaCompradoraCNPJ = req.body.empresaCompradoraCNPJ || null;
    if (req.body.dataRecebimento !== undefined) updateData.dataRecebimento = processarData(req.body.dataRecebimento);
    if (req.body.valorFrete !== undefined) updateData.valorFrete = parseFloat(req.body.valorFrete) || 0;
    if (req.body.outrasDespesas !== undefined) updateData.outrasDespesas = parseFloat(req.body.outrasDespesas) || 0;
    if (req.body.valorDesconto !== undefined) {
      const vs = compraExistente.valorSubtotal || 0;
      const vd = parseFloat(req.body.valorDesconto) || 0;
      updateData.valorDesconto = Math.min(Math.max(0, vd), vs);
    }
    if (req.body.observacoes !== undefined) updateData.observacoes = req.body.observacoes;
    if (req.body.condicoesPagamento !== undefined) updateData.condicoesPagamento = req.body.condicoesPagamento;

    if (req.body.valorTotalNota !== undefined) {
      updateData.valorTotal = parseFloat(req.body.valorTotalNota) || 0;
    } else if (
      req.body.valorFrete !== undefined ||
      req.body.outrasDespesas !== undefined ||
      req.body.valorDesconto !== undefined
    ) {
      const valorSubtotal = compraExistente.valorSubtotal || 0;
      const valorFrete = req.body.valorFrete !== undefined ? parseFloat(req.body.valorFrete) || 0 : compraExistente.valorFrete || 0;
      const outrasDespesas = req.body.outrasDespesas !== undefined ? parseFloat(req.body.outrasDespesas) || 0 : compraExistente.outrasDespesas || 0;
      const valorDesconto =
        updateData.valorDesconto !== undefined
          ? updateData.valorDesconto
          : compraExistente.valorDesconto ?? 0;
      updateData.valorTotal = valorSubtotal - valorDesconto + valorFrete + outrasDespesas;
    }

    // Atualizar a compra
    const compraAtualizada = await prisma.compra.update({
      where: { id },
      data: updateData,
      include: {
        fornecedor: true,
        items: {
          include: {
            material: true
          }
        }
      }
    });

    if (req.body.fornecedorTel !== undefined && compraAtualizada.fornecedorId) {
      await prisma.fornecedor.update({
        where: { id: compraAtualizada.fornecedorId },
        data: { telefone: String(req.body.fornecedorTel).trim() || null }
      });
    }

    // Atualizar parcelas/contas a pagar se fornecidas
    if (req.body.duplicatas && Array.isArray(req.body.duplicatas)) {
      // Excluir contas a pagar pendentes existentes
      await prisma.contaPagar.deleteMany({
        where: {
          compraId: id,
          status: 'Pendente'
        }
      });

      // Criar novas contas a pagar
      for (const parcela of req.body.duplicatas) {
        if (parcela.valor && parcela.valor > 0 && parcela.dataVencimento) {
          await prisma.contaPagar.create({
            data: {
              tipo: 'FORNECEDOR',
              descricao: `NF ${compraAtualizada.numeroNF} - Parcela ${parcela.numero || '001'}`,
              valorParcela: parcela.valor,
              dataVencimento: new Date(parcela.dataVencimento + 'T12:00:00.000Z'),
              status: 'Pendente',
              fornecedorId: compraAtualizada.fornecedorId,
              compraId: id
            }
          });
        }
      }
    }

    console.log('✅ Compra atualizada com sucesso:', id);

    res.json({
      success: true,
      message: 'Compra atualizada com sucesso',
      data: compraAtualizada
    });
  } catch (error) {
    if (error instanceof FornecedorCnpjError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('Erro ao atualizar compra:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar compra',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Parse XML da NF-e
export const parseXML = async (req: Request, res: Response): Promise<void> => {
  try {
    const xmlContent = req.body.xml;

    if (!xmlContent) {
      res.status(400).json({ error: 'XML não fornecido' });
      return;
    }

    const result = xmlParser.parse(xmlContent);

    // Estrutura básica de uma NF-e (v4.00)
    const nfe = result?.nfeProc?.NFe?.infNFe || result?.NFe?.infNFe || {};

    const cnpjEmit = cnpjDeXml(nfe.emit?.CNPJ);
    const fornecedorCadastro = cnpjEmit
      ? await buscarFornecedorCanonicoPorCnpj(prisma, cnpjEmit)
      : null;

    // Fornecedor (Emitente). Se já existe cadastro com os mesmos dígitos, devolve esse id.
    const fornecedor = {
      id: fornecedorCadastro?.id,
      nome: fornecedorCadastro?.nome || nfe.emit?.xNome || '',
      cnpj: cnpjEmit,
      telefone: fornecedorCadastro?.telefone || undefined,
      endereco: nfe.emit?.enderEmit
        ? `${nfe.emit.enderEmit.xLgr}, ${nfe.emit.enderEmit.nro} - ${nfe.emit.enderEmit.xBairro}, ${nfe.emit.enderEmit.xMun}/${nfe.emit.enderEmit.UF}`
        : ''
    };

    // Destinatário (empresa compradora)
    const destinatarioCNPJ = nfe.dest?.CNPJ || '';
    const destinatarioRazaoSocial = nfe.dest?.xNome || '';

    const numeroNF = nfe.ide?.nNF || '';
    const serieNF = nfe.ide?.serie || nfe.ide?.serieNF || '1'; // Série da NF (padrão "1" se não informado)
    const dataEmissao = nfe.ide?.dhEmi || nfe.ide?.dEmi || '';

    // Itens
    const items: Array<{
      nomeProduto: string;
      ncm: string;
      quantidade: number;
      valorUnit: number;
      valorTotal: number;
      sku?: string;
      codigoFornecedor?: string;
      ean?: string;
      materialId?: string;
    }> = [];

    const fornecedorId = fornecedorCadastro?.id;

    const det = Array.isArray(nfe.det) ? nfe.det : nfe.det ? [nfe.det] : [];
    for (const item of det) {
      if (item && item.prod) {
        // Garantir que NCM seja sempre string (pode vir como número do XML)
        const ncmValue = item.prod.NCM;
        const ncmString = ncmValue ? String(ncmValue) : '';
        
        const nomeProduto = item.prod.xProd || '';
        const codigoFornecedor = normalizarCodigoFornecedor(item.prod.cProd ? String(item.prod.cProd) : null);
        const ean = normalizarEan(item.prod.cEAN || item.prod.cEANTrib);

        const match = await matchMaterial(prisma as any, {
          fornecedorId,
          nomeProduto,
          codigoFornecedor,
          ean,
        });
        const materialId = match?.material.id;
        const materialMatch = match?.material || null;
        
        // Extrair unidade de medida do XML (uCom = unidade comercial, uTrib = unidade tributável)
        const unidadeMedidaNormalizada = normalizarUnidade(item.prod.uCom || item.prod.uTrib || 'un');
        const quantidadeXml = parseFloat(item.prod.qCom || '0');
        const valorUnitXml = parseFloat(item.prod.vUnCom || '0');
        const valorTotalXml = parseFloat(item.prod.vProd || '0');

        const itemData: any = {
          nomeProduto,
          ncm: ncmString,
          quantidade: quantidadeXml,
          valorUnit: valorUnitXml,
          valorTotal: valorTotalXml,
          sku: codigoFornecedor || ean || undefined,
          codigoFornecedor: codigoFornecedor || undefined,
          ean: ean || undefined,
          unidadeMedida: unidadeMedidaNormalizada,
          materialId,
          precisaConversao: false,
          matchTipo: match?.tipo || null,
        };

        const deteccao = detectarConversaoKmParaM({
          nomeProduto,
          unidadeMedida: unidadeMedidaNormalizada,
          quantidade: quantidadeXml,
          valorUnit: valorUnitXml,
          valorTotal: valorTotalXml,
          precoMaterialPorMetro: (materialMatch as any)?.preco ?? null,
        });
        if (deteccao.converter) {
          const convertido = calcularConversao(
            { quantidade: quantidadeXml, valorUnit: valorUnitXml, valorTotal: valorTotalXml },
            'km',
            'm'
          );
          itemData.quantidade = convertido.quantidade;
          itemData.valorUnit = convertido.valorUnit;
          itemData.unidadeMedida = convertido.unidade;
          itemData.conversaoAutomatica = {
            de: 'km',
            para: 'm',
            unidadeOriginal: unidadeMedidaNormalizada,
            quantidadeOriginal: quantidadeXml,
            valorUnitOriginal: valorUnitXml,
            motivo: deteccao.motivo,
            descricao: deteccao.descricao,
          };
        }
        
        if (materialMatch) {
          (itemData as any).materialVinculado = materialMatch;
          (itemData as any).matchAutomatico = !!materialId;
        }
        
        items.push(itemData);
      }
    }

    // Totais
    const totais = nfe.total?.ICMSTot || {};
    const valorFrete = parseFloat(totais.vFrete || '0');
    const outrasDespesas = parseFloat(totais.vOutro || '0');
    const valorIPI = parseFloat(totais.vIPI || '0');
    const valorICMS = parseFloat(totais.vICMS || '0');
    const valorTotalProdutos = parseFloat(totais.vProd || '0');
    const valorTotalNota = parseFloat(totais.vNF || '0');

    // Duplicatas / Parcelas
    let parcelas: Array<{ numero: string; dataVencimento: string; valor: number }> = [];
    const cobr = nfe.cobr || {};
    const dupList = Array.isArray(cobr.dup) ? cobr.dup : cobr.dup ? [cobr.dup] : [];
    if (dupList.length > 0) {
      parcelas = dupList.map((d: any, idx: number) => ({
        numero: d.nDup || String(idx + 1).padStart(3, '0'),
        dataVencimento: (d.dVenc || '').slice(0, 10),
        valor: parseFloat(d.vDup || '0')
      }));
    }

    // Log dos dados parseados
    console.log('✅ XML parseado com sucesso!');
    console.log('🏢 Fornecedor:', fornecedor.nome);
    console.log('📄 NF:', numeroNF);
    console.log('📦 Items:', items.length);
    
    res.json({
      success: true,
      data: {
        fornecedor,
        fornecedorCadastro: fornecedorCadastro
          ? {
              id: fornecedorCadastro.id,
              nome: fornecedorCadastro.nome,
              cnpj: fornecedorCadastro.cnpj,
              telefone: fornecedorCadastro.telefone,
            }
          : null,
        destinatarioCNPJ,
        destinatarioRazaoSocial,
        numeroNF,
        serieNF,
        dataEmissao,
        items,
        valorFrete,
        outrasDespesas,
        valorIPI,
        valorICMS,
        valorTotalProdutos,
        valorTotalNota,
        parcelas
      }
    });
  } catch (error) {
    console.error('Erro ao fazer parse do XML:', error);
    res.status(500).json({ error: 'Erro ao processar XML. Verifique se o arquivo é válido.' });
  }
};

/**
 * Ajusta compra existente reimportando o XML da mesma NF (não cria nova compra).
 * Body: { xml: string }
 */
export const ajustarCompraComXML = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const xmlContent = req.body?.xml;

    if (!id) {
      res.status(400).json({ success: false, error: 'ID da compra é obrigatório' });
      return;
    }
    if (!xmlContent) {
      res.status(400).json({ success: false, error: 'XML não fornecido' });
      return;
    }

    const createdBy =
      (req as any).user?.userId || (req as any).user?.id || (req as any).user?.email || null;

    const resultado = await ajustarCompraComXml(id, String(xmlContent), createdBy);

    res.json({
      success: true,
      message: `Compra ajustada: ${resultado.itensAtualizados} item(ns) atualizado(s), ${resultado.aliasesAtualizados} alias(es) sincronizado(s).`,
      data: resultado.compra,
      itensAtualizados: resultado.itensAtualizados,
      aliasesAtualizados: resultado.aliasesAtualizados,
      totais: resultado.totais,
    });
  } catch (error) {
    if (error instanceof AjustarCompraXmlError) {
      res.status(error.status).json({
        success: false,
        error: error.message,
        message: error.message,
      });
      return;
    }
    console.error('Erro ao ajustar compra com XML:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao ajustar compra com XML',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Atualizar status da compra
export const updateCompraStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status é obrigatório' });
      return;
    }

    const resultado = await ComprasService.atualizarStatusCompra(id, status);
    const compraAtualizada = (resultado as any).compra || resultado;
    const estatisticas = (resultado as any).estatisticas;

    res.json({
      success: true,
      message: 'Status da compra atualizado com sucesso',
      data: compraAtualizada
    });
  } catch (error) {
    console.error('Erro ao atualizar compra:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar compra',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const receberRemessaParcial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, dataEntregaReal, produtoIds } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status é obrigatório' });
      return;
    }

    if (!produtoIds || !Array.isArray(produtoIds) || produtoIds.length === 0) {
      res.status(400).json({ error: 'Pelo menos um produto deve ser selecionado' });
      return;
    }

    console.log('📦 Recebendo remessa parcial:', id, 'Produtos:', produtoIds, 'Data recebida:', dataEntregaReal);
    
    // ✅ CORREÇÃO: Criar data local para evitar problemas de timezone
    // Se dataEntregaReal for uma string YYYY-MM-DD, criar Date no timezone local
    let dataRecebimentoFinal: Date;
    if (dataEntregaReal) {
      if (typeof dataEntregaReal === 'string' && dataEntregaReal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // String no formato YYYY-MM-DD - criar Date no timezone local
        const [ano, mes, dia] = dataEntregaReal.split('-').map(Number);
        dataRecebimentoFinal = new Date(ano, mes - 1, dia, 12, 0, 0); // Meio-dia para evitar problemas de timezone
        console.log(`📅 Data processada: ${dataEntregaReal} → ${dataRecebimentoFinal.toISOString()} (${dataRecebimentoFinal.toLocaleDateString('pt-BR')})`);
      } else {
        dataRecebimentoFinal = new Date(dataEntregaReal);
        console.log(`📅 Data processada (outro formato): ${dataRecebimentoFinal.toISOString()} (${dataRecebimentoFinal.toLocaleDateString('pt-BR')})`);
      }
    } else {
      dataRecebimentoFinal = new Date();
      console.log(`📅 Data não fornecida, usando data atual: ${dataRecebimentoFinal.toISOString()} (${dataRecebimentoFinal.toLocaleDateString('pt-BR')})`);
    }
    
    const compraAtualizada = await ComprasService.receberRemessaParcial(
      id,
      status,
      produtoIds,
      dataRecebimentoFinal
    );

    res.json({
      success: true,
      message: 'Remessa parcial recebida com sucesso',
      data: compraAtualizada
    });
  } catch (error) {
    console.error('Erro ao receber remessa parcial:', error);
    res.status(500).json({ 
      error: 'Erro ao receber remessa parcial',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Receber compra com associações explícitas de materiais
export const receberComAssociacoes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { associacoes, dataRecebimento } = req.body;

    if (!associacoes || typeof associacoes !== 'object') {
      res.status(400).json({ error: 'Associações de materiais são obrigatórias' });
      return;
    }

    console.log('🔗 Recebendo compra com associações:', id);
    console.log('📋 Associações:', associacoes);

    const dataRecebimentoFinal = dataRecebimento ? new Date(dataRecebimento) : new Date();
    
    const compraAtualizada = await ComprasService.receberComAssociacoes(
      id, 
      associacoes,
      dataRecebimentoFinal
    );

    res.json({
      success: true,
      message: 'Compra recebida com sucesso! Materiais associados corretamente.',
      data: compraAtualizada
    });
  } catch (error) {
    console.error('Erro ao receber compra com associações:', error);
    res.status(500).json({ 
      error: 'Erro ao receber compra com associações',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Excluir compra
export const deleteCompra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true para exclusão permanente
    const userRole = (req as any).user?.role?.toLowerCase(); // Role do usuário autenticado

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'ID da compra é obrigatório'
      });
      return;
    }

    // Verificar se compra existe
    const compra = await prisma.compra.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!compra) {
      res.status(404).json({
        success: false,
        error: 'Compra não encontrada'
      });
      return;
    }

    // EXCLUSÃO PERMANENTE (apenas Admin e Desenvolvedor)
    if (permanent === 'true') {
      // Verificar permissões: apenas Admin e Desenvolvedor podem excluir permanentemente
      if (!['admin', 'desenvolvedor', 'administrador'].includes(userRole)) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas Administradores e Desenvolvedores podem excluir compras permanentemente.'
        });
        return;
      }

      // Exclusão permanente - deletar tudo do banco
      await prisma.compraItem.deleteMany({
        where: { compraId: id }
      });

      await prisma.contaPagar.deleteMany({
        where: { compraId: id }
      });

      await prisma.compra.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Compra excluída permanentemente do banco de dados'
      });
      return;
    }

    // SOFT DELETE (para outros usuários ou quando não especificado permanent)
    // Verificar se há contas a pagar pendentes associadas a esta compra
    const contasPendentes = await prisma.contaPagar.findMany({
      where: {
        compraId: id,
        status: 'Pendente'
      }
    });

    if (contasPendentes.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Não é possível excluir compra com contas a pagar pendentes'
      });
      return;
    }

    // Verificar se compra já foi recebida (status Recebida)
    if (compra.status === 'Recebida') {
      res.status(400).json({
        success: false,
        error: 'Não é possível excluir compra já recebida'
      });
      return;
    }

    // Excluir itens da compra
    await prisma.compraItem.deleteMany({
      where: { compraId: id }
    });

    // Excluir contas a pagar associadas
    await prisma.contaPagar.deleteMany({
      where: { compraId: id }
    });

    // Excluir compra
    await prisma.compra.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Compra excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir compra:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao excluir compra',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Cancelar compra
export const cancelarCompra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'ID da compra é obrigatório'
      });
      return;
    }

    console.log(`🚫 Cancelando compra: ${id}`);
    
    const compraCancelada = await ComprasService.cancelarCompra(id);

    res.json({
      success: true,
      message: `Compra #${(compraCancelada as any).numeroSequencial || compraCancelada.id} cancelada com sucesso`,
      data: compraCancelada
    });
  } catch (error) {
    console.error('Erro ao cancelar compra:', error);
    
    if (error instanceof Error) {
      // Erros de validação retornam 400
      if (error.message.includes('não encontrada') || 
          error.message.includes('já recebida') ||
          error.message.includes('já está cancelada')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
    }

    res.status(500).json({ 
      success: false,
      error: 'Erro ao cancelar compra',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

// Atualizar fracionamento de um item específico da compra
export const atualizarFracionamentoItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { compraId, itemId } = req.params;
    const { quantidadeFracionada, tipoEmbalagem, unidadeEmbalagem } = req.body;

    const compraItem = await prisma.compraItem.findUnique({
      where: { id: itemId },
      include: { compra: true }
    });

    if (!compraItem) {
      res.status(404).json({ success: false, error: 'Item da compra não encontrado' });
      return;
    }

    if (compraItem.compraId !== compraId) {
      res.status(400).json({ success: false, error: 'Item não pertence a esta compra' });
      return;
    }

    // Atualizar fracionamento e resetar flag de aplicado
    const itemAtualizado = await prisma.compraItem.update({
      where: { id: itemId },
      data: {
        quantidadeFracionada: quantidadeFracionada || null,
        tipoEmbalagem: tipoEmbalagem || null,
        unidadeEmbalagem: unidadeEmbalagem || null,
        fracionamentoAplicado: false // Resetar para permitir reprocessamento
      } as any
    });

    res.json({
      success: true,
      message: 'Fracionamento atualizado com sucesso',
      data: itemAtualizado
    });
  } catch (error: any) {
    console.error('Erro ao atualizar fracionamento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao atualizar fracionamento'
    });
  }
};

/**
 * Vincula um item de compra a um material do estoque e grava EAN/cProd no alias do fornecedor.
 * PUT /api/compras/:compraId/items/:itemId/vincular-material
 * Body: { materialId, ean?, codigoFornecedor? }
 */
export const vincularItemAoMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { compraId, itemId } = req.params;
    const { materialId, ean, codigoFornecedor } = req.body || {};
    const userId = (req as any).user?.id || (req as any).userId || null;

    if (!materialId || typeof materialId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Informe materialId do estoque para vincular.',
      });
      return;
    }

    const result = await vincularCompraItemAoMaterial(prisma as any, {
      compraId,
      compraItemId: itemId,
      materialId,
      ...(ean !== undefined ? { ean } : {}),
      ...(codigoFornecedor !== undefined ? { codigoFornecedor } : {}),
      createdBy: userId,
    });

    if (result.ok) {
      res.json({
        success: true,
        message:
          'Item vinculado ao estoque. EAN/cProd gravados no alias do fornecedor para matching automático nas próximas compras.',
        data: {
          item: result.item,
          alias: result.alias,
        },
      });
      return;
    }

    const erro = result as { ok: false; status: number; message: string };
    res.status(erro.status).json({
      success: false,
      error: erro.message,
    });
  } catch (error: any) {
    console.error('Erro ao vincular item da compra ao material:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao vincular item ao estoque',
    });
  }
};

/**
 * Converte a unidade de um item de compra já salvo (ex.: cabo em km -> m), preservando o valor total.
 * POST /api/compras/:compraId/items/:itemId/converter-unidade
 * Body: { de: 'km', para: 'm', origem?: 'MANUAL' | 'REVISAO' }
 */
export const converterUnidadeItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { compraId, itemId } = req.params;
    const { de, para, origem } = req.body || {};
    const authUser = (req as any).user as { userId?: string; name?: string } | undefined;

    const resultado = await converterUnidadeCompraItem({
      compraId,
      itemId,
      de,
      para,
      origem: origem === 'REVISAO' ? 'REVISAO' : 'MANUAL',
      usuario: { id: authUser?.userId ?? null, nome: authUser?.name ?? null },
    });
    const compra = await ComprasService.buscarCompra(compraId);

    res.json({
      success: true,
      message: `Unidade convertida: ${resultado.quantidadeAnterior} -> ${resultado.quantidade} ${resultado.unidade}`,
      data: { resultado, compra },
    });
  } catch (error) {
    if (error instanceof ConverterUnidadeError) {
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }
    console.error('Erro ao converter unidade do item da compra:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao converter unidade',
    });
  }
};

/**
 * Sugestões automáticas de conversão km -> m para cabos da compra.
 * GET /api/compras/:id/sugestoes-conversao
 */
export const getSugestoesConversao = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await sugerirConversoesCompra(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof ConverterUnidadeError) {
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }
    console.error('Erro ao sugerir conversões de unidade:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao sugerir conversões',
    });
  }
};

