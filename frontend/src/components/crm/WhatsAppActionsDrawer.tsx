import React, { useEffect, useMemo, useState } from 'react';
import type { WhatsappActionsContextData, WhatsappOrcamentoStatusMode } from '../../services/whatsappChatService';
import type { Cliente } from '../../services/clientesService';

interface WhatsAppActionsDrawerProps {
  open: boolean;
  onClose: () => void;
  chatLabel: string;
  chatPhone: string;
  context: WhatsappActionsContextData | null;
  loading: boolean;
  modeSaving: boolean;
  linkLoading: boolean;
  sendingOrcamentoId: string | null;
  clienteSearch: string;
  onClienteSearchChange: (value: string) => void;
  clientes: Cliente[];
  clientesLoading: boolean;
  onRefresh: () => void;
  onLinkCliente: (clienteId: string) => void;
  onSendOrcamentoPdf: (params: { orcamentoId: string; modeOverride?: WhatsappOrcamentoStatusMode }) => void;
  onChangeMode: (mode: WhatsappOrcamentoStatusMode) => void;
}

type OrcamentoStatusKind = 'pending' | 'sent' | 'approved' | 'rejected' | 'other';

function normalizeStatus(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveOrcamentoStatusKind(status: string): OrcamentoStatusKind {
  const v = normalizeStatus(status);
  if (!v) return 'other';
  if (v.includes('pendente') || v.includes('rascunho')) return 'pending';
  if (v.includes('enviado') || v.includes('proposta enviada')) return 'sent';
  if (v.includes('aprovad')) return 'approved';
  if (v.includes('recusad') || v.includes('reprovad') || v.includes('cancelad') || v.includes('declinad')) return 'rejected';
  return 'other';
}

function statusColorMeta(kind: OrcamentoStatusKind): {
  chipClass: string;
  textClass: string;
  badgeClass: string;
  dot: string;
} {
  switch (kind) {
    case 'pending':
      return {
        chipClass: 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20',
        textClass: 'text-amber-800 dark:text-amber-300',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        dot: '🟠'
      };
    case 'sent':
      return {
        chipClass: 'border-blue-300 bg-blue-50 dark:border-blue-700/60 dark:bg-blue-900/20',
        textClass: 'text-blue-800 dark:text-blue-300',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        dot: '🔵'
      };
    case 'approved':
      return {
        chipClass: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-900/20',
        textClass: 'text-emerald-800 dark:text-emerald-300',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        dot: '🟢'
      };
    case 'rejected':
      return {
        chipClass: 'border-red-300 bg-red-50 dark:border-red-700/60 dark:bg-red-900/20',
        textClass: 'text-red-800 dark:text-red-300',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        dot: '🔴'
      };
    default:
      return {
        chipClass: 'border-slate-300 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-700/20',
        textClass: 'text-slate-700 dark:text-slate-200',
        badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-200',
        dot: '⚪'
      };
  }
}

export const WhatsAppActionsDrawer: React.FC<WhatsAppActionsDrawerProps> = ({
  open,
  onClose,
  chatLabel,
  chatPhone,
  context,
  loading,
  modeSaving,
  linkLoading,
  sendingOrcamentoId,
  clienteSearch,
  onClienteSearchChange,
  clientes,
  clientesLoading,
  onRefresh,
  onLinkCliente,
  onSendOrcamentoPdf,
  onChangeMode,
}) => {
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState('');
  const orcamentos = context?.orcamentos || [];
  const selectedOrcamento = useMemo(
    () => orcamentos.find((o) => o.id === selectedOrcamentoId) || null,
    [orcamentos, selectedOrcamentoId]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedClienteId(context?.cliente?.id || '');
    setSelectedOrcamentoId(context?.orcamentos?.[0]?.id || '');
  }, [open, context?.cliente?.id, context?.orcamentos]);

  const singleApprovedProposal = useMemo(
    () => orcamentos.length === 1 && resolveOrcamentoStatusKind(orcamentos[0].status) === 'approved',
    [orcamentos]
  );

  const pipelineLabel = singleApprovedProposal ? 'Proposta enviada' : context?.pipelineStatus || 'Sem orçamento';
  const pipelineBadgeClass = useMemo(() => {
    const kind = singleApprovedProposal
      ? 'approved'
      : resolveOrcamentoStatusKind(context?.pipelineStatus || 'Sem orçamento');
    return statusColorMeta(kind).badgeClass;
  }, [singleApprovedProposal, context?.pipelineStatus]);

  const selectedStatusKind = resolveOrcamentoStatusKind(selectedOrcamento?.status || '');
  const autoModeAllowed = selectedStatusKind === 'pending';
  const approvedSelected = selectedStatusKind === 'approved';
  const modeValue = context?.statusUpdateMode || 'manual';
  const isSendingAny = Boolean(sendingOrcamentoId);
  const isSelectedSending = Boolean(selectedOrcamentoId && sendingOrcamentoId === selectedOrcamentoId);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-black/30 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl dark:border-dark-border dark:bg-[#0f1b22]">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-border">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-dark-text">Ações</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-dark-text-secondary dark:hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-6">
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-border dark:bg-dark-bg">
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Contato</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-dark-text">{context?.contactName || chatLabel || 'Sem nome'}</p>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">{context?.phone || chatPhone || '-'}</p>
          </section>

          <section className="rounded-xl border border-gray-200 p-3 dark:border-dark-border">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Informações do contato</p>
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-dark-text-secondary dark:hover:bg-white/10"
              >
                Atualizar
              </button>
            </div>
            {loading ? (
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Carregando dados...</p>
            ) : (
              <div className="space-y-1 text-xs text-gray-600 dark:text-dark-text-secondary">
                <p>
                  Lead: <span className="font-medium">{context?.lead?.nome || 'Não identificado'}</span>
                </p>
                <p>
                  Cliente: <span className="font-medium">{context?.cliente?.nome || 'Não vinculado'}</span>
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 p-3 dark:border-dark-border">
            <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Pipeline comercial</p>
            <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${pipelineBadgeClass}`}>
              {pipelineLabel}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
              Status atual do atendimento comercial com base no orçamento vinculado ao contato.
            </p>
          </section>

          <section className="rounded-xl border border-gray-200 p-3 dark:border-dark-border">
            <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Vincular ao cliente cadastrado</p>
            <input
              value={clienteSearch}
              onChange={(e) => onClienteSearchChange(e.target.value)}
              placeholder="Buscar cliente por nome, telefone ou CPF/CNPJ"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
            />
            <select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
            >
              <option value="">{clientesLoading ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.telefone ? `· ${c.telefone}` : ''} {c.cpfCnpj ? `· ${c.cpfCnpj}` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedClienteId || linkLoading}
              onClick={() => onLinkCliente(selectedClienteId)}
              className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {linkLoading ? 'Vinculando...' : 'Vincular contato ao cliente'}
            </button>
          </section>

          <section className="rounded-xl border border-gray-200 p-3 dark:border-dark-border">
            <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">Envio de orçamento no chat</p>
            <label className="mt-2 block text-xs font-medium text-gray-600 dark:text-dark-text-secondary">
              Regra de atualização de status
            </label>
            <select
              value={modeValue}
              onChange={(e) => onChangeMode(e.target.value as WhatsappOrcamentoStatusMode)}
              disabled={modeSaving}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 disabled:opacity-70 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
            >
              <option value="manual">Manual (como está hoje)</option>
              <option value="automatic" disabled={!autoModeAllowed}>
                Automático (apenas orçamento pendente)
              </option>
            </select>
            {!autoModeAllowed ? (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Modo automático fica disponível apenas para orçamento pendente.
              </p>
            ) : null}

            <label className="mt-3 block text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Orçamento</label>
            <select
              value={selectedOrcamentoId}
              onChange={(e) => setSelectedOrcamentoId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text"
            >
              <option value="">Selecione um orçamento</option>
              {orcamentos.map((o) => {
                const meta = statusColorMeta(resolveOrcamentoStatusKind(o.status));
                return (
                <option key={o.id} value={o.id}>
                    {meta.dot} #{o.numeroSequencial} · {o.status} · {o.titulo}
                </option>
                );
              })}
            </select>
            {orcamentos.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {orcamentos.slice(0, 6).map((o) => {
                  const kind = resolveOrcamentoStatusKind(o.status);
                  const meta = statusColorMeta(kind);
                  const selected = selectedOrcamentoId === o.id;
                  const isSendingThis = sendingOrcamentoId === o.id;
                  const modeOverride = kind === 'pending' ? undefined : 'manual';
                  return (
                    <div
                      key={`chip-${o.id}`}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition ${meta.chipClass} ${
                        selected ? 'ring-2 ring-[#00a884]/40' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedOrcamentoId(o.id)}
                        className="w-full text-left"
                        disabled={isSendingAny && !isSendingThis}
                      >
                        <p className={`truncate font-semibold ${meta.textClass}`}>
                          {meta.dot} #{o.numeroSequencial} · {o.status}
                        </p>
                        <p className="truncate text-[11px] text-gray-700 dark:text-gray-300">{o.titulo}</p>
                      </button>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={isSendingAny && !isSendingThis}
                          onClick={() =>
                            onSendOrcamentoPdf({
                              orcamentoId: o.id,
                              modeOverride
                            })
                          }
                          className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSendingThis ? 'Carregando...' : 'Enviar PDF'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {approvedSelected ? (
              <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                Orçamento aprovado: o envio aqui é tratado como revisão manual de PDF.
              </p>
            ) : null}
            <button
              type="button"
              disabled={!selectedOrcamentoId || isSendingAny}
              onClick={() =>
                onSendOrcamentoPdf({
                  orcamentoId: selectedOrcamentoId,
                  modeOverride: autoModeAllowed ? undefined : 'manual'
                })
              }
              className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSelectedSending ? 'Carregando...' : approvedSelected ? 'Enviar revisão do PDF' : 'Enviar PDF do orçamento no chat'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppActionsDrawer;
