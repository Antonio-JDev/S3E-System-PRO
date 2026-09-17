import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  apropriacaoOsService,
  type ApontamentoOs,
  type ApontamentoItemPayload,
  type TipoRecursoApontamento,
} from '../services/apropriacaoOsService';
import { axiosApiService } from '../services/axiosApi';
import { funcionariosService } from '../services/gerenciamentoService';
import {
  formatMoeda,
  formatQuantidade,
  type ResultadoOsCalculado,
} from '../utils/apropriacaoOs';
import {
  HORAS_JORNADA_APONTAMENTO,
  calcularHoraExtra,
  decomporQuantidadeNoDia,
  diariasDeHorasTotais,
  formatarExecucaoComHe,
  formatarExecucaoDeQuantidade,
  horasTotaisDoDia,
  separarTotalEmRegularesEHe,
  type ModoApontamentoExecucao,
} from '../utils/apontamentoExecucao.util';
import { nowYmdInSaoPaulo, serverDateToInput, formatDateDisplay, addDaysToYmd } from '../utils/date';
import { usuarioApontamentoEngenharia } from '../utils/apontamentoEngenharia.util';

interface DiaExecucaoLinha {
  id: string;
  data: string;
  horas: string;
  horaExtra: string;
  heManual: boolean;
}

interface LinhaApontamento {
  id: string;
  tipoRecurso: TipoRecursoApontamento;
  colaboradorId: string;
  quantidade: string;
  modo: ModoApontamentoExecucao;
  horasExecucao: string;
  horaExtra: string;
  heManual: boolean;
  diasDetalhe: DiaExecucaoLinha[];
}

interface ModalApontamentoOsProps {
  projetoId: string;
  projetoTitulo: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (resumo: ResultadoOsCalculado) => void;
}

function novoId(): string {
  return `${Date.now()}-${Math.random()}`;
}

function novoDia(
  data: string,
  horasRegulares = '8',
  horaExtra = '0',
  heManual = false
): DiaExecucaoLinha {
  return {
    id: novoId(),
    data,
    horas: horasRegulares,
    horaExtra,
    heManual,
  };
}

/** Se o usuário digitar um total > jornada no campo Horas, separa em regulares + HE. */
function aplicarDigitacaoHoras(
  horasStr: string,
  heAtual: string,
  heManual: boolean
): { horas: string; horaExtra: string; heManual: boolean } {
  const h = Number(horasStr) || 0;
  if (heManual) {
    return { horas: horasStr, horaExtra: heAtual, heManual: true };
  }
  if (h > HORAS_JORNADA_APONTAMENTO) {
    const sep = separarTotalEmRegularesEHe(h);
    return {
      horas: String(sep.horasRegulares),
      horaExtra: String(sep.horaExtra),
      heManual: false,
    };
  }
  return {
    horas: horasStr,
    horaExtra: String(calcularHoraExtra(h)),
    heManual: false,
  };
}

function novaLinha(
  tipo: TipoRecursoApontamento = 'HORA_ENGENHARIA',
  dataBase = nowYmdInSaoPaulo()
): LinhaApontamento {
  return {
    id: novoId(),
    tipoRecurso: tipo,
    colaboradorId: '',
    quantidade: tipo === 'HORA_ENGENHARIA' ? '8' : '1',
    modo: 'UM_DIA',
    horasExecucao: tipo === 'DIARIA_EQUIPE' ? String(HORAS_JORNADA_APONTAMENTO) : '0',
    horaExtra: '0',
    heManual: false,
    diasDetalhe:
      tipo === 'DIARIA_EQUIPE'
        ? [novoDia(dataBase, String(HORAS_JORNADA_APONTAMENTO), '0')]
        : [],
  };
}

