import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventContentArg, DatesSetArg } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { toast } from 'sonner';
import ModalCriarEvento from './ModalCriarEvento';
import {
  eventosCalendarioService,
  type EventoCalendario,
  type EventoStatus,
  type OrcamentoPreenchido,
  type CapacidadeDia,
} from '../services/eventosCalendarioService';
import { orcamentosService } from '../services/orcamentosService';
import { axiosApiService } from '../services/axiosApi';
import {
  alocacaoObraService,
  type AlocacaoCalendarioDTO,
  type RelatorioOcupacaoDTO,
} from '../services/AlocacaoObraService';
import CalendarioOcupacaoCards from './calendario/CalendarioOcupacaoCards';
import RelatorioOcupacaoRecursos from './calendario/RelatorioOcupacaoRecursos';

interface CalendarioHubProps {
  toggleSidebar: () => void;
}

type ViewMode = 'semana' | 'mes';

const TIPOS_FILTRO = [
  { id: 'OBRA', label: 'Obra', dot: 'bg-sky-500' },
  { id: 'REUNIAO', label: 'Reunião', dot: 'bg-violet-500' },
  { id: 'VISITA', label: 'Visita', dot: 'bg-rose-500' },
] as const;

const STATUS_FILTRO = [
  { id: 'PREVISAO' as EventoStatus, label: 'Previsão', dot: 'bg-amber-400', ring: 'ring-amber-300' },
  { id: 'VALIDO' as EventoStatus, label: 'Válido / Confirmado', dot: 'bg-emerald-500', ring: 'ring-emerald-300' },
] as const;

const STATUS_OS_FILTRO = [
  { id: 'APROVADO', label: 'OS Aprovada' },
  { id: 'EXECUCAO', label: 'OS Em Execução' },
] as const;

interface UsuarioResumo {
  id: string;
  nome: string;
}

interface OrcamentoBusca {
  id: string;
  titulo: string;
  numeroSequencial: number;
  status: string;
  previsaoInicio?: string | null;
  previsaoTermino?: string | null;
  venda?: { id: string } | null;
}

function getEventStyle(tipo: string, status: string) {
  const map: Record<string, { bg: string; border: string }> = {
    OBRA: { bg: '#e0f2fe', border: '#0284c7' },
    REUNIAO: { bg: '#ede9fe', border: '#7c3aed' },
    VISITA: { bg: '#ffe4e6', border: '#e11d48' },
  };
  const c = map[tipo] || map.REUNIAO;
  return {
    backgroundColor: c.bg,
    borderColor: status === 'VALIDO' ? '#059669' : c.border,
    textColor: '#1e293b',
    classNames: status === 'PREVISAO' ? ['border-dashed', 'fc-event-previsao'] : ['fc-event-valido'],
  };
}

