import {
  avaliarChecklistEntregaQuadro,
  entregaEstaEntregue,
  extrairEntregaQuadro,
  mensagemBloqueioConclusaoQuadros,
  normalizarEntregaQuadroInput,
  podeConcluirOsQuadros,
  validarEntregaQuadro,
  type EntregaQuadroMetadados,
} from './osEntregaQuadro.util';

function entregaCompleta(overrides: Partial<EntregaQuadroMetadados> = {}): EntregaQuadroMetadados {
  return {
    produto: 'QM 3 medidores',
    volume: '1',
    dataRomaneio: '2026-10-16',
    responsavelEntregaId: 'user-1',
    responsavelEntregaNome: 'Gabriel Palhano',
    recebedorNome: 'Eletricista do cliente',
    recebidoEm: '2026-10-16T18:30:00.000Z',
    entregue: true,
    ...overrides,
  };
}

describe('osEntregaQuadro.util', () => {
  it('extrai metadados aninhados ou diretos', () => {
    expect(extrairEntregaQuadro({ entregaQuadro: { produto: 'Quadro' } })?.produto).toBe('Quadro');
    expect(extrairEntregaQuadro({ recebedorNome: 'Ana' })?.recebedorNome).toBe('Ana');
  });

  it('não bloqueia conclusão da OS pelo checklist antigo', () => {
    expect(avaliarChecklistEntregaQuadro(null).ok).toBe(true);
    expect(podeConcluirOsQuadros('LAUDO_TECNICO', null).ok).toBe(true);
    expect(podeConcluirOsQuadros('QUADROS_PAINEIS', null).ok).toBe(true);
    expect(mensagemBloqueioConclusaoQuadros(podeConcluirOsQuadros('QUADROS_PAINEIS', {}))).toBeNull();
    expect(() => validarEntregaQuadro(null)).not.toThrow();
  });

  it('liga a flag entregue só com nome e data/hora do recebedor', () => {
    expect(entregaEstaEntregue({ recebedorNome: 'Ana' })).toBe(false);
    expect(entregaEstaEntregue({ recebidoEm: '2026-10-16T18:30:00.000Z' })).toBe(false);
    expect(entregaEstaEntregue(entregaCompleta())).toBe(true);

    const semHora = normalizarEntregaQuadroInput({ recebedorNome: 'Ana', recebidoEm: '' });
    expect(semHora.entregue).toBe(false);
    expect(semHora.recebedorNome).toBe('Ana');

    const completo = normalizarEntregaQuadroInput({
      recebedorNome: 'Ana',
      recebidoEm: '2026-10-16T18:30:00.000Z',
      produto: 'QM',
      volume: '2',
      entregue: false,
    });
    expect(completo.entregue).toBe(true);
    expect(completo.produto).toBe('QM');
    expect(completo.volume).toBe('2');
  });
});
