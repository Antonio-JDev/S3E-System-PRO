import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projetosService } from '../../services/projetosService';
import {
  calcularCustoTempoOrcado,
  calcularDiasEstimadosTexto,
} from '../../utils/osCockpit.util';
import {
  calcularLeituraOrcadoRealizado,
  type FaixaOrcadoRealizado,
} from '../../utils/osPrazoProgresso.util';
import { formatMoeda, formatQuantidade, type ResultadoOsCalculado } from '../../utils/apropriacaoOs';
import { HORAS_COMERCIAIS_POR_DIA } from '../../utils/custoEventoCalendario';
import { serverDateToInput, formatDateDisplay } from '../../utils/date';

export interface OsPrazoEstimadoCardProps {
  projetoId: string;
  projeto: {
    status: string;
    dataInicio?: string | null;
    dataPrevisao?: string | null;
    dataConclusao?: string | null;
    dataFim?: string | null;
    horasEngenhariaOrcadas?: number | null;
    diariasEquipeOrcadas?: number | null;
    valorHoraEngenharia?: number | null;
    valorDiariaEquipe?: number | null;
  };
  resumo: ResultadoOsCalculado | null;
  loading?: boolean;
  canEdit: boolean;
  onSaved?: () => void;
}

function BarraOrcadoRealizado({
  titulo,
  faixa,
  unidade,
  semApontamento,
}: {
  titulo: string;
  faixa: FaixaOrcadoRealizado;
  unidade: 'h' | 'd';
  semApontamento: boolean;
}) {
  const realizadoTxt = semApontamento ? '—' : formatQuantidade(faixa.realizado, unidade);
  const orcadoTxt = formatQuantidade(faixa.orcado, unidade);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1 gap-2">
        <span>{titulo}</span>
        <span className="font-semibold tabular-nums">
          {realizadoTxt} / {orcadoTxt}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${faixa.barClassName}`}
          style={{ width: `${semApontamento ? 0 : faixa.percentual}%` }}
        />
      </div>
      {faixa.estourou && !semApontamento && (
        <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-300">
          Acima do orçado
        </p>
      )}
    </div>
  );
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
    horasExecucaoOrcadas: (projeto.diariasEquipeOrcadas ?? 0) * HORAS_COMERCIAIS_POR_DIA,
    horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
    valorDiariaEquipe: projeto.valorDiariaEquipe ?? '',
    valorHoraEngenharia: projeto.valorHoraEngenharia ?? '',
  });

  useEffect(() => {
    if (!editing) {
      setForm({
        dataPrevisao: serverDateToInput(projeto.dataPrevisao as string),
        horasExecucaoOrcadas: (projeto.diariasEquipeOrcadas ?? 0) * HORAS_COMERCIAIS_POR_DIA,
        horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
        valorDiariaEquipe: projeto.valorDiariaEquipe ?? '',
        valorHoraEngenharia: projeto.valorHoraEngenharia ?? '',
      });
    }
  }, [projeto, editing]);

  const diariasOrcadas = Number(projeto.diariasEquipeOrcadas) || 0;
  const horasExecucaoOrcadas = diariasOrcadas * HORAS_COMERCIAIS_POR_DIA;
  const horasOrcadas = Number(projeto.horasEngenhariaOrcadas) || 0;
  const horasExecucaoRealizadas = (resumo?.diariasEquipeRealizadas ?? 0) * HORAS_COMERCIAIS_POR_DIA;
  const horasRealizadas = resumo?.horasEngenhariaRealizadas ?? 0;
  const custoOrcado =
    resumo?.custoOrcado ??
    calcularCustoTempoOrcado({
      horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas ?? 0,
      diariasEquipeOrcadas: diariasOrcadas,
      valorHoraEngenharia: projeto.valorHoraEngenharia,
      valorDiariaEquipe: projeto.valorDiariaEquipe,
    });

  const leitura = useMemo(
    () =>
      calcularLeituraOrcadoRealizado({
        horasOrcadas,
        horasRealizadas,
        diariasOrcadas: horasExecucaoOrcadas,
        diariasRealizadas: horasExecucaoRealizadas,
      }),
    [horasOrcadas, horasRealizadas, horasExecucaoOrcadas, horasExecucaoRealizadas],
  );

  async function handleSave() {
    try {
      setSaving(true);
      const res = await projetosService.atualizar(projetoId, {
        dataPrevisao: form.dataPrevisao,
        diariasEquipeOrcadas:
          (Number(form.horasExecucaoOrcadas) || 0) / HORAS_COMERCIAIS_POR_DIA,
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
      className={`rounded-xl border bg-white dark:bg-dark-card p-5 ${
        leitura.estourou
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-dark-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Prazo e estimativa</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {calcularDiasEstimadosTexto(diariasOrcadas, projeto.dataInicio, projeto.dataPrevisao)}
            {' · '}
            Custo de tempo: <strong className="text-gray-800 dark:text-gray-200">{formatMoeda(custoOrcado)}</strong>
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => (editing ? void handleSave() : setEditing(true))}
            disabled={saving || loading}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {editing ? (saving ? 'Salvando...' : 'Salvar') : 'Editar'}
          </button>
        )}
      </div>

      {editing && canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-lg border border-gray-200 dark:border-dark-border">
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
            Horas execução
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.horasExecucaoOrcadas}
              onChange={(e) =>
                setForm((f) => ({ ...f, horasExecucaoOrcadas: Number(e.target.value) }))
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
        <BarraOrcadoRealizado
          titulo="Horas engenharia"
          faixa={leitura.horas}
          unidade="h"
          semApontamento={!resumo}
        />
        <BarraOrcadoRealizado
          titulo="Horas execução"
          faixa={leitura.diarias}
          unidade="h"
          semApontamento={!resumo}
        />
      </div>
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
        Apontado / orçado. A data limite não entra neste progresso.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Data limite:{' '}
          <strong className="text-gray-900 dark:text-white">
            {formatDateDisplay(projeto.dataPrevisao as string) || '—'}
          </strong>
        </span>
        {leitura.temEstimativa && (
          <span className={`text-xs font-medium px-2 py-1 rounded-md ${leitura.badgeClassName}`}>
            {leitura.badge}
          </span>
        )}
      </div>
    </div>
  );
};

export default OsPrazoEstimadoCard;
