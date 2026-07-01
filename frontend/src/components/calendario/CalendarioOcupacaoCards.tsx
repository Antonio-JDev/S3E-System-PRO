import React from 'react';
import type { RelatorioOcupacaoResumoDTO } from '../../services/AlocacaoObraService';

function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

interface CalendarioOcupacaoCardsProps {
  resumo: RelatorioOcupacaoResumoDTO | null;
  loading?: boolean;
  onAtualizar?: () => void;
}

const CalendarioOcupacaoCards: React.FC<CalendarioOcupacaoCardsProps> = ({
  resumo,
  loading,
  onAtualizar,
}) => {
  const cards = [
    {
      label: 'Recursos (equipes + eletricistas)',
      value: resumo?.totalRecursos ?? '—',
      sub: 'Capacidade operacional cadastrada',
      accent: 'text-slate-700',
      border: 'border-slate-200',
    },
    {
      label: 'Ocupados hoje',
      value: resumo?.recursosOcupadosHoje ?? '—',
      sub: `${resumo?.recursosLivresHoje ?? '—'} livres`,
      accent: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      label: 'OS com alocação ativa',
      value: resumo?.osComAlocacaoAtiva ?? '—',
      sub: 'Ordens com equipe ou eletricista',
      accent: 'text-purple-700',
      border: 'border-purple-200',
    },
    {
      label: 'OS em execução',
      value: resumo?.osEmExecucao ?? '—',
      sub: 'Status EXECUCAO ou obra em andamento',
      accent: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      label: 'Ocupação prevista até',
      value: fmtData(resumo?.horizonteOcupacaoGlobal),
      sub: 'Última data fim prevista no pipeline',
      accent: 'text-emerald-800',
      border: 'border-emerald-300',
      highlight: true,
    },
    {
      label: 'Próxima liberação de recurso',
      value: fmtData(resumo?.proximaLiberacaoRecurso),
      sub: 'Quando algum recurso ocupado fica livre',
      accent: 'text-cyan-800',
      border: 'border-cyan-200',
    },
  ];

  return (
    <div className="px-4 pt-4 pb-2 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-gray-800 dark:text-dark-text uppercase tracking-wide">
          Ocupação de equipes e eletricistas
        </h2>
        {onAtualizar && (
          <button
            type="button"
            onClick={onAtualizar}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg disabled:opacity-50"
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border-2 p-3 bg-gray-50/80 dark:bg-dark-bg/50 ${c.border} ${
              c.highlight ? 'ring-2 ring-emerald-200 dark:ring-emerald-800' : ''
            }`}
          >
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase leading-tight">
              {c.label}
            </p>
            <p className={`text-lg font-bold mt-1 ${c.accent} dark:text-dark-text`}>{c.value}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarioOcupacaoCards;
