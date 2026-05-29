export const ORCAMENTO_STATUS_PENDENTE = 'Pendente' as const;
export const ORCAMENTO_STATUS_ENVIADO_CLIENTE = 'Enviado ao Cliente' as const;
export const ORCAMENTO_STATUS_APROVADO = 'Aprovado' as const;
export const ORCAMENTO_STATUS_CONCRETIZADO = 'Concretizado' as const;

export type OrcamentoRegredirTarget =
  | typeof ORCAMENTO_STATUS_PENDENTE
  | typeof ORCAMENTO_STATUS_ENVIADO_CLIENTE
  | typeof ORCAMENTO_STATUS_APROVADO;

function normalizeKey(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isOrcamentoConcretizadoVisual(
  status: string | null | undefined,
  hasVenda: boolean
): boolean {
  return status === ORCAMENTO_STATUS_CONCRETIZADO || (status === ORCAMENTO_STATUS_APROVADO && hasVenda);
}

export function getRegredirStatusTargets(
  currentStatus: string | null | undefined,
  hasPedidoVenda: boolean
): OrcamentoRegredirTarget[] {
  const concretizado = isOrcamentoConcretizadoVisual(currentStatus, hasPedidoVenda);
  const key = normalizeKey(currentStatus);

  if (concretizado) {
    return [ORCAMENTO_STATUS_APROVADO, ORCAMENTO_STATUS_ENVIADO_CLIENTE, ORCAMENTO_STATUS_PENDENTE];
  }
  if (key === 'aprovado') {
    return [ORCAMENTO_STATUS_ENVIADO_CLIENTE, ORCAMENTO_STATUS_PENDENTE];
  }
  if (key.includes('enviado') && key.includes('cliente')) {
    return [ORCAMENTO_STATUS_PENDENTE];
  }
  return [];
}

export function regredirStatusLabel(status: OrcamentoRegredirTarget): string {
  return status;
}
