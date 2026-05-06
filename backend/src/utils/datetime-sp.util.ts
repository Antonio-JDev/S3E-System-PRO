/**
 * Datas "somente dia" e horários de ponto em horário de Brasília (America/Sao_Paulo),
 * sem depender de TZ do processo (evita -3h em container UTC e "dia anterior").
 *
 * - Referência de dia: meio-dia UTC no calendário Y-M-D (mesmo padrão de compras / contas).
 * - Entrada/saída: string ISO com offset fixo -03:00 (Brasil sem horário de verão desde 2019).
 */

const OFFSET_BRASIL = '-03:00';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Instante estável para representar um dia civil (filtros, unique, folha).
 * Não usar new Date(y,m,d) sem fuso — em UTC vira meia-noite UTC e o "dia" muda em SP.
 */
export function dataReferenciaDiaCivilUtc(ano: number, mes: number, dia: number): Date {
  return new Date(`${ano}-${pad2(mes)}-${pad2(dia)}T12:00:00.000Z`);
}

/**
 * Combina dia civil com HH:mm como horário de Brasília (relógio de ponto em Itajaí).
 */
export function dataHoraEmBrasilia(ano: number, mes: number, dia: number, hhmm: string): Date {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return new Date(
    `${ano}-${pad2(mes)}-${pad2(dia)}T${pad2(h)}:${pad2(min)}:00${OFFSET_BRASIL}`,
  );
}

/** Dia da semana (0=dom … 6=sáb) para o calendário gregoriano, independente do TZ do servidor. */
export function diaSemanaCivil(ano: number, mes: number, dia: number): number {
  return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0)).getUTCDay();
}

export function ehFimDeSemanaCivil(ano: number, mes: number, dia: number): boolean {
  const d = diaSemanaCivil(ano, mes, dia);
  return d === 0 || d === 6;
}

/**
 * Retorna intervalo UTC para filtrar registros de um mês civil.
 * Início: 00:00:00.000 UTC do dia 1; Fim: 23:59:59.999 UTC do último dia.
 */
export function inicioFimMesCivilUtc(ano: number, mes: number): { inicio: Date; fim: Date } {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
  return { inicio, fim };
}

/** Quantidade de dias no mês (1-indexed). */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Chave yyyy-mm-dd em UTC para comparar dias. */
export function chaveDiaUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DIAS_SEMANA_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export function labelDiaSemana(dow: number): string {
  return DIAS_SEMANA_PT[dow] ?? '';
}

// ============================================================================
// FERIADOS NACIONAIS E MUNICIPAIS (ITAJAÍ/SC)
// ============================================================================

/** Feriados fixos no formato MM-DD (nacionais + Itajaí/SC) */
const FERIADOS_FIXOS: string[] = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
  '06-11', // Aniversário de Itajaí (municipal)
];

/** Nome exibido em telas de RH (conferência de ponto, etc.) */
const NOME_FERIADO_FIXO: Record<string, string> = {
  '01-01': 'Confraternização Universal',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência do Brasil',
  '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '12-25': 'Natal',
  '06-11': 'Aniversário de Itajaí',
};

/**
 * Calcula a data da Páscoa pelo algoritmo de Meeus/Jones/Butcher.
 * Retorna { mes, dia } para o ano informado.
 */
