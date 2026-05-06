import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { toast } from 'sonner';
import tarefasInternasService, {
  type KanbanData,
  type TarefaInternaStats,
  type TarefaInternaKanbanItem,
  type StatusTarefaInterna,
  type CreateTarefaInternaData,
  type TarefasInternasUsuarioReportDetalhes,
  type TarefasInternasUsuarioReportRow
} from '../services/tarefasInternasService';
import { axiosApiService } from '../services/axiosApi';
import AlertDialog from '../components/ui/AlertDialog';
import UserSearchMultiSelect from '../components/ui/UserSearchMultiSelect';
import { AuthContext } from '../contexts/AuthContext';
import { isAdmin, isDeveloper } from '../utils/permissions';
import { formatDateDisplay, isPrazoAtrasadoCalendarioLocal, serverDateToInput } from '../utils/date';
import { prioridadeTarefaInternaClassNames } from '../utils/tarefasInternasUi';

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

const ClipboardDocumentListIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.25m-12 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-13.5 0v2.625c0 .621.504 1.125 1.125 1.125h2.625m0 0h5.625c.621 0 1.125-.504 1.125-1.125V21m-9 0h9" />
  </svg>
);

const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.25m-12 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-13.5 0v2.625c0 .621.504 1.125 1.125 1.125h2.625m0 0h5.625c.621 0 1.125-.504 1.125-1.125V21m-9 0h9" />
  </svg>
);

const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CheckBadgeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
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

const FunnelIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
  </svg>
);

interface UserOption {
  id: string;
  name: string;
  email?: string;
}

const COLUNAS: StatusTarefaInterna[] = ['BACKLOG', 'A_FAZER', 'ANDAMENTO', 'CONCLUIDO'];

