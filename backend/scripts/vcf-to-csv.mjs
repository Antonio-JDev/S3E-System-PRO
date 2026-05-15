#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * vcf-to-csv.mjs
 * Converte um arquivo .vcf (vCard 2.1/3.0) num .csv compatível com a tabela
 * `contatos_s3e` do S3E System.
 *
 * Trata:
 *  - vCard 2.1 com ENCODING=QUOTED-PRINTABLE e CHARSET=UTF-8
 *  - soft-line breaks do QP (linha termina com `=`)
 *  - "line folding" tradicional do vCard (linha seguinte começa com espaço/tab)
 *  - múltiplos TEL por contato (cada um vira uma linha no CSV)
 *  - fallback: telefone em TITLE: quando não há TEL: (backup Samsung)
 *  - prefixos de operadora (0XX) e DDI 55
 *  - dedup de números idênticos (mesmo digit-string) dentro do CSV
 *  - descarta PHOTO base64
 *
 * Uso:
 *   node backend/scripts/vcf-to-csv.mjs --in Contatos.vcf
 *   node backend/scripts/vcf-to-csv.mjs --in Contatos.vcf --out contatos.csv --ddd-padrao 47
 *
 * Saídas:
 *   <out>.csv          contatos com numero normalizado, prontos pra importar
 *   <out>.review.csv   contatos que precisam revisão manual (sem DDD, etc)
 *
 * Colunas (CSV principal):
 *   numero,nome_agenda,empresa,numero_original,tipo_telefone,status
 */

import fs from 'node:fs';
import path from 'node:path';

const DDD_VALIDOS = new Set([
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

function printHelp() {
  console.log(`Uso:
  node backend/scripts/vcf-to-csv.mjs --in <arquivo.vcf> [--out <arquivo.csv>] [--ddd-padrao 47]

Opções:
  --in, -i           Arquivo .vcf de entrada (obrigatório).
  --out, -o          Arquivo .csv de saída (default: mesmo nome do .vcf, extensão .csv).
  --ddd-padrao       DDD assumido para números com 8-9 dígitos (sem DDD).
                     Ex.: --ddd-padrao 47 (Itajaí/Camboriú-SC).
                     Sem isso, esses números vão para o .review.csv.
  --help, -h         Esta ajuda.
`);
}

function parseArgs(argv) {
  const args = { in: '', out: '', dddPadrao: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--in' || a === '-i') && argv[i + 1]) args.in = argv[++i];
    else if ((a === '--out' || a === '-o') && argv[i + 1]) args.out = argv[++i];
    else if (a === '--ddd-padrao' && argv[i + 1]) args.dddPadrao = String(argv[++i]).replace(/\D/g, '');
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function decodeQuotedPrintable(s, charset = 'utf-8') {
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && i + 2 < s.length && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(s.charCodeAt(i) & 0xff);
    }
  }
  try {
    return Buffer.from(bytes).toString(/utf-?8/i.test(charset) ? 'utf-8' : charset);
  } catch {
    return Buffer.from(bytes).toString('utf-8');
  }
}

function preprocessLines(text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rawLines = text.split('\n');

  const unfolded = [];
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    while (i + 1 < rawLines.length && /^[ \t]/.test(rawLines[i + 1])) {
      line += rawLines[i + 1].slice(1);
      i++;
    }
    unfolded.push(line);
  }

  const out = [];
  let buf = null;
  for (const line of unfolded) {
    if (buf !== null) {
      if (line.endsWith('=')) {
        buf += line.slice(0, -1);
        continue;
      }
      buf += line;
      out.push(buf);
      buf = null;
      continue;
    }
    if (/ENCODING=QUOTED-PRINTABLE/i.test(line) && line.endsWith('=')) {
      buf = line.slice(0, -1);
      continue;
    }
    out.push(line);
  }
  if (buf !== null) out.push(buf);
  return out;
}

function* iterVcards(text) {
  const lines = preprocessLines(text);
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VCARD') {
      current = [];
    } else if (trimmed === 'END:VCARD') {
      if (current) yield current;
      current = null;
    } else if (current) {
      current.push(line);
    }
  }
}

