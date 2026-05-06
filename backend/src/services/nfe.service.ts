import { prisma } from '../lib/prisma';
import { NFeSignatureService } from './nfe-signature.service';
import { NFeSoapService } from './nfe-soap.service';
import NFeAuditService from './nfe-audit.service';
import { CryptoUtil } from '../utils/crypto.util';
import { resolveCertificadoPath } from '../utils/certificadoPath.util';
import { NFeChaveAcessoUtil } from '../utils/nfe-chave-acesso.util';
import { NFeProcNFeUtil } from '../utils/nfe-procnfe.util';
import { NFeXMLValidatorService } from './nfe-xml-validator.service';
import NFeFilaService, { NFeModoEnvio } from './nfe-fila.service';
import { VendasService } from './vendas.service';
import * as fs from 'fs';


/**
 * Tipos e Interfaces
 */
export interface DadosNFe {
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    inscricaoEstadual: string;
    endereco: any;
    regimeTributario: string; // 'SimplesNacional' | 'RegimeNormal'
    codigoEstado?: string; // Código IBGE do estado (2 dígitos)
  };
  destinatario: {
    cnpj?: string;
    cpf?: string;
    razaoSocial: string;
    inscricaoEstadual?: string;
    endereco: any;
    indIEDest?: number; // 1=Contribuinte, 9=Não contribuinte
  };
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    gtin?: string; // GTIN/EAN do produto
    impostos: any;
  }>;
  totais: {
    valorProdutos: number;
    valorNF: number;
    baseICMS: number;
    valorICMS: number;
    valorIPI: number;
    valorPIS: number;
    valorCOFINS: number;
    /** Soma dos vTotTrib dos itens (obrigatório bater com total - regra 685) */
    valorTotTrib?: number;
  };
  naturezaOperacao: string;
  serie: string;
  numero: number;
  dataEmissao: Date;
  // Novos campos
  indFinal?: number; // 0=Não, 1=Sim (consumidor final)
  indPres?: number; // 0=Não se aplica, 1=Operação presencial, 2=Operação não presencial, 3=Operação presencial fora do estabelecimento, 4=Operação não presencial fora do estabelecimento, 5=Operação presencial venda externa, 9=Operação não presencial venda externa
  modFrete?: number; // 0=Emitente, 1=Destinatário, 2=Terceiros, 9=Sem frete
  formaPagamento?: {
    tipo: number; // 01=Dinheiro, 02=Cheque, 03=Cartão de Crédito, etc.
    valor: number;
    indPag?: number; // 0=Pagamento à vista, 1=Pagamento a prazo
  };
  cobranca?: {
    numeroFatura?: string;
    valorOriginal?: number;
    valorDesconto?: number;
    valorLiquido?: number;
    duplicatas?: Array<{
      numero: string;
      vencimento: string; // YYYY-MM-DD
      valor: number;
    }>;
  };
  informacoesAdicionais?: string;
  responsavelTecnico?: {
    cnpj: string;
    contato: string;
    email: string;
    telefone: string;
  };
  autorizadosDownload?: Array<{
    cnpj?: string;
    cpf?: string;
  }>;
  ambiente?: '1' | '2'; // 1=Produção, 2=Homologação
}

/**
 * Normaliza texto para NF-e: maiúsculas, sem acentos, abreviações expandidas.
 * SEFAZ e sistemas legados costumam usar formato padronizado (ex: RUA BLUMENAU, ITAJAI).
 */
