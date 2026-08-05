import { TipoContratoFuncionario } from '@prisma/client';

export type TipoContratoRh =
  | 'REGISTRADO'
  | 'AUTONOMO'
  | 'AUTONOMO_BANCO_HORAS'
  | TipoContratoFuncionario
  | string;

/** CLT e Autônomo + banco: workshift, Extra/atraso, A/B/P/D, sync excedente. */
export function usaJornadaEBanco(tipo: TipoContratoRh | null | undefined): boolean {
  const t = String(tipo ?? '');
  return t === 'REGISTRADO' || t === 'AUTONOMO_BANCO_HORAS';
}

/** Autônomo clássico ou Autônomo + banco: pagamento com diária. */
export function usaDiaria(tipo: TipoContratoRh | null | undefined): boolean {
  const t = String(tipo ?? '');
  return t === 'AUTONOMO' || t === 'AUTONOMO_BANCO_HORAS';
}

/** Só Autônomo clássico: tarifas HE50/noturna/100% no total (sem jornada CLT). */
export function usaTarifasAutonomoClassico(tipo: TipoContratoRh | null | undefined): boolean {
  return String(tipo ?? '') === 'AUTONOMO';
}

/** HE 100% no ponto: autônomo clássico sempre; CLT/Auto+banco só com flag. */
export function aplicaHorasExtras100NoPonto(
  tipo: TipoContratoRh | null | undefined,
  permitirHorasExtras100: boolean,
): boolean {
  if (usaTarifasAutonomoClassico(tipo)) return true;
  return permitirHorasExtras100 === true;
}

export function labelTipoContrato(tipo: TipoContratoRh | null | undefined): string {
  const t = String(tipo ?? '');
  if (t === 'AUTONOMO_BANCO_HORAS') return 'Autônomo + banco horas';
  if (t === 'AUTONOMO') return 'Autônomo';
  return 'Registrado (CLT)';
}
