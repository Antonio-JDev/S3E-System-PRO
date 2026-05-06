import React, { useState, useMemo, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import type { Obra } from '../services/obrasService';

interface ObrasGanttChartProps {
  obras: Obra[];
  onSelectObra?: (obraId: string) => void;
}

const PHASE_ORDER = ['BACKLOG', 'A_FAZER', 'ANDAMENTO', 'CONCLUIDO'] as const;
type StatusObra = (typeof PHASE_ORDER)[number];

const FASE_TITULO: Record<StatusObra, string> = {
  BACKLOG: 'Backlog',
  A_FAZER: 'A fazer',
  ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluídas',
};

const MS_DAY = 86400000;

const equipeCores: { [key: string]: string } = {
  default: '#3B82F6',
  0: '#10B981',
  1: '#F59E0B',
  2: '#8B5CF6',
  3: '#EF4444',
  4: '#06B6D4',
  5: '#EC4899',
  6: '#14B8A6',
};

const statusCores: { [key: string]: { bg: string; border: string; text: string } } = {
  BACKLOG: { bg: '#F1F5F9', border: '#94A3B8', text: '#64748B' },
  A_FAZER: { bg: '#DBEAFE', border: '#60A5FA', text: '#1E40AF' },
  /** Amarelo/âmbar: distinto do verde de CONCLUIDO */
  ANDAMENTO: { bg: '#FEF3C7', border: '#EAB308', text: '#854D0E' },
  CONCLUIDO: { bg: '#D1FAE5', border: '#22C55E', text: '#14532D' },
};

function parseIso(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Início/fim usados no eixo (coerente com API de kanban enriquecida) */
function resolverDatasObra(obra: Obra): { inicio: Date; fim: Date } {
  const inicio =
    parseIso(obra.dataInicioReal) ??
    parseIso(obra.dataPrevistaInicio) ??
    parseIso(obra.createdAt) ??
    new Date(2020, 0, 1);

  let fim: Date;
  if (obra.status === 'CONCLUIDO') {
    fim =
      parseIso(obra.dataFimReal) ??
      parseIso(obra.dataPrevistaFim) ??
      new Date(inicio.getTime() + 29 * MS_DAY);
  } else {
    fim = parseIso(obra.dataPrevistaFim) ?? new Date(inicio.getTime() + 29 * MS_DAY);
  }

  if (fim.getTime() < inicio.getTime()) {
    fim = new Date(inicio.getTime() + MS_DAY);
  }
  return { inicio: startOfDay(inicio), fim: startOfDay(fim) };
}

function formatarIntervaloAgregado(min: Date, max: Date): string {
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${min.toLocaleDateString('pt-BR', o)} — ${max.toLocaleDateString('pt-BR', o)}`;
}

type TimelineMeta = {
  rangeStart: Date;
  rangeEndExclusive: Date;
  totalMs: number;
  meses: { nome: string; dias: number }[];
};

function useTimelineMeta(currentMonth: Date, zoomLevel: number): TimelineMeta {
  return useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const rangeStart = new Date(y, m, 1);
    const rangeEndExclusive = new Date(y, m + zoomLevel, 1);
    const totalMs = rangeEndExclusive.getTime() - rangeStart.getTime();
    const meses: { nome: string; dias: number }[] = [];
    for (let i = 0; i < zoomLevel; i++) {
      const mes = new Date(y, m + i, 1);
      meses.push({
        nome: mes.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        dias: new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate(),
      });
    }
    return { rangeStart, rangeEndExclusive, totalMs, meses };
  }, [currentMonth, zoomLevel]);
}

function calcularBarraNaJanela(
  barInicio: Date,
  barFim: Date,
  rangeStart: Date,
  rangeEndExclusive: Date
): { left: string; width: string } | null {
  const rs = rangeStart.getTime();
  const re = rangeEndExclusive.getTime();
  const bs = startOfDay(barInicio).getTime();
  const bfExclusive = startOfDay(barFim).getTime() + MS_DAY;
  const visStart = Math.max(bs, rs);
  const visEnd = Math.min(bfExclusive, re);
  if (visEnd <= visStart || re <= rs) return null;
  const leftPct = ((visStart - rs) / (re - rs)) * 100;
  const widthPct = ((visEnd - visStart) / (re - rs)) * 100;
  const minW = 0.35;
  return {
    left: `${leftPct}%`,
    width: `${Math.max(widthPct, minW)}%`,
  };
}

function posicaoHojePct(hoje: Date, rangeStart: Date, rangeEndExclusive: Date): number | null {
  const rs = rangeStart.getTime();
  const re = rangeEndExclusive.getTime();
  const h = startOfDay(hoje).getTime();
  if (h < rs || h >= re) return null;
  return ((h - rs) / (re - rs)) * 100;
}

type EquipeGrupo = { id: string; nome: string; obras: Obra[] };

type FaseGrupo = {
  status: StatusObra;
  titulo: string;
  equipes: EquipeGrupo[];
  intervaloLabel: string;
  totalObras: number;
};

function agruparPorEquipe(obras: Obra[]): EquipeGrupo[] {
  const map = new Map<string, EquipeGrupo>();
  obras.forEach((obra) => {
    const equipeId = obra.equipe?.id || 'sem-equipe';
    const equipeNome = obra.equipe?.nome || 'Sem Equipe';
    if (!map.has(equipeId)) {
      map.set(equipeId, { id: equipeId, nome: equipeNome, obras: [] });
    }
    map.get(equipeId)!.obras.push(obra);
  });
  return Array.from(map.values());
}

function construirFases(obras: Obra[]): FaseGrupo[] {
  const resultado: FaseGrupo[] = [];
  for (const status of PHASE_ORDER) {
    const naFase = obras.filter((o) => o.status === status);
    if (naFase.length === 0) continue;
    const datas = naFase.map(resolverDatasObra);
    const minInicio = new Date(Math.min(...datas.map((d) => d.inicio.getTime())));
    const maxFim = new Date(Math.max(...datas.map((d) => d.fim.getTime())));
    resultado.push({
      status,
      titulo: FASE_TITULO[status],
      equipes: agruparPorEquipe(naFase),
      intervaloLabel: formatarIntervaloAgregado(minInicio, maxFim),
      totalObras: naFase.length,
    });
  }
  return resultado;
}

type SequenceOverlayProps = {
  obrasOrdenadas: Obra[];
  getBarEl: (id: string) => HTMLDivElement | undefined;
  rev: number;
};

const SequenceOverlay: React.FC<SequenceOverlayProps> = ({ obrasOrdenadas, getBarEl, rev }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathDs, setPathDs] = useState<string[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || obrasOrdenadas.length < 2) {
      setPathDs([]);
      return;
    }
    const cr = container.getBoundingClientRect();
    const next: string[] = [];
    for (let i = 0; i < obrasOrdenadas.length - 1; i++) {
      const a = getBarEl(obrasOrdenadas[i].id);
      const b = getBarEl(obrasOrdenadas[i + 1].id);
      if (!a || !b) continue;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const x1 = ar.right - cr.left;
      const y1 = ar.top + ar.height / 2 - cr.top;
      const x2 = br.left - cr.left;
      const y2 = br.top + br.height / 2 - cr.top;
      const mid = (x1 + x2) / 2;
      next.push(`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
    }
    setPathDs(next);
  }, [obrasOrdenadas, getBarEl, rev]);

  if (obrasOrdenadas.length < 2) return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-visible z-[4]">
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        {pathDs.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#F97316"
            strokeWidth={1.25}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        ))}
      </svg>
    </div>
  );
};

