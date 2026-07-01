import {
  buildServicoLookupMaps,
  isServicoEngenharia,
  isServicoEngenhariaAtribuivelSetor,
  projetoTemServicoEngenharia,
  projetoTemServicoEngenhariaAtribuivelSetor,
} from '../utils/servicoEngenhariaMatcher.util';

describe('projetosEngenharia (elegibilidade por classificação)', () => {
  const servicos = [
    { id: 's1', codigo: 'ENG-PRO-075', nome: 'Projeto Elétrico', tipoServico: 'ENGENHARIA' },
    { id: 's2', codigo: 'ENG-PRO-002', nome: 'ASSESSORIA E ACOMPANHAMENTO DE OBRA', tipoServico: 'ENGENHARIA' },
    { id: 's3', codigo: 'MOB-001', nome: 'Instalação', tipoServico: 'MAO_DE_OBRA' },
    { id: 's4', codigo: 'ENG-PRO-007', nome: 'ACOMPANHAMENTO TÉCNICO', tipoServico: 'PROJETOS' },
  ];
  const { byId, byNome, byCodigo } = buildServicoLookupMaps(servicos);

  it('projeto com ENG-PRO classificado ENGENHARIA exige setor', () => {
    expect(
      projetoTemServicoEngenhariaAtribuivelSetor(
        [{ tipo: 'SERVICO', servicoId: 's1' }],
        byId,
        byNome,
        byCodigo,
      ),
    ).toBe(true);
  });

  it('assessoria ENG-PRO com tipoServico ENGENHARIA também exige setor', () => {
    expect(isServicoEngenhariaAtribuivelSetor({ codigo: 'ENG-PRO-002', tipoServico: 'ENGENHARIA' })).toBe(
      true,
    );
    expect(
      projetoTemServicoEngenhariaAtribuivelSetor(
        [{ tipo: 'SERVICO', servicoId: 's2' }],
        byId,
        byNome,
        byCodigo,
      ),
    ).toBe(true);
  });

  it('serviço PROJETOS (consultoria no tipo legado) exige setor', () => {
    expect(
      projetoTemServicoEngenhariaAtribuivelSetor(
        [{ tipo: 'SERVICO', servicoId: 's4' }],
        byId,
        byNome,
        byCodigo,
      ),
    ).toBe(true);
  });

  it('mão de obra não exige setor de engenharia', () => {
    expect(
      projetoTemServicoEngenhariaAtribuivelSetor(
        [{ tipo: 'SERVICO', servicoId: 's3' }],
        byId,
        byNome,
        byCodigo,
      ),
    ).toBe(false);
  });

  it('isServicoEngenharia reconhece ENG-PRO-076', () => {
    expect(isServicoEngenharia({ codigo: 'ENG-PRO-076' })).toBe(true);
  });

  it('projetoTemServicoEngenharia inclui assessoria como engenharia genérica', () => {
    expect(
      projetoTemServicoEngenharia([{ tipo: 'SERVICO', servicoId: 's2' }], byId, byNome, byCodigo),
    ).toBe(true);
  });
});
