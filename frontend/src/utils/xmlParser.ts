import { XMLParser } from 'fast-xml-parser';

export interface ParsedNFeData {
  fornecedor: {
    nome: string;
    cnpj: string;
    telefone?: string;
    endereco?: string;
  };
  notaFiscal: {
    numero: string;
    dataEmissao: string;
  };
  items: Array<{
    nomeProduto: string;
    ncm: string;
    quantidade: number;
    valorUnit: number;
    valorTotal: number;
  }>;
  totais: {
    valorFrete: number;
    outrasDespesas: number;
    valorTotal: number;
  };
}

export const parseNFeXML = (xmlContent: string): ParsedNFeData | null => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const result = parser.parse(xmlContent);
    
    // Navegar pela estrutura do XML da NF-e
    const nfe = result.nfeProc?.NFe?.infNFe || result.NFe?.infNFe || {};
    
    // Extrair dados do fornecedor/emitente
    const emit = nfe.emit || {};
    const enderEmit = emit.enderEmit || {};
    
    const fornecedor = {
      nome: emit.xNome || emit.xFant || '',
      cnpj: emit.CNPJ || '',
      telefone: enderEmit.fone || '',
      endereco: enderEmit.xLgr 
        ? `${enderEmit.xLgr}, ${enderEmit.nro || 'S/N'} - ${enderEmit.xBairro || ''}, ${enderEmit.xMun || ''}/${enderEmit.UF || ''}`
        : ''
    };

    // Dados da nota
    const ide = nfe.ide || {};
    const notaFiscal = {
      numero: ide.nNF || '',
      dataEmissao: ide.dhEmi || ide.dEmi || ''
    };

    // Extrair items
    const items = [];
    const det = Array.isArray(nfe.det) ? nfe.det : (nfe.det ? [nfe.det] : []);
    
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
          valorTotal: parseFloat(item.prod.vProd || '0')
        });
      }
    }

    // Totais
    const totais = nfe.total?.ICMSTot || {};
    const totaisData = {
      valorFrete: parseFloat(totais.vFrete || '0'),
      outrasDespesas: parseFloat(totais.vOutro || '0') + parseFloat(totais.vSeg || '0'),
      valorTotal: parseFloat(totais.vNF || '0')
    };

    return {
      fornecedor,
      notaFiscal,
      items,
      totais: totaisData
    };
  } catch (error) {
    console.error('Erro ao fazer parse do XML:', error);
    return null;
  }
};

// Função auxiliar para ler arquivo como texto
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

