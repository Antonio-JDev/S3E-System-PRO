import { describe, it, expect } from 'vitest';
import {
  getStatusEngenhariaStyle,
  getPrioridadeStyle,
  STATUS_ENGENHARIA_OPCOES,
  PRIORIDADE_OPCOES,
} from '../../constants/engenhariaProjeto';

describe('engenhariaProjeto constants', () => {
  it('expõe os status de engenharia atualizados', () => {
    expect(STATUS_ENGENHARIA_OPCOES).toEqual([
      'A fazer',
      'Andamento',
      'Parado',
      'Protocolado',
      'Concluído',
    ]);
    expect(PRIORIDADE_OPCOES).toContain('Média');
  });

  it('retorna classes CSS para badges', () => {
    expect(getStatusEngenhariaStyle('Andamento')).toContain('blue');
    expect(getStatusEngenhariaStyle('Concluído')).toContain('emerald');
    expect(getPrioridadeStyle('Alta')).toContain('red');
  });
});

describe('ProjetosEngenhariaTable (colunas)', () => {
  it('lista colunas da tabela sem Progresso e Ações', () => {
    const colunas = [
      'Nº / Nome',
      'Tipo',
      'Status',
      'Status CELESC',
      'Comentário',
      'Prioridade',
    ];
    expect(colunas).toHaveLength(6);
    expect(colunas).not.toContain('Progresso');
    expect(colunas).not.toContain('Ações');
  });

  it('filtros de status incluem todos os novos valores', () => {
    const filtros = ['Todos', ...STATUS_ENGENHARIA_OPCOES];
    expect(filtros).toContain('A fazer');
    expect(filtros).toContain('Protocolado');
    expect(filtros).toHaveLength(6);
  });
});
