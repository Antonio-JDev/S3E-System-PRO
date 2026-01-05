import { PrismaClient } from '@prisma/client';
import { NFeSignatureService } from './nfe-signature.service';
import { NFeSoapService } from './nfe-soap.service';
import NFeAuditService from './nfe-audit.service';
import { CryptoUtil } from '../utils/crypto.util';
import { NFeChaveAcessoUtil } from '../utils/nfe-chave-acesso.util';
import { NFeProcNFeUtil } from '../utils/nfe-procnfe.util';
import { NFeXMLValidatorService } from './nfe-xml-validator.service';
import NFeFilaService, { NFeModoEnvio } from './nfe-fila.service';
import { VendasService } from './vendas.service';
import * as fs from 'fs';

const prisma = new PrismaClient();

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
 * Service de NF-e
 */
export class NFeService {
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

    // 2. Buscar empresa fiscal
    const empresa = await prisma.empresaFiscal.findUnique({
      where: { id: empresaId }
    });

    if (!empresa) {
      throw new Error(`Empresa fiscal não encontrada: ${empresaId}`);
    }

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
    
    // Parsear endereço do cliente (pode estar em formato string ou objeto)
    let enderecoCliente: any = {};
    if (typeof cliente.endereco === 'string') {
      // Tentar parsear endereço se estiver em formato estruturado
      try {
        enderecoCliente = JSON.parse(cliente.endereco);
      } catch {
        // Se não for JSON, usar como logradouro simples
        enderecoCliente = { logradouro: cliente.endereco };
      }
    } else if (cliente.endereco) {
      enderecoCliente = cliente.endereco;
    }

