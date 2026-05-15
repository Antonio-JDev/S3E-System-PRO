import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  atendimentoCrmService,
  type ContatoLead,
  type CreateContatoLeadInput,
  type ContatoLeadStatus,
} from '../services/atendimentoCrmService';
import { getUploadUrl } from '../config/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import ClienteCreateEditModal from '../components/ui/ClienteCreateEditModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { maskCpfCnpj, maskWhatsApp, maskCep, onlyDigits } from '../utils/masks';
import { toWhatsappChatId } from '../utils/whatsappChat';
import { fetchWhatsappResolveOpenChat } from '../services/whatsappChatService';

const HORAS_ALERTA_ATRASO = 48;
const MAX_ANEXOS_LEAD = 8;

function anexosDoLead(lead: ContatoLead | null): string[] {
  if (!lead) return [];
  const raw = lead.anexosUrls;
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
  }
  return lead.contaEnergiaUrl ? [lead.contaEnergiaUrl] : [];
}

function leadTemPropostaComercial(lead: ContatoLead): boolean {
  const n = lead._count?.orcamentos;
  return typeof n === 'number' && n > 0;
}

const statusLabels: Record<ContatoLeadStatus, string> = {
  AGUARDANDO_DOCUMENTO: 'Aguardando Documento',
  EM_ANALISE_TECNICA: 'Em Análise Técnica',
  PRONTO_PARA_ORCAR: 'Pronto para Orçar',
  NAO_ATENDE: 'Não Atende',
  CONVERTIDO: 'Convertido',
};

const statusOrder: ContatoLeadStatus[] = [
  'AGUARDANDO_DOCUMENTO',
  'EM_ANALISE_TECNICA',
  'PRONTO_PARA_ORCAR',
  'NAO_ATENDE',
  'CONVERTIDO',
];

// Cores por etapa do funil (design system + UX)
const statusColors: Record<ContatoLeadStatus, { border: string; bg: string; headerBg: string; headerText: string }> = {
  AGUARDANDO_DOCUMENTO: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/60 dark:bg-amber-950/30',
    headerBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    headerText: 'text-amber-800 dark:text-amber-200',
  },
  EM_ANALISE_TECNICA: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50/60 dark:bg-blue-950/30',
    headerBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    headerText: 'text-blue-800 dark:text-blue-200',
  },
  PRONTO_PARA_ORCAR: {
    border: 'border-l-indigo-500',
    bg: 'bg-indigo-50/60 dark:bg-indigo-950/30',
    headerBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    headerText: 'text-indigo-800 dark:text-indigo-200',
  },
  NAO_ATENDE: {
    border: 'border-l-slate-400 dark:border-l-slate-500',
    bg: 'bg-slate-50/80 dark:bg-slate-800/40',
    headerBg: 'bg-slate-200/60 dark:bg-slate-700/50',
    headerText: 'text-slate-700 dark:text-slate-300',
  },
  CONVERTIDO: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/30',
    headerBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    headerText: 'text-emerald-800 dark:text-emerald-200',
  },
};

// Ícones locais
const UserIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
const BoltIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);
const CheckBadgeIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PlusIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const Bars3Icon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);
const DocumentArrowUpIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);
const RocketIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);
const PencilIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

function isAtrasado(updatedAt: string): boolean {
  const dt = new Date(updatedAt).getTime();
  const now = Date.now();
  return (now - dt) / (1000 * 60 * 60) > HORAS_ALERTA_ATRASO;
}

