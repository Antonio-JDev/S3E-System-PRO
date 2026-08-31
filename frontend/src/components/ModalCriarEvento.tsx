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
import { ordemServicosService } from '../services/ordemServicosService';
import { veiculosService } from '../services/gerenciamentoService';
import type { VeiculoEventoResumo } from '../services/eventosCalendarioService';

type ModoAlocacaoObra = 'equipe' | 'funcionario';

interface ModalCriarEventoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventoInicial?: EventoCalendario | null;
  orcamentoPreenchido?: OrcamentoPreenchido | null;
  datasIniciais?: { dataInicio?: string; dataFim?: string };
  osDrop?: {
    projetoId: string;
    titulo: string;
    numeroOs: string;
    dataInicio: string;
    dataFim: string;
  } | null;
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


async function aplicarPeriodoDaOs(
  projetoId: string,
  setDataInicio: (v: string) => void,
  setDataFim: (v: string) => void,
  setPeriodoOsHint: (v: string | null) => void,
) {
  const res = await ordemServicosService.buscar(projetoId);
  if (!res.success || !res.data) {
    toast.error(res.error || 'Não foi possível carregar o período da OS');
    setPeriodoOsHint(null);
    return false;
  }
  const os = res.data as {
    dataInicio?: string;
    dataPrevisao?: string | null;
    dataFim?: string | null;
    orcamento?: { previsaoInicio?: string | null; previsaoTermino?: string | null };
  };
  const inicioRaw = os.dataInicio || os.orcamento?.previsaoInicio;
  const fimRaw = os.dataPrevisao || os.dataFim || os.orcamento?.previsaoTermino;
  if (!inicioRaw || !fimRaw) {
    toast.error('Esta OS não tem período válido (início e previsão/prazo). Defina as datas na OS.');
    setPeriodoOsHint(null);
    return false;
  }
  const inicio = new Date(inicioRaw);
  const fim = new Date(fimRaw);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
    toast.error('Período da OS inválido');
    setPeriodoOsHint(null);
    return false;
  }
  setDataInicio(toDatetimeLocal(inicio));
  setDataFim(toDatetimeLocal(fim));
  const dias = Math.max(
    1,
    Math.floor(
      (Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate()) -
        Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())) /
        86400000,
    ) + 1,
  );
  setPeriodoOsHint(
    `Alocação cobre todo o prazo da OS (${dias} dia${dias > 1 ? 's' : ''}: ${inicio.toLocaleDateString('pt-BR')} → ${fim.toLocaleDateString('pt-BR')}).`,
  );
  return true;
}

