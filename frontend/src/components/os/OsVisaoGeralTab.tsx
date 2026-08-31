import React from 'react';
import { formatDateDisplay } from '../../utils/date';
import { formatMoeda, formatQuantidade, type ResultadoOsCalculado } from '../../utils/apropriacaoOs';
import type { ProjetoDetalhe } from '../ModalVizualizacaoProjeto';
import OsExecucaoCalendarioPanel from './OsExecucaoCalendarioPanel';

export interface DocumentoOs {
  id: string;
  nome: string;
  tipo: string;
  url: string;
}

export interface ProgressoProjetoResumo {
  percentual: number;
  tasksTotal: number;
  tasksConcluidas: number;
  obrasTotal: number;
  obrasConcluidas: number;
}

import { statusBadgeClass, statusLabel } from '../../utils/osStatus.util';

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function CampoInfo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{valor}</p>
    </div>
  );
}

function KpiCard({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-dark-bg/60 px-4 py-3.5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
        {label}
      </p>
      <div className="text-base font-bold text-gray-900 dark:text-white tabular-nums">{valor}</div>
    </div>
  );
}

export interface OsVisaoGeralTabProps {
  projeto: ProjetoDetalhe;
  progresso: ProgressoProjetoResumo;
  resumo: ResultadoOsCalculado | null;
  enderecoObra: string;
  cidadeEstado: string;
  responsavelObra: string;
  engenhariaAtribuicao?: {
    atribuido: boolean;
    responsavelNome?: string | null;
    statusEngenharia?: string | null;
  };
  documentos: DocumentoOs[];
  deletingDocId: string | null;
  vendaVinculada?: { id: string } | null;
  obraVinculada?: { id: string; nome?: string } | null;
  loadingObra?: boolean;
  podeAprovar?: boolean;
  podeGerarObra?: boolean;
  loadingAcao?: boolean;
  onAprovar?: () => void;
  onIniciarObra?: () => void;
  podeVoltarParaAprovada?: boolean;
  onVoltarParaAprovada?: () => void;
  onSemObra?: () => void;
  onAtribuirEngenharia?: () => void;
  onUploadDocumento: () => void;
  onExcluirDocumento: (id: string) => void;
  onViewBudget?: (id: string) => void;
  onViewClient?: (id: string) => void;
  onViewSale?: (id: string) => void;
  onNavigate?: (view: string) => void;
  onClose: () => void;
  onAbrirCronograma: () => void;
}

