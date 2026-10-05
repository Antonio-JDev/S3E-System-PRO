import { serverDateToInput } from './date';

export type TipoReferenciaChegada = 'ORCAMENTO' | 'PEDIDO_COMPRA' | 'NF';

export const TIPOS_REFERENCIA_CHEGADA: Array<{ value: TipoReferenciaChegada; label: string; curto: string }> = [
  { value: 'PEDIDO_COMPRA', label: 'Pedido de compra', curto: 'Pedido' },
  { value: 'ORCAMENTO', label: 'Orçamento', curto: 'Orç.' },
  { value: 'NF', label: 'Nota fiscal', curto: 'NF' },
];

export function rotuloReferenciaChegada(tipo?: string | null, referencia?: string | null): string | null {
  const ref = (referencia || '').trim();
  if (!ref) return null;
  const meta = TIPOS_REFERENCIA_CHEGADA.find((t) => t.value === tipo);
  return meta ? `${meta.curto} ${ref}` : ref;
}

type LinhaBom = {
  tipo?: string | null;
  servico?: unknown;
  servicoId?: unknown;
};

/**
 * Só produtos (material de estoque ou banco frio) aceitam data de chegada.
 * Serviços não são comprados e kits precisam ser expandidos para definir por componente.
 */
export function linhaBomAceitaChegada(item: LinhaBom): boolean {
  const tipo = String(item.tipo || '').toUpperCase();
  if (tipo === 'SERVICO' || item.servico || item.servicoId) return false;
  if (tipo === 'KIT') return false;
  return true;
}

export type StatusPrevisaoChegada = 'atrasada' | 'hoje' | 'futura';

export function statusPrevisaoChegada(dataChegada: string, hojeYmd: string): StatusPrevisaoChegada {
  const ymd = serverDateToInput(dataChegada);
  if (ymd < hojeYmd) return 'atrasada';
  if (ymd === hojeYmd) return 'hoje';
  return 'futura';
}
