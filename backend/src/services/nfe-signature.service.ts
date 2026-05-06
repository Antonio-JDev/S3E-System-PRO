import * as forge from 'node-forge';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { SignedXml } from 'xml-crypto';
import { XMLSerializer } from '@xmldom/xmldom';

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
      console.log('🔐 [Certificado] Caminho PFX:', pfxPath);
      console.log('🔐 [Certificado] Senha recebida:', senha ? `${senha.length} caracteres` : 'VAZIA');

      if (!fs.existsSync(pfxPath)) {
        throw new Error(`Certificado não encontrado em: ${pfxPath}`);
      }

      // Ler arquivo PFX (binário)
      const pfxBuffer = fs.readFileSync(pfxPath);
      console.log('🔐 [Certificado] Buffer lido:', pfxBuffer.length, 'bytes');

      if (pfxBuffer.length === 0) {
        throw new Error('Arquivo PFX está vazio. Verifique o volume/caminho no container.');
      }

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
        console.error('🔐 [Certificado] Chave privada extraída:', !!privateKey, '| Certificado extraído:', !!certificate);
        throw new Error('Não foi possível extrair chave privada ou certificado do PFX. Verifique a senha.');
      }

      // Converter para PEM
      const keyPem = forge.pki.privateKeyToPem(privateKey);
      const certPem = forge.pki.certificateToPem(certificate);

      console.log('🔐 [Certificado] Carregado com sucesso. keyPem:', keyPem.length, 'chars | certPem:', certPem.length, 'chars');

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
   * IMPLEMENTA CORREÇÕES RIGOROSAS PARA RESOLVER REJEIÇÃO 297
   */
  static assinarXML(xml: string, keyPem: string, certPem: string): string {
    try {
      console.log('🔐 [Assinatura] Iniciando assinatura rigorosa contra Rejeição 297');
      console.log('🔐 [Assinatura] keyPem length:', keyPem?.length ?? 0, '| certPem length:', certPem?.length ?? 0);
      
      if (!keyPem || keyPem.length < 100) {
        throw new Error('Chave privada PEM inválida ou vazia (carregamento do certificado falhou?).');
      }
      if (!certPem || certPem.length < 100) {
        throw new Error('Certificado PEM inválido ou vazio.');
      }

      // ========== XML PARA ASSINATURA (normalizar + remover BOM) ==========
      const xmlParaAssinar = xml
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/^\uFEFF/, '')
        .trim();
      console.log('🔧 [Assinatura] XML para assinar:', xmlParaAssinar.length, 'caracteres');

      if (!xmlParaAssinar.includes('<infNFe') && !xmlParaAssinar.includes('</infNFe>')) {
        throw new Error('XML não contém o elemento infNFe necessário para a referência de assinatura.');
      }

      // Normalizar PEM
      const keyPemNormalizado = keyPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      const certPemNormalizado = certPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
      const privateKeyObj = crypto.createPrivateKey({
        key: keyPemNormalizado,
        format: 'pem'
      });

      // ========== SignedXml: C14N e referência SEM URI (só XPath simples) ==========
      console.log('🔧 [Assinatura] Configurando SignedXml com referência XPath (sem URI)...');
      const signedXml = new SignedXml({
        privateKey: privateKeyObj,
        publicCert: certPemNormalizado,
        signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
        canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
      });
      (signedXml as any).idAttributes = ['Id'];

      // Referência apenas por XPath (evita createReferences com URI que gera XPath quebrado no parser).
      // Forma explícita: seletor que ignora namespace (local-name) sem ponto, compatível com xpath/xmldom.
      const xpathRef = "//*[local-name()='infNFe']";
      const transforms = [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
      ];
      const digestAlgo = 'http://www.w3.org/2000/09/xmldsig#sha1';
      (signedXml as any).addReference({ xpath: xpathRef, transforms, digestAlgorithm: digestAlgo });

      // Passar string para computeSignature: xml-crypto faz o parse internamente e evita "invalid doc source" / nodeType.
      console.log('🔧 [Assinatura] Executando computeSignature (string, location after infNFe)...');
      (signedXml as any).computeSignature(xmlParaAssinar, {
        prefix: 'ds',
        location: {
          reference: "//*[local-name()='infNFe']",
          action: 'after'
        }
      });
      let out = signedXml.getSignedXml();
      let xmlAssinado: string = typeof out === 'string' ? out : new XMLSerializer().serializeToString(out as Document);
      // A. Garantir cabeçalho único (evita 215): algumas versões do xml-crypto omitem ou duplicam a declaração.
      const declaracao = '<?xml version="1.0" encoding="UTF-8"?>';
      if (!xmlAssinado.trimStart().startsWith('<?xml')) {
        xmlAssinado = declaracao + xmlAssinado.trimStart();
        console.log('🔧 [Assinatura] Declaração <?xml adicionada ao XML assinado.');
      }
      const multiplasDeclaracoes = (xmlAssinado.match(/<\?xml\s+version=/g) || []).length;
      if (multiplasDeclaracoes > 1) {
        xmlAssinado = xmlAssinado.replace(/<\?xml\s+version="[^"]*"\s+encoding="[^"]*"\s*\?>\s*/g, '').trimStart();
        xmlAssinado = declaracao + xmlAssinado;
        console.log('🔧 [Assinatura] Duplicidade de declaração XML removida.');
      }
      // Sem location, a lib pode colocar Signature após </NFe>. Mover para dentro de NFe (após </infNFe>).
      if (xmlAssinado.includes('</infNFe>') && xmlAssinado.includes('<Signature')) {
        const sigMatch = xmlAssinado.match(/<Signature[^>]*>[\s\S]*?<\/Signature>/);
        if (sigMatch) {
          const sigBlock = sigMatch[0];
          const withoutSig = xmlAssinado.replace(sigMatch[0], '');
          const afterInf = '</infNFe>';
          if (!withoutSig.includes(afterInf + sigBlock)) {
            const idx = withoutSig.indexOf(afterInf);
            if (idx !== -1) {
              xmlAssinado =
                withoutSig.slice(0, idx + afterInf.length) + sigBlock + withoutSig.slice(idx + afterInf.length);
            }
          }
        }
      }
      console.log('🔧 [Assinatura] XML assinado obtido:', xmlAssinado.length, 'caracteres');
      console.log('✅ [Assinatura] Assinatura concluída. Tamanho final:', xmlAssinado.length, 'caracteres');

      return xmlAssinado;
    } catch (error: any) {
      console.error('❌ [Erro Assinatura]', error);
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
      for (const attr of subject.attributes) {
        if (attr.name === 'CN' || attr.name === '2.5.4.3') {
          // CN pode conter CNPJ
          const attrValue = typeof attr.value === 'string' ? attr.value : String(attr.value);
          const match = attrValue.match(/\d{14}/);
          if (match) {
            cnpjExtraido = match[0];
            break;
          }
        }
        // Procurar em outros campos OID comuns
        const attrValue = typeof attr.value === 'string' ? attr.value : String(attr.value);
        if (attrValue && /\d{14}/.test(attrValue)) {
          const match = attrValue.match(/\d{14}/);
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

