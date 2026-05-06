import { useCallback, useEffect, useRef } from 'react';
import { useWhatsAppSocket } from './useWhatsAppSocket';
import { fetchWhatsappUnreadCount } from '../services/whatsappChatService';
import { useWhatsappUnreadStore } from '../stores/whatsappUnreadStore';

function isTabFocused(): boolean {
  if (typeof document === 'undefined') return true;
  if (typeof document.hasFocus === 'function') return document.hasFocus();
  return document.visibilityState === 'visible';
}

function canUseBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined';
}

export function useWhatsappUnreadSync() {
  const setTotalUnread = useWhatsappUnreadStore((s) => s.setTotalUnread);
  const incTotalUnread = useWhatsappUnreadStore((s) => s.incTotalUnread);
  const activeChatId = useWhatsappUnreadStore((s) => s.activeChatId);
  const lastNotifiedId = useRef<string | null>(null);

  const refreshUnread = useCallback(async () => {
    const res = await fetchWhatsappUnreadCount();
    if (res.success && res.data) {
      setTotalUnread(res.data.total);
    }
  }, [setTotalUnread]);

  useEffect(() => {
    // busca inicial
    refreshUnread().catch(() => {});
  }, [refreshUnread]);

  useEffect(() => {
    if (!canUseBrowserNotifications()) return;
    // solicitar permissão de forma “silenciosa” (não spammar se já decidido)
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Socket único: mensagem + sinal de recálculo
  useWhatsAppSocket(
    (msg) => {
      if (!msg || msg.fromMe) return;

      const focused = isTabFocused();
      const isActiveChat = !!activeChatId && msg.chatId === activeChatId;

      // Atualiza contador imediatamente (UX rápida), mas também agenda refetch leve para consistência
      if (!isActiveChat) {
        incTotalUnread(1);
      }
      refreshUnread().catch(() => {});

      // Notificação nativa: só se não estiver em foco OU chat não estiver aberto
      if (focused && isActiveChat) return;
      if (!canUseBrowserNotifications()) return;
      if (Notification.permission !== 'granted') return;
      if (lastNotifiedId.current === msg.id) return;
      lastNotifiedId.current = msg.id;

      const title = 'Nova mensagem no WhatsApp';
      const body = (msg.content || '').trim().slice(0, 120) || 'Mensagem recebida';
      try {
        new Notification(title, { body });
      } catch {
        // ignore
      }
    },
    {
      onUnreadCountUpdate: () => {
        refreshUnread().catch(() => {});
      },
    }
  );
}

