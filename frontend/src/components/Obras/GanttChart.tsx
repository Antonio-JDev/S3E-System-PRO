import React, { useState, useMemo } from 'react';
import { Alocacao, Obra, Equipe } from '../../types';

interface GanttChartProps {
    alocacoes: Alocacao[];
    obras: Obra[];
    equipes: Equipe[];
}

interface GanttTask {
    id: string;
    nome: string;
    responsavel: string;
    dataInicio: Date;
    dataFim: Date;
    status: string;
    cor: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ alocacoes, obras, equipes }) => {
    const [dataInicio, setDataInicio] = useState<Date>(() => {
        const hoje = new Date();
        hoje.setDate(hoje.getDate() - 7); // 7 dias atrás
        return hoje;
    });
    const [dataFim, setDataFim] = useState<Date>(() => {
        const hoje = new Date();
        hoje.setDate(hoje.getDate() + 30); // 30 dias à frente
        return hoje;
    });

    // Converter alocações e obras em tarefas do Gantt
    const tarefas = useMemo(() => {
        const tasks: GanttTask[] = [];

        // Adicionar alocações
        alocacoes.forEach(alocacao => {
            const inicio = new Date(alocacao.dataInicio);
            const fim = new Date(alocacao.dataFim || alocacao.dataFimPrevisto || alocacao.dataInicio);
            
            tasks.push({
                id: `alocacao-${alocacao.id}`,
                nome: alocacao.projeto?.titulo || alocacao.equipe?.nome || 'Alocação',
                responsavel: alocacao.equipe?.nome || alocacao.eletricista?.nome || 'Não atribuído',
                dataInicio: inicio,
                dataFim: fim,
                status: alocacao.status,
                cor: alocacao.status === 'EmAndamento' ? '#10b981' : 
                     alocacao.status === 'Concluida' ? '#f59e0b' : 
                     alocacao.status === 'Planejada' ? '#3b82f6' : '#ef4444'
            });
        });

        // Adicionar obras
        obras.forEach(obra => {
            if (obra.dataPrevistaInicio && obra.dataPrevistaFim) {
                const inicio = new Date(obra.dataPrevistaInicio);
                const fim = new Date(obra.dataPrevistaFim);
                
                tasks.push({
                    id: `obra-${obra.id}`,
                    nome: obra.nomeObra || obra.projeto?.titulo || 'Obra',
                    responsavel: obra.projeto?.cliente?.nome || obra.cliente?.nome || 'Cliente',
                    dataInicio: inicio,
                    dataFim: fim,
                    status: obra.status,
                    cor: obra.status === 'ANDAMENTO' ? '#10b981' : 
                         obra.status === 'CONCLUIDO' ? '#f59e0b' : 
                         obra.status === 'A_FAZER' ? '#3b82f6' : '#6b7280'
                });
            }
        });

        return tasks.sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
    }, [alocacoes, obras]);

    // Calcular dias no período
    const diasNoPeriodo = useMemo(() => {
        const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [dataInicio, dataFim]);

    // Gerar array de datas
    const datas = useMemo(() => {
        const dates: Date[] = [];
        const current = new Date(dataInicio);
        while (current <= dataFim) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }, [dataInicio, dataFim]);

    // Calcular posição e largura da barra
    const calcularBarra = (task: GanttTask) => {
        const inicioPeriodo = dataInicio.getTime();
        const fimPeriodo = dataFim.getTime();
        const inicioTask = Math.max(task.dataInicio.getTime(), inicioPeriodo);
        const fimTask = Math.min(task.dataFim.getTime(), fimPeriodo);
        
        const left = ((inicioTask - inicioPeriodo) / (fimPeriodo - inicioPeriodo)) * 100;
        const width = ((fimTask - inicioTask) / (fimPeriodo - inicioPeriodo)) * 100;
        
        return { left: Math.max(0, left), width: Math.max(1, width) };
    };

    const hoje = new Date();
    const hojePosicao = ((hoje.getTime() - dataInicio.getTime()) / (dataFim.getTime() - dataInicio.getTime())) * 100;

    return (
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">GRÁFICO DE GANTT</h2>
                
                {/* Controles de data */}
                <div className="flex items-center gap-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Data Início</label>
                        <input
                            type="date"
                            value={dataInicio.toISOString().split('T')[0]}
                            onChange={(e) => setDataInicio(new Date(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Data Fim</label>
                        <input
                            type="date"
                            value={dataFim.toISOString().split('T')[0]}
                            onChange={(e) => setDataFim(new Date(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="overflow-x-auto">
                <div className="min-w-full relative">
                    {/* Header com datas */}
                    <div className="flex border-b-2 border-gray-300 mb-4 relative">
                        <div className="w-64 flex-shrink-0 p-3 font-bold text-gray-900 border-r border-gray-300">
                            Tarefa / Responsável
                        </div>
                        <div className="flex-1 relative">
                            <div className="flex relative">
                                {datas.map((data, idx) => {
                                    const isHoje = data.toDateString() === hoje.toDateString();
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex-1 text-center p-2 text-xs font-semibold border-r border-gray-200 ${
                                                isHoje ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                            }`}
                                            style={{ minWidth: '60px' }}
                                        >
                                            {data.getDate()}/{String(data.getMonth() + 1).padStart(2, '0')}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Linha "Hoje" */}
                            {hojePosicao >= 0 && hojePosicao <= 100 && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                                    style={{ left: `${hojePosicao}%` }}
                                >
                                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                                        Hoje
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tarefas */}
                    <div className="relative">
                        {tarefas.map((task, idx) => {
                            const { left, width } = calcularBarra(task);
                            return (
                                <div key={task.id} className="flex items-center mb-3 min-h-[50px]">
                                    {/* Nome da tarefa */}
                                    <div className="w-64 flex-shrink-0 p-3 border-r border-gray-200">
                                        <div className="font-semibold text-sm text-gray-900 truncate">
                                            {task.nome}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {task.responsavel}
                                        </div>
                                    </div>

                                    {/* Barra do Gantt */}
                                    <div className="flex-1 relative h-10">
                                        <div
                                            className="absolute h-8 rounded-lg shadow-md flex items-center justify-center text-white text-xs font-semibold px-2"
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                backgroundColor: task.cor,
                                                top: '50%',
                                                transform: 'translateY(-50%)'
                                            }}
                                            title={`${task.nome} - ${task.dataInicio.toLocaleDateString('pt-BR')} até ${task.dataFim.toLocaleDateString('pt-BR')}`}
                                        >
                                            <span className="truncate">{task.nome}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {tarefas.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p>Nenhuma tarefa no período selecionado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GanttChart;