function calcularPascoa(ano: number): { mes: number; dia: number } {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

/**
 * Calcula feriados móveis (baseados na Páscoa) para um ano.
 * Retorna array de strings no formato MM-DD.
 * - Carnaval: Páscoa - 47 dias (terça-feira)
 * - Sexta-feira Santa: Páscoa - 2 dias
 * - Corpus Christi: Páscoa + 60 dias
 */
function calcularFeriadosMoveis(ano: number): string[] {
  const pascoa = calcularPascoa(ano);
  const pascoaDate = new Date(Date.UTC(ano, pascoa.mes - 1, pascoa.dia, 12, 0, 0));
  const pascoaMs = pascoaDate.getTime();
  const umDiaMs = 24 * 60 * 60 * 1000;

  const feriados: string[] = [];

  // Carnaval (terça-feira): Páscoa - 47 dias
  const carnaval = new Date(pascoaMs - 47 * umDiaMs);
  feriados.push(`${pad2(carnaval.getUTCMonth() + 1)}-${pad2(carnaval.getUTCDate())}`);

  // Sexta-feira Santa: Páscoa - 2 dias
  const sextaSanta = new Date(pascoaMs - 2 * umDiaMs);
  feriados.push(`${pad2(sextaSanta.getUTCMonth() + 1)}-${pad2(sextaSanta.getUTCDate())}`);

  // Corpus Christi: Páscoa + 60 dias
  const corpusChristi = new Date(pascoaMs + 60 * umDiaMs);
  feriados.push(`${pad2(corpusChristi.getUTCMonth() + 1)}-${pad2(corpusChristi.getUTCDate())}`);

  return feriados;
}

/** Cache de feriados móveis por ano para evitar recálculo */
const cacheFeriadosMoveis = new Map<number, string[]>();

function getFeriadosMoveis(ano: number): string[] {
  if (!cacheFeriadosMoveis.has(ano)) {
    cacheFeriadosMoveis.set(ano, calcularFeriadosMoveis(ano));
  }
  return cacheFeriadosMoveis.get(ano)!;
}

/**
 * Verifica se uma data é feriado (fixo ou móvel).
 * @param ano Ano (ex: 2026)
 * @param mes Mês 1-indexed (1=janeiro)
 * @param dia Dia do mês
 */
export function ehFeriado(ano: number, mes: number, dia: number): boolean {
  const chave = `${pad2(mes)}-${pad2(dia)}`;
  if (FERIADOS_FIXOS.includes(chave)) return true;
  const moveis = getFeriadosMoveis(ano);
  return moveis.includes(chave);
}

const NOMES_FERIADOS_MOVEIS = ['Carnaval', 'Sexta-feira Santa', 'Corpus Christi'] as const;

/**
 * Nome do feriado para exibição (fixo ou móvel). Retorna null se não for feriado.
 */
export function nomeFeriado(ano: number, mes: number, dia: number): string | null {
  if (!ehFeriado(ano, mes, dia)) return null;
  const chave = `${pad2(mes)}-${pad2(dia)}`;
  const fixo = NOME_FERIADO_FIXO[chave];
  if (fixo) return fixo;
  const moveis = getFeriadosMoveis(ano);
  const idx = moveis.indexOf(chave);
  if (idx >= 0 && idx < NOMES_FERIADOS_MOVEIS.length) return NOMES_FERIADOS_MOVEIS[idx];
  return 'Feriado';
}

/**
 * Verifica se uma data é domingo ou feriado (adicional de 100%).
 */
export function ehDomingoOuFeriado(ano: number, mes: number, dia: number): boolean {
  return diaSemanaCivil(ano, mes, dia) === 0 || ehFeriado(ano, mes, dia);
}

// ============================================================================
// FORMATAÇÃO DE HORA EM BRASÍLIA
// ============================================================================

/**
 * Extrai hora HH:mm em horário de Brasília (UTC-3) de um Date.
 * Usado para exibir entrada/saída no formato original do relógio de ponto.
 *
 * Exemplo: Date armazenado como 11:00 UTC → exibe "08:00" (horário de Brasília)
 */
export function formatHoraBrasilia(d: Date | null | undefined): string | null {
  if (!d) return null;
  // UTC - 3 horas = Brasília (sem horário de verão desde 2019)
  const utcMs = d.getTime();
  const brMs = utcMs - 3 * 60 * 60 * 1000;
  const brDate = new Date(brMs);
  const h = brDate.getUTCHours();
  const m = brDate.getUTCMinutes();
  return `${pad2(h)}:${pad2(m)}`;
}
