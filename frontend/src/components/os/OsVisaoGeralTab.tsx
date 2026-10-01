import React, { useMemo, useState } from 'react';
import { formatDateDisplay, formatDatePtBrInSaoPaulo } from '../../utils/date';
import { formatMoeda, formatQuantidade, type ResultadoOsCalculado } from '../../utils/apropriacaoOs';
import {
  isOsTipoQuadrosPainels,
  isOsWorkflowTipo,
  labelTipoOs,
  OS_TIPOS,
  OS_WORKFLOW_TEMPLATES,
} from '../../utils/osWorkflow.util';
import { montarResumoProdutividadeOs } from '../../utils/osPrazoProgresso.util';
import type { ProjetoDetalhe } from '../ModalVizualizacaoProjeto';
import OsExecucaoCalendarioPanel from './OsExecucaoCalendarioPanel';
import OsFatiasTempoBarras from './OsFatiasTempoBarras';
import OsPrazoEstimadoCard from './OsPrazoEstimadoCard';
import OsPrazoProgressoBar from './OsPrazoProgressoBar';
import type { OsEditFormDraft } from '../../hooks/useOsEditForm';
import { listarUsuariosResponsavelOs } from '../../utils/usuariosResponsavelOs.util';

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
  podeRemoverObra?: boolean;
  onRemoverObra?: () => void;
  onAtribuirEngenharia?: () => void;
  onUploadDocumento: () => void;
  onExcluirDocumento: (id: string) => void;
  onViewBudget?: (id: string) => void;
  onViewClient?: (id: string) => void;
  onViewSale?: (id: string) => void;
  onNavigate?: (view: string) => void;
  onClose: () => void;
  onAbrirCronograma: () => void;
  tipoOs?: string;
  podeAlterarTipoOs?: boolean;
  alterandoTipoOs?: boolean;
  onAlterarTipoOs?: (tipo: string) => void | Promise<void>;
  podeEditarPrazo?: boolean;
  onPrazoEstimadoSaved?: () => void | Promise<void>;
  /** Modo edição unificado no cockpit (Fase 2) */
  isEditing?: boolean;
  editDraft?: OsEditFormDraft;
  onEditDraftChange?: (partial: Partial<OsEditFormDraft>) => void;
  editSaving?: boolean;
  onSaveEdit?: () => void | Promise<void>;
  onCancelEdit?: () => void;
  clientesOptions?: Array<{ id: string; nome: string; documento?: string }>;
  usuariosOptions?: Array<{ id: string; nome: string; role?: string }>;
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
  podeRemoverObra,
  onRemoverObra,
  onAtribuirEngenharia,
  onUploadDocumento,
  onExcluirDocumento,
  onViewBudget,
  onViewClient,
  onViewSale,
  onNavigate,
  onClose,
  onAbrirCronograma,
  tipoOs,
  podeAlterarTipoOs,
  alterandoTipoOs,
  onAlterarTipoOs,
  podeEditarPrazo = false,
  onPrazoEstimadoSaved,
  isEditing = false,
  editDraft,
  onEditDraftChange,
  editSaving = false,
  onSaveEdit,
  onCancelEdit,
  clientesOptions = [],
  usuariosOptions = [],
}) => {
  const [buscaCliente, setBuscaCliente] = useState('');
  const [openDropdownCliente, setOpenDropdownCliente] = useState(false);

  const clientesFiltrados = useMemo(() => {
    const q = buscaCliente.trim().toLowerCase();
    if (!q) return clientesOptions.slice(0, 40);
    return clientesOptions
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.documento || '').toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [clientesOptions, buscaCliente]);

  const usuariosResponsavel = useMemo(
    () =>
      listarUsuariosResponsavelOs(usuariosOptions, {
        responsavelId: editDraft?.responsavelId || projeto.responsavelId,
        responsavel: projeto.responsavel,
      }),
    [usuariosOptions, editDraft?.responsavelId, projeto.responsavelId, projeto.responsavel],
  );

  const horasOrcadas = Number(projeto.horasEngenhariaOrcadas) || 0;
  const diariasOrcadas = Number(projeto.diariasEquipeOrcadas) || 0;
  const horasReal = resumo?.horasEngenhariaRealizadas ?? 0;
  const diariasReal = resumo?.diariasEquipeRealizadas ?? 0;
  const valorOrcado =
    projeto.orcamento?.precoVenda ?? projeto.valorTotal ?? resumo?.valorFechado ?? 0;

  const prazoLimite = formatDateDisplay(projeto.dataPrevisao || projeto.dataFim || '') || '—';
  const dataCriacao = projeto.createdAt
    ? formatDatePtBrInSaoPaulo(projeto.createdAt)
    : '—';

  const produtividade = useMemo(
    () =>
      montarResumoProdutividadeOs({
        dataInicio: projeto.dataInicio,
        dataConclusao: projeto.dataConclusao,
        dataFim: projeto.dataFim,
        status: projeto.status,
        resumo,
      }),
    [
      projeto.dataInicio,
      projeto.dataConclusao,
      projeto.dataFim,
      projeto.status,
      resumo,
    ]
  );

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
      {isEditing && editDraft && onEditDraftChange && (
        <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-white/95 dark:bg-dark-card/95 backdrop-blur border-b border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Editando dados gerais da OS
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={editSaving}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-200 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar edição
            </button>
            <button
              type="button"
              onClick={() => void onSaveEdit?.()}
              disabled={editSaving}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {editSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Alertas contextuais compactos */}
      {!isEditing && (podeAprovar || podeGerarObra || podeVoltarParaAprovada || podeRemoverObra || (engenhariaAtribuicao && !engenhariaAtribuicao.atribuido && onAtribuirEngenharia)) && (
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
          {podeRemoverObra && onRemoverObra && (
            <button
              type="button"
              onClick={onRemoverObra}
              disabled={loadingAcao}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 dark:text-red-300 dark:border-red-800 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
            >
              Remover obra
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

      {/* Tipo da OS — define checklist automático no Kanban */}
      {onAlterarTipoOs && (
        <section className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-900/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                Tipo da ordem de serviço
              </label>
              <select
                value={tipoOs || ''}
                disabled={!podeAlterarTipoOs || alterandoTipoOs}
                onChange={(e) => void onAlterarTipoOs(e.target.value)}
                className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-dark-bg text-sm font-medium disabled:opacity-60"
              >
                <option value="" disabled>
                  Selecione o tipo
                </option>
                {OS_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
                {tipoOs && !isOsWorkflowTipo(tipoOs) && (
                  <option value={tipoOs}>{tipoOs}</option>
                )}
              </select>
            </div>
            <div className="text-xs text-blue-800 dark:text-blue-300 sm:max-w-xs">
              {alterandoTipoOs
                ? 'Atualizando checklist...'
                : isOsTipoQuadrosPainels(tipoOs)
                  ? 'Quadros e Painéis: cria checklist no Kanban (materiais, montagem, diagrama, entrega).'
                  : isOsWorkflowTipo(tipoOs)
                    ? `Checklist: ${OS_WORKFLOW_TEMPLATES[tipoOs].slice(0, 4).join(' → ')}…`
                    : 'Defina o tipo para gerar tarefas automáticas no Kanban.'}
            </div>
          </div>
          {tipoOs && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Atual: <strong>{labelTipoOs(tipoOs)}</strong>
            </p>
          )}
        </section>
      )}

      {/* Progresso de execução (azul) + consumo do prazo (amarelo/laranja/vermelho) */}
      <div className="rounded-xl bg-gray-50 dark:bg-dark-bg/60 px-5 py-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-white">
                Progresso de execução
              </span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {progresso.percentual}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-gray-200/80 dark:bg-gray-700 rounded-full overflow-hidden">
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
          <OsPrazoProgressoBar
            variant="full"
            dataInicio={projeto.dataInicio}
            dataPrevisao={projeto.dataPrevisao}
            dataConclusao={projeto.dataConclusao}
            dataFim={projeto.dataFim}
            status={projeto.status}
            diariasOrcadas={diariasOrcadas}
            diariasRealizadas={diariasReal}
          />
        </div>

        {/* Produtividade × apontamentos (MVP) */}
        <div className="pt-3 border-t border-gray-200/80 dark:border-dark-border">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            Produtividade e esforço
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <div className="rounded-lg bg-white/70 dark:bg-dark-card/60 px-3 py-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Duração</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {produtividade.duracaoDias} dia{produtividade.duracaoDias !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="rounded-lg bg-white/70 dark:bg-dark-card/60 px-3 py-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Colaboradores</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {produtividade.colaboradoresDistintos != null
                  ? produtividade.colaboradoresDistintos
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-white/70 dark:bg-dark-card/60 px-3 py-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Horas eng.</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {horasOrcadas > 0 || horasReal > 0
                  ? `${formatQuantidade(horasReal, 'h')} / ${formatQuantidade(horasOrcadas, 'h')}`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-white/70 dark:bg-dark-card/60 px-3 py-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Diárias</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {diariasOrcadas > 0 || diariasReal > 0
                  ? `${formatQuantidade(diariasReal, 'd')} / ${formatQuantidade(diariasOrcadas, 'd')}`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-white/70 dark:bg-dark-card/60 px-3 py-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Custo tempo</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums leading-tight">
                {produtividade.custoOrcado > 0 || produtividade.custoRealizado > 0
                  ? `${formatMoeda(produtividade.custoRealizado)} / ${formatMoeda(produtividade.custoOrcado)}`
                  : '—'}
              </p>
              {produtividade.rendimentoLabel && produtividade.rendimentoValor != null && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {produtividade.rendimentoLabel}: {formatMoeda(produtividade.rendimentoValor)}/h
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <OsFatiasTempoBarras
        projetoId={projeto.id}
        horasEngenhariaOrcadas={horasOrcadas}
        diariasEquipeOrcadas={diariasOrcadas}
      />

      <OsPrazoEstimadoCard
        projetoId={projeto.id}
        projeto={projeto}
        resumo={resumo}
        canEdit={Boolean(podeEditarPrazo) && !isEditing}
        onSaved={() => {
          void onPrazoEstimadoSaved?.();
        }}
      />

      {isEditing && editDraft && onEditDraftChange && (
        <section className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-900/10 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Dados editáveis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={editDraft.titulo}
                onChange={(e) => onEditDraftChange({ titulo: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Descrição
              </label>
              <textarea
                value={editDraft.descricao}
                onChange={(e) => onEditDraftChange({ descricao: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Cliente
              </label>
              <input
                type="text"
                value={
                  editDraft.clienteId
                    ? (clientesOptions.find((c) => c.id === editDraft.clienteId)?.nome ??
                      projeto.cliente?.nome ??
                      '')
                    : buscaCliente
                }
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  if (editDraft.clienteId) onEditDraftChange({ clienteId: '' });
                  setOpenDropdownCliente(true);
                }}
                onFocus={() => setOpenDropdownCliente(true)}
                onBlur={() => setTimeout(() => setOpenDropdownCliente(false), 200)}
                placeholder="Digite para buscar o cliente..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
              />
              {openDropdownCliente && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg py-1">
                  {clientesFiltrados.length === 0 ? (
                    <li className="px-4 py-3 text-gray-500 text-sm">Nenhum cliente encontrado</li>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <li
                        key={cliente.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onEditDraftChange({ clienteId: cliente.id });
                          setBuscaCliente('');
                          setOpenDropdownCliente(false);
                        }}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-hover cursor-pointer text-sm"
                      >
                        {cliente.nome}
                        {cliente.documento ? ` — ${cliente.documento}` : ''}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Gerente do projeto *
              </label>
              <select
                value={editDraft.responsavelId}
                onChange={(e) => onEditDraftChange({ responsavelId: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
              >
                <option value="">Selecione o responsável</option>
                {usuariosResponsavel.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                    {u.role ? ` — ${u.role}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Data de início
              </label>
              <input
                type="date"
                value={editDraft.dataInicio}
                onChange={(e) => onEditDraftChange({ dataInicio: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Data limite / previsão
              </label>
              <input
                type="date"
                value={editDraft.dataPrevisao}
                onChange={(e) => onEditDraftChange({ dataPrevisao: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-cyan-200 dark:border-cyan-800/40 bg-cyan-50 dark:bg-dark-elevated cursor-pointer">
                <input
                  type="checkbox"
                  checked={editDraft.exigeVistoriaCelesc}
                  onChange={(e) =>
                    onEditDraftChange({ exigeVistoriaCelesc: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-cyan-900 dark:text-cyan-300">
                    Exige Vistoria CELESC
                  </span>
                  <span className="block text-xs text-cyan-700 dark:text-cyan-400 mt-0.5">
                    Após a aprovação da OS, o projeto entra na fila da aba Vistorias.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Criação / Prazo"
          valor={
            <span className="text-sm leading-snug">
              {dataCriacao}
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Limite{' '}
                {isEditing && editDraft?.dataPrevisao
                  ? formatDateDisplay(editDraft.dataPrevisao) || prazoLimite
                  : prazoLimite}
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
              <CampoInfo
                label="Cliente"
                valor={
                  isEditing && editDraft?.clienteId
                    ? clientesOptions.find((c) => c.id === editDraft.clienteId)?.nome ||
                      projeto.cliente?.nome ||
                      '—'
                    : projeto.cliente?.nome || '—'
                }
              />
              <CampoInfo label="Cidade / Estado" valor={cidadeEstado || '—'} />
              <CampoInfo
                label="Endereço da obra"
                valor={enderecoObra || 'Não informado'}
              />
              <CampoInfo label="Responsável na obra" valor={responsavelObra} />
            </div>
            {!isEditing && projeto.descricao && (
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