function formatPeriodo(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function renderEventContent(arg: EventContentArg) {
  if (arg.event.extendedProps.tipo === 'ALOCACAO_OS') {
    return (
      <div className="px-1 py-0.5 overflow-hidden h-full">
        <div className="text-[9px] uppercase tracking-wide text-emerald-800 font-bold">Alocação OS</div>
        <div className="text-xs font-medium leading-tight truncate">{arg.event.title}</div>
      </div>
    );
  }
  const evento = arg.event.extendedProps.evento as EventoCalendario | undefined;
  const timeText = arg.timeText;
  return (
    <div className="px-1 py-0.5 overflow-hidden h-full flex flex-col">
      {timeText && <div className="text-[10px] font-semibold opacity-80 leading-tight">{timeText}</div>}
      <div className="text-xs font-medium leading-tight truncate">{arg.event.title}</div>
      {evento?.status === 'PREVISAO' && (
        <div className="text-[9px] uppercase tracking-wide text-amber-700 font-semibold">Previsão</div>
      )}
    </div>
  );
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function mesesNoIntervalo(inicio: Date, fim: Date): Array<{ mes: number; ano: number }> {
  const set = new Map<string, { mes: number; ano: number }>();
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
  while (d <= limite) {
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    set.set(key, { mes: d.getMonth() + 1, ano: d.getFullYear() });
    d.setMonth(d.getMonth() + 1);
  }
  return Array.from(set.values());
}

const CalendarioHub: React.FC<CalendarioHubProps> = ({ toggleSidebar }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [periodoLabel, setPeriodoLabel] = useState('');
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(false);
  const [tiposAtivos, setTiposAtivos] = useState<Set<string>>(new Set(TIPOS_FILTRO.map((t) => t.id)));
  const [statusAtivos, setStatusAtivos] = useState<Set<EventoStatus>>(
    new Set(STATUS_FILTRO.map((s) => s.id))
  );
  const [buscaEvento, setBuscaEvento] = useState('');
  const [buscaOrcamento, setBuscaOrcamento] = useState('');
  const [orcamentos, setOrcamentos] = useState<OrcamentoBusca[]>([]);
  const [rangeAtual, setRangeAtual] = useState<{ inicio: Date; fim: Date } | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoCalendario | null>(null);
  const [orcamentoPreenchido, setOrcamentoPreenchido] = useState<OrcamentoPreenchido | null>(null);
  const [datasIniciais, setDatasIniciais] = useState<{ dataInicio?: string; dataFim?: string }>();
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [filtroGerenteId, setFiltroGerenteId] = useState('');
  const [statusOsAtivos, setStatusOsAtivos] = useState<Set<string>>(
    new Set(STATUS_OS_FILTRO.map((s) => s.id))
  );
  const [capacidadeDias, setCapacidadeDias] = useState<CapacidadeDia[]>([]);
  const [capacidadeDiaria, setCapacidadeDiaria] = useState(0);
  const [relatorioOcupacao, setRelatorioOcupacao] = useState<RelatorioOcupacaoDTO | null>(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [alocacoesOs, setAlocacoesOs] = useState<AlocacaoCalendarioDTO[]>([]);
  const [mostrarAlocacoesOs, setMostrarAlocacoesOs] = useState(true);
  const [alocacaoDetalhe, setAlocacaoDetalhe] = useState<AlocacaoCalendarioDTO | null>(null);

  useEffect(() => {
    orcamentosService.listar().then((res) => {
      if (res.success && res.data) {
        const lista = Array.isArray(res.data) ? res.data : [];
        setOrcamentos(lista as OrcamentoBusca[]);
      }
    });
    axiosApiService.get<any[]>('/api/configuracoes/usuarios').then((res) => {
      if (res.success && res.data) {
        const lista = Array.isArray(res.data) ? res.data : [];
        setUsuarios(lista.map((u: any) => ({ id: u.id, nome: u.name || u.nome || u.email })));
      }
    });
  }, []);

  const carregarRelatorioOcupacao = useCallback(async () => {
    setLoadingRelatorio(true);
    try {
      const res = await alocacaoObraService.getRelatorioOcupacao();
      if (res.success && res.data) {
        setRelatorioOcupacao(res.data);
      }
    } catch {
      toast.error('Erro ao carregar relatório de ocupação');
    } finally {
      setLoadingRelatorio(false);
    }
  }, []);

  const carregarAlocacoesOs = useCallback(async (inicio: Date, fim: Date) => {
    try {
      const meses = mesesNoIntervalo(inicio, fim);
      const resultados = await Promise.all(
        meses.map(({ mes, ano }) => alocacaoObraService.getAlocacoesCalendario(mes, ano))
      );
      const map = new Map<string, AlocacaoCalendarioDTO>();
      for (const res of resultados) {
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((a) => map.set(a.id, a));
        }
      }
      setAlocacoesOs(Array.from(map.values()));
    } catch {
      setAlocacoesOs([]);
    }
  }, []);

  useEffect(() => {
    void carregarRelatorioOcupacao();
  }, [carregarRelatorioOcupacao]);

  const carregarCapacidade = useCallback(async (inicio: Date, fim: Date) => {
    try {
      const status = Array.from(statusOsAtivos).join(',');
      const res = await eventosCalendarioService.obterCapacidade({
        dataInicio: inicio.toISOString(),
        dataFim: fim.toISOString(),
        responsavelId: filtroGerenteId || undefined,
        status: status || undefined,
      });
      if (res.success && res.data) {
        setCapacidadeDias(res.data.dias);
        setCapacidadeDiaria(res.data.capacidadeDiariaHomemHora);
      }
    } catch {
      /* silencioso */
    }
  }, [filtroGerenteId, statusOsAtivos]);

  const carregarEventos = useCallback(async (inicio: Date, fim: Date) => {
    setLoading(true);
    try {
      const res = await eventosCalendarioService.listar({
        dataInicio: inicio.toISOString(),
        dataFim: fim.toISOString(),
        busca: buscaEvento.trim() || undefined,
      });
      if (res.success && res.data) {
        setEventos(res.data);
      }
      await carregarCapacidade(inicio, fim);
      await carregarAlocacoesOs(inicio, fim);
    } catch {
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [buscaEvento, carregarCapacidade, carregarAlocacoesOs]);

  const gargaloPorData = useMemo(() => {
    const map = new Map<string, CapacidadeDia>();
    capacidadeDias.forEach((d) => map.set(d.data, d));
    return map;
  }, [capacidadeDias]);

  const diasComGargalo = useMemo(
    () => capacidadeDias.filter((d) => d.gargalo),
    [capacidadeDias]
  );

  const handleDatesSet = useCallback((info: DatesSetArg) => {
    setPeriodoLabel(formatPeriodo(info.view.currentStart));
    setRangeAtual({ inicio: info.start, fim: info.end });
    carregarEventos(info.start, info.end);
  }, [carregarEventos]);

  useEffect(() => {
    if (rangeAtual) {
      carregarEventos(rangeAtual.inicio, rangeAtual.fim);
    }
  }, [buscaEvento, rangeAtual, carregarEventos, filtroGerenteId, statusOsAtivos]);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((e) => {
      if (!tiposAtivos.has(e.tipo)) return false;
      if (!statusAtivos.has(e.status)) return false;
      return true;
    });
  }, [eventos, tiposAtivos, statusAtivos]);

  const eventosAlocacaoOs = useMemo(() => {
    if (!mostrarAlocacoesOs) return [];
    return alocacoesOs.map((a) => {
      const recurso = a.equipe?.nome
        ? `Equipe ${a.equipe.nome}`
        : a.eletricista?.nome
          ? `El. ${a.eletricista.nome}`
          : 'Recurso';
      const fimExclusive = addDaysIso(String(a.dataFimPrevisto), 1);
      return {
        id: `aloc-os-${a.id}`,
        title: `${a.projeto.titulo} · ${recurso}`,
        start: String(a.dataInicio).slice(0, 10),
        end: fimExclusive,
        allDay: true,
        extendedProps: { tipo: 'ALOCACAO_OS', alocacao: a },
        backgroundColor: '#d1fae5',
        borderColor: '#059669',
        textColor: '#064e3b',
        classNames: ['fc-event-alocacao-os'],
      };
    });
  }, [alocacoesOs, mostrarAlocacoesOs]);

  const calendarEvents = useMemo(
    () => [
      ...eventosFiltrados.map((e) => ({
        id: e.id,
        title: e.titulo,
        start: e.dataInicio,
        end: e.dataFim,
        extendedProps: { evento: e },
        ...getEventStyle(e.tipo, e.status),
      })),
      ...eventosAlocacaoOs,
    ],
    [eventosFiltrados, eventosAlocacaoOs]
  );

  const orcamentosSugeridos = useMemo(() => {
    const termo = buscaOrcamento.trim().toLowerCase();
    if (!termo) return [];
    return orcamentos
      .filter((o) => !o.venda)
      .filter((o) => ['Pendente', 'Aprovado', 'Enviado ao Cliente'].includes(o.status))
      .filter(
        (o) =>
          o.titulo.toLowerCase().includes(termo) ||
          String(o.numeroSequencial).includes(termo)
      )
      .slice(0, 6);
  }, [buscaOrcamento, orcamentos]);

  const toggleTipo = (id: string) => {
    setTiposAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStatus = (id: EventoStatus) => {
    setStatusAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const abrirCriar = () => {
    setEventoEditando(null);
    setOrcamentoPreenchido(null);
    setDatasIniciais(undefined);
    setModalAberto(true);
  };

  const abrirComOrcamento = (orc: OrcamentoBusca) => {
    setEventoEditando(null);
    setOrcamentoPreenchido({
      id: orc.id,
      titulo: orc.titulo,
      previsaoInicio: orc.previsaoInicio,
      previsaoTermino: orc.previsaoTermino,
    });
    setBuscaOrcamento('');
    setModalAberto(true);
  };

  const handleEventClick = async (info: EventClickArg) => {
    if (info.event.extendedProps.tipo === 'ALOCACAO_OS') {
      setAlocacaoDetalhe(info.event.extendedProps.alocacao as AlocacaoCalendarioDTO);
      return;
    }
    const resumo = info.event.extendedProps.evento as EventoCalendario;
    if (!resumo?.id) return;
    setOrcamentoPreenchido(null);
    setModalAberto(true);

    const res = await eventosCalendarioService.buscar(resumo.id);
    if (res.success && res.data) {
      setEventoEditando(res.data);
    } else {
      setEventoEditando(resumo);
      toast.error('Não foi possível carregar os detalhes do evento');
    }
  };

  const handleDateSelect = (info: DateSelectArg) => {
    setEventoEditando(null);
    setOrcamentoPreenchido(null);
    setDatasIniciais({ dataInicio: info.startStr, dataFim: info.endStr });
    setModalAberto(true);
  };

  const navegar = (dir: -1 | 1) => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (dir < 0) api.prev();
    else api.next();
  };

  const irHoje = () => calendarRef.current?.getApi()?.today();

  const mudarView = (mode: ViewMode) => {
    setViewMode(mode);
    const api = calendarRef.current?.getApi();
    api?.changeView(mode === 'semana' ? 'timeGridWeek' : 'dayGridMonth');
  };

  const handleModalSuccess = () => {
    if (rangeAtual) carregarEventos(rangeAtual.inicio, rangeAtual.fim);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
      <style>{`
        .fc-event-previsao { border-style: dashed !important; border-width: 2px !important; }
        .fc-event-valido { border-width: 2px !important; border-left-width: 4px !important; }
        .calendario-hub .fc { --fc-border-color: #e5e7eb; }
        .dark .calendario-hub .fc { --fc-border-color: #1B2028; --fc-page-bg-color: #0F0F0F; --fc-neutral-bg-color: #151922; }
        .fc-day-gargalo { background-color: rgba(239, 68, 68, 0.12) !important; }
        .fc-event-alocacao-os { border-left-width: 4px !important; border-style: solid !important; }
      `}</style>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-dark-sidebar border-r border-gray-200 dark:border-dark-border-subtle p-5 gap-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-dark-text">Calendário</h1>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
              Previsão de alocação
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCriar}
            className="w-full py-2.5 px-4 rounded-xl bg-dark-accent hover:bg-[#3B82F6] text-white font-semibold text-sm transition-colors"
          >
            + Criar Evento
          </button>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Tipo</h2>
            <ul className="space-y-2">
              {TIPOS_FILTRO.map((t) => (
                <li key={t.id}>
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 dark:text-dark-text">
                    <input
                      type="checkbox"
                      checked={tiposAtivos.has(t.id)}
                      onChange={() => toggleTipo(t.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
                    {t.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Status</h2>
            <ul className="space-y-2">
              {STATUS_FILTRO.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 dark:text-dark-text">
                    <input
                      type="checkbox"
                      checked={statusAtivos.has(s.id)}
                      onChange={() => toggleStatus(s.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`w-2.5 h-2.5 rounded-full ring-2 ${s.ring} ${s.dot}`} />
                    {s.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">OS — Gerente</h2>
            <select
              className="select-field w-full text-sm"
              value={filtroGerenteId}
              onChange={(e) => setFiltroGerenteId(e.target.value)}
            >
              <option value="">Todos os gerentes</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">OS — Status</h2>
            <ul className="space-y-2">
              {STATUS_OS_FILTRO.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 dark:text-dark-text">
                    <input
                      type="checkbox"
                      checked={statusOsAtivos.has(s.id)}
                      onChange={() => {
                        setStatusOsAtivos((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        });
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {s.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Alocações de OS</h2>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 dark:text-dark-text">
              <input
                type="checkbox"
                checked={mostrarAlocacoesOs}
                onChange={(e) => setMostrarAlocacoesOs(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Mostrar alocações de OS
            </label>
            <p className="text-[10px] text-gray-500 mt-1 ml-6">Equipes e eletricistas (somente leitura)</p>
          </div>

          {capacidadeDiaria > 0 && (
            <div className="text-xs text-gray-600 dark:text-dark-text-secondary p-3 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
              <div className="font-semibold text-gray-800 dark:text-dark-text">Capacidade/dia</div>
              <div>{capacidadeDiaria}h homem-hora (8h × equipe ativa)</div>
              {diasComGargalo.length > 0 && (
                <div className="mt-2 text-red-700 font-semibold">
                  {diasComGargalo.length} dia(s) com gargalo no período
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar mobile header */}
          <div className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
            <button type="button" onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-bold text-gray-900 dark:text-dark-text">Calendário</h1>
            <button
              type="button"
              onClick={abrirCriar}
              className="ml-auto px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              + Criar
            </button>
          </div>

          {/* Topbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navegar(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-600 dark:text-dark-text"
                aria-label="Período anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={irHoje}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg capitalize"
              >
                {periodoLabel || 'Hoje'}
              </button>
              <button
                type="button"
                onClick={() => navegar(1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg text-gray-600 dark:text-dark-text"
                aria-label="Próximo período"
              >
                ›
              </button>
            </div>

            <div className="flex rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden text-sm bg-gray-50 dark:bg-dark-nav">
              <button
                type="button"
                onClick={() => mudarView('semana')}
                className={`px-4 py-2 font-medium transition-colors ${
                  viewMode === 'semana'
                    ? 'bg-white dark:bg-dark-accent-soft text-blue-600 dark:text-dark-accent-light shadow-sm'
                    : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => mudarView('mes')}
                className={`px-4 py-2 font-medium transition-colors border-l border-gray-200 dark:border-dark-border ${
                  viewMode === 'mes'
                    ? 'bg-white dark:bg-dark-accent-soft text-blue-600 dark:text-dark-accent-light shadow-sm'
                    : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated'
                }`}
              >
                Mês
              </button>
            </div>

            <div className="flex-1 min-w-[200px] max-w-md relative">
              <input
                type="search"
                value={buscaOrcamento}
                onChange={(e) => setBuscaOrcamento(e.target.value)}
                placeholder="Buscar orçamento aberto para vincular..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-sm text-gray-900 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-dark-muted focus:ring-2 focus:ring-dark-accent/30 focus:border-dark-accent outline-none"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {orcamentosSugeridos.length > 0 && (
                <ul className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl overflow-hidden">
                  {orcamentosSugeridos.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => abrirComOrcamento(o)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-bg text-sm"
                      >
                        <span className="font-medium">#{o.numeroSequencial}</span>
                        <span className="mx-2 text-gray-400">·</span>
                        <span>{o.titulo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              type="search"
              value={buscaEvento}
              onChange={(e) => setBuscaEvento(e.target.value)}
              placeholder="Buscar eventos..."
              className="w-40 sm:w-48 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-sm text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-dark-accent/30 focus:border-dark-accent outline-none"
            />

            <button
              type="button"
              onClick={abrirCriar}
              className="hidden lg:inline-flex px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
            >
              + Criar Evento
            </button>
          </div>

          <CalendarioOcupacaoCards
            resumo={relatorioOcupacao?.resumo ?? null}
            loading={loadingRelatorio}
            onAtualizar={() => void carregarRelatorioOcupacao()}
          />

          <RelatorioOcupacaoRecursos relatorio={relatorioOcupacao} loading={loadingRelatorio} />

          {/* Calendar grid */}
          <div className="flex-1 p-4 calendario-hub relative min-h-[500px]">
            {loading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-dark-bg/50 z-10 flex items-center justify-center">
                <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Carregando...</div>
              </div>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              locale={ptBrLocale}
              firstDay={1}
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot
              height="auto"
              expandRows
              selectable
              selectMirror
              events={calendarEvents}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              select={handleDateSelect}
              datesSet={handleDatesSet}
              nowIndicator
              dayCellClassNames={(arg) => {
                const y = arg.date.getFullYear();
                const m = String(arg.date.getMonth() + 1).padStart(2, '0');
                const d = String(arg.date.getDate()).padStart(2, '0');
                const key = `${y}-${m}-${d}`;
                return gargaloPorData.get(key)?.gargalo ? ['fc-day-gargalo'] : [];
              }}
            />
          </div>
        </div>
      </div>

      <ModalCriarEvento
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setEventoEditando(null);
          setOrcamentoPreenchido(null);
        }}
        onSuccess={handleModalSuccess}
        eventoInicial={eventoEditando}
        orcamentoPreenchido={orcamentoPreenchido}
        datasIniciais={datasIniciais}
      />

      {alocacaoDetalhe && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-md w-full p-6 space-y-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Alocação de OS</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>OS:</strong> {alocacaoDetalhe.projeto.titulo}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Cliente:</strong> {alocacaoDetalhe.projeto.cliente}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Recurso:</strong>{' '}
              {alocacaoDetalhe.equipe?.nome
                ? `Equipe ${alocacaoDetalhe.equipe.nome}`
                : alocacaoDetalhe.eletricista?.nome
                  ? `Eletricista ${alocacaoDetalhe.eletricista.nome}`
                  : '—'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Período:</strong>{' '}
              {new Date(alocacaoDetalhe.dataInicio).toLocaleDateString('pt-BR')} →{' '}
              {new Date(alocacaoDetalhe.dataFimPrevisto).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Status:</span> {alocacaoDetalhe.status}
            </p>
            <p className="text-xs text-gray-500 italic">
              Edite alocações no cockpit da ordem de serviço.
            </p>
            <button
              type="button"
              onClick={() => setAlocacaoDetalhe(null)}
              className="w-full mt-2 py-2 rounded-xl border border-gray-200 dark:border-dark-border font-semibold text-sm hover:bg-gray-50 dark:hover:bg-dark-bg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioHub;
