import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContasAPagar from '../ContasAPagar';
import { AuthContext } from '../../contexts/AuthContext';
import { financeiroService } from '../../services/financeiroService';
import { axiosApiService } from '../../services/axiosApi';

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

describe('ContasAPagar - classificação (Nova Conta)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (financeiroService.listarContasPagar as any).mockResolvedValue({ success: true, data: [] });
    (axiosApiService.get as any).mockResolvedValue({ success: true, data: [] });
  });

  it('deve listar "Cartão de crédito" e "Outras Despesas" no select de Classificação', async () => {
    render(
      <AuthContext.Provider value={{ user: { role: 'admin' } } as any}>
        <ContasAPagar />
      </AuthContext.Provider>
    );

    // Abrir modal "Nova Conta a Pagar"
    const abrir = await screen.findByRole('button', { name: /nova conta a pagar/i });
    await userEvent.click(abrir);

    // Dentro do modal, achar o select de classificação pelo conjunto de options
    const modalHeading = await screen.findByRole('heading', { name: /nova conta a pagar/i });
    const modal = modalHeading.closest('.modal-content') ?? document.body;
    const selects = within(modal).getAllByRole('combobox');
    const classificacaoSelect = selects.find((s) => s.querySelector('option[value="Cartão de crédito"]'));
    expect(classificacaoSelect).toBeTruthy();

    const options = Array.from((classificacaoSelect as HTMLSelectElement).querySelectorAll('option')).map(
      (o) => o.textContent?.trim()
    );

    expect(options).toContain('Cartão de crédito');
    expect(options).toContain('Outras Despesas');
  });
});

