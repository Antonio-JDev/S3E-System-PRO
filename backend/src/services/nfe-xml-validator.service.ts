import * as fs from 'fs';
import * as path from 'path';
import { DOMParser } from '@xmldom/xmldom';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const libxmljs = require('libxmljs2');

/**
 * Serviço de Validação XML para NF-e
 * Valida XML contra os schemas XSD fornecidos na PL_010b_NT2025_002_v1.30
 */
export class NFeXMLValidatorService {
  private static xsdPath = path.join(__dirname, '../../..', 'PL_010b_NT2025_002_v1.30');
  private static xsdCache: { schemaDoc: any | null } = {
    schemaDoc: null
  };

  /**
   * Valida XML contra o XSD oficial (NT 2025.002 v1.30)
   */
  static validarContraXSD(xml: string): {
    valido: boolean;
    erros: string[];
  } {
    const erros: string[] = [];

    try {
      // Verificar se os XSDs existem
      const xsdStatus = this.verificarXSDsDisponiveis();
      if (!xsdStatus.disponiveis) {
        erros.push(
          `Arquivos XSD não encontrados: ${xsdStatus.faltando.join(
            ', '
          )}. Validação XSD completa não disponível.`
        );
        return {
          valido: false,
          erros
        };
      }

      // Carregar/usar cache do schema principal
      if (!this.xsdCache.schemaDoc) {
        const xsdPrincipalPath = path.join(this.xsdPath, 'nfe_v4.00.xsd');
        const xsdContent = fs.readFileSync(xsdPrincipalPath, 'utf-8');
        this.xsdCache.schemaDoc = libxmljs.parseXml(xsdContent);
      }

      const xmlDoc = libxmljs.parseXml(xml);

      const valido = xmlDoc.validate(this.xsdCache.schemaDoc);

      if (!valido) {
        const validationErrors = xmlDoc.validationErrors || [];
        for (const err of validationErrors) {
          const message = (err.message || '').trim();
          const line = err.line != null ? `linha ${err.line}` : '';
          const col = err.column != null ? `coluna ${err.column}` : '';
          const pos = [line, col].filter(Boolean).join(', ');
          erros.push(pos ? `${message} (${pos})` : message);
        }
      }

      return {
        valido,
        erros
      };
    } catch (error: any) {
      return {
        valido: false,
        erros: [`Erro ao validar XML contra XSD: ${error.message}`]
      };
    }
  }

  /**
   * Valida estrutura básica do XML da NF-e
   * Nota: Validação completa contra XSD requer biblioteca especializada (libxmljs, xmllint, etc)
   */
  static validarEstruturaBasica(xml: string): {
    valido: boolean;
    erros: string[];
  } {
    const erros: string[] = [];

    try {
      // Parse do XML
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      // Verificar erros de parsing
      const parserErrors = doc.getElementsByTagName('parsererror');
      if (parserErrors.length > 0) {
        erros.push('XML malformado ou inválido');
        return { valido: false, erros };
      }

      // Verificar elemento raiz
      const nfe = doc.getElementsByTagName('NFe');
      if (nfe.length === 0) {
        erros.push('Elemento raiz <NFe> não encontrado');
      }

      // Verificar namespace
      const nfeElement = nfe[0] as Element;
      if (nfeElement && nfeElement.getAttribute('xmlns') !== 'http://www.portalfiscal.inf.br/nfe') {
        erros.push('Namespace incorreto. Esperado: http://www.portalfiscal.inf.br/nfe');
      }

      // Verificar infNFe
      const infNFe = doc.getElementsByTagName('infNFe');
      if (infNFe.length === 0) {
        erros.push('Elemento <infNFe> não encontrado');
      } else {
        const infNFeElement = infNFe[0] as Element;
        const versao = infNFeElement.getAttribute('versao');
        if (versao !== '4.00') {
          erros.push(`Versão incorreta. Esperado: 4.00, encontrado: ${versao}`);
        }
      }

      // Verificar elementos obrigatórios
      const elementosObrigatorios = [
        'ide',
        'emit',
        'dest',
        'total',
        'transp',
        'pag'
      ];

      for (const elemento of elementosObrigatorios) {
        const elementos = doc.getElementsByTagName(elemento);
        if (elementos.length === 0) {
          erros.push(`Elemento obrigatório <${elemento}> não encontrado`);
        }
      }

      // Verificar se há itens (det)
      const itens = doc.getElementsByTagName('det');
      if (itens.length === 0) {
        erros.push('Nenhum item (det) encontrado na NF-e');
      }

      return {
        valido: erros.length === 0,
        erros
      };
    } catch (error: any) {
      return {
        valido: false,
        erros: [`Erro ao validar XML: ${error.message}`]
      };
    }
  }

