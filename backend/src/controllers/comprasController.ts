import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { ComprasService, CompraPayload } from '../services/compras.service';

const prisma = new PrismaClient();
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// Listar compras
export const getCompras = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, fornecedorId, page = 1, limit = 100 } = req.query; // Aumentado de 10 para 100

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
      dataEmissaoNF: new Date(req.body.dataEmissaoNF),
      dataCompra: new Date(req.body.dataCompra),
      dataRecebimento: req.body.dataRecebimento ? new Date(req.body.dataRecebimento) : undefined,
      valorFrete: req.body.valorFrete || 0,
      outrasDespesas: req.body.outrasDespesas || 0,
      status: req.body.status,
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
      dataPrimeiroVencimento: req.body.dataPrimeiroVencimento ? new Date(req.body.dataPrimeiroVencimento) : undefined
    };

    // Validar dados obrigatórios
    console.log('🔍 Validando compra:', {
      fornecedorNome: compraData.fornecedorNome,
      fornecedorCNPJ: compraData.fornecedorCNPJ,
      numeroNF: compraData.numeroNF,
      itemsLength: compraData.items?.length
    });
    
    if (!compraData.fornecedorNome || !compraData.fornecedorCNPJ || !compraData.numeroNF || !compraData.items || compraData.items.length === 0) {
      const missing = [];
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

    const resultado = await ComprasService.registrarCompra(compraData);

    res.status(201).json({
      success: true,
      message: 'Compra registrada com sucesso',
      data: resultado
    });
  } catch (error) {
    console.error('Erro ao criar compra:', error);
    res.status(500).json({ error: 'Erro ao criar compra' });
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

    // Fornecedor (Emitente)
    const fornecedor = {
      nome: nfe.emit?.xNome || '',
      cnpj: nfe.emit?.CNPJ || '',
      endereco: nfe.emit?.enderEmit
        ? `${nfe.emit.enderEmit.xLgr}, ${nfe.emit.enderEmit.nro} - ${nfe.emit.enderEmit.xBairro}, ${nfe.emit.enderEmit.xMun}/${nfe.emit.enderEmit.UF}`
        : ''
    };

    // Destinatário (empresa compradora)
    const destinatarioCNPJ = nfe.dest?.CNPJ || '';
    const destinatarioRazaoSocial = nfe.dest?.xNome || '';

    const numeroNF = nfe.ide?.nNF || '';
    const dataEmissao = nfe.ide?.dhEmi || nfe.ide?.dEmi || '';

    // Itens
    const items: Array<{
      nomeProduto: string;
      ncm: string;
      quantidade: number;
      valorUnit: number;
      valorTotal: number;
      sku?: string;
      materialId?: string;
    }> = [];
    const det = Array.isArray(nfe.det) ? nfe.det : nfe.det ? [nfe.det] : [];
    for (const item of det) {
      if (item && item.prod) {
        // Garantir que NCM seja sempre string (pode vir como número do XML)
        const ncmValue = item.prod.NCM;
        const ncmString = ncmValue ? String(ncmValue) : '';
        
        items.push({
          nomeProduto: item.prod.xProd || '',
          ncm: ncmString,
          quantidade: parseFloat(item.prod.qCom || '0'),
          valorUnit: parseFloat(item.prod.vUnCom || '0'),
          valorTotal: parseFloat(item.prod.vProd || '0'),
          sku: item.prod.cProd || item.prod.cEAN || item.prod.cEANTrib || undefined
        });
      }
    }

    // Totais
    const totais = nfe.total?.ICMSTot || {};
    const valorFrete = parseFloat(totais.vFrete || '0');
    const outrasDespesas = parseFloat(totais.vOutro || '0');
    const valorIPI = parseFloat(totais.vIPI || '0');
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
        destinatarioCNPJ,
        destinatarioRazaoSocial,
        numeroNF,
        dataEmissao,
        items,
        valorFrete,
        outrasDespesas,
        valorIPI,
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

// Atualizar status da compra
export const updateCompraStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status é obrigatório' });
      return;
    }

    const compraAtualizada = await ComprasService.atualizarStatusCompra(id, status);

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