const OsVisaoGeralTab: React.FC<OsVisaoGeralTabProps> = ({
  projeto,
  progresso,
  resumo,
  enderecoObra,
  cidadeEstado,
  responsavelObra,
  engenhariaAtribuicao,
  documentos,
  deletingDocId,
  vendaVinculada,
  obraVinculada,
  loadingObra,
  podeAprovar,
  podeGerarObra,
  loadingAcao,
  onAprovar,
  onIniciarObra,
  podeVoltarParaAprovada,
  onVoltarParaAprovada,
  onSemObra,
  onAtribuirEngenharia,
  onUploadDocumento,
  onExcluirDocumento,
  onViewBudget,
  onViewClient,
  onViewSale,
  onNavigate,
  onClose,
  onAbrirCronograma,
}) => {
  const horasOrcadas = Number(projeto.horasEngenhariaOrcadas) || 0;
  const diariasOrcadas = Number(projeto.diariasEquipeOrcadas) || 0;
  const horasReal = resumo?.horasEngenhariaRealizadas ?? 0;
  const diariasReal = resumo?.diariasEquipeRealizadas ?? 0;
  const valorOrcado =
    projeto.orcamento?.precoVenda ?? projeto.valorTotal ?? resumo?.receitaOrcada ?? 0;

  const prazoLimite = formatDateDisplay(projeto.dataPrevisao || projeto.dataFim || '') || '—';
  const dataCriacao = projeto.createdAt
    ? new Date(projeto.createdAt).toLocaleDateString('pt-BR')
    : '—';

  const equipe: Array<{ nome: string; papel: string; status?: string }> = [];
  if (projeto.responsavel?.nome) {
    equipe.push({ nome: projeto.responsavel.nome, papel: 'Responsável da OS' });
  }
  if (engenhariaAtribuicao?.atribuido && engenhariaAtribuicao.responsavelNome) {
    equipe.push({
      nome: engenhariaAtribuicao.responsavelNome,
      papel: 'Projetista',
      status: engenhariaAtribuicao.statusEngenharia || undefined,
    });
  }
  if (responsavelObra && responsavelObra !== 'Não atribuído') {
    equipe.push({ nome: responsavelObra, papel: 'Técnico na obra' });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alertas contextuais compactos */}
      {(podeAprovar || podeGerarObra || podeVoltarParaAprovada || (engenhariaAtribuicao && !engenhariaAtribuicao.atribuido && onAtribuirEngenharia)) && (
        <div className="flex flex-wrap gap-2">
          {podeAprovar && onAprovar && (
            <button
              type="button"
              onClick={onAprovar}
              disabled={loadingAcao}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingAcao ? 'Aprovando...' : 'Aprovar OS'}
            </button>
          )}
          {podeGerarObra && !projeto.semObra && onIniciarObra && (
            <>
              <button
                type="button"
                onClick={onIniciarObra}
                disabled={loadingAcao}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50"
              >
                {loadingAcao ? 'Iniciando...' : 'Iniciar obra'}
              </button>
              {onSemObra && (
                <button
                  type="button"
                  onClick={onSemObra}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg"
                >
                  Sem obra de campo
                </button>
              )}
            </>
          )}
          {engenhariaAtribuicao && !engenhariaAtribuicao.atribuido && onAtribuirEngenharia && (
            <button
              type="button"
              onClick={onAtribuirEngenharia}
              className="px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-dark-border text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover"
            >
              Atribuir à Engenharia
            </button>
          )}
          {podeVoltarParaAprovada && onVoltarParaAprovada && (
            <button
              type="button"
              onClick={onVoltarParaAprovada}
              disabled={loadingAcao}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
            >
              {loadingAcao ? 'Processando...' : 'Voltar para Aprovada'}
            </button>
          )}
        </div>
      )}

      {projeto.semObra && (
        <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
          OS marcada como sem obra de campo
          {projeto.justificativaSemObra ? ` — ${projeto.justificativaSemObra}` : ''}
        </p>
      )}

      {/* Barra de progresso */}
      <div className="rounded-xl bg-gray-50 dark:bg-dark-bg/60 px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Progresso geral</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            {progresso.percentual}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-200/80 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full transition-all duration-500"
            style={{ width: `${progresso.percentual}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Tarefas {progresso.tasksConcluidas}/{progresso.tasksTotal}
          {!projeto.semObra && (
            <> · Obras {progresso.obrasConcluidas}/{progresso.obrasTotal}</>
          )}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Criação / Prazo"
          valor={
            <span className="text-sm leading-snug">
              {dataCriacao}
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Limite {prazoLimite}
              </span>
            </span>
          }
        />
        <KpiCard
          label="Horas engenharia"
          valor={
            horasOrcadas > 0 || horasReal > 0
              ? `${formatQuantidade(horasReal, 'h')} / ${formatQuantidade(horasOrcadas, 'h')}`
              : '—'
          }
        />
        <KpiCard
          label="Execução"
          valor={
            diariasOrcadas > 0 || diariasReal > 0
              ? `${formatQuantidade(diariasReal, 'd')} / ${formatQuantidade(diariasOrcadas, 'd')}`
              : '—'
          }
        />
        <KpiCard
          label="Valor orçado"
          valor={valorOrcado > 0 ? formatMoeda(valorOrcado) : '—'}
        />
      </div>

      {/* Corpo 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Informações do projeto & local
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <CampoInfo label="Cliente" valor={projeto.cliente?.nome || '—'} />
              <CampoInfo label="Cidade / Estado" valor={cidadeEstado || '—'} />
              <CampoInfo
                label="Endereço da obra"
                valor={enderecoObra || 'Não informado'}
              />
              <CampoInfo label="Responsável na obra" valor={responsavelObra} />
            </div>
            {projeto.descricao && (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-dark-border pt-4">
                {projeto.descricao}
              </p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Equipe e alocação
            </h3>
            {equipe.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum responsável atribuído.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {equipe.map((p) => (
                  <div
                    key={`${p.papel}-${p.nome}`}
                    className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-gray-100 dark:bg-dark-bg/80"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                      {iniciais(p.nome)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">
                        {p.nome}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.papel}</p>
                    </div>
                    {p.status && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/80 dark:bg-dark-card text-gray-600 dark:text-gray-300">
                        {p.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <OsExecucaoCalendarioPanel projetoId={projeto.id} semObra={Boolean(projeto.semObra)} />
        </div>

        <div className="space-y-6">
          <section className="rounded-xl bg-gray-50 dark:bg-dark-bg/60 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Ações rápidas
            </h3>
            <div className="space-y-1">
              {projeto.orcamento?.id && (
                <button
                  type="button"
                  onClick={() => {
                    if (onViewBudget) {
                      onViewBudget(projeto.orcamento!.id);
                      onClose();
                    } else if (onNavigate) {
                      onNavigate('Orçamentos');
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white dark:hover:bg-dark-card text-left transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Orçamento vinculado
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              )}
              {projeto.cliente?.id && (
                <button
                  type="button"
                  onClick={() => {
                    if (onViewClient) {
                      onViewClient(projeto.cliente.id);
                      onClose();
                    } else if (onNavigate) {
                      onNavigate('Clientes');
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white dark:hover:bg-dark-card text-left transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Perfil do cliente
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              )}
              {vendaVinculada?.id && onViewSale && (
                <button
                  type="button"
                  onClick={() => {
                    onViewSale(vendaVinculada.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white dark:hover:bg-dark-card text-left transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Venda</span>
                  <span className="text-gray-400">→</span>
                </button>
              )}
              {obraVinculada?.id && (
                <button
                  type="button"
                  onClick={onAbrirCronograma}
                  disabled={loadingObra}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white dark:hover:bg-dark-card text-left transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    Cronograma · {obraVinculada.nome || 'Obra'}
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              )}
            </div>
          </section>

          <section className="rounded-xl bg-gray-50 dark:bg-dark-bg/60 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Documentos</h3>
              <button
                type="button"
                onClick={onUploadDocumento}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Upload
              </button>
            </div>
            {documentos.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">ART, TRT e anexos aparecem aqui</p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {documentos.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-white dark:hover:bg-dark-card group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {doc.nome}
                      </p>
                      <p className="text-[10px] text-gray-500">{doc.tipo}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open(doc.url, '_blank')}
                      className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Visualizar"
                    >
                      ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => onExcluirDocumento(doc.id)}
                      disabled={deletingDocId === doc.id}
                      className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Excluir"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default OsVisaoGeralTab;
