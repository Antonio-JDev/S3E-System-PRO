export const CAMPOS_PLANEJAMENTO_OS = [
  'dataInicio',
  'dataPrevisao',
  'horasEngenhariaOrcadas',
  'diariasEquipeOrcadas',
] as const;

/** Campos que o card de prazo/estimativa pode enviar sem exigir gerente. */
export const CAMPOS_ESTIMATIVA_OS = [
  ...CAMPOS_PLANEJAMENTO_OS,
  'valorHoraEngenharia',
  'valorDiariaEquipe',
] as const;

/** Indica se o payload de update toca campos que exigem validação completa de planejamento. */
export function alterouCamposPlanejamentoOs(data: Record<string, unknown>): boolean {
  return CAMPOS_PLANEJAMENTO_OS.some((k) => Object.prototype.hasOwnProperty.call(data, k));
}

/**
 * True quando o update contém apenas campos de prazo/estimativa
 * (sem título, responsável, tipo etc.). Nesses casos o gerente não é obrigatório.
 */
export function isUpdateSomenteEstimativaOs(data: Record<string, unknown>): boolean {
  const keys = Object.keys(data);
  if (keys.length === 0) return false;
  const allowed = new Set<string>(CAMPOS_ESTIMATIVA_OS);
  return keys.every((k) => allowed.has(k));
}
