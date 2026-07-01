import React, { useEffect, useState } from 'react';
import type { Obra } from '../../services/obrasService';
import { alocacaoObraService, type AlocacaoDTO } from '../../services/AlocacaoObraService';
import { getStatusEngenhariaStyle } from '../../constants/engenhariaProjeto';
import ModalAlocacaoEquipe from '../Obras/ModalAlocacaoEquipe';

export interface OsEquipeAlocacaoPanelProps {
  projetoId: string;
  projetoTitulo?: string;
  responsavelOs?: { id: string; nome: string } | null;
  engenhariaAtribuicao?: {
    atribuido: boolean;
    responsavelNome?: string | null;
    statusEngenharia?: string | null;
  };
  obraStatus?: Obra['status'] | null;
  semObra: boolean;
  canAlocar: boolean;
  onRefresh: () => void;
}

const OBRA_STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog',
  A_FAZER: 'A fazer',
  ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluída',
};

const OsEquipeAlocacaoPanel: React.FC<OsEquipeAlocacaoPanelProps> = ({
  projetoId,
  projetoTitulo,
  responsavelOs,
  engenhariaAtribuicao,
  obraStatus,
  semObra,
  canAlocar,
  onRefresh,
}) => {
  const [alocacoes, setAlocacoes] = useState<AlocacaoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAlocacaoOpen, setModalAlocacaoOpen] = useState(false);

  useEffect(() => {
    void carregarAlocacoes();
  }, [projetoId]);

  async function carregarAlocacoes() {
    if (semObra) {
      setAlocacoes([]);
      return;
    }
    try {
      setLoading(true);
      const res = await alocacaoObraService.getAlocacoesPorProjeto(projetoId);
      setAlocacoes(res.success && Array.isArray(res.data) ? res.data : []);
    } catch {
      setAlocacoes([]);
    } finally {
      setLoading(false);
    }
  }

  function handleModalClose() {
    setModalAlocacaoOpen(false);
    void carregarAlocacoes();
    onRefresh();
  }

  return (
    <>
      <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-dark-card p-6 shadow-soft space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Equipe e alocação</h3>
          {canAlocar && !semObra && (
            <button
              type="button"
              onClick={() => setModalAlocacaoOpen(true)}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"
            >
              Alocar equipe
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Responsável da OS</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {responsavelOs?.nome || 'Não atribuído'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Projetista (engenharia)</p>
            {engenhariaAtribuicao?.atribuido ? (
              <>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {engenhariaAtribuicao.responsavelNome || 'Atribuído'}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold ${getStatusEngenhariaStyle(
                    engenhariaAtribuicao.statusEngenharia || 'A fazer'
                  )}`}
                >
                  {engenhariaAtribuicao.statusEngenharia || 'A fazer'}
                </span>
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">Não atribuído à engenharia</p>
            )}
          </div>
        </div>

        {!semObra && obraStatus && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Status da obra:</span>
            <span className="font-bold text-blue-700 dark:text-blue-400">
              {OBRA_STATUS_LABEL[obraStatus] ?? obraStatus}
            </span>
          </div>
        )}

        {semObra ? (
          <p className="text-sm text-gray-500 italic">Esta OS está marcada como sem obra de campo.</p>
        ) : loading ? (
          <p className="text-sm text-gray-500">Carregando alocações...</p>
        ) : alocacoes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma equipe alocada nesta OS.</p>
        ) : (
          <ul className="space-y-2">
            {alocacoes.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/50"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {a.equipe?.nome
                      ? `Equipe ${a.equipe.nome}`
                      : a.eletricista?.name
                        ? `Eletricista ${a.eletricista.name}`
                        : 'Alocação'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(a.dataInicio).toLocaleDateString('pt-BR')} →{' '}
                    {new Date(a.dataFimPrevisto).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-800">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ModalAlocacaoEquipe
        isOpen={modalAlocacaoOpen}
        onClose={handleModalClose}
        projetoId={projetoId}
        projetoTitulo={projetoTitulo}
      />
    </>
  );
};

export default OsEquipeAlocacaoPanel;
