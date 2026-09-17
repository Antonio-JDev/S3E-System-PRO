import React, { useEffect, useMemo, useState } from 'react';
import type {
  HistoricoReprovacaoVistoria,
  ItemAvaliacaoReprovaVistoria,
} from '../../services/ordemServicosService';

/** Catálogo espelhado do backend (fallback se API não carregar). */
export const ITENS_PADRAO_VISTORIA_CELESC: Array<{ codigo: string; label: string }> = [
  { codigo: 'quadro_medicao', label: 'Quadro de medição' },
  { codigo: 'padrao_entrada', label: 'Padrão de entrada' },
  { codigo: 'aterramento', label: 'Aterramento' },
  { codigo: 'condutores', label: 'Condutores / bitolas' },
  { codigo: 'protecoes', label: 'Dispositivos de proteção (DR/DPS/disjuntores)' },
  { codigo: 'caixa_passagem', label: 'Caixa de passagem / eletrodutos' },
  { codigo: 'fixacao', label: 'Fixação e estrutura' },
  { codigo: 'identificacao', label: 'Identificação / plaqueta' },
  { codigo: 'distancias', label: 'Distâncias de segurança' },
  { codigo: 'documentacao', label: 'Documentação / projeto aprovado' },
];

function hojeInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDateInput(value: string | undefined): string {
  if (!value) return hojeInput();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return hojeInput();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildChecklistInicial(
  salvos?: ItemAvaliacaoReprovaVistoria[] | null,
): ItemAvaliacaoReprovaVistoria[] {
  const porCodigo = new Map((salvos ?? []).map((i) => [i.codigo, i]));
  const base = ITENS_PADRAO_VISTORIA_CELESC.map((padrao) => {
    const salvo = porCodigo.get(padrao.codigo);
    return {
      codigo: padrao.codigo,
      label: padrao.label,
      passou: salvo ? salvo.passou : true,
      justificativa: salvo?.justificativa ?? '',
    };
  });
  for (const salvo of salvos ?? []) {
    if (!ITENS_PADRAO_VISTORIA_CELESC.some((p) => p.codigo === salvo.codigo)) {
      base.push({
        codigo: salvo.codigo,
        label: salvo.label,
        passou: salvo.passou,
        justificativa: salvo.justificativa ?? '',
      });
    }
  }
  return base;
}

export function normalizeItensAvaliacao(
  historico: HistoricoReprovacaoVistoria,
): ItemAvaliacaoReprovaVistoria[] {
  if (Array.isArray(historico.itensAvaliacao) && historico.itensAvaliacao.length > 0) {
    return (historico.itensAvaliacao as ItemAvaliacaoReprovaVistoria[]).map((i) => ({
      codigo: String(i.codigo),
      label: String(i.label),
      passou: Boolean(i.passou),
      justificativa: String(i.justificativa ?? ''),
    }));
  }
  if (Array.isArray(historico.checklist) && historico.checklist.length > 0) {
    return historico.checklist;
  }
  return formatItensReprovados(historico.itensReprovados).map((label) => ({
    codigo: label.toLowerCase().replace(/\s+/g, '_').slice(0, 64),
    label,
    passou: false,
    justificativa: historico.motivos || '',
  }));
}

interface ModalReprovacaoVistoriaProps {
  open: boolean;
  tituloOs: string;
  submitting?: boolean;
  /** Quando definido, modal entra em modo edição da reprova existente */
  reprovaExistente?: HistoricoReprovacaoVistoria | null;
  onClose: () => void;
  onSubmit: (payload: {
    dataReprovacao: string;
    motivos?: string;
    itensAvaliacao: ItemAvaliacaoReprovaVistoria[];
  }) => Promise<void> | void;
}

export const ModalReprovacaoVistoria: React.FC<ModalReprovacaoVistoriaProps> = ({
  open,
  tituloOs,
  submitting = false,
  reprovaExistente = null,
  onClose,
  onSubmit,
}) => {
  const isEdit = Boolean(reprovaExistente?.id);
  const [dataReprovacao, setDataReprovacao] = useState(hojeInput());
  const [motivos, setMotivos] = useState('');
  const [itens, setItens] = useState<ItemAvaliacaoReprovaVistoria[]>(() =>
    buildChecklistInicial(),
  );
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (reprovaExistente) {
      const avaliacao = normalizeItensAvaliacao(reprovaExistente);
      setDataReprovacao(toDateInput(reprovaExistente.dataReprovacao));
      setItens(buildChecklistInicial(avaliacao));
      const autoResumo = avaliacao
        .filter((i) => !i.passou)
        .map((i) => `${i.label}: ${i.justificativa}`)
        .join('\n');
      const motivosSalvos = (reprovaExistente.motivos || '').trim();
      setMotivos(motivosSalvos && motivosSalvos !== autoResumo ? motivosSalvos : '');
    } else {
      setDataReprovacao(hojeInput());
      setMotivos('');
      setItens(buildChecklistInicial());
    }
    setErroLocal(null);
  }, [open, reprovaExistente]);

  const qtdNaoPassou = useMemo(() => itens.filter((i) => !i.passou).length, [itens]);

  if (!open) return null;

  const toggleNaoPassou = (codigo: string, naoPassou: boolean) => {
    setItens((prev) =>
      prev.map((i) =>
        i.codigo === codigo
          ? { ...i, passou: !naoPassou, justificativa: naoPassou ? i.justificativa : '' }
          : i,
      ),
    );
  };

  const setJustificativa = (codigo: string, justificativa: string) => {
    setItens((prev) =>
      prev.map((i) => (i.codigo === codigo ? { ...i, justificativa } : i)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLocal(null);

    const reprovados = itens.filter((i) => !i.passou);
    if (reprovados.length === 0) {
      setErroLocal('Marque ao menos um item como “Não passou”.');
      return;
    }
    const semMotivo = reprovados.filter((i) => !i.justificativa.trim());
    if (semMotivo.length > 0) {
      setErroLocal(
        `Informe a justificativa de: ${semMotivo.map((i) => i.label).join(', ')}`,
      );
      return;
    }

    await onSubmit({
      dataReprovacao,
      motivos: motivos.trim() || undefined,
      itensAvaliacao: itens,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-dark-card shadow-strong border border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border px-6 py-4 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              {isEdit ? 'Editar Reprova CELESC' : 'Registrar Reprova CELESC'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-0.5">
              {tituloOs}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border"
            disabled={submitting}
          >
            Fechar
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="space-y-4 p-6 overflow-y-auto flex-1">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-text">
                Data do Ocorrido *
              </label>
              <input
                type="date"
                required
                value={dataReprovacao}
                onChange={(e) => setDataReprovacao(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2.5 text-sm text-gray-900 dark:text-dark-text"
              />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text">
                    Itens da vistoria *
                  </label>
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                    Marque <strong>Não passou</strong> nos itens reprovados e informe o motivo de
                    cada um. Itens sem marca ficam como passaram.
                  </p>
                </div>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {qtdNaoPassou} não passou(ram)
                </span>
              </div>

              <div className="space-y-2 rounded-xl border border-gray-200 dark:border-dark-border divide-y divide-gray-100 dark:divide-dark-border max-h-72 overflow-y-auto">
                {itens.map((item) => {
                  const naoPassou = !item.passou;
                  return (
                    <div
                      key={item.codigo}
                      className={`p-3 ${
                        naoPassou
                          ? 'bg-red-50/70 dark:bg-red-900/15'
                          : 'bg-white dark:bg-dark-card'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <label className="flex items-center gap-2 cursor-pointer shrink-0 pt-0.5">
                          <input
                            type="checkbox"
                            checked={naoPassou}
                            onChange={(e) => toggleNaoPassou(item.codigo, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                            Não passou
                          </span>
                        </label>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                            {item.label}
                          </div>
                          {naoPassou && (
                            <textarea
                              required
                              rows={2}
                              value={item.justificativa}
                              onChange={(e) => setJustificativa(item.codigo, e.target.value)}
                              placeholder="Justificativa deste item..."
                              className="mt-2 w-full rounded-lg border border-red-200 dark:border-red-800/60 bg-white dark:bg-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-dark-text"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-dark-text">
                Observações gerais{' '}
                <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                rows={2}
                value={motivos}
                onChange={(e) => setMotivos(e.target.value)}
                placeholder="Notas adicionais sobre a reprova..."
                className="w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2.5 text-sm text-gray-900 dark:text-dark-text"
              />
            </div>

            {erroLocal && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{erroLocal}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-dark-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-dark-text-secondary dark:hover:bg-dark-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar Reprova'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export function formatItensReprovados(itens: HistoricoReprovacaoVistoria['itensReprovados']): string[] {
  if (Array.isArray(itens)) return itens.map(String);
  if (typeof itens === 'string') {
    try {
      const parsed = JSON.parse(itens);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return itens.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}
