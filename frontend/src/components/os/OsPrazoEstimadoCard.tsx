import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Projeto } from '../../services/projetosService';
import { projetosService } from '../../services/projetosService';
import {
  calcularCustoTempoOrcado,
  calcularDiasCorridos,
  calcularDiasEstimadosTexto,
  detectarEstouroPrazoExecucao,
} from '../../utils/osCockpit.util';
import { formatMoeda, formatQuantidade, type ResultadoOsCalculado } from '../../utils/apropriacaoOs';
import { serverDateToInput, formatDateDisplay } from '../../utils/date';

export interface OsPrazoEstimadoCardProps {
  projetoId: string;
  projeto: Pick<
    Projeto,
    | 'status'
    | 'dataInicio'
    | 'dataPrevisao'
    | 'horasEngenhariaOrcadas'
    | 'diariasEquipeOrcadas'
    | 'valorHoraEngenharia'
    | 'valorDiariaEquipe'
  >;
  resumo: ResultadoOsCalculado | null;
  loading?: boolean;
  canEdit: boolean;
  onSaved?: () => void;
}

const OsPrazoEstimadoCard: React.FC<OsPrazoEstimadoCardProps> = ({
  projetoId,
  projeto,
  resumo,
  loading,
  canEdit,
  onSaved,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dataPrevisao: serverDateToInput(projeto.dataPrevisao as string),
    diariasEquipeOrcadas: projeto.diariasEquipeOrcadas ?? 0,
    horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
    valorDiariaEquipe: projeto.valorDiariaEquipe ?? '',
    valorHoraEngenharia: projeto.valorHoraEngenharia ?? '',
  });

  useEffect(() => {
    if (!editing) {
      setForm({
        dataPrevisao: serverDateToInput(projeto.dataPrevisao as string),
        diariasEquipeOrcadas: projeto.diariasEquipeOrcadas ?? 0,
        horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
        valorDiariaEquipe: projeto.valorDiariaEquipe ?? '',
        valorHoraEngenharia: projeto.valorHoraEngenharia ?? '',
      });
    }
  }, [projeto, editing]);

  const diasCorridos = useMemo(
    () => calcularDiasCorridos(projeto.dataInicio),
    [projeto.dataInicio]
  );

  const diariasOrcadas = Number(projeto.diariasEquipeOrcadas) || 0;
  const diariasRealizadas = resumo?.diariasEquipeRealizadas ?? 0;
  const custoOrcado =
    resumo?.custoOrcado ??
    calcularCustoTempoOrcado({
      horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
      diariasEquipeOrcadas: diariasOrcadas,
      valorHoraEngenharia: projeto.valorHoraEngenharia,
      valorDiariaEquipe: projeto.valorDiariaEquipe,
    });

  const estouro = detectarEstouroPrazoExecucao({
    status: projeto.status,
    diariasOrcadas,
    diariasRealizadas,
    diasCorridos,
  });

  const pctDiarias =
    diariasOrcadas > 0 ? Math.min(100, (diariasRealizadas / diariasOrcadas) * 100) : 0;
  const pctDiasCorridos =
    diariasOrcadas > 0 ? Math.min(100, (diasCorridos / diariasOrcadas) * 100) : 0;

  async function handleSave() {
    try {
      setSaving(true);
      const res = await projetosService.atualizar(projetoId, {
        dataPrevisao: form.dataPrevisao,
        diariasEquipeOrcadas: Number(form.diariasEquipeOrcadas) || 0,
        horasEngenhariaOrcadas: Number(form.horasEngenhariaOrcadas) || 0,
        valorDiariaEquipe:
          form.valorDiariaEquipe === '' ? null : Number(form.valorDiariaEquipe),
        valorHoraEngenharia:
          form.valorHoraEngenharia === '' ? null : Number(form.valorHoraEngenharia),
      });
      if (!res.success) {
        toast.error(res.error || 'Erro ao salvar planejamento');
        return;
      }
      toast.success('Planejamento de prazo atualizado');
      setEditing(false);
      onSaved?.();
    } catch {
      toast.error('Erro ao salvar planejamento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 p-6 shadow-soft bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ${
        estouro.estourou
          ? 'border-red-300 dark:border-red-700'
          : 'border-blue-200 dark:border-blue-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Prazo e estimativa</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {calcularDiasEstimadosTexto(diariasOrcadas, projeto.dataInicio, projeto.dataPrevisao)}
            {' · '}
            Custo de tempo: <strong>{formatMoeda(custoOrcado)}</strong>
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => (editing ? void handleSave() : setEditing(true))}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {editing ? (saving ? 'Salvando...' : 'Salvar') : 'Editar'}
          </button>
        )}
      </div>

      {editing && canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 p-4 bg-white/70 dark:bg-dark-card/50 rounded-xl border border-blue-100">
          <label className="text-xs font-medium text-gray-600">
            Data limite
            <input
              type="date"
              value={form.dataPrevisao}
              onChange={(e) => setForm((f) => ({ ...f, dataPrevisao: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Diárias orçadas
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.diariasEquipeOrcadas}
              onChange={(e) =>
                setForm((f) => ({ ...f, diariasEquipeOrcadas: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Horas engenharia
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.horasEngenhariaOrcadas}
              onChange={(e) =>
                setForm((f) => ({ ...f, horasEngenhariaOrcadas: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Valor diária (R$)
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.valorDiariaEquipe}
              onChange={(e) =>
                setForm((f) => ({ ...f, valorDiariaEquipe: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Valor hora eng. (R$)
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.valorHoraEngenharia}
              onChange={(e) =>
                setForm((f) => ({ ...f, valorHoraEngenharia: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          {editing && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Dias corridos vs orçados</span>
            <span className="font-semibold">
              {diasCorridos} / {diariasOrcadas || '—'}
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${estouro.motivo === 'dias_corridos' ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${pctDiasCorridos}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Diárias realizadas</span>
            <span className="font-semibold">
              {formatQuantidade(diariasRealizadas, 'd')} / {formatQuantidade(diariasOrcadas, 'd')}
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${estouro.motivo === 'diarias' ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${pctDiarias}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Data limite:{' '}
          <strong className="text-blue-700 dark:text-blue-400">
            {formatDateDisplay(projeto.dataPrevisao as string) || '—'}
          </strong>
        </span>
        {estouro.estourou && (
          <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-md">
            Estouro de prazo
          </span>
        )}
      </div>
    </div>
  );
};

export default OsPrazoEstimadoCard;
