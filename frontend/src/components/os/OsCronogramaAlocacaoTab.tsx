import React from 'react';
import type { Obra } from '../../services/obrasService';
import ObrasGanttChart from '../ObrasGanttChart';
import CalendarioAlocacoes from '../CalendarioAlocacoes';
import OsObraStatusBadge from './OsObraStatusBadge';

export interface OsCronogramaAlocacaoTabProps {
  projetoId: string;
  semObra: boolean;
  obra: Obra | null;
  loadingObra: boolean;
  onIniciarObra?: () => void;
}

const OsCronogramaAlocacaoTab: React.FC<OsCronogramaAlocacaoTabProps> = ({
  projetoId,
  semObra,
  obra,
  loadingObra,
  onIniciarObra,
}) => {
  if (semObra) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-dark-border p-8 text-center text-gray-600 dark:text-gray-400">
        Esta ordem de serviço está marcada como <strong>sem obra de campo</strong>. Cronograma e
        alocação de equipes de execução não se aplicam.
      </div>
    );
  }

  if (loadingObra) {
    return <p className="text-gray-500 p-6">Carregando dados da obra...</p>;
  }

  if (!obra) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-8 text-center space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Ainda não há obra vinculada a esta OS. Inicie a obra para acompanhar cronograma e
          alocações aqui.
        </p>
        {onIniciarObra && (
          <button
            type="button"
            onClick={onIniciarObra}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"
          >
            Iniciar obra
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <OsObraStatusBadge
        status={obra.status}
        nomeObra={obra.nomeObra}
        progresso={obra.progresso}
      />

      <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-soft overflow-hidden">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 px-2">
          Timeline da execução
        </h4>
        <ObrasGanttChart obras={[obra]} compact />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-soft">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 px-2">
          Agenda de técnicos (esta obra)
        </h4>
        <CalendarioAlocacoes modo="os" projetoId={projetoId} />
      </div>
    </div>
  );
};

export default OsCronogramaAlocacaoTab;