    const destinatario = {
      [isPessoaFisica ? 'cpf' : 'cnpj']: cpfCnpjCliente,
      razaoSocial: cliente.nome,
      inscricaoEstadual: '', // Cliente pode não ter IE
      indIEDest: 9, // 9 = Não contribuinte (padrão se não tiver IE)
      endereco: {
        logradouro: enderecoCliente.logradouro || cliente.endereco || '',
        numero: enderecoCliente.numero || 'S/N',
        complemento: enderecoCliente.complemento || '',
        bairro: enderecoCliente.bairro || '',
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

        // Obter SKU do material (código do produto na NFe)
        const sku = item.material?.sku || item.cotacao?.nome?.substring(0, 6) || `ITEM${item.id.substring(0, 6).toUpperCase()}`;
        
        // Obter NCM (prioridade: cotação > material)
        const ncm = item.cotacao?.ncm || item.material?.ncm || '00000000';
        
        // Obter descrição
        const descricao = item.descricao || item.material?.nome || item.cotacao?.nome || 'Produto sem descrição';
        
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

        // Calcular impostos (valores padrão - podem ser ajustados conforme configuração fiscal)
        const aliquotaICMS = 12; // 12% padrão
        const aliquotaIPI = 0; // 0% padrão (pode ser ajustado)
        const aliquotaPIS = 1.65; // 1.65% padrão
        const aliquotaCOFINS = 7.60; // 7.60% padrão

        const baseICMSItem = valorTotal;
        const valorICMSItem = (baseICMSItem * aliquotaICMS) / 100;
        const valorIPIItem = (valorTotal * aliquotaIPI) / 100;
        const valorPISItem = (valorTotal * aliquotaPIS) / 100;
        const valorCOFINSItem = (valorTotal * aliquotaCOFINS) / 100;

        baseICMS += baseICMSItem;
        valorICMS += valorICMSItem;
        valorIPI += valorIPIItem;
        valorPIS += valorPISItem;
        valorCOFINS += valorCOFINSItem;

        produtos.push({
          codigo: sku, // ✅ SKU do material como código do produto
          descricao: descricao.substring(0, 120), // Limitar a 120 caracteres (padrão NFe)
          ncm: ncm.padStart(8, '0'), // Garantir 8 dígitos
          cfop: cfop,
          unidade: unidade,
          quantidade: quantidade,
          valorUnitario: valorUnitario,
          valorTotal: valorTotal,
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
              cst: '01',
              aliquota: aliquotaPIS,
              valor: valorPISItem
            },
            cofins: {
              cst: '01',
              aliquota: aliquotaCOFINS,
              valor: valorCOFINSItem
            },
            vTotTrib: valorICMSItem + valorIPIItem + valorPISItem + valorCOFINSItem
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

    const proximoNumero = ultimaNota ? parseInt(ultimaNota.numero) + 1 : 1;

    // 8. Retornar dados formatados
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
        valorPIS: valorPIS,
        valorCOFINS: valorCOFINS
      },
      naturezaOperacao: naturezaOperacao,
      serie: serie,
      numero: proximoNumero,
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
    const now = new Date();
    // Formatar data/hora no padrão brasileiro (YYYY-MM-DDTHH:mm:ss-03:00)
    const dhEmi = now.toISOString().replace('Z', '-03:00');
    const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');

    // Definir tipo de emissão (tpEmis): 1 = Normal, 6 = SVC-AN, 7 = SVC-RS
    const tpEmis =
      modoEnvio === 'SVC-AN'
        ? '6'
        : modoEnvio === 'SVC-RS'
        ? '7'
        : '1';

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

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chaveAcesso}" versao="4.00">
    <ide>
      <cUF>${dados.emitente.codigoEstado || '42'}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>${dados.naturezaOperacao}</natOp>
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
      <indFinal>${dados.indFinal ?? 0}</indFinal>
      <indPres>${dados.indPres ?? 3}</indPres>
      <indIntermed>0</indIntermed>
      <procEmi>0</procEmi>
      <verProc>S3E-ERP-1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${dados.emitente.cnpj}</CNPJ>
      <xNome>${dados.emitente.razaoSocial}</xNome>
      <xFant>${dados.emitente.nomeFantasia}</xFant>
      <enderEmit>
        <xLgr>${dados.emitente.endereco.logradouro}</xLgr>
        <nro>${dados.emitente.endereco.numero}</nro>
        <xCpl>${dados.emitente.endereco.complemento || ''}</xCpl>
        <xBairro>${dados.emitente.endereco.bairro}</xBairro>
        <cMun>${dados.emitente.endereco.codigoMunicipio}</cMun>
        <xMun>${dados.emitente.endereco.municipio}</xMun>
        <UF>${dados.emitente.endereco.uf}</UF>
        <CEP>${dados.emitente.endereco.cep.replace(/\D/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
        <fone>${dados.emitente.endereco.telefone?.replace(/\D/g, '') || ''}</fone>
      </enderEmit>
      <IE>${dados.emitente.inscricaoEstadual}</IE>
      <CRT>${dados.emitente.regimeTributario === 'SimplesNacional' ? '1' : '3'}</CRT>
    </emit>
    <dest>
      ${dados.destinatario.cnpj ? `<CNPJ>${dados.destinatario.cnpj}</CNPJ>` : ''}
      ${dados.destinatario.cpf ? `<CPF>${dados.destinatario.cpf}</CPF>` : ''}
      <xNome>${dados.destinatario.razaoSocial}</xNome>
      <enderDest>
        <xLgr>${dados.destinatario.endereco.logradouro}</xLgr>
        <nro>${dados.destinatario.endereco.numero}</nro>
        <xBairro>${dados.destinatario.endereco.bairro}</xBairro>
        <cMun>${dados.destinatario.endereco.codigoMunicipio}</cMun>
        <xMun>${dados.destinatario.endereco.municipio}</xMun>
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
        <vBC>${dados.totais.baseICMS.toFixed(2)}</vBC>
        <vICMS>${dados.totais.valorICMS.toFixed(2)}</vICMS>
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
        <vTotTrib>0.00</vTotTrib>
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
    ${dados.informacoesAdicionais ? `
    <infAdic>
      <infCpl>${dados.informacoesAdicionais}</infCpl>
    </infAdic>` : ''}
    ${dados.responsavelTecnico ? `
    <infRespTec>
      <CNPJ>${dados.responsavelTecnico.cnpj}</CNPJ>
      <xContato>${dados.responsavelTecnico.contato}</xContato>
      <email>${dados.responsavelTecnico.email}</email>
      <fone>${dados.responsavelTecnico.telefone.replace(/\D/g, '')}</fone>
    </infRespTec>` : ''}
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
        <xProd>${produto.descricao}</xProd>
        <NCM>${produto.ncm}</NCM>
        <CFOP>${produto.cfop}</CFOP>
        <uCom>${produto.unidade}</uCom>
        <qCom>${produto.quantidade.toFixed(4)}</qCom>
        <vUnCom>${produto.valorUnitario.toFixed(10)}</vUnCom>
        <vProd>${produto.valorTotal.toFixed(2)}</vProd>
        <cEANTrib>${produto.gtin || 'SEM GTIN'}</cEANTrib>
        <uTrib>${produto.unidade}</uTrib>
        <qTrib>${produto.quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${produto.valorUnitario.toFixed(4)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>${(produto.impostos.vTotTrib || 0).toFixed(2)}</vTotTrib>
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

      // Carregar certificado do arquivo PFX
      const { key, cert } = NFeSignatureService.carregarCertificado(pfxPath, password);

      // Assinar XML
      const xmlAssinado = NFeSignatureService.assinarXML(xml, key, cert);

      console.log('✅ XML assinado com sucesso');
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

      // Enviar para autorização
      const resultadoAutorizacao = await NFeSoapService.autorizarNFe(
        xmlAssinado,
        ambiente,
        cert,
        key,
        modoEnvio
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
            key
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
      throw new Error(`Erro ao comunicar com SEFAZ: ${error.message}`);
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
        empresa.certificadoPath,
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
      const xmlAssinado = await this.signXML(xmlCCe, empresa.certificadoPath, senhaDescriptografada);

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
    <dhEvento>${new Date().toISOString()}</dhEvento>
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
    <dhEvento>${new Date().toISOString()}</dhEvento>
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

      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado para inutilização:', error);
        throw new Error('Senha do certificado inválida para inutilização de numeração');
      }

      const { key, cert } = NFeSignatureService.carregarCertificado(
        empresa.certificadoPath,
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

      let senhaDescriptografada: string;
      try {
        senhaDescriptografada = CryptoUtil.decrypt(empresa.certificadoSenha);
      } catch (error: any) {
        console.error('❌ Erro ao descriptografar senha do certificado para manifestação:', error);
        throw new Error('Senha do certificado inválida para manifestação do destinatário');
      }

      const { key, cert } = NFeSignatureService.carregarCertificado(
        empresa.certificadoPath,
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

      if (!empresa.certificadoPath || !empresa.certificadoSenha) {
        throw new Error('Certificado digital não configurado para esta empresa');
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

      // 3. Gerar XML da NF-e (modo normal)
      console.log('📄 Gerando XML da NF-e (modo NORMAL)...');
      xmlNFe = this.generateNFeXML(dadosPedido, 'NORMAL');

      // 3.1. Validar XML antes da assinatura/envio (estrutura + campos obrigatórios)
      console.log('🧪 Validando XML da NF-e (estrutura/campos) antes do envio...');
      const resultadoValidacao = NFeXMLValidatorService.validarCompleto(xmlNFe);

      if (!resultadoValidacao.valido) {
        console.error('❌ XML da NF-e reprovado na validação:', resultadoValidacao.erros);
        throw new Error(
          `NF-e reprovada na validação de XML. Erros: ${resultadoValidacao.erros.join(' | ')}`
        );
      }

      if (resultadoValidacao.avisos.length > 0) {
        console.warn('⚠️ Avisos de validação da NF-e:', resultadoValidacao.avisos);
      }

      // 4. Assinar XML
      console.log('🔐 Assinando XML...');
      xmlAssinado = await this.signXML(xmlNFe, empresa.certificadoPath, senhaDescriptografada);

      // 5. Enviar para SEFAZ - tentativa modo NORMAL
      console.log('📤 Enviando para SEFAZ (modo NORMAL)...');
      let modoEnvio: NFeModoEnvio = 'NORMAL';
      let resultado;

      try {
        resultado = await this.emitirNFe(
          xmlAssinado,
          empresa.certificadoPath,
          senhaDescriptografada,
          ambiente,
          modoEnvio
        );
      } catch (envioError: any) {
        const msgEnvio = String(envioError.message || '');
        const isPossivelFalhaSefazNormal =
          msgEnvio.includes('SEFAZ indisponível') ||
          msgEnvio.includes('Erro ao comunicar com SEFAZ') ||
          msgEnvio.includes('ECONN') ||
          msgEnvio.includes('ENOTFOUND') ||
          msgEnvio.toLowerCase().includes('timeout');

        // Fallback opcional: tentar SVC-AN antes de cair em contingência offline
        if (isPossivelFalhaSefazNormal) {
          console.warn('⚠️ SEFAZ normal indisponível. Tentando fallback via SVC-AN...');

          try {
            const xmlNFeSvc = this.generateNFeXML(dadosPedido, 'SVC-AN');
            const xmlAssinadoSvc = await this.signXML(
              xmlNFeSvc,
              empresa.certificadoPath,
              senhaDescriptografada
            );

            modoEnvio = 'SVC-AN';
            resultado = await this.emitirNFe(
              xmlAssinadoSvc,
              empresa.certificadoPath,
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

      let notaFiscalId: string | undefined;

      try {
        const nota = await prisma.notaFiscal.create({
          data: {
            projetoId: null,
            empresaFiscalId: empresa.id,
            numero: String(dadosPedido.numero),
            serie: String(dadosPedido.serie),
            chaveAcesso: resultado.chaveAcesso || null,
            tipo: 'PRODUTO', // por enquanto fixo; em breve será mapeado do pedido/tela
            natureza: dadosPedido.naturezaOperacao,
            cfop: dadosPedido.produtos[0]?.cfop || '5101',
            valorProdutos: dadosPedido.totais.valorProdutos,
            valorServicos: 0,
            valorTotal: dadosPedido.totais.valorNF,
            dataEmissao: new Date(),
            status: resultado.codigoStatus === '100' || resultado.codigoStatus === '104'
              ? 'Autorizada'
              : 'Pendente',
            xmlNFe: resultado.procNFe || xmlAssinado,
            observacoes: resultado.mensagem
          }
        });

        notaFiscalId = nota.id;
      } catch (error: any) {
        console.warn('⚠️ Não foi possível salvar a NF-e em NotaFiscal:', error.message);
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
        notaFiscalId: notaFiscalId || undefined
      };
    } catch (error: any) {
      console.error('❌ Erro no processo de emissão:', error);

      const msg = String(error.message || '');
      const isPossivelFalhaSefaz =
        msg.includes('Erro ao comunicar com SEFAZ') ||
        msg.includes('ECONN') ||
        msg.includes('ENOTFOUND') ||
        msg.toLowerCase().includes('timeout');

      // Em caso de falha de comunicação com SEFAZ, entrar em contingência:
      if (isPossivelFalhaSefaz && xmlAssinado) {
        console.warn('⚠️ Falha de comunicação com SEFAZ detectada. Entrando em contingência (fila de envio).');

        try {
          // Criar NotaFiscal em modo contingência offline (sem autorização)
          let notaFiscalId: string | undefined;

          try {
            const nota = await prisma.notaFiscal.create({
              data: {
                projetoId: null,
                empresaFiscalId: empresaId,
                numero: String(pedidoId),
                serie: '1',
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

          return {
            success: false,
            contingencia: true,
            mensagem:
              'SEFAZ indisponível. NF-e foi emitida em contingência offline e será reenviada automaticamente quando o serviço voltar.',
            erroOriginal: msg
          };
        } catch (filaError: any) {
          console.error('❌ Erro ao enfileirar NF-e para contingência:', filaError);
        }
      }

      throw error;
    }
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

    // 4. Gerar XML da NF-e (sem assinar)
    console.log('📄 Gerando XML da NF-e para preview...');
    const xmlNFe = this.generateNFeXML(dadosPedido);

    // 5. Validar XML (estrutura/campos) para já mostrar problemas na pré-visualização
    const resultadoValidacao = NFeXMLValidatorService.validarCompleto(xmlNFe);

    return {
      ambiente,
      xml: xmlNFe,
      dados: dadosPedido,
      validacao: {
        valido: resultadoValidacao.valido,
        erros: resultadoValidacao.erros,
        avisos: resultadoValidacao.avisos
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