function formatarData(s: string) {
  try {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

interface FunilAtendimentoPageProps {
  toggleSidebar: () => void;
  onNavigate: (view: string, ...args: string[]) => void;
}

const FunilAtendimentoPage: React.FC<FunilAtendimentoPageProps> = ({ toggleSidebar, onNavigate }) => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<ContatoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ContatoLead | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    cpfCnpj: '',
    necessidade: '',
    mediaKwhMes: '' as string | number,
    observacoes: '',
    observacoesTecnicas: '',
    viabilidadeTecnica: '' as boolean | '',
    condicoesNaoAtender: '',
    contaEnergiaFiles: [] as File[],
    logradouro: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
  });
  const [showClienteOficialModal, setShowClienteOficialModal] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const cepAbortRef = useRef<AbortController | null>(null);
  const cepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openChatForLead = async (lead: ContatoLead) => {
    const digits = onlyDigits(lead.whatsapp || '');
    if (!digits) {
      toast.error('Lead sem WhatsApp', {
        description: 'Cadastre o número do WhatsApp no lead para abrir o chat.',
      });
      return;
    }
    const phoneInput = (lead.whatsapp || digits).trim();
    try {
      const r = await fetchWhatsappResolveOpenChat(phoneInput);
      if (r.success && r.data?.chatId) {
        if (!r.data.numberExists) {
          toast.warning('Número não consta como registrado no WhatsApp', {
            description:
              'A conversa será aberta no formato cadastrado; se o envio falhar, confira o número ou aguarde o contato aparecer na instância.',
          });
        }
        onNavigate('Chat WhatsApp', r.data.chatId, lead.nome);
        return;
      }
    } catch {
      // fallback abaixo
    }
    onNavigate('Chat WhatsApp', toWhatsappChatId(phoneInput), lead.nome);
  };

  const loadLeads = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await atendimentoCrmService.listar();
      const list = Array.isArray(res?.data) ? res.data : [];
      setLeads(list);
      if (list.length === 0 && showLoading) toast.info('Nenhum lead no funil. Clique em "Novo Lead" para começar.');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar leads');
      setLeads([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  useEscapeKey(showClienteOficialModal, () => setShowClienteOficialModal(false));

  const handleCloseModal = (open: boolean) => {
    setModalOpen(!!open);
  };

  const resetFormPadrao = () =>
    setForm({
      nome: '',
      whatsapp: '',
      cpfCnpj: '',
      necessidade: '',
      mediaKwhMes: '',
      observacoes: '',
      observacoesTecnicas: '',
      viabilidadeTecnica: '',
      condicoesNaoAtender: '',
      contaEnergiaFiles: [],
      logradouro: '',
      numero: '',
      bairro: '',
      cep: '',
      cidade: '',
      estado: '',
    });

  const excluirLeadPermanente = async () => {
    if (!editingLead) return;
    setExcluindo(true);
    try {
      const res = await atendimentoCrmService.excluir(editingLead.id);
      if (!res.success) {
        toast.error(res.error || 'Não foi possível excluir o lead');
        return;
      }
      toast.success('Lead excluído', { description: 'Registro e anexos removidos do sistema.' });
      setConfirmExcluirOpen(false);
      setModalOpen(false);
      setEditingLead(null);
      resetFormPadrao();
      await loadLeads(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir');
    } finally {
      setExcluindo(false);
    }
  };

  const descartarLead = async () => {
    if (!editingLead) return;
    const leadId = editingLead.id;
    try {
      await atendimentoCrmService.atualizar(leadId, {
        status: 'NAO_ATENDE',
        etapa: editingLead.etapa,
      });
      toast.success('Lead descartado', { description: 'Marcado como "Não Atende" e removido do funil.' });
      setModalOpen(false);
      setEditingLead(null);
      resetFormPadrao();
      await loadLeads(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar.');
    }
  };

  const openNew = () => {
    setEditingLead(null);
    setForm({
      nome: '',
      whatsapp: '',
      cpfCnpj: '',
      necessidade: '',
      mediaKwhMes: '',
      observacoes: '',
      observacoesTecnicas: '',
      viabilidadeTecnica: '',
      condicoesNaoAtender: '',
      contaEnergiaFiles: [],
      logradouro: '',
      numero: '',
      bairro: '',
      cep: '',
      cidade: '',
      estado: '',
    });
    setCurrentStep(1);
    setModalOpen(true);
  };

  const openEdit = (lead: ContatoLead) => {
    setEditingLead(lead);
    setForm({
      nome: lead.nome,
      whatsapp: lead.whatsapp ? maskWhatsApp(lead.whatsapp) : '',
      cpfCnpj: lead.cpfCnpj ? maskCpfCnpj(lead.cpfCnpj) : '',
      necessidade: lead.necessidade || '',
      mediaKwhMes: lead.mediaKwhMes ?? '',
      observacoes: lead.observacoes || '',
      observacoesTecnicas: lead.observacoesTecnicas || '',
      viabilidadeTecnica: lead.viabilidadeTecnica === true ? true : lead.viabilidadeTecnica === false ? false : '',
      condicoesNaoAtender: lead.condicoesNaoAtender || '',
      contaEnergiaFiles: [],
      logradouro: lead.logradouro || '',
      numero: lead.numero || '',
      bairro: lead.bairro || '',
      cep: lead.cep ? maskCep(lead.cep) : '',
      cidade: lead.cidade || '',
      estado: lead.estado || '',
    });
    setCurrentStep(lead.etapa || 1);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (editingLead) {
        await atendimentoCrmService.atualizar(editingLead.id, {
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.trim() || undefined,
          cpfCnpj: form.cpfCnpj.trim() ? onlyDigits(form.cpfCnpj) : undefined,
          necessidade: form.necessidade.trim() || undefined,
          mediaKwhMes: form.mediaKwhMes === '' ? undefined : Number(form.mediaKwhMes),
          observacoes: form.observacoes.trim() || undefined,
          observacoesTecnicas: form.observacoesTecnicas.trim() || undefined,
          viabilidadeTecnica: form.viabilidadeTecnica === '' ? undefined : form.viabilidadeTecnica === true,
          condicoesNaoAtender: form.condicoesNaoAtender.trim() || undefined,
          etapa: currentStep,
          status: stepToStatus(currentStep),
          logradouro: form.logradouro.trim() || undefined,
          numero: form.numero.trim() || undefined,
          bairro: form.bairro.trim() || undefined,
          cep: form.cep.trim() || undefined,
          cidade: form.cidade.trim() || undefined,
          estado: form.estado.trim() || undefined,
        });
        if (form.contaEnergiaFiles.length > 0) {
          const up = await atendimentoCrmService.uploadContaEnergia(editingLead.id, form.contaEnergiaFiles);
          if (!up.success) {
            throw new Error(up.error || 'Falha ao enviar anexos');
          }
        }
        toast.success('Lead atualizado', { description: 'Alterações salvas com sucesso.' });
      } else {
        const createData: CreateContatoLeadInput = {
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.trim() || undefined,
          cpfCnpj: form.cpfCnpj.trim() ? onlyDigits(form.cpfCnpj) : undefined,
          necessidade: form.necessidade.trim() || undefined,
          mediaKwhMes: form.mediaKwhMes === '' ? undefined : Number(form.mediaKwhMes),
          observacoes: form.observacoes.trim() || undefined,
          status: stepToStatus(currentStep),
          etapa: currentStep,
          logradouro: form.logradouro.trim() || undefined,
          numero: form.numero.trim() || undefined,
          bairro: form.bairro.trim() || undefined,
          cep: form.cep.trim() || undefined,
          cidade: form.cidade.trim() || undefined,
          estado: form.estado.trim() || undefined,
        };
        const res = await atendimentoCrmService.criar(createData);
        const id = res.data?.id;
        if (id && form.contaEnergiaFiles.length > 0) {
          const up = await atendimentoCrmService.uploadContaEnergia(id, form.contaEnergiaFiles);
          if (!up.success) {
            throw new Error(up.error || 'Falha ao enviar anexos');
          }
        }
        toast.success('Lead criado', { description: 'Novo lead adicionado ao funil.' });
      }
      setModalOpen(false);
      await loadLeads(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const stepToStatus = (step: number): ContatoLeadStatus => {
    if (step === 1) return 'AGUARDANDO_DOCUMENTO';
    if (step === 2) return 'EM_ANALISE_TECNICA';
    if (step === 3) return 'PRONTO_PARA_ORCAR';
    return 'AGUARDANDO_DOCUMENTO';
  };

  const goToNovoOrcamento = () => {
    setModalOpen(false);
    const clienteId = editingLead?.clienteId?.trim();
    const leadId = editingLead?.id?.trim();
    const params = new URLSearchParams();
    if (clienteId) params.set('clienteId', clienteId);
    if (leadId) params.set('leadId', leadId);
    navigate(`/orcamentos${params.toString() ? `?${params.toString()}` : ''}`);
    toast.success('Pronto para gerar proposta', { description: 'Abrindo o Novo orçamento com os dados do lead.' });
  };

  const onClienteCadastrado = async (cliente: { id: string }) => {
    setShowClienteOficialModal(false);
    if (editingLead) {
      try {
        await atendimentoCrmService.atualizar(editingLead.id, { clienteId: cliente.id });
        setEditingLead((prev) => (prev ? { ...prev, clienteId: cliente.id } : null));
        await loadLeads(false);
        toast.success('Lead vinculado ao cliente', { description: 'Agora você pode gerar a proposta comercial.' });
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao vincular lead');
      }
    }
  };

  const moveToStatus = async (lead: ContatoLead, newStatus: ContatoLeadStatus) => {
    try {
      await atendimentoCrmService.atualizar(lead.id, {
        status: newStatus,
        etapa: newStatus === 'AGUARDANDO_DOCUMENTO' ? 1 : newStatus === 'EM_ANALISE_TECNICA' ? 2 : newStatus === 'PRONTO_PARA_ORCAR' ? 3 : lead.etapa,
      });
      toast.success('Status atualizado', { description: 'Lead movido para a nova etapa.' });
      await loadLeads(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar.');
    }
  };

  const leadsByStatus = statusOrder.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s);
    return acc;
  }, {} as Record<ContatoLeadStatus, ContatoLead[]>);

  // Buscar CEP via BrasilAPI e preencher endereço (debounced + abortable)
  const buscarCepLead = async (cepRaw: string) => {
    const cepDigits = (cepRaw || '').replace(/\D/g, '');
    if (cepDigits.length !== 8) return;
    try {
      if (cepAbortRef.current) cepAbortRef.current.abort();
    } catch (_) { /* ignore */ }
    const controller = new AbortController();
    cepAbortRef.current = controller;
    setCepLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepDigits}`, { signal: controller.signal });
      if (!res.ok) {
        let errMsg = 'Não foi possível localizar o CEP';
        try {
          const errBody = await res.json();
          if (errBody?.message) errMsg = errBody.message;
        } catch (_) { /* ignore */ }
        toast.error('CEP não encontrado', { description: errMsg });
        return;
      }
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        logradouro: data.street || prev.logradouro,
        bairro: data.neighborhood || prev.bairro,
        cidade: data.city || prev.cidade,
        estado: (data.state || prev.estado || '').slice(0, 2).toUpperCase(),
      }));
      toast.success('Endereço preenchido', { description: 'Campos atualizados com os dados do CEP.' });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Erro ao buscar CEP:', err);
      toast.error('Erro ao buscar CEP', { description: 'Não foi possível consultar o serviço.' });
    } finally {
      setCepLoading(false);
      cepAbortRef.current = null;
    }
  };

  useEffect(() => () => {
    if (cepTimeoutRef.current) clearTimeout(cepTimeoutRef.current);
    try { if (cepAbortRef.current) cepAbortRef.current.abort(); } catch (_) { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={toggleSidebar} className="lg:hidden p-2 rounded-xl hover:bg-white dark:hover:bg-dark-card text-gray-600 dark:text-dark-text-secondary">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text">Funil de Atendimento (CRM)</h1>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">Controle contatos e não deixe nenhum lead no vácuo</p>
          </div>
        </div>
        <button type="button" onClick={openNew} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Novo Lead
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto">
          {statusOrder.map((status) => {
            const colors = statusColors[status];
            return (
            <div
              key={status}
              className="card-primary min-w-[260px] flex flex-col p-0 overflow-hidden"
            >
              <h3 className={`font-semibold mb-0 px-4 py-3 flex items-center gap-2 rounded-t-xl border-b border-gray-200 dark:border-dark-border ${colors.headerBg} ${colors.headerText}`}>
                {statusLabels[status]}
                <span className="text-xs font-normal opacity-80">({leadsByStatus[status].length})</span>
              </h3>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[70vh] p-4">
                {leadsByStatus[status].map((lead) => {
                  const movimentoLento = isAtrasado(lead.updatedAt);
                  const propostaJaGerada =
                    status === 'PRONTO_PARA_ORCAR' && leadTemPropostaComercial(lead);
                  const atrasado =
                    movimentoLento &&
                    status !== 'NAO_ATENDE' &&
                    status !== 'CONVERTIDO' &&
                    !propostaJaGerada;
                  return (
                  <div
                    key={lead.id}
                    onClick={() => openChatForLead(lead)}
                    className={`p-3 rounded-xl border-l-4 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                      atrasado
                        ? 'border-l-red-500 bg-red-50/60 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700'
                        : `border-l-4 border ${colors.border} ${colors.bg} border-gray-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-600/50`
                    }`}
                  >
                    <div className="flex justify-between gap-2 items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-dark-text truncate">{lead.nome}</p>
                        {lead.whatsapp && <p className="text-xs text-gray-600 dark:text-dark-text-secondary truncate">{lead.whatsapp}</p>}
                        {lead.cpfCnpj && <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">{lead.cpfCnpj}</p>}
                        {lead.necessidade && (
                          <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1 line-clamp-2" title={lead.necessidade}>
                            {lead.necessidade}
                          </p>
                        )}
                        {(lead.cidade || lead.bairro) && (
                          <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate mt-0.5">
                            {[lead.cidade, lead.bairro].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">{formatarData(lead.updatedAt)}</p>
                        {propostaJaGerada && (
                          <span className="inline-block mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            Proposta comercial gerada — lead atendido nesta etapa
                          </span>
                        )}
                        {movimentoLento && status !== 'NAO_ATENDE' && status !== 'CONVERTIDO' && !propostaJaGerada && (
                          <span className="inline-block mt-1 text-xs font-medium text-red-600 dark:text-red-400">Atenção: +48h sem movimento</span>
                        )}
                        <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1 italic">
                          Clique para abrir na página WhatsApp
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(lead);
                        }}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-dark-text-secondary"
                        title="Editar lead"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 modal-content overflow-hidden rounded-2xl [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:hover:bg-white/20 [&>button]:rounded-xl">
          <div className="relative flex-shrink-0 p-6 pb-5 bg-gradient-to-r from-blue-600 to-blue-700 border-0 rounded-t-2xl">
            <div className="flex items-center gap-4 pr-10">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium flex-shrink-0">
                {editingLead ? <BoltIcon className="w-6 h-6 text-white" /> : <UserIcon className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <DialogHeader className="text-left space-y-0">
                  <DialogTitle className="text-left text-xl font-bold text-white">
                    {editingLead ? 'Editar Lead' : 'Novo Lead'}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-white/90 mt-1">
                  {currentStep === 1 && 'Dados do contato e necessidade'}
                  {currentStep === 2 && 'Análise técnica e viabilidade'}
                  {currentStep === 3 && 'Gerar proposta comercial'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 min-h-0 bg-white dark:bg-dark-card space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      currentStep === step
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:border-gray-300 dark:hover:border-dark-border'
                    }`}
                  >
                    {step === 1 && <UserIcon className="w-4 h-4" />}
                    {step === 2 && <BoltIcon className="w-4 h-4" />}
                    {step === 3 && <CheckBadgeIcon className="w-4 h-4" />}
                    Etapa {step}
                  </button>
                  {step < 3 && <span className="text-gray-300 dark:text-dark-border hidden sm:inline">→</span>}
                </React.Fragment>
              ))}
            </div>

            {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Dados do contato</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Nome *</label>
                    <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="input-field" placeholder="Nome do contato" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">WhatsApp</label>
                    <input type="text" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: maskWhatsApp(e.target.value) }))} className="input-field" placeholder="(00) 00000-0000" maxLength={16} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">CPF/CNPJ</label>
                    <input type="text" value={form.cpfCnpj} onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: maskCpfCnpj(e.target.value) }))} className="input-field" placeholder="CPF ou CNPJ (com máscara)" maxLength={18} />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Endereço (para orçamento)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">CEP</label>
                    <input
                      type="text"
                      value={form.cep}
                      onChange={(e) => {
                        const val = maskCep(e.target.value);
                        setForm((f) => ({ ...f, cep: val }));
                        if (cepTimeoutRef.current) clearTimeout(cepTimeoutRef.current);
                        cepTimeoutRef.current = setTimeout(() => buscarCepLead(val), 700);
                      }}
                      className="input-field pr-10"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {cepLoading && (
                      <div className="absolute right-3 top-[38px] -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Logradouro</label>
                    <input type="text" value={form.logradouro} onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))} className="input-field" placeholder="Rua, avenida..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Número</label>
                    <input type="text" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} className="input-field" placeholder="Nº" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Bairro</label>
                    <input type="text" value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} className="input-field" placeholder="Bairro" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Cidade</label>
                    <input type="text" value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} className="input-field" placeholder="Cidade" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Estado (UF)</label>
                    <input type="text" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))} className="input-field" placeholder="UF" maxLength={2} />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Necessidade e anexos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">O que o cliente busca? (Necessidade)</label>
                    <textarea value={form.necessidade} onChange={(e) => setForm((f) => ({ ...f, necessidade: e.target.value }))} rows={3} className="textarea-field" placeholder="Descreva a necessidade do cliente..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Média KWh/mês</label>
                    <input type="number" value={form.mediaKwhMes} onChange={(e) => setForm((f) => ({ ...f, mediaKwhMes: e.target.value }))} className="input-field" placeholder="Ex: 500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                      Anexos (conta de energia, PDF ou fotos) — até {MAX_ANEXOS_LEAD} arquivos no total
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const picked = e.target.files ? Array.from(e.target.files) : [];
                        const jaSalvos = anexosDoLead(editingLead);
                        const vagas = Math.max(0, MAX_ANEXOS_LEAD - jaSalvos.length);
                        if (picked.length > vagas) {
                          toast.warning(`Este lead já tem ${jaSalvos.length} anexo(s). Só cabem mais ${vagas} (máx. ${MAX_ANEXOS_LEAD}).`);
                          setForm((f) => ({ ...f, contaEnergiaFiles: picked.slice(0, vagas) }));
                        } else {
                          setForm((f) => ({ ...f, contaEnergiaFiles: picked }));
                        }
                        e.target.value = '';
                      }}
                      className="w-full text-sm text-gray-600 dark:text-dark-text-secondary file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-300 dark:file:border-dark-border file:bg-gray-50 dark:file:bg-dark-bg file:text-gray-700 dark:file:text-dark-text"
                    />
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                      {anexosDoLead(editingLead).length}/{MAX_ANEXOS_LEAD} já salvos
                      {form.contaEnergiaFiles.length > 0
                        ? ` · ${form.contaEnergiaFiles.length} selecionado(s) para enviar ao salvar`
                        : ''}
                    </p>
                    {anexosDoLead(editingLead).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {anexosDoLead(editingLead).map((url, idx) => (
                          <li key={`${url}-${idx}`}>
                            <a
                              href={getUploadUrl(url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 underline"
                            >
                              Anexo {idx + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Observações</label>
                    <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} className="textarea-field" placeholder="Observações gerais..." />
                  </div>
                </div>
              </div>
            </div>
            )}

            {currentStep === 2 && (
            <div className="space-y-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text">Análise técnica e viabilidade</h4>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Análise / Observações técnicas</label>
                <textarea value={form.observacoesTecnicas} onChange={(e) => setForm((f) => ({ ...f, observacoesTecnicas: e.target.value }))} rows={4} className="textarea-field" placeholder="Diagnóstico técnico..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Viabilidade Técnica</label>
                <div className="flex gap-4 flex-wrap">
                  <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all font-semibold ${
                    form.viabilidadeTecnica === true ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:border-gray-300'
                  }`}>
                    <input type="radio" name="viab" checked={form.viabilidadeTecnica === true} onChange={() => setForm((f) => ({ ...f, viabilidadeTecnica: true }))} className="sr-only" />
                    <span>Sim, atende</span>
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all font-semibold ${
                    form.viabilidadeTecnica === false ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:border-gray-300'
                  }`}>
                    <input type="radio" name="viab" checked={form.viabilidadeTecnica === false} onChange={() => setForm((f) => ({ ...f, viabilidadeTecnica: false }))} className="sr-only" />
                    <span>Não atende</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Se não atender, por quê?</label>
                <textarea value={form.condicoesNaoAtender} onChange={(e) => setForm((f) => ({ ...f, condicoesNaoAtender: e.target.value }))} rows={2} className="textarea-field" placeholder="Ex: Telhado sem estrutura, sombreamento..." />
              </div>
            </div>
            )}

            {currentStep === 3 && (
            <div className="space-y-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text">Gerar proposta comercial</h4>
              {editingLead && leadTemPropostaComercial(editingLead) && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200">
                  <p className="font-semibold">Proposta já gerada a partir deste lead</p>
                  <p className="mt-1 opacity-90">
                    Este contato já possui {editingLead._count?.orcamentos ?? 1} orçamento(s) vinculado(s) no sistema. Você pode gerar outra proposta ou acompanhar na lista de Orçamentos.
                  </p>
                </div>
              )}
              <p className="text-gray-600 dark:text-dark-text-secondary text-sm leading-relaxed">
                Lead qualificado e com viabilidade. Se o cliente ainda não estiver cadastrado, cadastre-o abaixo para vincular ao lead. Em seguida, clique em &quot;Gerar Proposta Comercial&quot; para abrir o Novo Orçamento com os dados preenchidos.
              </p>
              {editingLead?.clienteId || editingLead?.cliente ? (
                <p className="text-sm text-green-700 dark:text-green-400 font-semibold">Cliente já vinculado a este lead.</p>
              ) : (
                <button type="button" onClick={() => setShowClienteOficialModal(true)} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-text font-semibold hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                  <UserIcon className="w-5 h-5" />
                  Cadastrar Cliente (CNPJ)
                </button>
              )}
              <button type="button" onClick={goToNovoOrcamento} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium w-full sm:w-auto justify-center">
                <RocketIcon className="w-5 h-5" />
                Gerar Proposta Comercial (Orçamento)
              </button>
            </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-200 dark:border-dark-border flex justify-between items-center gap-3 flex-wrap bg-gray-50 dark:bg-dark-card rounded-b-2xl flex-shrink-0">
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
              {editingLead && (
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl font-semibold border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 bg-white dark:bg-dark-bg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  onClick={() => setConfirmExcluirOpen(true)}
                >
                  Excluir lead
                </button>
              )}
              {currentStep === 2 && editingLead && (
                <button type="button" className="px-4 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors" onClick={descartarLead}>
                  Descartar Lead (Não Atende)
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button type="button" className="px-4 py-2.5 rounded-xl font-semibold border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-700 dark:text-dark-text hover:border-gray-300 dark:hover:border-dark-border transition-colors" onClick={() => setCurrentStep((s) => s - 1)}>
                  Voltar
                </button>
              )}
              {currentStep < 3 && (
                <button type="button" className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium" onClick={() => setCurrentStep((s) => s + 1)}>
                  Avançar
                </button>
              )}
              {currentStep === 3 && (
                <button type="button" className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : editingLead ? 'Salvar' : 'Salvar e Fechar'}
                </button>
              )}
              {currentStep < 3 && (
                <button type="button" className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmExcluirOpen} onOpenChange={setConfirmExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o lead do funil e apaga os arquivos anexados. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmExcluirOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluindo}
              onClick={() => {
                void excluirLeadPermanente();
              }}
            >
              {excluindo ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClienteCreateEditModal
        isOpen={showClienteOficialModal}
        onClose={() => setShowClienteOficialModal(false)}
        initialValues={{
          nome: form.nome?.trim() || '',
          cpfCnpj: form.cpfCnpj?.trim() || '',
          email: '',
          telefone: form.whatsapp?.trim() || '',
          endereco: form.logradouro?.trim() || '',
          numero: form.numero?.trim() || '',
          bairro: form.bairro?.trim() || '',
          cidade: form.cidade?.trim() || '',
          estado: form.estado?.trim() || '',
          cep: form.cep?.trim() || '',
          tipo: (onlyDigits(form.cpfCnpj || '').length === 11 ? 'PF' : 'PJ'),
        }}
        onSuccess={(cliente) => {
          void onClienteCadastrado({ id: cliente.id });
        }}
      />
    </div>
  );
};

export default FunilAtendimentoPage;
