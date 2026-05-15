/**
 * Sanitização e normalização de telefones BR para a tabela `contatos_s3e`.
 *
 * Mantém compatibilidade com a chave gerada por `normalizePhoneDigitsKey`
 * (usada no resto do sistema para casamento de identidades, cache e webhooks),
 * adicionando uma etapa anterior de limpeza mais agressiva que aceita formatos
 * "humanos" comuns no Brasil: `(47) 99999-9999`, `+55 47 99999 9999`,
 * `0XX...` com código de operadora, etc.
 *
 * Esta lógica é usada principalmente em:
 *  - importação CSV (`importContatosBatch`)
 *  - criação manual de contato pela UI
 *  - upsert vindo do webhook (mensagem recebida)
 */
import { normalizePhoneDigitsKey } from '../services/whatsappIdentity.service';

export const DDD_VALIDOS = new Set<string>([
  '11','12','13','14','15','16','17','18','19',
  '21','22','24','27','28',
  '31','32','33','34','35','37','38',
  '41','42','43','44','45','46','47','48','49',
  '51','53','54','55',
  '61','62','63','64','65','66','67','68','69',
  '71','73','74','75','77','79',
  '81','82','83','84','85','86','87','88','89',
  '91','92','93','94','95','96','97','98','99',
]);

export type SanitizedPhone = {
  /** Dígitos finais normalizados (sem `+`/`-`/`()`, com DDI 55 quando aplicável). */
  digits: string;
  /** Indica se o número resultante é plausível como telefone BR para storage. */
  valid: boolean;
  /** Razão de invalidade (vazia quando `valid=true`). */
  reason: string;
};

/**
 * Sanitiza um telefone "humano" e retorna a chave canônica BR.
 *
 * @param raw          número como veio do usuário/CSV
 * @param dddPadrao    DDD a assumir para números de 8-9 dígitos sem DDD (ex.: '47').
 *                     Se omitido, números sem DDD ficam `valid=false`.
 */
export function sanitizeBrPhone(raw: string, dddPadrao?: string): SanitizedPhone {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return { digits: '', valid: false, reason: 'vazio' };

  if (d.startsWith('00')) d = d.slice(2);

  if (d.startsWith('0')) {
    if (d.length >= 13) d = d.slice(3);
    else d = d.slice(1);
  }

  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    if (DDD_VALIDOS.has(ddd)) return { digits: d, valid: true, reason: '' };
  }

  if (d.length === 10 || d.length === 11) {
    const ddd = d.slice(0, 2);
    if (DDD_VALIDOS.has(ddd)) {
      const normalized = normalizePhoneDigitsKey(d);
      if (normalized) return { digits: normalized, valid: true, reason: '' };
    }
  }

  if (d.length === 8 || d.length === 9) {
    const ddd = String(dddPadrao || '').replace(/\D/g, '');
    if (ddd && DDD_VALIDOS.has(ddd)) {
      const normalized = normalizePhoneDigitsKey(`${ddd}${d}`);
      if (normalized) return { digits: normalized, valid: true, reason: 'ddd_assumido' };
    }
    return { digits: d, valid: false, reason: 'sem_ddd' };
  }

  if (d.length > 13) {
    return { digits: d, valid: false, reason: 'muito_longo' };
  }

  if (d.length >= 12 && !d.startsWith('55')) {
    return { digits: d, valid: false, reason: 'internacional_ou_invalido' };
  }

  return { digits: d, valid: false, reason: 'curto_demais' };
}