function parseVcardLine(line) {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;
  const left = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const parts = left.split(';');
  const name = parts[0].toUpperCase();
  const attrs = {};
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const eq = p.indexOf('=');
    if (eq === -1) {
      attrs.TYPE = (attrs.TYPE || []).concat([p.toUpperCase()]);
    } else {
      const k = p.slice(0, eq).toUpperCase();
      const v = p.slice(eq + 1);
      if (k === 'TYPE') {
        attrs.TYPE = (attrs.TYPE || []).concat(v.split(',').map((x) => x.toUpperCase()));
      } else {
        attrs[k] = v;
      }
    }
  }
  return { name, attrs, value };
}

function decodeValue(value, attrs) {
  const enc = (attrs.ENCODING || '').toUpperCase();
  const charset = (attrs.CHARSET || 'utf-8').toLowerCase();
  if (enc === 'QUOTED-PRINTABLE') return decodeQuotedPrintable(value, charset);
  return value;
}

function buildName(parsedFields) {
  const fn = parsedFields.find((p) => p.name === 'FN');
  if (fn && fn.value.trim()) return fn.value.trim();

  const n = parsedFields.find((p) => p.name === 'N');
  if (n) {
    const [sobrenome, nome, meio] = n.value.split(';');
    const composed = [nome, meio, sobrenome].filter((x) => x && x.trim()).join(' ').trim();
    if (composed) return composed;
  }
  return '';
}

function buildOrg(parsedFields) {
  const org = parsedFields.find((p) => p.name === 'ORG');
  if (!org || !org.value.trim()) return '';
  return org.value.split(';')[0].trim();
}

function extractPhones(parsedFields) {
  const phones = [];
  for (const p of parsedFields) {
    if (p.name === 'TEL' && p.value.trim()) {
      const types = (p.attrs.TYPE || []).map((t) => t.toUpperCase());
      let tipo = 'TEL';
      if (types.includes('CELL') || types.includes('MOBILE')) tipo = 'CELL';
      else if (types.includes('WORK')) tipo = 'WORK';
      else if (types.includes('HOME')) tipo = 'HOME';
      phones.push({ raw: p.value.trim(), tipo });
    }
  }
  if (phones.length === 0) {
    for (const p of parsedFields) {
      if (p.name === 'TITLE' && /\d/.test(p.value)) {
        const onlyDigits = p.value.replace(/\D/g, '');
        if (onlyDigits.length >= 8 && onlyDigits.length <= 15) {
          phones.push({ raw: p.value.trim(), tipo: 'TITLE_FALLBACK' });
        }
      }
    }
  }
  return phones;
}

