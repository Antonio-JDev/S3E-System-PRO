/**
 * Assinatura XMLDSIG da DPS e do pedido de evento da NFS-e nacional.
 *
 * Manual do contribuinte (API do Emissor Público Nacional) e swagger da Sefin Nacional:
 * XMLDSIG, RSA-SHA256, canonicalização C14N 20010315, transformações enveloped + C14N,
 * digest SHA-256. A referência usa URI="#Id" do infDPS (ou infPedReg). KeyInfo só com
 * X509Certificate. A Signature fica logo após o elemento assinado, dentro do pai (DPS
 * ou pedRegEvento).
 */

import * as crypto from 'crypto';
import { SignedXml } from 'xml-crypto';

export function assinarXmlNfseNacional(
  xml: string,
  keyPem: string,
  certPem: string,
  localName: 'infDPS' | 'infPedReg'
): string {
  const xmlNorm = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '').trim();
  const idMatch = xmlNorm.match(new RegExp(`<${localName}[^>]*\\sId="([^"]+)"`));
  const id = idMatch?.[1];
  if (!id) {
    throw new Error(`XML sem atributo Id em ${localName}. A Sefin Nacional exige a referência URI="#Id".`);
  }

  const keyPemNormalizado = keyPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const privateKeyObj = crypto.createPrivateKey({ key: keyPemNormalizado, format: 'pem' });

  const signedXml = new SignedXml();
  (signedXml as any).canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  (signedXml as any).signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  (signedXml as any).idAttributes = ['Id'];
  (signedXml as any).privateKey = privateKeyObj;
  (signedXml as any).signingKey = privateKeyObj;

  (signedXml as any).addReference({
    xpath: `//*[local-name()='${localName}']`,
    uri: `#${id}`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256'
  });

  (signedXml as any).keyInfoProvider = {
    getKeyInfo: () => {
      const certBase64 = certPem
        .split('\n')
        .filter((line) => !line.includes('BEGIN') && !line.includes('END') && line.trim())
        .join('')
        .trim();
      return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
    }
  };

  (signedXml as any).computeSignature(xmlNorm, {
    location: {
      reference: `//*[local-name()='${localName}']`,
      action: 'after'
    }
  });

  let xmlAssinado = signedXml.getSignedXml();
  const declaracao = '<?xml version="1.0" encoding="UTF-8"?>';
  if (!xmlAssinado.trimStart().startsWith('<?xml')) {
    xmlAssinado = declaracao + xmlAssinado.trimStart();
  }
  return xmlAssinado;
}
