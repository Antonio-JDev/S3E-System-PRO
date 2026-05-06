/**
 * Resolve o caminho do arquivo de certificado (.pfx) de forma portável.
 * O banco pode guardar só o nome do arquivo (ex.: "12345678000199_123.pfx") ou um caminho completo.
 * Sempre resolvemos para o diretório de certificados do ambiente atual (process.cwd()/data/certificados),
 * para funcionar tanto em desenvolvimento (Windows) quanto no Docker (/app/data/certificados).
 */

import * as fs from 'fs';
import * as path from 'path';

const CERTIFICADOS_DIR = path.join(process.cwd(), 'data', 'certificados');

/**
 * Retorna o caminho absoluto do arquivo de certificado a ser usado.
 * - Se stored for só nome de arquivo (ex.: "cnpj_timestamp.pfx"), usa data/certificados do cwd atual.
 * - Se stored for caminho completo (upload antigo), tenta esse path; se não existir, tenta pelo basename no dir atual.
 */
export function resolveCertificadoPath(stored: string | null): string | null {
  if (!stored || !stored.trim()) return null;

  const trimmed = stored.trim();
  const onlyFilename = !path.isAbsolute(trimmed) && !trimmed.includes(path.sep);

  if (onlyFilename) {
    const resolved = path.join(CERTIFICADOS_DIR, trimmed);
    return resolved;
  }

  // Caminho completo (registro antigo): se existir no path salvo, usa; senão tenta pelo basename no dir atual
  if (fs.existsSync(trimmed)) return trimmed;

  const basename = path.basename(trimmed);
  const byBasename = path.join(CERTIFICADOS_DIR, basename);
  if (fs.existsSync(byBasename)) return byBasename;

  return trimmed;
}