function normalizeBrPhone(raw, dddPadrao = '') {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return { digits: '', tag: 'vazio' };

  if (d.startsWith('0')) {
    if (d.length >= 13) d = d.slice(3);
    else d = d.slice(1);
  }

  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    if (DDD_VALIDOS.has(ddd)) return { digits: d, tag: 'ok' };
  }

  if (d.length === 11) {
    const ddd = d.slice(0, 2);
    if (DDD_VALIDOS.has(ddd)) return { digits: '55' + d, tag: 'ok' };
  }

  if (d.length === 10) {
    const ddd = d.slice(0, 2);
    if (DDD_VALIDOS.has(ddd)) return { digits: '55' + d, tag: 'ok' };
  }

  if (d.length === 8 || d.length === 9) {
    if (dddPadrao && DDD_VALIDOS.has(dddPadrao)) {
      return { digits: '55' + dddPadrao + d, tag: 'sem_ddd_assumido' };
    }
    return { digits: d, tag: 'sem_ddd' };
  }

  if (d.length >= 12 && !d.startsWith('55')) {
    return { digits: d, tag: 'internacional_ou_invalido' };
  }

  return { digits: d, tag: 'curto_demais' };
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function writeCsv(filePath, header, rows) {
  const BOM = '\uFEFF';
  const body =
    BOM +
    header.join(',') +
    '\n' +
    rows.map((r) => header.map((k) => csvEscape(r[k])).join(',')).join('\n') +
    (rows.length ? '\n' : '');
  fs.writeFileSync(filePath, body, 'utf-8');
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.in) {
    console.error('Erro: faltou --in <arquivo.vcf>. Use --help para ajuda.');
    process.exit(1);
  }

  const inputPath = path.resolve(args.in);
  if (!fs.existsSync(inputPath)) {
    console.error(`Erro: arquivo não encontrado: ${inputPath}`);
    process.exit(1);
  }

  if (!args.out) {
    const baseDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    args.out = path.join(baseDir, baseName + '.csv');
  }
  const outputPath = path.resolve(args.out);
  const reviewPath = outputPath.replace(/\.csv$/i, '.review.csv');

  console.log(`Lendo: ${inputPath}`);
  const text = fs.readFileSync(inputPath, 'utf-8');
  console.log(`Tamanho: ${(text.length / 1024 / 1024).toFixed(2)} MB`);
  if (args.dddPadrao) console.log(`DDD padrão para números sem DDD: ${args.dddPadrao}`);
  else console.log('DDD padrão: (nenhum — números sem DDD vão para .review.csv)');
  console.log('Processando…');

  let totalCards = 0;
  let totalSemTelefone = 0;
  let totalLinhasCsv = 0;
  let totalSemDdd = 0;
  let totalSemDddAssumido = 0;
  let totalInvalidos = 0;
  let totalDedup = 0;

  const rows = [];
  const reviewRows = [];
  const seenNumero = new Set();

  for (const vcardLinesRaw of iterVcards(text)) {
    totalCards++;
    const parsedFields = [];
    for (const lineRaw of vcardLinesRaw) {
      if (/^PHOTO[;:]/i.test(lineRaw)) continue;
      const parsed = parseVcardLine(lineRaw);
      if (!parsed) continue;
      parsed.value = decodeValue(parsed.value, parsed.attrs);
      parsedFields.push(parsed);
    }

    const nome = buildName(parsedFields);
    const empresa = buildOrg(parsedFields);
    const phones = extractPhones(parsedFields);

    if (phones.length === 0) {
      totalSemTelefone++;
      reviewRows.push({
        nome_agenda: nome,
        empresa,
        numero_original: '',
        numero_normalizado: '',
        tipo_telefone: '',
        status: 'sem_telefone',
      });
      continue;
    }

    for (const ph of phones) {
      const { digits, tag } = normalizeBrPhone(ph.raw, args.dddPadrao);

      if (tag === 'ok' || tag === 'sem_ddd_assumido') {
        if (seenNumero.has(digits)) {
          totalDedup++;
          continue;
        }
        seenNumero.add(digits);
        rows.push({
          numero: digits,
          nome_agenda: nome,
          empresa,
          numero_original: ph.raw,
          tipo_telefone: ph.tipo,
          status: tag,
        });
        totalLinhasCsv++;
        if (tag === 'sem_ddd_assumido') totalSemDddAssumido++;
      } else {
        reviewRows.push({
          nome_agenda: nome,
          empresa,
          numero_original: ph.raw,
          numero_normalizado: digits,
          tipo_telefone: ph.tipo,
          status: tag,
        });
        if (tag === 'sem_ddd') totalSemDdd++;
        else totalInvalidos++;
      }
    }
  }

  writeCsv(
    outputPath,
    ['numero', 'nome_agenda', 'empresa', 'numero_original', 'tipo_telefone', 'status'],
    rows,
  );
  writeCsv(
    reviewPath,
    ['nome_agenda', 'empresa', 'numero_original', 'numero_normalizado', 'tipo_telefone', 'status'],
    reviewRows,
  );

  console.log('');
  console.log('==== Resumo ====');
  console.log(`vCards processados:                ${totalCards}`);
  console.log(`Linhas no CSV principal:           ${totalLinhasCsv}`);
  console.log(`  - com DDD original (ok):         ${totalLinhasCsv - totalSemDddAssumido}`);
  console.log(`  - com DDD padrão (--ddd-padrao): ${totalSemDddAssumido}`);
  console.log(`Duplicatas removidas (mesmo nº):   ${totalDedup}`);
  console.log(`Sem telefone (foram p/ review):    ${totalSemTelefone}`);
  console.log(`Sem DDD (foram p/ review):         ${totalSemDdd}`);
  console.log(`Inválidos/curtos (foram p/ review):${totalInvalidos}`);
  console.log('');
  console.log(`Saída principal: ${outputPath}`);
  console.log(`Saída revisão:   ${reviewPath}`);
}

main().catch((err) => {
  console.error('FALHA:', err);
  process.exit(1);
});