  /**
   * Verifica se os arquivos XSD estão disponíveis
   */
  static verificarXSDsDisponiveis(): {
    disponiveis: boolean;
    arquivos: string[];
    faltando: string[];
  } {
    const arquivosEsperados = [
      'nfe_v4.00.xsd',
      'leiauteNFe_v4.00.xsd',
      'tiposBasico_v4.00.xsd',
      'DFeTiposBasicos_v1.00.xsd',
      'xmldsig-core-schema_v1.01.xsd'
    ];

    const arquivosEncontrados: string[] = [];
    const arquivosFaltando: string[] = [];

    for (const arquivo of arquivosEsperados) {
      const caminhoCompleto = path.join(this.xsdPath, arquivo);
      if (fs.existsSync(caminhoCompleto)) {
        arquivosEncontrados.push(arquivo);
      } else {
        arquivosFaltando.push(arquivo);
      }
    }

    return {
      disponiveis: arquivosFaltando.length === 0,
      arquivos: arquivosEncontrados,
      faltando: arquivosFaltando
    };
  }

  /**
   * Valida campos obrigatórios do emitente
   */
  static validarEmitente(xml: string): {
    valido: boolean;
    erros: string[];
  } {
    const erros: string[] = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      const emit = doc.getElementsByTagName('emit')[0] as Element;
      if (!emit) {
        erros.push('Elemento <emit> não encontrado');
        return { valido: false, erros };
      }

      // Campos obrigatórios do emitente
      const camposObrigatorios = {
        'CNPJ': 'CNPJ do emitente',
        'xNome': 'Razão Social',
        'enderEmit': 'Endereço do emitente',
        'IE': 'Inscrição Estadual'
      };

      for (const [tag, descricao] of Object.entries(camposObrigatorios)) {
        const elemento = emit.getElementsByTagName(tag)[0];
        if (!elemento || !elemento.textContent?.trim()) {
          erros.push(`${descricao} (${tag}) é obrigatório`);
        }
      }

      // Validar CNPJ (deve ter 14 dígitos)
      const cnpj = emit.getElementsByTagName('CNPJ')[0]?.textContent?.replace(/\D/g, '');
      if (cnpj && cnpj.length !== 14) {
        erros.push('CNPJ do emitente deve ter 14 dígitos');
      }

      return {
        valido: erros.length === 0,
        erros
      };
    } catch (error: any) {
      return {
        valido: false,
        erros: [`Erro ao validar emitente: ${error.message}`]
      };
    }
  }

  /**
   * Valida campos obrigatórios do destinatário
   */
  static validarDestinatario(xml: string): {
    valido: boolean;
    erros: string[];
  } {
    const erros: string[] = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      const dest = doc.getElementsByTagName('dest')[0] as Element;
      if (!dest) {
        erros.push('Elemento <dest> não encontrado');
        return { valido: false, erros };
      }

      // CNPJ ou CPF é obrigatório
      const cnpj = dest.getElementsByTagName('CNPJ')[0]?.textContent;
      const cpf = dest.getElementsByTagName('CPF')[0]?.textContent;

      if (!cnpj && !cpf) {
        erros.push('CNPJ ou CPF do destinatário é obrigatório');
      }

      // Validar formato
      if (cnpj) {
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
          erros.push('CNPJ do destinatário deve ter 14 dígitos');
        }
      }

      if (cpf) {
        const cpfLimpo = cpf.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
          erros.push('CPF do destinatário deve ter 11 dígitos');
        }
      }

      // Razão Social é obrigatória
      const xNome = dest.getElementsByTagName('xNome')[0]?.textContent?.trim();
      if (!xNome) {
        erros.push('Razão Social do destinatário é obrigatória');
      }

      return {
        valido: erros.length === 0,
        erros
      };
    } catch (error: any) {
      return {
        valido: false,
        erros: [`Erro ao validar destinatário: ${error.message}`]
      };
    }
  }

  /**
   * Validação completa do XML (estrutura + emitente + destinatário)
   */
  static validarCompleto(xml: string): {
    valido: boolean;
    erros: string[];
    avisos: string[];
  } {
    const erros: string[] = [];
    const avisos: string[] = [];

    // 1) Validar estrutura básica
    const estrutura = this.validarEstruturaBasica(xml);
    erros.push(...estrutura.erros);

    // 2) Validar emitente
    const emitente = this.validarEmitente(xml);
    erros.push(...emitente.erros);

    // 3) Validar destinatário
    const destinatario = this.validarDestinatario(xml);
    erros.push(...destinatario.erros);

    // 4) Validar contra XSD, se possível
    const resultadoXSD = this.validarContraXSD(xml);
    if (!resultadoXSD.valido && resultadoXSD.erros.length > 0) {
      // Se não for possível validar XSD por falta de arquivos, tratamos como aviso
      const apenasAvisoPorFaltaXsd =
        resultadoXSD.erros.length === 1 &&
        resultadoXSD.erros[0].includes('Validação XSD completa não disponível');

      if (apenasAvisoPorFaltaXsd) {
        avisos.push(resultadoXSD.erros[0]);
      } else {
        erros.push(...resultadoXSD.erros);
      }
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos
    };
  }
}

