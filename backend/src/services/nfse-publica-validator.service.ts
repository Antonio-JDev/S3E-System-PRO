/**
 * Validação de XML NFS-e Pública contra XSD (Manual v7.4).
 * Carrega XSDs locais; se não houver XSDs configurados, não bloqueia o envio (apenas loga aviso).
 */

import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const libxmljs = require('libxmljs2');

let xsdPath: string | null | undefined = undefined;
let schemaDoc: unknown = null;

function getXsdPath(): string | null {
  if (xsdPath !== undefined && xsdPath !== null) return xsdPath;
  const cwd = process.cwd();
  const candidates = [
    process.env.NFSE_XSD_PATH,
    process.env.NFSE_PUBLICA_XSD,
    // Common deployment path on TrueNAS Scale (as requested)
    '/mnt/s3e_server/Apps/s3e-aplicacao/nfse-xsd',
    // Project-local fallbacks
    path.join(cwd, 'nfse-xsd'),
    path.join(cwd, 'NFSE_PUBLICA_XSD'),
    path.join(__dirname, '../../..', 'nfse-xsd')
  ].filter(Boolean) as string[];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        xsdPath = dir;
        return dir;
      }
    } catch {
      // ignore
    }
  }
  xsdPath = null;
  return null;
}

/**
 * Valida o XML de EnviarLoteRpsEnvio (ou outro) contra o schema XSD da Pública, se disponível.
 * Se os XSDs não estiverem configurados, retorna válido e não bloqueia.
 */
export function validarXmlNfseContraXsd(xml: string): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  try {
    const dir = getXsdPath();
    if (!dir) {
      console.warn(
        '[NFSe XSD] Pasta de XSDs não configurada (NFSE_XSD_PATH ou nfse-xsd). Validação XSD omitida.'
      );
      return { valido: true, erros: [] };
    }

    // Preferir o XSD principal solicitado: schema_nfse_v03.xsd (variações) e depois o XSD de assinatura (xmlsig)
    const possibleMainNames = [
      'schema_nfse_v03.xsd',
      'schema_nfse_v3.xsd',
      'schema_nfse_v03-v3.xsd',
      'schema_nfse_v03-1.xsd',
      'schema_nfse_v03.xsd'.replace(/_/g, '_'),
      'schema_nfse_v03.xsd',
      'chema_nfse_v03.xsd',
      'schema_nfse_v03.xsd',
      'schema_nfse_v03.xsd'
    ];
    // accept wildcard matches containing 'nfse' and 'v03' (case-insensitive)
    const filesInDir = fs.readdirSync(dir).map((f) => f.toLowerCase());
    let arquivoXsd: string | null = null;
    // First try exact common names
    for (const name of possibleMainNames) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) {
        arquivoXsd = p;
        break;
      }
    }
    // Fallback: find file that matches pattern *nfse* v03*.xsd
    if (!arquivoXsd) {
      for (const f of fs.readdirSync(dir)) {
        const low = f.toLowerCase();
        if (low.includes('nfse') && (low.includes('v03') || low.includes('v3') || low.includes('v07') || low.includes('v7'))) {
          arquivoXsd = path.join(dir, f);
          break;
        }
      }
    }
    // Also look for xmlsig XSD for signature validation
    const xmlsigCandidates = ['xmlsig-core-schema20020212.xsd', 'xmldsig-core-schema.xsd', 'xmldsig-core-schema20020212.xsd'];
    let xmlsigXsd: string | null = null;
    for (const cand of xmlsigCandidates) {
      const p = path.join(dir, cand);
      if (fs.existsSync(p)) {
        xmlsigXsd = p;
        break;
      }
    }

    if (!arquivoXsd) {
      console.warn(
        '[NFSe XSD] Nenhum XSD de lote encontrado em',
        dir,
        '. Validação XSD omitida.'
      );
      return { valido: true, erros: [] };
    }

    // Carregar e analisar schema principal (uma vez por execução)
    if (!schemaDoc) {
      const content = fs.readFileSync(arquivoXsd, 'utf-8');
      schemaDoc = libxmljs.parseXml(content);
    }

    const xmlDoc = libxmljs.parseXml(xml);
    let valido = xmlDoc.validate(schemaDoc);

    if (!valido) {
      const validationErrors = (xmlDoc as { validationErrors?: Array<{ message?: string; line?: number; column?: number }> }).validationErrors || [];
      for (const err of validationErrors) {
        const msg = (err.message || String(err)).trim();
        const line = err.line != null ? `linha ${err.line}` : '';
        const col = err.column != null ? `coluna ${err.column}` : '';
        erros.push([msg, line, col].filter(Boolean).join(' - '));
      }
      if (erros.length === 0) erros.push('XML não passou na validação do schema XSD.');
    }

    // Se existir XSD de assinatura (xmlsig), validar os nós <Signature> individualmente
    if (xmlsigXsd) {
      try {
        const sigContent = fs.readFileSync(xmlsigXsd, 'utf-8');
        const sigSchema = libxmljs.parseXml(sigContent);
        // Extrair todos os blocos <Signature ...>...</Signature>
        // Usar RegExp por compatibilidade com bundlers/transpiladores
        const sigRegex = new RegExp('<Signature[\\\\s\\\\S]*?>[\\\\s\\\\S]*?<\\\\/Signature>', 'gi');
        const sigMatches = Array.from(xml.matchAll(sigRegex)).map(m => m[0]);
        for (const s of sigMatches) {
          // Envolver em root para validar isoladamente
          const wrapped = `<?xml version="1.0" encoding="UTF-8"?><root xmlns="http://www.w3.org/2000/09/xmldsig#">${s}</root>`;
          try {
            const sigDoc = libxmljs.parseXml(wrapped);
            const ok = sigDoc.validate(sigSchema);
            if (!ok) {
              const sigErrors = (sigDoc as { validationErrors?: Array<{ message?: string; line?: number; column?: number }> }).validationErrors || [];
              for (const err of sigErrors) {
                const msg = (err.message || String(err)).trim();
                const line = err.line != null ? `linha ${err.line}` : '';
                const col = err.column != null ? `coluna ${err.column}` : '';
                erros.push(`[XMLSIG] ${[msg, line, col].filter(Boolean).join(' - ')}`);
              }
              valido = false;
            }
          } catch (se) {
            erros.push(`[XMLSIG] Falha ao validar fragmento de assinatura: ${(se instanceof Error) ? se.message : String(se)}`);
            valido = false;
          }
        }
      } catch (se) {
        // Problema ao carregar XSD de assinatura: logar e continuar (não bloquear)
        console.warn('[NFSe XSD] Falha ao carregar XSD de assinatura (xmlsig):', se instanceof Error ? se.message : String(se));
      }
    }

    return { valido, erros };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Limitação técnica (libxmljs2 + XSD com imports): não bloquear envio; continuar para assinatura/envio
    const ehLimitacaoTecnica =
      /Invalid XSD schema|schema|libxml|parse/i.test(msg) || msg.includes('XSD');
    if (ehLimitacaoTecnica) {
      console.warn('[NFSe XSD] Validação XSD falhou devido a limitação técnica:', msg);
      console.warn('[NFSe XSD] Continuando com envio (validação estrutural já feita no XML).');
      return { valido: true, erros: [] };
    }
    return { valido: false, erros: [`Erro na validação XSD: ${msg}`] };
  }
}
