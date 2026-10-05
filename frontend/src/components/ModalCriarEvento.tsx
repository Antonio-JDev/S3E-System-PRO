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
import { calcularCustoEvento, resolverValorHora } from '../utils/custoEventoCalendario';
import {
  horasPorDiaLocal,
  intervalosNoCicloComercial,
  lerHorariosPorDia,
  particionarEquipe,
  ymdLocal,
  type HorarioDiaAlocacao,
} from '../utils/fatiasTempoOs';
import OsFatiasTempoBarras from './os/OsFatiasTempoBarras';
import { isAdmin, isDeveloper } from '../utils/permissions';
import { formatDateDisplay } from '../utils/date';
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

function taxaManual(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function listasIniciais(evento: EventoCalendario): { eng: string[]; exe: string[] } {
  const eng = evento.equipeEngenhariaIds || [];
  const exe = evento.equipeExecucaoIds || [];
  if (eng.length || exe.length) return { eng, exe };
  const partes = particionarEquipe(evento.equipe || [], [], []);
  return {
    eng: partes.engenharia.map((m) => m.id),
    exe: partes.execucao.map((m) => m.id),
  };
}

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

function hmLocal(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function labelDiaAlocacao(ymd: string): string {
  const [ano, mes, dia] = ymd.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
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
  const [ajustesDia, setAjustesDia] = useState<Record<string, { inicio?: string; fim?: string }>>({});
  const [status, setStatus] = useState<EventoStatus>('PREVISAO');
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [prazoOs, setPrazoOs] = useState<{ inicio: string; fim: string; dias: number } | null>(null);
  const [prazoOsAusente, setPrazoOsAusente] = useState(false);
  const [osLabel, setOsLabel] = useState('');
  const [buscaOs, setBuscaOs] = useState('');
  const [sugestoesOs, setSugestoesOs] = useState<Array<{ id: string; titulo: string; numeroOs?: string | null; cliente?: { nome: string } | null }>>([]);
  const [dropdownOsAberto, setDropdownOsAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [fatiasVersao, setFatiasVersao] = useState(0);
  const [custoVeiculo, setCustoVeiculo] = useState('');
  const [pessoasSelecionadas, setPessoasSelecionadas] = useState<FuncionarioEquipeResumo[]>([]);
  const [modoAlocacaoObra, setModoAlocacaoObra] = useState<ModoAlocacaoObra>('equipe');
  const [buscaEquipe, setBuscaEquipe] = useState('');
  const [sugestoesEquipes, setSugestoesEquipes] = useState<EquipePreMontadaResumo[]>([]);
  const [buscandoEquipes, setBuscandoEquipes] = useState(false);
  const [dropdownEquipeAberto, setDropdownEquipeAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [periodoOsHint, setPeriodoOsHint] = useState<string | null>(null);
  const [alocarPeriodoOs, setAlocarPeriodoOs] = useState(false);
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<FuncionarioEquipeResumo[]>([]);
  const [carregandoFuncionarios, setCarregandoFuncionarios] = useState(false);
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [veiculosDisponiveis, setVeiculosDisponiveis] = useState<VeiculoEventoResumo[]>([]);
  const [veiculosSelecionados, setVeiculosSelecionados] = useState<VeiculoEventoResumo[]>([]);
  const [filtroVeiculo, setFiltroVeiculo] = useState('');
  const [idsEngenharia, setIdsEngenharia] = useState<string[]>([]);
  const [idsExecucao, setIdsExecucao] = useState<string[]>([]);
  const [grupoAlvo, setGrupoAlvo] = useState<'ENGENHARIA' | 'EXECUCAO'>('EXECUCAO');
  const [valorHoraEngenharia, setValorHoraEngenharia] = useState('');
  const [valorHoraExecucao, setValorHoraExecucao] = useState('');
  const buscaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const equipePreMontadaRef = useRef<HTMLDivElement>(null);

  const isObra = tipo === 'OBRA';

  useEffect(() => {
    if (!isOpen || !isObra || !projetoId) {
      setPrazoOs(null);
      setPrazoOsAusente(false);
      return;
    }
    let cancelado = false;
    setPrazoOs(null);
    setPrazoOsAusente(false);
    void ordemServicosService.buscar(projetoId).then((res) => {
      if (cancelado) return;
      if (!res.success || !res.data) {
        setPrazoOsAusente(true);
        return;
      }
      const os = res.data as {
        dataInicio?: string | null;
        dataPrevisao?: string | null;
        dataFim?: string | null;
        orcamento?: { previsaoInicio?: string | null; previsaoTermino?: string | null };
      };
      const inicioRaw = os.dataInicio || os.orcamento?.previsaoInicio;
      const fimRaw = os.dataPrevisao || os.dataFim || os.orcamento?.previsaoTermino;
      if (!inicioRaw || !fimRaw) {
        setPrazoOsAusente(true);
        return;
      }
      const inicio = new Date(inicioRaw);
      const fim = new Date(fimRaw);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
        setPrazoOsAusente(true);
        return;
      }
      const dias = Math.max(
        1,
        Math.floor(
          (Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate()) -
            Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())) /
            86400000,
        ) + 1,
      );
      setPrazoOs({
        inicio: formatDateDisplay(inicioRaw),
        fim: formatDateDisplay(fimRaw),
        dias,
      });
    });
    return () => {
      cancelado = true;
    };
  }, [isOpen, isObra, projetoId]);

  const horariosPorDia = useMemo<HorarioDiaAlocacao[]>(() => {
    if (!isObra || !dataInicio || !dataFim) return [];
    return intervalosNoCicloComercial(new Date(dataInicio), new Date(dataFim)).map((slot) => {
      const ajuste = ajustesDia[slot.dia];
      return {
        dia: slot.dia,
        inicio: ajuste?.inicio || slot.inicio,
        fim: ajuste?.fim || slot.fim,
      };
    });
  }, [isObra, dataInicio, dataFim, ajustesDia]);

  const planoApontamento = useMemo(() => {
    if (!isObra || !dataInicio || !dataFim) {
      return { dias: [] as string[], futuros: [] as string[] };
    }
    const hoje = ymdLocal(new Date());
    const slices = horasPorDiaLocal(new Date(dataInicio), new Date(dataFim), horariosPorDia).filter(
      (dia) => dia.horas > 0,
    );
    return {
      dias: slices.filter((dia) => dia.dia <= hoje).map((dia) => dia.dia),
      futuros: slices.filter((dia) => dia.dia > hoje).map((dia) => dia.dia),
    };
  }, [isObra, dataInicio, dataFim, horariosPorDia]);

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

    setCarregandoFuncionarios(true);
    eventosCalendarioService
      .listarFuncionariosAlocacao()
      .then((res) => {
        const lista = res.success && Array.isArray(res.data) ? res.data : [];
        setFuncionariosDisponiveis(
          lista.map((f) => ({
            id: f.id,
            nome: f.nome,
            cargo: f.cargo,
            email: f.email,
            valorHora: f.valorHora,
            valorDiaria: f.valorDiaria,
            status: f.status,
          }))
        );
      })
      .catch(() => setFuncionariosDisponiveis([]))
      .finally(() => setCarregandoFuncionarios(false));
  }, [isOpen]);

  const idsPessoasSet = useMemo(() => new Set(idsPessoasSelecionadas), [idsPessoasSelecionadas]);
  const idsVeiculosSet = useMemo(
    () => new Set(veiculosSelecionados.map((v) => v.id)),
    [veiculosSelecionados]
  );

  const funcionariosFiltrados = useMemo(() => {
    const termo = filtroFuncionario.trim().toLowerCase();
    if (!termo) return funcionariosDisponiveis;
    return funcionariosDisponiveis.filter(
      (f) =>
        f.nome.toLowerCase().includes(termo) ||
        (f.cargo || '').toLowerCase().includes(termo) ||
        (f.email || '').toLowerCase().includes(termo)
    );
  }, [funcionariosDisponiveis, filtroFuncionario]);

  const veiculosFiltrados = useMemo(() => {
    const termo = filtroVeiculo.trim().toLowerCase();
    if (!termo) return veiculosDisponiveis;
    return veiculosDisponiveis.filter(
      (v) =>
        v.modelo.toLowerCase().includes(termo) ||
        v.placa.toLowerCase().includes(termo) ||
        (v.tipo || '').toLowerCase().includes(termo)
    );
  }, [veiculosDisponiveis, filtroVeiculo]);

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
      const salvos = lerHorariosPorDia(eventoInicial.horariosPorDia) ?? [];
      const mapa: Record<string, { inicio?: string; fim?: string }> = {};
      for (const horario of salvos) mapa[horario.dia] = { inicio: horario.inicio, fim: horario.fim };
      setAjustesDia(mapa);
      setStatus(eventoInicial.status);
      setOrcamentoId(eventoInicial.orcamentoId || null);
      setProjetoId(eventoInicial.projetoId || eventoInicial.projeto?.id || null);
      const n = eventoInicial.projeto?.orcamento?.numeroSequencial;
      setOsLabel(
        eventoInicial.projeto
          ? `${n ? `OS-${n}` : eventoInicial.projeto.titulo}${eventoInicial.projeto.cliente?.nome ? ` · ${eventoInicial.projeto.cliente.nome}` : ''}`
          : ''
      );
      setCustoVeiculo(
        eventoInicial.custoVeiculo != null && Number(eventoInicial.custoVeiculo) !== 0
          ? String(eventoInicial.custoVeiculo)
          : ''
      );
      setPessoasSelecionadas(eventoInicial.equipe || []);
      const listas = listasIniciais(eventoInicial);
      setIdsEngenharia(listas.eng);
      setIdsExecucao(listas.exe);
      setGrupoAlvo('EXECUCAO');
      setValorHoraEngenharia(
        eventoInicial.valorHoraEngenharia != null && Number(eventoInicial.valorHoraEngenharia) > 0
          ? String(eventoInicial.valorHoraEngenharia)
          : '',
      );
      setValorHoraExecucao(
        eventoInicial.valorHoraExecucao != null && Number(eventoInicial.valorHoraExecucao) > 0
          ? String(eventoInicial.valorHoraExecucao)
          : '',
      );
      setVeiculosSelecionados(eventoInicial.veiculos || []);
      setModoAlocacaoObra('funcionario');
      setFiltroFuncionario('');
      setFiltroVeiculo('');
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
      setAjustesDia({});
      setStatus('PREVISAO');
      setProjetoId(osDrop.projetoId);
      setOsLabel(`${osDrop.numeroOs || osDrop.titulo}`);
      setBuscaOs('');
      setSugestoesOs([]);
      setOrcamentoId(null);
      setCustoVeiculo('');
      setPessoasSelecionadas([]);
      setIdsEngenharia([]);
      setIdsExecucao([]);
      setGrupoAlvo('EXECUCAO');
      setValorHoraEngenharia('');
      setValorHoraExecucao('');
      setVeiculosSelecionados([]);
      setModoAlocacaoObra('funcionario');
      setBuscaEquipe('');
      setFiltroFuncionario('');
      setFiltroVeiculo('');
      setSugestoesEquipes([]);
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
    setAjustesDia({});
    setStatus('PREVISAO');
    setOrcamentoId(orcamentoPreenchido?.id || null);
    setProjetoId(null);
    setOsLabel('');
    setBuscaOs('');
    setSugestoesOs([]);
    setCustoVeiculo('');
    setPessoasSelecionadas([]);
    setIdsEngenharia([]);
    setIdsExecucao([]);
    setGrupoAlvo('EXECUCAO');
    setValorHoraEngenharia('');
    setValorHoraExecucao('');
    setVeiculosSelecionados([]);
    setModoAlocacaoObra('equipe');
    setBuscaEquipe('');
    setFiltroFuncionario('');
    setFiltroVeiculo('');
    setSugestoesEquipes([]);
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
      const taxaEng = taxaManual(valorHoraEngenharia);
      const taxaExe = taxaManual(valorHoraExecucao);
      const equipeCusto = pessoasSelecionadas.map((membro) => {
        const engenharia = idsEngenharia.includes(membro.id);
        const execucao = idsExecucao.includes(membro.id) || (!engenharia && isObra);
        if (engenharia && taxaEng != null && taxaEng > 0) {
          return { valorHora: taxaEng, valorDiaria: null };
        }
        if (execucao && taxaExe != null && taxaExe > 0) {
          return { valorHora: taxaExe, valorDiaria: null };
        }
        return membro;
      });
      return calcularCustoEvento(
        new Date(dataInicio),
        new Date(dataFim),
        equipeCusto,
        Number(custoVeiculo) || 0
      );
    } catch {
      return null;
    }
  }, [
    isPrivileged,
    dataInicio,
    dataFim,
    pessoasSelecionadas,
    custoVeiculo,
    idsEngenharia,
    idsExecucao,
    valorHoraEngenharia,
    valorHoraExecucao,
    isObra,
  ]);

  const marcarGrupo = (id: string, grupo: 'ENGENHARIA' | 'EXECUCAO') => {
    setIdsEngenharia((prev) => (grupo === 'ENGENHARIA' ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
    setIdsExecucao((prev) => (grupo === 'EXECUCAO' ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  };

  const togglePessoa = (pessoa: FuncionarioEquipeResumo) => {
    const jaSelecionada = pessoasSelecionadas.some((p) => p.id === pessoa.id);
    if (jaSelecionada) {
      removerPessoa(pessoa.id);
      return;
    }
    setPessoasSelecionadas((prev) => [...prev, pessoa]);
    marcarGrupo(pessoa.id, isObra ? grupoAlvo : 'EXECUCAO');
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
      const novos = funcionarios.filter((f) => !idsPessoasSelecionadas.includes(f.id));
      if (novos.length > 0) {
        setPessoasSelecionadas((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...novos.filter((f) => !ids.has(f.id))];
        });
        setIdsEngenharia((eng) => eng.filter((id) => !novos.some((f) => f.id === id)));
        setIdsExecucao((exe) => [...new Set([...exe, ...novos.map((f) => f.id)])]);
      }
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
    setIdsEngenharia((prev) => prev.filter((item) => item !== id));
    setIdsExecucao((prev) => prev.filter((item) => item !== id));
  };

  const montarListasAlocacao = () => {
    if (!isObra) return { equipeEngenhariaIds: [] as string[], equipeExecucaoIds: [] as string[] };
    const ids = pessoasSelecionadas.map((p) => p.id);
    const eng = idsEngenharia.filter((id) => ids.includes(id));
    const engSet = new Set(eng);
    const exe = ids.filter((id) => !engSet.has(id));
    return { equipeEngenhariaIds: eng, equipeExecucaoIds: exe };
  };

  const toggleVeiculo = (veiculo: VeiculoEventoResumo) => {
    setVeiculosSelecionados((prev) => {
      if (prev.some((v) => v.id === veiculo.id)) {
        return prev.filter((v) => v.id !== veiculo.id);
      }
      return [...prev, veiculo];
    });
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

  const datasDoFormulario = () => {
    if (isObra && horariosPorDia.length > 0) {
      const primeiro = horariosPorDia[0];
      const ultimo = horariosPorDia[horariosPorDia.length - 1];
      return {
        dataInicio: new Date(`${primeiro.dia}T${primeiro.inicio}`).toISOString(),
        dataFim: new Date(`${ultimo.dia}T${ultimo.fim}`).toISOString(),
        horariosPorDia,
      };
    }
    return {
      dataInicio: new Date(dataInicio).toISOString(),
      dataFim: new Date(dataFim).toISOString(),
      horariosPorDia: null as HorarioDiaAlocacao[] | null,
    };
  };

  const marcarAjusteDia = (valor: string, campo: 'inicio' | 'fim') => {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return;
    const dia = ymdLocal(data);
    const hm = hmLocal(data);
    setAjustesDia((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: hm },
    }));
  };

  const alterarHorarioDia = (dia: string, campo: 'inicio' | 'fim', valor: string) => {
    setAjustesDia((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
    if (campo === 'inicio' && horariosPorDia[0]?.dia === dia) {
      setDataInicio(`${dia}T${valor}`);
    }
    if (campo === 'fim' && horariosPorDia[horariosPorDia.length - 1]?.dia === dia) {
      setDataFim(`${dia}T${valor}`);
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

      const datas = datasDoFormulario();
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        dataInicio: datas.dataInicio,
        dataFim: datas.dataFim,
        horariosPorDia: datas.horariosPorDia,
        status,
        tipo,
        orcamentoId,
        projetoId,
        custoVeiculo: Number(custoVeiculo) || 0,
        ...montarListasAlocacao(),
        valorHoraEngenharia: isObra ? taxaManual(valorHoraEngenharia) : null,
        valorHoraExecucao: isObra ? taxaManual(valorHoraExecucao) : null,
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
        const datas = datasDoFormulario();
        await eventosCalendarioService.atualizar(eventoInicial.id, {
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          dataInicio: datas.dataInicio,
          dataFim: datas.dataFim,
          horariosPorDia: datas.horariosPorDia,
          tipo,
          projetoId,
          orcamentoId,
          custoVeiculo: Number(custoVeiculo) || 0,
          ...montarListasAlocacao(),
          valorHoraEngenharia: isObra ? taxaManual(valorHoraEngenharia) : null,
          valorHoraExecucao: isObra ? taxaManual(valorHoraExecucao) : null,
          equipeIds: pessoasSelecionadas.map((m) => m.id),
          veiculoIds: veiculosSelecionados.map((v) => v.id),
        });
      }
      const res = await eventosCalendarioService.confirmar(eventoInicial.id);
      if (res.success) {
        toast.success('Alocação confirmada na agenda.');
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

  const handleExecutar = async () => {
    if (!eventoInicial || !projetoId || pessoasSelecionadas.length === 0) return;
    const pessoas = pessoasSelecionadas.length;
    const dias = planoApontamento.dias.length;
    const futuros = planoApontamento.futuros.length;
    const avisoFuturo =
      futuros > 0
        ? `\n${futuros} dia${futuros > 1 ? 's' : ''} futuro${futuros > 1 ? 's' : ''} não entra${futuros > 1 ? 'm' : ''} no apontamento.`
        : '';
    const texto =
      dias > 0
        ? `Executar a OS e apontar ${pessoas} pessoa${pessoas > 1 ? 's' : ''} em ${dias} dia${dias > 1 ? 's' : ''}?${avisoFuturo}`
        : `Nenhum dia até hoje para apontar.${avisoFuturo}\nA agenda será marcada como executada. Continuar?`;
    if (!window.confirm(texto)) return;

    setExecutando(true);
    try {
      const datas = datasDoFormulario();
      const salvo = await eventosCalendarioService.atualizar(eventoInicial.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        dataInicio: datas.dataInicio,
        dataFim: datas.dataFim,
        horariosPorDia: datas.horariosPorDia,
        tipo,
        projetoId,
        orcamentoId,
        custoVeiculo: Number(custoVeiculo) || 0,
        ...montarListasAlocacao(),
        valorHoraEngenharia: isObra ? taxaManual(valorHoraEngenharia) : null,
        valorHoraExecucao: isObra ? taxaManual(valorHoraExecucao) : null,
        equipeIds: pessoasSelecionadas.map((m) => m.id),
        veiculoIds: veiculosSelecionados.map((v) => v.id),
      });
      if (!salvo.success) {
        toast.error(salvo.error || 'Erro ao salvar o evento antes de executar');
        return;
      }

      const res = await eventosCalendarioService.executar(eventoInicial.id);
      if (!res.success || !res.data) {
        toast.error(res.error || 'Erro ao executar OS');
        return;
      }

      const { diasApontados, diasIgnoradosFuturos, pulados, falhas } = res.data;
      if (falhas.length > 0) {
        toast.warning(falhas.map((falha) => falha.mensagem).join(' '));
      }
      const partes = ['OS executada na agenda.'];
      if (diasApontados.length > 0) {
        partes.push(
          `Apontamento gravado em ${diasApontados.length} dia${diasApontados.length > 1 ? 's' : ''}.`,
        );
      }
      if (diasIgnoradosFuturos.length > 0) {
        partes.push(
          `Dia${diasIgnoradosFuturos.length > 1 ? 's' : ''} futuro${diasIgnoradosFuturos.length > 1 ? 's' : ''} ignorado${diasIgnoradosFuturos.length > 1 ? 's' : ''}: ${diasIgnoradosFuturos.join(', ')}.`,
        );
      }
      if (pulados.length > 0) {
        partes.push(
          `${pulados.length} lançamento${pulados.length > 1 ? 's' : ''} já existia${pulados.length > 1 ? 'm' : ''} e foi mantido${pulados.length > 1 ? 's' : ''}.`,
        );
      }
      toast.success(partes.join(' '));
      setStatus('VALIDO');
      setFatiasVersao((versao) => versao + 1);
      onSuccess();
    } catch {
      toast.error('Erro ao executar OS');
    } finally {
      setExecutando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl min-[1092px]:w-[90vw] min-[1092px]:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3">
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
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              form="form-evento-alocacao"
              disabled={salvando || excluindo || confirmando || executando}
              className="px-4 py-2 rounded-lg bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              {salvando ? 'Salvando...' : eventoInicial ? 'Confirmar alterações' : 'Criar evento'}
            </button>
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
        </div>

        {isObra && projetoId && (
          <div className="px-6 py-3 border-b border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100">
            {prazoOs ? (
              <p className="text-sm">
                <span className="font-semibold">Prazo do cronograma</span>
                {' '}
                {prazoOs.inicio} → {prazoOs.fim}
                <span className="text-amber-800 dark:text-amber-200">
                  {' '}· {prazoOs.dias} dia{prazoOs.dias > 1 ? 's' : ''}
                </span>
              </p>
            ) : prazoOsAusente ? (
              <p className="text-sm">Esta OS ainda não tem data inicial e data final de cronograma.</p>
            ) : (
              <p className="text-sm">Carregando prazo da OS...</p>
            )}
          </div>
        )}

        <form id="form-evento-alocacao" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  if (isObra) marcarAjusteDia(e.target.value, 'inicio');
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Fim</label>
              <input
                type="datetime-local"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  if (isObra) marcarAjusteDia(e.target.value, 'fim');
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {isObra && horariosPorDia.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-dark-border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-dark-text">Horário de cada dia</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  O arraste conta 07:30–17:30 em cada dia, sem a madrugada. Ajuste o fim do dia aqui se a obra passar disso — o horário gravado entra na conta e não volta sozinho para o ciclo.
                </p>
              </div>
              <ul className="space-y-2">
                {horariosPorDia.map((horario) => (
                  <li key={horario.dia} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <span className="text-sm capitalize text-gray-700 dark:text-gray-200">
                      {labelDiaAlocacao(horario.dia)}
                    </span>
                    <input
                      type="time"
                      aria-label={`Início em ${labelDiaAlocacao(horario.dia)}`}
                      value={horario.inicio}
                      onChange={(e) => alterarHorarioDia(horario.dia, 'inicio', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg"
                    />
                    <input
                      type="time"
                      aria-label={`Fim em ${labelDiaAlocacao(horario.dia)}`}
                      value={horario.fim}
                      onChange={(e) => alterarHorarioDia(horario.dia, 'fim', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

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

          {isObra && projetoId && (
            <OsFatiasTempoBarras projetoId={projetoId} compacto atualizacao={fatiasVersao} />
          )}

          {/* Alocação: Obra = equipe OU funcionário | Reunião/Visita = apenas pessoas */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
                {isObra ? 'Alocação da obra' : 'Participantes'}
              </label>
              {isObra && (
                <div className="flex rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setGrupoAlvo('ENGENHARIA')}
                    className={`px-3 py-1.5 font-semibold ${grupoAlvo === 'ENGENHARIA' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-dark-bg text-gray-600'}`}
                  >
                    Marcar engenharia
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrupoAlvo('EXECUCAO')}
                    className={`px-3 py-1.5 font-semibold ${grupoAlvo === 'EXECUCAO' ? 'bg-amber-600 text-white' : 'bg-white dark:bg-dark-bg text-gray-600'}`}
                  >
                    Marcar execução
                  </button>
                </div>
              )}
            </div>

            {isObra && (
              <div className="flex rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden text-sm w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setModoAlocacaoObra('equipe');
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
              <div className="space-y-2">
                {funcionariosDisponiveis.length > 12 && (
                  <input
                    type="search"
                    value={filtroFuncionario}
                    onChange={(e) => setFiltroFuncionario(e.target.value)}
                    placeholder="Filtrar por nome ou cargo (opcional)..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    autoComplete="off"
                  />
                )}
                {carregandoFuncionarios ? (
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary py-2">
                    Carregando funcionários...
                  </p>
                ) : funcionariosFiltrados.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary py-2">
                    {filtroFuncionario.trim()
                      ? 'Nenhum funcionário corresponde ao filtro'
                      : 'Nenhum funcionário ativo cadastrado'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-0.5">
                    {funcionariosFiltrados.map((f) => {
                      const selecionado = idsPessoasSet.has(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => togglePessoa(f)}
                          aria-pressed={selecionado}
                          title={f.cargo || f.nome}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            selecionado
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-transparent border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
                          }`}
                        >
                          {f.nome}
                        </button>
                      );
                    })}
                  </div>
                )}
                {pessoasSelecionadas.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                    {pessoasSelecionadas.length} selecionado(s)
                  </p>
                )}
              </div>
            )}

            {isObra && pessoasSelecionadas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pessoasSelecionadas.map((m) => {
                  const grupo = idsEngenharia.includes(m.id) ? 'ENGENHARIA' : 'EXECUCAO';
                  return (
                    <span
                      key={m.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
                        grupo === 'ENGENHARIA'
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {m.nome}
                      <button
                        type="button"
                        onClick={() => marcarGrupo(m.id, grupo === 'ENGENHARIA' ? 'EXECUCAO' : 'ENGENHARIA')}
                        className="text-[10px] font-bold uppercase tracking-wide underline"
                      >
                        {grupo === 'ENGENHARIA' ? 'Engenharia' : 'Execução'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removerPessoa(m.id)}
                        className="hover:text-red-600"
                        aria-label={`Remover ${m.nome}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {isObra && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
                Veículos da frota
              </label>
              {veiculosDisponiveis.length > 12 && (
                <input
                  type="search"
                  value={filtroVeiculo}
                  onChange={(e) => setFiltroVeiculo(e.target.value)}
                  placeholder="Filtrar por modelo ou placa (opcional)..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoComplete="off"
                />
              )}
              {veiculosFiltrados.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary py-2">
                  {filtroVeiculo.trim()
                    ? 'Nenhum veículo corresponde ao filtro'
                    : 'Nenhum veículo ativo na frota'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-0.5">
                  {veiculosFiltrados.map((v) => {
                    const selecionado = idsVeiculosSet.has(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleVeiculo(v)}
                        aria-pressed={selecionado}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          selecionado
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-transparent border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300'
                        }`}
                      >
                        {v.modelo} · {v.placa}
                      </button>
                    );
                  })}
                </div>
              )}
              {veiculosSelecionados.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  {veiculosSelecionados.length} veículo(s) selecionado(s)
                </p>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    placeholder="Opcional"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Valor hora engenharia (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorHoraEngenharia}
                    onChange={(e) => setValorHoraEngenharia(e.target.value)}
                    placeholder="Usa a taxa do funcionário"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Valor hora execução (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorHoraExecucao}
                    onChange={(e) => setValorHoraExecucao(e.target.value)}
                    placeholder="Usa hora ou diária ÷ 8"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              {pessoasSelecionadas.length > 0 && (
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  {pessoasSelecionadas.map((membro) => {
                    const grupo = idsEngenharia.includes(membro.id) ? 'Engenharia' : 'Execução';
                    const manual = idsEngenharia.includes(membro.id)
                      ? taxaManual(valorHoraEngenharia)
                      : taxaManual(valorHoraExecucao);
                    const hora = manual != null && manual > 0 ? manual : resolverValorHora(membro);
                    return (
                      <li key={membro.id}>
                        {membro.nome} · {grupo} · {hora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h
                      </li>
                    );
                  })}
                </ul>
              )}
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
                disabled={excluindo || salvando || executando}
                className="px-5 py-2.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-red-800 dark:text-red-400 disabled:opacity-50 transition-colors"
              >
                {excluindo ? 'Excluindo...' : 'Excluir evento'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
          >
            Cancelar
          </button>
          {isObra && (
            <button
              type="button"
              onClick={handleExecutar}
              disabled={
                !eventoInicial ||
                !projetoId ||
                pessoasSelecionadas.length === 0 ||
                salvando ||
                excluindo ||
                confirmando ||
                executando
              }
              title={
                !eventoInicial
                  ? 'Salve o evento antes de executar'
                  : !projetoId
                    ? 'Vincule uma ordem de serviço'
                    : pessoasSelecionadas.length === 0
                      ? 'Inclua a equipe da obra'
                      : 'Grava o apontamento e marca a alocação como executada'
              }
              className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {executando ? 'Executando...' : 'Executar OS'}
            </button>
          )}
          {eventoInicial && status === 'PREVISAO' && (
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={salvando || excluindo || confirmando || executando}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {confirmando ? 'Confirmando...' : 'Confirmar alocação'}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCriarEvento;