const ModalCriarEvento: React.FC<ModalCriarEventoProps> = ({
  isOpen,
  onClose,
  onSuccess,
  eventoInicial,
  orcamentoPreenchido,
  datasIniciais,
  osDrop = null,
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
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [osLabel, setOsLabel] = useState('');
  const [buscaOs, setBuscaOs] = useState('');
  const [sugestoesOs, setSugestoesOs] = useState<Array<{ id: string; titulo: string; numeroOs?: string | null; cliente?: { nome: string } | null }>>([]);
  const [dropdownOsAberto, setDropdownOsAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
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
  const [periodoOsHint, setPeriodoOsHint] = useState<string | null>(null);
  const [alocarPeriodoOs, setAlocarPeriodoOs] = useState(false);
  const [veiculosDisponiveis, setVeiculosDisponiveis] = useState<VeiculoEventoResumo[]>([]);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<VeiculoEventoResumo[]>([]);
  const [buscaVeiculo, setBuscaVeiculo] = useState('');
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

  useEffect(() => {
    if (!isOpen) return;
    veiculosService.listar().then((res) => {
      const lista = (res?.data as VeiculoEventoResumo[] | undefined) ?? [];
      const ativos = Array.isArray(lista)
        ? lista.filter((v) => String(v.status || 'Ativo').toLowerCase() === 'ativo')
        : [];
      setVeiculosDisponiveis(ativos);
    }).catch(() => setVeiculosDisponiveis([]));
  }, [isOpen]);

  const veiculosFiltrados = useMemo(() => {
    const termo = buscaVeiculo.trim().toLowerCase();
    const ids = new Set(veiculosSelecionados.map((v) => v.id));
    return veiculosDisponiveis.filter((v) => {
      if (ids.has(v.id)) return false;
      if (!termo) return true;
      return (
        v.modelo.toLowerCase().includes(termo) ||
        v.placa.toLowerCase().includes(termo) ||
        (v.tipo || '').toLowerCase().includes(termo)
      );
    });
  }, [veiculosDisponiveis, veiculosSelecionados, buscaVeiculo]);

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
      setProjetoId(eventoInicial.projetoId || eventoInicial.projeto?.id || null);
      const n = eventoInicial.projeto?.orcamento?.numeroSequencial;
      setOsLabel(
        eventoInicial.projeto
          ? `${n ? `OS-${n}` : eventoInicial.projeto.titulo}${eventoInicial.projeto.cliente?.nome ? ` · ${eventoInicial.projeto.cliente.nome}` : ''}`
          : ''
      );
      setCustoVeiculo(String(eventoInicial.custoVeiculo ?? 0));
      setPessoasSelecionadas(eventoInicial.equipe || []);
      setVeiculosSelecionados(eventoInicial.veiculos || []);
      setModoAlocacaoObra('funcionario');
      setPeriodoOsHint(null);
      setAlocarPeriodoOs(false);
      return;
    }

    if (osDrop) {
      const inicioDrop = toDatetimeLocal(osDrop.dataInicio) || toDatetimeLocal(new Date());
      const fimDrop = toDatetimeLocal(osDrop.dataFim) || defaultFim(inicioDrop);
      setTitulo(osDrop.numeroOs || osDrop.titulo);
      setDescricao('');
      setTipo('OBRA');
      setDataInicio(inicioDrop);
      setDataFim(fimDrop);
      setStatus('PREVISAO');
      setProjetoId(osDrop.projetoId);
      setOsLabel(`${osDrop.numeroOs || osDrop.titulo}`);
      setBuscaOs('');
      setSugestoesOs([]);
      setOrcamentoId(null);
      setCustoVeiculo('0');
      setPessoasSelecionadas([]);
      setVeiculosSelecionados([]);
      setModoAlocacaoObra('funcionario');
      setBuscaPessoa('');
      setBuscaEquipe('');
      setBuscaVeiculo('');
      setSugestoesPessoas([]);
      setSugestoesEquipes([]);
      setDropdownPessoaAberto(false);
      setDropdownEquipeAberto(false);
      setPeriodoOsHint(
        'Datas definidas no calendário (planejamento de execução). Distinto do prazo estimado na página da OS.',
      );
      setAlocarPeriodoOs(false);
      void ordemServicosService.buscar(osDrop.projetoId).then((res) => {
        if (res.success && res.data?.orcamentoId) {
          setOrcamentoId(res.data.orcamentoId || null);
        }
      });
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
    setProjetoId(null);
    setOsLabel('');
    setBuscaOs('');
    setSugestoesOs([]);
    setCustoVeiculo('0');
    setPessoasSelecionadas([]);
    setVeiculosSelecionados([]);
    setModoAlocacaoObra('equipe');
    setBuscaPessoa('');
    setBuscaEquipe('');
    setSugestoesPessoas([]);
    setSugestoesEquipes([]);
    setDropdownPessoaAberto(false);
    setDropdownEquipeAberto(false);
    setPeriodoOsHint(null);
    setAlocarPeriodoOs(false);
  }, [isOpen, eventoInicial, orcamentoPreenchido, datasIniciais, osDrop]);

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

  const removerVeiculo = (id: string) => {
    setVeiculosSelecionados((prev) => prev.filter((v) => v.id !== id));
  };

  const adicionarVeiculo = (veiculo: VeiculoEventoResumo) => {
    setVeiculosSelecionados((prev) => [...prev, veiculo]);
    setBuscaVeiculo('');
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
      if (tipo === 'OBRA' && !projetoId) {
        toast.error('Selecione a ordem de serviço para vincular a alocação');
        setSalvando(false);
        return;
      }
      if (tipo === 'OBRA' && pessoasSelecionadas.length === 0) {
        toast.error('Inclua ao menos um funcionário na alocação');
        setSalvando(false);
        return;
      }

      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        dataInicio: new Date(dataInicio).toISOString(),
        dataFim: new Date(dataFim).toISOString(),
        status,
        tipo,
        orcamentoId,
        projetoId,
        custoVeiculo: Number(custoVeiculo) || 0,
        equipeIds: pessoasSelecionadas.map((m) => m.id),
        veiculoIds: veiculosSelecionados.map((v) => v.id),
        snapWorkshift: false,
        alocarPeriodoOs: alocarPeriodoOs === true,
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

  const handleConfirmar = async () => {
    if (!eventoInicial) return;
    if (tipo === 'OBRA' && !projetoId) {
      toast.error('Vincule uma ordem de serviço antes de confirmar');
      return;
    }
    setConfirmando(true);
    try {
      if (projetoId || titulo) {
        await eventosCalendarioService.atualizar(eventoInicial.id, {
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          dataInicio: new Date(dataInicio).toISOString(),
          dataFim: new Date(dataFim).toISOString(),
          tipo,
          projetoId,
          orcamentoId,
          equipeIds: pessoasSelecionadas.map((m) => m.id),
          veiculoIds: veiculosSelecionados.map((v) => v.id),
        });
      }
      const res = await eventosCalendarioService.confirmar(eventoInicial.id);
      if (res.success) {
        toast.success('Alocação confirmada na OS');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Erro ao confirmar');
      }
    } catch {
      toast.error('Erro ao confirmar');
    } finally {
      setConfirmando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {eventoInicial ? 'Editar Evento' : osDrop ? 'Planejar execução da OS' : 'Criar Evento'}
            </h2>
            <p className="text-sm text-blue-100 mt-0.5">
              {osDrop
                ? 'Defina equipe e veículos para o período planejado no calendário'
                : 'Calendário e previsão de alocação'}
            </p>
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
              <span className={`inline-flex w-fit px-3 py-1.5 rounded-lg text-sm font-semibold ${
                status === 'VALIDO'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {status === 'PREVISAO' ? 'Previsão' : 'Confirmado'}
              </span>
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

          {isObra && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Ordem de serviço
              </label>
              {projetoId && osLabel ? (
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-900/20">
                  <span className="text-sm font-medium truncate">{osLabel}</span>
                  {!osDrop && (
                    <button
                      type="button"
                      className="text-xs text-red-600 shrink-0"
                      onClick={() => {
                        setProjetoId(null);
                        setOsLabel('');
                        setPeriodoOsHint(null);
                        setAlocarPeriodoOs(false);
                      }}
                    >
                      Trocar
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type="search"
                  value={buscaOs}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setBuscaOs(v);
                    setDropdownOsAberto(true);
                    if (v.trim().length < 1) {
                      setSugestoesOs([]);
                      return;
                    }
                    const res = await ordemServicosService.buscarPorTermo(v.trim(), 12);
                    setSugestoesOs(res.success && Array.isArray(res.data) ? res.data : []);
                  }}
                  onFocus={() => setDropdownOsAberto(true)}
                  placeholder="Buscar OS por número, título ou cliente..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
              {dropdownOsAberto && !projetoId && sugestoesOs.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-xl shadow-xl bg-white dark:bg-dark-card">
                  {sugestoesOs.map((os) => (
                    <li key={os.id}>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            setProjetoId(os.id);
                            setOsLabel(`${os.numeroOs || os.titulo}${os.cliente?.nome ? ` · ${os.cliente.nome}` : ''}`);
                            setBuscaOs('');
                            setSugestoesOs([]);
                            setDropdownOsAberto(false);
                            if (!titulo.trim()) setTitulo(os.numeroOs || os.titulo);
                            setPeriodoOsHint(
                              'Datas do calendário = planejamento de execução. Use o checkbox abaixo apenas para copiar o prazo estimado da OS.',
                            );
                            setAlocarPeriodoOs(false);
                          })();
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-bg text-sm"
                      >
                        <span className="font-semibold">{os.numeroOs || os.titulo}</span>
                        {os.cliente?.nome && <span className="text-gray-500 ml-2">{os.cliente.nome}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isObra && periodoOsHint && (
            <p className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2">
              {periodoOsHint}
            </p>
          )}
          {isObra && projetoId && !osDrop && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text cursor-pointer">
              <input
                type="checkbox"
                checked={alocarPeriodoOs}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  setAlocarPeriodoOs(checked);
                  if (checked && projetoId) {
                    await aplicarPeriodoDaOs(projetoId, setDataInicio, setDataFim, setPeriodoOsHint);
                  } else {
                    setPeriodoOsHint(
                      'Datas do calendário = planejamento de execução. Distinto do prazo estimado na página da OS.',
                    );
                  }
                }}
                className="rounded border-gray-300 text-blue-600"
              />
              Usar prazo estimado da OS (opcional)
            </label>
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

          {isObra && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
                Veículos da frota
              </label>
              <input
                type="search"
                value={buscaVeiculo}
                onChange={(e) => setBuscaVeiculo(e.target.value)}
                placeholder="Buscar veículo por modelo ou placa..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {buscaVeiculo.trim() && veiculosFiltrados.length > 0 && (
                <ul className="max-h-40 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card">
                  {veiculosFiltrados.slice(0, 8).map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => adicionarVeiculo(v)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-bg"
                      >
                        <span className="font-medium">{v.modelo}</span>
                        <span className="text-gray-500 ml-2">{v.placa}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {veiculosSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {veiculosSelecionados.map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm border border-emerald-200 dark:border-emerald-800"
                    >
                      🚗 {v.modelo} · {v.placa}
                      <button
                        type="button"
                        onClick={() => removerVeiculo(v.id)}
                        className="hover:text-red-600"
                        aria-label={`Remover ${v.modelo}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
            disabled={salvando || excluindo || confirmando}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : eventoInicial ? 'Salvar alterações' : 'Criar evento'}
          </button>
          {eventoInicial && status === 'PREVISAO' && (
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={salvando || excluindo || confirmando}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {confirmando ? 'Confirmando...' : 'Confirmar'}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCriarEvento;
