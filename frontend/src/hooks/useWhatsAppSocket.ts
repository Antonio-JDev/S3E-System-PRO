import { useContext, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getBackendUrl } from '../config/api';
import type { WhatsappMessageDto } from '../services/whatsappChatService';
import { AuthContext } from '../contexts/AuthContext';

function resolveToken(authToken: string | null | undefined): string {
  const raw = (authToken && authToken.trim()) || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  const t = (raw || '').trim();
  if (!t || t === 'null' || t === 'undefined') return '';
  return t;
}

export interface WhatsAppSocketHandlers {
  onDeleted?: (payload: { id: string; chatId: string }) => void;
  onEdited?: (msg: WhatsappMessageDto) => void;
  onAck?: (payload: { id: string; chatId: string; ack: number | null }) => void;
  onPresence?: (payload: { chatId: string; session: string | null; presences: unknown }) => void;
  onChatRemoved?: (payload: { chatId: string }) => void;
  onChatArchived?: (payload: { chatId: string; archived: boolean }) => void;
  onChatMeta?: (payload: {
    chatId: string;
    displayName: string | null;
    profilePictureUrl: string | null;
  }) => void;
  /** Evolution `connection.update` → painel atualiza status sem depender só do polling. */
  onConnectionStatus?: (payload: {
    disconnected: boolean;
    state: string | null;
    session: string | null;
  }) => void;
  /** Backend sinaliza para refazer o total de não-lidas. */
  onUnreadCountUpdate?: (payload: { at?: number } | undefined) => void;
}

/**
 * Conexão Socket.io autenticada (JWT). Eventos WhatsApp CRM.
 */
export function useWhatsAppSocket(
  onMessage: (msg: WhatsappMessageDto) => void,
  handlers?: WhatsAppSocketHandlers
) {
  const auth = useContext(AuthContext);
  const cb = useRef(onMessage);
  cb.current = onMessage;
  const deletedRef = useRef(handlers?.onDeleted);
  const editedRef = useRef(handlers?.onEdited);
  const ackRef = useRef(handlers?.onAck);
  const presenceRef = useRef(handlers?.onPresence);
  const removedRef = useRef(handlers?.onChatRemoved);
  const archivedRef = useRef(handlers?.onChatArchived);
  const chatMetaRef = useRef(handlers?.onChatMeta);
  const connectionRef = useRef(handlers?.onConnectionStatus);
  const unreadRef = useRef(handlers?.onUnreadCountUpdate);
  deletedRef.current = handlers?.onDeleted;
  editedRef.current = handlers?.onEdited;
  ackRef.current = handlers?.onAck;
  presenceRef.current = handlers?.onPresence;
  removedRef.current = handlers?.onChatRemoved;
  archivedRef.current = handlers?.onChatArchived;
  chatMetaRef.current = handlers?.onChatMeta;
  connectionRef.current = handlers?.onConnectionStatus;
  unreadRef.current = handlers?.onUnreadCountUpdate;

  useEffect(() => {
    const token = resolveToken(auth?.token ?? null);
    if (!token) {
      return undefined;
    }
    const url = getBackendUrl();
    if (!url) return undefined;

    const socket: Socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 12,
      reconnectionDelay: 1500,
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('📡 [WhatsApp] Socket conectado');
    });
    socket.on('connect_error', (err) => {
      console.warn('[WhatsApp] Socket connect_error:', err.message);
    });

    const handler = (msg: WhatsappMessageDto) => {
      cb.current(msg);
    };
    const onDeleted = (payload: { id: string; chatId: string }) => {
      deletedRef.current?.(payload);
    };
    const onEdited = (msg: WhatsappMessageDto) => {
      editedRef.current?.(msg);
    };
    const onAck = (payload: { id: string; chatId: string; ack: number | null }) => {
      ackRef.current?.(payload);
    };
    const onPresence = (payload: { chatId: string; session: string | null; presences: unknown }) => {
      presenceRef.current?.(payload);
    };
    const onRemoved = (payload: { chatId: string }) => {
      removedRef.current?.(payload);
    };
    const onArchived = (payload: { chatId: string; archived: boolean }) => {
      archivedRef.current?.(payload);
    };
    const onChatMeta = (payload: {
      chatId: string;
      displayName: string | null;
      profilePictureUrl: string | null;
    }) => {
      chatMetaRef.current?.(payload);
    };
    const onConnection = (payload: {
      disconnected: boolean;
      state: string | null;
      session: string | null;
    }) => {
      connectionRef.current?.(payload);
    };
    const onUnreadUpdate = (payload: { at?: number } | undefined) => {
      unreadRef.current?.(payload);
    };

    socket.on('whatsapp:message', handler);
    socket.on('whatsapp:message:deleted', onDeleted);
    socket.on('whatsapp:message:edited', onEdited);
    socket.on('whatsapp:message:ack', onAck);
    socket.on('whatsapp:presence', onPresence);
    socket.on('whatsapp:chat:removed', onRemoved);
    socket.on('whatsapp:chat:archived', onArchived);
    socket.on('whatsapp:chat:meta', onChatMeta);
    socket.on('whatsapp:connection:status', onConnection);
    socket.on('update_unread_count', onUnreadUpdate);

    return () => {
      socket.off('whatsapp:message', handler);
      socket.off('whatsapp:message:deleted', onDeleted);
      socket.off('whatsapp:message:edited', onEdited);
      socket.off('whatsapp:message:ack', onAck);
      socket.off('whatsapp:presence', onPresence);
      socket.off('whatsapp:chat:removed', onRemoved);
      socket.off('whatsapp:chat:archived', onArchived);
      socket.off('whatsapp:chat:meta', onChatMeta);
      socket.off('whatsapp:connection:status', onConnection);
      socket.off('update_unread_count', onUnreadUpdate);
      socket.disconnect();
    };
  }, [auth?.token]);
}
