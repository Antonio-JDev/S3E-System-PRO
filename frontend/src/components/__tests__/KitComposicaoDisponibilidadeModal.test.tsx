/**
 * Épico 1 — Modal de composição / disponibilidade de kit na OS
 * Rodar: npm run test:run -- KitComposicaoDisponibilidadeModal.test.tsx
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KitComposicaoDisponibilidadeModal, {
  type ComposicaoDisponibilidadeData,
} from '../KitComposicaoDisponibilidadeModal';

vi.mock('../../hooks/useEscapeKey', () => ({
  useEscapeKey: vi.fn(),
}));

const dataCompleto: ComposicaoDisponibilidadeData = {
  kitId: 'k1',
  nomeKit: 'Quadro QDC',
  quantidadeKit: 2,
  completo: true,
  faltantes: [],
  itensEstoque: [
    {
      tipo: 'MATERIAL',
      nome: 'Disjuntor',
      necessario: 4,
      disponivel: 10,
      possuiEstoque: true,
      precisaComprar: false,
      precisaVincularBancoFrio: false,
    },
  ],
  itensBancoFrio: [],
  itensServicos: [],
};

const dataIncompleto: ComposicaoDisponibilidadeData = {
  ...dataCompleto,
  completo: false,
  faltantes: [
    {
      tipo: 'MATERIAL',
      nome: 'Cabo',
      necessario: 5,
      disponivel: 1,
      possuiEstoque: false,
      precisaComprar: true,
      precisaVincularBancoFrio: false,
    },
  ],
  itensEstoque: [
    {
      tipo: 'MATERIAL',
      nome: 'Cabo',
      necessario: 5,
      disponivel: 1,
      possuiEstoque: false,
      precisaComprar: true,
      precisaVincularBancoFrio: false,
    },
  ],
};

describe('KitComposicaoDisponibilidadeModal', () => {
  it('não renderiza quando open é false', () => {
    const { container } = render(
      <KitComposicaoDisponibilidadeModal open={false} onClose={vi.fn()} data={dataCompleto} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('exibe badge Kit completo e bloco Estoque real', () => {
    render(
      <KitComposicaoDisponibilidadeModal open onClose={vi.fn()} data={dataCompleto} />,
    );
    expect(screen.getByText(/Kit completo/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Itens do estoque real/i })).toBeInTheDocument();
    expect(screen.getByText('Disjuntor')).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
  });

  it('exibe badge incompleto e pendências', () => {
    render(
      <KitComposicaoDisponibilidadeModal open onClose={vi.fn()} data={dataIncompleto} />,
    );
    expect(screen.getByText(/Kit incompleto/i)).toBeInTheDocument();
    expect(screen.getByText(/1 pendência/i)).toBeInTheDocument();
    expect(screen.getByText(/Comprar/i)).toBeInTheDocument();
  });

  it('exibe loading sem dados', () => {
    render(<KitComposicaoDisponibilidadeModal open onClose={vi.fn()} loading data={null} />);
    expect(screen.getByText(/Carregando composição/i)).toBeInTheDocument();
  });

  it('chama onClose ao clicar em Fechar', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <KitComposicaoDisponibilidadeModal open onClose={onClose} data={dataCompleto} />,
    );
    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
