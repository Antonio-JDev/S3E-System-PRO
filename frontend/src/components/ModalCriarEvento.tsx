import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/AuthContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  eventosCalendarioService,
  type EquipePreMontadaResumo,
  type EventoCalendario,
  type EventoStatus,
  type EventoTipo,
  type FuncionarioEquipeResumo,
  type OrcamentoPreenchido,
} from '../services/eventosCalendarioService';
import { calcularCustoEvento } from '../utils/custoEventoCalendario';
import { isAdmin, isDeveloper } from '../utils/permissions';

type ModoAlocacaoObra = 'equipe' | 'funcionario';

interface ModalCriarEventoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventoInicial?: EventoCalendario | null;
  orcamentoPreenchido?: OrcamentoPreenchido | null;
  datasIniciais?: { dataInicio?: string; dataFim?: string };
}

const TIPOS: { value: EventoTipo; label: string }[] = [
  { value: 'OBRA', label: 'Obra' },
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'VISITA', label: 'Visita' },
];

function toDatetimeLocal(value?: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFim(inicio: string): string {
  if (!inicio) return '';
  const d = new Date(inicio);
  d.setHours(d.getHours() + 2);
  return toDatetimeLocal(d);
}

const ModalCriarEvento: React.FC<ModalCriarEventoProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventoInicial,
  orcamentoPreenchido,
  datasIniciais,
}) => {
  const { user } = useContext(AuthContext)!;
  const isPrivileged = isAdmin(user) || isDeveloper(user);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<EventoTipo>('REUNIAO');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState<EventoStatus>('PREVISAO');
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);
  const [custoVeiculo, setCustoVeiculo] = useState('0');
  const [pessoasSelecionadas, setPessoasSelecionadas] = useState<FuncionarioEquipeResumo[]>([]);
  const [modoAlocacaoObra, setModoAlocacaoObra] = useState<ModoAlocacaoObra>('equipe');
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [buscaEquipe, setBuscaEquipe] = useState('');
  const [sugestoesPessoas, setSugestoesPessoas] = useState<FuncionarioEquipeResumo[]>([]);
  const [sugestoesEquipes, setSugestoesEquipes] = useState<EquipePreMontadaResumo[]>([]);
  const [buscandoPessoas, setBuscandoPessoas] = useState(false);
  const [buscandoEquipes, setBuscandoEquipes] = useState(false);
  const [dropdownPessoaAberto, setDropdownPessoaAberto] = useState(false);
  const [dropdownEquipeAberto, setDropdownEquipeAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const buscaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pessoaContainerRef = useRef<HTMLDivElement>(null);
  const equipePreMontadaRef = useRef<HTMLDivElement>(null);

  const isObra = tipo === 'OBRA';
  const isReuniaoOuVisita = tipo === 'REUNIAO' || tipo === 'VISITA';

  useEscapeKey(isOpen, onClose);

  const idsPessoasSelecionadas = useMemo(
    () => pessoasSelecionadas.map((m) => m.id),
    [pessoasSelecionadas]
  );

  const carregarSugestoesPessoas = async (termo: string) => {
    setBuscandoPessoas(true);
    try {
      const res = await eventosCalendarioService.buscarFuncionarios(termo, idsPessoasSelecionadas);
      setSugestoesPessoas(res.success && Array.isArray(res.data) ? res.data : []);
    } catch {
      setSugestoesPessoas([]);
    } finally {
      setBuscandoPessoas(false);
    }
  };

  const carregarSugestoesEquipes = async (termo: string) => {
    setBuscandoEquipes(true);
    try {
      const res = await eventosCalendarioService.buscarEquipesPreMontadas(termo);
      setSugestoesEquipes(res.success && Array.isArray(res.data) ? res.data : []);
    } catch {
      setSugestoesEquipes([]);
    } finally {
      setBuscandoEquipes(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !dropdownPessoaAberto) return;
    if (!isObra && !isReuniaoOuVisita) return;
    if (isObra && modoAlocacaoObra !== 'funcionario') return;

    if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
    buscaDebounceRef.current = setTimeout(() => {
      carregarSugestoesPessoas(buscaPessoa);
    }, 250);

    return () => {
      if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
    };
  }, [isOpen, dropdownPessoaAberto, buscaPessoa, idsPessoasSelecionadas.join(','), isObra, isReuniaoOuVisita, modoAlocacaoObra]);

  useEffect(() => {
    if (!isOpen || !dropdownEquipeAberto || !isObra || modoAlocacaoObra !== 'equipe') return;

    if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
    buscaDebounceRef.current = setTimeout(() => {
      carregarSugestoesEquipes(buscaEquipe);
    }, 250);

    return () => {
      if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
    };
  }, [isOpen, dropdownEquipeAberto, buscaEquipe, isObra, modoAlocacaoObra]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pessoaContainerRef.current && !pessoaContainerRef.current.contains(target)) {
        setDropdownPessoaAberto(false);
      }
      if (equipePreMontadaRef.current && !equipePreMontadaRef.current.contains(target)) {
        setDropdownEquipeAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (eventoInicial) {
      setTitulo(eventoInicial.titulo);
      setDescricao(eventoInicial.descricao || '');
      setTipo((eventoInicial.tipo as EventoTipo) || 'REUNIAO');
      setDataInicio(toDatetimeLocal(eventoInicial.dataInicio));
      setDataFim(toDatetimeLocal(eventoInicial.dataFim));
      setStatus(eventoInicial.status);
      setOrcamentoId(eventoInicial.orcamentoId || null);
      setCustoVeiculo(String(eventoInicial.custoVeiculo ?? 0));
      setPessoasSelecionadas(eventoInicial.equipe || []);
      setModoAlocacaoObra('funcionario');
      return;
    }

    const inicio =
      toDatetimeLocal(orcamentoPreenchido?.previsaoInicio) ||
      toDatetimeLocal(datasIniciais?.dataInicio) ||
      toDatetimeLocal(new Date());
    const fim =
      toDatetimeLocal(orcamentoPreenchido?.previsaoTermino) ||
      toDatetimeLocal(datasIniciais?.dataFim) ||
      defaultFim(inicio);

    setTitulo(orcamentoPreenchido?.titulo ? `Obra — ${orcamentoPreenchido.titulo}` : '');
    setDescricao('');
    setTipo(orcamentoPreenchido ? 'OBRA' : 'REUNIAO');
    setDataInicio(inicio);
    setDataFim(fim);
    setStatus('PREVISAO');
    setOrcamentoId(orcamentoPreenchido?.id || null);
    setCustoVeiculo('0');
    setPessoasSelecionadas([]);
    setModoAlocacaoObra('equipe');
    setBuscaPessoa('');
    setBuscaEquipe('');
    setSugestoesPessoas([]);
    setSugestoesEquipes([]);
    setDropdownPessoaAberto(false);
    setDropdownEquipeAberto(false);
  }, [isOpen, eventoInicial, orcamentoPreenchido, datasIniciais]);

  const handleTipoChange = (novoTipo: EventoTipo) => {
    setTipo(novoTipo);
    if (novoTipo !== 'OBRA') {
      setModoAlocacaoObra('funcionario');
      setBuscaEquipe('');
      setSugestoesEquipes([]);
      setDropdownEquipeAberto(false);
    }
  };

  const custoPreview = useMemo(() => {
    if (!isPrivileged || !dataInicio || !dataFim) return null;
    try {
      return calcularCustoEvento(
        new Date(dataInicio),
        new Date(dataFim),
        pessoasSelecionadas,
        Number(custoVeiculo) || 0
      );
    } catch {
      return null;
    }
  }, [isPrivileged, dataInicio, dataFim, pessoasSelecionadas, custoVeiculo]);

  const adicionarPessoa = (pessoa: FuncionarioEquipeResumo) => {
    setPessoasSelecionadas((prev) => [...prev, pessoa]);
    setBuscaPessoa('');
    setDropdownPessoaAberto(false);
  };

  const adicionarEquipePreMontada = async (equipe: EquipePreMontadaResumo) => {
    setBuscandoEquipes(true);
    try {
      const res = await eventosCalendarioService.resolverFuncionariosEquipe(
        equipe.id,
        idsPessoasSelecionadas
      );
      if (!res.success || !res.data) {
        toast.error(res.error || 'Não foi possível carregar a equipe');
        return;
      }
      const { funcionarios, equipeNome, membrosNaoVinculados } = res.data;
      if (funcionarios.length === 0) {
        toast.warning(`Nenhum funcionário do RH vinculado à equipe "${equipeNome}"`);
        return;
      }
      setPessoasSelecionadas((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...funcionarios.filter((f) => !ids.has(f.id))];
      });
      if (membrosNaoVinculados && membrosNaoVinculados > 0) {
        toast.info(
          `${funcionarios.length} funcionário(s) adicionado(s). ${membrosNaoVinculados} membro(s) sem vínculo no RH.`
        );
      } else {
        toast.success(`Equipe "${equipeNome}" adicionada`);
      }
      setBuscaEquipe('');
      setDropdownEquipeAberto(false);
    } catch {
      toast.error('Erro ao adicionar equipe');
    } finally {
      setBuscandoEquipes(false);
    }
  };

  const removerPessoa = (id: string) => {
    setPessoasSelecionadas((prev) => prev.filter((m) => m.id !== id));
  };

  const handleExcluir = async () => {
    if (!eventoInicial) return;
    const confirmar = window.confirm(
      `Deseja excluir o evento "${eventoInicial.titulo}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmar) return;

    setExcluindo(true);
    try {
      const res = await eventosCalendarioService.excluir(eventoInicial.id);
      if (res.success) {
        toast.success('Evento excluído');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Erro ao excluir evento');
      }
    } catch {
      toast.error('Erro ao excluir evento');
    } finally {
      setExcluindo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Informe o nome do evento');
      return;
    }
    if (!dataInicio || !dataFim) {
      toast.error('Informe data/hora de início e fim');
      return;
    }
    if (new Date(dataFim) < new Date(dataInicio)) {
      toast.error('Data fim deve ser posterior à data início');
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        dataInicio: new Date(dataInicio).toISOString(),
        dataFim: new Date(dataFim).toISOString(),
        status,
        tipo,
        orcamentoId,
        custoVeiculo: Number(custoVeiculo) || 0,
        equipeIds: pessoasSelecionadas.map((m) => m.id),
      };

      const res = eventoInicial
        ? await eventosCalendarioService.atualizar(eventoInicial.id, payload)
        : await eventosCalendarioService.criar(payload);

      if (res.success) {
        toast.success(eventoInicial ? 'Evento atualizado' : 'Evento criado');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Erro ao salvar evento');
      }
    } catch {
      toast.error('Erro ao salvar evento');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {eventoInicial ? 'Editar Evento' : 'Criar Evento'}
            </h2>
            <p className="text-sm text-blue-100 mt-0.5">Calendário e previsão de alocação</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Nome do evento
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex.: Instalação quadro principal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => handleTipoChange(e.target.value as EventoTipo)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <span className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Status do evento
              </span>
              <label className="relative inline-flex items-center cursor-pointer gap-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={status === 'VALIDO'}
                  onChange={(e) => setStatus(e.target.checked ? 'VALIDO' : 'PREVISAO')}
                />
                <div className="relative w-11 h-6 bg-amber-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                <span className="text-sm font-medium">
                  {status === 'PREVISAO' ? (
                    <span className="text-amber-700 dark:text-amber-400">Previsão</span>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-400">Confirmado / Válido</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Início</label>
              <input
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Fim</label>
              <input
                type="datetime-local"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {orcamentoId && (
            <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2">
              Vinculado ao orçamento selecionado
            </div>
          )}

          {/* Alocação: Obra = equipe OU funcionário | Reunião/Visita = apenas pessoas */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
              {isObra ? 'Alocação da obra' : 'Participantes'}
            </label>

            {isObra && (
              <div className="flex rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden text-sm w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setModoAlocacaoObra('equipe');
                    setDropdownPessoaAberto(false);
                  }}
                  className={`flex-1 sm:flex-none px-4 py-2 font-medium transition-colors ${
                    modoAlocacaoObra === 'equipe'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary'
                  }`}
                >
                  Por equipe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoAlocacaoObra('funcionario');
                    setDropdownEquipeAberto(false);
                  }}
                  className={`flex-1 sm:flex-none px-4 py-2 font-medium border-l border-gray-200 dark:border-dark-border transition-colors ${
                    modoAlocacaoObra === 'funcionario'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary'
                  }`}
                >
                  Por funcionário
                </button>
              </div>
            )}

            {isObra && modoAlocacaoObra === 'equipe' && (
              <div ref={equipePreMontadaRef} className="relative z-20">
                <input
                  type="text"
                  value={buscaEquipe}
                  onChange={(e) => {
                    setBuscaEquipe(e.target.value);
                    setDropdownEquipeAberto(true);
                  }}
                  onFocus={() => setDropdownEquipeAberto(true)}
                  placeholder="Buscar equipe pré-montada (ex.: Equipe A)..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoComplete="off"
                />
                {dropdownEquipeAberto && (
                  <ul className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-xl shadow-xl bg-white dark:bg-dark-card z-50">
                    {buscandoEquipes ? (
                      <li className="px-4 py-3 text-sm text-gray-500">Buscando equipes...</li>
                    ) : sugestoesEquipes.length > 0 ? (
                      sugestoesEquipes.map((eq) => (
                        <li key={eq.id}>
                          <button
                            type="button"
                            onClick={() => adicionarEquipePreMontada(eq)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-bg text-sm border-b border-gray-100 dark:border-dark-border last:border-0"
                          >
                            <span className="font-medium text-gray-900 dark:text-dark-text">{eq.nome}</span>
                            <span className="text-gray-500 dark:text-dark-text-secondary ml-2">
                              {eq.tipo} · {eq.totalMembros} membro(s)
                            </span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-gray-500">
                        {buscaEquipe.trim() ? 'Nenhuma equipe encontrada' : 'Digite para buscar equipes ativas'}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {(isReuniaoOuVisita || (isObra && modoAlocacaoObra === 'funcionario')) && (
              <div ref={pessoaContainerRef} className="relative z-20">
                <input
                  type="text"
                  value={buscaPessoa}
                  onChange={(e) => {
                    setBuscaPessoa(e.target.value);
                    setDropdownPessoaAberto(true);
                  }}
                  onFocus={() => setDropdownPessoaAberto(true)}
                  placeholder={
                    isObra
                      ? 'Buscar funcionário por nome, cargo ou e-mail...'
                      : 'Buscar participante por nome, cargo ou e-mail...'
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoComplete="off"
                />
                {dropdownPessoaAberto && (
                  <ul className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-xl shadow-xl bg-white dark:bg-dark-card z-50">
                    {buscandoPessoas ? (
                      <li className="px-4 py-3 text-sm text-gray-500">Buscando...</li>
                    ) : sugestoesPessoas.length > 0 ? (
                      sugestoesPessoas.map((f) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => adicionarPessoa(f)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-bg text-sm border-b border-gray-100 dark:border-dark-border last:border-0"
                          >
                            <span className="font-medium text-gray-900 dark:text-dark-text">{f.nome}</span>
                            <span className="text-gray-500 dark:text-dark-text-secondary ml-2">{f.cargo}</span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-gray-500">
                        {buscaPessoa.trim()
                          ? 'Nenhuma pessoa encontrada'
                          : 'Digite para buscar funcionários ativos'}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {pessoasSelecionadas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pessoasSelecionadas.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm border border-blue-200 dark:border-blue-800"
                  >
                    {m.nome}
                    <button
                      type="button"
                      onClick={() => removerPessoa(m.id)}
                      className="hover:text-red-600"
                      aria-label={`Remover ${m.nome}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {isPrivileged && isObra && (
            <div className="rounded-2xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text uppercase tracking-wide">
                Relatório de custo estimado (Admin)
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Custo do veículo (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={custoVeiculo}
                  onChange={(e) => setCustoVeiculo(e.target.value)}
                  className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              {custoPreview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                    <p className="text-gray-500 text-xs">Dias</p>
                    <p className="font-semibold">{custoPreview.diasCalendario}</p>
                  </div>
                  <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                    <p className="text-gray-500 text-xs">Horas comerciais</p>
                    <p className="font-semibold">{custoPreview.horasComerciais}h</p>
                  </div>
                  <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                    <p className="text-gray-500 text-xs">Custo equipe</p>
                    <p className="font-semibold">
                      {custoPreview.custoEquipe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="bg-blue-600 text-white rounded-xl p-3">
                    <p className="text-blue-100 text-xs">Total projetado</p>
                    <p className="font-bold text-lg">
                      {custoPreview.custoProjetado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex justify-between gap-3 bg-gray-50 dark:bg-dark-bg">
          <div>
            {eventoInicial && (
              <button
                type="button"
                onClick={handleExcluir}
                disabled={excluindo || salvando}
                className="px-5 py-2.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-red-800 dark:text-red-400 disabled:opacity-50 transition-colors"
              >
                {excluindo ? 'Excluindo...' : 'Excluir evento'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={salvando || excluindo}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : eventoInicial ? 'Salvar alterações' : 'Criar evento'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCriarEvento;
