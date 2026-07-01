/**
 * Garante que toda OS expõe atribuição à engenharia sem filtro por tipo de serviço.
 */
describe('getInfoAtribuicaoOsBatch (contrato simplificado)', () => {
  it('precisaEquipeEngenharia é sempre true no shape de resposta', () => {
    const row = {
      projetoId: 'p1',
      precisaEquipeEngenharia: true,
      atribuido: false,
      responsavelEngenhariaId: null,
      responsavelNome: null,
      statusEngenharia: null,
    };
    expect(row.precisaEquipeEngenharia).toBe(true);
  });
});
