import { axiosApiService } from './axiosApi';

const BASE = '/api/whatsapp/chat-labels';

export interface WhatsappChatLabelDto {
  id: string;
  userId: string;
  isGlobal: boolean;
  nome: string;
  cor: string | null;
  emoji: string | null;
  ordem: number;
  createdAt: string;
  updatedAt: string;
  chatIds: string[];
  total: number;
}

export function listChatLabels() {
  return axiosApiService.get<WhatsappChatLabelDto[]>(BASE);
}

export function createChatLabel(body: {
  nome: string;
  cor?: string | null;
  emoji?: string | null;
  ordem?: number;
  chatIds?: string[];
  /** Quando true, o filtro fica visível para todos os usuários do CRM. */
  isGlobal?: boolean;
}) {
  return axiosApiService.post<WhatsappChatLabelDto>(BASE, body);
}

export function updateChatLabel(
  id: string,
  body: { nome?: string; cor?: string | null; emoji?: string | null; ordem?: number }
) {
  return axiosApiService.patch<WhatsappChatLabelDto>(`${BASE}/${encodeURIComponent(id)}`, body);
}

export function deleteChatLabel(id: string) {
  return axiosApiService.delete<void>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Substitui completamente o conjunto de chats da lista. */
export function setChatLabelChats(id: string, chatIds: string[]) {
  return axiosApiService.put<WhatsappChatLabelDto>(`${BASE}/${encodeURIComponent(id)}/chats`, { chatIds });
}

/** Acrescenta chats sem remover os existentes. */
export function addChatLabelChats(id: string, chatIds: string[]) {
  return axiosApiService.post<WhatsappChatLabelDto>(`${BASE}/${encodeURIComponent(id)}/chats`, { chatIds });
}

/** Remove o conjunto informado da lista. */
export function removeChatLabelChats(id: string, chatIds: string[]) {
  return axiosApiService.delete<WhatsappChatLabelDto>(`${BASE}/${encodeURIComponent(id)}/chats`, {
    data: { chatIds }
  });
}
