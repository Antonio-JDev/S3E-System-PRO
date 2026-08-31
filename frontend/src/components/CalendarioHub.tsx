import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { Draggable, type EventReceiveArg } from '@fullcalendar/interaction';
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
import { ordemServicosService, type Projeto } from '../services/ordemServicosService';
import { projetoMatchesBusca } from '../utils/buscaOs.util';
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

/** Cores saturadas estilo schedule (opcao-3) — fundo escuro + texto claro */
function getEventStyle(tipo: string, status: string, temOs: boolean) {
  if (!temOs) {
    return {
      backgroundColor: '#1e293b',
      borderColor: status === 'PREVISAO' ? '#f59e0b' : '#94a3b8',
      textColor: '#f8fafc',
      classNames: [
        'fc-event-schedule-card',
        'fc-event-sem-os',
        status === 'PREVISAO' ? 'fc-event-previsao' : 'fc-event-valido',
      ],
    };
  }
  const map: Record<string, { bg: string; border: string }> = {
    OBRA: { bg: '#0c4a6e', border: '#38bdf8' },
    REUNIAO: { bg: '#4c1d95', border: '#a78bfa' },
    VISITA: { bg: '#9f1239', border: '#fb7185' },
  };
  const c = map[tipo] || map.OBRA;
  const isPrev = status === 'PREVISAO';
  return {
    backgroundColor: c.bg,
    borderColor: isPrev ? '#fbbf24' : status === 'VALIDO' ? '#34d399' : c.border,
    textColor: '#f8fafc',
    classNames: [
      'fc-event-schedule-card',
      isPrev ? 'fc-event-previsao' : 'fc-event-valido',
    ],
  };
}

