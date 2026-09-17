import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projetosService, type UpdateProjetoData } from '../services/projetosService';
import { clientesService, type Cliente } from '../services/clientesService';
import { serverDateToInput } from '../utils/date';

export interface OsEditFormDraft {
  titulo: string;
  descricao: string;
  clienteId: string;
  responsavelId: string;
  dataInicio: string;
  dataPrevisao: string;
  exigeVistoriaCelesc: boolean;
}

export interface OsEditProjetoSource {
  id: string;
  titulo: string;
  descricao?: string | null;
  clienteId?: string;
  cliente?: { id: string; nome: string } | null;
  responsavelId?: string | null;
  dataInicio?: string | null;
  dataPrevisao?: string | null;
  exigeVistoriaCelesc?: boolean;
  status?: string;
}

function draftFromProjeto(projeto: OsEditProjetoSource): OsEditFormDraft {
  return {
    titulo: projeto.titulo || '',
    descricao: projeto.descricao || '',
    clienteId: projeto.clienteId || projeto.cliente?.id || '',
    responsavelId: projeto.responsavelId || '',
    dataInicio: serverDateToInput(projeto.dataInicio as string),
    dataPrevisao: serverDateToInput(projeto.dataPrevisao as string),
    exigeVistoriaCelesc: Boolean(projeto.exigeVistoriaCelesc),
  };
}

function draftsEqual(a: OsEditFormDraft, b: OsEditFormDraft): boolean {
  return (
    a.titulo === b.titulo &&
    a.descricao === b.descricao &&
    a.clienteId === b.clienteId &&
    a.responsavelId === b.responsavelId &&
    a.dataInicio === b.dataInicio &&
    a.dataPrevisao === b.dataPrevisao &&
    a.exigeVistoriaCelesc === b.exigeVistoriaCelesc
  );
}

export function podeEditarOsStatus(status?: string): boolean {
  const s = String(status || '').toUpperCase();
  return s !== 'CONCLUIDO' && s !== 'CANCELADO';
}

interface UseOsEditFormOptions {
  projeto: OsEditProjetoSource | null;
  onSaved?: (updated: unknown) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
}

export function useOsEditForm({ projeto, onSaved, onRefresh }: UseOsEditFormOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<OsEditFormDraft>(() =>
    projeto ? draftFromProjeto(projeto) : {
      titulo: '',
      descricao: '',
      clienteId: '',
      responsavelId: '',
      dataInicio: '',
      dataPrevisao: '',
      exigeVistoriaCelesc: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesLoaded, setClientesLoaded] = useState(false);
  const [dirtyDialogOpen, setDirtyDialogOpen] = useState(false);
  const [dirtyDialogMode, setDirtyDialogMode] = useState<'close' | 'cancel-edit'>('close');

  const baseline = useMemo(
    () => (projeto ? draftFromProjeto(projeto) : null),
    [
      projeto?.id,
      projeto?.titulo,
      projeto?.descricao,
      projeto?.clienteId,
      projeto?.cliente?.id,
      projeto?.responsavelId,
      projeto?.dataInicio,
      projeto?.dataPrevisao,
      projeto?.exigeVistoriaCelesc,
    ],
  );

  const isDirty = Boolean(isEditing && baseline && !draftsEqual(draft, baseline));
  const canEdit = podeEditarOsStatus(projeto?.status);

  useEffect(() => {
    if (!isEditing && projeto) {
      setDraft(draftFromProjeto(projeto));
    }
  }, [projeto, isEditing]);

  useEffect(() => {
    setIsEditing(false);
    setDirtyDialogOpen(false);
  }, [projeto?.id]);

  useEffect(() => {
    if (!isOpenSafe(projeto) || !isEditing || clientesLoaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await clientesService.listar();
        if (cancelled) return;
        if (res.success && res.data) {
          setClientes(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        /* silencioso */
      } finally {
        if (!cancelled) setClientesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, clientesLoaded, projeto?.id]);

  const startEditing = useCallback(() => {
    if (!projeto || !canEdit) return;
    setDraft(draftFromProjeto(projeto));
    setIsEditing(true);
    setClientesLoaded(false);
  }, [projeto, canEdit]);

  const resetDraft = useCallback(() => {
    if (projeto) setDraft(draftFromProjeto(projeto));
  }, [projeto]);

  const cancelEditing = useCallback(() => {
    if (isDirty) {
      setDirtyDialogMode('cancel-edit');
      setDirtyDialogOpen(true);
      return;
    }
    resetDraft();
    setIsEditing(false);
  }, [isDirty, resetDraft]);

  const discardEditing = useCallback(() => {
    resetDraft();
    setIsEditing(false);
    setDirtyDialogOpen(false);
  }, [resetDraft]);

  const patchDraft = useCallback((partial: Partial<OsEditFormDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const saveEditing = useCallback(async (): Promise<boolean> => {
    if (!projeto) return false;
    if (!draft.titulo.trim()) {
      toast.error('Informe o título da OS');
      return false;
    }
    if (!draft.responsavelId) {
      toast.error('Selecione o gerente do projeto');
      return false;
    }
    try {
      setSaving(true);
      const payload: UpdateProjetoData = {
        titulo: draft.titulo.trim(),
        descricao: draft.descricao,
        clienteId: draft.clienteId || undefined,
        responsavelId: draft.responsavelId,
        dataInicio: draft.dataInicio || undefined,
        dataPrevisao: draft.dataPrevisao || undefined,
        exigeVistoriaCelesc: draft.exigeVistoriaCelesc,
      };
      const response = await projetosService.atualizar(projeto.id, payload);
      if (!response.success || !response.data) {
        toast.error(response.error || 'Erro ao atualizar ordem de serviço');
        return false;
      }
      toast.success('Ordem de serviço atualizada');
      setIsEditing(false);
      setDirtyDialogOpen(false);
      await onSaved?.(response.data);
      await onRefresh?.();
      return true;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao salvar ordem de serviço';
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [projeto, draft, onSaved, onRefresh]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setDirtyDialogMode('close');
      setDirtyDialogOpen(true);
      return;
    }
    if (isEditing) {
      setIsEditing(false);
      resetDraft();
    }
  }, [isDirty, isEditing, resetDraft]);

  /** Retorna true se pode fechar imediatamente; false se abriu diálogo dirty. */
  const tryClose = useCallback(
    (forceClose: () => void) => {
      if (isDirty) {
        setDirtyDialogMode('close');
        setDirtyDialogOpen(true);
        return false;
      }
      if (isEditing) {
        setIsEditing(false);
        resetDraft();
      }
      forceClose();
      return true;
    },
    [isDirty, isEditing, resetDraft],
  );

  const confirmDirtySave = useCallback(
    async (afterClose?: () => void) => {
      const ok = await saveEditing();
      if (ok) afterClose?.();
    },
    [saveEditing],
  );

  const confirmDirtyDiscard = useCallback(
    (afterClose?: () => void) => {
      discardEditing();
      if (dirtyDialogMode === 'close') afterClose?.();
    },
    [discardEditing, dirtyDialogMode],
  );

  return {
    isEditing,
    draft,
    patchDraft,
    saving,
    isDirty,
    canEdit,
    clientes,
    dirtyDialogOpen,
    dirtyDialogMode,
    setDirtyDialogOpen,
    startEditing,
    cancelEditing,
    discardEditing,
    saveEditing,
    requestClose,
    tryClose,
    confirmDirtySave,
    confirmDirtyDiscard,
  };
}

function isOpenSafe(projeto: OsEditProjetoSource | null): boolean {
  return Boolean(projeto?.id);
}
