import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EngenhariaTarefasResumo from '../EngenhariaTarefasResumo';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const listarResumoTarefas = vi.fn();
const atualizarStatusTarefaKanban = vi.fn();

vi.mock('../../services/projetosEngenhariaService', () => ({
  projetosEngenhariaService: {
    listarResumoTarefas: (...args: unknown[]) => listarResumoTarefas(...args),
    atualizarStatusTarefaKanban: (...args: unknown[]) => atualizarStatusTarefaKanban(...args),
  },
}));

describe('EngenhariaTarefasResumo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarResumoTarefas.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'task-1',
          titulo: 'Elaborar projeto',
          descricao: null,
          status: 'ToDo',
          prioridade: 'Alta',
          prazo: '2026-06-10T12:00:00.000Z',
          dataInicio: null,
          projetoId: 'proj-1',
          numeroSequencial: 2,
          osTitulo: 'OS teste',
          clienteNome: 'Cliente A',
        },
        {
          id: 'task-2',
          titulo: 'Revisão',
          descricao: null,
          status: 'Doing',
          prioridade: 'Média',
          prazo: null,
          dataInicio: null,
          projetoId: 'proj-2',
          numeroSequencial: 3,
          osTitulo: 'OS 3',
          clienteNome: 'Cliente B',
        },
      ],
    });
    atualizarStatusTarefaKanban.mockResolvedValue({ success: true });
  });

  it('renderiza tarefas e ações de atualizar status', async () => {
    render(<EngenhariaTarefasResumo />);

    expect(await screen.findByText('Elaborar projeto')).toBeInTheDocument();
    expect(screen.getByText('Revisão')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Em andamento' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Concluída' }).length).toBeGreaterThan(0);
  });

  it('atualiza tarefa para em andamento e dispara refresh de progresso', async () => {
    const user = userEvent.setup();
    const onProgressRefresh = vi.fn();

    render(<EngenhariaTarefasResumo onProgressRefresh={onProgressRefresh} />);

    const btn = await screen.findByRole('button', { name: 'Em andamento' });
    await user.click(btn);

    await waitFor(() => {
      expect(atualizarStatusTarefaKanban).toHaveBeenCalledWith('proj-1', 'task-1', 'Em Andamento');
      expect(onProgressRefresh).toHaveBeenCalled();
    });
  });

  it('atualiza tarefa para concluída', async () => {
    const user = userEvent.setup();

    render(<EngenhariaTarefasResumo />);

    const botoesConcluir = await screen.findAllByRole('button', { name: 'Concluída' });
    await user.click(botoesConcluir[0]);

    await waitFor(() => {
      expect(atualizarStatusTarefaKanban).toHaveBeenCalledWith('proj-1', 'task-1', 'Concluído');
    });
  });

  it('não exibe em andamento para tarefa já em andamento', async () => {
    render(<EngenhariaTarefasResumo />);

    await screen.findByText('Revisão');
    const botoesAndamento = screen.queryAllByRole('button', { name: 'Em andamento' });
    expect(botoesAndamento).toHaveLength(1);
  });
});