function linhaFromItem(
  item: {
    tipoRecurso: TipoRecursoApontamento;
    quantidade: number;
    userId?: string | null;
    funcionarioId?: string | null;
  },
  dataBase: string
): LinhaApontamento {
  const tipo = item.tipoRecurso;
  if (tipo === 'HORA_ENGENHARIA') {
    return {
      id: novoId(),
      tipoRecurso: tipo,
      colaboradorId: item.userId || '',
      quantidade: String(item.quantidade),
      modo: 'UM_DIA',
      horasExecucao: '0',
      horaExtra: '0',
      heManual: false,
      diasDetalhe: [],
    };
  }
  const decomp = decomporQuantidadeNoDia(item.quantidade);
  return {
    id: novoId(),
    tipoRecurso: tipo,
    colaboradorId: item.funcionarioId || '',
    quantidade: String(item.quantidade),
    modo: 'UM_DIA',
    horasExecucao: String(decomp.horasRegulares),
    horaExtra: String(decomp.horaExtra),
    heManual: false,
    diasDetalhe: [
      novoDia(dataBase, String(decomp.horasRegulares), String(decomp.horaExtra)),
    ],
  };
}

function formatarItemApontamento(item: {
  tipoRecurso: TipoRecursoApontamento;
  quantidade: number;
  user?: { name?: string } | null;
  funcionario?: { nome?: string } | null;
}): string {
  const nome = item.user?.name || item.funcionario?.nome || 'Colaborador';
  if (item.tipoRecurso === 'HORA_ENGENHARIA') {
    return `${nome}: ${formatQuantidade(item.quantidade, 'h')}`;
  }
  return `${nome}: ${formatarExecucaoDeQuantidade(item.quantidade)}`;
}

function resumoLinhaExecucao(linha: LinhaApontamento): {
  horasTotais: number;
  horaExtra: number;
  horasRegulares: number;
  diarias: number;
} {
  if (linha.modo === 'VARIOS_DIAS') {
    let horasRegulares = 0;
    let horaExtra = 0;
    for (const d of linha.diasDetalhe) {
      horasRegulares += Number(d.horas) || 0;
      horaExtra += Number(d.horaExtra) || 0;
    }
    horasRegulares = Math.round(horasRegulares * 100) / 100;
    horaExtra = Math.round(horaExtra * 100) / 100;
    const horasTotais = horasTotaisDoDia(horasRegulares, horaExtra);
    return {
      horasTotais,
      horaExtra,
      horasRegulares,
      diarias: diariasDeHorasTotais(horasTotais),
    };
  }
  const horasRegulares = Number(linha.horasExecucao) || 0;
  const horaExtra = Number(linha.horaExtra) || 0;
  const horasTotais = horasTotaisDoDia(horasRegulares, horaExtra);
  return {
    horasTotais,
    horaExtra,
    horasRegulares,
    diarias: diariasDeHorasTotais(horasTotais),
  };
}

