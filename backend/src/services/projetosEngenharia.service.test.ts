import {
  buildServicoLookupMaps,
  isServicoEngenharia,
  isServicoEngenhariaAtribuivelSetor,
  isServicoExcluidoAtribuicaoSetorEngenharia,
  projetoTemServicoEngenharia,
  projetoTemServicoEngenhariaAtribuivelSetor,
} from '../utils/servicoEngenhariaMatcher.util';

describe('projetosEngenharia (elegibilidade e assessoria)', () => {
  const servicos = [
    { id: 's1', codigo: 'ENG-PRO-075', nome: 'Projeto Elétrico', tipoServico: 'ENGENHARIA' },
    { id: 's2', codigo: 'ENG-PRO-002', nome: 'ASSESSORIA E ACOMPANHAMENTO DE OBRA', tipoServico: 'ENGENHARIA' },
    { id: 's3', codigo: 'MOB-001', nome: 'Instalação', tipoServico: 'MAO_DE_OBRA' },
  ];
  const { byId, byNome } = buildServicoLookupMaps(servicos);

  it('projeto com ENG-PRO executável exige setor', () => {
    expect(
      projetoTemServicoEngenhariaAtribuivelSetor(
        [{ tipo: 'SERVICO', servicoId: 's1' }],
        byId,
        byNome,
      ),
    ).toBe(true);
  });

  it('assessoria ENG-PRO não exige atribuição ao setor', () => {
    expect(isServicoExcluidoAtribuicaoSetorEngenharia({ codigo: 'ENG-PRO-002' })).toBe(true);
    expect(isServicoEngenhariaAtribuivelSetor({ codigo: 'ENG-PRO-002', tipoServico: 'ENGENHARIA' })).toBe(
      false,
    );
    expect(
      projetoTemServicoEngenhariaAtribuivelSetor(
        [{ tipo: 'SERVICO', servicoId: 's2' }],
        byId,
        byNome,
      ),
    ).toBe(false);
  });

  it('projeto com assessoria + projeto executável ainda exige setor', () => {
    expect(
      projetoTemServicoEngenhariaAtribuivelSetor(
        [
          { tipo: 'SERVICO', servicoId: 's2' },
          { tipo: 'SERVICO', servicoId: 's1' },
        ],
        byId,
        byNome,
      ),
    ).toBe(true);
  });

  it('isServicoEngenharia reconhece ENG-PRO-076', () => {
    expect(isServicoEngenharia({ codigo: 'ENG-PRO-076' })).toBe(true);
  });

  it('projetoTemServicoEngenharia inclui assessoria como engenharia genérica', () => {
    expect(
      projetoTemServicoEngenharia([{ tipo: 'SERVICO', servicoId: 's2' }], byId, byNome),
    ).toBe(true);
  });
});
