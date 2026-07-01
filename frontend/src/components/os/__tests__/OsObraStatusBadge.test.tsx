import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OsObraStatusBadge from '../OsObraStatusBadge';

describe('OsObraStatusBadge', () => {
  it('exibe mensagem quando não há status de obra', () => {
    render(<OsObraStatusBadge status={null} />);
    expect(screen.getByText(/Obra ainda não iniciada/i)).toBeInTheDocument();
  });

  it('exibe label e progresso para obra em andamento', () => {
    render(
      <OsObraStatusBadge
        status="ANDAMENTO"
        nomeObra="Instalação QDC"
        progresso={65}
      />
    );
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByText('Instalação QDC')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renderiza status concluído', () => {
    render(<OsObraStatusBadge status="CONCLUIDO" nomeObra="Obra finalizada" />);
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });
});
