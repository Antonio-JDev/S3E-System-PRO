import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getBackendUrl } from '../config/api';
import type { WhatsappMessageDto } from '../services/whatsappChatService';
import { AuthContext } from '../contexts/AuthContext';

export type WhatsAppRealtimeEventName =
  | 'socket:connect'
  | 'socket:disconnect'
  | 'socket:connect_error'
  | 'whatsapp:message'
  | 'whatsapp:message:deleted'
  | 'whatsapp:message:edited'
  | 'whatsapp:message:ack'
  | 'whatsapp:message:reaction'
  | 'whatsapp:presence'
  | 'whatsapp:chat:removed'
  | 'whatsapp:chat:archived'
  | 'whatsapp:chat:flags'
  | 'whatsapp:chat:meta'
  | 'whatsapp:connection:status'
  | 'update_unread_count';

export interface WhatsAppRealtimeStatusSnapshot {
  connected: boolean;
  lastConnectedAtMs: number | null;
  lastDisconnectedAtMs: number | null;
  lastError: string | null;
  lastEvent: { name: WhatsAppRealtimeEventName; atMs: number } | null;
  eventCounts: Partial<Record<WhatsAppRealtimeEventName, number>>;
}

let realtimeSnapshot: WhatsAppRealtimeStatusSnapshot = {
  connected: false,
  lastConnectedAtMs: null,
  lastDisconnectedAtMs: null,
  lastError: null,
  lastEvent: null,
  eventCounts: {},
};
const realtimeListeners = new Set<() => void>();

function emitRealtimeSnapshot() {
  for (const fn of realtimeListeners) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

function patchRealtimeSnapshot(patch: Partial<WhatsAppRealtimeStatusSnapshot>) {
  realtimeSnapshot = { ...realtimeSnapshot, ...patch };
  emitRealtimeSnapshot();
}

function bumpEvent(name: WhatsAppRealtimeEventName) {
  const now = Date.now();
  const prev = realtimeSnapshot.eventCounts[name] ?? 0;
  realtimeSnapshot = {
    ...realtimeSnapshot,
    lastEvent: { name, atMs: now },
    eventCounts: { ...realtimeSnapshot.eventCounts, [name]: prev + 1 },
  };
  emitRealtimeSnapshot();
}

export function useWhatsAppRealtimeStatus(): WhatsAppRealtimeStatusSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => {
      realtimeListeners.add(onStoreChange);
      return () => realtimeListeners.delete(onStoreChange);
    },
    () => realtimeSnapshot,
    () => realtimeSnapshot
  );
}

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
  onReaction?: (payload: { id: string; chatId: string; reaction: string | null }) => void;
  onPresence?: (payload: { chatId: string; session: string | null; presences: unknown }) => void;
  onChatRemoved?: (payload: { chatId: string }) => void;
  onChatArchived?: (payload: { chatId: string; archived: boolean }) => void;
  onChatFlags?: (payload: { chatId: string; pinned: boolean; favorite: boolean }) => void;
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

export interface UseWhatsAppSocketOptions {
  enabled?: boolean;
}

/**
 * Conexão Socket.io autenticada (JWT). Eventos WhatsApp CRM.
 */