const ObrasGanttChart: React.FC<ObrasGanttChartProps> = ({ obras, onSelectObra }) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3 | 6>(3);
  const [layoutRev, setLayoutRev] = useState(0);

  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const bindBarRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) barRefs.current.set(id, el);
    else barRefs.current.delete(id);
  }, []);

  const getBarEl = useCallback((id: string) => barRefs.current.get(id), []);

  const { rangeStart, rangeEndExclusive, meses } = useTimelineMeta(currentMonth, zoomLevel);

  const fases = useMemo(() => construirFases(obras), [obras]);

  useLayoutEffect(() => {
    setLayoutRev((r) => r + 1);
  }, [obras, currentMonth, zoomLevel, fases.length]);

  const hojePct = useMemo(
    () => posicaoHojePct(new Date(), rangeStart, rangeEndExclusive),
    [rangeStart, rangeEndExclusive]
  );

  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const [timelineHeaderH, setTimelineHeaderH] = useState(0);

  useLayoutEffect(() => {
    const el = timelineHeaderRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTimelineHeaderH(el.offsetHeight));
    ro.observe(el);
    setTimelineHeaderH(el.offsetHeight);
    return () => ro.disconnect();
  }, [zoomLevel, meses.length]);

  useEffect(() => {
    const onResize = () => setLayoutRev((r) => r + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const rotuloNavegacao = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const ini = new Date(y, m, 1);
    if (zoomLevel === 1) {
      return ini.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    const fimMes = new Date(y, m + zoomLevel - 1, 1);
    const a = ini.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const b = fimMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return `${a} — ${b}`;
  }, [currentMonth, zoomLevel]);

  const navigarMes = (direcao: 'prev' | 'next' | 'today') => {
    if (direcao === 'today') {
      setCurrentMonth(new Date());
    } else {
      const novaData = new Date(currentMonth);
      novaData.setMonth(currentMonth.getMonth() + (direcao === 'next' ? 1 : -1));
      setCurrentMonth(novaData);
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ minHeight: 'calc(100vh - 400px)' }}
    >
      <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-700">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Timeline das Obras
            </h3>
            <p className="text-sm text-blue-100 mt-1">Visualização de Gantt por fase e equipe</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              {([1, 2, 3, 6] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoomLevel(z)}
                  className={`px-3 py-1.5 rounded transition-all font-medium text-sm ${
                    zoomLevel === z ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-white/20'
                  }`}
                  title={`${z} ${z === 1 ? 'mês' : 'meses'}`}
                >
                  {z}M
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <button
                type="button"
                onClick={() => navigarMes('prev')}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                title="Período anterior"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-white font-semibold min-w-[200px] max-w-[280px] text-center capitalize text-sm">
                {rotuloNavegacao}
              </span>

              <button
                type="button"
                onClick={() => navigarMes('next')}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                title="Próximo período"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigarMes('today')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
            >
              Hoje
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status:</span>
          {Object.entries(statusCores).map(([status, cores]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: cores.border }} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{status.replace('_', ' ')}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">ATRASADA</span>
          </div>
          <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-4 ml-2">
            <div className="w-6 h-0.5 bg-orange-500 opacity-80 border-dashed" style={{ borderTop: '2px dashed #F97316' }} />
            <span className="text-xs text-gray-600 dark:text-gray-400 max-w-md">
              Linhas tracejadas: sequência sugerida por data (mesma equipe) — não é dependência cadastrada.
            </span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '400px' }}>
        {obras.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma obra encontrada</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Adicione obras para visualizar o timeline</p>
          </div>
        ) : (
          <div className="w-full relative">
            <div
              ref={timelineHeaderRef}
              className="flex border-b-2 border-gray-300 dark:border-gray-600 bg-gray-100/80 dark:bg-gray-800/80"
            >
              <div className="w-80 flex-shrink-0 px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r-2 border-gray-300 dark:border-gray-600">
                Fase / Equipe / Obra
              </div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${zoomLevel}, 1fr)` }}>
                {meses.map((mes, idx) => (
                  <div
                    key={idx}
                    className="text-center px-2 py-3 font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                  >
                    {mes.nome}
                  </div>
                ))}
              </div>
            </div>

            {fases.map((fase) => {
              const accent = statusCores[fase.status] || statusCores.BACKLOG;
              return (
                <div key={fase.status} className="border-b-2 border-gray-200 dark:border-gray-700">
                  <div
                    className="flex items-stretch bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/80 dark:to-gray-800/40"
                    style={{ borderLeft: `4px solid ${accent.border}` }}
                  >
                    <div className="w-80 flex-shrink-0 px-4 py-3 border-r-2 border-gray-300 dark:border-gray-600 flex flex-col justify-center gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{fase.titulo}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {fase.totalObras} {fase.totalObras === 1 ? 'obra' : 'obras'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{fase.intervaloLabel}</span>
                    </div>
                    <div className="flex-1 min-h-[52px] relative bg-white/30 dark:bg-gray-800/20" />
                  </div>

                  {fase.equipes.map((equipe, equipeIdx) => {
                    const cor = equipeCores[equipeIdx % 7] || equipeCores.default;
                    const obrasOrdenadas = [...equipe.obras].sort(
                      (a, b) => resolverDatasObra(a).inicio.getTime() - resolverDatasObra(b).inicio.getTime()
                    );
                    return (
                      <div key={`${fase.status}-${equipe.id}`} className="relative border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center bg-gray-50/90 dark:bg-gray-800/40">
                          <div
                            className="w-80 flex-shrink-0 px-4 py-2.5 border-r-2 border-gray-300 dark:border-gray-600 flex items-center gap-2"
                            style={{ borderLeft: `3px solid ${cor}` }}
                          >
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{equipe.nome}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">{equipe.obras.length}</span>
                          </div>
                          <div className="flex-1 h-10" />
                        </div>

                        <div className="relative">
                          <SequenceOverlay obrasOrdenadas={obrasOrdenadas} getBarEl={getBarEl} rev={layoutRev} />

                          {equipe.obras.map((obra) => {
                            const { inicio: dataInicio, fim: dataFim } = resolverDatasObra(obra);
                            const agora = startOfDay(new Date());
                            const isAtrasada = obra.status !== 'CONCLUIDO' && dataFim.getTime() < agora.getTime();
                            const posicao = calcularBarraNaJanela(dataInicio, dataFim, rangeStart, rangeEndExclusive);
                            const cores = isAtrasada
                              ? { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }
                              : statusCores[obra.status] || statusCores.BACKLOG;

                            return (
                              <div
                                key={obra.id}
                                className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                              >
                                <div className="w-80 flex-shrink-0 px-4 py-3 border-r-2 border-gray-300 dark:border-gray-600">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={obra.nomeObra}>
                                    {obra.nomeObra}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={obra.clienteNome}>
                                    {obra.clienteNome}
                                  </div>
                                </div>

                                <div className="flex-1 relative h-[72px] py-3 overflow-hidden">
                                  <div className="absolute inset-y-3 left-2 right-2">
                                    <div
                                      className="absolute inset-0 grid"
                                      style={{ gridTemplateColumns: `repeat(${zoomLevel}, 1fr)` }}
                                    >
                                      {meses.map((_, idx) => (
                                        <div
                                          key={idx}
                                          className="border-r border-gray-200 dark:border-gray-700 last:border-r-0 bg-white/40 dark:bg-gray-900/20"
                                        />
                                      ))}
                                    </div>

                                    {posicao ? (
                                    <div
                                      ref={bindBarRef(obra.id)}
                                      className="absolute top-1/2 -translate-y-1/2 h-9 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg group"
                                      style={{
                                        left: posicao.left,
                                        width: posicao.width,
                                        maxWidth: '100%',
                                        background: `linear-gradient(to right, ${cores.bg}, ${cores.bg}dd)`,
                                        border: `2px solid ${cores.border}`,
                                        zIndex: selectedObraId === obra.id ? 12 : 6,
                                      }}
                                      onClick={() => {
                                        setSelectedObraId(obra.id);
                                        onSelectObra?.(obra.id);
                                      }}
                                    >
                                      <div className="h-full flex items-center px-2 gap-1.5 overflow-hidden">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cores.border }} />
                                        <span className="text-xs font-semibold truncate" style={{ color: cores.text }}>
                                          {obra.nomeObra}
                                        </span>
                                        {isAtrasada && (
                                          <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                          </svg>
                                        )}
                                      </div>

                                      <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 min-w-[260px] max-w-[300px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                        <div className="font-bold text-gray-900 dark:text-gray-100 text-sm border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                                          {obra.nomeObra}
                                        </div>
                                        <div className="grid gap-1.5 text-xs">
                                          <div className="flex justify-between gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">Cliente</span>
                                            <span className="font-medium text-right text-gray-900 dark:text-gray-100">{obra.clienteNome}</span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">Status</span>
                                            <span className="font-semibold" style={{ color: cores.border }}>
                                              {obra.status.replace('_', ' ')}
                                            </span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">Progresso</span>
                                            <span className="font-medium">{obra.progresso}%</span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">Equipe</span>
                                            <span className="font-medium text-right">{equipe.nome}</span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">Início</span>
                                            <span className="font-medium">{dataInicio.toLocaleDateString('pt-BR')}</span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">Fim previsto</span>
                                            <span className="font-medium">{dataFim.toLocaleDateString('pt-BR')}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-400 dark:text-gray-500 px-4 text-center">
                                        Fora do período visível — use as setas ou o zoom.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {hojePct != null && (
              <div
                className="absolute bottom-0 left-80 right-0 pointer-events-none z-[15]"
                style={{ top: timelineHeaderH }}
              >
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                  style={{ left: `${hojePct}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                    Hoje
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ObrasGanttChart;
