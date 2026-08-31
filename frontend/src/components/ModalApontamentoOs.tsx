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
  diariasEquivalentes,
  formatarExecucaoDeQuantidade,
  formatarExecucaoLegivel,
  splitDiariasEquivalentes,
} from '../utils/apontamentoExecucao.util';
import { localYmdFromDate } from '../utils/date';

interface LinhaApontamento {
  id: string;
  tipoRecurso: TipoRecursoApontamento;
  colaboradorId: string;
  quantidade: string;
  diasExecucao: string;
  horasExecucao: string;
}

interface ModalApontamentoOsProps {
  projetoId: string;
  projetoTitulo: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (resumo: ResultadoOsCalculado) => void;
}

function novaLinha(tipo: TipoRecursoApontamento = 'HORA_ENGENHARIA'): LinhaApontamento {
  return {
    id: `${Date.now()}-${Math.random()}`,
    tipoRecurso: tipo,
    colaboradorId: '',
    quantidade: tipo === 'HORA_ENGENHARIA' ? '8' : '1',
    diasExecucao: tipo === 'DIARIA_EQUIPE' ? '1' : '0',
    horasExecucao: '0',
  };
}

function linhaFromItem(item: {
  tipoRecurso: TipoRecursoApontamento;
  quantidade: number;
  userId?: string | null;
  funcionarioId?: string | null;
}): LinhaApontamento {
  const tipo = item.tipoRecurso;
  if (tipo === 'HORA_ENGENHARIA') {
    return {
      id: `${Date.now()}-${Math.random()}`,
      tipoRecurso: tipo,
      colaboradorId: item.userId || '',
      quantidade: String(item.quantidade),
      diasExecucao: '0',
      horasExecucao: '0',
    };
  }
  const { dias, horas } = splitDiariasEquivalentes(item.quantidade);
  return {
    id: `${Date.now()}-${Math.random()}`,
    tipoRecurso: tipo,
    colaboradorId: item.funcionarioId || '',
    quantidade: String(item.quantidade),
    diasExecucao: String(dias),
    horasExecucao: String(horas),
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
    return `${nome}: ${item.quantidade}h`;
  }
  return `${nome}: ${formatarExecucaoDeQuantidade(item.quantidade)}`;
}

