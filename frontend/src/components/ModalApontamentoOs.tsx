import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  apropriacaoOsService,
  type ApontamentoOs,
  type TipoRecursoApontamento,
} from '../services/apropriacaoOsService';
import { axiosApiService } from '../services/axiosApi';
import { funcionariosService } from '../services/gerenciamentoService';
import {
  formatMoeda,
  formatQuantidade,
  type ResultadoOsCalculado,
} from '../utils/apropriacaoOs';
import { localYmdFromDate } from '../utils/date';

interface LinhaApontamento {
  id: string;
  tipoRecurso: TipoRecursoApontamento;
  colaboradorId: string;
  quantidade: string;
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
  };
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
  const [historicoAberto, setHistoricoAberto] = useState(false);

  useEscapeKey(isOpen, onClose);

  const carregarDados = useCallback(async () => {
    if (!projetoId) return;
    setLoading(true);
    try {
      const [usuariosRes, funcRes, resumoRes, histRes] = await Promise.all([
        axiosApiService.get<any[]>('/api/configuracoes/usuarios'),
        funcionariosService.listar(),
        apropriacaoOsService.obterResumo(projetoId),
        apropriacaoOsService.listar(projetoId, 5),
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
    setDataApontamento(localYmdFromDate(new Date()));
    setObservacoes('');
    setLinhas([novaLinha()]);
    void carregarDados();
  }, [isOpen, carregarDados]);

  const atualizarLinha = (id: string, patch: Partial<LinhaApontamento>) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.tipoRecurso && patch.tipoRecurso !== l.tipoRecurso) {
          next.colaboradorId = '';
          next.quantidade = patch.tipoRecurso === 'HORA_ENGENHARIA' ? '8' : '1';
        }
        return next;
      })
    );
  };

  const payloadItens = useMemo(() => {
    return linhas
      .filter((l) => l.colaboradorId && Number(l.quantidade) > 0)
      .map((l) => ({
        tipoRecurso: l.tipoRecurso,
        quantidade: Number(l.quantidade),
        ...(l.tipoRecurso === 'HORA_ENGENHARIA'
          ? { userId: l.colaboradorId }
          : { funcionarioId: l.colaboradorId }),
      }));
  }, [linhas]);

  const handleSalvar = async () => {
    if (payloadItens.length === 0) {
      toast.error('Adicione ao menos um colaborador com tempo alocado');
      return;
    }

    setSaving(true);
    try {
      const res = await apropriacaoOsService.criar(projetoId, {
        dataApontamento,
        observacoes: observacoes.trim() || undefined,
        itens: payloadItens,
      });

      if (res.success) {
        toast.success('Apontamento registrado');
        const novoResumo = (res as any).resumoAtualizado as ResultadoOsCalculado | undefined;
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
        const histRes = await apropriacaoOsService.listar(projetoId, 5);
        if (histRes.success && histRes.data) setHistorico(histRes.data);
        setLinhas([novaLinha()]);
        setObservacoes('');
      } else {
        toast.error(res.error || 'Erro ao salvar apontamento');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Apontamento rápido (F1)</h2>
            <p className="text-sm text-amber-50 truncate">{projetoTitulo}</p>
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
                  {linhas.map((linha) => (
                    <div
                      key={linha.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_100px_auto] gap-2 items-end p-3 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border"
                    >
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
                          <option value="DIARIA_EQUIPE">Diária equipe</option>
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
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                          {linha.tipoRecurso === 'HORA_ENGENHARIA' ? 'Horas' : 'Diárias'}
                        </label>
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
                      <button
                        type="button"
                        className="text-red-500 text-sm px-2 py-2"
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
                  ))}
                </div>
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
                    <div className="text-[10px] uppercase text-blue-700 font-semibold">Diárias orçadas</div>
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

              {historico.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-gray-600 mb-2"
                    onClick={() => setHistoricoAberto((v) => !v)}
                  >
                    {historicoAberto ? '▼' : '▶'} Últimos apontamentos ({historico.length})
                  </button>
                  {historicoAberto && (
                    <ul className="text-xs space-y-2 text-gray-600 dark:text-dark-text-secondary">
                      {historico.map((h) => (
                        <li key={h.id} className="p-2 rounded-lg bg-gray-50 dark:bg-dark-bg">
                          <strong>{new Date(h.dataApontamento).toLocaleDateString('pt-BR')}</strong>
                          {' — '}
                          {h.itens
                            .map((i) => {
                              const nome =
                                i.user?.name || i.funcionario?.nome || 'Colaborador';
                              const un = i.tipoRecurso === 'HORA_ENGENHARIA' ? 'h' : 'd';
                              return `${nome}: ${i.quantidade}${un}`;
                            })
                            .join(', ')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSalvar}
            disabled={saving || loading}
          >
            {saving ? 'Salvando...' : 'Salvar apontamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalApontamentoOs;
