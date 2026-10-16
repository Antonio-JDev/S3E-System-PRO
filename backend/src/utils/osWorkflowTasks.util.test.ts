import { dadosTasksWorkflow, prazoTaskWorkflow, titulosWorkflowConhecidos } from './osWorkflowTasks.util';

const TEMPLATES = {
  A: ['Vistoria', 'Levantamento', 'Cobrança'],
  B: ['Levantamento', 'Cobrança'],
} as const;

describe('osWorkflowTasks.util', () => {
  const inicio = new Date('2026-10-05T12:00:00.000Z');

  it('espaça o prazo de cada tarefa em 5 dias a partir da data de início', () => {
    const tasks = dadosTasksWorkflow({
      projetoId: 'p1',
      titulos: TEMPLATES.A,
      dataInicio: inicio,
      criadoPorId: 'user-1',
    });

    expect(tasks.map((t) => t.titulo)).toEqual(['Vistoria', 'Levantamento', 'Cobrança']);
    expect(tasks[0].prazo).toEqual(prazoTaskWorkflow(inicio, 0));
    expect(tasks[0].dataInicio).toEqual(tasks[0].prazo);
    expect(tasks[0].prazo.toISOString()).toBe('2026-10-05T12:00:00.000Z');
    expect(tasks[1].prazo.toISOString()).toBe('2026-10-10T12:00:00.000Z');
    expect(tasks[2].prazo.toISOString()).toBe('2026-10-15T12:00:00.000Z');
  });

  it('junta os títulos de todos os checklists para poder remover os anteriores', () => {
    const titulos = titulosWorkflowConhecidos(TEMPLATES);
    expect(titulos).toEqual(expect.arrayContaining(['Vistoria', 'Levantamento', 'Cobrança']));
    expect(titulos.filter((t) => t === 'Levantamento')).toHaveLength(1);
  });
});