const getColumnConfig = (status: string) => {
  const configs: Record<string, { title: string; color: string; bgColor: string; borderColor: string }> = {
    BACKLOG: { title: 'Backlog', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-50 dark:bg-gray-800/50', borderColor: 'border-gray-300 dark:border-gray-600' },
    A_FAZER: { title: 'A Fazer', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-300 dark:border-blue-700' },
    ANDAMENTO: { title: 'Em Andamento', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-300 dark:border-orange-700' },
    CONCLUIDO: { title: 'Concluído', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-300 dark:border-green-700' }
  };
  return configs[status] || configs.BACKLOG;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface TarefasInternasKanbanProps {
  toggleSidebar: () => void;
  onNavigate?: (view: string, ...args: any[]) => void;
  onViewTarefaInterna?: (tarefaId: string) => void;
}

const TarefasInternasKanban: React.FC<TarefasInternasKanbanProps> = ({ toggleSidebar, onNavigate, onViewTarefaInterna }) => {
  const { user: currentUser } = useContext(AuthContext) ?? {};
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    BACKLOG: [],
    A_FAZER: [],
    ANDAMENTO: [],
    CONCLUIDO: []
  });
  const [stats, setStats] = useState<TarefaInternaStats>({ total: 0, planejamento: 0, andamento: 0, concluidas: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filterByUserId, setFilterByUserId] = useState<string>('');
  const [draggedItem, setDraggedItem] = useState<TarefaInternaKanbanItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  /** Evita duplo envio e mostra spinner no Salvar (API pode levar alguns segundos). */
  const [savingTask, setSavingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TarefaInternaKanbanItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TarefaInternaKanbanItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState<CreateTarefaInternaData & { id?: string }>({
    titulo: '',
    motivo: '',
    descricao: '',
    prioridade: 'MEDIA',
    progresso: 0,
    coluna: 'BACKLOG',
    userId: '',
    userIds: [],
    prazo: ''
  });

  const isPrivileged = useMemo(() => isAdmin(currentUser as any) || isDeveloper(currentUser as any), [currentUser]);

  const [view, setView] = useState<'kanban' | 'relatorios'>('kanban');
  const [reportStart, setReportStart] = useState(() => toIsoDateInput(addDays(new Date(), -30)));
  const [reportEnd, setReportEnd] = useState(() => toIsoDateInput(new Date()));
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<TarefasInternasUsuarioReportRow[]>([]);
  const [reportUserId, setReportUserId] = useState<string>('');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<'tarefas' | 'subtarefas'>('tarefas');
  const [details, setDetails] = useState<TarefasInternasUsuarioReportDetalhes | null>(null);

  const formatHoras = (h: number) => {
    const v = Number.isFinite(h) ? h : 0;
    if (v < 24) return `${v.toFixed(1)}h`;
    return `${(v / 24).toFixed(1)}d`;
  };

  const loadRelatorioUsuarios = useCallback(async () => {
    if (!isPrivileged) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await tarefasInternasService.getRelatorioUsuarios({ start: reportStart, end: reportEnd });
      setReportRows(res?.data ?? []);
      if (!reportUserId && res?.data?.length) setReportUserId(res.data[0].userId);
    } catch (e: any) {
      setReportRows([]);
      setReportError(e?.response?.data?.message || e?.message || 'Erro ao carregar relatório');
    } finally {
      setReportLoading(false);
    }
  }, [isPrivileged, reportStart, reportEnd, reportUserId]);

  const loadRelatorioDetalhes = useCallback(async () => {
    if (!isPrivileged || !reportUserId) return;
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await tarefasInternasService.getRelatorioUsuarioDetalhes(reportUserId, { start: reportStart, end: reportEnd });
      setDetails(res);
    } catch (e: any) {
      setDetails(null);
      setDetailsError(e?.response?.data?.message || e?.message || 'Erro ao carregar detalhes');
    } finally {
      setDetailsLoading(false);
    }
  }, [isPrivileged, reportUserId, reportStart, reportEnd]);

  useEffect(() => {
    if (view !== 'relatorios') return;
    loadRelatorioUsuarios();
  }, [view, loadRelatorioUsuarios]);

  useEffect(() => {
    if (view !== 'relatorios') return;
    loadRelatorioDetalhes();
  }, [view, loadRelatorioDetalhes]);

  const loadKanban = useCallback(async () => {
    setLoadError(false);
    try {
      const [data, statsRes] = await Promise.all([
        tarefasInternasService.getKanban(),
        tarefasInternasService.getStats()
      ]);
      setKanbanData(data ?? { BACKLOG: [], A_FAZER: [], ANDAMENTO: [], CONCLUIDO: [] });
      setStats(statsRes ?? { total: 0, planejamento: 0, andamento: 0, concluidas: 0 });
    } catch (e) {
      console.error(e);
      setLoadError(true);
      setKanbanData({ BACKLOG: [], A_FAZER: [], ANDAMENTO: [], CONCLUIDO: [] });
      setStats({ total: 0, planejamento: 0, andamento: 0, concluidas: 0 });
      toast.error('Erro ao carregar tarefas internas. Verifique se a migration foi aplicada no banco.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKanban();
  }, [loadKanban]);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await axiosApiService.get<{ users?: UserOption[] } | UserOption[]>('/api/auth/users');
      const list = (data as any)?.users ?? data;
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      try {
        const { data } = await axiosApiService.get<UserOption[] | { data?: UserOption[] }>('/api/configuracoes/usuarios');
        const list = (data as any)?.data ?? data;
        setUsers(Array.isArray(list) ? list : []);
      } catch {
        setUsers([]);
      }
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (isModalOpen) loadUsers();
  }, [isModalOpen, loadUsers]);

  const kanbanFiltered = useMemo<KanbanData>(() => {
    if (!filterByUserId) return kanbanData;
    const match = (t: TarefaInternaKanbanItem) =>
      t.userId === filterByUserId || (Array.isArray(t.userIds) && t.userIds.includes(filterByUserId));
    return {
      BACKLOG: kanbanData.BACKLOG.filter(match),
      A_FAZER: kanbanData.A_FAZER.filter(match),
      ANDAMENTO: kanbanData.ANDAMENTO.filter(match),
      CONCLUIDO: kanbanData.CONCLUIDO.filter(match)
    };
  }, [kanbanData, filterByUserId]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setForm({
      titulo: '',
      motivo: '',
      descricao: '',
      prioridade: 'MEDIA',
      progresso: 0,
      coluna: 'BACKLOG',
      userId: '',
      userIds: [],
      prazo: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: TarefaInternaKanbanItem) => {
    setEditingTask(task);
    const ids = (task.userIds && task.userIds.length) ? task.userIds : (task.userId ? [task.userId] : []);
    setForm({
      id: task.id,
      titulo: task.titulo,
      motivo: task.motivo ?? '',
      descricao: task.descricao ?? '',
      prioridade: task.prioridade,
      progresso: task.progresso,
      coluna: task.coluna,
      userId: task.userId ?? '',
      userIds: ids,
      prazo: serverDateToInput((task as any)?.prazo)
    });
    setIsModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleCloseModal = () => {
    if (savingTask) return;
    closeTaskModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingTask) return;
    if (!form.titulo?.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setSavingTask(true);
    try {
      const userIds = form.userIds && form.userIds.length ? form.userIds : undefined;
      if (editingTask) {
        await tarefasInternasService.update(editingTask.id, {
          titulo: form.titulo.trim(),
          motivo: form.motivo || undefined,
          descricao: form.descricao || undefined,
          prioridade: form.prioridade,
          progresso: form.progresso,
          coluna: form.coluna,
          userId: form.userId || undefined,
          userIds,
          prazo: form.prazo || undefined
        });
        toast.success('Tarefa atualizada');
      } else {
        await tarefasInternasService.create({
          titulo: form.titulo.trim(),
          motivo: form.motivo || undefined,
          descricao: form.descricao || undefined,
          prioridade: form.prioridade,
          progresso: form.progresso ?? 0,
          coluna: form.coluna ?? 'BACKLOG',
          userId: form.userId || undefined,
          userIds,
          prazo: form.prazo || undefined
        });
        toast.success('Tarefa criada');
      }
      closeTaskModal();
      loadKanban();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteRequest = (task: TarefaInternaKanbanItem) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      await tarefasInternasService.delete(taskToDelete.id);
      toast.success('Tarefa excluída');
      setShowDeleteDialog(false);
      setTaskToDelete(null);
      loadKanban();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir');
    }
  };

  const handleDragStart = (e: React.DragEvent, task: TarefaInternaKanbanItem) => {
    setDraggedItem(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, coluna: string) => {
    e.preventDefault();
    setDragOverColumn(coluna);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = async (e: React.DragEvent, newColuna: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedItem || draggedItem.coluna === newColuna) {
      setDraggedItem(null);
      return;
    }
    try {
      await tarefasInternasService.updateStatus(draggedItem.id, newColuna as StatusTarefaInterna);
      loadKanban();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao mover');
    }
    setDraggedItem(null);
  };

  const renderCard = (task: TarefaInternaKanbanItem) => {
    const config = getColumnConfig(task.coluna);
    const ids = (task.userIds && task.userIds.length) ? task.userIds : (task.userId ? [task.userId] : []);
    const canSeeOverdue = Boolean(isPrivileged || (currentUser?.id && ids.includes(currentUser.id)));
    const prazoRaw = (task as any)?.prazo as string | undefined;
    const isOverdue = Boolean(
      canSeeOverdue &&
        task.coluna !== 'CONCLUIDO' &&
        prazoRaw &&
        isPrazoAtrasadoCalendarioLocal(prazoRaw)
    );
    const pri = prioridadeTarefaInternaClassNames(task.prioridade);
    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        className={[
          'card-secondary rounded-xl p-4 mb-3 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing',
          isOverdue
            ? 'border border-red-600 dark:border-red-500'
            : 'border-2 border-gray-200 dark:border-dark-border'
        ].join(' ')}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onViewTarefaInterna?.(task.id)}
          >
            <h4 className="font-bold text-gray-900 dark:text-dark-text text-sm line-clamp-2">{task.titulo}</h4>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${pri.wrapper}`}>
              <span className={pri.label}>{pri.displayLabel}</span>
            </span>
            {isOverdue && (
              <span className="inline-block mt-1 ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded font-bold border border-red-500">
                Atrasada
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }}
              className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              title="Editar"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDeleteRequest(task); }}
              className="btn-action-delete p-1.5 rounded-lg"
              title="Excluir"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        {((task.userIds && task.userIds.length) || task.userName) && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-dark-text-secondary mb-2 flex-wrap">
            <UserIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {task.userIds && task.userIds.length
                ? task.userIds.map(id => users.find(u => u.id === id)?.name || id).filter(Boolean).join(', ')
                : task.userName}
            </span>
          </div>
        )}
        {canSeeOverdue && prazoRaw && Boolean((task as any)?.prazoDefinido) && (
          <div className="mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
            Prazo: {formatDateDisplay(prazoRaw)}
          </div>
        )}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-dark-text-secondary">Progresso</span>
            <span className="font-bold text-gray-900 dark:text-dark-text">{task.progresso}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${task.progresso}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
          <span>{task.itensConcluidos}/{task.totalItens} tarefas</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-dark-text-secondary">Carregando tarefas internas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card transition-all"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Tarefas Internas</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gerencie tarefas e acompanhe o progresso</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-1">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover'}`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView('relatorios')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${view === 'relatorios' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover'}`}
            >
              Relatórios
            </button>
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary shrink-0" />
            <select
              value={filterByUserId ?? ''}
              onChange={(e) => setFilterByUserId(e.target.value)}
              className="select-field min-w-[180px] sm:min-w-[220px]"
              title="Filtrar tarefas por responsável"
            >
              <option value="">Todos os responsáveis</option>
              {currentUser?.id && (
                <option value={currentUser.id}>
                  Só minhas tarefas{currentUser.name ? ` (${currentUser.name})` : ''}
                </option>
              )}
              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
          <button onClick={handleOpenCreate} className="btn-info flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Nova task
          </button>
        </div>
      </header>

      {loadError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-red-800 dark:text-red-300">
            Não foi possível carregar as tarefas. A tabela de tarefas internas pode não existir no banco. Aplique a migration <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">20260223120000_add_tarefas_internas</code> (ex.: <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">npx prisma migrate deploy</code>) e tente novamente.
          </p>
          <button type="button" onClick={() => { setLoading(true); loadKanban(); }} className="btn-primary shrink-0">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card-primary flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Total de tarefas</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.total ?? 0}</p>
          </div>
        </div>
        <div className="card-primary flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ClipboardIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Planejamento</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats?.planejamento ?? 0}</p>
          </div>
        </div>
        <div className="card-primary flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Cog6ToothIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Em andamento</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats?.andamento ?? 0}</p>
          </div>
        </div>
        <div className="card-primary flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckBadgeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">Concluídas</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.concluidas ?? 0}</p>
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-200 dark:border-dark-border p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-1">Kanban</h2>
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6">Clique nos cards para gerenciar subtarefas ou arraste para mover entre as etapas.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {COLUNAS.map((coluna) => {
              const config = getColumnConfig(coluna);
              const tasks = kanbanFiltered[coluna];
              const isOver = dragOverColumn === coluna;
              return (
                <div
                  key={coluna}
                  onDragOver={(e) => handleDragOver(e, coluna)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, coluna)}
                  className={`rounded-2xl border-2 transition-all ${config.borderColor} ${isOver ? 'ring-4 ring-blue-300 dark:ring-blue-500/50' : ''}`}
                >
                  <div className={`${config.bgColor} px-4 py-3 rounded-t-xl border-b-2 ${config.borderColor}`}>
                    <h3 className={`font-bold text-sm ${config.color}`}>{config.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{tasks.length} tarefa(s)</p>
                  </div>
                  <div className="p-4 min-h-[320px] max-h-[500px] overflow-y-auto">
                    {tasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 dark:text-dark-text-secondary text-sm">
                        Nenhuma tarefa. Arraste para cá.
                      </div>
                    ) : (
                      tasks.map(renderCard)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-200 dark:border-dark-border p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-1">Relatório por usuário</h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Realizações e tempo de conclusão de tarefas e subtarefas.</p>
            </div>
            {!isPrivileged ? (
              <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-sm text-gray-700 dark:text-dark-text-secondary">
                Disponível apenas para <strong>Admin/Dev</strong>.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Início</label>
                  <input className="input-field" type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-1">Fim</label>
                  <input className="input-field" type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
                </div>
                <button type="button" className="btn-primary self-end" onClick={() => { loadRelatorioUsuarios(); loadRelatorioDetalhes(); }}>
                  Atualizar
                </button>
              </div>
            )}
          </div>

          {isPrivileged && (
            <>
              {reportError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
                  {reportError}
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {reportRows.map((u) => (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => { setReportUserId(u.userId); setDetails(null); }}
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold whitespace-nowrap transition-all ${
                      reportUserId === u.userId
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover'
                    }`}
                    title={u.email}
                  >
                    {u.name}
                    <span className={`ml-2 text-xs ${reportUserId === u.userId ? 'text-blue-100' : 'text-gray-500 dark:text-dark-text-secondary'}`}>
                      {u.concluidasPercent.toFixed(0)}%
                    </span>
                  </button>
                ))}
                {reportLoading && (
                  <span className="text-sm text-gray-500 dark:text-dark-text-secondary px-2 py-2">Carregando...</span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setDetailsTab('tarefas')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${detailsTab === 'tarefas' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-dark-text'}`}
                >
                  Tarefas
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab('subtarefas')}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${detailsTab === 'subtarefas' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-dark-text'}`}
                >
                  Subtarefas
                </button>
              </div>

              {detailsError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
                  {detailsError}
                </div>
              )}

              {detailsLoading ? (
                <div className="py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">Carregando detalhes...</div>
              ) : !details ? (
                <div className="py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">
                  Selecione um usuário para ver o relatório detalhado.
                </div>
              ) : detailsTab === 'tarefas' ? (
                <div className="overflow-x-auto border border-gray-200 dark:border-dark-border rounded-2xl">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Título</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Coluna</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Itens</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Conclusão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {details.tarefas.map((t) => (
                        <tr key={t.id}>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-dark-text">{t.titulo}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-text-secondary">{t.coluna}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-dark-text-secondary">{t.itensConcluidos}/{t.itensTotal}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-dark-text-secondary">
                            {t.horasConclusao != null ? formatHoras(t.horasConclusao) : '-'}
                          </td>
                        </tr>
                      ))}
                      {details.tarefas.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">Sem tarefas no período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 dark:border-dark-border rounded-2xl">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Tarefa</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Subtarefa</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-dark-text uppercase">Conclusão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {details.itens.map((i) => (
                        <tr key={i.id}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text">{i.tarefaTitulo}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-dark-text">{i.titulo}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-text-secondary">
                            {i.concluido ? 'CONCLUÍDA' : 'PENDENTE'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-dark-text-secondary">
                            {i.horasConclusao != null ? formatHoras(i.horasConclusao) : '-'}
                          </td>
                        </tr>
                      ))}
                      {details.itens.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-dark-text-secondary">Sem subtarefas no período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="modal-content max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
            aria-busy={savingTask}
          >
            {savingTask && (
              <div
                className="absolute inset-0 z-10 bg-white/50 dark:bg-dark-card/50 backdrop-blur-[1px] rounded-2xl pointer-events-none"
                aria-hidden
              />
            )}
            <div className="modal-header flex items-center justify-between bg-blue-600 dark:bg-blue-700 text-white rounded-t-2xl">
              <h3 className="text-xl font-bold">{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</h3>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={savingTask}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Fechar"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <fieldset disabled={savingTask} className="flex flex-col flex-1 min-h-0 border-0 p-0 m-0">
              <div className="modal-body overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Título *</label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    className="input-field"
                    placeholder="Título da tarefa"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Motivo</label>
                  <input
                    type="text"
                    value={form.motivo}
                    onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                    className="input-field"
                    placeholder="Motivo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Descrição</label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    className="textarea-field"
                    rows={3}
                    placeholder="Descrição"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Prioridade</label>
                  <select
                    value={form.prioridade ?? 'MEDIA'}
                    onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
                    className="select-field"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Coluna</label>
                  <select
                    value={form.coluna ?? 'BACKLOG'}
                    onChange={(e) => setForm((f) => ({ ...f, coluna: e.target.value as StatusTarefaInterna }))}
                    className="select-field"
                  >
                    <option value="BACKLOG">Backlog</option>
                    <option value="A_FAZER">A Fazer</option>
                    <option value="ANDAMENTO">Em Andamento</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Prazo (opcional)</label>
                  <input
                    type="date"
                    value={form.prazo || ''}
                    onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                    className="input-field"
                    placeholder={toIsoDateInput(addDays(new Date(), 1))}
                  />
                  <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                    Se você não definir um prazo, o sistema salva automaticamente para <strong>1 dia após a criação</strong>.
                  </p>
                </div>
                <div>
                  <UserSearchMultiSelect
                    label="Atribuir a (um ou mais usuários)"
                    users={users.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
                    value={form.userIds ?? []}
                    onChange={(ids) => setForm((f) => ({ ...f, userIds: ids, userId: ids[0] || '' }))}
                    placeholder="Buscar por nome e selecionar..."
                  />
                </div>
              </div>
              <div className="modal-footer flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={savingTask}
                  className="btn-secondary disabled:opacity-50 disabled:pointer-events-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="btn-success inline-flex items-center justify-center gap-2 min-w-[8.5rem] disabled:opacity-70 disabled:pointer-events-none"
                >
                  {savingTask && (
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden
                    />
                  )}
                  {savingTask ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setTaskToDelete(null); }}
        title="Excluir tarefa"
        message={taskToDelete ? `Excluir a tarefa "${taskToDelete.titulo}"? Esta ação não pode ser desfeita.` : ''}
        onConfirm={handleDeleteConfirm}
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
};

export default TarefasInternasKanban;