export function useWhatsAppSocket(
  onMessage: (msg: WhatsappMessageDto) => void,
  handlers?: WhatsAppSocketHandlers,
  opts?: UseWhatsAppSocketOptions
) {
  const auth = useContext(AuthContext);
  const cb = useRef(onMessage);
  cb.current = onMessage;
  const deletedRef = useRef(handlers?.onDeleted);
  const editedRef = useRef(handlers?.onEdited);
  const ackRef = useRef(handlers?.onAck);
  const reactionRef = useRef(handlers?.onReaction);
  const presenceRef = useRef(handlers?.onPresence);
  const removedRef = useRef(handlers?.onChatRemoved);
  const archivedRef = useRef(handlers?.onChatArchived);
  const flagsRef = useRef(handlers?.onChatFlags);
  const chatMetaRef = useRef(handlers?.onChatMeta);
  const connectionRef = useRef(handlers?.onConnectionStatus);
  const unreadRef = useRef(handlers?.onUnreadCountUpdate);
  deletedRef.current = handlers?.onDeleted;
  editedRef.current = handlers?.onEdited;
  ackRef.current = handlers?.onAck;
  reactionRef.current = handlers?.onReaction;
  presenceRef.current = handlers?.onPresence;
  removedRef.current = handlers?.onChatRemoved;
  archivedRef.current = handlers?.onChatArchived;
  flagsRef.current = handlers?.onChatFlags;
  chatMetaRef.current = handlers?.onChatMeta;
  connectionRef.current = handlers?.onConnectionStatus;
  unreadRef.current = handlers?.onUnreadCountUpdate;

  useEffect(() => {
    const enabled = opts?.enabled ?? true;
    if (!enabled) {
      return undefined;
    }
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
      bumpEvent('socket:connect');
      patchRealtimeSnapshot({
        connected: true,
        lastConnectedAtMs: Date.now(),
        lastError: null,
      });
    });
    socket.on('disconnect', (reason) => {
      console.warn('[WhatsApp] Socket disconnect:', reason);
      bumpEvent('socket:disconnect');
      patchRealtimeSnapshot({
        connected: false,
        lastDisconnectedAtMs: Date.now(),
      });
    });
    socket.on('connect_error', (err) => {
      console.warn('[WhatsApp] Socket connect_error:', err.message);
      bumpEvent('socket:connect_error');
      patchRealtimeSnapshot({
        connected: false,
        lastError: err?.message || 'connect_error',
        lastDisconnectedAtMs: Date.now(),
      });
    });

    const handler = (msg: WhatsappMessageDto) => {
      bumpEvent('whatsapp:message');
      cb.current(msg);
    };
    const onDeleted = (payload: { id: string; chatId: string }) => {
      bumpEvent('whatsapp:message:deleted');
      deletedRef.current?.(payload);
    };
    const onEdited = (msg: WhatsappMessageDto) => {
      bumpEvent('whatsapp:message:edited');
      editedRef.current?.(msg);
    };
    const onAck = (payload: { id: string; chatId: string; ack: number | null }) => {
      bumpEvent('whatsapp:message:ack');
      ackRef.current?.(payload);
    };
    const onReaction = (payload: { id: string; chatId: string; reaction: string | null }) => {
      bumpEvent('whatsapp:message:reaction');
      reactionRef.current?.(payload);
    };
    const onPresence = (payload: { chatId: string; session: string | null; presences: unknown }) => {
      bumpEvent('whatsapp:presence');
      presenceRef.current?.(payload);
    };
    const onRemoved = (payload: { chatId: string }) => {
      bumpEvent('whatsapp:chat:removed');
      removedRef.current?.(payload);
    };
    const onArchived = (payload: { chatId: string; archived: boolean }) => {
      bumpEvent('whatsapp:chat:archived');
      archivedRef.current?.(payload);
    };
    const onFlags = (payload: { chatId: string; pinned: boolean; favorite: boolean }) => {
      bumpEvent('whatsapp:chat:flags');
      flagsRef.current?.(payload);
    };
    const onChatMeta = (payload: {
      chatId: string;
      displayName: string | null;
      profilePictureUrl: string | null;
    }) => {
      bumpEvent('whatsapp:chat:meta');
      chatMetaRef.current?.(payload);
    };
    const onConnection = (payload: {
      disconnected: boolean;
      state: string | null;
      session: string | null;
    }) => {
      bumpEvent('whatsapp:connection:status');
      connectionRef.current?.(payload);
    };
    const onUnreadUpdate = (payload: { at?: number } | undefined) => {
      bumpEvent('update_unread_count');
      unreadRef.current?.(payload);
    };

    socket.on('whatsapp:message', handler);
    socket.on('whatsapp:message:deleted', onDeleted);
    socket.on('whatsapp:message:edited', onEdited);
    socket.on('whatsapp:message:ack', onAck);
    socket.on('whatsapp:message:reaction', onReaction);
    socket.on('whatsapp:presence', onPresence);
    socket.on('whatsapp:chat:removed', onRemoved);
    socket.on('whatsapp:chat:archived', onArchived);
    socket.on('whatsapp:chat:flags', onFlags);
    socket.on('whatsapp:chat:meta', onChatMeta);
    socket.on('whatsapp:connection:status', onConnection);
    socket.on('update_unread_count', onUnreadUpdate);

    return () => {
      socket.off('whatsapp:message', handler);
      socket.off('whatsapp:message:deleted', onDeleted);
      socket.off('whatsapp:message:edited', onEdited);
      socket.off('whatsapp:message:ack', onAck);
      socket.off('whatsapp:message:reaction', onReaction);
      socket.off('whatsapp:presence', onPresence);
      socket.off('whatsapp:chat:removed', onRemoved);
      socket.off('whatsapp:chat:archived', onArchived);
      socket.off('whatsapp:chat:flags', onFlags);
      socket.off('whatsapp:chat:meta', onChatMeta);
      socket.off('whatsapp:connection:status', onConnection);
      socket.off('update_unread_count', onUnreadUpdate);
      socket.disconnect();
    };
  }, [auth?.token, opts?.enabled]);
}