function normalizarParaNFe(texto: string | undefined | null): string {
  if (!texto || typeof texto !== 'string') return texto || '';
  const t = String(texto).trim();
  if (!t) return '';
  // Remove acentos (NFD decompõe, depois remove marcas combinantes)
  const semAcentos = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const maiusculas = semAcentos.toUpperCase();
  // Abreviações comuns em logradouros
  return maiusculas
    .replace(/\bR\.\s*/g, 'RUA ')
    .replace(/\bRUA\.\s*/gi, 'RUA ')
    .replace(/\bAV\.\s*/gi, 'AVENIDA ')
    .replace(/\bAV\s+/gi, 'AVENIDA ')
    .replace(/\bAL\.\s*/gi, 'ALAMEDA ')
    .replace(/\bPR\.\s*/gi, 'PRACA ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Service de NF-e
 */
export class NFeService {
  private static isErroComunicacaoSefaz(errorLike: unknown): boolean {
    const msg = String((errorLike as any)?.message ?? errorLike ?? '').toLowerCase();
    const indicadoresRede = [
      'enotfound',
      'econnreset',
      'econnrefused',
      'ehostunreach',
      'enetunreach',
      'eai_again',
      'socket hang up',
      'timed out',
      'timeout',
      'sefaz indisponível',
      'sefaz indisponivel'
    ];

    return indicadoresRede.some((indicador) => msg.includes(indicador));
  }

  /**
   * Gera código do produto (cProd) garantindo que NUNCA seja vazio
   * CORREÇÃO OBRIGATÓRIA: Campo cProd é obrigatório na NF-e
   */
  private static gerarCodigoProduto(item: any): string {
    console.log('🔧 [cProd Fix] Gerando código para item:', {
      tipo: item.tipo,
      materialSku: item.material?.sku,
      cotacaoSku: item.cotacao?.sku,
      cotacaoNome: item.cotacao?.nome,
      itemId: item.id
    });

    // 1. Prioridade: SKU do material (estoque físico)
    if (item.material?.sku) {
      console.log('✅ [cProd Fix] Usando SKU do material:', item.material.sku);
      return item.material.sku;
    }

    // 2. Prioridade: SKU da cotação (banco frio)
    if (item.cotacao?.sku) {
      console.log('✅ [cProd Fix] Usando SKU da cotação:', item.cotacao.sku);
      return item.cotacao.sku;
    }

    // 3. Fallback: COT- + ID da cotação (conforme especificação)
    if (item.cotacao?.id) {
      const codigoCotacao = `COT-${item.cotacao.id.substring(0, 8).toUpperCase()}`;
      console.log('✅ [cProd Fix] Gerado código para cotação:', codigoCotacao);
      return codigoCotacao;
    }

    // 4. Fallback: Primeiros 6 chars do nome da cotação (limpo)
    if (item.cotacao?.nome && item.cotacao.nome.length > 0) {
      const nomeFormatado = item.cotacao.nome
        .replace(/[^A-Za-z0-9]/g, '') // Remove caracteres especiais
        .substring(0, 6)
        .toUpperCase();
      
      if (nomeFormatado.length >= 3) {
        const codigoNome = `COT-${nomeFormatado}`;
        console.log('✅ [cProd Fix] Gerado código do nome da cotação:', codigoNome);
        return codigoNome;
      }
    }

    // 5. Fallback final: COT- + ID do item do orçamento
    const codigoFinal = `COT-${item.id.substring(0, 8).toUpperCase()}`;
    console.log('⚠️ [cProd Fix] Usando fallback final:', codigoFinal);
    return codigoFinal;
  }

  /**
   * Busca dados reais da venda para geração de NF-e
   * @param vendaId - ID da venda
   * @param empresaId - ID da empresa fiscal emissora
   * @param cfop - CFOP da operação (opcional, padrão: 5101)
   * @param naturezaOperacao - Natureza da operação (opcional)
   * @param serie - Série da NF-e (opcional, padrão: '1')
   * @returns Dados formatados para geração de NF-e
   */
  async buscarDadosVendaParaNFe(
    vendaId: string,
    empresaId: string,
    cfop: string = '5101',
    naturezaOperacao: string = 'Venda de Mercadoria',
    serie: string = '1'
  ): Promise<DadosNFe> {
    console.log(`📦 Buscando dados reais da venda: ${vendaId}`);

    // 1. Buscar venda com orçamento e itens
    const venda = await VendasService.buscarVenda(vendaId);
    
    if (!venda) {
      throw new Error(`Venda não encontrada: ${vendaId}`);
    }

    if (!venda.orcamento) {
      throw new Error(`Venda ${vendaId} não possui orçamento vinculado`);
    }

    // 2. Buscar empresa fiscal e configurações do sistema
    const [empresa, configSistema] = await Promise.all([
      prisma.empresaFiscal.findUnique({
        where: { id: empresaId }
      }),
      prisma.configuracaoSistema.findFirst({
        select: { aliquotaImpostoPadrao: true }
      })
    ]);

    if (!empresa) {
      throw new Error(`Empresa fiscal não encontrada: ${empresaId}`);
    }

    // Obter alíquota de tributos aproximados para Simples Nacional (Lei 12.741/2012)
    const aliquotaTributosAproximados = (configSistema?.aliquotaImpostoPadrao ?? 8) / 100;

    // 3. Buscar cliente
    const cliente = venda.cliente;
    if (!cliente) {
      throw new Error(`Cliente não encontrado para a venda ${vendaId}`);
    }

    // 4. Preparar dados do emitente (empresa fiscal)
    const emitente = {
      cnpj: empresa.cnpj.replace(/\D/g, ''),
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia || empresa.razaoSocial,
      inscricaoEstadual: empresa.inscricaoEstadual,
      regimeTributario: empresa.regimeTributario === 'SimplesNacional' ? 'SimplesNacional' : 'RegimeNormal',
      endereco: {
        logradouro: empresa.endereco || '',
        numero: empresa.numero || 'S/N',
        complemento: empresa.complemento || '',
        bairro: empresa.bairro || '',
        codigoMunicipio: this.obterCodigoMunicipio(empresa.cidade, empresa.estado),
        municipio: empresa.cidade || '',
        uf: empresa.estado || '',
        cep: empresa.cep.replace(/\D/g, '') || '',
        telefone: empresa.telefone?.replace(/\D/g, '') || ''
      }
    };

    // 5. Preparar dados do destinatário (cliente)
    const cpfCnpjCliente = cliente.cpfCnpj.replace(/\D/g, '');
    const isPessoaFisica = cpfCnpjCliente.length === 11;
    
    // Parsear endereço do cliente (campos separados: logradouro x numero x bairro)
    let logradouro = '';
    let numeroEnd = (cliente as any).numero || 'S/N';
    let bairroEnd = cliente.bairro || '';
    if (typeof cliente.endereco === 'string') {
      try {
        const parsed = JSON.parse(cliente.endereco);
        logradouro = parsed.logradouro || parsed.endereco || cliente.endereco || '';
        numeroEnd = parsed.numero || (cliente as any).numero || numeroEnd;
        bairroEnd = parsed.bairro || cliente.bairro || bairroEnd;
      } catch {
        // Se "Rua X, 100" estiver tudo no endereco, tentar separar
        const match = String(cliente.endereco || '').match(/^(.*?),\s*(\d+[A-Za-z]?)\s*$/);
        if (match) {
          logradouro = match[1].trim();
          numeroEnd = match[2].trim();
        } else {
          logradouro = cliente.endereco || '';
          numeroEnd = (cliente as any).numero || 'S/N';
        }
        bairroEnd = cliente.bairro || bairroEnd;
      }
    } else if (cliente.endereco && typeof cliente.endereco === 'object') {
      const e = cliente.endereco as Record<string, unknown>;
      logradouro = (e.logradouro as string) || (e.endereco as string) || '';
      numeroEnd = (e.numero as string) || (cliente as any).numero || 'S/N';
      bairroEnd = (e.bairro as string) || cliente.bairro || '';
    } else {
      logradouro = cliente.endereco != null ? String(cliente.endereco) : '';
      numeroEnd = (cliente as any).numero || 'S/N';
      bairroEnd = cliente.bairro || '';
    }

    // Limpar razao social: remover CPF/CNPJ que possam estar grudados no nome (ex: "47.591.769 ANTONIO...")
    let razaoSocial = String(cliente.nome || '').trim();
    razaoSocial = razaoSocial.replace(/^\s*\d{2,3}\.\d{3}\.\d{3}[\/\-]?\d{4}[\-]?\d{2}\s*/i, ''); // CNPJ no início
    razaoSocial = razaoSocial.replace(/^\s*\d{3}\.\d{3}\.\d{3}[\-]?\d{2}\s*/i, ''); // CPF no início
    razaoSocial = razaoSocial.trim() || cliente.nome || '';

    const ieCliente = (cliente as any).inscricaoEstadual;
    const indIEDestCliente = (cliente as any).indIEDest as number | null | undefined;
    // Respeitar indIEDest salvo no cadastro (1=Contribuinte, 2=Isento, 9=Não contribuinte)
    let indIEDest: number;
    let ieDest: string;
    if (indIEDestCliente === 1) {
      indIEDest = 1;
      ieDest = (ieCliente && String(ieCliente).trim()) ? String(ieCliente).trim() : '';
    } else if (indIEDestCliente === 2) {
      indIEDest = 2;
      ieDest = 'ISENTO';
    } else if (indIEDestCliente === 9) {
      indIEDest = 9;
      ieDest = '';
    } else {
      const temIE = ieCliente && String(ieCliente).trim() && String(ieCliente).toUpperCase() !== 'ISENTO';
      indIEDest = temIE ? 1 : 9;
      ieDest = temIE ? String(ieCliente).trim() : '';
    }

    const destinatario = {
      [isPessoaFisica ? 'cpf' : 'cnpj']: cpfCnpjCliente,
      razaoSocial,
      inscricaoEstadual: ieDest,
      indIEDest,
      endereco: {
        logradouro: logradouro.trim() || '-',
        numero: (numeroEnd || 'S/N').trim(),
        complemento: '',
        bairro: bairroEnd?.trim() || '-',
        codigoMunicipio: this.obterCodigoMunicipio(cliente.cidade || '', cliente.estado || ''),
        municipio: cliente.cidade || '',
        uf: cliente.estado || '',
        cep: (cliente.cep || '').replace(/\D/g, '') || '',
        telefone: (cliente.telefone || '').replace(/\D/g, '') || ''
      }
    };

    // 6. Preparar produtos/itens do orçamento
    const produtos: Array<{
      codigo: string;
      descricao: string;
      ncm: string;
      cfop: string;
      unidade: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
      gtin?: string;
      impostos: any;
    }> = [];

    let valorTotalProdutos = 0;
    let baseICMS = 0;
    let valorICMS = 0;
    let valorIPI = 0;
    let valorPIS = 0;
    let valorCOFINS = 0;

    if (venda.orcamento.items && venda.orcamento.items.length > 0) {
      for (const item of venda.orcamento.items) {
        // Pular serviços (não vão na NF-e de produto)
        if (item.tipo === 'SERVICO') {
          continue;
        }
        // Pular itens "venda direta fornecedor" (não entram na NF-e)
        if ((item as any).vendaDiretaFornecedor) {
          continue;
        }

        // ========== CORREÇÃO OBRIGATÓRIA: cProd nunca vazio ==========
        const sku = NFeService.gerarCodigoProduto(item);

        // NCM: item do orçamento (herdado da cotação quando veio do banco frio) → cotação → material → padrão 8 dígitos
        const ncmRaw = (item as any).ncm || item.cotacao?.ncm || item.material?.ncm || '00000000';
        const ncm = String(ncmRaw).replace(/\D/g, '').padStart(8, '0').slice(0, 8);

        // Obter descrição (priorizar cotação para itens do banco frio)
        const descricao = item.cotacao?.nome || item.descricao || item.material?.nome || 'Produto sem descrição';
        
        // Obter unidade de medida
        const unidade = item.unidadeVenda || (item.material ? (item.material as any).unidadeMedida : undefined) || 'UN';
        
        // Obter quantidade
        const quantidade = item.quantidade || 1;
        
        // Obter valor unitário (preço de venda)
        const valorUnitario = item.precoUnit || 
          (item.material ? ((item.material as any).valorVenda || (item.material as any).preco) : undefined) ||
          (item.cotacao ? ((item.cotacao as any).valorVenda || (item.cotacao as any).valorUnitario) : undefined) || 0;
        
        // Calcular valor total
        const valorTotal = item.subtotal || (quantidade * valorUnitario);
        
        valorTotalProdutos += valorTotal;

        // Calcular impostos conforme regime tributário
        const isSimplesToNacional = empresa.regimeTributario === 'SimplesNacional';
        
        // Para Simples Nacional: ICMS, PIS e COFINS são recolhidos via DAS (não separadamente)
        const aliquotaICMS = isSimplesToNacional ? 0 : 12; // Simples Nacional: ICMS zerado separadamente
        const aliquotaIPI = 0; // 0% padrão (pode ser ajustado)
        const aliquotaPIS = isSimplesToNacional ? 0 : 1.65; // Simples Nacional: PIS zerado separadamente  
        const aliquotaCOFINS = isSimplesToNacional ? 0 : 7.60; // Simples Nacional: COFINS zerado separadamente

        const baseICMSItem = isSimplesToNacional ? 0 : valorTotal;
        const valorICMSItem = (baseICMSItem * aliquotaICMS) / 100;
        const valorIPIItem = (valorTotal * aliquotaIPI) / 100;
        const valorPISItem = (valorTotal * aliquotaPIS) / 100;
        const valorCOFINSItem = (valorTotal * aliquotaCOFINS) / 100;

        // Acumular totais conforme regime
        if (!isSimplesToNacional) {
          baseICMS += baseICMSItem;
          valorICMS += valorICMSItem;
          valorPIS += valorPISItem;
          valorCOFINS += valorCOFINSItem;
        }
        valorIPI += valorIPIItem;

        produtos.push({
          codigo: sku, // ✅ SKU do material como código do produto
          descricao: descricao.substring(0, 120), // Limitar a 120 caracteres (padrão NFe)
          ncm: ncm, // 8 dígitos (já normalizado acima; herdado do orçamento → cotação quando item é banco frio)
          cfop: cfop,
          unidade: unidade,
          quantidade: quantidade,
          valorUnitario: valorUnitario,
          valorTotal: valorTotal,
          gtin: undefined, // Sempre "SEM GTIN" - campo codigoBarras não existe no schema atual
          impostos: {
            icms: {
              origem: '0', // 0 = Nacional
              cst: empresa.regimeTributario === 'SimplesNacional' ? '102' : '00',
              aliquota: aliquotaICMS,
              valor: valorICMSItem
            },
            ipi: {
              cst: aliquotaIPI > 0 ? '50' : '99',
              aliquota: aliquotaIPI,
              valor: valorIPIItem
            },
            pis: {
              cst: isSimplesToNacional ? '49' : '01', // CST 49 = outras operações para Simples Nacional
              aliquota: aliquotaPIS,
              valor: valorPISItem
            },
            cofins: {
              cst: isSimplesToNacional ? '49' : '01', // CST 49 = outras operações para Simples Nacional 
              aliquota: aliquotaCOFINS,
              valor: valorCOFINSItem
            },
            // Simples Nacional (CRT=1): vTotTrib zerado (não informar tributos aproximados no XML)
            // Regime normal: vTotTrib = soma dos tributos calculados
            vTotTrib: isSimplesToNacional
              ? 0
              : valorICMSItem + valorIPIItem + valorPISItem + valorCOFINSItem
          }
        });
      }
    }

    // 7. Obter próximo número da NF-e (buscar última nota da empresa)
    const ultimaNota = await prisma.notaFiscal.findFirst({
      where: {
        empresaFiscalId: empresaId,
        serie: serie
      },
      orderBy: {
        numero: 'desc'
      },
      select: {
        numero: true
      }
    });

    const proximoNumero = ultimaNota ? parseInt(ultimaNota.numero ?? '0', 10) + 1 : 1;

    // 8. Retornar dados formatados
    // Simples Nacional (CRT 1): zerar PIS/COFINS nos totais (já incluídos na DAS)
    const valorPISFinal = empresa.regimeTributario === 'SimplesNacional' ? 0 : valorPIS;
    const valorCOFINSFinal = empresa.regimeTributario === 'SimplesNacional' ? 0 : valorCOFINS;
    // Soma vTotTrib dos itens (regra 685: total deve bater com itens)
    const valorTotTrib = produtos.reduce((s, p) => s + (p.impostos?.vTotTrib ?? 0), 0);
    
    // Log para debug - validar consistência de tributos
    console.log(`[NFE] Regime: ${empresa.regimeTributario}, vTotTrib total: ${valorTotTrib.toFixed(2)}`);
    console.log(`[NFE] Tributos por item:`, produtos.map(p => `${p.descricao}: ${(p.impostos?.vTotTrib ?? 0).toFixed(2)}`));

    return {
      emitente: {
        ...emitente,
        codigoEstado: this.obterCodigoEstado(empresa.estado || 'SC') // Adicionar código do estado
      },
      destinatario,
      produtos,
      totais: {
        valorProdutos: valorTotalProdutos,
        valorNF: valorTotalProdutos, // Valor total da NF (pode incluir frete, desconto, etc)
        baseICMS: baseICMS,
        valorICMS: valorICMS,
        valorIPI: valorIPI,
        valorPIS: valorPISFinal,
        valorCOFINS: valorCOFINSFinal,
        valorTotTrib
      },
      naturezaOperacao: naturezaOperacao,
      serie: serie,
      numero: proximoNumero,
      dataEmissao: new Date()
    };
  }

  /**
   * Dados para NF-e de uma fração (faturamento fracionado).
   * Produtos escalonados e descrição com sufixo (Regra Fiscal Caminho A).
   */
  async buscarDadosVendaParaNFeComFracao(
    vendaId: string,
    empresaId: string,
    opts: {
      clienteId: string;
      valorTotalFracao: number;
      sufixoDescricao: string;
      cfop?: string;
      naturezaOperacao?: string;
      serie?: string;
      numero: number;
    }
  ): Promise<DadosNFe> {
    const cfop = opts.cfop || '5101';
    const naturezaOperacao = opts.naturezaOperacao || 'Venda de Mercadoria';
    const serie = opts.serie || '1';

    const venda = await VendasService.buscarVenda(vendaId);
    if (!venda || !(venda as any).orcamento) throw new Error(`Venda ${vendaId} não encontrada ou sem orçamento`);

    const [empresa, cliente, configSistema] = await Promise.all([
      prisma.empresaFiscal.findUnique({ where: { id: empresaId } }),
      prisma.cliente.findUnique({ where: { id: opts.clienteId } }),
      prisma.configuracaoSistema.findFirst({
        select: { aliquotaImpostoPadrao: true }
      })
    ]);
    
    if (!empresa) throw new Error('Empresa fiscal não encontrada');
    if (!cliente) throw new Error(`Cliente ${opts.clienteId} não encontrado`);

    const valorTotalPedido = Number(venda.valorTotal) || 1;
    const ratio = valorTotalPedido > 0 ? opts.valorTotalFracao / valorTotalPedido : 0;

    const emitente = {
      cnpj: empresa.cnpj.replace(/\D/g, ''),
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia || empresa.razaoSocial,
      inscricaoEstadual: empresa.inscricaoEstadual,
      regimeTributario: empresa.regimeTributario === 'SimplesNacional' ? 'SimplesNacional' : 'RegimeNormal',
      endereco: {
        logradouro: empresa.endereco || '',
        numero: empresa.numero || 'S/N',
        complemento: empresa.complemento || '',
        bairro: empresa.bairro || '',
        codigoMunicipio: this.obterCodigoMunicipio(empresa.cidade, empresa.estado),
        municipio: empresa.cidade || '',
        uf: empresa.estado || '',
        cep: (empresa.cep || '').replace(/\D/g, ''),
        telefone: (empresa.telefone || '').replace(/\D/g, '') || ''
      }
    };

    const cpfCnpjCliente = (cliente.cpfCnpj || '').replace(/\D/g, '');
    const isPessoaFisica = cpfCnpjCliente.length === 11;
    let logradouro = '';
    let numeroEnd = (cliente as any).numero || 'S/N';
    let bairroEnd = cliente.bairro || '';
    if (typeof cliente.endereco === 'string') {
      try {
        const parsed = JSON.parse(cliente.endereco);
        logradouro = parsed.logradouro || parsed.endereco || cliente.endereco || '';
        numeroEnd = parsed.numero || (cliente as any).numero || numeroEnd;
        bairroEnd = parsed.bairro || cliente.bairro || bairroEnd;
      } catch {
        logradouro = cliente.endereco != null ? String(cliente.endereco) : '';
      }
    } else {
      logradouro = cliente.endereco != null ? String(cliente.endereco) : '';
    }
    let razaoSocial = String(cliente.nome || '').trim();
    razaoSocial = razaoSocial.replace(/^\s*\d{2,3}\.\d{3}\.\d{3}[\/\-]?\d{4}[\-]?\d{2}\s*/i, '');
    razaoSocial = razaoSocial.replace(/^\s*\d{3}\.\d{3}\.\d{3}[\-]?\d{2}\s*/i, '');
    razaoSocial = razaoSocial.trim() || cliente.nome || '';
    const ieCliente = (cliente as any).inscricaoEstadual;
    const indIEDestCliente = (cliente as any).indIEDest as number | null | undefined;
    let indIEDest: number;
    let ieDest: string;
    if (indIEDestCliente === 1) { indIEDest = 1; ieDest = (ieCliente && String(ieCliente).trim()) ? String(ieCliente).trim() : ''; }
    else if (indIEDestCliente === 2) { indIEDest = 2; ieDest = 'ISENTO'; }
    else if (indIEDestCliente === 9) { indIEDest = 9; ieDest = ''; }
    else {
      const temIE = ieCliente && String(ieCliente).trim() && String(ieCliente).toUpperCase() !== 'ISENTO';
      indIEDest = temIE ? 1 : 9;
      ieDest = temIE ? String(ieCliente).trim() : '';
    }
    const destinatario = {
      [isPessoaFisica ? 'cpf' : 'cnpj']: cpfCnpjCliente,
      razaoSocial,
      inscricaoEstadual: ieDest,
      indIEDest,
      endereco: {
        logradouro: logradouro.trim() || '-',
        numero: (numeroEnd || 'S/N').trim(),
        complemento: '',
        bairro: bairroEnd?.trim() || '-',
        codigoMunicipio: this.obterCodigoMunicipio(cliente.cidade || '', cliente.estado || ''),
        municipio: cliente.cidade || '',
        uf: cliente.estado || '',
        cep: (cliente.cep || '').replace(/\D/g, '') || '',
        telefone: (cliente.telefone || '').replace(/\D/g, '') || ''
      }
    };

    const produtos: Array<{ codigo: string; descricao: string; ncm: string; cfop: string; unidade: string; quantidade: number; valorUnitario: number; valorTotal: number; gtin?: string; impostos: any }> = [];
    let valorTotalProdutos = 0;
    let baseICMS = 0;
    let valorICMS = 0;
    let valorIPI = 0;
    let valorPIS = 0;
    let valorCOFINS = 0;
    const aliquotaICMS = 12;
    const aliquotaIPI = 0;
    const aliquotaPIS = 1.65;
    const aliquotaCOFINS = 7.60;

    const items = ((venda as any).orcamento?.items || []) as any[];
    for (const item of items) {
      if (item.tipo === 'SERVICO') continue;
      // ========== CORREÇÃO OBRIGATÓRIA: cProd nunca vazio ==========
      const sku = NFeService.gerarCodigoProduto(item);
      const ncmRaw = item.ncm || item.cotacao?.ncm || item.material?.ncm || '00000000';
      const ncm = String(ncmRaw).replace(/\D/g, '').padStart(8, '0').slice(0, 8);
      const descricaoOriginal = item.cotacao?.nome || item.descricao || item.material?.nome || 'Produto sem descrição';
      const descricao = (descricaoOriginal + opts.sufixoDescricao).substring(0, 120);
      const unidade = item.unidadeVenda || (item.material as any)?.unidadeMedida || 'UN';
      const quantidade = item.quantidade || 1;
      const valorTotalOriginal = item.subtotal || (quantidade * (item.precoUnit || 0));
      const valorTotal = Math.round(valorTotalOriginal * ratio * 100) / 100;
      const valorUnitario = quantidade > 0 ? Math.round((valorTotal / quantidade) * 10000) / 10000 : 0;

      valorTotalProdutos += valorTotal;
      const baseICMSItem = valorTotal;
      const valorICMSItem = (baseICMSItem * aliquotaICMS) / 100;
      const valorIPIItem = (valorTotal * aliquotaIPI) / 100;
      const valorPISItem = (valorTotal * aliquotaPIS) / 100;
      const valorCOFINSItem = (valorTotal * aliquotaCOFINS) / 100;
      baseICMS += baseICMSItem;
      valorICMS += valorICMSItem;
      valorIPI += valorIPIItem;
      if (empresa.regimeTributario !== 'SimplesNacional') {
        valorPIS += valorPISItem;
        valorCOFINS += valorCOFINSItem;
      }

      produtos.push({
        codigo: sku,
        descricao,
        ncm,
        cfop,
        unidade,
        quantidade,
        valorUnitario,
        valorTotal,
        gtin: undefined, // Sempre "SEM GTIN" - campo codigoBarras não existe no schema atual
        impostos: {
          icms: { origem: '0', cst: empresa.regimeTributario === 'SimplesNacional' ? '102' : '00', aliquota: aliquotaICMS, valor: valorICMSItem },
          ipi: { cst: aliquotaIPI > 0 ? '50' : '99', aliquota: aliquotaIPI, valor: valorIPIItem },
          pis: { cst: '01', aliquota: aliquotaPIS, valor: valorPISItem },
          cofins: { cst: '01', aliquota: aliquotaCOFINS, valor: valorCOFINSItem },
          vTotTrib: empresa.regimeTributario === 'SimplesNacional'
            ? 0
            : valorICMSItem + valorIPIItem + valorPISItem + valorCOFINSItem
        }
      });
    }

    // Ajuste de centavos: último item absorve a diferença para que soma(itens) = valorTotalFracao (exigência SEFAZ)
    const valorEsperadoNota = opts.valorTotalFracao;
    const diff = Math.round((valorEsperadoNota - valorTotalProdutos) * 100) / 100;
    if (produtos.length > 0 && diff !== 0) {
      const ultimo = produtos[produtos.length - 1];
      const novoValorTotal = Math.round((ultimo.valorTotal + diff) * 100) / 100;
      ultimo.valorTotal = novoValorTotal;
      ultimo.valorUnitario = ultimo.quantidade > 0 ? Math.round((novoValorTotal / ultimo.quantidade) * 10000) / 10000 : 0;
      valorTotalProdutos = valorEsperadoNota;
      const icms = ultimo.impostos?.icms;
      const ipi = ultimo.impostos?.ipi;
      const pis = ultimo.impostos?.pis;
      const cofins = ultimo.impostos?.cofins;
      const valorICMSL = icms ? (novoValorTotal * icms.aliquota) / 100 : 0;
      const valorIPIL = ipi ? (novoValorTotal * ipi.aliquota) / 100 : 0;
      const valorPISL = pis ? (novoValorTotal * pis.aliquota) / 100 : 0;
      const valorCOFINSL = cofins ? (novoValorTotal * cofins.aliquota) / 100 : 0;
      ultimo.impostos = {
        icms: icms ? { ...icms, valor: valorICMSL } : { origem: '0', cst: '102', aliquota: 0, valor: 0 },
        ipi: ipi ? { ...ipi, valor: valorIPIL } : { cst: '99', aliquota: 0, valor: 0 },
        pis: pis ? { ...pis, valor: valorPISL } : { cst: '01', aliquota: 0, valor: 0 },
        cofins: cofins ? { ...cofins, valor: valorCOFINSL } : { cst: '01', aliquota: 0, valor: 0 },
        vTotTrib: empresa.regimeTributario === 'SimplesNacional'
          ? 0
          : valorICMSL + valorIPIL + valorPISL + valorCOFINSL
      };
    } else if (produtos.length > 0) {
      valorTotalProdutos = valorEsperadoNota;
    }

    const valorPISFinal = empresa.regimeTributario === 'SimplesNacional' ? 0 : valorPIS;
    const valorCOFINSFinal = empresa.regimeTributario === 'SimplesNacional' ? 0 : valorCOFINS;
    const valorTotTrib = produtos.reduce((s, p) => s + (p.impostos?.vTotTrib ?? 0), 0);

    return {
      emitente: { ...emitente, codigoEstado: this.obterCodigoEstado(empresa.estado || 'SC') },
      destinatario,
      produtos,
      totais: {
        valorProdutos: valorTotalProdutos,
        valorNF: valorTotalProdutos,
        baseICMS,
        valorICMS,
        valorIPI,
        valorPIS: valorPISFinal,
        valorCOFINS: valorCOFINSFinal,
        valorTotTrib
      },
      naturezaOperacao,
      serie,
      numero: opts.numero,
      dataEmissao: new Date()
    };
  }

  /**
   * Obtém código do município (IBGE) - função auxiliar
   * Em produção, buscar de uma tabela de municípios
   * Por enquanto, retorna código padrão baseado no estado
   */
  private obterCodigoMunicipio(cidade: string, estado: string): string {
    // Códigos de exemplo - em produção, buscar de uma tabela de municípios
    const codigosExemplo: { [key: string]: string } = {
      'SC': '4208203', // Itajaí (padrão SC)
      'SP': '3550308', // São Paulo
      'RJ': '3304557', // Rio de Janeiro
      'MG': '3106200', // Belo Horizonte
      'RS': '4314902', // Porto Alegre
      'PR': '4106902', // Curitiba
    };

    return codigosExemplo[estado] || '4208203'; // Padrão: Itajaí/SC
  }

  /**
   * Obtém código do estado (UF) - função auxiliar
   * Retorna código IBGE do estado (2 dígitos)
   */
  private obterCodigoEstado(uf: string): string {
    const codigosEstados: { [key: string]: string } = {
      'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
      'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
      'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
      'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
      'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
      'SE': '28', 'TO': '17'
    };

    return codigosEstados[uf.toUpperCase()] || '42'; // Padrão: SC
  }

  /**
   * Gera o XML da NF-e 4.0
   */
  generateNFeXML(dados: DadosNFe, modoEnvio: NFeModoEnvio = 'NORMAL'): string {
    // Data/hora em horário de Brasília (-03:00) para evitar rejeição 703
    const now = new Date();
    const brTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // UTC-3
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dhEmi = `${brTime.getUTCFullYear()}-${pad(brTime.getUTCMonth() + 1)}-${pad(brTime.getUTCDate())}T${pad(brTime.getUTCHours())}:${pad(brTime.getUTCMinutes())}:${pad(brTime.getUTCSeconds())}-03:00`;
    const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');

    // Definir tipo de emissão (tpEmis): 1 = Normal, 6 = SVC-AN, 7 = SVC-RS
    const tpEmis =
      modoEnvio === 'SVC-AN'
        ? '6'
        : modoEnvio === 'SVC-RS'
        ? '7'
        : '1';

    // ========== CORREÇÃO 5: GERAÇÃO E VALIDAÇÃO RIGOROSA DA CHAVE/cDV ==========
    console.log('🔧 [Fix Rejeição 297] Gerando chave de acesso rigorosamente...');
    
    // Gerar chave de acesso com dígito verificador correto (inclui tpEmis)
    const chaveAcesso = this.gerarChaveAcesso(
      dados.emitente.cnpj,
      dados.serie,
      dados.numero.toString(),
      cNF,
      tpEmis
    );

    // Extrair dígito verificador da chave gerada
    const cDV = chaveAcesso.slice(-1);
    
    // Validação crítica: Garantir que chave e cDV estão corretos
    console.log('🔧 [Fix cDV] Chave de acesso final:', chaveAcesso);
    console.log('🔧 [Fix cDV] cDV extraído:', cDV);
    console.log('🔧 [Fix cDV] Tamanho chave:', chaveAcesso.length, '(deve ser 44)');
    
    // Validar chave usando utilitário interno
    const validacaoChave = NFeChaveAcessoUtil.validarChaveAcesso(chaveAcesso);
    if (!validacaoChave.valida) {
      throw new Error(`Chave de acesso gerada é inválida: ${validacaoChave.erro}`);
    }
    
    console.log('✅ [Fix cDV] Chave de acesso validada com sucesso - cDV correto');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe xmlns="http://www.portalfiscal.inf.br/nfe" Id="NFe${chaveAcesso}" versao="4.00">
    <ide>
      <cUF>${dados.emitente.codigoEstado || '42'}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>${normalizarParaNFe(dados.naturezaOperacao)}</natOp>
      <mod>55</mod>
      <serie>${dados.serie}</serie>
      <nNF>${dados.numero}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${dados.emitente.endereco.codigoMunicipio}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>${tpEmis}</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>${dados.ambiente || '2'}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>${dados.destinatario.indIEDest === 9 ? 1 : (dados.indFinal ?? 0)}</indFinal>
      <indPres>${dados.indPres ?? 3}</indPres>
      <indIntermed>0</indIntermed>
      <procEmi>0</procEmi>
      <verProc>S3E-ERP-1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${dados.emitente.cnpj}</CNPJ>
      <xNome>${normalizarParaNFe(dados.emitente.razaoSocial)}</xNome>
      ${dados.emitente.nomeFantasia ? `<xFant>${normalizarParaNFe(dados.emitente.nomeFantasia)}</xFant>` : ''}
      <enderEmit>
        <xLgr>${normalizarParaNFe(dados.emitente.endereco.logradouro)}</xLgr>
        <nro>${dados.emitente.endereco.numero}</nro>
        ${dados.emitente.endereco.complemento ? `<xCpl>${normalizarParaNFe(dados.emitente.endereco.complemento)}</xCpl>` : ''}
        <xBairro>${normalizarParaNFe(dados.emitente.endereco.bairro)}</xBairro>
        <cMun>${dados.emitente.endereco.codigoMunicipio}</cMun>
        <xMun>${normalizarParaNFe(dados.emitente.endereco.municipio)}</xMun>
        <UF>${dados.emitente.endereco.uf}</UF>
        <CEP>${dados.emitente.endereco.cep.replace(/\D/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
        ${dados.emitente.endereco.telefone ? `<fone>${dados.emitente.endereco.telefone.replace(/\D/g, '')}</fone>` : ''}
      </enderEmit>
      <IE>${dados.emitente.inscricaoEstadual}</IE>
      <CRT>${dados.emitente.regimeTributario === 'SimplesNacional' ? '1' : '3'}</CRT>
    </emit>
    <dest>
      ${dados.destinatario.cnpj ? `<CNPJ>${dados.destinatario.cnpj}</CNPJ>` : ''}
      ${dados.destinatario.cpf ? `<CPF>${dados.destinatario.cpf}</CPF>` : ''}
      <xNome>${dados.ambiente === '2' ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : normalizarParaNFe(dados.destinatario.razaoSocial)}</xNome>
      <enderDest>
        <xLgr>${normalizarParaNFe(dados.destinatario.endereco.logradouro)}</xLgr>
        <nro>${dados.destinatario.endereco.numero}</nro>
        <xBairro>${normalizarParaNFe(dados.destinatario.endereco.bairro)}</xBairro>
        <cMun>${dados.destinatario.endereco.codigoMunicipio}</cMun>
        <xMun>${normalizarParaNFe(dados.destinatario.endereco.municipio)}</xMun>
        <UF>${dados.destinatario.endereco.uf}</UF>
        <CEP>${dados.destinatario.endereco.cep.replace(/\D/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>
      <indIEDest>${dados.destinatario.indIEDest ?? 1}</indIEDest>
      ${dados.destinatario.inscricaoEstadual && dados.destinatario.indIEDest !== 9 ? `<IE>${dados.destinatario.inscricaoEstadual}</IE>` : ''}
    </dest>
    ${dados.autorizadosDownload && dados.autorizadosDownload.length > 0 ? dados.autorizadosDownload.map(aut => `
    <autXML>
      ${aut.cnpj ? `<CNPJ>${aut.cnpj}</CNPJ>` : ''}
      ${aut.cpf ? `<CPF>${aut.cpf}</CPF>` : ''}
    </autXML>`).join('') : ''}
    ${this.gerarItensXML(dados.produtos, dados.emitente.regimeTributario)}
    <total>
      <ICMSTot>
        <vBC>${dados.emitente.regimeTributario === 'SimplesNacional' ? '0.00' : dados.totais.baseICMS.toFixed(2)}</vBC>
        <vICMS>${dados.emitente.regimeTributario === 'SimplesNacional' ? '0.00' : dados.totais.valorICMS.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCPUFDest>0.00</vFCPUFDest>
        <vICMSUFDest>0.00</vICMSUFDest>
        <vICMSUFRemet>0.00</vICMSUFRemet>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${dados.totais.valorProdutos.toFixed(2)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>${dados.totais.valorIPI.toFixed(2)}</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${dados.totais.valorPIS.toFixed(2)}</vPIS>
        <vCOFINS>${dados.totais.valorCOFINS.toFixed(2)}</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${dados.totais.valorNF.toFixed(2)}</vNF>
        <vTotTrib>${(dados.emitente.regimeTributario === 'SimplesNacional' ? 0 : (dados.totais.valorTotTrib ?? 0)).toFixed(2)}</vTotTrib>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>${dados.modFrete ?? 9}</modFrete>
    </transp>
    ${dados.cobranca ? `
    <cobr>
      ${dados.cobranca.numeroFatura ? `
      <fat>
        <nFat>${dados.cobranca.numeroFatura}</nFat>
        <vOrig>${(dados.cobranca.valorOriginal || dados.totais.valorNF).toFixed(2)}</vOrig>
        <vDesc>${(dados.cobranca.valorDesconto || 0).toFixed(2)}</vDesc>
        <vLiq>${(dados.cobranca.valorLiquido || dados.totais.valorNF).toFixed(2)}</vLiq>
      </fat>` : ''}
      ${dados.cobranca.duplicatas && dados.cobranca.duplicatas.length > 0 ? dados.cobranca.duplicatas.map(dup => `
      <dup>
        <nDup>${dup.numero}</nDup>
        <dVenc>${dup.vencimento}</dVenc>
        <vDup>${dup.valor.toFixed(2)}</vDup>
      </dup>`).join('') : ''}
    </cobr>` : ''}
    <pag>
      <detPag>
        ${dados.formaPagamento?.indPag !== undefined ? `<indPag>${dados.formaPagamento.indPag}</indPag>` : ''}
        <tPag>${String(dados.formaPagamento?.tipo ?? 15).padStart(2, '0')}</tPag>
        <vPag>${(dados.formaPagamento?.valor || dados.totais.valorNF).toFixed(2)}</vPag>
      </detPag>
    </pag>
    <infAdic>
${dados.informacoesAdicionais ? `      <infCpl>${normalizarParaNFe(dados.informacoesAdicionais)}</infCpl>
` : ''}    </infAdic>
    <infRespTec>
      <CNPJ>${(dados.responsavelTecnico?.cnpj ?? dados.emitente.cnpj)}</CNPJ>
      <xContato>${normalizarParaNFe(dados.responsavelTecnico?.contato ?? 'Departamento de TI')}</xContato>
      <email>${dados.responsavelTecnico?.email ?? 'contato@s3eengenharia.com.br'}</email>
      <fone>${(dados.responsavelTecnico?.telefone ?? dados.emitente.endereco?.telefone ?? '4730838361').replace(/\D/g, '')}</fone>
    </infRespTec>
  </infNFe>
</NFe>`;

    return xml;
  }

  /**
   * Gera os itens (produtos) do XML
   */
  private gerarItensXML(produtos: any[], regimeTributario: string): string {
    return produtos.map((produto, index) => `
    <det nItem="${index + 1}">
      <prod>
        <cProd>${produto.codigo}</cProd>
        <cEAN>${produto.gtin || 'SEM GTIN'}</cEAN>
        <xProd>${normalizarParaNFe(produto.descricao)}</xProd>
        <NCM>${produto.ncm}</NCM>
        <CFOP>${produto.cfop}</CFOP>
        <uCom>${produto.unidade}</uCom>
        <qCom>${produto.quantidade.toFixed(4)}</qCom>
        <vUnCom>${Number(produto.valorUnitario).toFixed(4)}</vUnCom>
        <vProd>${produto.valorTotal.toFixed(2)}</vProd>
        <cEANTrib>${produto.gtin || 'SEM GTIN'}</cEANTrib>
        <uTrib>${produto.unidade}</uTrib>
        <qTrib>${produto.quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${produto.valorUnitario.toFixed(4)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>${(regimeTributario === 'SimplesNacional' ? 0 : (produto.impostos.vTotTrib || 0)).toFixed(2)}</vTotTrib>
        <ICMS>
          ${regimeTributario === 'SimplesNacional' ? `
          <ICMSSN102>
            <orig>${produto.impostos.icms?.origem || '0'}</orig>
            <CSOSN>102</CSOSN>
          </ICMSSN102>` : `
          <ICMS00>
            <orig>${produto.impostos.icms.origem}</orig>
            <CST>${produto.impostos.icms.cst}</CST>
            <modBC>3</modBC>
            <vBC>${produto.valorTotal.toFixed(2)}</vBC>
            <pICMS>${produto.impostos.icms.aliquota.toFixed(2)}</pICMS>
            <vICMS>${produto.impostos.icms.valor.toFixed(2)}</vICMS>
          </ICMS00>`}
        </ICMS>
        ${produto.impostos.ipi && produto.impostos.ipi.valor > 0 ? `
        <IPI>
          <cEnq>999</cEnq>
          <IPITrib>
            <CST>${produto.impostos.ipi.cst}</CST>
            <vBC>${produto.valorTotal.toFixed(2)}</vBC>
            <pIPI>${produto.impostos.ipi.aliquota.toFixed(2)}</pIPI>
            <vIPI>${produto.impostos.ipi.valor.toFixed(2)}</vIPI>
          </IPITrib>
        </IPI>` : ''}
        ${regimeTributario === 'SimplesNacional' ? `
        <PIS>
          <PISOutr>
            <CST>49</CST>
            <vBC>0.00</vBC>
            <pPIS>0.00</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>49</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.0000</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>` : `
        <PIS>
          <PISAliq>
            <CST>${produto.impostos.pis.cst}</CST>
            <vBC>${produto.valorTotal.toFixed(2)}</vBC>
            <pPIS>${produto.impostos.pis.aliquota.toFixed(2)}</pPIS>
            <vPIS>${produto.impostos.pis.valor.toFixed(2)}</vPIS>
          </PISAliq>
        </PIS>
        <COFINS>
          <COFINSAliq>
            <CST>${produto.impostos.cofins.cst}</CST>
            <vBC>${produto.valorTotal.toFixed(2)}</vBC>
            <pCOFINS>${produto.impostos.cofins.aliquota.toFixed(2)}</pCOFINS>
            <vCOFINS>${produto.impostos.cofins.valor.toFixed(2)}</vCOFINS>
          </COFINSAliq>
        </COFINS>`}
      </imposto>
    </det>`).join('');
  }

  /**
   * Gera chave de acesso da NF-e com dígito verificador correto (Módulo 11)
   */
  private gerarChaveAcesso(
    cnpj: string,
    serie: string,
    numero: string,
    cNF: string,
    tpEmis: string = '1'
  ): string {
    const uf = '42'; // SC
    const modelo = '55';

    return NFeChaveAcessoUtil.gerarChaveAcesso(
      uf,
      cnpj,
      modelo,
      serie,
      numero,
      tpEmis,
      cNF
    );
  }

  /**
   * Assina o XML da NF-e com certificado digital
   */
  async signXML(xml: string, pfxPath: string, password: string): Promise<string> {
    try {
      console.log('🔐 Iniciando assinatura do XML...');
      const existe = fs.existsSync(pfxPath);
      console.log('🔐 [signXML] Caminho certificado:', pfxPath, '| Existe:', existe);
      if (!existe) {
        throw new Error(`Arquivo de certificado não encontrado: ${pfxPath}. Verifique o volume no Docker.`);
      }

      // Carregar certificado do arquivo PFX
      const { key, cert } = NFeSignatureService.carregarCertificado(pfxPath, password);

      // Normalizar XML antes de assinar: evita rejeição 297 (assinatura difere do calculado).
      // - Unificar fins de linha e remover espaços nas bordas.
      // - Colapsar espaços entre tags (/>\s+</) para formato compacto: o digest é calculado sobre
      //   a forma canônica (c14n), que não inclui espaços insignificantes; gerar compacto evita
      //   diferenças entre o que o assinador serializa e o que a SEFAZ canonicaliza.
      const xmlNorm = xml
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
        .replace(/>\s+</g, '><');
      const xmlAssinado = NFeSignatureService.assinarXML(xmlNorm, key, cert);

      console.log('✅ XML assinado com sucesso');
      // IMPORTANTE: retornar exatamente o valor de getSignedXml(); não aplicar pretty-print,
      // .replace(), trim() ou qualquer formatação ao xmlAssinado antes de enviar à SEFAZ.
      return xmlAssinado;
    } catch (error: any) {
      console.error('❌ Erro ao assinar XML:', error);
      throw new Error(`Erro ao assinar XML da NF-e: ${error.message}`);
    }
  }

  /**
   * Emite NF-e na SEFAZ via SOAP
   */
  async emitirNFe(
    xmlAssinado: string,
    pfxPath: string,
    password: string,
    ambiente: '1' | '2',
    modoEnvio: NFeModoEnvio = 'NORMAL'
  ): Promise<any> {
    try {
      console.log(
        `📤 Enviando NF-e para SEFAZ (Ambiente: ${
          ambiente === '1' ? 'Produção' : 'Homologação'
        } | Modo: ${modoEnvio})`
      );

      // Carregar certificado
      const { key, cert } = NFeSignatureService.carregarCertificado(pfxPath, password);

      // Enviar para autorização (passar PFX para mTLS com cadeia completa na SEFAZ).
      // O xmlAssinado deve ser o retorno bruto de getSignedXml(); não alterar (sem pretty-print, replace ou trim).
      const resultadoAutorizacao = await NFeSoapService.autorizarNFe(
        xmlAssinado,
        ambiente,
        cert,
        key,
        modoEnvio,
        pfxPath,
        password
      );

      if (!resultadoAutorizacao.sucesso) {
        throw new Error(resultadoAutorizacao.erro || 'Erro ao autorizar NF-e');
      }

      // Se já retornou protocolo, retornar
      if (resultadoAutorizacao.protocolo) {
        return {
          status: 'sucesso',
          protocolo: resultadoAutorizacao.protocolo,
          chaveAcesso: this.extrairChaveAcesso(xmlAssinado),
          dataHoraAutorizacao: new Date().toISOString(),
          mensagem: 'Autorizado o uso da NF-e',
          codigoStatus: '100'
        };
      }

      // Se retornou recibo, consultar status
      if (resultadoAutorizacao.recibo) {
        console.log(`⏳ Aguardando processamento do lote. Recibo: ${resultadoAutorizacao.recibo}`);
        
        // Aguardar alguns segundos antes de consultar
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Consultar recibo com retry
        let consultaRecibo;
        let tentativas = 0;
        const maxTentativas = 5;
        const delayInicial = 3000; // 3 segundos

        while (tentativas < maxTentativas) {
          // Aguardar antes de consultar (backoff exponencial)
          const delay = delayInicial * Math.pow(2, tentativas);
          await new Promise(resolve => setTimeout(resolve, delay));

          consultaRecibo = await NFeSoapService.consultarRecibo(
            resultadoAutorizacao.recibo,
            ambiente,
            cert,
            key,
            pfxPath,
            password
          );

          // Se sucesso, sair do loop
          if (consultaRecibo.sucesso) {
            break;
          }

          // Se erro diferente de "lote em processamento", parar
          if (consultaRecibo.codigoStatus && consultaRecibo.codigoStatus !== '105') {
            break;
          }

          tentativas++;
          console.log(`⏳ Tentativa ${tentativas}/${maxTentativas} - Aguardando processamento...`);
        }

        if (!consultaRecibo || !consultaRecibo.sucesso) {
          throw new Error(consultaRecibo?.erro || 'Erro ao consultar recibo após múltiplas tentativas');
        }

        // Extrair dados do protocolo
        const dadosProtocolo = NFeProcNFeUtil.extrairDadosProtocolo(consultaRecibo.protocolo || '');

        // Gerar procNFe (XML final)
        let procNFe: string | undefined;
        if (consultaRecibo.protocolo) {
          try {
            procNFe = NFeProcNFeUtil.gerarProcNFe(xmlAssinado, consultaRecibo.protocolo);
            console.log('✅ procNFe gerado com sucesso');
          } catch (error: any) {
            console.warn('⚠️ Erro ao gerar procNFe:', error.message);
            // Não falha a emissão se não conseguir gerar procNFe
          }
        }

        return {
          status: 'sucesso',
          protocolo: dadosProtocolo.numeroProtocolo || consultaRecibo.protocolo,
          chaveAcesso: dadosProtocolo.chaveAcesso || consultaRecibo.chaveAcesso || this.extrairChaveAcesso(xmlAssinado),
          dataAutorizacao: dadosProtocolo.dataAutorizacao || new Date().toISOString(),
          mensagem: dadosProtocolo.mensagem || consultaRecibo.mensagem || 'Autorizado o uso da NF-e',
          codigoStatus: dadosProtocolo.codigoStatus || consultaRecibo.codigoStatus || '104',
          procNFe // XML final (procNFe), se gerado
        };
      }

      throw new Error('Resposta inesperada da SEFAZ');
    } catch (error: any) {
      console.error('❌ Erro ao emitir NF-e:', error);
      const mensagemOriginal = String(error?.message || '');
      const mensagemLower = mensagemOriginal.toLowerCase();
      const ehRejeicaoSefaz =
        mensagemLower.includes('rejeição sefaz') ||
        mensagemLower.includes('rejeicao sefaz');

      if (ehRejeicaoSefaz || !NFeService.isErroComunicacaoSefaz(error)) {
        throw error;
      }

      throw new Error(`Erro ao comunicar com SEFAZ: ${mensagemOriginal}`);
    }
  }

  /**
   * Cancela uma NF-e já autorizada
   */
  async cancelarNFe(
    chaveAcesso: string,
    justificativa: string,
    empresaId: string,
    ambiente: '1' | '2'
  ): Promise<any> {
    try {
      console.log(`🚫 Cancelando NF-e: ${chaveAcesso}`);

      // Validações
      if (justificativa.length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres');
      }

      // Buscar empresa e certificado
      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: empresaId }
      });

      if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
        throw new Error('Empresa fiscal não encontrada ou sem certificado configurado');
      }

      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        throw new Error('Arquivo de certificado não encontrado. Reenvie o certificado pela interface.');
      }

      // Descriptografar senha do certificado
      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado para cancelamento:', error);
        throw new Error('Senha do certificado inválida para cancelamento de NF-e');
      }

      // Carregar certificado para envio SOAP
      const { key, cert } = NFeSignatureService.carregarCertificado(
        pfxPathResolvido,
        senhaDescriptografada
      );

      // Enviar cancelamento para SEFAZ
      const resultado = await NFeSoapService.cancelarNFe(chaveAcesso, justificativa, ambiente, cert, key);

      if (!resultado.sucesso) {
        throw new Error(resultado.erro || 'Erro ao cancelar NF-e');
      }

      console.log('✅ NF-e cancelada:', resultado);
      return {
        status: 'sucesso',
        protocolo: resultado.protocolo,
        chaveAcesso,
        mensagem: resultado.mensagem || 'Cancelamento de NF-e registrado',
        codigoStatus: resultado.codigoStatus || '135'
      };
    } catch (error: any) {
      console.error('❌ Erro ao cancelar NF-e:', error);
      throw error;
    }
  }

  /**
   * Envia Carta de Correção (CC-e)
   */
  async corrigirNFe(
    chaveAcesso: string,
    textoCorrecao: string,
    sequencia: number,
    empresaId: string,
    ambiente: '1' | '2'
  ): Promise<any> {
    try {
      console.log(`📝 Enviando CC-e para NF-e: ${chaveAcesso}`);

      // Validações
      if (textoCorrecao.length < 15) {
        throw new Error('Texto da correção deve ter no mínimo 15 caracteres');
      }

      // Buscar empresa e certificado (ainda não enviaremos para SEFAZ, mas já garantimos que a empresa está configurada)
      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: empresaId }
      });

      if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
        throw new Error('Empresa fiscal não encontrada ou sem certificado configurado para CC-e');
      }

      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        throw new Error('Arquivo de certificado não encontrado. Reenvie o certificado pela interface.');
      }

      // Descriptografar senha do certificado
      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado para CC-e:', error);
        throw new Error('Senha do certificado inválida para emissão de CC-e');
      }

      // Gerar XML de CC-e (simplificado) — ainda não enviado para SEFAZ
      const xmlCCe = this.gerarXMLCCe(chaveAcesso, textoCorrecao, sequencia);

      // Assinar XML (futuro envio para SEFAZ via serviço de eventos)
      const xmlAssinado = await this.signXML(xmlCCe, pfxPathResolvido, senhaDescriptografada);

      // MOCK: Simular envio para SEFAZ
      const mockResposta = {
        status: 'sucesso',
        protocolo: `110${Date.now().toString().slice(-9)}`,
        chaveAcesso,
        sequencia,
        mensagem: 'Carta de Correção registrada',
        codigoStatus: '135'
      };

      console.log('✅ CC-e registrada (MOCK):', mockResposta);
      return mockResposta;
    } catch (error) {
      console.error('❌ Erro ao enviar CC-e:', error);
      throw error;
    }
  }

  /**
   * Gera XML de cancelamento (simplificado)
   */
  private gerarXMLCancelamento(chaveAcesso: string, justificativa: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<eventoCancNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <infEvento Id="ID110111${chaveAcesso}01">
    <cOrgao>42</cOrgao>
    <tpAmb>2</tpAmb>
    <CNPJ>79502563000138</CNPJ>
    <chNFe>${chaveAcesso}</chNFe>
    <dhEvento>${new Date().toISOString().replace(/\.\d{3}Z$/, '-03:00')}</dhEvento>
    <tpEvento>110111</tpEvento>
    <nSeqEvento>1</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Cancelamento</descEvento>
      <nProt>MOCK_PROTOCOLO</nProt>
      <xJust>${justificativa}</xJust>
    </detEvento>
  </infEvento>
</eventoCancNFe>`;
  }

  /**
   * Gera XML de Carta de Correção (simplificado)
   */
  private gerarXMLCCe(chaveAcesso: string, textoCorrecao: string, sequencia: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<eventoCCe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <infEvento Id="ID110110${chaveAcesso}${sequencia.toString().padStart(2, '0')}">
    <cOrgao>42</cOrgao>
    <tpAmb>2</tpAmb>
    <CNPJ>79502563000138</CNPJ>
    <chNFe>${chaveAcesso}</chNFe>
    <dhEvento>${new Date().toISOString().replace(/\.\d{3}Z$/, '-03:00')}</dhEvento>
    <tpEvento>110110</tpEvento>
    <nSeqEvento>${sequencia}</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Carta de Correcao</descEvento>
      <xCorrecao>${textoCorrecao}</xCorrecao>
      <xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.</xCondUso>
    </detEvento>
  </infEvento>
</eventoCCe>`;
  }

  /**
   * Extrai chave de acesso do XML
   */
  private extrairChaveAcesso(xml: string): string {
    const match = xml.match(/Id="NFe(\d{44})"/);
    return match ? match[1] : '';
  }

  /**
   * Inutiliza uma faixa de numeração de NF-e para a empresa informada
   */
  async inutilizarNumeracao(
    empresaId: string,
    params: {
      ano: string;
      modelo?: string;
      serie: string;
      numeroInicial: string;
      numeroFinal: string;
      justificativa: string;
      ambiente: '1' | '2';
    }
  ): Promise<any> {
    const { ano, modelo = '55', serie, numeroInicial, numeroFinal, justificativa, ambiente } =
      params;

    try {
      // Validações básicas
      if (justificativa.length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres');
      }

      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: empresaId }
      });

      if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
        throw new Error('Empresa fiscal não encontrada ou sem certificado configurado');
      }

      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        throw new Error('Arquivo de certificado não encontrado. Reenvie o certificado pela interface.');
      }

      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado para inutilização:', error);
        throw new Error('Senha do certificado inválida para inutilização de numeração');
      }

      const { key, cert } = NFeSignatureService.carregarCertificado(
        pfxPathResolvido,
        senhaDescriptografada
      );

      const resultado = await NFeSoapService.inutilizarNumeracao(
        {
          cnpj: empresa.cnpj,
          ano,
          modelo,
          serie,
          numeroInicial,
          numeroFinal,
          justificativa,
          ambiente
        },
        cert,
        key
      );

      if (!resultado.sucesso) {
        throw new Error(resultado.erro || 'Erro ao inutilizar numeração de NF-e na SEFAZ');
      }

      return {
        status: 'sucesso',
        protocolo: resultado.protocolo,
        codigoStatus: resultado.codigoStatus,
        mensagem: resultado.mensagem || 'Inutilização de numeração homologada'
      };
    } catch (error: any) {
      console.error('❌ Erro ao inutilizar numeração de NF-e:', error);
      throw error;
    }
  }

  /**
   * Manifestação do destinatário para uma NF-e recebida
   */
  async manifestarDestinatario(
    empresaId: string,
    params: {
      chaveAcesso: string;
      tipoEvento: '210200' | '210210' | '210220' | '210240';
      justificativa?: string;
      ambiente: '1' | '2';
    }
  ): Promise<any> {
    const { chaveAcesso, tipoEvento, justificativa, ambiente } = params;

    try {
      if (!chaveAcesso || chaveAcesso.length !== 44) {
        throw new Error('Chave de acesso inválida para manifestação (deve ter 44 dígitos)');
      }

      if (tipoEvento === '210240' && (!justificativa || justificativa.length < 15)) {
        throw new Error(
          'Justificativa é obrigatória e deve ter no mínimo 15 caracteres para Operação não Realizada (210240)'
        );
      }

      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: empresaId }
      });

      if (!empresa || !empresa.certificadoPath || !empresa.certificadoSenha) {
        throw new Error('Empresa fiscal não encontrada ou sem certificado configurado');
      }

      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        throw new Error('Arquivo de certificado não encontrado. Reenvie o certificado pela interface.');
      }

      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado para manifestação:', error);
        throw new Error('Senha do certificado inválida para manifestação do destinatário');
      }

      const { key, cert } = NFeSignatureService.carregarCertificado(
        pfxPathResolvido,
        senhaDescriptografada
      );

      const resultado = await NFeSoapService.manifestarDestinatario(
        {
          chaveAcesso,
          cnpj: empresa.cnpj,
          tipoEvento,
          justificativa,
          ambiente
        },
        cert,
        key
      );

      if (!resultado.sucesso) {
        throw new Error(resultado.erro || 'Erro na manifestação do destinatário na SEFAZ');
      }

      return {
        status: 'sucesso',
        protocolo: resultado.protocolo,
        codigoStatus: resultado.codigoStatus,
        mensagem: resultado.mensagem || 'Manifestação registrada com sucesso'
      };
    } catch (error: any) {
      console.error('❌ Erro na manifestação do destinatário:', error);
      throw error;
    }
  }

  /**
   * Processo completo de emissão
   */
  async processarEmissao(
    pedidoId: string,
    empresaId: string,
    ambienteSelecionado?: '1' | '2',
    cfop?: string,
    naturezaOperacao?: string,
    serie?: string
  ): Promise<any> {
    let xmlNFe: string | null = null;
    let xmlAssinado: string | null = null;

    try {
      console.log(`\n🚀 Iniciando processo de emissão da NF-e para pedido: ${pedidoId}`);

      // Auditoria: emissão iniciada
      await NFeAuditService.registrarEvento({
        action: 'NFE_EMISSAO_INICIADA',
        description: 'Processo de emissão de NF-e iniciado',
        pedidoId,
        empresaFiscalId: empresaId,
        metadata: {
          ambienteSelecionado: ambienteSelecionado || '2'
        }
      });

      // 1. Buscar dados da empresa fiscal
      const empresa = await prisma.empresaFiscal.findUnique({
        where: { id: empresaId }
      });

      if (!empresa) {
        throw new Error('Empresa fiscal não encontrada');
      }

      // Criar registro inicial de NotaFiscal para garantir histórico mesmo se falhar durante o processo
      // Esse registro será atualizado ao final do processo com dados reais (número, xml, status, etc).
      let notaFiscalId: string | undefined;
      try {
        // Calcular próximo número sequencial para a empresa usando MAX(numero)
        const ambienteStr = (ambienteSelecionado === '1') ? 'PRODUCAO' : 'HOMOLOGACAO';
        const raw = await prisma.$queryRawUnsafe<{ max: number }[]>(
          // Filtrar apenas valores numéricos em "numero" para evitar CAST em valores UUID/strings inválidas
          'SELECT MAX(CAST(numero AS INTEGER)) as max FROM notas_fiscais WHERE "empresaFiscalId" = $1 AND ambiente = $2 AND numero ~ \'^[0-9]+$\'',
          empresa.id,
          ambienteStr
        );
        const maxExisting = (raw && raw[0] && raw[0].max) ? Number(raw[0].max) : 0;
        const ultimoConfigurado = (empresa as any).ultimoNumeroNFe ? Number((empresa as any).ultimoNumeroNFe) : 0;
        const proximoNumero = Math.max(maxExisting, ultimoConfigurado) + 1;

        // Criar registro inicial reservando o número sequencial (usar upsert para evitar duplicidade)
        try {
          const upsertNota = await prisma.notaFiscal.upsert({
            where: {
              empresaFiscalId_numero: {
                empresaFiscalId: empresa.id,
                numero: String(proximoNumero)
              }
            },
            create: {
              projetoId: null,
              empresaFiscalId: empresa.id,
              numero: String(proximoNumero),
              serie: serie || '1',
              ambiente: ambienteStr,
              chaveAcesso: null,
              tipo: 'PRODUTO',
              natureza: 'Emissão iniciada',
              cfop: cfop || '5101',
              valorProdutos: 0,
              valorServicos: 0,
              valorTotal: 0,
              dataEmissao: new Date(),
              status: 'Iniciada',
              xmlNFe: null,
              observacoes: 'Registro inicial criado antes do processo de emissão'
            },
            update: {
              updatedAt: new Date(),
              observacoes: 'Reserva de número atualizada antes do processo de emissão'
            }
          });
          notaFiscalId = upsertNota.id;
        } catch (upsertErr: any) {
          console.warn('⚠️ Upsert reserva nota falhou, tentando buscar existente:', upsertErr.message);
          // Caso falhe, tentar encontrar registro existente pelo composite
          const existente = await prisma.notaFiscal.findFirst({
            where: { empresaFiscalId: empresa.id, numero: String(proximoNumero) }
          });
          if (existente) notaFiscalId = existente.id;
        }
      } catch (err) {
        console.warn('⚠️ Não foi possível criar/atualizar registro inicial de NotaFiscal:', (err as any).message);
        // Não interromper o fluxo; continuamos sem notaFiscalId, mas tentaremos salvar ao final.
      }

      if (!empresa.certificadoPath || !empresa.certificadoSenha) {
        console.error('❌ [NFE Cert] Configuração ausente para empresa fiscal:', {
          empresaId: empresa.id,
          certificadoPathConfigurado: !!empresa.certificadoPath,
          certificadoSenhaConfigurada: !!empresa.certificadoSenha
        });
        throw new Error('Certificado digital não configurado para esta empresa');
      }

      const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
      console.log('🔐 [NFE Cert] Verificação de caminho do certificado:', {
        empresaId: empresa.id,
        certificadoPathOriginal: empresa.certificadoPath,
        certificadoPathResolvido: pfxPathResolvido,
        arquivoExiste: !!pfxPathResolvido && fs.existsSync(pfxPathResolvido)
      });
      if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) {
        throw new Error(
          'Arquivo de certificado não encontrado. Reenvie o certificado pela interface (Configurações Fiscais) com o app já rodando em produção.'
        );
      }

      // Descriptografar senha do certificado
      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        // Se falhar, pode ser que a senha não esteja criptografada (compatibilidade)
        // ou está em formato antigo (bcrypt - não pode descriptografar)
        console.warn('⚠️ Erro ao descriptografar senha do certificado. Tentando usar como texto plano...');
        throw new Error('Senha do certificado não pode ser descriptografada. Reconfigure o certificado.');
      }

      // 2. Buscar dados reais da venda do banco de dados
      const cfopFinal = cfop || '5101'; // CFOP padrão se não fornecido
      const naturezaFinal = naturezaOperacao || 'Venda de Mercadoria'; // Natureza padrão
      const serieFinal = serie || '1'; // Série padrão
      
      const dadosPedido = await this.buscarDadosVendaParaNFe(
        pedidoId,
        empresaId,
        cfopFinal,
        naturezaFinal,
        serieFinal
      );
      
      // Definir ambiente: prioriza seleção do frontend; se não vier, usa sempre homologação ('2')
      const ambiente: '1' | '2' =
        ambienteSelecionado === '1' || ambienteSelecionado === '2'
          ? ambienteSelecionado
          : '2';

      dadosPedido.ambiente = ambiente;
      console.log('🌎 [NFE Ambiente] tpAmb definido para emissão:', ambiente, ambiente === '1' ? '(Produção)' : '(Homologação)');

      // 3. Gerar XML da NF-e (modo normal)
      console.log('📄 Gerando XML da NF-e (modo NORMAL)...');
      xmlNFe = this.generateNFeXML(dadosPedido, 'NORMAL');

      // 3.1. Validar apenas estrutura básica ANTES da assinatura (sem XSD que exige Signature)
      console.log('🧪 Validando estrutura básica do XML da NF-e (sem XSD)...');
      const validacaoEstrutura = NFeXMLValidatorService.validarEstruturaBasica(xmlNFe);

      if (!validacaoEstrutura.valido) {
        console.error('❌ XML da NF-e reprovado na validação de estrutura:', validacaoEstrutura.erros);
        throw new Error(
          `NF-e reprovada na validação de estrutura. Erros: ${validacaoEstrutura.erros.join(' | ')}`
        );
      }

      const avisosEstrutura = validacaoEstrutura.avisos ?? [];
      if (avisosEstrutura.length > 0) {
        console.warn('⚠️ Avisos de estrutura da NF-e:', avisosEstrutura);
      }

      // 4. Assinar XML
      console.log('✍️ Assinando XML da NF-e...');
      xmlAssinado = await this.signXML(xmlNFe, pfxPathResolvido, senhaDescriptografada);

      // 4.1. Validação completa APÓS assinatura (agora com XSD + Signature)
      console.log('🔍 Validando XML completo da NF-e (com XSD + assinatura)...');
      const resultadoValidacaoCompleta = NFeXMLValidatorService.validarCompleto(xmlAssinado);

      if (!resultadoValidacaoCompleta.valido) {
        console.error('❌ XML assinado da NF-e reprovado na validação:', resultadoValidacaoCompleta.erros);
        throw new Error(
          `NF-e assinada reprovada na validação XSD. Erros: ${resultadoValidacaoCompleta.erros.join(' | ')}`
        );
      }

      const avisosCompleta = resultadoValidacaoCompleta.avisos ?? [];
      if (avisosCompleta.length > 0) {
        console.warn('⚠️ Avisos de validação XSD da NF-e:', avisosCompleta);
      }
      
      console.log('✅ XML da NF-e aprovado em todas as validações (estrutura + XSD + assinatura)!');

      // 5. Enviar para SEFAZ - tentativa modo NORMAL
      console.log('📤 Enviando para SEFAZ (modo NORMAL)...');
      let modoEnvio: NFeModoEnvio = 'NORMAL';
      let resultado;

      try {
        resultado = await this.emitirNFe(
          xmlAssinado,
          pfxPathResolvido,
          senhaDescriptografada,
          ambiente,
          modoEnvio
        );
      } catch (envioError: any) {
        const msgEnvio = String(envioError.message || '');
        const isPossivelFalhaSefazNormal = NFeService.isErroComunicacaoSefaz(envioError);

        // Fallback opcional: tentar SVC-AN antes de cair em contingência offline
        if (isPossivelFalhaSefazNormal) {
          console.warn('⚠️ SEFAZ normal indisponível. Tentando fallback via SVC-AN...');

          try {
            const xmlNFeSvc = this.generateNFeXML(dadosPedido, 'SVC-AN');
            const xmlAssinadoSvc = await this.signXML(
              xmlNFeSvc,
              pfxPathResolvido,
              senhaDescriptografada
            );

            modoEnvio = 'SVC-AN';
            resultado = await this.emitirNFe(
              xmlAssinadoSvc,
              pfxPathResolvido,
              senhaDescriptografada,
              ambiente,
              modoEnvio
            );

            // Se deu certo via SVC-AN, atualiza referências de XML
            xmlNFe = xmlNFeSvc;
            xmlAssinado = xmlAssinadoSvc;

            // Auditoria: fallback bem-sucedido via SVC-AN
            await NFeAuditService.registrarEvento({
              action: 'NFE_FALLBACK_SVC_AN',
              description: 'Fallback automático para SVC-AN realizado com sucesso',
              pedidoId,
              empresaFiscalId: empresaId,
              modoEnvio,
              ambiente,
              metadata: {
                mensagemOriginal: msgEnvio
              }
            });
          } catch (svcError: any) {
            console.error('❌ Falha no fallback via SVC-AN:', svcError);
            // Rejoga erro para cair na contingência offline do catch externo
            throw envioError;
          }
        } else {
          throw envioError;
        }
      }

      // 6. Salvar no banco de dados (tabela NotaFiscal)
      console.log('💾 Salvando NF-e na tabela NotaFiscal...');

      // Se já criamos um registro inicial (na etapa de início), atualize-o; senão, crie novo.
      try {
        const notaData = {
          numero: String(dadosPedido.numero),
          serie: String(dadosPedido.serie),
          chaveAcesso: resultado.chaveAcesso || null,
          natureza: dadosPedido.naturezaOperacao,
          cfop: dadosPedido.produtos[0]?.cfop || '5101',
          valorProdutos: dadosPedido.totais.valorProdutos,
          valorServicos: 0,
          valorTotal: dadosPedido.totais.valorNF,
          dataEmissao: new Date(),
          status: resultado.codigoStatus === '100' || resultado.codigoStatus === '104' ? 'Autorizada' : 'Pendente',
          xmlNFe: resultado.procNFe || xmlAssinado,
          observacoes: resultado.mensagem,
          vendaId: pedidoId
        };
        if (typeof notaFiscalId !== 'undefined' && notaFiscalId) {
          await prisma.notaFiscal.update({
            where: { id: notaFiscalId },
            data: notaData
          });
        } else {
          const nota = await prisma.notaFiscal.create({
            data: {
              projetoId: null,
              empresaFiscalId: empresa.id,
              tipo: 'PRODUTO',
              ...notaData
            }
          });
          notaFiscalId = nota.id;
        }
        if (pedidoId && (resultado.codigoStatus === '100' || resultado.codigoStatus === '104')) {
          await prisma.venda.updateMany({
            where: { id: pedidoId },
            data: { valorFaturado: { increment: dadosPedido.totais.valorNF } }
          });
        }
      } catch (error: any) {
        console.warn('⚠️ Não foi possível salvar/atualizar a NF-e em NotaFiscal:', error.message);
      }

      // Auditoria: emissão concluída (autorizada ou pendente/rejeitada)
      await NFeAuditService.registrarEvento({
        action:
          resultado.codigoStatus === '100' || resultado.codigoStatus === '104'
            ? 'NFE_EMISSAO_AUTORIZADA'
            : 'NFE_EMISSAO_REJEITADA',
        description:
          resultado.codigoStatus === '100' || resultado.codigoStatus === '104'
            ? 'NF-e autorizada pela SEFAZ'
            : 'NF-e emitida mas não autorizada (pendente/rejeitada)',
        notaFiscalId: notaFiscalId,
        chaveAcesso: resultado.chaveAcesso,
        pedidoId,
        empresaFiscalId: empresaId,
        modoEnvio,
        ambiente,
        status: resultado.codigoStatus,
        metadata: {
          mensagem: resultado.mensagem,
          protocolo: resultado.protocolo,
          dataAutorizacao: resultado.dataHoraAutorizacao || resultado.dataAutorizacao
        }
      });

      // Tentar incluir número/serie da nota no retorno (se disponível)
      let numeroRetorno: string | null = null;
      let serieRetorno: string | null = null;
      if (notaFiscalId) {
        try {
          const notaDb = await prisma.notaFiscal.findUnique({
            where: { id: notaFiscalId },
            select: { numero: true, serie: true }
          });
          numeroRetorno = notaDb?.numero ?? null;
          serieRetorno = notaDb?.serie ?? null;
        } catch (fetchErr) {
          console.warn('⚠️ Não foi possível buscar numero/serie da nota para incluir no retorno:', fetchErr);
        }
      }

      return {
        success: true,
        modoEnvio,
        chaveAcesso: resultado.chaveAcesso,
        protocolo: resultado.protocolo,
        dataAutorizacao: resultado.dataHoraAutorizacao || resultado.dataAutorizacao,
        mensagem: resultado.mensagem,
        codigoStatus: resultado.codigoStatus,
        xml: xmlAssinado,
        procNFe: resultado.procNFe || undefined, // XML final (procNFe) se disponível
        notaFiscalId: notaFiscalId || undefined,
        numero: numeroRetorno,
        serie: serieRetorno
      };
    } catch (error: any) {
      console.error('❌ Erro no processo de emissão:', error);

      const msg = String(error.message || '');
      const isPossivelFalhaSefaz = NFeService.isErroComunicacaoSefaz(error);

      // Em caso de falha de comunicação com SEFAZ, entrar em contingência:
      if (isPossivelFalhaSefaz && xmlAssinado) {
        console.warn('⚠️ Falha de comunicação com SEFAZ detectada. Entrando em contingência (fila de envio).');

        try {
          // Criar NotaFiscal em modo contingência offline (sem autorização)
          let notaFiscalId: string | undefined;

          try {
            const ambienteStr = (ambienteSelecionado === '1') ? 'PRODUCAO' : 'HOMOLOGACAO';
            // obter MAX(numero)
            const raw = await prisma.$queryRawUnsafe<{ max: number }[]>(
              // Filtrar apenas valores numéricos em "numero" para evitar CAST em valores UUID/strings inválidas
              'SELECT MAX(CAST(numero AS INTEGER)) as max FROM notas_fiscais WHERE "empresaFiscalId" = $1 AND ambiente = $2 AND numero ~ \'^[0-9]+$\'',
              empresaId,
              ambienteStr
            );
            const maxExisting = (raw && raw[0] && raw[0].max) ? Number(raw[0].max) : 0;
            const empresaRow = await prisma.empresaFiscal.findUnique({ where: { id: empresaId } });
            const ultimoConfigurado = empresaRow?.ultimoNumeroNFe ? Number(empresaRow.ultimoNumeroNFe) : 0;
            const proximoNumero = Math.max(maxExisting, ultimoConfigurado) + 1;

            // upsert para criar ou atualizar se já existir
            const nota = await prisma.notaFiscal.upsert({
              where: {
                empresaFiscalId_numero: {
                  empresaFiscalId: empresaId,
                  numero: String(proximoNumero)
                }
              },
              create: {
                projetoId: null,
                empresaFiscalId: empresaId,
                numero: String(proximoNumero),
                serie: '1',
                ambiente: ambienteStr,
                chaveAcesso: this.extrairChaveAcesso(xmlAssinado) || null,
                tipo: 'PRODUTO',
                natureza: 'Operação em contingência',
                cfop: '5101',
                valorProdutos: 0,
                valorServicos: 0,
                valorTotal: 0,
                dataEmissao: new Date(),
                status: 'ContingenciaOffline',
                xmlNFe: xmlAssinado,
                observacoes: `NF-e emitida em contingência offline. Erro na SEFAZ: ${msg}`
              },
              update: {
                status: 'ContingenciaOffline',
                xmlNFe: xmlAssinado,
                observacoes: `NF-e em contingência atualizada. Erro: ${msg}`,
                updatedAt: new Date()
              }
            });
            notaFiscalId = nota.id;
          } catch (dbError: any) {
            console.warn('⚠️ Não foi possível salvar NotaFiscal em contingência:', dbError.message);
          }

          // Enfileirar para reenvio posterior
          await NFeFilaService.enfileirar({
            notaFiscalId,
            empresaFiscalId: empresaId,
            ambiente: ambienteSelecionado === '1' || ambienteSelecionado === '2' ? ambienteSelecionado : '2',
            modo: 'NORMAL',
            xmlAssinado,
            motivo: msg
          });

          // Auditoria: contingência offline + enfileiramento
          await NFeAuditService.registrarEvento({
            action: 'NFE_CONTINGENCIA_OFFLINE_ENFILEIRADA',
            description: 'NF-e emitida em contingência offline e enfileirada para reenvio',
            notaFiscalId,
            chaveAcesso: this.extrairChaveAcesso(xmlAssinado),
            pedidoId,
            empresaFiscalId: empresaId,
            ambiente: ambienteSelecionado === '1' || ambienteSelecionado === '2' ? ambienteSelecionado : '2',
            status: 'ContingenciaOffline',
            metadata: {
              erroOriginal: msg
            }
          });

          // Registrar evento na tabela nfe_eventos para rastreabilidade do usuário
          try {
            if (notaFiscalId) {
              await prisma.nfeEvento.create({
                data: {
                  notaFiscalId,
                  tipo: 'ERRO',
                  descricao: 'SEFAZ Instável / Tempo de resposta excedido. Nota salva em Contingência',
                  metadata: { erroOriginal: msg }
                }
              });
            }
          } catch (logErr) {
            console.warn('⚠️ Falha ao registrar NFE event após contingência:', logErr);
          }

          // tentar obter número/serie reservado
          let numeroContingencia: string | null = null;
          let serieContingencia: string | null = null;
          if (notaFiscalId) {
            try {
              const notaDb = await prisma.notaFiscal.findUnique({
                where: { id: notaFiscalId },
                select: { numero: true, serie: true }
              });
              numeroContingencia = notaDb?.numero ?? null;
              serieContingencia = notaDb?.serie ?? null;
            } catch (e) {
              console.warn('⚠️ Falha ao obter numero/serie da nota em contingência:', e);
            }
          }

          return {
            success: false,
            contingencia: true,
            mensagem:
              'SEFAZ indisponível. NF-e foi emitida em contingência offline e será reenviada automaticamente quando o serviço voltar.',
            erroOriginal: msg,
            numero: numeroContingencia,
            serie: serieContingencia
          };
        } catch (filaError: any) {
          console.error('❌ Erro ao enfileirar NF-e para contingência:', filaError);
        }
      }

      throw error;
    }
  }

  /**
   * Emissão fracionada: N notas para N clientes a partir de um pedido de venda.
   * Valida saldo a faturar, gera NF-e por fração, cria ContaReceber por cliente e atualiza valorFaturado.
   */
  async processarEmissaoFracionada(
    vendaId: string,
    empresaId: string,
    ambienteSelecionado: '1' | '2',
    cfop: string,
    naturezaOperacao: string,
    serie: string,
    fracoes: Array<{ clienteId: string; valor: number; dataVencimento: string }>
  ): Promise<{ success: boolean; notas: any[]; valorFaturado: number; error?: string }> {
    const venda = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: { orcamento: true }
    });
    if (!venda) throw new Error('Venda não encontrada');
    const valorFaturadoAtual = Number((venda as any).valorFaturado ?? 0);
    const saldoAFaturar = Number(venda.valorTotal) - valorFaturadoAtual;
    const somaFracoes = fracoes.reduce((s, f) => s + f.valor, 0);
    if (somaFracoes <= 0) throw new Error('Informe ao menos uma fração com valor maior que zero');
    if (somaFracoes > saldoAFaturar) throw new Error(`Soma das frações (R$ ${somaFracoes.toFixed(2)}) não pode superar o saldo a faturar (R$ ${saldoAFaturar.toFixed(2)})`);

    const empresa = await prisma.empresaFiscal.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new Error('Empresa fiscal não encontrada');
    if (!empresa.certificadoPath || !empresa.certificadoSenha) throw new Error('Certificado digital não configurado');
    const pfxPathResolvido = resolveCertificadoPath(empresa.certificadoPath);
    if (!pfxPathResolvido || !fs.existsSync(pfxPathResolvido)) throw new Error('Arquivo de certificado não encontrado');
    let senhaDescriptografada: string;
    try {
      senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
    } catch {
      throw new Error('Senha do certificado não pode ser descriptografada');
    }

    const ambienteStr = ambienteSelecionado === '1' ? 'PRODUCAO' : 'HOMOLOGACAO';
    const sufixoBase = ` - Fração Ref. Pedido #${(venda as any).numeroVenda || vendaId.slice(0, 8)}`;
    const resultados: any[] = [];
    let totalFaturado = 0;

    // Apenas frações válidas
    const fracoesValidas = fracoes.filter((f) => f.valor > 0 && f.clienteId && f.dataVencimento);
    if (fracoesValidas.length === 0) throw new Error('Nenhuma fração válida (valor > 0, cliente e vencimento obrigatórios)');

    // Última fração absorve diferença de centavos: soma das frações = exatamente saldo a faturar
    if (fracoesValidas.length > 1) {
      const somaExcetoUltima = fracoesValidas.slice(0, -1).reduce((s, f) => s + f.valor, 0);
      fracoesValidas[fracoesValidas.length - 1].valor = Math.round((saldoAFaturar - somaExcetoUltima) * 100) / 100;
      if (fracoesValidas[fracoesValidas.length - 1].valor <= 0) throw new Error('Ajuste de centavos gerou valor inválido na última fração');
    }

    for (const frac of fracoesValidas) {

      const raw = await prisma.$queryRawUnsafe<{ max: number }[]>(
        'SELECT MAX(CAST(numero AS INTEGER)) as max FROM notas_fiscais WHERE "empresaFiscalId" = $1 AND ambiente = $2 AND numero ~ \'^[0-9]+$\'',
        empresaId,
        ambienteStr
      );
      const maxExisting = (raw?.[0]?.max) ? Number(raw[0].max) : 0;
      const ultimoConfig = (empresa as any).ultimoNumeroNFe ? Number((empresa as any).ultimoNumeroNFe) : 0;
      const proximoNumero = Math.max(maxExisting, ultimoConfig) + 1;

      const dadosPedido = await this.buscarDadosVendaParaNFeComFracao(vendaId, empresaId, {
        clienteId: frac.clienteId,
        valorTotalFracao: frac.valor,
        sufixoDescricao: sufixoBase,
        cfop,
        naturezaOperacao,
        serie,
        numero: proximoNumero
      });
      dadosPedido.ambiente = ambienteSelecionado;

      const xmlNFe = this.generateNFeXML(dadosPedido, 'NORMAL');
      
      // Validação estrutura básica antes da assinatura
      const validacaoEstrutura = NFeXMLValidatorService.validarEstruturaBasica(xmlNFe);
      if (!validacaoEstrutura.valido) throw new Error(`Validação estrutura XML: ${validacaoEstrutura.erros.join(' | ')}`);

      const xmlAssinado = await this.signXML(xmlNFe, pfxPathResolvido, senhaDescriptografada);
      
      // Validação completa após assinatura
      const resultadoValidacao = NFeXMLValidatorService.validarCompleto(xmlAssinado);
      if (!resultadoValidacao.valido) throw new Error(`Validação XML completa: ${resultadoValidacao.erros.join(' | ')}`);
      const ambiente: '1' | '2' = ambienteSelecionado;
      let resultado: any;
      try {
        resultado = await this.emitirNFe(xmlAssinado, pfxPathResolvido, senhaDescriptografada, ambiente, 'NORMAL');
      } catch (envioErr: any) {
        throw new Error(`Falha ao enviar NF-e fracção (cliente ${frac.clienteId}): ${envioErr.message}`);
      }

      const codigoOk = resultado.codigoStatus === '100' || resultado.codigoStatus === '104';
      const notaFiscal = await prisma.notaFiscal.create({
        data: {
          vendaId,
          projetoId: null,
          empresaFiscalId: empresaId,
          numero: String(proximoNumero),
          serie: serie || '1',
          ambiente: ambienteStr,
          chaveAcesso: resultado.chaveAcesso || null,
          tipo: 'PRODUTO',
          natureza: naturezaOperacao,
          cfop: cfop || '5101',
          valorProdutos: dadosPedido.totais.valorProdutos,
          valorServicos: 0,
          valorTotal: dadosPedido.totais.valorNF,
          dataEmissao: new Date(),
          status: codigoOk ? 'Autorizada' : 'Pendente',
          xmlNFe: resultado.procNFe || xmlAssinado,
          observacoes: resultado.mensagem
        }
      });

      const dataVenc = frac.dataVencimento.trim().includes('T') ? frac.dataVencimento : `${frac.dataVencimento.trim().slice(0, 10)}T12:00:00.000Z`;
      await prisma.contaReceber.create({
        data: {
          vendaId,
          clienteId: frac.clienteId,
          notaFiscalId: notaFiscal.id,
          descricao: `NF-e Fracção Ref. Pedido #${(venda as any).numeroVenda || vendaId.slice(0, 8)} - R$ ${frac.valor.toFixed(2)}`,
          valorParcela: frac.valor,
          dataVencimento: new Date(dataVenc),
          status: 'Pendente'
        }
      });

      totalFaturado += frac.valor;
      resultados.push({ clienteId: frac.clienteId, valor: frac.valor, notaFiscalId: notaFiscal.id, numero: String(proximoNumero), status: codigoOk ? 'Autorizada' : 'Pendente' });
    }

    await prisma.venda.update({
      where: { id: vendaId },
      data: { valorFaturado: { increment: totalFaturado }, updatedAt: new Date() }
    });

    return { success: true, notas: resultados, valorFaturado: valorFaturadoAtual + totalFaturado };
  }

  /**
   * Gera apenas o XML da NF-e para pré-visualização (sem assinar / enviar para SEFAZ)
   * Útil para testes de layout de XML antes da emissão real.
   */
  async gerarXmlPreview(
    pedidoId: string,
    empresaId: string,
    ambienteSelecionado?: '1' | '2',
    cfop?: string,
    naturezaOperacao?: string,
    serie?: string
  ): Promise<{
    ambiente: '1' | '2';
    xml: string;
    dados: DadosNFe;
    validacao: {
      valido: boolean;
      erros: string[];
      avisos: string[];
    };
    empresa: {
      id: string;
      razaoSocial: string;
      cnpj: string;
    };
  }> {
    console.log(`\n👀 Gerando XML de pré-visualização para pedido: ${pedidoId}`);

    // 1. Garantir que a empresa existe (mas sem exigir certificado para preview)
    const empresa = await prisma.empresaFiscal.findUnique({
      where: { id: empresaId }
    });

    if (!empresa) {
      throw new Error('Empresa fiscal não encontrada');
    }

    // 2. Buscar dados reais da venda do banco de dados
    const cfopFinal = cfop || '5101'; // CFOP padrão se não fornecido
    const naturezaFinal = naturezaOperacao || 'Venda de Mercadoria'; // Natureza padrão
    const serieFinal = serie || '1'; // Série padrão
    
    const dadosPedido = await this.buscarDadosVendaParaNFe(
      pedidoId,
      empresaId,
      cfopFinal,
      naturezaFinal,
      serieFinal
    );

    // 3. Definir ambiente (mesma regra da emissão)
    const ambiente: '1' | '2' =
      ambienteSelecionado === '1' || ambienteSelecionado === '2'
        ? ambienteSelecionado
        : '2';

    dadosPedido.ambiente = ambiente;

    // 4. Gerar XML da NF-e (sem assinar) — com quebras de linha/indentação apenas para leitura na tela.
    // Na emissão, signXML() normaliza (colapsa >\s+<) antes de assinar; o enviado à SEFAZ é compacto.
    console.log('📄 Gerando XML da NF-e para preview...');
    const xmlNFe = this.generateNFeXML(dadosPedido);

    // 5. Validar XML (estrutura/campos básicos) para já mostrar problemas na pré-visualização
    // Nota: não usa validação XSD completa pois o XML ainda não tem assinatura digital
    const resultadoValidacao = NFeXMLValidatorService.validarEstruturaBasica(xmlNFe);

    return {
      ambiente,
      xml: xmlNFe,
      dados: dadosPedido,
      validacao: {
        valido: resultadoValidacao.valido,
        erros: resultadoValidacao.erros,
        avisos: [] // Preview só usa validação estrutural básica (sem XSD)
      },
      empresa: {
        id: empresa.id,
        razaoSocial: (empresa as any).razaoSocial || empresa.nomeFantasia || '',
        cnpj: (empresa as any).cnpj || ''
      }
    };
  }
}

export default new NFeService();