function formatPeriodo(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function labelOs(evento?: EventoCalendario): string | null {
  if (!evento?.projeto) return null;
  const n = evento.projeto.orcamento?.numeroSequencial;
  return n ? `OS-${n}` : evento.projeto.titulo;
}

function tituloCardEvento(evento?: EventoCalendario): string {
  const os = labelOs(evento);
  if (os && evento?.projeto?.titulo && !String(evento.projeto.titulo).startsWith('OS-')) {
    const curto = evento.projeto.titulo.length > 28
      ? `${evento.projeto.titulo.slice(0, 28)}…`
      : evento.projeto.titulo;
    return `${os} · ${curto}`;
  }
  if (os) return os;
  return 'Vincular OS';
}

function renderEventContent(arg: EventContentArg) {
  if (arg.event.extendedProps.tipo === 'ALOCACAO_OS') {
    return (
      <div className="px-2 py-1 overflow-hidden h-full" style={{ color: '#ecfdf5' }}>
        <div className="text-[9px] uppercase tracking-wide font-bold opacity-90">Alocação OS</div>
        <div className="text-[11px] font-semibold leading-tight truncate">{arg.event.title}</div>
      </div>
    );
  }
  const evento = arg.event.extendedProps.evento as EventoCalendario | undefined;
  const timeText = arg.timeText;
  const titulo = tituloCardEvento(evento);
  const semOs = !evento?.projeto;
  const equipe = evento?.equipe ?? [];
  const isPrev = evento?.status === 'PREVISAO';
  const bg = arg.event.backgroundColor || '#0f172a';
  const fg = '#f8fafc';

  return (
    <div
      className="px-2 py-1.5 overflow-hidden h-full flex flex-col gap-0.5 min-h-0 rounded-[10px]"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          className="text-[12px] font-bold leading-snug line-clamp-2"
          style={{ color: semOs ? '#fde68a' : '#ffffff' }}
          title={titulo}
        >
          {titulo}
        </div>
        {isPrev && (
          <span
            className="shrink-0 text-[8px] uppercase tracking-wide font-bold px-1 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(251, 191, 36, 0.25)',
              color: '#fef3c7',
              border: '1px solid rgba(251, 191, 36, 0.7)',
            }}
          >
            Prev.
          </span>
        )}
      </div>
      {timeText && (
        <div className="text-[10px] font-semibold leading-tight" style={{ color: '#cbd5e1' }}>
          {timeText}
        </div>
      )}
      {equipe.length > 0 ? (
        <div className="flex items-center gap-1.5 mt-auto pt-1 min-w-0">
          <div className="flex -space-x-1.5 shrink-0">
            {equipe.slice(0, 4).map((p) => (
              <span
                key={p.id}
                title={p.nome}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#fff',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.35)',
                }}
              >
                {iniciais(p.nome)}
              </span>
            ))}
            {equipe.length > 4 && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  color: '#fff',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.35)',
                }}
              >
                +{equipe.length - 4}
              </span>
            )}
          </div>
          <span
            className="text-[10px] truncate font-semibold"
            style={{ color: '#e2e8f0' }}
            title={equipe.map((p) => p.nome).join(', ')}
          >
            {equipe.length === 1
              ? equipe[0].nome.split(/\s+/)[0]
              : `${equipe.length} pessoas`}
          </span>
        </div>
      ) : (
        <div className="text-[9px] mt-auto italic" style={{ color: '#94a3b8' }}>
          Sem equipe
        </div>
      )}
      {(evento?.veiculos?.length ?? 0) > 0 && (
        <div className="text-[9px] truncate font-semibold" style={{ color: '#bae6fd' }} title={evento!.veiculos!.map((v) => `${v.modelo} (${v.placa})`).join(', ')}>
          🚗 {evento!.veiculos!.map((v) => v.placa).join(', ')}
        </div>
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

function osSidebarCardClasses(status: string): {
  card: string;
  badge: string;
  subtitle: string;
} {
  if (status === 'APROVADO') {
    return {
      card: 'fc-external-event flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-emerald-300/80 dark:border-emerald-800 bg-emerald-950 text-white cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-emerald-400/60 shadow-sm',
      badge: 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white ring-2 ring-white/20',
      subtitle: 'text-[10px] text-emerald-200 truncate',
    };
  }
  if (status === 'EXECUCAO') {
    return {
      card: 'fc-external-event flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-amber-300/80 dark:border-amber-800 bg-amber-950 text-white cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400/60 shadow-sm',
      badge: 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white ring-2 ring-white/20',
      subtitle: 'text-[10px] text-amber-200 truncate',
    };
  }
  return {
    card: 'fc-external-event flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-sky-200/80 dark:border-dark-border bg-sky-950 text-white cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-sky-400/60 shadow-sm',
    badge: 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white ring-2 ring-white/20',
    subtitle: 'text-[10px] text-sky-200 truncate',
  };
}

const CalendarioHub: React.FC<CalendarioHubProps> = ({ toggleSidebar }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const osListaRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('semana');
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
  const [osDrop, setOsDrop] = useState<{
    projetoId: string;
    titulo: string;
    numeroOs: string;
    dataInicio: string;
    dataFim: string;
  } | null>(null);
  const [ordensServico, setOrdensServico] = useState<Projeto[]>([]);
  const [buscaOsSidebar, setBuscaOsSidebar] = useState('');
  const [filtroGerenteId, setFiltroGerenteId] = useState('');
  const [statusOsAtivos, setStatusOsAtivos] = useState<Set<string>>(
    new Set(STATUS_OS_FILTRO.map((s) => s.id))
  );
  const [capacidadeDias, setCapacidadeDias] = useState<CapacidadeDia[]>([]);
  const [capacidadeDiaria, setCapacidadeDiaria] = useState(0);
  const [relatorioOcupacao, setRelatorioOcupacao] = useState<RelatorioOcupacaoDTO | null>(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [alocacoesOs, setAlocacoesOs] = useState<AlocacaoCalendarioDTO[]>([]);
  const [mostrarAlocacoesOs, setMostrarAlocacoesOs] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const [alocacaoDetalhe, setAlocacaoDetalhe] = useState<AlocacaoCalendarioDTO | null>(null);
  const [painelOcupacaoAberto, setPainelOcupacaoAberto] = useState(false);

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
    ordemServicosService.listar().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setOrdensServico(
          res.data.filter(
            (p) => p.status !== 'CANCELADO' && p.status !== 'CONCLUIDO' && !p.semObra,
          ),
        );
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
        backgroundColor: '#064e3b',
        borderColor: '#34d399',
        textColor: '#ecfdf5',
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
        ...getEventStyle(e.tipo, e.status, Boolean(e.projeto)),
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
    setOsDrop(null);
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
    setOsDrop(null);
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

  const labelOsProjeto = (p: Projeto): string => {
    const n = p.orcamento?.numeroSequencial;
    return n ? `OS-${n}` : p.titulo;
  };

  const ordensServicoFiltradas = useMemo(() => {
    const termo = buscaOsSidebar.trim();
    if (!termo) return ordensServico;
    return ordensServico.filter((p) => projetoMatchesBusca(p, termo));
  }, [ordensServico, buscaOsSidebar]);

  useEffect(() => {
    const el = osListaRef.current;
    if (!el) return;
    const draggable = new Draggable(el, {
      itemSelector: '[data-projeto-id]',
      eventData: (itemEl) => ({
        title: itemEl.getAttribute('data-titulo') || 'OS',
        duration: { days: 1 },
        create: true,
        extendedProps: {
          projetoId: itemEl.getAttribute('data-projeto-id'),
          numeroOs: itemEl.getAttribute('data-numero-os'),
        },
      }),
    });
    return () => draggable.destroy();
  }, [ordensServicoFiltradas]);

  const handleEventReceive = (info: EventReceiveArg) => {
    const projetoId = String(info.event.extendedProps.projetoId || '');
    const titulo = info.event.title || 'OS';
    const numeroOs = String(info.event.extendedProps.numeroOs || '');
    const start = info.event.start;
    const end = info.event.end;
    info.event.remove();
    if (!projetoId || !start) {
      toast.error('Não foi possível planejar a ordem de serviço');
      return;
    }
    const dataFim = end ?? new Date(start.getTime() + 8 * 3600_000);
    setEventoEditando(null);
    setOrcamentoPreenchido(null);
    setDatasIniciais({ dataInicio: start.toISOString(), dataFim: dataFim.toISOString() });
    setOsDrop({
      projetoId,
      titulo,
      numeroOs,
      dataInicio: start.toISOString(),
      dataFim: dataFim.toISOString(),
    });
    setModalAberto(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
      <style>{`
        .calendario-hub {
          --fc-border-color: #cbd5e1;
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: #f1f5f9;
          --fc-today-bg-color: rgba(14, 165, 233, 0.12);
          --fc-now-indicator-color: #ef4444;
          --fc-event-text-color: #f8fafc;
        }
        .dark .calendario-hub {
          --fc-border-color: #1e293b;
          --fc-neutral-bg-color: #0f172a;
          --fc-today-bg-color: rgba(56, 189, 248, 0.1);
          --fc-page-bg-color: transparent;
        }
        .calendario-hub .fc { font-family: inherit; }
        .calendario-hub .fc-theme-standard td,
        .calendario-hub .fc-theme-standard th { border-color: var(--fc-border-color); }
        .calendario-hub .fc-col-header-cell {
          padding: 12px 4px;
          background: #0f172a;
        }
        .calendario-hub .fc-col-header-cell-cushion {
          color: #e2e8f0 !important;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-decoration: none !important;
        }
        .dark .calendario-hub .fc-col-header-cell { background: #020617; }
        .calendario-hub .fc-daygrid-day-number {
          color: #0f172a !important;
          font-weight: 700;
          font-size: 13px;
          padding: 6px 8px !important;
        }
        .dark .calendario-hub .fc-daygrid-day-number {
          color: #e2e8f0 !important;
        }
        .calendario-hub .fc-daygrid-day.fc-day-other .fc-daygrid-day-number {
          color: #94a3b8 !important;
        }
        .calendario-hub .fc-timegrid-slot { height: 2.85rem; }
        .calendario-hub .fc-timegrid-slot-label-cushion {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }
        .dark .calendario-hub .fc-timegrid-slot-label-cushion { color: #94a3b8; }
        .calendario-hub .fc-event {
          border: none !important;
          border-left: 3px solid var(--fc-event-border-color, #38bdf8) !important;
          border-radius: 10px !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
          overflow: hidden;
          color: #f8fafc !important;
        }
        .calendario-hub .fc-timegrid-event {
          margin: 1px 4px !important;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.28);
        }
        .calendario-hub .fc-daygrid-event {
          margin: 1px 3px !important;
          padding: 0 !important;
          min-height: 2.25rem;
        }
        .calendario-hub .fc-daygrid-block-event .fc-event-main {
          padding: 0 !important;
          color: inherit !important;
        }
        .calendario-hub .fc-h-event {
          background-color: var(--fc-event-bg-color) !important;
          border-color: var(--fc-event-border-color) !important;
        }
        .calendario-hub .fc-event-schedule-card {
          background-color: var(--fc-event-bg-color, #0f172a) !important;
        }
        .calendario-hub .fc-event-previsao {
          border-style: dashed !important;
          border-left-width: 3px !important;
          border-left-color: #f59e0b !important;
        }
        .calendario-hub .fc-event-valido {
          border-style: solid !important;
        }
        .calendario-hub .fc-event-main { padding: 0 !important; color: inherit !important; }
        .calendario-hub .fc-day-gargalo { background: rgba(254, 202, 202, 0.55) !important; }
        .dark .calendario-hub .fc-day-gargalo { background: rgba(127, 29, 29, 0.28) !important; }
        .calendario-hub .fc-scrollgrid {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--fc-border-color) !important;
          background: #fff;
        }
        .dark .calendario-hub .fc-scrollgrid { background: #0b1220; }
        .calendario-hub .fc-timegrid-col.fc-day-today,
        .calendario-hub .fc-daygrid-day.fc-day-today {
          background: var(--fc-today-bg-color) !important;
        }
        .calendario-hub .fc-timegrid-now-indicator-line { border-width: 2px 0 0; }
        .calendario-hub .fc-event-alocacao-os {
          background: #064e3b !important;
          border-left-color: #34d399 !important;
          color: #ecfdf5 !important;
        }
        .calendario-hub .fc-daygrid-event-dot { display: none !important; }
      `}</style>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-dark-sidebar border-r border-gray-200 dark:border-dark-border-subtle p-5 gap-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-dark-text">Calendário</h1>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
              Arraste a ordem de serviço para definir quando será executada. Sempre cria em Previsão.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Ordens de serviço</h2>
            <input
              type="search"
              value={buscaOsSidebar}
              onChange={(e) => setBuscaOsSidebar(e.target.value)}
              placeholder="Buscar OS, cliente..."
              className="w-full mb-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-sm"
            />
            <div ref={osListaRef} className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {ordensServicoFiltradas.map((p) => {
                const estilo = osSidebarCardClasses(p.status);
                return (
                <div
                  key={p.id}
                  data-projeto-id={p.id}
                  data-titulo={p.titulo}
                  data-numero-os={labelOsProjeto(p)}
                  className={estilo.card}
                >
                  <span className={estilo.badge}>
                    {labelOsProjeto(p).replace('OS-', '').slice(0, 4)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{labelOsProjeto(p)}</div>
                    <div className={estilo.subtitle}>
                      {p.cliente?.nome || p.titulo}
                    </div>
                  </div>
                </div>
              );
              })}
              {ordensServicoFiltradas.length === 0 && (
                <p className="text-xs text-gray-500 py-2">Nenhuma OS disponível</p>
              )}
            </div>
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
          <div className="flex flex-wrap items-center gap-2.5 p-4 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-nav p-0.5">
              <button
                type="button"
                onClick={() => navegar(-1)}
                className="w-8 h-8 rounded-full hover:bg-white dark:hover:bg-dark-elevated text-gray-600 dark:text-dark-text"
                aria-label="Período anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={irHoje}
                className="px-3 py-1.5 text-sm rounded-full font-semibold text-gray-800 dark:text-dark-text hover:bg-white dark:hover:bg-dark-elevated capitalize"
              >
                {periodoLabel || 'Hoje'}
              </button>
              <button
                type="button"
                onClick={() => navegar(1)}
                className="w-8 h-8 rounded-full hover:bg-white dark:hover:bg-dark-elevated text-gray-600 dark:text-dark-text"
                aria-label="Próximo período"
              >
                ›
              </button>
            </div>

            <div className="flex rounded-full border border-gray-200 dark:border-dark-border overflow-hidden text-sm bg-gray-50 dark:bg-dark-nav">
              <button
                type="button"
                onClick={() => mudarView('semana')}
                className={`px-4 py-1.5 font-semibold transition-colors ${
                  viewMode === 'semana'
                    ? 'bg-slate-900 text-white dark:bg-sky-600'
                    : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => mudarView('mes')}
                className={`px-4 py-1.5 font-semibold transition-colors ${
                  viewMode === 'mes'
                    ? 'bg-slate-900 text-white dark:bg-sky-600'
                    : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-elevated'
                }`}
              >
                Mês
              </button>
            </div>

            <div className="flex-1 min-w-[180px] max-w-sm relative">
              <input
                type="search"
                value={buscaOrcamento}
                onChange={(e) => setBuscaOrcamento(e.target.value)}
                placeholder="Buscar orçamento para vincular..."
                className="w-full pl-9 pr-3 py-2 rounded-full border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-sm text-gray-900 dark:text-dark-text placeholder:text-gray-400 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none"
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
              className="w-36 sm:w-44 px-4 py-2 rounded-full border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
            />

            <button
              type="button"
              onClick={() => setPainelOcupacaoAberto((v) => !v)}
              className="px-3 py-2 rounded-full border border-gray-200 dark:border-dark-border text-xs font-semibold text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-elevated"
            >
              {painelOcupacaoAberto ? 'Ocultar ocupação' : 'Ocupação'}
            </button>

            <button
              type="button"
              onClick={abrirCriar}
              className="hidden lg:inline-flex px-5 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              + Criar Evento
            </button>
          </div>

          {painelOcupacaoAberto && (
            <>
              <CalendarioOcupacaoCards
                resumo={relatorioOcupacao?.resumo ?? null}
                loading={loadingRelatorio}
                onAtualizar={() => void carregarRelatorioOcupacao()}
              />
              <RelatorioOcupacaoRecursos relatorio={relatorioOcupacao} loading={loadingRelatorio} />
            </>
          )}

          {eventosFiltrados.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Na semana</div>
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {eventosFiltrados.slice(0, 8).map((e) => {
                  const estilo = getEventStyle(e.tipo, e.status, Boolean(e.projeto));
                  const equipe = e.equipe ?? [];
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setEventoEditando(e);
                        setOrcamentoPreenchido(null);
                        setModalAberto(true);
                      }}
                      className={`shrink-0 w-[200px] text-left rounded-xl px-3 py-2.5 border-l-[3px] shadow-md ${
                        e.status === 'PREVISAO' ? 'border-dashed' : 'border-solid'
                      }`}
                      style={{
                        backgroundColor: estilo.backgroundColor,
                        borderColor: estilo.borderColor,
                        color: estilo.textColor,
                      }}
                    >
                      <div className="text-[12px] font-bold leading-snug line-clamp-2">
                        {tituloCardEvento(e)}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        {new Date(e.dataInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(e.dataFim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {equipe.length > 0 && (
                        <div className="flex -space-x-1.5 mt-2">
                          {equipe.slice(0, 4).map((p) => (
                            <span
                              key={p.id}
                              title={p.nome}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-[8px] font-bold text-white ring-2 ring-white/20"
                            >
                              {iniciais(p.nome)}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              initialView="timeGridWeek"
              headerToolbar={false}
              locale={ptBrLocale}
              firstDay={1}
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={mostrarAlocacoesOs}
              height="auto"
              expandRows
              selectable
              selectMirror
              droppable
              eventDisplay="block"
              events={calendarEvents}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              eventReceive={handleEventReceive}
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
          setOsDrop(null);
        }}
        onSuccess={handleModalSuccess}
        eventoInicial={eventoEditando}
        orcamentoPreenchido={orcamentoPreenchido}
        datasIniciais={datasIniciais}
        osDrop={osDrop}
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
