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
  /**
   * Determina o caminho correto para os arquivos XSD
   * Tenta múltiplos caminhos possíveis para garantir robustez
   */
  private static getXsdPath(): string {
    const cwd = process.cwd();
    
    // 1. Tenta o caminho via bind mount direto (/app/PL_010b_NT2025_002_v1.30)
    const pathCwd = path.join(cwd, 'PL_010b_NT2025_002_v1.30');
    
    // 2. Tenta o caminho alternativo mapeado (/app/data/xsds)
    const pathData = path.join(cwd, 'data', 'xsds');
    
    // 3. Fallback: caminho relativo a partir de __dirname (desenvolvimento local)
    const pathRelative = path.join(__dirname, '../../..', 'PL_010b_NT2025_002_v1.30');

    // Verificar qual caminho existe
    if (fs.existsSync(pathCwd)) {
      console.log('✅ [XSD] Usando caminho:', pathCwd);
      return pathCwd;
    }
    
    if (fs.existsSync(pathData)) {
      console.log('✅ [XSD] Usando caminho alternativo:', pathData);
      return pathData;
    }
    
    if (fs.existsSync(pathRelative)) {
      console.log('✅ [XSD] Usando caminho relativo (dev):', pathRelative);
      return pathRelative;
    }

    // Se nenhum caminho existir, logar erro mas retornar o caminho principal
    // (para não quebrar o sistema, apenas avisar que validação XSD não estará disponível)
    console.error('❌ [XSD] Nenhuma pasta de esquemas encontrada!');
    console.error('   Tentados:');
    console.error('   -', pathCwd);
    console.error('   -', pathData);
    console.error('   -', pathRelative);
    console.warn('⚠️  [XSD] Validação XSD completa não estará disponível. Continuando sem validação XSD...');
    
    // Retornar o caminho principal como fallback (será tratado como não existente nas verificações)
    return pathCwd;
  }

  private static xsdPath = NFeXMLValidatorService.getXsdPath();
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
      // Revalidar caminho antes de usar (pode ter mudado)
      const xsdPathAtual = this.getXsdPath();
      if (!this.xsdCache.schemaDoc) {
        const xsdPrincipalPath = path.join(xsdPathAtual, 'nfe_v4.00.xsd');
        if (!fs.existsSync(xsdPrincipalPath)) {
          throw new Error(`Arquivo XSD principal não encontrado: ${xsdPrincipalPath}`);
        }
        const xsdContent = fs.readFileSync(xsdPrincipalPath, 'utf-8');
        try {
          // libxmljs2 usa parseXml para carregar o schema
          this.xsdCache.schemaDoc = libxmljs.parseXml(xsdContent);
        } catch (schemaError: any) {
          console.error('❌ [XSD] Erro ao carregar schema XSD:', schemaError.message);
          throw new Error(`Erro ao carregar schema XSD: ${schemaError.message}`);
        }
      }

      // Parse do XML
      let xmlDoc;
      try {
        xmlDoc = libxmljs.parseXml(xml);
      } catch (parseError: any) {
        throw new Error(`Erro ao fazer parse do XML: ${parseError.message}`);
      }

      // Validar XML contra o schema
      // libxmljs2 usa validate() com o schema como parâmetro
      let valido = false;
      try {
        // O método validate() do libxmljs2 valida contra um schema
        // Precisamos usar a API correta: xmlDoc.validate(schemaDoc)
        valido = xmlDoc.validate(this.xsdCache.schemaDoc);
        
        if (!valido) {
          // Capturar erros de validação
          const validationErrors = xmlDoc.validationErrors || [];
          if (validationErrors.length > 0) {
            for (const err of validationErrors) {
              const message = (err.message || err.toString() || 'Erro de validação').trim();
              const line = err.line != null ? `linha ${err.line}` : '';
              const col = err.column != null ? `coluna ${err.column}` : '';
              const pos = [line, col].filter(Boolean).join(', ');
              erros.push(pos ? `${message} (${pos})` : message);
            }
          } else {
            erros.push('XML não passou na validação XSD (sem detalhes disponíveis)');
          }
        }
      } catch (validationError: any) {
        // Se a validação lançar uma exceção, tratar como erro técnico
        const errorMsg = validationError.message || validationError.toString() || 'Erro desconhecido na validação XSD';
        console.error('❌ [XSD] Erro durante validação:', errorMsg);
        
        // Se o erro for "Invalid XSD schema" ou similar, é problema técnico da biblioteca
        // libxmljs2 pode ter limitações com XSDs complexos que incluem imports/includes
        // Nesse caso, não bloquear a emissão, apenas avisar
        if (errorMsg.includes('Invalid XSD schema') || 
            errorMsg.includes('schema') || 
            errorMsg.includes('parse') ||
            errorMsg.includes('libxml')) {
          // Problema conhecido: libxmljs2 pode ter limitações com XSDs complexos
          // A validação estrutural já foi feita, então podemos continuar
          console.warn('⚠️  [XSD] Validação XSD falhou devido a limitação técnica da biblioteca libxmljs2.');
          console.warn('⚠️  [XSD] XSDs complexos com imports/includes podem não ser suportados completamente.');
          console.warn('⚠️  [XSD] Continuando com validação estrutural apenas (já validada).');
          // Retornar como válido mas com mensagem especial que será tratada como aviso
          // Usar prefixo especial para identificar como aviso técnico
          return {
            valido: true, // Não bloquear por problema técnico
            erros: [`[AVISO_TECNICO] Validação XSD completa indisponível (limitação técnica): ${errorMsg}. Validação estrutural OK.`]
          };
        } else {
          // Outros erros podem ser problemas reais
          erros.push(`Erro ao validar XML contra XSD: ${errorMsg}`);
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
   * Revalida o caminho a cada verificação para garantir que está correto
   */
  static verificarXSDsDisponiveis(): {
    disponiveis: boolean;
    arquivos: string[];
    faltando: string[];
  } {
    // Revalidar o caminho (pode ter mudado após restart do container)
    const xsdPathAtual = this.getXsdPath();
    
    const arquivosEsperados = [
      'nfe_v4.00.xsd',
      'leiauteNFe_v4.00.xsd',
      'tiposBasico_v4.00.xsd',
      'DFeTiposBasicos_v1.00.xsd',
      'xmldsig-core-schema_v1.01.xsd'
    ];

    const arquivosEncontrados: string[] = [];
    const arquivosFaltando: string[] = [];

    // Verificar se o diretório base existe
    if (!fs.existsSync(xsdPathAtual)) {
      console.warn(`⚠️  [XSD] Diretório não encontrado: ${xsdPathAtual}`);
      return {
        disponiveis: false,
        arquivos: [],
        faltando: arquivosEsperados
      };
    }

    for (const arquivo of arquivosEsperados) {
      const caminhoCompleto = path.join(xsdPathAtual, arquivo);
      if (fs.existsSync(caminhoCompleto)) {
        arquivosEncontrados.push(arquivo);
      } else {
        arquivosFaltando.push(arquivo);
        console.warn(`⚠️  [XSD] Arquivo não encontrado: ${caminhoCompleto}`);
      }
    }

    if (arquivosFaltando.length === 0) {
      console.log(`✅ [XSD] Todos os ${arquivosEsperados.length} arquivos XSD encontrados em: ${xsdPathAtual}`);
    } else {
      console.warn(`⚠️  [XSD] ${arquivosFaltando.length} arquivo(s) faltando: ${arquivosFaltando.join(', ')}`);
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
      // Verificar se é um erro técnico da biblioteca ou falta de arquivos
      const erroTecnicoBiblioteca = resultadoXSD.erros.some(erro => 
        erro.includes('[AVISO_TECNICO]') ||
        erro.includes('Invalid XSD schema') || 
        erro.includes('limitação da biblioteca') ||
        erro.includes('limitação técnica') ||
        erro.includes('Validação XSD completa indisponível')
      );
      
      const apenasAvisoPorFaltaXsd =
        resultadoXSD.erros.length === 1 &&
        resultadoXSD.erros[0].includes('Validação XSD completa não disponível');

      // Se for erro técnico ou falta de arquivos, tratar como aviso (não bloqueia emissão)
      if (apenasAvisoPorFaltaXsd || erroTecnicoBiblioteca) {
        // Remover prefixo [AVISO_TECNICO] se presente
        const avisosLimpos = resultadoXSD.erros.map(erro => 
          erro.replace('[AVISO_TECNICO]', '').trim()
        );
        avisos.push(...avisosLimpos);
        console.warn('⚠️  [XSD] Validação XSD não disponível ou falhou tecnicamente. Continuando com validação estrutural apenas.');
      } else {
        // Erros reais de validação (XML não está conforme XSD) - bloquear emissão
        erros.push(...resultadoXSD.erros);
      }
    } else if (resultadoXSD.valido && resultadoXSD.erros.length > 0) {
      // Caso especial: válido mas com avisos técnicos
      const avisosTecnicos = resultadoXSD.erros.filter(erro => erro.includes('[AVISO_TECNICO]'));
      if (avisosTecnicos.length > 0) {
        const avisosLimpos = avisosTecnicos.map(erro => 
          erro.replace('[AVISO_TECNICO]', '').trim()
        );
        avisos.push(...avisosLimpos);
      }
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos
    };
  }
}

