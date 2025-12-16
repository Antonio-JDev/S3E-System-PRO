import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

/**
 * Utilitário para geração do procNFe (XML final da NF-e autorizada)
 * Combina o XML original assinado com o protocolo de autorização da SEFAZ
 */
export class NFeProcNFeUtil {
  /**
   * Gera o XML procNFe (NF-e processada)
   * Formato: <nfeProc> + <NFe> (original) + <protNFe> (protocolo)
   */
  static gerarProcNFe(xmlNFeAssinado: string, xmlProtocolo: string): string {
    try {
      // Parse do XML da NF-e
      const parser = new DOMParser();
      const docNFe = parser.parseFromString(xmlNFeAssinado, 'text/xml');

      // Parse do XML do protocolo
      const docProt = parser.parseFromString(xmlProtocolo, 'text/xml');

      // Verificar erros de parsing
      const errorsNFe = docNFe.getElementsByTagName('parsererror');
      const errorsProt = docProt.getElementsByTagName('parsererror');

      if (errorsNFe.length > 0 || errorsProt.length > 0) {
        throw new Error('Erro ao fazer parse dos XMLs');
      }

      // Extrair elemento NFe
      const nfeElement = docNFe.getElementsByTagName('NFe')[0];
      if (!nfeElement) {
        throw new Error('Elemento NFe não encontrado no XML assinado');
      }

      // Extrair elemento protNFe do protocolo
      let protNFeElement = docProt.getElementsByTagName('protNFe')[0];
      
      // Se não encontrou protNFe direto, procurar dentro de retConsReciNFe
      if (!protNFeElement) {
        const retConsReciNFe = docProt.getElementsByTagName('retConsReciNFe')[0];
        if (retConsReciNFe) {
          protNFeElement = retConsReciNFe.getElementsByTagName('protNFe')[0];
        }
      }

      if (!protNFeElement) {
        throw new Error('Elemento protNFe não encontrado no protocolo');
      }

      // Criar documento nfeProc
      const nfeProcDoc = parser.parseFromString(
        '<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"></nfeProc>',
        'text/xml'
      );

      const nfeProcElement = nfeProcDoc.documentElement;

      // Adicionar versão ao nfeProc
      nfeProcElement.setAttribute('versao', '4.00');
      nfeProcElement.setAttribute('xmlns', 'http://www.portalfiscal.inf.br/nfe');

      // Clonar NFe para o novo documento
      const nfeClone = nfeProcDoc.importNode(nfeElement, true);
      nfeProcElement.appendChild(nfeClone);

      // Clonar protNFe para o novo documento
      const protClone = nfeProcDoc.importNode(protNFeElement, true);
      nfeProcElement.appendChild(protClone);

      // Serializar para string
      const serializer = new XMLSerializer();
      const xmlFinal = serializer.serializeToString(nfeProcDoc);

      // Adicionar declaração XML se não tiver
      if (!xmlFinal.startsWith('<?xml')) {
        return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlFinal}`;
      }

      return xmlFinal;
    } catch (error: any) {
      console.error('Erro ao gerar procNFe:', error);
      throw new Error(`Erro ao gerar procNFe: ${error.message}`);
    }
  }

  /**
   * Extrai informações do protocolo de autorização
   */
  static extrairDadosProtocolo(xmlProtocolo: string): {
    numeroProtocolo?: string;
    chaveAcesso?: string;
    dataAutorizacao?: string;
    codigoStatus?: string;
    mensagem?: string;
  } {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlProtocolo, 'text/xml');

      const protNFe = doc.getElementsByTagName('protNFe')[0] || 
                     doc.getElementsByTagName('retConsReciNFe')[0]?.getElementsByTagName('protNFe')[0];

      if (!protNFe) {
        return {};
      }

      const infProt = protNFe.getElementsByTagName('infProt')[0];
      if (!infProt) {
        return {};
      }

      const nProt = infProt.getElementsByTagName('nProt')[0]?.textContent;
      const chNFe = infProt.getElementsByTagName('chNFe')[0]?.textContent;
      const dhRecbto = infProt.getElementsByTagName('dhRecbto')[0]?.textContent;
      const cStat = infProt.getElementsByTagName('cStat')[0]?.textContent;
      const xMotivo = infProt.getElementsByTagName('xMotivo')[0]?.textContent;

      return {
        numeroProtocolo: nProt || undefined,
        chaveAcesso: chNFe || undefined,
        dataAutorizacao: dhRecbto || undefined,
        codigoStatus: cStat || undefined,
        mensagem: xMotivo || undefined
      };
    } catch (error: any) {
      console.error('Erro ao extrair dados do protocolo:', error);
      return {};
    }
  }
}

