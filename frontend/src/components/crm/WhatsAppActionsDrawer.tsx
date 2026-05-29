import React, { useEffect, useMemo, useState } from 'react';
import { Check, Link2, RefreshCw, Search, UserRound, X } from 'lucide-react';
import type { WhatsappActionsContextData, WhatsappOrcamentoStatusMode } from '../../services/whatsappChatService';
import type { Cliente } from '../../services/clientesService';
import { filterClientesByTerm } from '../../utils/whatsappActionsDrawer.util';

interface WhatsAppActionsDrawerProps {
  open: boolean;
  onClose: () => void;
  chatLabel: string;
  chatPhone: string;
  context: WhatsappActionsContextData | null;
  loading: boolean;
  modeSaving: boolean;
  linkLoading: boolean;
  unlinkLoading: boolean;
  sendingOrcamentoId: string | null;
  clienteSearch: string;
  onClienteSearchChange: (value: string) => void;
  clientes: Cliente[];
  clientesLoading: boolean;
  onRefresh: () => void;
  onLinkCliente: (clienteId: string) => void;
  onUnlinkCliente: () => void;
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

function DrawerSection({
  title,
  description,
  action,
  children,
  className = ''
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[#e9edef] bg-white p-3.5 shadow-sm dark:border-[#2a3942] dark:bg-[#202c33] ${className}`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[13px] font-semibold text-[#111b21] dark:text-[#e9edef]">{title}</h4>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-[#667781] dark:text-[#8696a0]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
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
  unlinkLoading,
  sendingOrcamentoId,
  clienteSearch,
  onClienteSearchChange,
  clientes,
  clientesLoading,
  onRefresh,
  onLinkCliente,
  onUnlinkCliente,
  onSendOrcamentoPdf,
  onChangeMode,
}) => {
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState('');
  const [orcamentoSearch, setOrcamentoSearch] = useState('');
  const orcamentos = context?.orcamentos || [];
  const filteredClientes = useMemo(
    () => filterClientesByTerm(clientes, clienteSearch),
    [clientes, clienteSearch]
  );
  const filteredOrcamentos = useMemo(() => {
    const q = orcamentoSearch.trim().toLowerCase();
    if (!q) return orcamentos;
    return orcamentos.filter((o) => {
      const hay = `${o.numeroSequencial ?? ''} ${o.titulo ?? ''} ${o.status ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orcamentoSearch, orcamentos]);
  const selectedOrcamento = useMemo(
    () => orcamentos.find((o) => o.id === selectedOrcamentoId) || null,
    [orcamentos, selectedOrcamentoId]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedClienteId(context?.cliente?.id || '');
    setSelectedOrcamentoId(context?.orcamentos?.[0]?.id || '');
    setOrcamentoSearch('');
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
  const clienteSearchTrimmed = clienteSearch.trim();

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-black/40 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-md flex-col border-l border-[#e9edef] bg-[#f0f2f5] shadow-2xl dark:border-[#2a3942] dark:bg-[#111b21]">
        <div className="flex shrink-0 items-center justify-between bg-[#00a884] px-4 py-3 text-white">
          <h3 className="text-[15px] font-semibold tracking-tight">Ações do contato</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 transition hover:bg-white/15"
            aria-label="Fechar painel de ações"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-6">
          <DrawerSection title="Contato em atendimento">
            <p className="truncate text-[14px] font-semibold text-[#111b21] dark:text-[#e9edef]">
              {context?.contactName || chatLabel || 'Sem nome'}
            </p>
            <p className="mt-0.5 text-[12px] text-[#667781] dark:text-[#8696a0]">{context?.phone || chatPhone || '—'}</p>
          </DrawerSection>

          <DrawerSection
            title="Informações do contato"
            action={
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#e9edef] bg-[#f0f2f5] px-2 py-1 text-[11px] font-medium text-[#54656f] transition hover:bg-white dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#aebac1] dark:hover:bg-[#374248]"
              >
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </button>
            }
          >
            {loading ? (
              <p className="text-[12px] text-[#667781] dark:text-[#8696a0]">Carregando dados…</p>
            ) : (
              <div className="space-y-2 text-[12px] text-[#54656f] dark:text-[#aebac1]">
                <p>
                  Lead:{' '}
                  <span className="font-medium text-[#111b21] dark:text-[#e9edef]">
                    {context?.lead?.nome || 'Não identificado'}
                  </span>
                </p>
                <div className="flex items-start justify-between gap-2 rounded-lg bg-[#f0f2f5] px-2.5 py-2 dark:bg-[#2a3942]/60">
                  <p className="min-w-0">
                    Cliente:{' '}
                    <span className="font-medium text-[#111b21] dark:text-[#e9edef]">
                      {context?.cliente?.nome || 'Não vinculado'}
                    </span>
                  </p>
                  {context?.cliente?.id ? (
                    <button
                      type="button"
                      disabled={unlinkLoading}
                      onClick={onUnlinkCliente}
                      className="shrink-0 rounded-md border border-red-200/80 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      {unlinkLoading ? 'Desvinculando…' : 'Desvincular'}
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </DrawerSection>

          <DrawerSection title="Pipeline comercial" description="Status do atendimento com base no orçamento vinculado.">
            <span className={`inline-flex rounded-md px-2.5 py-1 text-[12px] font-semibold ${pipelineBadgeClass}`}>
              {pipelineLabel}
            </span>
          </DrawerSection>

          <DrawerSection
            title="Vincular ao cliente cadastrado"
            description="Busque por nome, telefone ou CPF/CNPJ e selecione o cadastro correto."
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
              <input
                value={clienteSearch}
                onChange={(e) => onClienteSearchChange(e.target.value)}
                placeholder="Buscar cliente…"
                className="w-full rounded-lg border border-[#e9edef] bg-[#f0f2f5] py-2.5 pl-9 pr-8 text-[13px] text-[#111b21] outline-none transition focus:border-[#00a884] focus:bg-white focus:ring-1 focus:ring-[#00a884]/30 dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef] dark:focus:border-[#00a884] dark:focus:bg-[#111b21]"
              />
              {clienteSearchTrimmed ? (
                <button
                  type="button"
                  onClick={() => onClienteSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8696a0] hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="mt-2.5 max-h-52 overflow-y-auto rounded-lg border border-[#e9edef] bg-[#f0f2f5] dark:border-[#2a3942] dark:bg-[#111b21]">
              {clientesLoading ? (
                <p className="px-3 py-4 text-center text-[12px] text-[#667781] dark:text-[#8696a0]">Buscando clientes…</p>
              ) : filteredClientes.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-[#667781] dark:text-[#8696a0]">
                  {clienteSearchTrimmed ? 'Nenhum cliente encontrado para esta busca' : 'Digite para buscar clientes cadastrados'}
                </p>
              ) : (
                <ul className="divide-y divide-[#e9edef] dark:divide-[#2a3942]">
                  {filteredClientes.map((c) => {
                    const active = c.id === selectedClienteId;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedClienteId(c.id)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                            active
                              ? 'bg-[#00a884]/12 dark:bg-[#00a884]/20'
                              : 'hover:bg-white/80 dark:hover:bg-[#202c33]'
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              active ? 'bg-[#00a884] text-white' : 'bg-[#dfe5e7] text-[#54656f] dark:bg-[#2a3942] dark:text-[#aebac1]'
                            }`}
                          >
                            {active ? <Check className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[#111b21] dark:text-[#e9edef]">{c.nome}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[#667781] dark:text-[#8696a0]">
                              {[c.telefone, c.cpfCnpj].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedClienteId || linkLoading}
              onClick={() => onLinkCliente(selectedClienteId)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00a884] px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#008f6f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {linkLoading ? 'Vinculando…' : 'Vincular contato ao cliente'}
            </button>
          </DrawerSection>

          <DrawerSection title="Envio de orçamento no chat">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
              Regra de atualização de status
            </label>
            <select
              value={modeValue}
              onChange={(e) => onChangeMode(e.target.value as WhatsappOrcamentoStatusMode)}
              disabled={modeSaving}
              className="mt-1.5 w-full rounded-lg border border-[#e9edef] bg-[#f0f2f5] px-3 py-2 text-[13px] text-[#111b21] outline-none focus:border-[#00a884] disabled:opacity-70 dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef]"
            >
              <option value="manual">Manual (como está hoje)</option>
              <option value="automatic" disabled={!autoModeAllowed}>
                Automático (apenas orçamento pendente)
              </option>
            </select>
            {!autoModeAllowed ? (
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                Modo automático fica disponível apenas para orçamento pendente.
              </p>
            ) : null}

            <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-[#667781] dark:text-[#8696a0]">
              Orçamento
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
              <input
                value={orcamentoSearch}
                onChange={(e) => setOrcamentoSearch(e.target.value)}
                placeholder="Número, título ou status…"
                className="w-full rounded-lg border border-[#e9edef] bg-[#f0f2f5] py-2.5 pl-9 pr-3 text-[13px] text-[#111b21] outline-none focus:border-[#00a884] focus:bg-white dark:border-[#2a3942] dark:bg-[#2a3942] dark:text-[#e9edef] dark:focus:bg-[#111b21]"
              />
            </div>
            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-[#e9edef] bg-[#f0f2f5] dark:border-[#2a3942] dark:bg-[#111b21]">
              {filteredOrcamentos.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-[#667781] dark:text-[#8696a0]">
                  {orcamentoSearch.trim() ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento disponível'}
                </p>
              ) : (
                <ul className="divide-y divide-[#e9edef] dark:divide-[#2a3942]">
                  {filteredOrcamentos.map((o) => {
                    const kind = resolveOrcamentoStatusKind(o.status);
                    const meta = statusColorMeta(kind);
                    const active = o.id === selectedOrcamentoId;
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrcamentoId(o.id)}
                          className={`w-full px-3 py-2.5 text-left text-xs transition ${
                            active ? 'bg-[#00a884]/12 dark:bg-[#00a884]/20' : 'hover:bg-white/80 dark:hover:bg-[#202c33]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="min-w-0 truncate font-semibold text-[#111b21] dark:text-[#e9edef]">
                              {meta.dot} #{o.numeroSequencial} · {o.titulo}
                            </p>
                            <span
                              className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] ${meta.chipClass} ${meta.textClass}`}
                            >
                              {o.status}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {orcamentos.length > 0 ? (
              <div className="mt-2.5 space-y-2">
                {orcamentos.slice(0, 6).map((o) => {
                  const kind = resolveOrcamentoStatusKind(o.status);
                  const meta = statusColorMeta(kind);
                  const selected = selectedOrcamentoId === o.id;
                  const isSendingThis = sendingOrcamentoId === o.id;
                  const modeOverride = kind === 'pending' ? undefined : 'manual';
                  return (
                    <div
                      key={`chip-${o.id}`}
                      className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${meta.chipClass} ${
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
                        <p className="truncate text-[11px] text-[#54656f] dark:text-[#aebac1]">{o.titulo}</p>
                      </button>
                      <button
                        type="button"
                        disabled={isSendingAny && !isSendingThis}
                        onClick={() =>
                          onSendOrcamentoPdf({
                            orcamentoId: o.id,
                            modeOverride
                          })
                        }
                        className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSendingThis ? 'Enviando…' : 'Enviar PDF'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {approvedSelected ? (
              <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
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
              className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSelectedSending
                ? 'Enviando…'
                : approvedSelected
                  ? 'Enviar revisão do PDF'
                  : 'Enviar PDF do orçamento no chat'}
            </button>
          </DrawerSection>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppActionsDrawer;
