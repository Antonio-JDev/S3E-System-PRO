import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContasAPagar from '../ContasAPagar';
import { AuthContext } from '../../contexts/AuthContext';
import { financeiroService } from '../../services/financeiroService';

vi.mock('../../services/financeiroService', () => ({
  financeiroService: {
    listarContasPagar: vi.fn(),
  },
}));

vi.mock('../../services/axiosApi', () => ({
  axiosApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ContasAPagar - filtro de período', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('default é Mês Atual e filtra estatísticas/lista', async () => {
    // “Hoje” fixo para deixar o teste determinístico
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));

    (financeiroService.listarContasPagar as any).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'in-mes',
          dataVencimento: '2026-04-10T12:00:00.000Z',
          status: 'Pendente',
          valorParcela: 100,
          fornecedorNome: 'A',
          descricao: 'Conta A',
          tipo: 'FORNECEDOR',
        },
        {
          id: 'fora-mes',
          dataVencimento: '2026-03-10T12:00:00.000Z',
          status: 'Pendente',
          valorParcela: 200,
          fornecedorNome: 'B',
          descricao: 'Conta B',
          tipo: 'FORNECEDOR',
        },
      ],
    });

    render(
      <AuthContext.Provider value={{ user: { role: 'admin' } } as any}>
        <ContasAPagar />
      </AuthContext.Provider>
    );

    // localizar o select de período (há mais de um combobox na tela)
    const selects = await screen.findAllByRole('combobox');
    const select = selects.find((s) => s.querySelector('option[value="MesAtual"]')) as HTMLSelectElement | undefined;
    expect(select).toBeTruthy();
    expect((select as HTMLSelectElement).value).toBe('MesAtual');

    // O card “Total de Contas” deve considerar o filtro default
    const totalCard = screen.getByText('Total de Contas').closest('.card-primary') as HTMLElement | null;
    expect(totalCard?.textContent).toContain('1');

    // Ao trocar para "Todos" passa a mostrar 2
    await userEvent.selectOptions(select, 'Todos');
    expect(totalCard?.textContent).toContain('2');
  });
});

