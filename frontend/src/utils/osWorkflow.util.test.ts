import {
  avaliarChecklistEntregaQuadro,
  entregaEstaEntregue,
  exigeFormularioEntregaQuadro,
  podeConcluirOsQuadros,
} from './osWorkflow.util';

describe('osWorkflow.util — entrega quadro', () => {
  it('não bloqueia conclusão pelo checklist antigo', () => {
    expect(avaliarChecklistEntregaQuadro(null).ok).toBe(true);
    expect(podeConcluirOsQuadros('LAUDO_TECNICO', null).ok).toBe(true);
    expect(podeConcluirOsQuadros('QUADROS_PAINEIS', {}).ok).toBe(true);
  });

  it('flag entregue exige nome e data/hora', () => {
    expect(entregaEstaEntregue({ recebedorNome: 'Ana' })).toBe(false);
    expect(
      entregaEstaEntregue({
        recebedorNome: 'Ana',
        recebidoEm: '2026-10-16T18:30:00.000Z',
      }),
    ).toBe(true);
  });

  it('não abre mais o formulário de entrega na tarefa do Kanban', () => {
    expect(exigeFormularioEntregaQuadro('QUADROS_PAINEIS', 'Entrega')).toBe(false);
  });
});
