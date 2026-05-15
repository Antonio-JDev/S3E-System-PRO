import { useContext, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getBackendUrl } from '../config/api';
import { AuthContext } from '../contexts/AuthContext';
import type { Notificacao } from '../services/notificationsService';

/**
 * Eventos enviados pelo backend (`backend/src/services/notificacoes.service.ts`)
 * para a room privada `user:<userId>` do destinatário da notificação:
 *
 * - `notificacao:nova`        → payload = nova notificação completa
 * - `notificacao:atualizada`  → payload = `{ id, lida }` (após marcar lida)
 * - `notificacao:todas-lidas` → payload = `{ at }` (marcar todas)
 * - `notificacao:limpa`       → payload = `{ at }` (excluir todas)
 * - `notificacao:removida`    → payload = `{ id }` (excluir uma)
 *
 * Cada handler é opcional; o hook gerencia inscrição/desinscrição e
 * reconexão automática (Socket.io faz isso por baixo). O sino usa esse
 * fluxo realtime e mantém apenas um polling de fallback bem espaçado
 * para o caso de o WebSocket cair sem se notar.
 */
export interface NotificationsSocketHandlers {
  onNew?: (n: Notificacao) => void;
  onUpdated?: (payload: { id: string; lida: boolean }) => void;
  onAllRead?: () => void;
  onCleared?: () => void;
  onRemoved?: (payload: { id: string }) => void;
  onConnectionChange?: (connected: boolean) => void;
}

function resolveToken(authToken: string | null | undefined): string {
  const raw =
    (authToken && authToken.trim()) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  const t = (raw || '').trim();
  if (!t || t === 'null' || t === 'undefined') return '';
  return t;
}

/**
 * Conexão Socket.io dedicada às notificações do usuário logado.
 *
 * Abre um socket próprio (não compartilha com o `useWhatsAppSocket`)
 * porque o sininho aparece em TODAS as telas — manter um socket leve e
 * autônomo para isso é mais previsível do que tentar centralizar.
 */
export function useNotificationsSocket(handlers?: NotificationsSocketHandlers): void {
  const auth = useContext(AuthContext);
  const newRef = useRef(handlers?.onNew);
  const updatedRef = useRef(handlers?.onUpdated);
  const allReadRef = useRef(handlers?.onAllRead);
  const clearedRef = useRef(handlers?.onCleared);
  const removedRef = useRef(handlers?.onRemoved);
  const connRef = useRef(handlers?.onConnectionChange);
  newRef.current = handlers?.onNew;
  updatedRef.current = handlers?.onUpdated;
  allReadRef.current = handlers?.onAllRead;
  clearedRef.current = handlers?.onCleared;
  removedRef.current = handlers?.onRemoved;
  connRef.current = handlers?.onConnectionChange;

  useEffect(() => {
    const token = resolveToken(auth?.token ?? null);
    if (!token) return undefined;
    const url = getBackendUrl();
    if (!url) return undefined;

    const socket: Socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 12,
      reconnectionDelay: 1500,
      withCredentials: true
    });

    const onConnect = () => {
      connRef.current?.(true);
    };
    const onDisconnect = () => {
      connRef.current?.(false);
    };
    const onNew = (n: Notificacao) => {
      newRef.current?.(n);
    };
    const onUpdated = (p: { id: string; lida: boolean }) => {
      updatedRef.current?.(p);
    };
    const onAllRead = () => {
      allReadRef.current?.();
    };
    const onCleared = () => {
      clearedRef.current?.();
    };
    const onRemoved = (p: { id: string }) => {
      removedRef.current?.(p);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('notificacao:nova', onNew);
    socket.on('notificacao:atualizada', onUpdated);
    socket.on('notificacao:todas-lidas', onAllRead);
    socket.on('notificacao:limpa', onCleared);
    socket.on('notificacao:removida', onRemoved);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('notificacao:nova', onNew);
      socket.off('notificacao:atualizada', onUpdated);
      socket.off('notificacao:todas-lidas', onAllRead);
      socket.off('notificacao:limpa', onCleared);
      socket.off('notificacao:removida', onRemoved);
      socket.disconnect();
    };
  }, [auth?.token]);
}
