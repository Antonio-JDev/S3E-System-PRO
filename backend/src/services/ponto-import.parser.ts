/**
 * Parser do XLS exportado pelo relógio de ponto (aba "Registro de Presenca").
 * Layout: blocos de 3 linhas — (1) números dos dias 1..31, (2) cabeçalho Namero/NOME/DEPART, (3) batidas por coluna com \n na célula.
 */
import * as XLSX from 'xlsx';

export type ColaboradorPresencaParsed = {
  codigoRelogio: number;
  nomeRelogio: string;
  departamento?: string;
  dias: Array<{ dia: number; batidas: string[] }>;
};

export type ParsePresencaResult = {
  ano: number;
  mes: number;
  colaboradores: ColaboradorPresencaParsed[];
  errosParse: string[];
  avisos: string[];
};

const SHEET_NAMES = ['registro de presenca', 'registro de presença'];

function normalizeSheetName(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function findSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  const sheets = workbook.SheetNames;
  const found = sheets.find((n) => {
    const norm = normalizeSheetName(n);
    return SHEET_NAMES.some((s) => norm.includes(s.replace(/\s+/g, ' ')));
  });
  const name = found ?? sheets[0];
  if (!name) {
    throw new Error('Arquivo XLS sem abas.');
  }
  return workbook.Sheets[name];
}

/** Extrai ano/mês da primeira célula que contenha padrão YYYY/MM/DD */
export function extrairAnoMesDoSheet(
  sheet: XLSX.WorkSheet,
  fallback?: { ano?: number; mes?: number },
): { ano: number; mes: number } {
  const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: { r: 0, c: 0 }, e: { r: 50, c: 20 } };
  const reData = /(\d{4})\/(\d{2})\/(\d{2})/;
  for (let r = range.s.r; r <= Math.min(range.e.r, 30); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 30); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell || cell.v === undefined || cell.v === null) continue;
      const text = String(cell.v);
      const m = text.match(reData);
      if (m) {
        return { ano: parseInt(m[1], 10), mes: parseInt(m[2], 10) };
      }
    }
  }
  if (fallback?.ano && fallback?.mes) {
    return { ano: fallback.ano, mes: fallback.mes };
  }
  throw new Error(
    'Não foi possível detectar o mês/ano no arquivo. Informe ano e mes na requisição (query ou form).',
  );
}

function cellStr(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr];
  if (!cell || cell.v === undefined || cell.v === null) return '';
  if (typeof cell.v === 'string') return cell.v;
  if (typeof cell.v === 'number') return String(cell.v);
  if (cell.v instanceof Date) return cell.v.toISOString();
  return String(cell.v);
}

/** Verifica se a linha começa com a sequência 1,2,3,4,5 (cabeçalho de dias do mês). */
function isLinhaNumerosDias(sheet: XLSX.WorkSheet, r: number): boolean {
  for (let c = 0; c < 5; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[addr];
    if (!cell || cell.v === undefined || cell.v === null) return false;
    const num = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(',', '.'));
    if (Number.isNaN(num)) return false;
    if (Math.round(num) !== c + 1) return false;
  }
  return true;
}

function extrairNumeroRelogio(texto: string): number | null {
  const m = texto.match(/Namero\s*I\s*[：:]\s*(\d+)|Numero\s*I\s*[：:]\s*(\d+)/i);
  if (m) return parseInt(m[1] || m[2], 10);
  return null;
}

function extrairNome(texto: string): string | null {
  const m = texto.match(/NOME\s*[：:]\s*(.+)/i);
  if (!m) return null;
  let s = m[1].trim();
  const cutDep = s.search(/\s+DEPARTAMENTO\s*[：:]/i);
  if (cutDep >= 0) s = s.slice(0, cutDep).trim();
  const cutDep2 = s.search(/\s+DEPARTAME/i);
  if (cutDep2 >= 0) s = s.slice(0, cutDep2).trim();
  return s || null;
}

function extrairDepartamento(texto: string): string | null {
  const m = texto.match(/DEPARTAME(?:NTO)?\s*[：:]\s*(.+)/i);
  if (m) return m[1].trim();
  return null;
}

