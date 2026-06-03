export type ClassificacaoJustificativaPonto =
  | 'ABONAR'
  | 'DESCONTAR_BANCO'
  | 'DESCONTAR_HORAS_DEVIDAS';

export function parseClassificacaoJustificativa(
  raw: string | null | undefined,
): ClassificacaoJustificativaPonto {
  const v = String(raw ?? 'ABONAR').trim().toUpperCase();
  if (v === 'DESCONTAR_BANCO' || v === 'DESCONTAR_HORAS_DEVIDAS') return v;
  return 'ABONAR';
}

export function intervaloJustificativaMinutos(
  horaInicio: string | null | undefined,
  horaFim: string | null | undefined,
): number {
  const m = (hhmm: string) => {
    const x = String(hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!x) return 0;
    return parseInt(x[1], 10) * 60 + parseInt(x[2], 10);
  };
  return Math.max(0, m(horaFim ?? '') - m(horaInicio ?? ''));
}

export function aplicarClassificacaoNosMinutos(params: {
  bruto: number;
  campo: 'ATRASO' | 'SAIDA';
  justificativaTipo: 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA' | string;
  classificacao: ClassificacaoJustificativaPonto;
  horaInicio: string | null;
  horaFim: string | null;
}): number {
  const { bruto, campo, justificativaTipo, classificacao, horaInicio, horaFim } = params;
  if (!bruto) return 0;

  const tipoMatch =
    (campo === 'ATRASO' && justificativaTipo === 'ENTRADA_ATRASADA') ||
    (campo === 'SAIDA' && justificativaTipo === 'SAIDA_ANTECIPADA');
  if (!tipoMatch) return bruto;

  if (classificacao === 'DESCONTAR_HORAS_DEVIDAS') return bruto;

  const intervalo = intervaloJustificativaMinutos(horaInicio, horaFim);
  return Math.max(0, bruto - intervalo);
}

/** Minutos do intervalo justificado que contam como horas trabalhadas no dia (somente ABONAR). */
export function minutosAbonadosParaHorasTrabalhadas(params: {
  classificacao: ClassificacaoJustificativaPonto;
  horaInicio: string | null | undefined;
  horaFim: string | null | undefined;
}): number {
  if (params.classificacao !== 'ABONAR') return 0;
  return intervaloJustificativaMinutos(params.horaInicio, params.horaFim);
}
