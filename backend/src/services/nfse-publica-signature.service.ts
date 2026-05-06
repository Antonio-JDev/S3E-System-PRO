/**
 * Assinatura digital NFS-e Pública Informática v7.4
 * Assina elementos com atributo Id (tsIdTag): LoteRps e InfPedidoCancelamento.
 * XMLDSIG (http://www.w3.org/TR/xmldsig-core/). KeyInfo apenas X509Certificate
 * (não incluir X509SubjectName, X509IssuerSerial - dados extraídos do certificado).
 */

import * as crypto from 'crypto';
import { SignedXml } from 'xml-crypto';

/**
 * Assina o XML que contém o elemento LoteRps (EnviarLoteRpsEnvio).
 * O elemento LoteRps deve possuir atributo Id para referência na assinatura.
 */
export function assinarLoteRps(xml: string, keyPem: string, certPem: string): string {
  return assinarElementoComId(xml, keyPem, certPem, "//*[local-name()='LoteRps']");
}

/**
 * Assina o XML que contém InfPedidoCancelamento (PedidoCancelamento).
 * O elemento InfPedidoCancelamento deve possuir atributo Id.
 */
export function assinarPedidoCancelamento(xml: string, keyPem: string, certPem: string): string {
  return assinarElementoComId(xml, keyPem, certPem, "//*[local-name()='InfPedidoCancelamento']");
}

function assinarElementoComId(
  xml: string,
  keyPem: string,
  certPem: string,
  xpathElemento: string
): string {
  const signedXml = new SignedXml();

  // NFS-e Pública/Itajaí: Exclusive C14N e RSA-SHA1 (evita "Missing canonicalizationAlgorithm")
  (signedXml as any).canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
  (signedXml as any).signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';

  (signedXml as any).addReference({
    xpath: xpathElemento,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#'
    ],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1'
  });

  // Normalizar PEM: trim + \r\n -> \n (evita falha no Linux quando PEM veio do Windows)
  const keyPemNormalizado = keyPem.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const privateKeyObj = crypto.createPrivateKey({
    key: keyPemNormalizado,
    format: 'pem'
  });
  // xml-crypto 6.x usa "privateKey" (não "signingKey") em calculateSignatureValue
  (signedXml as any).privateKey = privateKeyObj;
  (signedXml as any).signingKey = privateKeyObj;

  (signedXml as any).keyInfoProvider = {
    getKeyInfo: (_key: unknown, _prefix: string) => {
      const certLines = certPem.split('\n');
      const certBase64 = certLines
        .filter((line) => !line.includes('BEGIN') && !line.includes('END') && line.trim())
        .join('')
        .trim();
      return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
    }
  };

  (signedXml as any).computeSignature(xml, {
    location: {
      reference: xpathElemento,
      action: 'after'
    }
  });

  return signedXml.getSignedXml();
}