function parseLinhaCabecalhoColaborador(sheet: XLSX.WorkSheet, r: number, maxCol: number): {
  codigoRelogio: number;
  nomeRelogio: string;
  departamento?: string;
} | null {
  const partes: string[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const raw = cellStr(sheet, r, c);
    const t = String(raw).trim();
    if (t) partes.push(t);
  }
  const linhaUnica = partes.join(' ');

  let codigo: number | null = extrairNumeroRelogio(linhaUnica);
  let nome: string | null = extrairNome(linhaUnica);
  let dept: string | undefined = extrairDepartamento(linhaUnica) ?? undefined;

  if (codigo === null || nome === null) {
    for (let c = 0; c <= maxCol; c++) {
      const raw = cellStr(sheet, r, c);
      if (!raw) continue;
      if (codigo === null) {
        const n = extrairNumeroRelogio(raw);
        if (n !== null) codigo = n;
      }
      if (nome === null) {
        const n = extrairNome(raw);
        if (n) nome = n;
      }
      const d = extrairDepartamento(raw);
      if (d) dept = d;
    }
  }

  if (codigo === null) {
    for (let c = 0; c <= maxCol; c++) {
      const raw = cellStr(sheet, r, c);
      if (!raw) continue;
      if (/Namero\s*I\s*[：:]|Numero\s*I\s*[：:]/i.test(raw) && extrairNumeroRelogio(raw) === null) {
        for (let k = 1; k <= 10; k++) {
          const v = cellStr(sheet, r, c + k).trim();
          if (/^\d{1,6}$/.test(v)) {
            codigo = parseInt(v, 10);
            break;
          }
        }
        if (codigo !== null) break;
      }
    }
  }

  if (nome === null) {
    for (let c = 0; c <= maxCol; c++) {
      const raw = cellStr(sheet, r, c).trim();
      if (/^NOME\s*[：:]\s*$/i.test(raw)) {
        for (let k = 1; k <= 12; k++) {
          const v = cellStr(sheet, r, c + k).trim();
          if (v && !/^(DEPART|Namero|Numero|NOME)\b/i.test(v)) {
            nome = v;
            break;
          }
        }
        if (nome) break;
      }
    }
  }

  if (codigo === null || !nome) return null;
  return { codigoRelogio: codigo, nomeRelogio: nome.trim(), departamento: dept };
}

/** Separa batidas "HH:mm" por quebra de linha ou espaço. */
export function splitBatidasCelula(raw: string): string[] {
  if (!raw || !String(raw).trim()) return [];
  const s = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const partes = s
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const horas: string[] = [];
  for (const p of partes) {
    const sub = p.split(/\s+/).filter(Boolean);
    for (const x of sub) {
      if (/^\d{1,2}:\d{2}$/.test(x)) horas.push(x);
    }
  }
  return horas;
}

/** Excel armazena horário às vezes como fração do dia (0–1). */
function fracaoDiaParaHHMM(frac: number): string {
  const totalMin = Math.round(frac * 24 * 60);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Lê batidas da célula (texto com \\n ou número fração do dia). */
export function extrairBatidasDaCelula(sheet: XLSX.WorkSheet, r: number, c: number): string[] {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr];
  if (!cell || cell.v === undefined || cell.v === null) return [];
  if (typeof cell.v === 'number') {
    const v = cell.v;
    if (v >= 0 && v < 1) {
      return [fracaoDiaParaHHMM(v)];
    }
  }
  return splitBatidasCelula(cellStr(sheet, r, c));
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Lê buffer XLS/XLSX e retorna colaboradores com batidas por dia.
 */
export function parsePresencaXlsBuffer(
  buffer: Buffer,
  options?: { ano?: number; mes?: number },
): ParsePresencaResult {
  const errosParse: string[] = [];
  const avisos: string[] = [];
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  } catch (e: any) {
    throw new Error(`Arquivo inválido ou corrompido: ${e?.message ?? e}`);
  }

  const sheet = findSheet(workbook);
  const { ano, mes } = extrairAnoMesDoSheet(sheet, options);
  const maxDia = diasNoMes(ano, mes);
  const maxCol = Math.min(31, maxDia);

  const colaboradores: ColaboradorPresencaParsed[] = [];
  const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: { r: 0, c: 0 }, e: { r: 2000, c: 40 } };

  for (let r = range.s.r; r <= range.e.r - 2; r++) {
    if (!isLinhaNumerosDias(sheet, r)) continue;

    const headerR = r + 1;
    const batidasR = r + 2;

    const header = parseLinhaCabecalhoColaborador(sheet, headerR, Math.max(range.e.c, 35));
    if (!header) {
      errosParse.push(`Linha ${headerR + 1}: cabeçalho de colaborador não reconhecido após linha de dias.`);
      continue;
    }

    const dias: Array<{ dia: number; batidas: string[] }> = [];
    for (let dia = 1; dia <= maxDia; dia++) {
      const c = dia - 1;
      const batidas = extrairBatidasDaCelula(sheet, batidasR, c);
      if (batidas.length > 0) {
        dias.push({ dia, batidas });
      }
    }

    colaboradores.push({
      codigoRelogio: header.codigoRelogio,
      nomeRelogio: header.nomeRelogio,
      departamento: header.departamento,
      dias,
    });
  }

  if (colaboradores.length === 0) {
    avisos.push('Nenhum bloco de colaborador encontrado (esperado: linha com dias 1..N, linha Namero/NOME, linha de batidas).');
  }

  return { ano, mes, colaboradores, errosParse, avisos };
}
