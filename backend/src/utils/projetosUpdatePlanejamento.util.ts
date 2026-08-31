export const CAMPOS_PLANEJAMENTO_OS = [
  'dataInicio',
  'dataPrevisao',
  'horasEngenhariaOrcadas',
  'diariasEquipeOrcadas',
] as const;

/** Indica se o payload de update toca campos que exigem validação completa de planejamento. */
export function alterouCamposPlanejamentoOs(data: Record<string, unknown>): boolean {
  return CAMPOS_PLANEJAMENTO_OS.some((k) => Object.prototype.hasOwnProperty.call(data, k));
}
