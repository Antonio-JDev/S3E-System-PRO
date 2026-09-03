import { validarEntregaQuadroForm } from './osWorkflow.util';

describe('osWorkflow.util — entrega quadro', () => {
  it('valida campos obrigatórios', () => {
    expect(
      validarEntregaQuadroForm({
        dataEntrega: '',
        entregadorNome: '',
        recebedorNome: '',
        recebidoNoLocal: true,
        localRecebimento: '',
      }),
    ).toBeTruthy();
    expect(
      validarEntregaQuadroForm({
        dataEntrega: '2026-09-01',
        entregadorNome: 'João',
        recebedorNome: 'Maria',
        recebidoNoLocal: true,
        localRecebimento: 'Obra cliente',
      }),
    ).toBeNull();
  });
});
