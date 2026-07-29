import React, { useState } from 'react';
import type { StatusVistoriaCelesc, VistoriaCelescItem } from '../../services/ordemServicosService';
import {
  ModalReprovacaoVistoria,
  formatItensReprovados,
} from './ModalReprovacaoVistoria';

const STATUS_LABEL: Record<StatusVistoriaCelesc, string> = {
  PENDENTE_PROTOCOLO: 'Pendente Protocolo',
  AGUARDANDO_CELESC: 'Aguardando CELESC',
  REPROVADO: 'Reprovado',
  VISTORIA_APROVADA: 'Vistoria Aprovada',
};

function statusBadgeClass(status: StatusVistoriaCelesc | null | undefined) {
  switch (status) {
    case 'PENDENTE_PROTOCOLO':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'AGUARDANDO_CELESC':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'REPROVADO':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'VISTORIA_APROVADA':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
  }
}

interface VistoriaCelescCardProps {
  item: VistoriaCelescItem;
  busy?: boolean;
  onProtocolar: (id: string) => Promise<void>;
  onAprovar: (id: string) => Promise<void>;
  onReprovar: (
    id: string,
    payload: { dataReprovacao: string; motivos: string; itensReprovados: string[] },
  ) => Promise<void>;
  onOpenOs?: (item: VistoriaCelescItem) => void;
}

export const VistoriaCelescCard: React.FC<VistoriaCelescCardProps> = ({
  item,
  busy = false,
  onProtocolar,
  onAprovar,
  onReprovar,
  onOpenOs,
}) => {
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [modalReprova, setModalReprova] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const status = item.statusVistoria ?? null;
  const qtd = item.qtdReprovacoes ?? item.historicoReprovacoesVistoria?.length ?? 0;
  const numeroOs = item.orcamento?.numeroSequencial
    ? `OS-${String(item.orcamento.numeroSequencial).padStart(4, '0')}`
    : item.id.slice(0, 8);

  const podeProtocolar =
    status === 'PENDENTE_PROTOCOLO' || status === 'REPROVADO';
  const podeAprovarOuReprovar =
    status === 'AGUARDANDO_CELESC' || status === 'REPROVADO';

  const prazoLabel = (() => {
    if (item.dataProtocoloVistoria == null || item.diasDecorridos == null) {
      return null;
    }
    if (item.atrasado) {
      return `Atrasado ${Math.abs(item.diasRestantes ?? 0)}d (há ${item.diasDecorridos}d)`;
    }
    return `${item.diasDecorridos}d decorridos · ${item.diasRestantes ?? 0}d restantes`;
  })();

  return (
    <>
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-soft flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {numeroOs}
              </span>
              {status && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(status)}`}>
                  {STATUS_LABEL[status]}
                </span>
              )}
              {prazoLabel && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    item.atrasado
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                      : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200'
                  }`}
                >
                  {prazoLabel}
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-base font-bold text-gray-900 dark:text-dark-text truncate">
              {item.titulo}
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
              {item.cliente?.nome || 'Cliente não informado'}
            </p>
          </div>
          {onOpenOs && (
            <button
              type="button"
              onClick={() => onOpenOs(item)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Abrir OS
            </button>
          )}
        </div>

        {qtd > 0 && (
          <button
            type="button"
            onClick={() => setHistoricoAberto((v) => !v)}
            className="self-start text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            Reprovado {qtd}x — {historicoAberto ? 'Ocultar motivos' : 'Ver motivos'}
          </button>
        )}

        {historicoAberto && (
          <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/60 dark:bg-red-900/10 p-3 space-y-3 max-h-56 overflow-y-auto">
            {(item.historicoReprovacoesVistoria ?? []).map((h) => (
              <div key={h.id} className="text-sm border-b border-red-100/80 dark:border-red-900/30 pb-2 last:border-0 last:pb-0">
                <div className="font-semibold text-gray-800 dark:text-dark-text">
                  {new Date(h.dataReprovacao).toLocaleDateString('pt-BR')}
                  {h.criadoPor?.name ? ` · ${h.criadoPor.name}` : ''}
                </div>
                <ul className="mt-1 list-disc pl-5 text-gray-700 dark:text-dark-text-secondary">
                  {formatItensReprovados(h.itensReprovados).map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
                <p className="mt-1 text-gray-600 dark:text-dark-text-secondary whitespace-pre-wrap">
                  {h.motivos}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {podeProtocolar && (
            <button
              type="button"
              disabled={busy || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onProtocolar(item.id);
                } finally {
                  setSubmitting(false);
                }
              }}
              className="rounded-xl bg-cyan-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              Confirmar Protocolo
            </button>
          )}
          {podeAprovarOuReprovar && (
            <>
              <button
                type="button"
                disabled={busy || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await onAprovar(item.id);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Aprovar
              </button>
              <button
                type="button"
                disabled={busy || submitting}
                onClick={() => setModalReprova(true)}
                className="rounded-xl border border-red-300 dark:border-red-700 px-3.5 py-2 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
              >
                Registrar Reprova
              </button>
            </>
          )}
        </div>
      </div>

      <ModalReprovacaoVistoria
        open={modalReprova}
        tituloOs={item.titulo}
        submitting={submitting}
        onClose={() => setModalReprova(false)}
        onSubmit={async (payload) => {
          setSubmitting(true);
          try {
            await onReprovar(item.id, payload);
            setModalReprova(false);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </>
  );
};
