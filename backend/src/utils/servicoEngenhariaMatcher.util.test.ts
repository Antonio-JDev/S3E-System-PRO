import {
  isServicoEngenharia,
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
  ];
  const { byId, byNome } = buildServicoLookupMaps(servicos);

  describe('isServicoEngenharia', () => {
    it('detecta código ENG-PRO', () => {
      expect(isServicoEngenharia({ codigo: 'ENG-PRO-001' })).toBe(true);
      expect(isServicoEngenharia({ codigo: 'PREFIX-ENG-PRO-99' })).toBe(true);
    });

    it('detecta nome com PROJETO', () => {
      expect(isServicoEngenharia({ nome: 'Elaboração de PROJETO' })).toBe(true);
    });

    it('detecta tipoServico ENGENHARIA/PROJETOS', () => {
      expect(isServicoEngenharia({ tipoServico: 'ENGENHARIA' })).toBe(true);
      expect(isServicoEngenharia({ tipoServico: 'PROJETOS' })).toBe(true);
    });

    it('rejeita serviço comum', () => {
      expect(isServicoEngenharia({ codigo: 'MOB-001', tipoServico: 'MAO_DE_OBRA' })).toBe(false);
    });
  });

  describe('isServicoExcluidoAtribuicaoSetorEngenharia', () => {
    it('exclui códigos de assessoria/consultoria', () => {
      expect(isServicoExcluidoAtribuicaoSetorEngenharia({ codigo: 'ENG-PRO-002' })).toBe(true);
      expect(isServicoExcluidoAtribuicaoSetorEngenharia({ codigo: 'ENG-PRO-105' })).toBe(true);
    });

    it('exclui por nome ASSESSORIA/CONSULTORIA/HORA TÉCNICA', () => {
      expect(isServicoExcluidoAtribuicaoSetorEngenharia({ nome: 'CONSULTORIA ENERGIA' })).toBe(true);
    });

    it('não exclui projeto executável pelo setor', () => {
      expect(isServicoExcluidoAtribuicaoSetorEngenharia({ codigo: 'ENG-PRO-075' })).toBe(false);
    });
  });

  describe('isServicoEngenhariaAtribuivelSetor', () => {
    it('engenharia atribuível quando não é assessoria', () => {
      expect(isServicoEngenhariaAtribuivelSetor({ codigo: 'ENG-PRO-075', tipoServico: 'ENGENHARIA' })).toBe(true);
    });

    it('não atribuível para assessoria', () => {
      expect(isServicoEngenhariaAtribuivelSetor({ codigo: 'ENG-PRO-002', tipoServico: 'ENGENHARIA' })).toBe(false);
    });
  });

  describe('orcamentoItemTemServicoEngenharia', () => {
    it('item SERVICO com servicoId ENG-PRO', () => {
      expect(
        orcamentoItemTemServicoEngenharia({ tipo: 'SERVICO', servicoId: 's1' }, byId, byNome),
      ).toBe(true);
    });

    it('item SERVICO fallback por nome', () => {
      expect(
        orcamentoItemTemServicoEngenharia(
          { tipo: 'SERVICO', servicoNome: 'Projeto Elétrico' },
          byId,
          byNome,
        ),
      ).toBe(true);
    });

    it('item KIT com serviço em itensDoKit', () => {
      expect(
        orcamentoItemTemServicoEngenharia(
          {
            tipo: 'KIT',
            itensDoKit: [{ tipo: 'SERVICO', servicoId: 's1', nome: 'Projeto' }],
          },
          byId,
          byNome,
        ),
      ).toBe(true);
    });

    it('item KIT com serviço em itensFaltantes do kit', () => {
      expect(
        orcamentoItemTemServicoEngenharia(
          {
            tipo: 'KIT',
            kit: { itensFaltantes: [{ tipo: 'SERVICO', servicoNome: 'Projeto Elétrico' }] },
          },
          byId,
          byNome,
        ),
      ).toBe(true);
    });
  });

  describe('projetoTemServicoEngenharia', () => {
    it('retorna true se qualquer item satisfizer', () => {
      expect(
        projetoTemServicoEngenharia(
          [
            { tipo: 'MATERIAL' },
            { tipo: 'SERVICO', servicoId: 's2' },
            { tipo: 'SERVICO', servicoId: 's1' },
          ],
          byId,
          byNome,
        ),
      ).toBe(true);
    });

    it('retorna false sem match', () => {
      expect(
        projetoTemServicoEngenharia([{ tipo: 'SERVICO', servicoId: 's2' }], byId, byNome),
      ).toBe(false);
    });
  });

  describe('projetoTemServicoEngenhariaAtribuivelSetor', () => {
    it('false quando só assessoria ENG-PRO', () => {
      expect(
        projetoTemServicoEngenhariaAtribuivelSetor(
          [{ tipo: 'SERVICO', servicoId: 's4' }],
          byId,
          byNome,
        ),
      ).toBe(false);
    });

    it('true quando há projeto executável', () => {
      expect(
        projetoTemServicoEngenhariaAtribuivelSetor(
          [
            { tipo: 'SERVICO', servicoId: 's4' },
            { tipo: 'SERVICO', servicoId: 's1' },
          ],
          byId,
          byNome,
        ),
      ).toBe(true);
    });
  });

  describe('orcamentoItemTemServicoEngenhariaAtribuivelSetor', () => {
    it('item assessoria não exige setor', () => {
      expect(
        orcamentoItemTemServicoEngenhariaAtribuivelSetor(
          { tipo: 'SERVICO', servicoId: 's5' },
          byId,
          byNome,
        ),
      ).toBe(false);
    });
  });
});
