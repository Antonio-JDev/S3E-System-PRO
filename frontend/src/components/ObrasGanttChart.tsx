import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';

interface Obra {
  id: string;
  nomeObra: string;
  status: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';
  clienteNome: string;
  dataPrevistaFim?: string;
  progresso: number;
  equipe?: {
    id: string;
    nome: string;
  };
  dataInicio?: string;
}

interface ObrasGanttChartProps {
  obras: Obra[];
  onSelectObra?: (obraId: string) => void;
}

// Cores por equipe
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

// Cores por status
const statusCores: { [key: string]: { bg: string; border: string; text: string } } = {
  BACKLOG: { bg: '#F1F5F9', border: '#94A3B8', text: '#64748B' },
  A_FAZER: { bg: '#DBEAFE', border: '#60A5FA', text: '#1E40AF' },
  ANDAMENTO: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  CONCLUIDO: { bg: '#D1FAE5', border: '#22C55E', text: '#14532D' },
};

const ObrasGanttChart: React.FC<ObrasGanttChartProps> = ({ obras, onSelectObra }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3 | 6>(3); // Número de meses visíveis

  // Preparar dados agrupados por equipe
  const { equipes, diasNoMes } = useMemo(() => {
    // Calcular início e fim do período (baseado no zoomLevel)
    const inicio = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const fim = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + zoomLevel, 0);
    
    // Calcular dias entre início e fim
    const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    // Agrupar obras por equipe
    const equipesMap = new Map<string, { id: string; nome: string; obras: Obra[] }>();
    
    obras.forEach(obra => {
      const equipeId = obra.equipe?.id || 'sem-equipe';
      const equipeNome = obra.equipe?.nome || 'Sem Equipe';
      
      if (!equipesMap.has(equipeId)) {
        equipesMap.set(equipeId, {
          id: equipeId,
          nome: equipeNome,
          obras: []
        });
      }
      equipesMap.get(equipeId)!.obras.push(obra);
    });

    return {
      equipes: Array.from(equipesMap.values()),
      diasNoMes: dias,
      inicioPeriodo: inicio,
      fimPeriodo: fim
    };
  }, [obras, currentMonth, zoomLevel]);

  // Calcular posição e largura da barra no timeline
  const calcularPosicaoBarra = (dataInicio: Date, dataFim: Date) => {
    const inicio = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const fim = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 3, 0);
    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    const diasAteInicio = Math.max(0, Math.ceil((dataInicio.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
    const duracaoDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));

    const left = (diasAteInicio / totalDias) * 100;
    const width = Math.max(2, (duracaoDias / totalDias) * 100);

    return { left: `${left}%`, width: `${width}%` };
  };

  // Navegar entre meses
  const navigarMes = (direcao: 'prev' | 'next' | 'today') => {
    if (direcao === 'today') {
      setCurrentMonth(new Date());
    } else {
      const novaData = new Date(currentMonth);
      novaData.setMonth(currentMonth.getMonth() + (direcao === 'next' ? 1 : -1));
      setCurrentMonth(novaData);
    }
  };

  // Formatar mês/ano
  const formatarMes = (data: Date) => {
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Gerar linha do tempo (dias do mês) baseado no zoom
  const gerarLinhaDoTempo = () => {
    const meses = [];
    for (let i = 0; i < zoomLevel; i++) {
      const mes = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
      meses.push({
        nome: mes.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
        dias: new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
      });
    }
    return meses;
  };

  const meses = gerarLinhaDoTempo();
  const hoje = new Date();
  const posicaoHoje = calcularPosicaoBarra(
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    hoje
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ minHeight: 'calc(100vh - 400px)' }}>
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Timeline das Obras
            </h3>
            <p className="text-sm text-blue-100 mt-1">Visualização de Gantt por Equipe</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setZoomLevel(1)}
                className={`px-3 py-1.5 rounded transition-all font-medium text-sm ${
                  zoomLevel === 1
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-white hover:bg-white/20'
                }`}
                title="1 mês"
              >
                1M
              </button>
              <button
                onClick={() => setZoomLevel(2)}
                className={`px-3 py-1.5 rounded transition-all font-medium text-sm ${
                  zoomLevel === 2
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-white hover:bg-white/20'
                }`}
                title="2 meses"
              >
                2M
              </button>
              <button
                onClick={() => setZoomLevel(3)}
                className={`px-3 py-1.5 rounded transition-all font-medium text-sm ${
                  zoomLevel === 3
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-white hover:bg-white/20'
                }`}
                title="3 meses"
              >
                3M
              </button>
              <button
                onClick={() => setZoomLevel(6)}
                className={`px-3 py-1.5 rounded transition-all font-medium text-sm ${
                  zoomLevel === 6
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-white hover:bg-white/20'
                }`}
                title="6 meses"
              >
                6M
              </button>
            </div>

            {/* Separador visual */}
            <div className="h-8 w-px bg-white/20"></div>

            {/* Navegação de mês */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <button
                onClick={() => navigarMes('prev')}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                title="Período anterior"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <span className="text-white font-semibold min-w-[180px] text-center capitalize">
                {formatarMes(currentMonth)}
              </span>
              
              <button
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
              onClick={() => navigarMes('today')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium"
            >
              Hoje
            </button>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status:</span>
          {Object.entries(statusCores).map(([status, cores]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: cores.border }}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">ATRASADA</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="w-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '400px' }}>
        {obras.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma obra encontrada</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Adicione obras para visualizar o timeline</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Header com meses */}
            <div className="flex border-b-2 border-gray-300 dark:border-gray-600">
              <div className="w-80 flex-shrink-0 bg-gray-100 dark:bg-gray-800 px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 border-r-2 border-gray-300 dark:border-gray-600">
                Equipe / Obra
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

            {/* Linhas das equipes e obras */}
            {equipes.map((equipe, equipeIdx) => {
              const cor = equipeCores[equipeIdx] || equipeCores.default;
              
              return (
                <div key={equipe.id} className="border-b border-gray-200 dark:border-gray-700">
                  {/* Linha da equipe */}
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800/50">
                    <div
                      className="w-80 flex-shrink-0 px-4 py-3 border-r-2 border-gray-300 dark:border-gray-600 flex items-center gap-3"
                      style={{ borderLeft: `4px solid ${cor}` }}
                    >
                      <svg className="w-5 h-5" style={{ color: cor }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 dark:text-gray-100 truncate block">{equipe.nome}</span>
                        <span className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">
                          {equipe.obras.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 relative h-12"></div>
                  </div>

                  {/* Obras da equipe */}
                  {equipe.obras.map((obra) => {
                    const dataInicio = obra.dataInicio ? new Date(obra.dataInicio) : new Date();
                    const dataFim = obra.dataPrevistaFim ? new Date(obra.dataPrevistaFim) : new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);
                    const isAtrasada = obra.status !== 'CONCLUIDO' && dataFim < new Date();
                    const posicao = calcularPosicaoBarra(dataInicio, dataFim);
                    const cores = isAtrasada 
                      ? { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }
                      : statusCores[obra.status] || statusCores.BACKLOG;

                    return (
                      <div key={obra.id} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <div className="w-80 flex-shrink-0 px-4 py-4 border-r-2 border-gray-300 dark:border-gray-600">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={obra.nomeObra}>
                            {obra.nomeObra}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" title={obra.clienteNome}>
                            {obra.clienteNome}
                          </div>
                        </div>
                        
                        <div className="flex-1 relative h-20 px-2 py-4">
                          {/* Grid de fundo */}
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${zoomLevel}, 1fr)` }}>
                            {meses.map((mes, idx) => (
                              <div
                                key={idx}
                                className="border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                              ></div>
                            ))}
                          </div>

                          {/* Barra da obra */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-10 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-xl hover:-translate-y-[calc(50%+2px)] group"
                            style={{
                              ...posicao,
                              background: `linear-gradient(to right, ${cores.bg}, ${cores.bg}dd)`,
                              border: `2px solid ${cores.border}`,
                              zIndex: selectedObraId === obra.id ? 10 : 1
                            }}
                            onClick={() => {
                              setSelectedObraId(obra.id);
                              if (onSelectObra) {
                                onSelectObra(obra.id);
                              }
                            }}
                          >
                            <div className="h-full flex items-center px-3 gap-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: cores.border }}
                              ></div>
                              <span className="text-xs font-semibold truncate" style={{ color: cores.text }}>
                                {obra.nomeObra}
                              </span>
                              {isAtrasada && (
                                <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                </svg>
                              )}
                            </div>

                            {/* Tooltip */}
                            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 min-w-[280px] max-w-[320px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                              <div className="space-y-2">
                                <div className="font-bold text-gray-900 dark:text-gray-100 text-base border-b border-gray-200 dark:border-gray-700 pb-2">
                                  {obra.nomeObra}
                                </div>
                                <div className="grid gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{obra.clienteNome}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                    <span className="font-semibold" style={{ color: cores.border }}>
                                      {obra.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Progresso:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{obra.progresso}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Equipe:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{equipe.nome}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Início:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {dataInicio.toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Previsão:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {dataFim.toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                  {isAtrasada && (
                                    <div className="mt-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-xs">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                        </svg>
                                        OBRA ATRASADA
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Linha "Hoje" */}
            {posicaoHoje.left !== '0%' && parseFloat(posicaoHoje.left) < 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: `calc(320px + ${posicaoHoje.left})` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  Hoje
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