const ModalApontamentoOs: React.FC<ModalApontamentoOsProps> = ({
  projetoId,
  projetoTitulo,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [dataApontamento, setDataApontamento] = useState(() => nowYmdInSaoPaulo());
  const [observacoes, setObservacoes] = useState('');
  const [linhas, setLinhas] = useState<LinhaApontamento[]>([novaLinha()]);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [funcionarios, setFuncionarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [resumo, setResumo] = useState<ResultadoOsCalculado | null>(null);
  const [historico, setHistorico] = useState<ApontamentoOs[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEscapeKey(isOpen, onClose);

  const resetFormulario = useCallback(() => {
    const hoje = nowYmdInSaoPaulo();
    setDataApontamento(hoje);
    setObservacoes('');
    setLinhas([novaLinha('HORA_ENGENHARIA', hoje)]);
    setEditandoId(null);
  }, []);

  const carregarDados = useCallback(async () => {
    if (!projetoId) return;
    setLoading(true);
    try {
      const [usuariosRes, funcRes, resumoRes, histRes] = await Promise.all([
        axiosApiService.get<any[]>('/api/configuracoes/usuarios'),
        funcionariosService.listar(),
        apropriacaoOsService.obterResumo(projetoId),
        apropriacaoOsService.listar(projetoId, 50),
      ]);

      if (usuariosRes.success && usuariosRes.data) {
        const lista = Array.isArray(usuariosRes.data) ? usuariosRes.data : [];
        const engenheiros = lista.filter((u: any) => usuarioApontamentoEngenharia(u));
        setUsuarios(
          engenheiros.map((u: any) => ({
            id: u.id,
            nome: u.name || u.nome || u.email,
          }))
        );
      }

      if (funcRes.success && funcRes.data) {
        const lista = Array.isArray(funcRes.data) ? funcRes.data : [];
        setFuncionarios(
          lista
            .filter((f: any) => (f.status || 'Ativo') === 'Ativo')
            .map((f: any) => ({ id: f.id, nome: f.nome }))
        );
      }

      if (resumoRes.success && resumoRes.data) {
        setResumo(resumoRes.data);
      }
      if (histRes.success && histRes.data) {
        setHistorico(histRes.data);
      }
    } catch {
      toast.error('Erro ao carregar dados do apontamento');
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    if (!isOpen) return;
    resetFormulario();
    void carregarDados();
  }, [isOpen, carregarDados, resetFormulario]);

  const atualizarLinha = (id: string, patch: Partial<LinhaApontamento>) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };

        if (patch.tipoRecurso && patch.tipoRecurso !== l.tipoRecurso) {
          next.colaboradorId = '';
          if (patch.tipoRecurso === 'HORA_ENGENHARIA') {
            next.quantidade = '8';
            next.modo = 'UM_DIA';
            next.horasExecucao = '0';
            next.horaExtra = '0';
            next.heManual = false;
            next.diasDetalhe = [];
          } else {
            next.quantidade = '1';
            next.modo = 'UM_DIA';
            next.horasExecucao = String(HORAS_JORNADA_APONTAMENTO);
            next.horaExtra = '0';
            next.heManual = false;
            next.diasDetalhe = [
              novoDia(dataApontamento, String(HORAS_JORNADA_APONTAMENTO), '0'),
            ];
          }
        }

        if (patch.modo && patch.modo !== l.modo && next.tipoRecurso === 'DIARIA_EQUIPE') {
          if (patch.modo === 'VARIOS_DIAS') {
            next.diasDetalhe = [
              novoDia(
                dataApontamento,
                next.horasExecucao || String(HORAS_JORNADA_APONTAMENTO),
                next.horaExtra || '0',
                next.heManual
              ),
            ];
          } else {
            const primeiro = next.diasDetalhe[0];
            next.horasExecucao =
              primeiro?.horas || next.horasExecucao || String(HORAS_JORNADA_APONTAMENTO);
            next.horaExtra = primeiro?.horaExtra || next.horaExtra || '0';
            next.heManual = primeiro?.heManual ?? next.heManual;
          }
        }

        if (
          patch.horasExecucao !== undefined &&
          next.tipoRecurso === 'DIARIA_EQUIPE' &&
          next.modo === 'UM_DIA'
        ) {
          const aplicado = aplicarDigitacaoHoras(
            patch.horasExecucao,
            next.horaExtra,
            Boolean(next.heManual) && patch.horaExtra === undefined
          );
          next.horasExecucao = aplicado.horas;
          next.horaExtra = aplicado.horaExtra;
          next.heManual = aplicado.heManual;
        }

        return next;
      })
    );
  };

  const atualizarDiaLinha = (
    linhaId: string,
    diaId: string,
    patch: Partial<DiaExecucaoLinha>
  ) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== linhaId) return l;
        return {
          ...l,
          diasDetalhe: l.diasDetalhe.map((d) => {
            if (d.id !== diaId) return d;
            if (patch.horas !== undefined && patch.horaExtra === undefined) {
              const heManualAtual =
                patch.heManual !== undefined ? Boolean(patch.heManual) : Boolean(d.heManual);
              const aplicado = aplicarDigitacaoHoras(
                patch.horas,
                d.horaExtra,
                heManualAtual
              );
              return {
                ...d,
                ...patch,
                horas: aplicado.horas,
                horaExtra: aplicado.horaExtra,
                heManual: aplicado.heManual,
              };
            }
            if (patch.horaExtra !== undefined) {
              return { ...d, ...patch, heManual: true };
            }
            return { ...d, ...patch };
          }),
        };
      })
    );
  };

  const aoMudarDataBase = (novaData: string) => {
    setDataApontamento(novaData);
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.tipoRecurso !== 'DIARIA_EQUIPE' || l.diasDetalhe.length === 0) return l;
        const baseAntiga = l.diasDetalhe[0]?.data || dataApontamento;
        return {
          ...l,
          diasDetalhe: l.diasDetalhe.map((d, i) => {
            if (l.modo === 'UM_DIA' || i === 0) {
              return { ...d, data: novaData };
            }
            // Reancora offsets relativos à data base
            const offsetMs =
              new Date(d.data + 'T12:00:00').getTime() -
              new Date(baseAntiga + 'T12:00:00').getTime();
            const offsetDias = Math.round(offsetMs / 86_400_000);
            return { ...d, data: addDaysToYmd(novaData, offsetDias) };
          }),
        };
      })
    );
  };

  const validarLinhas = ():
    | { modo: 'unico'; itens: ApontamentoItemPayload[] }
    | {
        modo: 'varios';
        lotes: Array<{ dataApontamento: string; itens: ApontamentoItemPayload[] }>;
      }
    | null => {
    const itensUnicos: ApontamentoItemPayload[] = [];
    const lotesMap = new Map<string, ApontamentoItemPayload[]>();

    const pushLote = (data: string, item: ApontamentoItemPayload) => {
      const list = lotesMap.get(data) || [];
      list.push(item);
      lotesMap.set(data, list);
    };

    let temVarios = false;

    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      const n = i + 1;
      if (!l.colaboradorId) {
        toast.error(`Selecione o colaborador na linha ${n}`);
        return null;
      }

      if (l.tipoRecurso === 'HORA_ENGENHARIA') {
        const qtd = Number(l.quantidade);
        if (!Number.isFinite(qtd) || qtd <= 0) {
          toast.error(`Informe as horas na linha ${n}`);
          return null;
        }
        const item: ApontamentoItemPayload = {
          tipoRecurso: l.tipoRecurso,
          quantidade: qtd,
          userId: l.colaboradorId,
        };
        itensUnicos.push(item);
        pushLote(dataApontamento, item);
        continue;
      }

      if (l.modo === 'VARIOS_DIAS') {
        temVarios = true;
        const diasComHoras = l.diasDetalhe.filter(
          (d) => horasTotaisDoDia(Number(d.horas) || 0, Number(d.horaExtra) || 0) > 0
        );
        if (diasComHoras.length === 0) {
          toast.error(`Informe horas em ao menos um dia (linha ${n})`);
          return null;
        }
        for (const d of diasComHoras) {
          if (!d.data) {
            toast.error(`Informe a data de cada dia (linha ${n})`);
            return null;
          }
          const total = horasTotaisDoDia(Number(d.horas) || 0, Number(d.horaExtra) || 0);
          const qtd = diariasDeHorasTotais(total);
          if (qtd <= 0) continue;
          pushLote(d.data, {
            tipoRecurso: 'DIARIA_EQUIPE',
            quantidade: qtd,
            funcionarioId: l.colaboradorId,
          });
        }
      } else {
        const total = horasTotaisDoDia(
          Number(l.horasExecucao) || 0,
          Number(l.horaExtra) || 0
        );
        if (total <= 0) {
          toast.error(`Informe as horas na execução (linha ${n})`);
          return null;
        }
        const qtd = diariasDeHorasTotais(total);
        const item: ApontamentoItemPayload = {
          tipoRecurso: 'DIARIA_EQUIPE',
          quantidade: qtd,
          funcionarioId: l.colaboradorId,
        };
        itensUnicos.push(item);
        pushLote(dataApontamento, item);
      }
    }

    if (temVarios) {
      const lotes = [...lotesMap.entries()].map(([data, itens]) => ({
        dataApontamento: data,
        itens,
      }));
      if (lotes.every((l) => l.itens.length === 0)) {
        toast.error('Adicione ao menos um colaborador com tempo alocado');
        return null;
      }
      return { modo: 'varios', lotes };
    }

    if (itensUnicos.length === 0) {
      toast.error('Adicione ao menos um colaborador com tempo alocado');
      return null;
    }
    return { modo: 'unico', itens: itensUnicos };
  };

  const aplicarResumoSalvo = async (res: {
    success?: boolean;
    resumoAtualizado?: ResultadoOsCalculado;
  }) => {
    const novoResumo = res.resumoAtualizado;
    if (novoResumo) {
      setResumo(novoResumo);
      onSaved?.(novoResumo);
    } else {
      const resumoRes = await apropriacaoOsService.obterResumo(projetoId);
      if (resumoRes.success && resumoRes.data) {
        setResumo(resumoRes.data);
        onSaved?.(resumoRes.data);
      }
    }
    const histRes = await apropriacaoOsService.listar(projetoId, 50);
    if (histRes.success && histRes.data) setHistorico(histRes.data);
  };

  const handleSalvar = async () => {
    const validado = validarLinhas();
    if (!validado) return;

    setSaving(true);
    try {
      if (validado.modo === 'unico') {
        const payload = {
          dataApontamento,
          observacoes: observacoes.trim() || undefined,
          itens: validado.itens,
        };

        const res = editandoId
          ? await apropriacaoOsService.atualizar(projetoId, editandoId, payload)
          : await apropriacaoOsService.criar(projetoId, payload);

        if (res.success) {
          toast.success(editandoId ? 'Apontamento atualizado' : 'Apontamento registrado');
          await aplicarResumoSalvo(res as { success: boolean; resumoAtualizado?: ResultadoOsCalculado });
          resetFormulario();
        } else {
          toast.error(res.error || 'Erro ao salvar apontamento');
        }
      } else {
        if (editandoId) {
          toast.error('Em edição, use o modo "1 dia". Para vários dias, cancele e lance novamente.');
          return;
        }
        let ok = 0;
        let lastRes: { success?: boolean; resumoAtualizado?: ResultadoOsCalculado } | null = null;
        for (const lote of validado.lotes) {
          const res = await apropriacaoOsService.criar(projetoId, {
            dataApontamento: lote.dataApontamento,
            observacoes: observacoes.trim() || undefined,
            itens: lote.itens,
          });
          if (!res.success) {
            toast.error(res.error || `Erro ao salvar apontamento de ${formatDateDisplay(lote.dataApontamento)}`);
            if (ok > 0) await aplicarResumoSalvo(lastRes || {});
            return;
          }
          ok += 1;
          lastRes = res as { success: boolean; resumoAtualizado?: ResultadoOsCalculado };
        }
        toast.success(
          ok === 1 ? 'Apontamento registrado' : `${ok} apontamentos registrados (um por dia)`
        );
        await aplicarResumoSalvo(lastRes || {});
        resetFormulario();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const iniciarEdicao = (apontamento: ApontamentoOs) => {
    const data = serverDateToInput(apontamento.dataApontamento) || nowYmdInSaoPaulo();
    setEditandoId(apontamento.id);
    setDataApontamento(data);
    setObservacoes(apontamento.observacoes || '');
    setLinhas(
      apontamento.itens.length > 0
        ? apontamento.itens.map((item) =>
            linhaFromItem(
              {
                tipoRecurso: item.tipoRecurso,
                quantidade: item.quantidade,
                userId: item.user?.id,
                funcionarioId: item.funcionario?.id,
              },
              data
            )
          )
        : [novaLinha('HORA_ENGENHARIA', data)]
    );
  };

  const cancelarEdicao = () => {
    resetFormulario();
  };

  const handleExcluir = async (apontamento: ApontamentoOs) => {
    if (
      !window.confirm(
        `Excluir o apontamento de ${formatDateDisplay(apontamento.dataApontamento)}? Você poderá lançar novamente em seguida.`
      )
    ) {
      return;
    }

    setExcluindoId(apontamento.id);
    try {
      const res = await apropriacaoOsService.excluir(projetoId, apontamento.id);
      if (res.success) {
        toast.success('Apontamento excluído');
        if (editandoId === apontamento.id) {
          cancelarEdicao();
        }
        await aplicarResumoSalvo(res as { success?: boolean; resumoAtualizado?: ResultadoOsCalculado });
      } else {
        toast.error(res.error || 'Erro ao excluir apontamento');
      }
    } catch {
      toast.error('Erro ao excluir apontamento');
    } finally {
      setExcluindoId(null);
    }
  };

  const previewLinhas = useMemo(
    () =>
      linhas
        .filter((l) => l.tipoRecurso === 'DIARIA_EQUIPE' && l.colaboradorId)
        .map((l) => ({ id: l.id, ...resumoLinhaExecucao(l) })),
    [linhas]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-full sm:max-w-5xl lg:max-w-6xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Apontamento rápido (F1)</h2>
            <p className="text-sm text-amber-50 truncate">{projetoTitulo}</p>
            {editandoId ? (
              <p className="text-xs text-amber-100 mt-0.5 font-medium">Editando lançamento</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white text-xl px-2">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
                  <input
                    type="date"
                    className="input-field w-full"
                    value={dataApontamento}
                    onChange={(e) => aoMudarDataBase(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
                  <input
                    className="input-field w-full"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text">Colaboradores do dia</h3>
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                    onClick={() => setLinhas((prev) => [...prev, novaLinha('HORA_ENGENHARIA', dataApontamento)])}
                  >
                    + Adicionar linha
                  </button>
                </div>

                <div className="space-y-2">
                  {linhas.map((linha) => {
                    const resumoLinha =
                      linha.tipoRecurso === 'DIARIA_EQUIPE' ? resumoLinhaExecucao(linha) : null;

                    return (
                      <div
                        key={linha.id}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_auto] gap-2 items-end">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Tipo</label>
                            <select
                              className="select-field w-full text-sm"
                              value={linha.tipoRecurso}
                              onChange={(e) =>
                                atualizarLinha(linha.id, {
                                  tipoRecurso: e.target.value as TipoRecursoApontamento,
                                })
                              }
                            >
                              <option value="HORA_ENGENHARIA">Hora engenharia</option>
                              <option value="DIARIA_EQUIPE">Execução</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Colaborador</label>
                            <select
                              className="select-field w-full text-sm"
                              value={linha.colaboradorId}
                              onChange={(e) =>
                                atualizarLinha(linha.id, { colaboradorId: e.target.value })
                              }
                            >
                              <option value="">Selecione...</option>
                              {(linha.tipoRecurso === 'HORA_ENGENHARIA' ? usuarios : funcionarios).map(
                                (c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="text-red-500 text-sm px-2 py-2 self-end"
                            onClick={() =>
                              setLinhas((prev) =>
                                prev.length <= 1 ? prev : prev.filter((l) => l.id !== linha.id)
                              )
                            }
                            title="Remover linha"
                          >
                            ✕
                          </button>
                        </div>

                        {linha.tipoRecurso === 'HORA_ENGENHARIA' ? (
                          <div className="max-w-[120px]">
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Horas</label>
                            <input
                              type="number"
                              min="0.25"
                              step="0.25"
                              className="input-field w-full text-sm"
                              value={linha.quantidade}
                              onChange={(e) =>
                                atualizarLinha(linha.id, { quantidade: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                                  Período
                                </label>
                                <select
                                  className="select-field w-full text-sm"
                                  value={linha.modo}
                                  disabled={Boolean(editandoId)}
                                  onChange={(e) =>
                                    atualizarLinha(linha.id, {
                                      modo: e.target.value as ModoApontamentoExecucao,
                                    })
                                  }
                                >
                                  <option value="UM_DIA">1 dia</option>
                                  <option value="VARIOS_DIAS">Vários dias</option>
                                </select>
                              </div>

                              {linha.modo === 'UM_DIA' ? (
                                <>
                                  <div>
                                    <label
                                      className="block text-[10px] font-semibold text-gray-500 mb-1"
                                      title="Horas do dia. Se digitar acima da jornada, o excedente vai para HE automaticamente."
                                    >
                                      Horas
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.25"
                                      className="input-field w-full text-sm"
                                      value={linha.horasExecucao}
                                      onChange={(e) =>
                                        atualizarLinha(linha.id, {
                                          horasExecucao: e.target.value,
                                          // Nova digitação de total reaplica split automático
                                          heManual: false,
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label
                                      className="block text-[10px] font-semibold text-gray-500 mb-1"
                                      title={`Excedente acima de ${HORAS_JORNADA_APONTAMENTO}h na mesma data (editável; soma no total)`}
                                    >
                                      HE (editável)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.25"
                                      className="input-field w-full text-sm"
                                      value={linha.horaExtra}
                                      onChange={(e) =>
                                        atualizarLinha(linha.id, {
                                          horaExtra: e.target.value,
                                          heManual: true,
                                        })
                                      }
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="sm:col-span-2 flex items-end gap-2">
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-blue-600 hover:underline py-2"
                                    onClick={() => {
                                      const ultimo = linha.diasDetalhe[linha.diasDetalhe.length - 1];
                                      const proxima = addDaysToYmd(
                                        ultimo?.data || dataApontamento,
                                        1
                                      );
                                      atualizarLinha(linha.id, {
                                        diasDetalhe: [
                                          ...linha.diasDetalhe,
                                          novoDia(
                                            proxima,
                                            String(HORAS_JORNADA_APONTAMENTO),
                                            '0'
                                          ),
                                        ],
                                      });
                                    }}
                                  >
                                    + Adicionar dia
                                  </button>
                                </div>
                              )}
                            </div>

                            {linha.modo === 'VARIOS_DIAS' ? (
                              <div className="space-y-2 border border-dashed border-gray-200 dark:border-dark-border rounded-lg p-2">
                                {linha.diasDetalhe.map((dia, diaIdx) => (
                                  <div
                                    key={dia.id}
                                    className="grid grid-cols-1 sm:grid-cols-[1.1fr_0.8fr_0.8fr_auto] gap-2 items-end"
                                  >
                                    <div>
                                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                                        Dia {diaIdx + 1}
                                      </label>
                                      <input
                                        type="date"
                                        className="input-field w-full text-sm"
                                        value={dia.data}
                                        onChange={(e) =>
                                          atualizarDiaLinha(linha.id, dia.id, {
                                            data: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                                        Horas
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.25"
                                        className="input-field w-full text-sm"
                                        value={dia.horas}
                                        onChange={(e) =>
                                          atualizarDiaLinha(linha.id, dia.id, {
                                            horas: e.target.value,
                                            heManual: false,
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                                        HE
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.25"
                                        className="input-field w-full text-sm"
                                        value={dia.horaExtra}
                                        onChange={(e) =>
                                          atualizarDiaLinha(linha.id, dia.id, {
                                            horaExtra: e.target.value,
                                            heManual: true,
                                          })
                                        }
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className="text-red-500 text-sm px-2 py-2"
                                      disabled={linha.diasDetalhe.length <= 1}
                                      onClick={() =>
                                        atualizarLinha(linha.id, {
                                          diasDetalhe: linha.diasDetalhe.filter(
                                            (d) => d.id !== dia.id
                                          ),
                                        })
                                      }
                                      title="Remover dia"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                <p className="text-[10px] text-gray-500">
                                  Jornada regular: {HORAS_JORNADA_APONTAMENTO}h/dia. Excedente = HE no
                                  mesmo dia (editável). Ao salvar, gera um lançamento por data.
                                </p>
                              </div>
                            ) : null}

                            {resumoLinha && resumoLinha.horasTotais > 0 ? (
                              <p className="text-[10px] text-gray-500">
                                {formatarExecucaoComHe(
                                  resumoLinha.horasRegulares,
                                  resumoLinha.horaExtra,
                                  resumoLinha.diarias
                                )}
                                {' · '}
                                Diária ≈ {HORAS_JORNADA_APONTAMENTO}h (HE não vaza para outro dia)
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {previewLinhas.length === 0 &&
                linhas.some((l) => l.colaboradorId && l.tipoRecurso === 'DIARIA_EQUIPE') ? (
                  <p className="text-xs text-amber-600 mt-2">
                    Informe as horas da execução (acima de {HORAS_JORNADA_APONTAMENTO}h vira HE).
                  </p>
                ) : null}
              </div>

              {resumo && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <div>
                    <div className="text-[10px] uppercase text-blue-700 font-semibold">Eng. orçado</div>
                    <div className="text-sm font-bold">{formatQuantidade(resumo.horasEngenhariaOrcadas, 'h')}</div>
                    <div className={`text-xs ${resumo.estouroHorasEngenharia ? 'text-red-600' : 'text-gray-600'}`}>
                      Real: {formatQuantidade(resumo.horasEngenhariaRealizadas, 'h')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-blue-700 font-semibold">Execução orçada</div>
                    <div className="text-sm font-bold">{formatQuantidade(resumo.diariasEquipeOrcadas, 'd')}</div>
                    <div className={`text-xs ${resumo.estouroDiariasEquipe ? 'text-red-600' : 'text-gray-600'}`}>
                      Real: {formatQuantidade(resumo.diariasEquipeRealizadas, 'd')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-blue-700 font-semibold">Custo realizado</div>
                    <div className="text-sm font-bold">{formatMoeda(resumo.custoRealizado)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-blue-700 font-semibold">Resultado</div>
                    <div className={`text-sm font-bold ${resumo.resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatMoeda(resumo.resultado)}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-text mb-2">
                  Lançamentos registrados ({historico.length})
                </h3>
                {historico.length === 0 ? (
                  <p className="text-xs text-gray-500">Nenhum apontamento ainda.</p>
                ) : (
                  <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
                    {historico.map((h) => (
                      <li
                        key={h.id}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <strong>{formatDateDisplay(h.dataApontamento)}</strong>
                          {h.observacoes ? (
                            <span className="text-gray-500"> — {h.observacoes}</span>
                          ) : null}
                          <ul className="mt-1 space-y-0.5 text-gray-600 dark:text-dark-text-secondary">
                            {h.itens.map((i) => (
                              <li key={i.id}>{formatarItemApontamento(i)}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex shrink-0 flex-row sm:flex-col items-stretch gap-2">
                          <button
                            type="button"
                            className="min-h-[36px] min-w-[72px] px-3 py-1.5 rounded-lg border border-blue-500 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                            onClick={() => iniciarEdicao(h)}
                            disabled={Boolean(excluindoId)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="min-h-[36px] min-w-[72px] px-3 py-1.5 rounded-lg border border-red-500 bg-transparent text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            onClick={() => void handleExcluir(h)}
                            disabled={excluindoId === h.id || saving}
                          >
                            {excluindoId === h.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
          {editandoId ? (
            <button type="button" className="btn-secondary" onClick={cancelarEdicao}>
              Cancelar edição
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Fechar
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={handleSalvar}
            disabled={saving || loading}
          >
            {saving ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Salvar apontamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalApontamentoOs;
