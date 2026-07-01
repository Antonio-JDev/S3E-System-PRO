import {
  isServicoEngenharia,
  isServicoClassificacaoEngenhariaProjetos,
  isServicoExcluidoAtribuicaoSetorEngenharia,
  isServicoEngenhariaAtribuivelSetor,
  orcamentoItemTemServicoEngenharia,
  orcamentoItemTemServicoEngenhariaAtribuivelSetor,
  projetoTemServicoEngenharia,
  projetoTemServicoEngenhariaAtribuivelSetor,
  buildServicoLookupMaps,
} from './servicoEngenhariaMatcher.util';

describe('servicoEngenhariaMatcher.util', () => {
  const servicos = [
    { id: 's1', codigo: 'ENG-PRO-075', nome: 'Projeto Elétrico', tipoServico: 'ENGENHARIA' },
    { id: 's2', codigo: 'MOB-001', nome: 'Instalação', tipoServico: 'MAO_DE_OBRA' },
    { id: 's3', codigo: 'ADM-010', nome: 'Administrativo', tipoServico: 'ADMINISTRATIVO' },
    { id: 's4', codigo: 'ENG-PRO-002', nome: 'ASSESSORIA E ACOMPANHAMENTO DE OBRA', tipoServico: 'ENGENHARIA' },
    { id: 's5', codigo: 'ENG-PRO-080', nome: 'HORA TÉCNICA DE ASSESSORIA', tipoServico: 'ENGENHARIA' },
    { id: 's6', codigo: 'ENG-PRO-001', nome: 'AGENDAMENTO DE VISTORIA / DESLIGAMENTO', tipoServico: 'PROJETOS' },
    { id: 's7', codigo: 'ENG-PRO-007', nome: 'ACOMPANHAMENTO TÉCNICO JUNTO A CONCESSIONARIA', tipoServico: 'PROJETOS' },
  ];
  const { byId, byNome, byCodigo } = buildServicoLookupMaps(servicos);

  describe('isServicoClassificacaoEngenhariaProjetos', () => {
    it('aceita tipoServico ENGENHARIA ou PROJETOS', () => {
      expect(isServicoClassificacaoEngenhariaProjetos({ tipoServico: 'ENGENHARIA' })).toBe(true);
      expect(isServicoClassificacaoEngenhariaProjetos({ tipoServico: 'PROJETOS' })).toBe(true);
    });

    it('rejeita outros tipos', () => {
      expect(isServicoClassificacaoEngenhariaProjetos({ tipoServico: 'MAO_DE_OBRA' })).toBe(false);
      expect(isServicoClassificacaoEngenhariaProjetos({ codigo: 'ENG-PRO-001' })).toBe(false);
    });
  });

  describe('isServicoEngenharia', () => {
    it('detecta código ENG-PRO', () => {
      expect(isServicoEngenharia({ codigo: 'ENG-PRO-001' })).toBe(true);
    });

    it('detecta tipoServico ENGENHARIA/PROJETOS', () => {
      expect(isServicoEngenharia({ tipoServico: 'PROJETOS' })).toBe(true);
    });
  });

  describe('isServicoEngenhariaAtribuivelSetor', () => {
    it('atribuível para qualquer serviço classificado Engenharia/Projetos', () => {
      expect(isServicoEngenhariaAtribuivelSetor({ tipoServico: 'PROJETOS', codigo: 'ENG-PRO-007' })).toBe(true);
      expect(isServicoEngenhariaAtribuivelSetor({ tipoServico: 'ENGENHARIA', codigo: 'ENG-PRO-002' })).toBe(true);
      expect(isServicoEngenhariaAtribuivelSetor({ tipoServico: 'ENGENHARIA', codigo: 'ENG-PRO-080' })).toBe(true);
    });

    it('não atribuível fora da classificação', () => {
      expect(isServicoEngenhariaAtribuivelSetor({ tipoServico: 'MAO_DE_OBRA' })).toBe(false);
    });
  });

  describe('projetoTemServicoEngenhariaAtribuivelSetor', () => {
    it('true para consultoria ENG-PRO classificada como PROJETOS', () => {
      expect(
        projetoTemServicoEngenhariaAtribuivelSetor(
          [{ tipo: 'SERVICO', servicoId: 's7' }],
          byId,
          byNome,
          byCodigo,
        ),
      ).toBe(true);
    });

    it('true para assessoria com tipoServico ENGENHARIA', () => {
      expect(
        projetoTemServicoEngenhariaAtribuivelSetor(
          [{ tipo: 'SERVICO', servicoId: 's4' }],
          byId,
          byNome,
          byCodigo,
        ),
      ).toBe(true);
    });

    it('false sem serviço Engenharia/Projetos', () => {
      expect(
        projetoTemServicoEngenhariaAtribuivelSetor(
          [{ tipo: 'SERVICO', servicoId: 's2' }],
          byId,
          byNome,
          byCodigo,
        ),
      ).toBe(false);
    });

    it('resolve por código ENG-PRO no nome do item', () => {
      expect(
        projetoTemServicoEngenhariaAtribuivelSetor(
          [{ tipo: 'SERVICO', servicoNome: 'ENG-PRO-001 - vistoria' }],
          byId,
          byNome,
          byCodigo,
        ),
      ).toBe(true);
    });
  });

  describe('orcamentoItemTemServicoEngenharia', () => {
    it('item SERVICO com servicoId', () => {
      expect(
        orcamentoItemTemServicoEngenharia({ tipo: 'SERVICO', servicoId: 's1' }, byId, byNome, byCodigo),
      ).toBe(true);
    });
  });

  describe('isServicoExcluidoAtribuicaoSetorEngenharia (legado)', () => {
    it('ainda identifica códigos legados de exclusão', () => {
      expect(isServicoExcluidoAtribuicaoSetorEngenharia({ codigo: 'ENG-PRO-002' })).toBe(true);
    });
  });
});
