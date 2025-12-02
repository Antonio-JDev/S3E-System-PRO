import React, { useState, useMemo } from 'react';
import { Alocacao, Obra } from '../../types';
import { axiosApiService } from '../../services/axiosApi';
import { toast } from 'sonner';

interface JiraBoardProps {
    alocacoes: Alocacao[];
    obras: Obra[];
    onTaskUpdate?: (taskId: string, newStatus: string) => void;
    onRefresh?: () => void;
}

interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';
    assignee?: string;
    dueDate?: string;
    type: 'alocacao' | 'obra';
    originalData: any;
}

const JiraBoard: React.FC<JiraBoardProps> = ({ alocacoes, obras, onTaskUpdate, onRefresh }) => {
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    // Converter alocações e obras em tarefas
    const tasks = useMemo(() => {
        const allTasks: Task[] = [];

        // Adicionar alocações
        alocacoes.forEach(alocacao => {
            const statusMap: Record<string, 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO'> = {
                'Planejada': 'A_FAZER',
                'EmAndamento': 'ANDAMENTO',
                'Concluida': 'CONCLUIDO',
                'Cancelada': 'BACKLOG'
            };

            allTasks.push({
                id: `alocacao-${alocacao.id}`,
                title: alocacao.projeto?.titulo || alocacao.equipe?.nome || 'Alocação',
                description: alocacao.observacoes,
                status: statusMap[alocacao.status] || 'A_FAZER',
                assignee: alocacao.equipe?.nome || alocacao.eletricista?.nome,
                dueDate: alocacao.dataFim || alocacao.dataFimPrevisto,
                type: 'alocacao',
                originalData: alocacao
            });
        });

        // Adicionar obras
        obras.forEach(obra => {
            allTasks.push({
                id: `obra-${obra.id}`,
                title: obra.nomeObra || obra.projeto?.titulo || 'Obra',
                description: obra.projeto?.descricao,
                status: obra.status,
                assignee: obra.projeto?.cliente?.nome || obra.cliente?.nome,
                dueDate: obra.dataPrevistaFim,
                type: 'obra',
                originalData: obra
            });
        });

        return allTasks;
    }, [alocacoes, obras]);

    // Agrupar tarefas por status
    const tasksByStatus = useMemo(() => {
        return {
            BACKLOG: tasks.filter(t => t.status === 'BACKLOG'),
            A_FAZER: tasks.filter(t => t.status === 'A_FAZER'),
            ANDAMENTO: tasks.filter(t => t.status === 'ANDAMENTO'),
            CONCLUIDO: tasks.filter(t => t.status === 'CONCLUIDO')
        };
    }, [tasks]);

    const handleDragStart = (task: Task) => {
        setDraggedTask(task);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (newStatus: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO') => {
        if (draggedTask && draggedTask.status !== newStatus) {
            try {
                if (draggedTask.type === 'alocacao') {
                    // Mapear status do Jira para status de alocação
                    const statusMap: Record<string, 'Planejada' | 'EmAndamento' | 'Concluida' | 'Cancelada'> = {
                        'BACKLOG': 'Cancelada',
                        'A_FAZER': 'Planejada',
                        'ANDAMENTO': 'EmAndamento',
                        'CONCLUIDO': 'Concluida'
                    };
                    
                    const alocacaoStatus = statusMap[newStatus];
                    const alocacaoId = draggedTask.id.replace('alocacao-', '');
                    
                    const response = await axiosApiService.put(`/api/obras/alocacoes/${alocacaoId}`, {
                        status: alocacaoStatus
                    });
                    
                    if (response.success) {
                        toast.success('Alocação atualizada com sucesso!');
                        if (onRefresh) onRefresh();
                    } else {
                        toast.error('Erro ao atualizar alocação');
                    }
                } else if (draggedTask.type === 'obra') {
                    const obraId = draggedTask.id.replace('obra-', '');
                    
                    const response = await axiosApiService.put(`/api/obras/${obraId}/status`, {
                        status: newStatus
                    });
                    
                    if (response.success) {
                        toast.success('Obra atualizada com sucesso!');
                        if (onRefresh) onRefresh();
                    } else {
                        toast.error('Erro ao atualizar obra');
                    }
                }
                
                if (onTaskUpdate) {
                    onTaskUpdate(draggedTask.id, newStatus);
                }
            } catch (error: any) {
                console.error('Erro ao atualizar tarefa:', error);
                toast.error('Erro ao atualizar tarefa', {
                    description: error?.message || 'Erro desconhecido'
                });
            }
        }
        setDraggedTask(null);
    };

    const statusConfig = {
        BACKLOG: { label: 'Backlog', color: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' },
        A_FAZER: { label: 'A Fazer', color: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-300' },
        ANDAMENTO: { label: 'Em Andamento', color: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
        CONCLUIDO: { label: 'Concluído', color: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' }
    };

    return (
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Timeline - Quadro de Tarefas</h2>
                <p className="text-gray-600">Arraste as tarefas entre as colunas para atualizar o status</p>
            </div>

            <div className="grid grid-cols-4 gap-4 overflow-x-auto">
                {Object.entries(statusConfig).map(([status, config]) => {
                    const statusKey = status as keyof typeof tasksByStatus;
                    const columnTasks = tasksByStatus[statusKey];

                    return (
                        <div
                            key={status}
                            className={`flex-1 min-w-[250px] rounded-lg border-2 ${config.borderColor} ${config.color} p-4`}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(statusKey)}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`font-bold text-lg ${config.textColor}`}>
                                    {config.label}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.textColor} ${config.color}`}>
                                    {columnTasks.length}
                                </span>
                            </div>

                            <div className="space-y-3 min-h-[200px]">
                                {columnTasks.map(task => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={() => handleDragStart(task)}
                                        className="bg-white rounded-lg shadow-md p-4 cursor-move hover:shadow-lg transition-shadow border border-gray-200"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900 text-sm flex-1">
                                                {task.title}
                                            </h4>
                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                                task.type === 'alocacao' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                            }`}>
                                                {task.type === 'alocacao' ? 'Alocação' : 'Obra'}
                                            </span>
                                        </div>
                                        
                                        {task.description && (
                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                            {task.assignee && (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span className="text-xs font-semibold text-gray-700">
                                                            {task.assignee.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-600 truncate max-w-[100px]">
                                                        {task.assignee}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {task.dueDate && (
                                                <span className="text-xs text-gray-500">
                                                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {columnTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Nenhuma tarefa
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default JiraBoard;

