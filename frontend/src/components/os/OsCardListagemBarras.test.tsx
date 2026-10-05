import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OsCardListagemBarras from './OsCardListagemBarras';

describe('OsCardListagemBarras', () => {
  it('mostra previstas, executadas e consumo do prazo, sem o bloco de estimativa', () => {
    render(
      <OsCardListagemBarras
        horasPrevistas={6}
        horasExecutadas={13}
        prazo={{
          status: 'EXECUCAO',
          diariasOrcadas: 2,
          diariasRealizadas: 3,
          dataInicio: new Date('2026-07-29T12:00:00'),
          dataPrevisao: new Date('2026-08-07T12:00:00'),
          agora: new Date('2026-08-01T12:00:00'),
        }}
      />,
    );

    expect(screen.getByText('Previstas')).toBeInTheDocument();
    expect(screen.getByText('6 h')).toBeInTheDocument();
    expect(screen.getByText('Executadas')).toBeInTheDocument();
    expect(screen.getByText('13 h')).toBeInTheDocument();
    expect(screen.getByText('Consumo do prazo')).toBeInTheDocument();
    expect(screen.getByText('3 / 9 dias')).toBeInTheDocument();
    expect(screen.getByText('No prazo')).toBeInTheDocument();

    expect(screen.queryByText('Estimativa')).not.toBeInTheDocument();
    expect(screen.queryByText('Custo tempo orçado')).not.toBeInTheDocument();
    expect(screen.queryByText('Data limite')).not.toBeInTheDocument();
    expect(screen.queryByText('Diárias realizadas')).not.toBeInTheDocument();
    expect(screen.queryByText('Progresso de execução')).not.toBeInTheDocument();
  });

  it('deixa as horas em branco enquanto o resumo não chegou', () => {
    render(
      <OsCardListagemBarras
        horasPrevistas={null}
        horasExecutadas={null}
        prazo={{ diariasOrcadas: 0, diariasRealizadas: 0 }}
      />,
    );

    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