const ModalApontamentoOs: React.FC<ModalApontamentoOsProps> = ({
  projetoId,
  projetoTitulo,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [dataApontamento, setDataApontamento] = useState(() => localYmdFromDate(new Date()));
  const [observacoes, setObservacoes] = useState('');
  const [linhas, setLinhas] = useState<LinhaApontamento[]>([novaLinha()]);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [funcionarios, setFuncionarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [resumo, setResumo] = useState<ResultadoOsCalculado | null>(null);
  const [historico, setHistorico] = useState<ApontamentoOs[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEscapeKey(isOpen, onClose);

  const resetFormulario = useCallback(() => {
    setDataApontamento(localYmdFromDate(new Date()));
    setObservacoes('');
    setLinhas([novaLinha()]);
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
        setUsuarios(
          lista.map((u: any) => ({
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
            next.diasExecucao = '0';
            next.horasExecucao = '0';
          } else {
            next.quantidade = '1';
            next.diasExecucao = '1';
            next.horasExecucao = '0';
          }
        }
        return next;
      })
    );
  };

  const linhaParaPayload = (l: LinhaApontamento): ApontamentoItemPayload | null => {
    if (!l.colaboradorId) return null;

    if (l.tipoRecurso === 'HORA_ENGENHARIA') {
      const qtd = Number(l.quantidade);
      if (!Number.isFinite(qtd) || qtd <= 0) return null;
      return {
        tipoRecurso: l.tipoRecurso,
        quantidade: qtd,
        userId: l.colaboradorId,
      };
    }

    const dias = Number(l.diasExecucao) || 0;
    const horas = Number(l.horasExecucao) || 0;
    if (dias <= 0 && horas <= 0) return null;
    const qtd = diariasEquivalentes(dias, horas);
    if (qtd <= 0) return null;
    return {
      tipoRecurso: l.tipoRecurso,
      quantidade: qtd,
      funcionarioId: l.colaboradorId,
    };
  };

  const validarLinhas = (): ApontamentoItemPayload[] | null => {
    const itens: ApontamentoItemPayload[] = [];
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
        itens.push({
          tipoRecurso: l.tipoRecurso,
          quantidade: qtd,
          userId: l.colaboradorId,
        });
      } else {
        const dias = Number(l.diasExecucao) || 0;
        const horas = Number(l.horasExecucao) || 0;
        if (dias <= 0 && horas <= 0) {
          toast.error(`Informe dias e/ou horas na execução (linha ${n})`);
          return null;
        }
        const qtd = diariasEquivalentes(dias, horas);
        itens.push({
          tipoRecurso: l.tipoRecurso,
          quantidade: qtd,
          funcionarioId: l.colaboradorId,
        });
      }
    }
    if (itens.length === 0) {
      toast.error('Adicione ao menos um colaborador com tempo alocado');
      return null;
    }
    return itens;
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
    const itens = validarLinhas();
    if (!itens) return;

    setSaving(true);
    try {
      const payload = {
        dataApontamento,
        observacoes: observacoes.trim() || undefined,
        itens,
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
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const iniciarEdicao = (apontamento: ApontamentoOs) => {
    const dataStr =
      typeof apontamento.dataApontamento === 'string'
        ? apontamento.dataApontamento.slice(0, 10)
        : localYmdFromDate(new Date(apontamento.dataApontamento));
    setEditandoId(apontamento.id);
    setDataApontamento(dataStr);
    setObservacoes(apontamento.observacoes || '');
    setLinhas(
      apontamento.itens.length > 0
        ? apontamento.itens.map((item) =>
            linhaFromItem({
              tipoRecurso: item.tipoRecurso,
              quantidade: item.quantidade,
              userId: item.user?.id,
              funcionarioId: item.funcionario?.id,
            })
          )
        : [novaLinha()]
    );
  };

  const cancelarEdicao = () => {
    resetFormulario();
  };

  const payloadPreview = useMemo(
    () => linhas.map((l) => linhaParaPayload(l)).filter(Boolean),
    [linhas]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border max-h-[92vh] flex flex-col overflow-hidden">
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
                    onChange={(e) => setDataApontamento(e.target.value)}
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
                    onClick={() => setLinhas((prev) => [...prev, novaLinha()])}
                  >
                    + Adicionar linha
                  </button>
                </div>

                <div className="space-y-2">
                  {linhas.map((linha, idx) => {
                    const dias = Number(linha.diasExecucao) || 0;
                    const horas = Number(linha.horasExecucao) || 0;
                    const equiv =
                      linha.tipoRecurso === 'DIARIA_EQUIPE'
                        ? diariasEquivalentes(dias, horas)
                        : null;

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
                          <div className="grid grid-cols-2 gap-2 max-w-xs">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Diárias</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="input-field w-full text-sm"
                                value={linha.diasExecucao}
                                onChange={(e) =>
                                  atualizarLinha(linha.id, { diasExecucao: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Horas</label>
                              <input
                                type="number"
                                min="0"
                                step="0.25"
                                max="7.75"
                                className="input-field w-full text-sm"
                                value={linha.horasExecucao}
                                onChange={(e) =>
                                  atualizarLinha(linha.id, { horasExecucao: e.target.value })
                                }
                              />
                            </div>
                            {equiv != null && equiv > 0 ? (
                              <p className="col-span-2 text-[10px] text-gray-500">
                                Equivalente: {formatarExecucaoLegivel(dias, horas, equiv)}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {payloadPreview.length === 0 && linhas.some((l) => l.colaboradorId) ? (
                  <p className="text-xs text-amber-600 mt-2">
                    Preencha dias e/ou horas na execução, ou horas na engenharia.
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
                          <strong>{new Date(h.dataApontamento).toLocaleDateString('pt-BR')}</strong>
                          {h.observacoes ? (
                            <span className="text-gray-500"> — {h.observacoes}</span>
                          ) : null}
                          <ul className="mt-1 space-y-0.5 text-gray-600 dark:text-dark-text-secondary">
                            {h.itens.map((i) => (
                              <li key={i.id}>{formatarItemApontamento(i)}</li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
                          onClick={() => iniciarEdicao(h)}
                        >
                          Editar
                        </button>
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
