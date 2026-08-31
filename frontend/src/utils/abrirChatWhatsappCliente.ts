import { toast } from 'sonner';
import { fetchWhatsappResolveOpenChat } from '../services/whatsappChatService';
import { orcamentosService } from '../services/orcamentosService';
import { onlyDigits } from './masks';
import { toWhatsappChatId } from './whatsappChat';

export async function abrirChatWhatsappCliente(params: {
  telefone?: string | null;
  nome?: string | null;
  onNavigate?: (view: string, ...args: unknown[]) => void;
}) {
  const raw = (params.telefone || '').trim();
  const digits = onlyDigits(raw);
  if (!digits) {
    toast.error('Cliente sem telefone', {
      description: 'Cadastre o telefone do cliente para chamar no WhatsApp.',
    });
    return;
  }

  const nome = params.nome || 'Cliente';
  let chatId = toWhatsappChatId(raw || digits);
  try {
    const r = await fetchWhatsappResolveOpenChat(raw || digits);
    if (r.success && r.data?.chatId) {
      chatId = r.data.chatId;
    }
  } catch {
    /* fallback para JID montado */
  }

  if (params.onNavigate) {
    params.onNavigate('Chat WhatsApp', chatId, nome);
    return;
  }

  sessionStorage.setItem('s3e_open_whatsapp', JSON.stringify({ chatId, title: nome }));
  window.location.assign('/');
}

/** Abre WhatsApp do cliente do orçamento; busca telefone completo se a lista não trouxe. */
export async function abrirChatWhatsappDoOrcamento(params: {
  orcamentoId: string;
  telefone?: string | null;
  nome?: string | null;
  onNavigate?: (view: string, ...args: unknown[]) => void;
}) {
  let telefone = params.telefone;
  let nome = params.nome;

  if (!onlyDigits((telefone || '').trim())) {
    try {
      const response = await orcamentosService.buscar(params.orcamentoId);
      const cliente = response.success ? (response.data as { cliente?: { telefone?: string; nome?: string } })?.cliente : null;
      if (cliente) {
        telefone = cliente.telefone ?? telefone;
        nome = cliente.nome ?? nome;
      }
    } catch {
      /* usa dados da lista */
    }
  }

  await abrirChatWhatsappCliente({ telefone, nome, onNavigate: params.onNavigate });
}
