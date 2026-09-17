import { avaliarChecklistEntregaQuadro, podeConcluirOsQuadros } from './osWorkflow.util';

describe('osWorkflow.util — entrega quadro', () => {
  const completo = {
    fotoProduto: 'data:image/png;base64,aaaaaaaaaaaaaaaaaaaa',
    materiaisConferidos: true,
    romaneio: { geradoEm: '2026-09-16T12:00:00.000Z' },
    clienteNome: 'Maria',
    clienteTelefone: '47999990000',
    dataEntrega: '2026-09-16',
    assinaturaCliente: 'Maria Silva',
    fotoProdutoEntregue: 'data:image/png;base64,bbbbbbbbbbbbbbbbbbbb',
  };

  it('valida checklist completo', () => {
    expect(avaliarChecklistEntregaQuadro(completo).ok).toBe(true);
  });

  it('bloqueia conclusão incompleta só para QUADROS_PAINEIS', () => {
    expect(podeConcluirOsQuadros('LAUDO_TECNICO', null).ok).toBe(true);
    expect(podeConcluirOsQuadros('QUADROS_PAINEIS', {}).ok).toBe(false);
    expect(podeConcluirOsQuadros('QUADROS_PAINEIS', completo).ok).toBe(true);
  });
});
