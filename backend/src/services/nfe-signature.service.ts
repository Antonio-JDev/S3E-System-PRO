import * as forge from 'node-forge';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';

/**
 * Serviço de Assinatura Digital para NF-e
 * Implementa assinatura XML-DSig conforme padrão da SEFAZ
 */
export class NFeSignatureService {
  /**
   * Carrega certificado PFX e extrai chave privada e certificado em PEM
   */
  static carregarCertificado(pfxPath: string, senha: string): { key: string; cert: string } {
    try {
      if (!fs.existsSync(pfxPath)) {
        throw new Error(`Certificado não encontrado em: ${pfxPath}`);
      }

      // Ler arquivo PFX (binário)
      const pfxBuffer = fs.readFileSync(pfxPath);
      
      // Converter buffer para binary string
      const pfxBinary = pfxBuffer.toString('binary');
      
      // Converter DER para ASN1
      const asn1 = forge.asn1.fromDer(pfxBinary);
      
      // Extrair PKCS12
      const pfx = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);

      // Buscar chave privada e certificado
      let privateKey: forge.pki.PrivateKey | null = null;
      let certificate: forge.pki.Certificate | null = null;

      // Procurar certificado
      const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      if (certBags && certBags[forge.pki.oids.certBag] && certBags[forge.pki.oids.certBag][0]) {
        certificate = certBags[forge.pki.oids.certBag][0].cert;
      }

      // Procurar chave privada
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      if (keyBags && keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] && keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0]) {
        privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
      }

      // Se não encontrou, tentar keyBag
      if (!privateKey) {
        const keyBagBags = pfx.getBags({ bagType: forge.pki.oids.keyBag });
        if (keyBagBags && keyBagBags[forge.pki.oids.keyBag] && keyBagBags[forge.pki.oids.keyBag][0]) {
          privateKey = keyBagBags[forge.pki.oids.keyBag][0].key;
        }
      }

      if (!privateKey || !certificate) {
        throw new Error('Não foi possível extrair chave privada ou certificado do PFX. Verifique a senha.');
      }

      // Converter para PEM
      const keyPem = forge.pki.privateKeyToPem(privateKey);
      const certPem = forge.pki.certificateToPem(certificate);

      return {
        key: keyPem,
        cert: certPem
      };
    } catch (error: any) {
      if (error.message?.includes('Invalid password') || error.message?.includes('MAC verify failure')) {
        throw new Error('Senha do certificado incorreta');
      }
      throw new Error(`Erro ao carregar certificado: ${error.message}`);
    }
  }

  /**
   * Assina XML da NF-e usando XML-DSig
   */
  static assinarXML(xml: string, keyPem: string, certPem: string): string {
    try {
      // Criar assinatura XML-DSig
      const signedXml = new SignedXml();
      
      // Configurar referência ao elemento infNFe
      signedXml.addReference(
        "//*[local-name()='infNFe']",
        [
          "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
          "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
        ],
        "http://www.w3.org/2000/09/xmldsig#sha1"
      );

      // Converter chave PEM para formato que xml-crypto aceita
      // xml-crypto espera uma chave privada em formato que possa ser usada com crypto
      const signingKey = crypto.createPrivateKey({
        key: keyPem,
        format: 'pem'
      });

      // Configurar chave de assinatura
      signedXml.signingKey = signingKey;

      // Configurar KeyInfo com certificado
      signedXml.keyInfoProvider = {
        getKeyInfo: (key: any, prefix: string) => {
          // Extrair certificado em Base64 (remover headers PEM)
          const certLines = certPem.split('\n');
          const certBase64 = certLines
            .filter(line => !line.includes('BEGIN') && !line.includes('END') && line.trim())
            .join('')
            .trim();
          
          return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
        }
      };

      // Assinar XML
      signedXml.computeSignature(xml, {
        location: {
          reference: "//*[local-name()='infNFe']",
          action: "after"
        }
      });

      // Obter XML assinado
      const xmlAssinado = signedXml.getSignedXml();

      return xmlAssinado;
    } catch (error: any) {
      console.error('Erro ao assinar XML:', error);
      throw new Error(`Erro ao assinar XML: ${error.message}`);
    }
  }

  /**
   * Valida certificado (verifica validade e CNPJ)
   */
  static validarCertificado(certPem: string, cnpjEsperado: string): {
    valido: boolean;
    cnpj?: string;
    validade?: Date;
    erro?: string;
  } {
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      
      // Verificar validade
      const agora = new Date();
      const validade = cert.validity.notAfter;
      
      if (agora > validade) {
        return {
          valido: false,
          erro: `Certificado expirado em ${validade.toLocaleDateString('pt-BR')}`
        };
      }

      // Extrair CNPJ do certificado
      // O CNPJ geralmente está no campo Subject do certificado
      const subject = cert.subject;
      let cnpjExtraido: string | null = null;

      // Procurar CNPJ nos atributos do certificado
      for (const attr of subject.getAttributes()) {
        if (attr.name === 'CN' || attr.name === '2.5.4.3') {
          // CN pode conter CNPJ
          const match = attr.value.match(/\d{14}/);
          if (match) {
            cnpjExtraido = match[0];
            break;
          }
        }
        // Procurar em outros campos OID comuns
        if (attr.value && /\d{14}/.test(attr.value)) {
          const match = attr.value.match(/\d{14}/);
          if (match) {
            cnpjExtraido = match[0];
          }
        }
      }

      // Limpar CNPJ esperado (remover formatação)
      const cnpjLimpo = cnpjEsperado.replace(/\D/g, '');

      if (cnpjExtraido && cnpjExtraido !== cnpjLimpo) {
        return {
          valido: false,
          cnpj: cnpjExtraido,
          erro: `CNPJ do certificado (${cnpjExtraido}) não corresponde ao informado (${cnpjLimpo})`
        };
      }

      return {
        valido: true,
        cnpj: cnpjExtraido || cnpjLimpo,
        validade: validade
      };
    } catch (error: any) {
      return {
        valido: false,
        erro: `Erro ao validar certificado: ${error.message}`
      };
    }
  }
}

