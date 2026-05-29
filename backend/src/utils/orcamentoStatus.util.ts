/** Status exibido no funil de orçamentos quando existe pedido de venda (PV). */

export const ORCAMENTO_STATUS_CONCRETIZADO = 'Concretizado' as const;



export const ORCAMENTO_STATUS_APROVADO = 'Aprovado' as const;



export const ORCAMENTO_STATUS_PENDENTE = 'Pendente' as const;



export const ORCAMENTO_STATUS_ENVIADO_CLIENTE = 'Enviado ao Cliente' as const;



export type OrcamentoRegredirTarget =

  | typeof ORCAMENTO_STATUS_PENDENTE

  | typeof ORCAMENTO_STATUS_ENVIADO_CLIENTE

  | typeof ORCAMENTO_STATUS_APROVADO;



export function normalizeOrcamentoStatusKey(raw: string | null | undefined): string {

  return String(raw || '')

    .trim()

    .toLowerCase()

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '');

}



export function isOrcamentoStatusAprovado(raw: string | null | undefined): boolean {

  return normalizeOrcamentoStatusKey(raw) === 'aprovado';

}



export function isOrcamentoStatusConcretizado(raw: string | null | undefined): boolean {

  return normalizeOrcamentoStatusKey(raw) === 'concretizado';

}



export function isOrcamentoStatusPendente(raw: string | null | undefined): boolean {

  const v = normalizeOrcamentoStatusKey(raw);

  return v.includes('pendente') || v.includes('rascunho');

}



export function isOrcamentoStatusEnviadoCliente(raw: string | null | undefined): boolean {

  const v = normalizeOrcamentoStatusKey(raw);

  return v.includes('enviado') && v.includes('cliente');

}



/**

 * Após envio do PDF no WhatsApp: promove Pendente/Rascunho → Enviado ao Cliente.

 * Não altera Aprovado, Concretizado ou já Enviado (idempotente).

 */

export function shouldPromoteOrcamentoToEnviadoOnWhatsappPdf(status: string | null | undefined): boolean {

  if (isOrcamentoStatusAprovado(status) || isOrcamentoStatusConcretizado(status)) return false;

  if (isOrcamentoStatusEnviadoCliente(status)) return false;

  return isOrcamentoStatusPendente(status);

}



/** Orçamento elegível para gerar PV (ainda sem venda vinculada). */

export function podeGerarPedidoVendaParaOrcamento(

  status: string | null | undefined,

  jaTemVenda: boolean

): boolean {

  if (jaTemVenda) return false;

  return isOrcamentoStatusAprovado(status) || isOrcamentoStatusConcretizado(status);

}



/** Opções de regressão de status (admin/desenvolvedor). */

export function getRegredirStatusTargets(

  currentStatusRaw: string | null | undefined,

  hasPedidoVenda: boolean

): OrcamentoRegredirTarget[] {

  const current = normalizeOrcamentoStatusKey(currentStatusRaw);

  const concretizado =

    hasPedidoVenda || isOrcamentoStatusConcretizado(currentStatusRaw);



  if (concretizado) {

    return [ORCAMENTO_STATUS_APROVADO, ORCAMENTO_STATUS_ENVIADO_CLIENTE, ORCAMENTO_STATUS_PENDENTE];

  }

  if (isOrcamentoStatusAprovado(currentStatusRaw)) {

    return [ORCAMENTO_STATUS_ENVIADO_CLIENTE, ORCAMENTO_STATUS_PENDENTE];

  }

  if (isOrcamentoStatusEnviadoCliente(currentStatusRaw)) {

    return [ORCAMENTO_STATUS_PENDENTE];

  }

  return [];

}



export function isRegredirTargetAllowed(

  currentStatusRaw: string | null | undefined,

  targetStatusRaw: string | null | undefined,

  hasPedidoVenda: boolean

): boolean {

  const target = String(targetStatusRaw || '').trim();

  if (!target) return false;

  const allowed = getRegredirStatusTargets(currentStatusRaw, hasPedidoVenda);

  return allowed.some((s) => normalizeOrcamentoStatusKey(s) === normalizeOrcamentoStatusKey(target));

}



export function orcamentoConcretizadoBloqueiaRegressao(hasPedidoVenda: boolean, status: string | null | undefined): boolean {

  return hasPedidoVenda || isOrcamentoStatusConcretizado(status);

}


