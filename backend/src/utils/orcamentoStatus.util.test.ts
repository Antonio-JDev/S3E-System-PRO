import {
  ORCAMENTO_STATUS_APROVADO,
  ORCAMENTO_STATUS_CONCRETIZADO,
  ORCAMENTO_STATUS_ENVIADO_CLIENTE,
  ORCAMENTO_STATUS_PENDENTE,
  getRegredirStatusTargets,
  isOrcamentoStatusAprovado,
  isOrcamentoStatusConcretizado,
  isRegredirTargetAllowed,
  podeGerarPedidoVendaParaOrcamento,
  shouldPromoteOrcamentoToEnviadoOnWhatsappPdf,
} from './orcamentoStatus.util';

describe('orcamentoStatus.util', () => {
  it('identifica Aprovado e Concretizado', () => {
    expect(isOrcamentoStatusAprovado('Aprovado')).toBe(true);
    expect(isOrcamentoStatusAprovado('APROVADO')).toBe(true);
    expect(isOrcamentoStatusConcretizado('Concretizado')).toBe(true);
    expect(isOrcamentoStatusAprovado('Pendente')).toBe(false);
  });

  it('permite gerar PV apenas para Aprovado/Concretizado sem venda', () => {
    expect(podeGerarPedidoVendaParaOrcamento('Aprovado', false)).toBe(true);
    expect(podeGerarPedidoVendaParaOrcamento('Concretizado', false)).toBe(true);
    expect(podeGerarPedidoVendaParaOrcamento('Aprovado', true)).toBe(false);
    expect(podeGerarPedidoVendaParaOrcamento('Pendente', false)).toBe(false);
  });

  it('expõe constantes de status', () => {
    expect(ORCAMENTO_STATUS_APROVADO).toBe('Aprovado');
    expect(ORCAMENTO_STATUS_CONCRETIZADO).toBe('Concretizado');
  });

  it('promove para Enviado ao Cliente só a partir de Pendente/Rascunho', () => {
    expect(shouldPromoteOrcamentoToEnviadoOnWhatsappPdf('Pendente')).toBe(true);
    expect(shouldPromoteOrcamentoToEnviadoOnWhatsappPdf('Rascunho')).toBe(true);
    expect(shouldPromoteOrcamentoToEnviadoOnWhatsappPdf('Enviado ao Cliente')).toBe(false);
    expect(shouldPromoteOrcamentoToEnviadoOnWhatsappPdf('Aprovado')).toBe(false);
    expect(shouldPromoteOrcamentoToEnviadoOnWhatsappPdf('Concretizado')).toBe(false);
  });

  it('define opções de regressão por status atual', () => {
    expect(getRegredirStatusTargets('Enviado ao Cliente', false)).toEqual([ORCAMENTO_STATUS_PENDENTE]);
    expect(getRegredirStatusTargets('Aprovado', false)).toEqual([
      ORCAMENTO_STATUS_ENVIADO_CLIENTE,
      ORCAMENTO_STATUS_PENDENTE,
    ]);
    expect(getRegredirStatusTargets('Concretizado', true)).toEqual([
      ORCAMENTO_STATUS_APROVADO,
      ORCAMENTO_STATUS_ENVIADO_CLIENTE,
      ORCAMENTO_STATUS_PENDENTE,
    ]);
    expect(getRegredirStatusTargets('Pendente', false)).toEqual([]);
  });

  it('valida alvo de regressão', () => {
    expect(isRegredirTargetAllowed('Aprovado', 'Pendente', false)).toBe(true);
    expect(isRegredirTargetAllowed('Aprovado', 'Concretizado', false)).toBe(false);
    expect(isRegredirTargetAllowed('Pendente', 'Enviado ao Cliente', false)).toBe(false);
  });
});
