import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { toast } from 'sonner';
import tarefasInternasService, {
  type TarefaInterna,
  type TarefaInternaItem,
  type CreateTarefaInternaItemData,
  type UpdateTarefaInternaItemData
} from '../services/tarefasInternasService';
import AlertDialog from '../components/ui/AlertDialog';
import { AuthContext } from '../contexts/AuthContext';
import { isAdmin, isDeveloper } from '../utils/permissions';
import { formatDateDisplay, formatDateDisplayLong, isPrazoAtrasadoCalendarioLocal, serverDateToInput } from '../utils/date';
import { prioridadeTarefaInternaClassNames } from '../utils/tarefasInternasUi';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CalendarDaysIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-11a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.75v11m-18 0v-11a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.75v11" />
  </svg>
);

interface DetalhesTarefaInternaProps {
  toggleSidebar?: () => void;
  tarefaId: string;
  onNavigate?: (view: string, ...args: any[]) => void;
}

const COLUNA_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog',
  A_FAZER: 'A Fazer',
  ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído'
};

const DetalhesTarefaInterna: React.FC<DetalhesTarefaInternaProps> = ({ toggleSidebar, tarefaId, onNavigate }) => {
  const { user: currentUser } = useContext(AuthContext) ?? {};
  const [task, setTask] = useState<TarefaInterna | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<TarefaInternaItem | null>(null);
  const [editingItem, setEditingItem] = useState<TarefaInternaItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<TarefaInternaItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [formItem, setFormItem] = useState({
    titulo: '',
    descricao: '',
    dataInicio: '',
    dataPrevisaoFim: '',
    observacoes: '',
    concluido: false
  });

  const loadTask = useCallback(async () => {
    if (!tarefaId) return;
    try {
      const data = await tarefasInternasService.getById(tarefaId);
      setTask(data);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar tarefa');
    } finally {
      setLoading(false);
    }
  }, [tarefaId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const isPrivileged = useMemo(
    () => isAdmin(currentUser as any) || isDeveloper(currentUser as any),
    [currentUser]
  );

  const assignedIds = useMemo(() => {
    if (!task) return [];
    const raw = (task as any)?.userIds;
    const arr = Array.isArray(raw) ? raw : [];
    if (arr.length) return arr;
    return task.userId ? [task.userId] : [];
  }, [task]);

  const canSeeOverdue = useMemo(
    () => Boolean(isPrivileged || (currentUser?.id && assignedIds.includes(currentUser.id))),
    [isPrivileged, currentUser?.id, assignedIds]
  );

  const taskPrazoRaw = useMemo(() => {
    if (!task || !(task as any)?.prazo) return '';
    return String((task as any).prazo);
  }, [task]);

  const isTaskOverdue = useMemo(() => {
    if (!task || !taskPrazoRaw) return false;
    return Boolean(
      canSeeOverdue &&
        task.coluna !== 'CONCLUIDO' &&
        isPrazoAtrasadoCalendarioLocal(taskPrazoRaw)
    );
  }, [task, canSeeOverdue, taskPrazoRaw]);

  const goBack = () => {
    onNavigate?.('Tarefas Internas');
  };

  const handleOpenNewItem = () => {
    setEditingItem(null);
    setFormItem({
      titulo: '',
      descricao: '',
      dataInicio: '',
      dataPrevisaoFim: '',
      observacoes: '',
      concluido: false
    });
    setModalItemOpen(true);
  };

  const handleOpenEditItem = (item: TarefaInternaItem) => {
    setEditingItem(item);
    setFormItem({
      titulo: item.titulo,
      descricao: item.descricao ?? '',
      dataInicio: serverDateToInput(item.dataInicio),
      dataPrevisaoFim: serverDateToInput(item.dataPrevisaoFim),
      observacoes: item.observacoes ?? '',
      concluido: item.concluido
    });
    setModalItemOpen(true);
  };

  const closeItemModal = () => {
    setModalItemOpen(false);
    setEditingItem(null);
  };

  const handleCloseItemModal = () => {
    if (savingItem) return;
    closeItemModal();
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingItem) return;
    if (!formItem.titulo?.trim()) {
      toast.error('Título da tarefa é obrigatório');
      return;
    }
    if (!tarefaId) return;
    setSavingItem(true);
    try {
      if (editingItem) {
        await tarefasInternasService.updateItem(tarefaId, editingItem.id, {
          titulo: formItem.titulo.trim(),
          descricao: formItem.descricao || undefined,
          dataInicio: formItem.dataInicio || undefined,
          dataPrevisaoFim: formItem.dataPrevisaoFim || undefined,
          observacoes: formItem.observacoes || undefined,
          concluido: formItem.concluido
        });
        toast.success('Subtarefa atualizada');
      } else {
        await tarefasInternasService.createItem(tarefaId, {
          titulo: formItem.titulo.trim(),
          descricao: formItem.descricao || undefined,
          dataInicio: formItem.dataInicio || undefined,
          dataPrevisaoFim: formItem.dataPrevisaoFim || undefined,
          observacoes: formItem.observacoes || undefined
        });
        toast.success('Subtarefa criada');
      }
      closeItemModal();
      loadTask();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItemRequest = (item: TarefaInternaItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const handleDeleteItemConfirm = async () => {
    if (!tarefaId || !itemToDelete) return;
    try {
      await tarefasInternasService.deleteItem(tarefaId, itemToDelete.id);
      toast.success('Subtarefa excluída');
      setShowDeleteDialog(false);
      setItemToDelete(null);
      loadTask();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir');
    }
  };

  const toggleConcluido = async (item: TarefaInternaItem) => {
    if (!tarefaId) return;
    try {
      await tarefasInternasService.updateItem(tarefaId, item.id, { concluido: !item.concluido });
      loadTask();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-dark-text-secondary">Carregando detalhes da tarefa...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-dark-text-secondary mb-4">Tarefa não encontrada.</p>
          <button type="button" onClick={goBack} className="btn-info">Voltar</button>
        </div>
      </div>
    );
  }

  const itens = task.itens ?? [];
  const priHeader = prioridadeTarefaInternaClassNames(task.prioridade);

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card transition-all"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-gray-700 dark:text-dark-text hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Voltar ao Kanban
          </button>
        </div>
      </header>

      <div className={["card-primary mb-8", isTaskOverdue ? "border border-red-600 dark:border-red-500" : ""].join(' ')}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">{task.titulo}</h1>
        {task.motivo && (
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Motivo: {task.motivo}</p>
        )}
        {task.descricao && (
          <p className="text-gray-600 dark:text-dark-text-secondary mt-2">{task.descricao}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`px-2 py-1 text-xs rounded ${priHeader.wrapper}`}>
            <span className={priHeader.label}>{priHeader.displayLabel}</span>
          </span>
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
            {COLUNA_LABEL[task.coluna] ?? task.coluna}
          </span>
          {task.user?.name && (
            <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
              <UserIcon className="w-3.5 h-3.5" />
              {task.user.name}
            </span>
          )}
          {isTaskOverdue && (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded font-semibold">
              Atrasada
            </span>
          )}
        </div>
        {canSeeOverdue && taskPrazoRaw && Boolean((task as any)?.prazoDefinido) && (
          <div className="mt-3 text-sm text-gray-600 dark:text-dark-text-secondary">
            Prazo: <span className="font-semibold">{formatDateDisplay(taskPrazoRaw)}</span>
          </div>
        )}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-dark-text-secondary">Progresso (conclusão das subtarefas)</span>
            <span className="font-bold text-gray-900 dark:text-dark-text">{task.progresso}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${task.progresso}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Subtarefas</h2>
        <button type="button" onClick={handleOpenNewItem} className="btn-info flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nova Tarefa
        </button>
      </div>

      <div className="space-y-3">
        {itens.length === 0 ? (
          <div className="card-secondary text-center py-8 text-gray-500 dark:text-dark-text-secondary">
            Nenhuma subtarefa. Clique em &quot;Nova Tarefa&quot; para adicionar.
          </div>
        ) : (
          itens.map((item) => {
            const itemOverdue = Boolean(
              canSeeOverdue &&
              !item.concluido &&
              item.dataPrevisaoFim &&
              isPrazoAtrasadoCalendarioLocal(item.dataPrevisaoFim)
            );
            return (
            <div
              key={item.id}
              className={[
                'card-secondary flex flex-col sm:flex-row sm:items-center gap-3 py-4',
                itemOverdue ? 'border border-red-600 dark:border-red-500' : 'border-2 border-transparent'
              ].join(' ')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleConcluido(item)}
                    className="shrink-0 text-left"
                    title={item.concluido ? 'Desmarcar concluída' : 'Marcar concluída'}
                  >
                    {item.concluido ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <span className="w-6 h-6 rounded-full border-2 border-gray-400 dark:border-gray-500 block" />
                    )}
                  </button>
                  <h3 className={`font-semibold text-gray-900 dark:text-dark-text ${item.concluido ? 'line-through opacity-70' : ''}`}>
                    {item.titulo}
                  </h3>
                  {item.concluido && (
                    <span className="badge-status-active text-xs">Concluída</span>
                  )}
                  {itemOverdue && (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded font-semibold">
                      Atrasada
                    </span>
                  )}
                </div>
                {item.descricao && (
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1 line-clamp-2">{item.descricao}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                  {item.dataInicio && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      Início: {formatDateDisplay(item.dataInicio)}
                    </span>
                  )}
                  {Boolean(item.prazoDefinido) && item.dataPrevisaoFim && (
                    <span>Previsão: {formatDateDisplay(item.dataPrevisaoFim)}</span>
                  )}
                  {item.observacoes && (
                    <span title={item.observacoes}>Obs.: {item.observacoes.slice(0, 40)}{item.observacoes.length > 40 ? '…' : ''}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingItem(item)}
                  className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
                  title="Visualizar"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditItem(item)}
                  className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  title="Editar"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteItemRequest(item)}
                  className="btn-action-delete p-2 rounded-lg"
                  title="Excluir"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )})
        )}
      </div>

      {modalItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="modal-content max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
            aria-busy={savingItem}
          >
            {savingItem && (
              <div
                className="absolute inset-0 z-10 bg-white/50 dark:bg-dark-card/50 backdrop-blur-[1px] rounded-2xl pointer-events-none"
                aria-hidden
              />
            )}
            <div className="modal-header flex items-center justify-between bg-blue-600 dark:bg-blue-700 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">{editingItem ? 'Editar subtarefa' : 'Nova subtarefa'}</h3>
              <button
                type="button"
                onClick={handleCloseItemModal}
                disabled={savingItem}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Fechar"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitItem} className="flex flex-col flex-1 min-h-0">
              <fieldset disabled={savingItem} className="flex flex-col flex-1 min-h-0 border-0 p-0 m-0">
              <div className="modal-body overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Título da tarefa *</label>
                  <input
                    type="text"
                    value={formItem.titulo}
                    onChange={(e) => setFormItem((f) => ({ ...f, titulo: e.target.value }))}
                    className="input-field"
                    placeholder="Título"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Descrição da tarefa</label>
                  <textarea
                    value={formItem.descricao}
                    onChange={(e) => setFormItem((f) => ({ ...f, descricao: e.target.value }))}
                    className="textarea-field"
                    rows={3}
                    placeholder="Descrição"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Data de início</label>
                    <input
                      type="date"
                      value={formItem.dataInicio}
                      onChange={(e) => setFormItem((f) => ({ ...f, dataInicio: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Data de previsão de término</label>
                    <input
                      type="date"
                      value={formItem.dataPrevisaoFim}
                      onChange={(e) => setFormItem((f) => ({ ...f, dataPrevisaoFim: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Observações</label>
                  <textarea
                    value={formItem.observacoes}
                    onChange={(e) => setFormItem((f) => ({ ...f, observacoes: e.target.value }))}
                    className="textarea-field"
                    rows={2}
                    placeholder="Opcional"
                  />
                </div>
                {editingItem && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="concluido"
                      checked={formItem.concluido}
                      onChange={(e) => setFormItem((f) => ({ ...f, concluido: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <label htmlFor="concluido" className="text-sm font-semibold text-gray-700 dark:text-dark-text">
                      Concluída
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseItemModal}
                  disabled={savingItem}
                  className="btn-secondary disabled:opacity-50 disabled:pointer-events-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="btn-success inline-flex items-center justify-center gap-2 min-w-[8.5rem] disabled:opacity-70 disabled:pointer-events-none"
                >
                  {savingItem && (
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden
                    />
                  )}
                  {savingItem ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {viewingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setViewingItem(null)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border w-full max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-700 dark:to-sky-600 px-6 py-4 text-white shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <EyeIcon className="w-5 h-5 opacity-90" />
                  Conteúdo da subtarefa
                </h3>
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Fechar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 text-center sm:text-left overflow-y-auto min-h-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text text-center mb-6 pb-4 border-b border-gray-200 dark:border-dark-border">
                {viewingItem.titulo}
              </h2>
              {viewingItem.concluido && (
                <div className="flex justify-center sm:justify-start mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    <CheckCircleIcon className="w-4 h-4" />
                    Concluída
                  </span>
                </div>
              )}
              <div className="space-y-4">
                {viewingItem.descricao ? (
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary mb-1">Descrição</p>
                    <p className="text-gray-700 dark:text-dark-text leading-relaxed whitespace-pre-wrap break-words">
                      {viewingItem.descricao}
                    </p>
                  </div>
                ) : (
                  <p className="text-center sm:text-left text-gray-400 dark:text-dark-text-secondary text-sm italic">
                    Sem descrição
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start pt-4 border-t border-gray-100 dark:border-dark-border">
                  {viewingItem.dataInicio && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-700 dark:text-dark-text">
                      <CalendarDaysIcon className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                      <span className="text-sm font-medium">Início:</span>
                      <span className="text-sm">
                        {formatDateDisplayLong(viewingItem.dataInicio)}
                      </span>
                    </div>
                  )}
                  {Boolean(viewingItem.prazoDefinido) && viewingItem.dataPrevisaoFim && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-700 dark:text-dark-text">
                      <ClockIcon className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
                      <span className="text-sm font-medium">Previsão término:</span>
                      <span className="text-sm">
                        {formatDateDisplayLong(viewingItem.dataPrevisaoFim)}
                      </span>
                    </div>
                  )}
                </div>
                {!viewingItem.dataInicio && !(Boolean(viewingItem.prazoDefinido) && viewingItem.dataPrevisaoFim) && (
                  <p className="text-center text-gray-400 dark:text-dark-text-secondary text-sm italic pt-2">
                    Nenhuma data definida
                  </p>
                )}
                {viewingItem.observacoes && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border text-center sm:text-left">
                    <p className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary mb-1">Observações</p>
                    <p className="text-gray-600 dark:text-dark-text text-sm whitespace-pre-wrap break-words">
                      {viewingItem.observacoes}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg/50 flex justify-center shrink-0">
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-5 py-2 rounded-xl font-medium bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-700 text-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setItemToDelete(null); }}
        title="Excluir subtarefa"
        message={itemToDelete ? `Excluir "${itemToDelete.titulo}"? Esta ação não pode ser desfeita.` : ''}
        onConfirm={handleDeleteItemConfirm}
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
};

export default DetalhesTarefaInterna;
