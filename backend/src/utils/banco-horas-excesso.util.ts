/**
 * Decompõe o excedente mensal (total trabalhado − carga) entre:
 * - horas atribuídas a HE 100% (até o somatório de HE100 do mês)
 * - o restante (jornada “normal” + HE50 que compõem o excesso)
 */
export function decomporExcessoBancoHoras(params: {
  sumNormais: number;
  sumExtras50: number;
  sumExtras100: number;
  cargaMensal: number;
}): { excessoTotal: number; excessoNormais: number; excessoExtras100: number } {
  const T = params.sumNormais + params.sumExtras50 + params.sumExtras100;
  const X = Math.max(0, T - params.cargaMensal);
  const sumE100 = Math.max(0, params.sumExtras100);
  const part100 = Math.min(X, sumE100);
  const partNormais = X - part100;
  return { excessoTotal: X, excessoNormais: partNormais, excessoExtras100: part100 };
}
