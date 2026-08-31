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
      <div className="rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Equipe e alocação</h3>
          {canAlocar && !semObra && (
            <button
              type="button"
              onClick={() => setModalAlocacaoOpen(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Alocar equipe
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Alocação principal de campo: use o Calendário (arraste a OS, defina datas, equipe e veículos).
          Registros abaixo são do módulo legado de equipes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Responsável da OS</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {responsavelOs?.nome || 'Não atribuído'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Projetista (engenharia)</p>
            {engenhariaAtribuicao?.atribuido ? (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {engenhariaAtribuicao.responsavelNome || 'Atribuído'}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusEngenhariaStyle(
                    engenhariaAtribuicao.statusEngenharia || 'A fazer'
                  )}`}
                >
                  {engenhariaAtribuicao.statusEngenharia || 'A fazer'}
                </span>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Não atribuído à engenharia</p>
            )}
          </div>
        </div>

        {!semObra && obraStatus && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Status da obra:</span>
            <span className="font-medium text-gray-900 dark:text-white">
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
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
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
